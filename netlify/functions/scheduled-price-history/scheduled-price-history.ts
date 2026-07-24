// Daily scheduled snapshot of favorite-station fuel prices into history.csv
// in the user's configured GitHub repository (issue #112, ADR-014). Runs
// with no browser session: authenticates with a fixed, repo-scoped PAT
// (HISTORY_GITHUB_PAT) instead of the ADR-011 OAuth cookie, and reads
// favoriteStations from the same remote preferences file the SPA syncs
// (ADR-012) instead of IndexedDB, since neither is reachable from a
// cron-triggered function.
import { schedule } from '@netlify/functions'
import type { HandlerEvent, HandlerResponse } from '@netlify/functions'
import { jsonResponse } from '../lib/http-responses'
import { readHistoryConfig } from '../lib/environment'
import type { HistoryConfig } from '../lib/environment'
import { isScheduledInvocation } from '../lib/scheduleGuards'
import { isAllowedStationUrl } from '../lib/stationUrlAllowlist'
import { parseStationHtml } from '../lib/stationHtmlParser'
import type { ScrapedFuelPrice } from '../lib/stationHtmlParser'
import { parseFavoriteStations } from '../lib/favoriteStationsParser'
import type { FavoriteStation } from '../lib/favoriteStationsParser'
import { readRemoteFile, writeRemoteFile, encodeBase64, decodeBase64 } from '../lib/githubContentsClient'
import { updateHistoryCsv } from '../lib/priceHistoryCsv'
import type { PriceHistoryRow } from '../lib/priceHistoryCsv'

console.log("scheduled-price-history>Starting registering scheduled-price-history function...");

const HISTORY_FILE_PATH = 'history.csv'
const USER_AGENT = 'french-gas-stations-scraper/1.0'
const COMMIT_MESSAGE_PREFIX = 'Historique des prix du'
const APP_NAME = 'Coup de pompe'
const STATION_FETCH_TIMEOUT_MS = 10_000

const PARIS_TIME_ZONE = 'Europe/Paris'
const TRIGGER_WINDOW_START_HOUR = 20
const TRIGGER_WINDOW_END_HOUR = 22
const MINUTES_PER_HOUR = 60
const HOURS_PER_DAY = 24
const MINUTES_PER_DAY = HOURS_PER_DAY * MINUTES_PER_HOUR

type FoundFuelPrice = ScrapedFuelPrice & { price: number }

export interface ClockTime {
  hour: number
  minute: number
}

// Picks the daily trigger's Paris-local hour/minute, once per deploy
// (business-specifications.md). 20:00-22:59 inclusive, so the window spans
// three whole hours.
export function pickRandomParisLocalTime(): ClockTime {
  const windowHourCount = TRIGGER_WINDOW_END_HOUR - TRIGGER_WINDOW_START_HOUR + 1
  const hour = TRIGGER_WINDOW_START_HOUR + Math.floor(Math.random() * windowHourCount)
  const minute = Math.floor(Math.random() * MINUTES_PER_HOUR)
  return { hour, minute }
}

function numericPart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): number {
  return Number(parts.find((part) => part.type === type)?.value ?? '0')
}

// Reads `now`'s wall-clock date/time as it appears in Paris, then treats
// those same digits as UTC to measure Paris's current offset from UTC — the
// standard offset-free way to ask "what is this zone's offset right now"
// without needing IANA-aware date arithmetic (security-guidelines.md rule
// 3: local computation only, no network or external calls).
function parisUtcOffsetMinutes(now: Date): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: PARIS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })
  const parts = formatter.formatToParts(now)
  const parisReadAsUtc = Date.UTC(
    numericPart(parts, 'year'),
    numericPart(parts, 'month') - 1,
    numericPart(parts, 'day'),
    numericPart(parts, 'hour'),
    numericPart(parts, 'minute'),
    numericPart(parts, 'second'),
  )
  return Math.round((parisReadAsUtc - now.getTime()) / (MINUTES_PER_HOUR * 1000))
}

// Converts a Paris-local clock time into the UTC clock time cron must fire
// at, using the offset in effect at `now` (CET or CEST). A deploy near a DST
// transition may drift by up to an hour until the next deploy re-resolves it
// — an accepted trade-off (business-specifications.md).
export function toUtcClockTime(parisLocal: ClockTime, now: Date): ClockTime {
  const offsetMinutes = parisUtcOffsetMinutes(now)
  const parisMinuteOfDay = parisLocal.hour * MINUTES_PER_HOUR + parisLocal.minute
  const utcMinuteOfDay = ((parisMinuteOfDay - offsetMinutes) % MINUTES_PER_DAY + MINUTES_PER_DAY) % MINUTES_PER_DAY
  return { hour: Math.floor(utcMinuteOfDay / MINUTES_PER_HOUR), minute: utcMinuteOfDay % MINUTES_PER_HOUR }
}

export function toCronExpression(utcTime: ClockTime): string {
  return `${utcTime.minute} ${utcTime.hour} * * *`
}

// Resolved once, synchronously, at module load — schedule() below needs a
// concrete string the instant it runs (business-specifications.md).
export function resolveTriggerCronExpression(now: Date): string {
  const parisLocal = pickRandomParisLocalTime()
  const utcTime = toUtcClockTime(parisLocal, now)
  return toCronExpression(utcTime)
}

const CronExpression = resolveTriggerCronExpression(new Date())

function toIsoDate(now: Date): string {
  return now.toISOString().slice(0, 10)
}

