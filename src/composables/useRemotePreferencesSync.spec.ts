/**
 * Tests for useRemotePreferencesSync composable — Sub-Issue C, issue #64.
 *
 * useRemotePreferencesSync is a singleton composable (ADR-002): the module-level
 * syncError ref is shared across all consumers. vi.resetModules() + dynamic
 * import() is used to get a fresh module instance (and therefore fresh reactive
 * state) for each test, following the pattern established in useRepoConfig.spec.ts.
 *
 * `isPreferencesStale` is mocked via a shared `staleOverride` variable captured
 * by the mock factory's closure, rather than asserting against a specific
 * `vi.fn()` reference — this keeps the mock's behaviour stable across the
 * vi.resetModules() calls that fresh module instances require.
 *
 * ACCESS_REVOKED_MESSAGE / REMOTE_FETCH_FAILED_MESSAGE are module-private
 * constants (not part of the public API) mirrored here verbatim from
 * useRemotePreferencesSync.ts — keep in sync if they change.
 *
 * Scenarios covered (test-cases.md, Sub-Issue C):
 *   C-1 — remote repo not fetched when IndexedDB data is fresh
 *   C-2 — remote repo fetched when IndexedDB data is stale
 *   C-3 — remote repo not fetched again after a fresh load
 *   C-8 — remote fetch failure (404) prompts re-auth; IndexedDB untouched
 *   C-9 — remote fetch failure (401) clears cookie and shows warning
 *
 * C-4 through C-7 (timestamp resets after add/edit/delete/default-fuel-change)
 * are covered next to the setters that perform the reset: see
 * useStationStorage.spec.ts, useStationStorage.updateStation.spec.ts, and
 * useDefaultFuelType.spec.ts.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RepoConfigDraft } from '@/types/repo-config'
import type { RemotePreferencesFile } from '@/types/remote-preferences'

// ---------------------------------------------------------------------------
// isPreferencesStale mock — shared mutable override, see file header
// ---------------------------------------------------------------------------

let staleOverride = true

vi.mock('@/utils/preferencesSyncTimestamp', () => ({
  isPreferencesStale: vi.fn(() => Promise.resolve(staleOverride)),
}))

// ---------------------------------------------------------------------------
// Constants mirrored from useRemotePreferencesSync.ts (module-private, not exported)
// ---------------------------------------------------------------------------

const ACCESS_REVOKED_MESSAGE =
  "L'accès à GitHub a été révoqué. Vos données locales sont utilisées."
const REMOTE_FETCH_FAILED_MESSAGE =
  'Impossible de récupérer vos préférences depuis GitHub. Merci de vous reconnecter.'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const REPO_CONFIG: RepoConfigDraft = {
  ownerRepo: 'alice/my-stations',
  filePath: 'stations.json',
  revalidateCacheDays: 7,
}

function encodeBase64Utf8(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function githubContentResponse(data: RemotePreferencesFile) {
  return {
    status: 200,
    json: () => Promise.resolve({ content: encodeBase64Utf8(JSON.stringify(data)) }),
  }
}

async function freshComposable() {
  vi.resetModules()
  const mod = await import('./useRemotePreferencesSync')
  return mod.useRemotePreferencesSync()
}

beforeEach(() => {
  staleOverride = true
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

// ---------------------------------------------------------------------------
// C-1: Remote repo not fetched when IndexedDB data is fresh
// ---------------------------------------------------------------------------

describe('C-1: remote repo not fetched when IndexedDB data is fresh', () => {
  it('never calls fetch or applyRemotePreferences, and leaves syncError null', async () => {
    staleOverride = false
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const applyRemotePreferences = vi.fn()

    const { syncError, syncOnLoad } = await freshComposable()
    await syncOnLoad(true, REPO_CONFIG, applyRemotePreferences)

    expect(fetchMock).not.toHaveBeenCalled()
    expect(applyRemotePreferences).not.toHaveBeenCalled()
    expect(syncError.value).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// C-2: Remote repo fetched when IndexedDB data is stale
// ---------------------------------------------------------------------------

describe('C-2: remote repo fetched when IndexedDB data is stale', () => {
  it('fetches via the proxy with the configured owner/repo/path and merges the result', async () => {
    staleOverride = true
    const remoteData: RemotePreferencesFile = {
      stations: [
        { name: 'Remote Station', url: 'https://www.prix-carburants.gouv.fr/station/11111111' },
      ],
      defaultFuel: 'SP95',
    }
    const fetchMock = vi.fn().mockResolvedValue(githubContentResponse(remoteData))
    vi.stubGlobal('fetch', fetchMock)
    const applyRemotePreferences = vi.fn().mockResolvedValue(undefined)

    const { syncError, syncOnLoad } = await freshComposable()
    const { isPreferencesStale } = await import('@/utils/preferencesSyncTimestamp')
    await syncOnLoad(true, REPO_CONFIG, applyRemotePreferences)

    expect(isPreferencesStale).toHaveBeenCalledWith(REPO_CONFIG.revalidateCacheDays)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const requestedUrl = fetchMock.mock.calls[0][0] as string
    expect(requestedUrl).toContain('/.netlify/functions/github-api-proxy')
    expect(requestedUrl).toContain('owner=alice')
    expect(requestedUrl).toContain('repo=my-stations')
    expect(requestedUrl).toContain('path=stations.json')
    expect(applyRemotePreferences).toHaveBeenCalledWith(remoteData)
    expect(syncError.value).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// C-3: Remote repo not fetched again after a fresh load
// ---------------------------------------------------------------------------

describe('C-3: remote repo not fetched again after a fresh load', () => {
  it('skips the fetch once isPreferencesStale reports the data is no longer stale', async () => {
    const remoteData: RemotePreferencesFile = { stations: [], defaultFuel: null }
    const fetchMock = vi.fn().mockResolvedValue(githubContentResponse(remoteData))
    vi.stubGlobal('fetch', fetchMock)
    const applyRemotePreferences = vi.fn().mockResolvedValue(undefined)

    const { syncOnLoad } = await freshComposable()

    staleOverride = true
    await syncOnLoad(true, REPO_CONFIG, applyRemotePreferences)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    staleOverride = false
    await syncOnLoad(true, REPO_CONFIG, applyRemotePreferences)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

// ---------------------------------------------------------------------------
// C-8: Remote fetch failure (404) prompts re-auth, IndexedDB untouched
// ---------------------------------------------------------------------------

describe('C-8: remote fetch failure (404) prompts re-auth, IndexedDB untouched', () => {
  it('sets the generic fetch-failed message and never applies remote data', async () => {
    staleOverride = true
    const fetchMock = vi.fn().mockResolvedValue({ status: 404 })
    vi.stubGlobal('fetch', fetchMock)
    const applyRemotePreferences = vi.fn()

    const { syncError, syncOnLoad } = await freshComposable()
    await syncOnLoad(true, REPO_CONFIG, applyRemotePreferences)

    expect(applyRemotePreferences).not.toHaveBeenCalled()
    expect(syncError.value).toBe(REMOTE_FETCH_FAILED_MESSAGE)
  })
})

// ---------------------------------------------------------------------------
// C-9: Remote fetch failure (401) clears cookie and shows warning
// ---------------------------------------------------------------------------

describe('C-9: remote fetch failure (401) clears cookie and shows warning', () => {
  it('notifies onUnauthorized and sets the access-revoked message', async () => {
    staleOverride = true
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 401 }))
    const applyRemotePreferences = vi.fn()
    const onUnauthorized = vi.fn()

    const { syncError, syncOnLoad } = await freshComposable()
    await syncOnLoad(true, REPO_CONFIG, applyRemotePreferences, onUnauthorized)

    expect(onUnauthorized).toHaveBeenCalledTimes(1)
    expect(applyRemotePreferences).not.toHaveBeenCalled()
    expect(syncError.value).toBe(ACCESS_REVOKED_MESSAGE)
  })

  it('still sets the access-revoked message when no onUnauthorized callback is provided', async () => {
    staleOverride = true
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 401 }))

    const { syncError, syncOnLoad } = await freshComposable()
    await syncOnLoad(true, REPO_CONFIG, vi.fn())

    expect(syncError.value).toBe(ACCESS_REVOKED_MESSAGE)
  })
})
