/**
 * Singleton composable for pushing local preference changes to the user's
 * GitHub repo (Sub-Issue D, issue #64): whenever a station or default-fuel
 * change is saved to IndexedDB, the caller invokes `pushPreferences` with the
 * full up-to-date `{ fuelTypeDefault, favoriteStations }` snapshot. If a
 * remote file already exists, a before/after preview opens for the user to
 * confirm; if none exists yet, the file is created directly
 * (business-specifications.md Sub-Issue D rule 2).
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

import { ref } from 'vue'
import type { Ref } from 'vue'
import type { RepoConfigDraft } from '@/types/repo-config'
import type { PreferencesFile, RemoteWritePreview } from '@/types/preferences'
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
}

interface ExistingFile {
  content: string
  sha: string
}

class RemoteWriteUnauthorizedError extends Error {}
class RemoteWriteConflictError extends Error {}
class RemoteWriteContentInvalidError extends Error {}

// Module-level state — all consumers share the same reference (ADR-002).
const writeDiff: Ref<RemoteWritePreview | null> = ref(null)
const isWriteDialogOpen: Ref<boolean> = ref(false)
const writeError: Ref<string | null> = ref(null)
const writeSuccess: Ref<boolean> = ref(false)
const divergedNotice: Ref<string | null> = ref(null)
const isWriting: Ref<boolean> = ref(false)

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
// content is ever placed in the write-confirm diff preview.
function decodeAndValidateExistingFile(existingFile: ExistingFile): string {
  let text: string
  try {
    text = decodeBase64Utf8(existingFile.content)
  } catch {
    throw new RemoteWriteContentInvalidError()
  }
  const parsed = parseJsonFile(text)
  if (parsed === null) throw new RemoteWriteContentInvalidError()
  return toPreferencesJson(parsed)
}

async function handlePutResponse(response: Response): Promise<void> {
  if (response.status === 401) throw new RemoteWriteUnauthorizedError()
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
  await handlePutResponse(response)
}

function openWriteDialog(beforeJson: string, afterJson: string): void {
  writeDiff.value = { beforeJson, afterJson }
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
  writeError.value = WRITE_FAILED_MESSAGE
}

async function createRemoteFile(ownerRepo: OwnerRepo, path: string, content: string): Promise<void> {
  await putRemoteFile(ownerRepo, path, content, undefined)
  divergedNotice.value = null
  writeSuccess.value = true
}

async function resolvePendingWrite(
  ownerRepo: OwnerRepo,
  path: string,
  afterJson: string,
): Promise<void> {
  const existingFile = await fetchExistingFile(ownerRepo, path)
  if (existingFile === null) {
    await createRemoteFile(ownerRepo, path, afterJson)
    return
  }
  const beforeJson = decodeAndValidateExistingFile(existingFile)
  pendingWrite = { ownerRepo, path, sha: existingFile.sha, content: afterJson }
  openWriteDialog(beforeJson, afterJson)
}

export function useRemotePreferencesWrite() {
  const pushPreferences = async (
    isAuthenticated: boolean,
    repoConfig: RepoConfigDraft,
    preferences: PreferencesFile,
    onUnauthorized?: () => void | Promise<void>,
  ): Promise<void> => {
    if (!isAuthenticated) return
    if (!hasCompleteRepoConfig(repoConfig)) return
    const ownerRepo = splitOwnerRepo(repoConfig.ownerRepo)
    if (ownerRepo === null) {
      writeError.value = INVALID_CONFIG_MESSAGE
      return
    }
    // Guards against duplicate in-flight requests (e.g. two blur events firing
    // in quick succession): without it, two calls could race on the initial
    // GET and both resolve into a create/diff step for the same target file.
    if (isWriting.value) return
    isWriting.value = true
    resetWriteFeedback()
    try {
      await resolvePendingWrite(ownerRepo, repoConfig.filePath.trim(), toPreferencesJson(preferences))
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
    const { ownerRepo, path, sha, content } = pendingWrite
    isWriting.value = true
    resetWriteFeedback()
    try {
      await putRemoteFile(ownerRepo, path, content, sha)
      divergedNotice.value = null
      writeSuccess.value = true
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