function hasPrice(fuel: ScrapedFuelPrice): fuel is FoundFuelPrice {
  return fuel.price !== null
}

function buildRow(station: FavoriteStation, date: string, fuel: FoundFuelPrice): PriceHistoryRow {
  return {
    date,
    stationName: station.name,
    stationUrl: station.url,
    fuelType: fuel.type,
    price: fuel.price,
  }
}

// Bounded so one slow/hung station page cannot stall the whole run — a
// scheduled function has a fixed execution timeout, and every other
// favorite station must still get its rows written even if one is
// unresponsive (mirrors useRemotePreferencesSync.ts's fetchWithTimeout).
async function fetchStationHtml(url: string): Promise<string | null> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), STATION_FETCH_TIMEOUT_MS)
  try {
    const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: controller.signal })
    if (!response.ok) return null
    return await response.text()
  } finally {
    clearTimeout(timeoutId)
  }
}

function toHistoryRows(station: FavoriteStation, date: string, htmlText: string): PriceHistoryRow[] {
  const parseResult = parseStationHtml(htmlText)
  if (!parseResult.success) return []
  return parseResult.fuels.filter(hasPrice).map((fuel) => buildRow(station, date, fuel))
}

// A station whose URL fails the allowlist, whose page can't be fetched
// (network error, timeout, non-2xx), or whose page doesn't match the
// expected fuel-row selector contributes no rows — the rest of the run
// still proceeds normally (business-specifications.md). The try/catch is
// required, not incidental: without it, one station's rejected fetch
// promise would reject the Promise.all in scrapeAllStations and abort
// every other station's rows too.
async function scrapeStation(station: FavoriteStation, date: string): Promise<PriceHistoryRow[]> {
  if (!isAllowedStationUrl(station.url)) return []
  try {
    const htmlText = await fetchStationHtml(station.url)
    if (htmlText === null) return []
    return toHistoryRows(station, date, htmlText)
  } catch {
    return []
  }
}

async function scrapeAllStations(stations: FavoriteStation[], date: string): Promise<PriceHistoryRow[]> {
  const rowsByStation = await Promise.all(stations.map((station) => scrapeStation(station, date)))
  return rowsByStation.flat()
}

async function readFavoriteStations(config: HistoryConfig): Promise<FavoriteStation[] | null> {
  const outcome = await readRemoteFile(
    config.githubPat,
    config.owner,
    config.repo,
    config.preferencesFilePath,
  )
  if (!outcome.found) return null
  return parseFavoriteStations(decodeBase64(outcome.file.content))
}

interface ExistingHistory {
  content: string | null
  sha: string | undefined
}

async function readExistingHistory(config: HistoryConfig): Promise<ExistingHistory> {
  const outcome = await readRemoteFile(config.githubPat, config.owner, config.repo, HISTORY_FILE_PATH)
  if (!outcome.found) return { content: null, sha: undefined }
  return { content: decodeBase64(outcome.file.content), sha: outcome.file.sha }
}

async function writeHistory(
  config: HistoryConfig,
  csvContent: string,
  sha: string | undefined,
  date: string,
): Promise<void> {
  const message = `${COMMIT_MESSAGE_PREFIX} ${date} via ${APP_NAME}`
  await writeRemoteFile(
    config.githubPat,
    config.owner,
    config.repo,
    HISTORY_FILE_PATH,
    message,
    encodeBase64(csvContent),
    sha,
  )
}

// The whole day's CSV content is assembled in memory before the single PUT
// call below — a scrape or read failure earlier in this function throws (or
// short-circuits via the guard clauses above it) before that PUT is ever
// reached, so a failed run never leaves a partial file
// (business-specifications.md). Reading the existing history file has no
// dependency on the favorite-stations list or the scrape results, so it runs
// concurrently with them instead of after, shortening the run's wall-clock
// time by roughly that read's own latency.
async function runDailySnapshot(now: Date): Promise<HandlerResponse> {
  const config = readHistoryConfig()
  if (config === null) return jsonResponse(500, { error: 'Missing history configuration.' })
  const date = toIsoDate(now)
  const [stations, existing] = await Promise.all([
    readFavoriteStations(config),
    readExistingHistory(config),
  ])
  if (stations === null) return jsonResponse(500, { error: 'Unable to read favorite stations.' })
  const todaysRows = await scrapeAllStations(stations, date)
  const csvContent = updateHistoryCsv(existing.content, date, todaysRows)
  // Skip the write when nothing actually changed (e.g. no favorites, or every
  // station failed to scrape on a day already free of rows for today) — an
  // identical PUT would still create a no-op GitHub commit and spend a write
  // call for zero effect.
  if (csvContent === existing.content) return jsonResponse(200, { rowsWritten: todaysRows.length })
  await writeHistory(config, csvContent, existing.sha, date)
  return jsonResponse(200, { rowsWritten: todaysRows.length })
}

async function handleScheduledRun(event: HandlerEvent): Promise<HandlerResponse> {
  if (!isScheduledInvocation(event.body)) {
    const outcome = "Not a scheduled invocation."
    console.error(outcome)
    return jsonResponse(403, { error: outcome })
  }
  try {
    return await runDailySnapshot(new Date())
  } catch (error) {
    console.error('Daily price history run failed:', error)
    return jsonResponse(500, { error: 'Daily price history run failed.' })
  }
}

export const handler = schedule(CronExpression, handleScheduledRun)
