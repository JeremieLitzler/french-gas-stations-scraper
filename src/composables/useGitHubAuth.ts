/**
 * Singleton composable for GitHub OAuth login/logout state (Sub-Issue A, issue #64).
 *
 * Owns only the login/logout flow and the resulting authenticated/error state.
 * It does not own repo configuration fields (`owner/repo`, file path,
 * `revalidate-cache-days`) or their IndexedDB persistence — those belong to
 * Sub-Issues B and E. `canInitiateLogin` accepts that config as a parameter so
 * the GitHub sync section (`GitHubSyncSettings.vue`, hosted inside
 * `StationManager.vue` per issue #120) can gate its "Login with GitHub" button
 * without this composable knowing where the values come from.
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
// Set on the first successful OAuth callback and cleared only on explicit
// logout (issue #158), so "was connected, session since expired" can be told
// apart from "never connected" and "logged out on purpose" — which the
// present-or-absent AUTH_STATE_KEY flag alone cannot.
const WAS_AUTHENTICATED_KEY = 'githubWasAuthenticated'
// Loop guard for the automatic reconnect (issue #158): a declined or failed
// OAuth round trip lands back on `/?auth=error` with the marker above still
// set, so without a counter every load would redirect again. Stored as a
// number so the limit can be raised later without a migration.
//
// Reset on a *proven* session — a later plain load that still finds
// AUTH_STATE_KEY set, i.e. the previous load got no 401 — and on logout. Not
// on the OAuth callback itself: a login that succeeds but whose token the
// API still rejects (wrong scope, revoked repo grant) would otherwise loop
// login > reset > 401 > redirect forever.
const AUTO_RECONNECT_ATTEMPTS_KEY = 'githubAutoReconnectAttempts'
const AUTO_RECONNECT_ATTEMPT_LIMIT = 1
// Delay between showing the auto-reconnect countdown and navigating to
// GitHub. Exported so the notice's copy and HomePageContent's timer share
// one value.
export const AUTO_RECONNECT_DELAY_MS = 2000
const LOGIN_START_PATH = '/.netlify/functions/github-auth-start'
const LOGOUT_PATH = '/.netlify/functions/github-auth-logout'
const AUTH_QUERY_PARAM = 'auth'
const CALLBACK_ERROR_MESSAGE = 'La connexion à GitHub a échoué. Merci de réessayer.'
// Exported so the reconnect notice (issue #158) shows the same canonical
// "session expired" sentence as the in-settings authError line.
export const SESSION_EXPIRED_MESSAGE = 'Votre session GitHub a expiré. Merci de vous reconnecter.'

type AuthCallbackResult = 'success' | 'error'

// Module-level state — all consumers share the same reference (ADR-002).
const isAuthenticated: Ref<boolean> = ref(false)
const authError: Ref<string | null> = ref(null)
const wasAuthenticated: Ref<boolean> = ref(false)
const autoReconnectAttempts: Ref<number> = ref(0)

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

async function rememberPreviousAuthentication(): Promise<void> {
  wasAuthenticated.value = true
  await set(WAS_AUTHENTICATED_KEY, true)
}

async function forgetPreviousAuthentication(): Promise<void> {
  wasAuthenticated.value = false
  await del(WAS_AUTHENTICATED_KEY)
}

async function restorePreviousAuthentication(): Promise<void> {
  const [storedMarker, storedAttempts] = await Promise.all([
    get<boolean>(WAS_AUTHENTICATED_KEY),
    get<number>(AUTO_RECONNECT_ATTEMPTS_KEY),
  ])
  wasAuthenticated.value = storedMarker === true
  // Anything but a number (absent, corrupted) counts as no attempt yet, so
  // the `<` comparison and `+= 1` below never see a string.
  autoReconnectAttempts.value = typeof storedAttempts === 'number' ? storedAttempts : 0
}

async function resetAutoReconnectAttempts(): Promise<void> {
  autoReconnectAttempts.value = 0
  await del(AUTO_RECONNECT_ATTEMPTS_KEY)
}

async function applyAuthCallbackResult(result: AuthCallbackResult): Promise<void> {
  if (result === 'success') {
    updateAuthState(true, null)
    await persistAuthenticatedFlag(true)
    await rememberPreviousAuthentication()
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
  if (stored === true) await recordProvenSession()
}

// The stored flag survived to this load, so the previous session worked
// without a 401: backfill the marker for users authenticated before it
// existed (issue #158), and re-arm the auto-reconnect attempt. Best effort:
// a failed write must not reject the page's load sequence; it is simply
// retried on the next load.
async function recordProvenSession(): Promise<void> {
  try {
    if (!wasAuthenticated.value) await rememberPreviousAuthentication()
    if (autoReconnectAttempts.value > 0) await resetAutoReconnectAttempts()
  } catch {
    // Retried on the next load.
  }
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
    await restorePreviousAuthentication()
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

  // A previously-authenticated user whose session has lapsed and who could
  // reconnect right now (issue #158). Drives both the automatic redirect and
  // the fallback reconnect banner.
  const needsReconnect = (config: RepoConfigDraft): boolean => {
    return !isAuthenticated.value && wasAuthenticated.value && canInitiateLogin(config)
  }

  // needsReconnect, and the one automatic attempt per expiry is still unused.
  const canAutoReconnect = (config: RepoConfigDraft): boolean => {
    return needsReconnect(config) && autoReconnectAttempts.value < AUTO_RECONNECT_ATTEMPT_LIMIT
  }

  // Called when the auto-reconnect countdown starts, before any navigation,
  // so a cancel, a closed tab or a reload during the countdown all use up
  // the attempt.
  const recordAutoReconnectAttempt = async (): Promise<void> => {
    autoReconnectAttempts.value += 1
    await set(AUTO_RECONNECT_ATTEMPTS_KEY, autoReconnectAttempts.value)
  }

  const login = (): void => {
    window.location.href = LOGIN_START_PATH
  }

  const logout = async (): Promise<void> => {
    await requestServerLogout()
    updateAuthState(false, null)
    await persistAuthenticatedFlag(false)
    await forgetPreviousAuthentication()
    await resetAutoReconnectAttempts()
  }

  const handleUnauthorized = async (): Promise<void> => {
    updateAuthState(false, SESSION_EXPIRED_MESSAGE)
    await persistAuthenticatedFlag(false)
  }

  return {
    isAuthenticated,
    wasAuthenticated,
    authError,
    initializeAuthState,
    canInitiateLogin,
    needsReconnect,
    canAutoReconnect,
    recordAutoReconnectAttempt,
    login,
    logout,
    handleUnauthorized,
  }
}
