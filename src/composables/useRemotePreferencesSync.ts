/**
 * Singleton composable for reading GitHub-repo-synced preferences on app
 * load (Sub-Issue C, issue #64): compares the local IndexedDB timestamp
 * against `revalidate-cache-days` and, when stale, fetches the remote JSON
 * file via the `github-api-proxy` Netlify function and merges it in.
 *
 * The remote file is the same `PreferencesFile` shape (`favoriteStations`/
 * `fuelTypeDefault`) the static export/import feature (issue #63) already
 * reads and writes — see business-specifications.md, "Remote JSON File
 * Structure". Shape validation is reused verbatim from
 * `@/utils/preferencesImport`'s `parseJsonFile` rather than duplicated, so
 * this composable enforces exactly "the same station validation the static
 * import feature already enforces" (business-specifications.md, Sub-Issue C
 * edge cases) by construction.
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
 * Failure signaling uses thrown errors, caught once at the `refreshFromRemote`
 * boundary and translated into a `syncError` message — not `console.error` —
 * so every failure path is a single, typed, testable branch instead of
 * scattered logging alongside a parallel "return null/an outcome object"
 * convention. `RemoteUnauthorizedError` maps to the re-authentication
 * message (security-guidelines.md rule 5); `RemoteContentInvalidError` maps
 * to a distinct "remote file is invalid" message (business-specifications.md
 * Sub-Issue C edge cases) since re-authenticating would not fix a malformed
 * file; any other error (network failure, unexpected HTTP status, a failed
 * `applyRemotePreferences` write) falls back to the generic re-auth-style
 * fetch-failed message the spec groups network/404/401 failures under.
 *
 * `refreshNow` (issue #106) is the on-demand counterpart to `syncOnLoad`:
 * same `applyRemotePreferences` callback, same `refreshFromRemote` fetch/
 * validate/apply path, but it skips the `isPreferencesStale` check that
 * `syncOnLoad` gates on, and guards itself against a second concurrent call
 * via `isRefreshing` (security-guidelines.md rule 3) since, unlike
 * `syncOnLoad`, it can be triggered repeatedly by a user click.
 *
 * Object Calisthenics exception: the composable function body exceeds five
 * lines because Vue composable conventions require grouping all returned
 * reactive state and operations in one function — documented framework
 * exception (see useGitHubAuth.ts, useRepoConfig.ts, useStationStorage.ts).
 */

import { ref } from 'vue'
import type { Ref } from 'vue'
import type { RepoConfigDraft } from '@/types/repo-config'
import type { PreferencesFile } from '@/types/preferences'
import type { OrgRestrictionNotice } from '@/types/org-restriction-notice'
import { isPreferencesStale } from '@/utils/preferencesSyncTimestamp'
import { parseJsonFile } from '@/utils/preferencesImport'

const PROXY_PATH = '/.netlify/functions/github-api-proxy'
const REMOTE_FETCH_TIMEOUT_MS = 10_000
const ACCESS_REVOKED_MESSAGE = "L'accès à GitHub a été révoqué. Vos données locales sont utilisées."
const REMOTE_FETCH_FAILED_MESSAGE =
  'Impossible de récupérer vos préférences depuis GitHub. Merci de vous reconnecter.'
const INVALID_REMOTE_CONTENT_MESSAGE =
  'Le fichier de préférences distant est invalide. Vos données locales sont conservées.'
// Detection only (business-specifications.md rule 1) — never shown to the
// user; the fixed, owner-linked message text lives in OrgRestrictionNotice.vue
// (security-guidelines.md rule 2).
const ORG_RESTRICTION_INDICATOR = 'OAuth App access restrictions'

type UnauthorizedCallback = (() => void | Promise<void>) | undefined
type ApplyRemotePreferences = (data: PreferencesFile) => Promise<void>

interface OwnerRepo {
  owner: string
  repo: string
}

class RemoteUnauthorizedError extends Error {}
class RemoteContentInvalidError extends Error {}
// Carries the repo owner (never GitHub response text) via the standard
// Error.message property, mirroring RemoteUnauthorizedError's pattern.
class RemoteOrgRestrictedError extends Error {}

