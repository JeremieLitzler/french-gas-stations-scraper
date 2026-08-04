/**
 * Singleton composable for pushing local preference changes to the user's
 * GitHub repo (Sub-Issue D, issue #64): the caller invokes `pushPreferences`
 * with the full up-to-date `{ fuelTypeDefault, favoriteStations }` snapshot.
 * If a remote file already exists, a field-level preview opens for the user
 * to confirm; if none exists yet, the file is created directly
 * (business-specifications.md Sub-Issue D rule 2).
 *
 * Since issue #110, station-list edits (`StationManagerTable.vue`) no longer
 * call `pushPreferences` on every change — they call `markStationChange` to
 * record the edit, and the caller only pushes when the user clicks
 * "Enregistrer les modifications" (see the addendum in
 * `docs/decisions/ADR-012-github-repo-as-sync-backend.md`). The
 * default-fuel-type flow (`StationPricesContent.vue`) is
 * unaffected and still calls `pushPreferences` immediately on change — it
 * passes `includeStationChanges: false` so a station edit still pending in
 * `StationManager` never leaks into (and is never cleared by) a fuel-type
 * push it wasn't reviewed from.
 *
 * The before/after preview and the per-row import merge (issue #63) share one
 * dialog component (`PreferencesDiffDialog.vue`, Sub-Issue D rule 2) — this
 * composable owns only its own half of that component's state
 * (`writeDiff`/`isWriteDialogOpen`), the same way `usePreferencesImport` owns
 * its own `diff`/`doOpenDialog`.
 *
 * Per the composable-caller-responsibility convention, this composable never
 * calls `useGitHubAuth()`, `useStationStorage()`, or `useDefaultFuelType()`
 * itself — the caller passes the current `isAuthenticated`/`repoConfig`
 * values and the already-assembled preferences snapshot.
 *
 * The existing remote file's content is re-validated through the same
 * `parseJsonFile` shape check Sub-Issue C's read path uses
 * (security-guidelines.md rule 8) before it ever reaches the diff preview,
 * and `PreferencesDiffDialog.vue` renders every diffed value through Vue's
 * default text interpolation — never `v-html`.
 *
 * Object Calisthenics exception: the composable function body exceeds five
 * lines because Vue composable conventions require grouping all returned
 * reactive state and operations in one function — documented framework
 * exception (see useGitHubAuth.ts, useRepoConfig.ts, useRemotePreferencesSync.ts).
 */

import { computed, ref } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import type { RepoConfigDraft } from '@/types/repo-config'
import type {
  FuelTypeChange,
  PreferencesFile,
  RemoteWritePreview,
  StationChange,
} from '@/types/preferences'
import type { OrgRestrictionNotice } from '@/types/org-restriction-notice'
import { parseJsonFile } from '@/utils/preferencesImport'

const PROXY_PATH = '/.netlify/functions/github-api-proxy'
const COMMIT_MESSAGE = 'Mise à jour des préférences via Coup de pompe'
const UNAUTHORIZED_MESSAGE = 'Votre session GitHub a expiré. Merci de vous reconnecter.'
const CONFLICT_MESSAGE =
  'Le fichier distant a été modifié entre-temps. Merci de rafraîchir la page et réessayer.'
const INVALID_REMOTE_CONTENT_MESSAGE =
  'Le fichier de préférences distant est invalide. Vos données locales sont conservées.'
const WRITE_FAILED_MESSAGE =
  "Impossible d'enregistrer vos préférences sur GitHub. Vos données locales sont conservées."
const INVALID_CONFIG_MESSAGE =
  'Le format du dépôt GitHub configuré est invalide. Vos données locales sont conservées.'
const DIVERGED_MESSAGE = 'Vos préférences locales diffèrent du fichier distant sur GitHub.'
// Detection only (business-specifications.md rule 1) — never shown to the
// user; the fixed, owner-linked message text lives in OrgRestrictionNotice.vue
// (security-guidelines.md rule 2).
const ORG_RESTRICTION_INDICATOR = 'OAuth App access restrictions'

type UnauthorizedCallback = (() => void | Promise<void>) | undefined

