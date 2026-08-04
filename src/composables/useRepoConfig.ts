/**
 * Singleton composable for the GitHub repo-sync configuration draft
 * (Sub-Issue B, issue #64): `owner/repo`, file path, `revalidate-cache-days`.
 *
 * Saving always persists to IndexedDB (ADR-008), regardless of auth state.
 * Server-side validation (does the file exist, or failing that, is the repo
 * itself reachable) only runs when the caller reports the user as
 * authenticated — unauthenticated requests have no access token to call the
 * `github-api-proxy` Netlify function with.
 *
 * Per the composable-caller-responsibility convention, this composable never
 * calls `useGitHubAuth()` itself. A 401 from the proxy always resolves
 * `validationError` to a re-authentication message (security-guidelines.md
 * rule 5) regardless of wiring; the optional `onUnauthorized` callback is an
 * additional notification the caller can wire to
 * `useGitHubAuth().handleUnauthorized` in its own `setup()` to also update
 * the shared auth state.
 *
 * Object Calisthenics exception: the composable function body exceeds five
 * lines because Vue composable conventions require grouping all returned
 * reactive state and operations in one function — documented framework
 * exception (see useGitHubAuth.ts, useStationStorage.ts).
 */

import { ref, toRaw } from 'vue'
import type { Ref } from 'vue'
import { get, set } from '@/utils/indexedDb'
import type { RepoConfigDraft } from '@/types/repo-config'

const REPO_CONFIG_KEY = 'repoConfig'
const DEFAULT_REVALIDATE_CACHE_DAYS = 7
const PROXY_PATH = '/.netlify/functions/github-api-proxy'
const INVALID_FORMAT_MESSAGE =
  'Le format attendu pour le dépôt est "proprietaire/depot" (ex. alice/mes-stations).'
const MISSING_FILE_PATH_MESSAGE = 'Le chemin du fichier est requis.'
const REPO_NOT_REACHABLE_MESSAGE =
  "Le dépôt GitHub est introuvable ou inaccessible. Vérifiez son nom et vos droits d'accès."
const VALIDATION_UNAVAILABLE_MESSAGE =
  'Impossible de vérifier le dépôt GitHub pour le moment. Réessayez plus tard.'
const SESSION_EXPIRED_MESSAGE = 'Votre session GitHub a expiré. Merci de vous reconnecter.'
const ORG_RESTRICTION_INDICATOR = 'OAuth App access restrictions'
// Hardcoded literal (security-guidelines.md rule 2) — never built from the
// proxy response body's own `documentation_url`.
const ORG_RESTRICTION_DOCS_URL =
  'https://docs.github.com/articles/restricting-access-to-your-organization-s-data/'
const ORG_RESTRICTION_MESSAGE_PREFIX =
  "Votre organisation GitHub restreint l'accès aux applications OAuth tierces : "
const ORG_RESTRICTION_MESSAGE_SUFFIX = " Plus d'informations : "
// Ranges of Unicode control / bidi-override / invisible characters to strip
// from GitHub's echoed message text (security-guidelines.md rule 3). Built
// from numeric code points rather than typed literally, so this source file
// never itself contains the invisible/bidi characters it defends against.
const CONTROL_CHAR_CODE_RANGES: ReadonlyArray<readonly [number, number]> = [
  [0x0000, 0x0008],
  [0x000b, 0x000c],
  [0x000e, 0x001f],
  [0x007f, 0x009f],
  [0x200b, 0x200f],
  [0x202a, 0x202e],
  [0x2060, 0x2069],
  [0xfeff, 0xfeff],
]

function buildControlCharsPattern(): RegExp {
  const classBody = CONTROL_CHAR_CODE_RANGES.map(
    ([start, end]) => String.fromCharCode(start) + '-' + String.fromCharCode(end),
  ).join('')
  return new RegExp('[' + classBody + ']', 'g')
}

const CONTROL_CHARS_PATTERN = buildControlCharsPattern()

type ProxyCheckResult =
  | { kind: 'ok' }
  | { kind: 'notFound' }
  | { kind: 'unauthorized' }
  | { kind: 'orgRestricted'; message: string }
  | { kind: 'error' }
type UnauthorizedCallback = (() => void | Promise<void>) | undefined

interface OwnerRepo {
  owner: string
  repo: string
}

// Module-level state — all consumers share the same reference (ADR-002).
const repoConfig: Ref<RepoConfigDraft> = ref(emptyRepoConfig())
const validationError: Ref<string | null> = ref(null)

// Object Calisthenics exception: a third module-level variable, beyond the two above.
// It exists solely to guard against a stale, slower `saveRepoConfig` call overwriting
// `validationError` after a newer call already resolved — it is not part of the composable's
// public reactive surface (unlike `repoConfig`/`validationError`, it is never returned).
let latestSaveRequestId = 0

function emptyRepoConfig(): RepoConfigDraft {
  return { ownerRepo: '', filePath: '', revalidateCacheDays: DEFAULT_REVALIDATE_CACHE_DAYS }
}

function normalizeStoredConfig(stored: RepoConfigDraft | undefined): RepoConfigDraft {
  if (!stored) return emptyRepoConfig()
  return {
    ownerRepo: stored.ownerRepo,
    filePath: stored.filePath,
    revalidateCacheDays: stored.revalidateCacheDays ?? DEFAULT_REVALIDATE_CACHE_DAYS,
  }
}

function splitOwnerRepo(ownerRepo: string): OwnerRepo | null {
  const [owner, repo, ...rest] = ownerRepo.trim().split('/')
  if (!owner || !repo || rest.length > 0) return null
  return { owner, repo }
}

