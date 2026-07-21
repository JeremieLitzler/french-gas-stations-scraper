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
 * Object Calisthenics exception: the composable function body exceeds five
 * lines because Vue composable conventions require grouping all returned
 * reactive state and operations in one function — documented framework
 * exception (see useGitHubAuth.ts, useRepoConfig.ts, useStationStorage.ts).
 */

import { ref } from 'vue'
import type { Ref } from 'vue'
import type { RepoConfigDraft } from '@/types/repo-config'
import type { PreferencesFile } from '@/types/preferences'
import { isPreferencesStale } from '@/utils/preferencesSyncTimestamp'
import { parseJsonFile } from '@/utils/preferencesImport'

const PROXY_PATH = '/.netlify/functions/github-api-proxy'
const ACCESS_REVOKED_MESSAGE = "L'accès à GitHub a été révoqué. Vos données locales sont utilisées."
const REMOTE_FETCH_FAILED_MESSAGE =
  'Impossible de récupérer vos préférences depuis GitHub. Merci de vous reconnecter.'
const INVALID_REMOTE_CONTENT_MESSAGE =
  'Le fichier de préférences distant est invalide. Vos données locales sont conservées.'

type UnauthorizedCallback = (() => void | Promise<void>) | undefined
type ApplyRemotePreferences = (data: PreferencesFile) => Promise<void>

interface OwnerRepo {
  owner: string
  repo: string
}

class RemoteUnauthorizedError extends Error {}
class RemoteContentInvalidError extends Error {}

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

async function requestRemoteFile(ownerRepo: OwnerRepo, path: string): Promise<Response> {
  let response: Response
  try {
    response = await fetch(buildProxyUrl(ownerRepo, path))
  } catch {
    throw new Error('Network error while fetching remote preferences from GitHub.')
  }
  if (response.status === 401) {
    throw new RemoteUnauthorizedError('GitHub access is unauthorized.')
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

  return {
    syncError,
    syncOnLoad,
  }
}
