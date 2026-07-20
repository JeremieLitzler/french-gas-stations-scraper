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
 * calls `useGitHubAuth()` itself. A 401 from the proxy is reported back to
 * the caller via the optional `onUnauthorized` callback, which the component
 * wires to `useGitHubAuth().handleUnauthorized` in its own `setup()`.
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

type ProxyCheckResult = 'ok' | 'notFound' | 'unauthorized' | 'error'
type UnauthorizedCallback = (() => void | Promise<void>) | undefined

interface OwnerRepo {
  owner: string
  repo: string
}

// Module-level state — all consumers share the same reference (ADR-002).
const repoConfig: Ref<RepoConfigDraft> = ref(emptyRepoConfig())
const validationError: Ref<string | null> = ref(null)

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

async function notifyUnauthorized(onUnauthorized: UnauthorizedCallback): Promise<null> {
  await onUnauthorized?.()
  return null
}

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
    await persistRepoConfig(draft)
    repoConfig.value = draft
    if (!isAuthenticated) {
      validationError.value = null
      return
    }
    validationError.value = await resolveValidationError(draft, onUnauthorized)
  }

  return {
    repoConfig,
    validationError,
    loadRepoConfig,
    saveRepoConfig,
  }
}