interface OwnerRepo {
  owner: string
  repo: string
}

interface PendingWrite {
  ownerRepo: OwnerRepo
  path: string
  sha: string | undefined
  content: string
  /** The station-change snapshot this write covers — cleared on success, not the live list. */
  stationChanges: StationChange[]
}

interface ExistingFile {
  content: string
  sha: string
}

class RemoteWriteUnauthorizedError extends Error {}
class RemoteWriteConflictError extends Error {}
class RemoteWriteContentInvalidError extends Error {}
// Carries the repo owner (never GitHub response text) via the standard
// Error.message property, mirroring RemoteWriteUnauthorizedError's pattern.
class RemoteWriteOrgRestrictedError extends Error {}

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
const writeDiff: Ref<RemoteWritePreview | null> = ref(null)
const isWriteDialogOpen: Ref<boolean> = ref(false)
const writeError: Ref<string | OrgRestrictionNotice | null> = ref(null)
const writeSuccess: Ref<boolean> = ref(false)
const divergedNotice: Ref<string | null> = ref(null)
const isWriting: Ref<boolean> = ref(false)
// Station-list changes recorded since the last successful push (issue #110)
// — appended by `markStationChange` as each edit is saved locally, read by
// `hasPendingChanges` to show/hide "Enregistrer les modifications", and
// bundled into the next push's preview/content.
const pendingStationChanges: Ref<StationChange[]> = ref([])

// Object Calisthenics exception: a seventh module-level variable, beyond the
// six reactive refs above. It holds the write awaiting confirmation and is
// never part of the composable's returned reactive surface — the same
// non-exposed-state exception useRepoConfig.ts documents for its own
// latestSaveRequestId.
let pendingWrite: PendingWrite | null = null

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

// GitHub's Contents API exchanges base64 content; station names may contain
// accented characters, so plain btoa()/atob() (Latin-1 only) would corrupt
// them — encode/decode as UTF-8 bytes, mirroring
// useRemotePreferencesSync.ts's decodeBase64Utf8.
function encodeBase64Utf8(text: string): string {
  const bytes = new TextEncoder().encode(text)
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('')
  return btoa(binary)
}

function decodeBase64Utf8(base64: string): string {
  const binary = atob(base64.replace(/\n/g, ''))
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

function toPreferencesJson(preferences: PreferencesFile): string {
  return JSON.stringify(preferences, null, 2)
}

function extractExistingFile(body: unknown): ExistingFile | null {
  if (typeof body !== 'object' || body === null) return null
  const record = body as Record<string, unknown>
  if (typeof record.content !== 'string' || typeof record.sha !== 'string') return null
  return { content: record.content, sha: record.sha }
}

async function fetchExistingFile(
  ownerRepo: OwnerRepo,
  path: string,
): Promise<ExistingFile | null> {
  const response = await fetch(buildProxyUrl(ownerRepo, path))
  if (response.status === 401) throw new RemoteWriteUnauthorizedError()
  if (response.status === 403 && (await isOrgRestrictedResponse(response))) {
    throw new RemoteWriteOrgRestrictedError(ownerRepo.owner)
  }
  if (response.status === 404) return null
  if (response.status !== 200) {
    throw new Error(`GitHub proxy returned unexpected status ${response.status}.`)
  }
  const body = await response.json().catch(() => null)
  const existingFile = extractExistingFile(body)
  if (existingFile === null) throw new Error('Missing base64 content in GitHub proxy response.')
  return existingFile
}

// Re-parses the existing remote file through the same shape validation
// Sub-Issue C's read path enforces (security-guidelines.md rule 8) before its
// content is ever compared against the local state for the write-confirm
// diff preview (security-guidelines.md issue #110 rule 1).
function decodeAndValidateExistingFile(existingFile: ExistingFile): PreferencesFile {
  let text: string
  try {
    text = decodeBase64Utf8(existingFile.content)
  } catch {
    throw new RemoteWriteContentInvalidError()
  }
  const parsed = parseJsonFile(text)
  if (parsed === null) throw new RemoteWriteContentInvalidError()
  return parsed
}

function buildFuelTypeChange(
  before: PreferencesFile,
  after: PreferencesFile,
): FuelTypeChange | null {
  if (before.fuelTypeDefault === after.fuelTypeDefault) return null
  return { before: before.fuelTypeDefault, after: after.fuelTypeDefault }
}

function buildWritePreview(
  before: PreferencesFile,
  after: PreferencesFile,
  stationChanges: StationChange[],
): RemoteWritePreview {
  return { stationChanges, fuelTypeChange: buildFuelTypeChange(before, after) }
}

// Removes only the change entries this push actually covered, by reference —
// any edit recorded after the snapshot was taken (while the write was still
// in flight) is left pending rather than silently dropped
// (security-guidelines.md issue #110 rule 3).
function clearPendingStationChanges(pushed: StationChange[]): void {
  pendingStationChanges.value = pendingStationChanges.value.filter(
    (change) => !pushed.includes(change),
  )
}

async function handlePutResponse(response: Response, owner: string): Promise<void> {
  if (response.status === 401) throw new RemoteWriteUnauthorizedError()
  if (response.status === 403 && (await isOrgRestrictedResponse(response))) {
    throw new RemoteWriteOrgRestrictedError(owner)
  }
  if (response.status === 409) throw new RemoteWriteConflictError()
  if (!response.ok) throw new Error(`GitHub proxy returned unexpected status ${response.status}.`)
}

async function putRemoteFile(
  ownerRepo: OwnerRepo,
  path: string,
  content: string,
  sha: string | undefined,
): Promise<void> {
  const response = await fetch(PROXY_PATH, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      owner: ownerRepo.owner,
      repo: ownerRepo.repo,
      path,
      message: COMMIT_MESSAGE,
      content: encodeBase64Utf8(content),
      sha,
    }),
  })
  await handlePutResponse(response, ownerRepo.owner)
}

