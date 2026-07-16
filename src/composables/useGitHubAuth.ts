/**
 * Singleton composable for GitHub OAuth login/logout state (Sub-Issue A, issue #64).
 *
 * Owns only the login/logout flow and the resulting authenticated/error state.
 * It does not own repo configuration fields (`owner/repo`, file path,
 * `revalidate-cache-days`) or their IndexedDB persistence — those belong to
 * Sub-Issues B and E. `canInitiateLogin` accepts that config as a parameter so
 * the future Settings page can gate its "Login with GitHub" button without
 * this composable knowing where the values come from.
 *
 * The access token itself never reaches the browser (ADR-011) — it lives only
 * in the `gh_token` HttpOnly cookie set by the Netlify functions. The boolean
 * flag persisted here under `githubAuthenticated` is a non-sensitive UI hint
 * only (ADR-008: IndexedDB, not localStorage) so the authenticated view
 * survives a page reload without re-reading a cookie JavaScript cannot see.
 *
 * `handleUnauthorized` is called by the composable(s) that own future GitHub
 * API proxy calls (Sub-Issues C/D) when a request returns 401 — this
 * composable does not call the proxy itself.
 *
 * Object Calisthenics exception: the composable function body exceeds five
 * lines because Vue composable conventions require grouping all returned
 * reactive state and operations in one function — documented framework
 * exception.
 */

import { ref } from 'vue'
import type { Ref } from 'vue'
import { get, set, del } from '@/utils/indexedDb'
import type { RepoConfigDraft } from '@/types/repo-config'

const AUTH_STATE_KEY = 'githubAuthenticated'
const LOGIN_START_PATH = '/.netlify/functions/github-auth-start'
const LOGOUT_PATH = '/.netlify/functions/github-auth-logout'
const AUTH_QUERY_PARAM = 'auth'
const CALLBACK_ERROR_MESSAGE = 'La connexion à GitHub a échoué. Merci de réessayer.'
const SESSION_EXPIRED_MESSAGE = 'Votre session GitHub a expiré. Merci de vous reconnecter.'

type AuthCallbackResult = 'success' | 'error'

// Module-level state — all consumers share the same reference (ADR-002).
const isAuthenticated: Ref<boolean> = ref(false)
const authError: Ref<string | null> = ref(null)

function readAuthCallbackParam(): AuthCallbackResult | null {
  const params = new URLSearchParams(window.location.search)
  const value = params.get(AUTH_QUERY_PARAM)
  return value === 'success' || value === 'error' ? value : null
}

function stripAuthCallbackParam(): void {
  const url = new URL(window.location.href)
  url.searchParams.delete(AUTH_QUERY_PARAM)
  window.history.replaceState({}, '', url.toString())
}

function updateAuthState(authenticated: boolean, errorMessage: string | null): void {
  isAuthenticated.value = authenticated
  authError.value = errorMessage
}

async function persistAuthenticatedFlag(authenticated: boolean): Promise<void> {
  if (!authenticated) {
    await del(AUTH_STATE_KEY)
    return
  }
  await set(AUTH_STATE_KEY, true)
}

async function applyAuthCallbackResult(result: AuthCallbackResult): Promise<void> {
  if (result === 'success') {
    updateAuthState(true, null)
    await persistAuthenticatedFlag(true)
    return
  }
  updateAuthState(false, CALLBACK_ERROR_MESSAGE)
  await persistAuthenticatedFlag(false)
}

async function applyCallbackAndCleanUrl(result: AuthCallbackResult): Promise<void> {
  await applyAuthCallbackResult(result)
  stripAuthCallbackParam()
}

async function restoreStoredAuthState(): Promise<void> {
  const stored = await get<boolean>(AUTH_STATE_KEY)
  updateAuthState(stored === true, null)
}

function hasRequiredRepoConfig(config: RepoConfigDraft): boolean {
  return config.ownerRepo.trim().length > 0 && config.filePath.trim().length > 0
}

function hasValidCacheDays(config: RepoConfigDraft): boolean {
  return config.revalidateCacheDays !== null && config.revalidateCacheDays > 0
}

// Clearing the client-side flag is the point of logout, regardless of whether
// the network call to clear the server-side cookie succeeds — otherwise a
// flaky connection would leave the UI stuck showing an authenticated state
// the user explicitly asked to leave.
async function requestServerLogout(): Promise<void> {
  try {
    await fetch(LOGOUT_PATH, { method: 'POST' })
  } catch {
    // Local auth state is cleared by the caller regardless.
  }
}

export function useGitHubAuth() {
  const initializeAuthState = async (): Promise<void> => {
    const callbackResult = readAuthCallbackParam()
    if (callbackResult) {
      await applyCallbackAndCleanUrl(callbackResult)
      return
    }
    await restoreStoredAuthState()
  }

  const canInitiateLogin = (config: RepoConfigDraft): boolean => {
    return hasRequiredRepoConfig(config) && hasValidCacheDays(config)
  }

  const login = (): void => {
    window.location.href = LOGIN_START_PATH
  }

  const logout = async (): Promise<void> => {
    await requestServerLogout()
    updateAuthState(false, null)
    await persistAuthenticatedFlag(false)
  }

  const handleUnauthorized = async (): Promise<void> => {
    updateAuthState(false, SESSION_EXPIRED_MESSAGE)
    await persistAuthenticatedFlag(false)
  }

  return {
    isAuthenticated,
    authError,
    initializeAuthState,
    canInitiateLogin,
    login,
    logout,
    handleUnauthorized,
  }
}
