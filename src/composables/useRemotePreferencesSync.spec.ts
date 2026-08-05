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
 * The remote file shape is `PreferencesFile` (`@/types/preferences`) —
 * `fuelTypeDefault`/`favoriteStations` — the same shape the static
 * export/import feature (issue #63) reads and writes. Shape validation is
 * delegated to `@/utils/preferencesImport`'s `parseJsonFile`, so it is not
 * mocked here: the malformed-content scenarios below (C-12 through C-14)
 * exercise the real validator through the composable.
 *
 * ACCESS_REVOKED_MESSAGE / REMOTE_FETCH_FAILED_MESSAGE / INVALID_REMOTE_CONTENT_MESSAGE
 * are module-private constants (not part of the public API) mirrored here
 * verbatim from useRemotePreferencesSync.ts — keep in sync if they change.
 *
 * Scenarios covered (test-cases.md, Sub-Issue C):
 *   C-1  — remote repo not fetched when IndexedDB data is fresh
 *   C-2  — remote repo fetched when IndexedDB data is stale
 *   C-3  — remote repo not fetched again after a fresh load
 *   C-8  — remote fetch failure (404) prompts re-auth; IndexedDB untouched
 *   C-9  — remote fetch failure (401) clears cookie and shows warning
 *   C-10 — remote file with a null/empty-string default fuel type is accepted
 *   C-11 — remote file with an empty station list is accepted
 *   C-12 — remote file missing a required key is rejected as invalid content
 *   C-13 — remote file with a wrong-type default fuel value is rejected
 *   C-14 — remote file with one malformed station entry is rejected wholesale
 *   C-15 — the invalid-content message is distinct from the re-auth prompt
 *   C-19 — a hung remote fetch does not block the app indefinitely
 *
 * C-4 through C-7 (timestamp resets after add/edit/delete/default-fuel-change)
 * are covered next to the setters that perform the reset: see
 * useStationStorage.spec.ts, useStationStorage.updateStation.spec.ts, and
 * useDefaultFuelType.spec.ts.
 *
 * C-16 through C-18 (empty-state rendering, cross-view consistency) are
 * component-level scenarios: see StationPricesContent.spec.ts,
 * StationManagerTable.spec.ts, and HomePageContent.spec.ts.
 *
 * Scenarios covered (test-cases.md, issue #108 — org OAuth 403 restriction):
 *   8  — remote-file fetch org-restricted 403 sets syncError to {owner}, local data untouched
 *   9  — remote-file fetch non-org 403 falls back to the generic fetch-failed message
 *   10 — remote-file fetch 401 is unchanged (regression guard)
 *   11 — remote-file fetch 200 with a valid file applies normally, no syncError (regression guard)
 *
 * Scenarios covered (test-cases.md, issue #106 — on-demand refresh):
 *   TC-1/TC-2 — canRefreshNow visibility condition (auth + complete repo config)
 *   TC-5      — refreshNow fetches regardless of staleness, never checks isPreferencesStale
 *   TC-6/TC-8 — refreshNow shares refreshFromRemote's failure/validation handling with
 *               syncOnLoad (regression guards; the exhaustive per-status/shape scenarios
 *               already live above against syncOnLoad, the same underlying code path)
 *   TC-9      — a second concurrent refreshNow call is a no-op while one is in flight
 *   TC-10     — a hung refreshNow fetch aborts after REMOTE_FETCH_TIMEOUT_MS
 *   TC-11     — refreshNow never issues a write request (GET only)
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { RepoConfigDraft } from '@/types/repo-config'
import type { PreferencesFile } from '@/types/preferences'

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
const INVALID_REMOTE_CONTENT_MESSAGE =
  'Le fichier de préférences distant est invalide. Vos données locales sont conservées.'
const REMOTE_FETCH_TIMEOUT_MS = 10_000

// ---------------------------------------------------------------------------
// Org-OAuth-restriction 403 helpers (issue #108)
// ---------------------------------------------------------------------------

function orgRestrictedResponse() {
  return {
    status: 403,
    json: () =>
      Promise.resolve({
        message:
          "Although you appear to have the correct authorization credentials, the `alice` organization has enabled OAuth App access restrictions, meaning that data access to third-parties is limited. For more information on these restrictions, including how to enable this app, visit https://docs.github.com/articles/restricting-access-to-your-organization-s-data/",
        documentation_url: 'https://docs.github.com/rest/repos/contents#create-or-update-file-contents',
        status: '403',
      }),
  }
}

function rateLimited403Response() {
  return {
    status: 403,
    json: () => Promise.resolve({ message: 'API rate limit exceeded for user ID.' }),
  }
}

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

function githubContentResponse(data: PreferencesFile) {
  return {
    status: 200,
    json: () => Promise.resolve({ content: encodeBase64Utf8(JSON.stringify(data)) }),
  }
}

// For malformed-shape scenarios (C-12/C-13/C-14) the payload intentionally
// does not conform to PreferencesFile — that is the point of the test.
function githubContentResponseRaw(data: unknown) {
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

afterEach(() => {
  vi.useRealTimers()
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
    const remoteData: PreferencesFile = {
      favoriteStations: [
        { name: 'Remote Station', url: 'https://www.prix-carburants.gouv.fr/station/11111111' },
      ],
      fuelTypeDefault: 'SP95',
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
    const remoteData: PreferencesFile = { favoriteStations: [], fuelTypeDefault: null }
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

// ---------------------------------------------------------------------------
// C-10: Remote file with a null or empty-string default fuel type is accepted
// ---------------------------------------------------------------------------

describe('C-10: remote file with a null or empty-string default fuel type is accepted', () => {
  it('merges a null fuelTypeDefault together with the remote stations, no error', async () => {
    staleOverride = true
    const remoteData: PreferencesFile = {
      fuelTypeDefault: null,
      favoriteStations: [
        { name: 'Remote Station', url: 'https://www.prix-carburants.gouv.fr/station/11111111' },
      ],
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(githubContentResponse(remoteData)))
    const applyRemotePreferences = vi.fn().mockResolvedValue(undefined)

    const { syncError, syncOnLoad } = await freshComposable()
    await syncOnLoad(true, REPO_CONFIG, applyRemotePreferences)

    expect(applyRemotePreferences).toHaveBeenCalledWith(remoteData)
    expect(syncError.value).toBeNull()
  })

  it('merges an empty-string fuelTypeDefault together with the remote stations, no error', async () => {
    staleOverride = true
    const remoteData: PreferencesFile = {
      fuelTypeDefault: '',
      favoriteStations: [
        { name: 'Remote Station', url: 'https://www.prix-carburants.gouv.fr/station/11111111' },
      ],
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(githubContentResponse(remoteData)))
    const applyRemotePreferences = vi.fn().mockResolvedValue(undefined)

    const { syncError, syncOnLoad } = await freshComposable()
    await syncOnLoad(true, REPO_CONFIG, applyRemotePreferences)

    expect(applyRemotePreferences).toHaveBeenCalledWith(remoteData)
    expect(syncError.value).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// C-11: Remote file with an empty station list is accepted
// ---------------------------------------------------------------------------

describe('C-11: remote file with an empty station list is accepted', () => {
  it('merges an empty favoriteStations array with a valid fuelTypeDefault, no error', async () => {
    staleOverride = true
    const remoteData: PreferencesFile = { favoriteStations: [], fuelTypeDefault: 'SP95' }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(githubContentResponse(remoteData)))
    const applyRemotePreferences = vi.fn().mockResolvedValue(undefined)

    const { syncError, syncOnLoad } = await freshComposable()
    await syncOnLoad(true, REPO_CONFIG, applyRemotePreferences)

    expect(applyRemotePreferences).toHaveBeenCalledWith(remoteData)
    expect(syncError.value).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// C-12: Remote file missing a required key is rejected as invalid content
// ---------------------------------------------------------------------------

describe('C-12: remote file missing a required key is rejected as invalid content', () => {
  it('rejects a file missing favoriteStations entirely, IndexedDB untouched', async () => {
    staleOverride = true
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(githubContentResponseRaw({ fuelTypeDefault: 'SP95' })),
    )
    const applyRemotePreferences = vi.fn()

    const { syncError, syncOnLoad } = await freshComposable()
    await syncOnLoad(true, REPO_CONFIG, applyRemotePreferences)

    expect(applyRemotePreferences).not.toHaveBeenCalled()
    expect(syncError.value).toBe(INVALID_REMOTE_CONTENT_MESSAGE)
  })

  it('rejects a file missing fuelTypeDefault entirely, IndexedDB untouched', async () => {
    staleOverride = true
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(githubContentResponseRaw({ favoriteStations: [] })))
    const applyRemotePreferences = vi.fn()

    const { syncError, syncOnLoad } = await freshComposable()
    await syncOnLoad(true, REPO_CONFIG, applyRemotePreferences)

    expect(applyRemotePreferences).not.toHaveBeenCalled()
    expect(syncError.value).toBe(INVALID_REMOTE_CONTENT_MESSAGE)
  })
})

// ---------------------------------------------------------------------------
// C-13: Remote file with a wrong-type default fuel value is rejected
// ---------------------------------------------------------------------------

describe('C-13: remote file with a wrong-type default fuel value is rejected as invalid content', () => {
  it('rejects a numeric fuelTypeDefault, IndexedDB untouched', async () => {
    staleOverride = true
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(githubContentResponseRaw({ fuelTypeDefault: 42, favoriteStations: [] })),
    )
    const applyRemotePreferences = vi.fn()

    const { syncError, syncOnLoad } = await freshComposable()
    await syncOnLoad(true, REPO_CONFIG, applyRemotePreferences)

    expect(applyRemotePreferences).not.toHaveBeenCalled()
    expect(syncError.value).toBe(INVALID_REMOTE_CONTENT_MESSAGE)
  })
})

// ---------------------------------------------------------------------------
// C-14: Remote file with one malformed station entry is rejected wholesale
// ---------------------------------------------------------------------------

describe('C-14: remote file with one malformed station entry is rejected as invalid content', () => {
  it('rejects the whole file when one of several stations fails validation', async () => {
    staleOverride = true
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        githubContentResponseRaw({
          fuelTypeDefault: 'SP95',
          favoriteStations: [
            { name: 'Valid Station', url: 'https://www.prix-carburants.gouv.fr/station/11111111' },
            { name: 'Missing URL Station' },
          ],
        }),
      ),
    )
    const applyRemotePreferences = vi.fn()

    const { syncError, syncOnLoad } = await freshComposable()
    await syncOnLoad(true, REPO_CONFIG, applyRemotePreferences)

    expect(applyRemotePreferences).not.toHaveBeenCalled()
    expect(syncError.value).toBe(INVALID_REMOTE_CONTENT_MESSAGE)
  })
})

// ---------------------------------------------------------------------------
// C-15: The invalid-content message is distinct from the re-authentication prompt
// ---------------------------------------------------------------------------

describe('C-15: the invalid-content message is distinct from the re-authentication prompt', () => {
  it('shows a different message for malformed remote content than for a 401, with no reconnect wording', async () => {
    staleOverride = true

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(githubContentResponseRaw({ fuelTypeDefault: 'SP95' })),
    )
    const invalidContentComposable = await freshComposable()
    await invalidContentComposable.syncOnLoad(true, REPO_CONFIG, vi.fn())
    const invalidContentMessage = invalidContentComposable.syncError.value

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 401 }))
    const unauthorizedComposable = await freshComposable()
    await unauthorizedComposable.syncOnLoad(true, REPO_CONFIG, vi.fn())
    const unauthorizedMessage = unauthorizedComposable.syncError.value

    expect(invalidContentMessage).toBe(INVALID_REMOTE_CONTENT_MESSAGE)
    expect(unauthorizedMessage).toBe(ACCESS_REVOKED_MESSAGE)
    expect(invalidContentMessage).not.toBe(unauthorizedMessage)
    expect(invalidContentMessage).not.toMatch(/reconnect|reconnecter|se connecter/i)
  })
})

// ---------------------------------------------------------------------------
// Scenario 8: remote-file fetch org-restricted 403 sets syncError to {owner}
// ---------------------------------------------------------------------------

describe('Scenario 8: remote-file fetch org-restricted 403 sets syncError to {owner}', () => {
  it('sets syncError to {owner}, never applies remote data, distinct from the fetch-failed and re-auth messages', async () => {
    staleOverride = true
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(orgRestrictedResponse()))
    const applyRemotePreferences = vi.fn()

    const { syncError, syncOnLoad } = await freshComposable()
    await syncOnLoad(true, REPO_CONFIG, applyRemotePreferences)

    expect(syncError.value).toEqual({ owner: 'alice' })
    expect(syncError.value).not.toBe(REMOTE_FETCH_FAILED_MESSAGE)
    expect(syncError.value).not.toBe(ACCESS_REVOKED_MESSAGE)
    expect(applyRemotePreferences).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// Scenario 9: remote-file fetch non-org 403 falls back to the generic fetch-failed message
// ---------------------------------------------------------------------------

describe('Scenario 9: remote-file fetch non-org 403 falls back to the generic fetch-failed message', () => {
  it('sets syncError to REMOTE_FETCH_FAILED_MESSAGE, unchanged from today', async () => {
    staleOverride = true
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(rateLimited403Response()))
    const applyRemotePreferences = vi.fn()

    const { syncError, syncOnLoad } = await freshComposable()
    await syncOnLoad(true, REPO_CONFIG, applyRemotePreferences)

    expect(syncError.value).toBe(REMOTE_FETCH_FAILED_MESSAGE)
    expect(applyRemotePreferences).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// Scenario 10: remote-file fetch 401 is unchanged (regression guard)
// ---------------------------------------------------------------------------

describe('Scenario 10: remote-file fetch 401 is unchanged (regression guard)', () => {
  it('sets syncError to the existing access-revoked message', async () => {
    staleOverride = true
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 401 }))
    const applyRemotePreferences = vi.fn()

    const { syncError, syncOnLoad } = await freshComposable()
    await syncOnLoad(true, REPO_CONFIG, applyRemotePreferences)

    expect(syncError.value).toBe(ACCESS_REVOKED_MESSAGE)
  })
})

// ---------------------------------------------------------------------------
// Scenario 11: remote-file fetch 200 with a valid file applies normally (regression guard)
// ---------------------------------------------------------------------------

describe('Scenario 11: remote-file fetch 200 with a valid file applies normally, no syncError (regression guard)', () => {
  it('applies the remote preferences and leaves syncError null', async () => {
    staleOverride = true
    const remoteData: PreferencesFile = { favoriteStations: [], fuelTypeDefault: 'SP95' }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(githubContentResponse(remoteData)))
    const applyRemotePreferences = vi.fn().mockResolvedValue(undefined)

    const { syncError, syncOnLoad } = await freshComposable()
    await syncOnLoad(true, REPO_CONFIG, applyRemotePreferences)

    expect(applyRemotePreferences).toHaveBeenCalledWith(remoteData)
    expect(syncError.value).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// C-19: A hung remote sync fetch does not block the app indefinitely
// ---------------------------------------------------------------------------

describe('C-19: a hung remote fetch does not block the app indefinitely', () => {
  it('aborts after the bounded wait and falls back with the fetch-failed message', async () => {
    staleOverride = true
    vi.useFakeTimers()

    const fetchMock = vi.fn((_url: string, options?: { signal?: AbortSignal }) => {
      return new Promise<Response>((_resolve, reject) => {
        options?.signal?.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted.', 'AbortError'))
        })
      })
    })
    vi.stubGlobal('fetch', fetchMock)
    const applyRemotePreferences = vi.fn()

    const { syncError, syncOnLoad } = await freshComposable()
    const syncPromise = syncOnLoad(true, REPO_CONFIG, applyRemotePreferences)

    await vi.advanceTimersByTimeAsync(REMOTE_FETCH_TIMEOUT_MS)
    await syncPromise

    expect(applyRemotePreferences).not.toHaveBeenCalled()
    expect(syncError.value).toBe(REMOTE_FETCH_FAILED_MESSAGE)
  })
})

// ---------------------------------------------------------------------------
// canRefreshNow: the same auth + complete-repo-config condition syncOnLoad
// gates on, exposed for the "Refresh data" action's visibility (TC-1/TC-2)
// ---------------------------------------------------------------------------

describe('canRefreshNow', () => {
  it('is false when unauthenticated, even with a complete repo config', async () => {
    const { canRefreshNow } = await freshComposable()

    expect(canRefreshNow(false, REPO_CONFIG)).toBe(false)
  })

  it('is false when authenticated but the repo config is incomplete', async () => {
    const { canRefreshNow } = await freshComposable()
    const incompleteConfig: RepoConfigDraft = {
      ownerRepo: '',
      filePath: 'stations.json',
      revalidateCacheDays: 7,
    }

    expect(canRefreshNow(true, incompleteConfig)).toBe(false)
  })

  it('is true when authenticated and the repo config is complete', async () => {
    const { canRefreshNow } = await freshComposable()

    expect(canRefreshNow(true, REPO_CONFIG)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// TC-5: Confirmed refresh fetches despite local data not being stale
// ---------------------------------------------------------------------------

describe('TC-5: refreshNow bypasses the staleness check', () => {
  it('fetches even when isPreferencesStale would report fresh data, without ever calling it', async () => {
    staleOverride = false
    const remoteData: PreferencesFile = {
      favoriteStations: [
        { name: 'Remote Station', url: 'https://www.prix-carburants.gouv.fr/station/33333333' },
      ],
      fuelTypeDefault: 'SP95',
    }
    const fetchMock = vi.fn().mockResolvedValue(githubContentResponse(remoteData))
    vi.stubGlobal('fetch', fetchMock)
    const applyRemotePreferences = vi.fn().mockResolvedValue(undefined)

    const { syncError, refreshNow } = await freshComposable()
    const { isPreferencesStale } = await import('@/utils/preferencesSyncTimestamp')
    await refreshNow(true, REPO_CONFIG, applyRemotePreferences)

    expect(isPreferencesStale).not.toHaveBeenCalled()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(applyRemotePreferences).toHaveBeenCalledWith(remoteData)
    expect(syncError.value).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// TC-6/TC-8: refreshNow shares refreshFromRemote's failure/validation
// handling with syncOnLoad — regression guards proving the on-demand path
// goes through the exact same mapping already exhaustively covered above.
// ---------------------------------------------------------------------------

describe('TC-6: a failed on-demand refresh shows an error and never applies remote data', () => {
  it('sets the access-revoked message when the remote fetch returns 401', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 401 }))
    const applyRemotePreferences = vi.fn()

    const { syncError, refreshNow } = await freshComposable()
    await refreshNow(true, REPO_CONFIG, applyRemotePreferences)

    expect(applyRemotePreferences).not.toHaveBeenCalled()
    expect(syncError.value).toBe(ACCESS_REVOKED_MESSAGE)
  })
})

describe('TC-8: an on-demand refresh rejects malformed remote content wholesale', () => {
  it('rejects a file with an invalid station entry, never applies it', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        githubContentResponseRaw({
          fuelTypeDefault: 'SP95',
          favoriteStations: [{ name: 'Missing URL Station' }],
        }),
      ),
    )
    const applyRemotePreferences = vi.fn()

    const { syncError, refreshNow } = await freshComposable()
    await refreshNow(true, REPO_CONFIG, applyRemotePreferences)

    expect(applyRemotePreferences).not.toHaveBeenCalled()
    expect(syncError.value).toBe(INVALID_REMOTE_CONTENT_MESSAGE)
  })
})

// ---------------------------------------------------------------------------
// TC-9: A refresh in progress blocks a second concurrent trigger
// ---------------------------------------------------------------------------

describe('TC-9: a second concurrent refreshNow call is a no-op while one is in flight', () => {
  it('does not start a second fetch, and isRefreshing is true only until both calls settle', async () => {
    let resolveFetch!: (response: unknown) => void
    const fetchMock = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve
        }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const applyRemotePreferences = vi.fn().mockResolvedValue(undefined)

    const { isRefreshing, refreshNow } = await freshComposable()

    const firstCall = refreshNow(true, REPO_CONFIG, applyRemotePreferences)
    await Promise.resolve()
    expect(isRefreshing.value).toBe(true)

    await refreshNow(true, REPO_CONFIG, applyRemotePreferences)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    resolveFetch(githubContentResponse({ favoriteStations: [], fuelTypeDefault: null }))
    await firstCall

    expect(isRefreshing.value).toBe(false)
    expect(applyRemotePreferences).toHaveBeenCalledTimes(1)
  })
})

// ---------------------------------------------------------------------------
// TC-10: A hung fetch does not block the UI indefinitely
// ---------------------------------------------------------------------------

describe('TC-10: a hung refreshNow fetch does not block the UI indefinitely', () => {
  it('aborts after the bounded wait, shows the fetch-failed message, and resets isRefreshing', async () => {
    vi.useFakeTimers()

    const fetchMock = vi.fn((_url: string, options?: { signal?: AbortSignal }) => {
      return new Promise<Response>((_resolve, reject) => {
        options?.signal?.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted.', 'AbortError'))
        })
      })
    })
    vi.stubGlobal('fetch', fetchMock)
    const applyRemotePreferences = vi.fn()

    const { syncError, isRefreshing, refreshNow } = await freshComposable()
    const refreshPromise = refreshNow(true, REPO_CONFIG, applyRemotePreferences)

    await vi.advanceTimersByTimeAsync(REMOTE_FETCH_TIMEOUT_MS)
    await refreshPromise

    expect(applyRemotePreferences).not.toHaveBeenCalled()
    expect(syncError.value).toBe(REMOTE_FETCH_FAILED_MESSAGE)
    expect(isRefreshing.value).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// TC-11: A confirmed refresh never writes to the remote GitHub file
// ---------------------------------------------------------------------------

describe('TC-11: refreshNow never issues a write request', () => {
  it('calls fetch with no HTTP method override (GET), never PUT/POST', async () => {
    const remoteData: PreferencesFile = { favoriteStations: [], fuelTypeDefault: null }
    const fetchMock = vi.fn().mockResolvedValue(githubContentResponse(remoteData))
    vi.stubGlobal('fetch', fetchMock)
    const applyRemotePreferences = vi.fn().mockResolvedValue(undefined)

    const { refreshNow } = await freshComposable()
    await refreshNow(true, REPO_CONFIG, applyRemotePreferences)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit | undefined]
    expect(options?.method ?? 'GET').toBe('GET')
  })
})
