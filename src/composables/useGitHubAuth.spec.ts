/**
 * Tests for useGitHubAuth composable — Sub-Issue A, issue #64.
 *
 * useGitHubAuth is a singleton composable (ADR-002): the module-level refs
 * are shared across all consumers. vi.resetModules() + dynamic import() is
 * used to get a fresh module instance (and therefore fresh reactive state)
 * for each test, following the pattern established in
 * useDefaultFuelType.spec.ts.
 *
 * IndexedDB is mocked with an in-memory Map via vi.mock, same pattern as
 * useDefaultFuelType.spec.ts / useStationStorage.spec.ts.
 *
 * `window.location` and `window.history.replaceState` are replaced with
 * plain, fully-controlled stubs (vi.stubGlobal / vi.spyOn) rather than
 * relying on the test environment's real navigation behavior, so these
 * tests only assert what useGitHubAuth itself does with those values.
 *
 * `authError`'s exact message text is not part of the composable's public
 * API (the constants are module-private), but is asserted verbatim here to
 * match the source — keep in sync with CALLBACK_ERROR_MESSAGE /
 * SESSION_EXPIRED_MESSAGE in useGitHubAuth.ts if those change.
 *
 * Scenarios covered (test-cases.md, Sub-Issue A):
 *   A-1  — login-readiness check reports not ready when repo config is incomplete
 *   A-2  — login-readiness check reports ready when repo config is complete and valid
 *   A-3  — triggering login navigates to the GitHub OAuth start endpoint
 *   A-4  — a successful-callback indicator marks the user authenticated
 *   A-5  — authenticated state persists across a plain reload
 *   A-6  — logout clears the authenticated state without touching station data
 *   A-7  — logout clears local authenticated state even if the server-side call fails
 *   A-8  — no prior session and no callback indicator — unauthenticated with no error banner
 *   A-9  — an error-callback indicator shows a human-readable error
 *   A-10 — a 401 from a GitHub API call clears the authenticated state and prompts re-login
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RepoConfigDraft } from '@/types/repo-config'

// ---------------------------------------------------------------------------
// In-memory IndexedDB mock
// ---------------------------------------------------------------------------

const store = new Map<string, unknown>()

vi.mock('@/utils/indexedDb', () => ({
  get: vi.fn((key: string) => Promise.resolve(store.get(key))),
  set: vi.fn((key: string, value: unknown) => {
    store.set(key, value)
    return Promise.resolve()
  }),
  del: vi.fn((key: string) => {
    store.delete(key)
    return Promise.resolve()
  }),
}))

// ---------------------------------------------------------------------------
// Constants mirrored from useGitHubAuth.ts (module-private, not exported)
// ---------------------------------------------------------------------------

const AUTH_STATE_KEY = 'githubAuthenticated'
const LOGIN_START_PATH = '/.netlify/functions/github-auth-start'
const LOGOUT_PATH = '/.netlify/functions/github-auth-logout'
const CALLBACK_ERROR_MESSAGE = 'La connexion à GitHub a échoué. Merci de réessayer.'
const SESSION_EXPIRED_MESSAGE = 'Votre session GitHub a expiré. Merci de vous reconnecter.'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_CONFIG: RepoConfigDraft = {
  ownerRepo: 'alice/my-stations',
  filePath: 'stations.json',
  revalidateCacheDays: 7,
}

async function freshComposable() {
  vi.resetModules()
  const mod = await import('./useGitHubAuth')
  return mod.useGitHubAuth()
}

function stubLocation(search: string): { href: string; search: string } {
  const locationStub = { href: `http://localhost:3000/settings${search}`, search }
  vi.stubGlobal('location', locationStub)
  return locationStub
}

function spyOnReplaceState() {
  return vi.spyOn(window.history, 'replaceState').mockImplementation(() => {})
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  store.clear()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

// ---------------------------------------------------------------------------
// A-1: Login-readiness check reports not ready when repo config is incomplete
// ---------------------------------------------------------------------------

describe('A-1: canInitiateLogin reports not ready when repo config is incomplete', () => {
  it.each<[string, RepoConfigDraft]>([
    ['ownerRepo is empty', { ...VALID_CONFIG, ownerRepo: '' }],
    ['filePath is empty', { ...VALID_CONFIG, filePath: '' }],
    ['revalidateCacheDays is null', { ...VALID_CONFIG, revalidateCacheDays: null }],
    ['revalidateCacheDays is zero', { ...VALID_CONFIG, revalidateCacheDays: 0 }],
    ['revalidateCacheDays is negative', { ...VALID_CONFIG, revalidateCacheDays: -3 }],
  ])('returns false when %s', async (_description, draft) => {
    const { canInitiateLogin } = await freshComposable()

    expect(canInitiateLogin(draft)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// A-2: Login-readiness check reports ready when repo config is complete and valid
// ---------------------------------------------------------------------------

describe('A-2: canInitiateLogin reports ready when repo config is complete and valid', () => {
  it('returns true when ownerRepo and filePath are non-empty and revalidateCacheDays is a positive integer', async () => {
    const { canInitiateLogin } = await freshComposable()

    expect(canInitiateLogin(VALID_CONFIG)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// A-3: Triggering login navigates to the GitHub OAuth start endpoint
// ---------------------------------------------------------------------------

describe('A-3: login navigates the browser to the GitHub OAuth start endpoint', () => {
  it('sets window.location.href to the OAuth start endpoint', async () => {
    const locationStub = stubLocation('')
    const { login } = await freshComposable()

    login()

    expect(locationStub.href).toBe(LOGIN_START_PATH)
  })
})

// ---------------------------------------------------------------------------
// A-4: A successful-callback indicator marks the user authenticated
// ---------------------------------------------------------------------------

describe('A-4: a successful-callback indicator marks the user authenticated', () => {
  it('sets isAuthenticated, clears authError, persists the flag, and strips the URL param', async () => {
    stubLocation('?auth=success')
    const replaceStateSpy = spyOnReplaceState()
    const { isAuthenticated, authError, initializeAuthState } = await freshComposable()

    await initializeAuthState()

    expect(isAuthenticated.value).toBe(true)
    expect(authError.value).toBeNull()
    expect(store.get(AUTH_STATE_KEY)).toBe(true)
    expect(replaceStateSpy).toHaveBeenCalledWith({}, '', 'http://localhost:3000/settings')
  })
})

// ---------------------------------------------------------------------------
// A-5: Authenticated state persists across a plain reload
// ---------------------------------------------------------------------------

describe('A-5: authenticated state persists across a plain reload', () => {
  it('restores isAuthenticated from the persisted flag when the URL carries no callback indicator', async () => {
    store.set(AUTH_STATE_KEY, true)
    stubLocation('')
    const { isAuthenticated, authError, initializeAuthState } = await freshComposable()

    await initializeAuthState()

    expect(isAuthenticated.value).toBe(true)
    expect(authError.value).toBeNull()
  })

  it('clears a stale authError left over from an earlier callback on a later plain reload', async () => {
    store.set(AUTH_STATE_KEY, true)
    const replaceStateSpy = spyOnReplaceState()
    stubLocation('?auth=error')
    const { authError, initializeAuthState } = await freshComposable()
    await initializeAuthState()
    expect(authError.value).toBe(CALLBACK_ERROR_MESSAGE)

    replaceStateSpy.mockClear()
    stubLocation('')
    await initializeAuthState()

    expect(authError.value).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// A-6: Logout clears the authenticated state without touching station data
// ---------------------------------------------------------------------------

describe('A-6: logout clears the authenticated state without touching station data', () => {
  it('sets isAuthenticated to false, clears authError, and leaves unrelated IndexedDB keys untouched', async () => {
    store.set(AUTH_STATE_KEY, true)
    store.set('stations', [{ name: 'Station A', url: 'https://example.test/1' }])
    store.set('repoConfig', VALID_CONFIG)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
    const { isAuthenticated, authError, logout } = await freshComposable()

    await logout()

    expect(isAuthenticated.value).toBe(false)
    expect(authError.value).toBeNull()
    expect(store.has(AUTH_STATE_KEY)).toBe(false)
    expect(store.get('stations')).toEqual([{ name: 'Station A', url: 'https://example.test/1' }])
    expect(store.get('repoConfig')).toEqual(VALID_CONFIG)
  })

  it('calls the logout endpoint with POST', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)
    const { logout } = await freshComposable()

    await logout()

    expect(fetchMock).toHaveBeenCalledWith(LOGOUT_PATH, { method: 'POST' })
  })
})

// ---------------------------------------------------------------------------
// A-7: Logout clears local authenticated state even if the server-side call fails
// ---------------------------------------------------------------------------

describe('A-7: logout clears local authenticated state even if the server-side call fails', () => {
  it('sets isAuthenticated to false when the network request to the logout endpoint rejects', async () => {
    store.set(AUTH_STATE_KEY, true)
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    const { isAuthenticated, logout } = await freshComposable()

    await expect(logout()).resolves.toBeUndefined()

    expect(isAuthenticated.value).toBe(false)
    expect(store.has(AUTH_STATE_KEY)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// A-8: No prior session and no callback indicator — unauthenticated with no error banner
// ---------------------------------------------------------------------------

describe('A-8: no prior session and no callback indicator — unauthenticated with no error banner', () => {
  it('reports unauthenticated with no error when nothing is stored and the URL carries no indicator', async () => {
    stubLocation('')
    const { isAuthenticated, authError, initializeAuthState } = await freshComposable()

    await initializeAuthState()

    expect(isAuthenticated.value).toBe(false)
    expect(authError.value).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// A-9: An error-callback indicator shows a human-readable error
// ---------------------------------------------------------------------------

describe('A-9: an error-callback indicator shows a human-readable error', () => {
  it('sets authError, leaves isAuthenticated false, and strips the URL param', async () => {
    stubLocation('?auth=error')
    const replaceStateSpy = spyOnReplaceState()
    const { isAuthenticated, authError, initializeAuthState } = await freshComposable()

    await initializeAuthState()

    expect(isAuthenticated.value).toBe(false)
    expect(authError.value).toBe(CALLBACK_ERROR_MESSAGE)
    expect(store.get(AUTH_STATE_KEY)).toBeUndefined()
    expect(replaceStateSpy).toHaveBeenCalledWith({}, '', 'http://localhost:3000/settings')
  })
})

// ---------------------------------------------------------------------------
// A-10: A 401 from a GitHub API call clears the authenticated state and prompts re-login
// ---------------------------------------------------------------------------

describe('A-10: a 401 from a GitHub API call clears the authenticated state and prompts re-login', () => {
  it('sets isAuthenticated to false and shows a re-login message when handleUnauthorized is invoked', async () => {
    store.set(AUTH_STATE_KEY, true)
    const { isAuthenticated, authError, handleUnauthorized } = await freshComposable()

    await handleUnauthorized()

    expect(isAuthenticated.value).toBe(false)
    expect(authError.value).toBe(SESSION_EXPIRED_MESSAGE)
    expect(store.has(AUTH_STATE_KEY)).toBe(false)
  })
})
