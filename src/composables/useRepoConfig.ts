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

type ProxyCheckResult = 'ok' | 'notFound' | 'unauthorized' | 'error'
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

function classifyProxyResponse(status: number): ProxyCheckResult {
  if (status === 200) return 'ok'
  if (status === 401) return 'unauthorized'
  if (status === 404) return 'notFound'
  return 'error'
}

async function checkProxyReachable(ownerRepo: OwnerRepo, path?: string): Promise<ProxyCheckResult> {
  try {
    const response = await fetch(buildProxyUrl(ownerRepo, path))
    return classifyProxyResponse(response.status)
  } catch {
    return 'error'
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
  if (fileCheck === 'ok') return null
  if (fileCheck === 'unauthorized') return notifyUnauthorized(onUnauthorized)
  if (fileCheck === 'error') return VALIDATION_UNAVAILABLE_MESSAGE
  const repoCheck = await checkProxyReachable(ownerRepo)
  if (repoCheck === 'ok') return null
  if (repoCheck === 'unauthorized') return notifyUnauthorized(onUnauthorized)
  if (repoCheck === 'notFound') return REPO_NOT_REACHABLE_MESSAGE
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
