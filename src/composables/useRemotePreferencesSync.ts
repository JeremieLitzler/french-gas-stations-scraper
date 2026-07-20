/**
 * Singleton composable for reading GitHub-repo-synced preferences on app
 * load (Sub-Issue C, issue #64): compares the local IndexedDB timestamp
 * against `revalidate-cache-days` and, when stale, fetches the remote JSON
 * file via the `github-api-proxy` Netlify function and merges it in.
 *
 * Per the composable-caller-responsibility convention, this composable never
 * calls `useGitHubAuth()`, `useStationStorage()`, or `useDefaultFuelType()`
 * itself. The caller passes the current `isAuthenticated`/`repoConfig`
 * values plus an `applyRemotePreferences` callback that writes the merged
 * data through those composables' own setters — this is also where the
 * merge's `markPreferencesSynced()` call happens (Sub-Issue C rule 4),
 * reusing the same reset those setters already perform for direct user
 * edits (Sub-Issue C rule 5), instead of this composable marking it a
 * second time itself.
 *
 * A 401 from the proxy always resolves `syncError` to a re-authentication
 * message (security-guidelines.md rule 5) regardless of wiring; the optional
 * `onUnauthorized` callback is an additional notification the caller can
 * wire to `useGitHubAuth().handleUnauthorized`, matching the pattern already
 * established by `useRepoConfig.ts`.
 *
 * Object Calisthenics exception: the composable function body exceeds five
 * lines because Vue composable conventions require grouping all returned
 * reactive state and operations in one function — documented framework
 * exception (see useGitHubAuth.ts, useRepoConfig.ts, useStationStorage.ts).
 */

import { ref } from 'vue'
import type { Ref } from 'vue'
import type { RepoConfigDraft } from '@/types/repo-config'
import type { RemotePreferencesFile } from '@/types/remote-preferences'
import type { Station } from '@/types/station'
import { isPreferencesStale } from '@/utils/preferencesSyncTimestamp'

const PROXY_PATH = '/.netlify/functions/github-api-proxy'
const ACCESS_REVOKED_MESSAGE =
  "L'accès à GitHub a été révoqué. Vos données locales sont utilisées."
const REMOTE_FETCH_FAILED_MESSAGE =
  'Impossible de récupérer vos préférences depuis GitHub. Merci de vous reconnecter.'

type UnauthorizedCallback = (() => void | Promise<void>) | undefined
type ApplyRemotePreferences = (data: RemotePreferencesFile) => Promise<void>

type FetchOutcome =
  | { kind: 'ok'; data: RemotePreferencesFile }
  | { kind: 'unauthorized' }
  | { kind: 'error' }

interface OwnerRepo {
  owner: string
  repo: string
}

// Module-level state — all consumers share the same reference (ADR-002).
const syncError: Ref<string | null> = ref(null)

function hasCompleteRepoConfig(
  config: RepoConfigDraft,
): config is RepoConfigDraft & { revalidateCacheDays: number } {
  return (
    config.ownerRepo.trim().length > 0 &&
    config.filePath.trim().length > 0 &&
    config.revalidateCacheDays !== null &&
    config.revalidateCacheDays > 0
  )
}

function splitOwnerRepo(ownerRepo: string): OwnerRepo | null {
  const [owner, repo, ...rest] = ownerRepo.trim().split('/')
  if (!owner || !repo || rest.length > 0) return null
  return { owner, repo }
}

function buildProxyUrl(ownerRepo: OwnerRepo, path: string): string {
  const params = new URLSearchParams({ owner: ownerRepo.owner, repo: ownerRepo.repo, path })
  return `${PROXY_PATH}?${params.toString()}`
}

function isStationShape(value: unknown): value is Station {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return typeof record.name === 'string' && typeof record.url === 'string'
}

// A missing/wrong-type `stations` field means the remote file is corrupt or
// unexpected — treated as null (parse failure) rather than defaulting to an
// empty array, so a malformed remote file cannot silently wipe the local
// station list via replaceStations. Individual malformed entries within an
// otherwise-valid array are still dropped rather than failing the whole sync.
function parseStations(value: unknown): Station[] | null {
  if (!Array.isArray(value)) return null
  return value.filter(isStationShape)
}

function parseDefaultFuel(value: unknown): string | null | undefined {
  if (value === null) return null
  if (typeof value === 'string') return value
  return undefined
}