function openWriteDialog(preview: RemoteWritePreview): void {
  writeDiff.value = preview
  isWriteDialogOpen.value = true
}

function closeWriteDialog(): void {
  isWriteDialogOpen.value = false
  writeDiff.value = null
  pendingWrite = null
}

function resetWriteFeedback(): void {
  writeError.value = null
  writeSuccess.value = false
}

async function notifyUnauthorized(onUnauthorized: UnauthorizedCallback): Promise<void> {
  try {
    await onUnauthorized?.()
  } catch {
    // writeError is still set by the caller regardless of callback failures.
  }
}

async function handleWriteFailure(
  error: unknown,
  onUnauthorized: UnauthorizedCallback,
): Promise<void> {
  if (error instanceof RemoteWriteUnauthorizedError) {
    await notifyUnauthorized(onUnauthorized)
    writeError.value = UNAUTHORIZED_MESSAGE
    return
  }
  if (error instanceof RemoteWriteConflictError) {
    writeError.value = CONFLICT_MESSAGE
    return
  }
  if (error instanceof RemoteWriteContentInvalidError) {
    writeError.value = INVALID_REMOTE_CONTENT_MESSAGE
    return
  }
  // Distinct, non-retryable failure (business-specifications.md rule 5):
  // re-authenticating would not fix an org-level restriction, so this is
  // neither the generic write-failed message nor the re-auth message above.
  // error.message carries the repo owner (never GitHub response text).
  if (error instanceof RemoteWriteOrgRestrictedError) {
    writeError.value = { owner: error.message }
    return
  }
  writeError.value = WRITE_FAILED_MESSAGE
}

async function createRemoteFile(
  ownerRepo: OwnerRepo,
  path: string,
  content: string,
  stationChanges: StationChange[],
): Promise<void> {
  await putRemoteFile(ownerRepo, path, content, undefined)
  divergedNotice.value = null
  writeSuccess.value = true
  clearPendingStationChanges(stationChanges)
}