function buildProxyUrl(ownerRepo: OwnerRepo, path?: string): string {
  const params = new URLSearchParams({ owner: ownerRepo.owner, repo: ownerRepo.repo })
  if (path) params.set('path', path)
  return `${PROXY_PATH}?${params.toString()}`
}

function sanitizeGitHubText(text: string): string {
  const withoutControlChars = text.replace(CONTROL_CHARS_PATTERN, '')
  return withoutControlChars.trim()
}

// Wrapped in try/catch (security-guidelines.md rule 1): the 403 body's exact
// shape is GitHub's, not a contract this project controls, so any parse
// failure or unexpected shape resolves to null (the generic-failure path)
// instead of throwing.
async function extractOrgRestrictionMessage(response: Response): Promise<string | null> {
  try {
    const body: unknown = await response.json()
    if (typeof body !== 'object' || body === null) return null
    const record = body as Record<string, unknown>
    if (typeof record.message !== 'string') return null
    if (!record.message.includes(ORG_RESTRICTION_INDICATOR)) return null
    return sanitizeGitHubText(record.message)
  } catch {
    return null
  }
}

function buildOrgRestrictionMessage(githubMessage: string): string {
  return ORG_RESTRICTION_MESSAGE_PREFIX + githubMessage + ORG_RESTRICTION_MESSAGE_SUFFIX + ORG_RESTRICTION_DOCS_URL
}

async function classifyProxyResponse(response: Response): Promise<ProxyCheckResult> {
  if (response.status === 200) return { kind: 'ok' }
  if (response.status === 401) return { kind: 'unauthorized' }
  if (response.status === 404) return { kind: 'notFound' }
  if (response.status === 403) {
    const message = await extractOrgRestrictionMessage(response)
    if (message !== null) return { kind: 'orgRestricted', message }
  }
  return { kind: 'error' }
}

async function checkProxyReachable(ownerRepo: OwnerRepo, path?: string): Promise<ProxyCheckResult> {
  try {
    const response = await fetch(buildProxyUrl(ownerRepo, path))
    return await classifyProxyResponse(response)
  } catch {
    return { kind: 'error' }
  }
}

// Always resolves to SESSION_EXPIRED_MESSAGE — even without an onUnauthorized callback, or
// if that callback throws — so security-guidelines.md rule 5's UI prompt cannot be silently
// skipped by a call site that forgets to wire the callback or whose callback fails. The
// callback itself is an additional notification for the auth composable, not the sole
// mechanism for surfacing the re-auth prompt.
async function notifyUnauthorized(onUnauthorized: UnauthorizedCallback): Promise<string> {
  try {
    await onUnauthorized?.()
  } catch {
    // The session-expired message below is returned regardless of callback failures.
  }
  return SESSION_EXPIRED_MESSAGE
}

// Object Calisthenics exception: this guard-clause chain exceeds five lines because it
// walks a sequential business rule (owner/repo format, then file-path presence, then the
// file-exists-or-repo-reachable check business-specifications.md Sub-Issue B rule 2 names) —
// splitting it further would fragment one coherent validation into indirection without
// improving readability. Same documented exception as github-auth-callback.ts's
// validateCallbackRequest (Sub-Issue F).
async function resolveValidationError(
  draft: RepoConfigDraft,
  onUnauthorized: UnauthorizedCallback,
): Promise<string | null> {
  const ownerRepo = splitOwnerRepo(draft.ownerRepo)
  if (!ownerRepo) return INVALID_FORMAT_MESSAGE
  const filePath = draft.filePath.trim()
  if (!filePath) return MISSING_FILE_PATH_MESSAGE
  const fileCheck = await checkProxyReachable(ownerRepo, filePath)
  if (fileCheck.kind === 'ok') return null
  if (fileCheck.kind === 'unauthorized') return notifyUnauthorized(onUnauthorized)
  // Short-circuits like a 401 (business-specifications.md rule 5): an
  // org-OAuth-restriction 403 would 403 again for the same organization-wide
  // reason, so the repo-level fallback below is skipped.
  if (fileCheck.kind === 'orgRestricted') return buildOrgRestrictionMessage(fileCheck.message)
  if (fileCheck.kind === 'error') return VALIDATION_UNAVAILABLE_MESSAGE
  const repoCheck = await checkProxyReachable(ownerRepo)
  if (repoCheck.kind === 'ok') return null
  if (repoCheck.kind === 'unauthorized') return notifyUnauthorized(onUnauthorized)
  if (repoCheck.kind === 'orgRestricted') return buildOrgRestrictionMessage(repoCheck.message)
  if (repoCheck.kind === 'notFound') return REPO_NOT_REACHABLE_MESSAGE
  return VALIDATION_UNAVAILABLE_MESSAGE
}

async function persistRepoConfig(draft: RepoConfigDraft): Promise<void> {
  await set(REPO_CONFIG_KEY, { ...toRaw(draft) })
}

export function useRepoConfig() {
  const loadRepoConfig = async (): Promise<void> => {
    const stored = await get<RepoConfigDraft>(REPO_CONFIG_KEY)
    repoConfig.value = normalizeStoredConfig(stored)
  }

  const saveRepoConfig = async (
    draft: RepoConfigDraft,
    isAuthenticated: boolean,
    onUnauthorized?: () => void | Promise<void>,
  ): Promise<void> => {
    const requestId = ++latestSaveRequestId
    await persistRepoConfig(draft)
    if (requestId === latestSaveRequestId) repoConfig.value = { ...draft }
    if (!isAuthenticated) {
      if (requestId === latestSaveRequestId) validationError.value = null
      return
    }
    const error = await resolveValidationError(draft, onUnauthorized)
    if (requestId === latestSaveRequestId) validationError.value = error
  }

  return {
    repoConfig,
    validationError,
    loadRepoConfig,
    saveRepoConfig,
  }
}
