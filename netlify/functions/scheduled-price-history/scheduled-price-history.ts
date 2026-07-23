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
import { isScheduledInvocation, isTargetLocalHour } from '../lib/scheduleGuards'
import { isAllowedStationUrl } from '../lib/stationUrlAllowlist'
import { parseStationHtml } from '../lib/stationHtmlParser'
import type { ScrapedFuelPrice } from '../lib/stationHtmlParser'
import { parseFavoriteStations } from '../lib/favoriteStationsParser'
import type { FavoriteStation } from '../lib/favoriteStationsParser'
import { readRemoteFile, writeRemoteFile, encodeBase64, decodeBase64 } from '../lib/githubContentsClient'
import { updateHistoryCsv } from '../lib/priceHistoryCsv'
import type { PriceHistoryRow } from '../lib/priceHistoryCsv'

const CRON_EXPRESSION = '0 19,20 * * *'
const HISTORY_FILE_PATH = 'history.csv'
const USER_AGENT = 'french-gas-stations-scraper/1.0'
const COMMIT_MESSAGE_PREFIX = 'Historique des prix du'
const APP_NAME = 'Coup de pompe'
const STATION_FETCH_TIMEOUT_MS = 10_000

type FoundFuelPrice = ScrapedFuelPrice & { price: number }

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
    return jsonResponse(403, { error: 'Not a scheduled invocation.' })
  }
  if (!isTargetLocalHour(new Date())) {
    return jsonResponse(200, { skipped: true })
  }
  try {
    return await runDailySnapshot(new Date())
  } catch (error) {
    console.error('Daily price history run failed:', error)
    return jsonResponse(500, { error: 'Daily price history run failed.' })
  }
}

export const handler = schedule(CRON_EXPRESSION, handleScheduledRun)