// Wrapped in try/catch (security-guidelines.md rule 1): the 403 body's exact
// shape is GitHub's, not a contract this project controls, so any parse
// failure or unexpected shape resolves to false (the generic-failure path)
// instead of throwing. The body's `message` text itself is never returned —
// only this boolean — per security-guidelines.md rule 2.
async function isOrgRestrictedResponse(response: Response): Promise<boolean> {
  try {
    const body: unknown = await response.json()
    if (typeof body !== 'object' || body === null) return false
    const record = body as Record<string, unknown>
    if (typeof record.message !== 'string') return false
    return record.message.includes(ORG_RESTRICTION_INDICATOR)
  } catch {
    return false
  }
}

// Module-level state — all consumers share the same reference (ADR-002).
const syncError: Ref<string | OrgRestrictionNotice | null> = ref(null)
// Guards the on-demand refresh (issue #106, security-guidelines.md rule 3)
// against a second concurrent trigger — syncOnLoad needs no equivalent guard
// since it only ever runs once, from HomePageContent.vue's own top-level await.
const isRefreshing: Ref<boolean> = ref(false)

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

// Exposed so a caller (StationManager.vue's "Refresh data" action, issue
// #106 rule 1) can show/hide the action using the exact same condition
// syncOnLoad already gates on, instead of re-deriving it. Named with a verb
// (like useGitHubAuth.ts's canInitiateLogin), not an "is"-prefixed noun, so
// it reads unambiguously as a function to call rather than a boolean ref —
// unlike this file's genuinely reactive isRefreshing.
function canRefreshNow(isAuthenticated: boolean, repoConfig: RepoConfigDraft): boolean {
  return isAuthenticated && hasCompleteRepoConfig(repoConfig)
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

// Bounds how long the app waits for the GitHub proxy (security-guidelines.md
// rule 7): without this, a hung/unresponsive response would block every view
// of the station list indefinitely, since no view renders before the sync
// outcome is known (business-specifications.md Sub-Issue C rule 8).
async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REMOTE_FETCH_TIMEOUT_MS)
  try {
    return await fetch(url, { signal: controller.signal })
  } catch {
    throw new Error('Network error while fetching remote preferences from GitHub.')
  } finally {
    clearTimeout(timeoutId)
  }
}

async function requestRemoteFile(ownerRepo: OwnerRepo, path: string): Promise<Response> {
  const response = await fetchWithTimeout(buildProxyUrl(ownerRepo, path))
  if (response.status === 401) {
    throw new RemoteUnauthorizedError('GitHub access is unauthorized.')
  }
  if (response.status === 403 && (await isOrgRestrictedResponse(response))) {
    throw new RemoteOrgRestrictedError(ownerRepo.owner)
  }
  if (response.status !== 200) {
    throw new Error(`GitHub proxy returned unexpected status ${response.status}.`)
  }
  return response
}

function extractBase64Content(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) return null
  const record = body as Record<string, unknown>
  return typeof record.content === 'string' ? record.content : null
}

// A missing/malformed `content` field means the GitHub proxy's own response
// wrapper is broken (bad JSON body, unexpected shape) — a fetch-layer
// problem, not a judgment about the user's remote preferences file. Thrown
// as a generic Error so it falls into the same re-authentication-style
// fetch-failed message as a network error or unexpected HTTP status,
// leaving RemoteContentInvalidError reserved for cases where the proxy
// response itself is well-formed but the decoded file content is not.
async function extractResponseContent(response: Response): Promise<string> {
  const body = await response.json().catch(() => null)
  const content = extractBase64Content(body)
  if (content === null) {
    throw new Error('Missing base64 content in GitHub proxy response.')
  }
  return content
}