async function resolvePendingWrite(
  ownerRepo: OwnerRepo,
  path: string,
  preferences: PreferencesFile,
  stationChanges: StationChange[],
): Promise<void> {
  const afterJson = toPreferencesJson(preferences)
  const existingFile = await fetchExistingFile(ownerRepo, path)
  if (existingFile === null) {
    await createRemoteFile(ownerRepo, path, afterJson, stationChanges)
    return
  }
  const beforePreferences = decodeAndValidateExistingFile(existingFile)
  pendingWrite = { ownerRepo, path, sha: existingFile.sha, content: afterJson, stationChanges }
  openWriteDialog(buildWritePreview(beforePreferences, preferences, stationChanges))
}

export function useRemotePreferencesWrite() {
  const hasPendingChanges: ComputedRef<boolean> = computed(
    () => pendingStationChanges.value.length > 0,
  )

  const markStationChange = (change: StationChange): void => {
    pendingStationChanges.value = [...pendingStationChanges.value, change]
  }

  const pushPreferences = async (
    isAuthenticated: boolean,
    repoConfig: RepoConfigDraft,
    preferences: PreferencesFile,
    includeStationChanges: boolean,
    onUnauthorized?: () => void | Promise<void>,
  ): Promise<void> => {
    if (!isAuthenticated) return
    if (!hasCompleteRepoConfig(repoConfig)) return
    const ownerRepo = splitOwnerRepo(repoConfig.ownerRepo)
    if (ownerRepo === null) {
      writeError.value = INVALID_CONFIG_MESSAGE
      return
    }
    // Guards against duplicate in-flight requests (e.g. a double click on
    // "Enregistrer les modifications"): without it, two calls could race on
    // the initial GET and both resolve into a create/diff step for the same
    // target file. The change that loses the race is not dropped silently —
    // it is already in IndexedDB (the caller awaits its own storage write
    // first) and still recorded in pendingStationChanges, so the same
    // persistent notice cancelWrite uses tells the user it hasn't reached
    // GitHub yet (review-results.md, sub-issue-86).
    if (isWriting.value) {
      divergedNotice.value = DIVERGED_MESSAGE
      return
    }
    isWriting.value = true
    resetWriteFeedback()
    // Snapshot before the async GET below, not after: any station edit made
    // while the request is in flight must stay pending rather than being
    // silently included-but-unreviewed or dropped by a later blind clear
    // (security-guidelines.md issue #110 rule 3). Callers that aren't the
    // StationManager "Enregistrer les modifications" trigger (e.g. the
    // default-fuel-type flow) pass includeStationChanges: false so this push
    // never bundles or clears station edits it never showed for review
    // (business-specifications.md: the fuel-type flow is unaffected).
    const stationChangesSnapshot = includeStationChanges ? pendingStationChanges.value : []
    try {
      await resolvePendingWrite(
        ownerRepo,
        repoConfig.filePath.trim(),
        preferences,
        stationChangesSnapshot,
      )
    } catch (error) {
      await handleWriteFailure(error, onUnauthorized)
    } finally {
      isWriting.value = false
    }
  }

  const confirmWrite = async (onUnauthorized?: () => void | Promise<void>): Promise<void> => {
    if (pendingWrite === null) return
    // Guards against a double-click on "Confirmer l'envoi" sending two PUTs
    // for the same sha — the template also disables the button while
    // isWriting is true, this is the belt-and-braces check.
    if (isWriting.value) return
    const { ownerRepo, path, sha, content, stationChanges } = pendingWrite
    isWriting.value = true
    resetWriteFeedback()
    try {
      await putRemoteFile(ownerRepo, path, content, sha)
      divergedNotice.value = null
      writeSuccess.value = true
      clearPendingStationChanges(stationChanges)
    } catch (error) {
      await handleWriteFailure(error, onUnauthorized)
    } finally {
      isWriting.value = false
      closeWriteDialog()
    }
  }

  const cancelWrite = (): void => {
    if (pendingWrite === null) return
    divergedNotice.value = DIVERGED_MESSAGE
    closeWriteDialog()
  }

  return {
    hasPendingChanges,
    markStationChange,
    writeDiff,
    isWriteDialogOpen,
    writeError,
    writeSuccess,
    divergedNotice,
    isWriting,
    pushPreferences,
    confirmWrite,
    cancelWrite,
  }
}