// Shape-checks only (does an object with the right keys exist) — full URL/name
// validation is `replaceStations`' responsibility (single source of truth for
// what counts as a valid station, shared with `addStation`).
function parseRemoteJson(text: string): RemotePreferencesFile | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return null
  }
  if (typeof parsed !== 'object' || parsed === null) return null
  const record = parsed as Record<string, unknown>
  const defaultFuel = parseDefaultFuel(record.defaultFuel)
  if (defaultFuel === undefined) return null
  const stations = parseStations(record.stations)
  if (stations === null) return null
  return { stations, defaultFuel }
}

// GitHub's Contents API returns base64 content wrapped at 60 characters with
// embedded newlines, and station names may contain accented characters, so a
// plain atob() (Latin-1 only) would corrupt them — decode as UTF-8 bytes.
function decodeBase64Utf8(base64: string): string {
  const binary = atob(base64.replace(/\n/g, ''))
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

function extractBase64Content(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) return null
  const record = body as Record<string, unknown>
  return typeof record.content === 'string' ? record.content : null
}

async function fetchRemotePreferences(config: RepoConfigDraft): Promise<FetchOutcome> {
  const ownerRepo = splitOwnerRepo(config.ownerRepo)
  if (!ownerRepo) return { kind: 'error' }
  let response: Response
  try {
    response = await fetch(buildProxyUrl(ownerRepo, config.filePath.trim()))
  } catch {
    return { kind: 'error' }
  }
  if (response.status === 401) return { kind: 'unauthorized' }
  if (response.status !== 200) return { kind: 'error' }
  const body = await response.json().catch(() => null)
  const content = extractBase64Content(body)
  if (content === null) return { kind: 'error' }
  // atob() throws a DOMException on invalid base64 (a corrupted or
  // unexpected `content` field) — caught here so it surfaces as a normal
  // sync error instead of an uncaught rejection breaking the page's
  // top-level <Suspense> await.
  let data: RemotePreferencesFile | null
  try {
    data = parseRemoteJson(decodeBase64Utf8(content))
  } catch {
    return { kind: 'error' }
  }
  if (data === null) return { kind: 'error' }
  return { kind: 'ok', data }
}

// Always resolves — even without an onUnauthorized callback, or if that
// callback throws — so security-guidelines.md rule 5's re-auth prompt cannot
// be silently skipped by a call site that forgets to wire the callback or
// whose callback fails. Same pattern as useRepoConfig.ts's notifyUnauthorized.
async function notifyUnauthorized(onUnauthorized: UnauthorizedCallback): Promise<void> {
  try {
    await onUnauthorized?.()
  } catch {
    // syncError is still set by the caller regardless of callback failures.
  }
}

async function refreshFromRemote(
  repoConfig: RepoConfigDraft,
  applyRemotePreferences: ApplyRemotePreferences,
  onUnauthorized: UnauthorizedCallback,
): Promise<void> {
  const outcome = await fetchRemotePreferences(repoConfig)
  if (outcome.kind === 'unauthorized') {
    await notifyUnauthorized(onUnauthorized)
    syncError.value = ACCESS_REVOKED_MESSAGE
    return
  }
  if (outcome.kind === 'error') {
    syncError.value = REMOTE_FETCH_FAILED_MESSAGE
    return
  }
  // applyRemotePreferences writes through useStationStorage/useDefaultFuelType,
  // which can reject on an IndexedDB failure. Left unguarded, that rejection
  // would propagate out of this component's top-level <Suspense> await and
  // break the whole page's initial render instead of just leaving local data
  // as the (already valid) fallback.
  try {
    await applyRemotePreferences(outcome.data)
  } catch {
    syncError.value = REMOTE_FETCH_FAILED_MESSAGE
    return
  }
  syncError.value = null
}

export function useRemotePreferencesSync() {
  const syncOnLoad = async (
    isAuthenticated: boolean,
    repoConfig: RepoConfigDraft,
    applyRemotePreferences: ApplyRemotePreferences,
    onUnauthorized?: () => void | Promise<void>,
  ): Promise<void> => {
    if (!isAuthenticated) return
    if (!hasCompleteRepoConfig(repoConfig)) return
    const stale = await isPreferencesStale(repoConfig.revalidateCacheDays)
    if (!stale) return
    await refreshFromRemote(repoConfig, applyRemotePreferences, onUnauthorized)
  }

  return {
    syncError,
    syncOnLoad,
  }
}