// GitHub's Contents API returns base64 content wrapped at 60 characters with
// embedded newlines, and station names may contain accented characters, so a
// plain atob() (Latin-1 only) would corrupt them — decode as UTF-8 bytes.
function decodeBase64Utf8(base64: string): string {
  const binary = atob(base64.replace(/\n/g, ''))
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

// atob() throws a DOMException on invalid base64 (a corrupted or unexpected
// `content` field) — treated the same as a shape-validation failure, since
// both mean the remote file's content is unusable rather than a fetch/auth
// problem.
function decodeAndParseRemoteFile(content: string): PreferencesFile {
  let text: string
  try {
    text = decodeBase64Utf8(content)
  } catch {
    throw new RemoteContentInvalidError('Failed to decode remote file content as UTF-8.')
  }
  const data = parseJsonFile(text)
  if (data === null) {
    throw new RemoteContentInvalidError('Remote file does not match the expected preferences shape.')
  }
  return data
}

async function fetchRemotePreferences(config: RepoConfigDraft): Promise<PreferencesFile> {
  const ownerRepo = splitOwnerRepo(config.ownerRepo)
  if (!ownerRepo) {
    throw new Error(`Invalid owner/repo format in repoConfig: "${config.ownerRepo}".`)
  }
  const response = await requestRemoteFile(ownerRepo, config.filePath.trim())
  const content = await extractResponseContent(response)
  return decodeAndParseRemoteFile(content)
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

// Maps a thrown fetchRemotePreferences failure to its syncError message —
// kept as its own function (review-results.md, sub-issue-85) so
// resolveRemotePreferences' catch body stays a single statement instead of
// nesting these branches two levels deep.
async function handleFetchFailure(
  error: unknown,
  onUnauthorized: UnauthorizedCallback,
): Promise<null> {
  if (error instanceof RemoteUnauthorizedError) {
    await notifyUnauthorized(onUnauthorized)
    syncError.value = ACCESS_REVOKED_MESSAGE
    return null
  }
  if (error instanceof RemoteContentInvalidError) {
    syncError.value = INVALID_REMOTE_CONTENT_MESSAGE
    return null
  }
  // Distinct, non-retryable failure (business-specifications.md rule 5):
  // re-authenticating would not fix an org-level restriction, so this is
  // neither the generic fetch-failed message nor the re-auth message above.
  // error.message carries the repo owner (never GitHub response text).
  if (error instanceof RemoteOrgRestrictedError) {
    syncError.value = { owner: error.message }
    return null
  }
  syncError.value = REMOTE_FETCH_FAILED_MESSAGE
  return null
}

async function resolveRemotePreferences(
  repoConfig: RepoConfigDraft,
  onUnauthorized: UnauthorizedCallback,
): Promise<PreferencesFile | null> {
  try {
    return await fetchRemotePreferences(repoConfig)
  } catch (error) {
    return handleFetchFailure(error, onUnauthorized)
  }
}

async function refreshFromRemote(
  repoConfig: RepoConfigDraft,
  applyRemotePreferences: ApplyRemotePreferences,
  onUnauthorized: UnauthorizedCallback,
): Promise<void> {
  const data = await resolveRemotePreferences(repoConfig, onUnauthorized)
  if (data === null) return
  // applyRemotePreferences writes through useStationStorage/useDefaultFuelType,
  // which can reject on an IndexedDB failure. Left unguarded, that rejection
  // would propagate out of this component's top-level <Suspense> await and
  // break the whole page's initial render instead of just leaving local data
  // as the (already valid) fallback.
  try {
    await applyRemotePreferences(data)
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

  // On-demand refresh (issue #106, business-specifications.md rule 3): goes
  // through the same refreshFromRemote path as syncOnLoad — same fetch,
  // shape validation, and apply/rollback — but skips the staleness check, so
  // it always fetches regardless of how recently local data was synced.
  const refreshNow = async (
    isAuthenticated: boolean,
    repoConfig: RepoConfigDraft,
    applyRemotePreferences: ApplyRemotePreferences,
    onUnauthorized?: () => void | Promise<void>,
  ): Promise<void> => {
    if (!isAuthenticated) return
    if (!hasCompleteRepoConfig(repoConfig)) return
    // Belt-and-braces: StationManager.vue also disables its trigger button
    // while isRefreshing is true (security-guidelines.md rule 3).
    if (isRefreshing.value) return
    isRefreshing.value = true
    try {
      await refreshFromRemote(repoConfig, applyRemotePreferences, onUnauthorized)
    } finally {
      isRefreshing.value = false
    }
  }

  return {
    syncError,
    syncOnLoad,
    isRefreshing,
    refreshNow,
    canRefreshNow,
  }
}
