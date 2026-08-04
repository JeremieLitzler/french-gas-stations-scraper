/**
 * Tests for useRemotePreferencesWrite composable — Sub-Issue D, issue #64;
 * field-level diff + pending-station-change batching added by issue #110.
 *
 * useRemotePreferencesWrite is a singleton composable (ADR-002): writeDiff,
 * isWriteDialogOpen, writeError, writeSuccess, divergedNotice, isWriting, and
 * pendingStationChanges are module-level refs shared across every consumer.
 * vi.resetModules() + dynamic import() gets a fresh module instance (and
 * therefore fresh reactive state) for each test, following the pattern
 * established in useRepoConfig.spec.ts and useRemotePreferencesSync.spec.ts.
 *
 * `fetch` is mocked with a single implementation that branches on
 * `options?.method === 'PUT'`: the composable's GET (existing-file read) and
 * PUT (write) calls are the only two fetch shapes it ever issues.
 * `@/utils/preferencesImport`'s `parseJsonFile` is left unmocked — the
 * existing-file content used below is always well-formed, since shape
 * validation of a malformed remote file is Sub-Issue C's concern (already
 * covered by useRemotePreferencesSync.spec.ts's C-12/C-13/C-14), not
 * Sub-Issue D's.
 *
 * UNAUTHORIZED_MESSAGE / CONFLICT_MESSAGE are module-private constants (not
 * part of the public API) mirrored here verbatim from
 * useRemotePreferencesWrite.ts — keep in sync if they change.
 *
 * Since issue #110, `pushPreferences` takes a 4th required
 * `includeStationChanges: boolean` argument (before the optional
 * `onUnauthorized` callback) — every call below passes `true` unless the test
 * is specifically exercising the fuel-type-flow isolation (TC-21), which
 * passes `false`.
 *
 * Scenarios covered (test-cases.md, Sub-Issue D + issue #110):
 *   D-1 — diff dialog shown before write, add station (field-level shape)
 *   D-2 — diff dialog shown before write, edit station (field-level shape)
 *   D-3 — confirmed write updates the remote file, add station
 *   D-4 — confirmed write updates the remote file, edit station
 *   D-5 — cancelled write leaves the remote file unchanged, shows divergence notice
 *   D-6 — first-time write creates the remote file directly, no diff dialog
 *   D-7 — stale sha (409 conflict) shows a conflict error
 *   D-8 — remote write failure (401) shows a non-blocking error
 *   D-9 — written JSON never includes repo configuration
 *   TC-04 — no pending changes: hasPendingChanges is false
 *   TC-05/06/07/08 — markStationChange makes hasPendingChanges true
 *   TC-09 — two edits recorded before a push both stay pending, no flicker
 *   TC-11 — two pending edits bundle into a single writeDiff.stationChanges
 *   TC-12 — confirmed write clears pendingStationChanges and hides the button
 *   TC-13 — cancelling keeps pendingStationChanges and hasPendingChanges true
 *   TC-14 — a failed write keeps pendingStationChanges and hasPendingChanges true
 *   TC-15 — no remote file: creates directly, no dialog, clears pending on success
 *   TC-16 — after a successful push, a new markStationChange makes hasPendingChanges true again
 *   TC-21 — includeStationChanges: false never bundles or clears pendingStationChanges
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RepoConfigDraft } from '@/types/repo-config'
import type { PreferencesFile, StationChange } from '@/types/preferences'

// ---------------------------------------------------------------------------
// Constants mirrored from useRemotePreferencesWrite.ts (module-private, not exported)
// ---------------------------------------------------------------------------

const UNAUTHORIZED_MESSAGE = 'Votre session GitHub a expiré. Merci de vous reconnecter.'
const CONFLICT_MESSAGE =
  'Le fichier distant a été modifié entre-temps. Merci de rafraîchir la page et réessayer.'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const REPO_CONFIG: RepoConfigDraft = {
  ownerRepo: 'alice/my-stations',
  filePath: 'stations.json',
  revalidateCacheDays: 7,
}

const EXISTING_SHA = 'sha-existing-abc123'

const EXISTING_PREFERENCES: PreferencesFile = {
  fuelTypeDefault: 'SP95',
  favoriteStations: [
    { name: 'Station A', url: 'https://www.prix-carburants.gouv.fr/station/11111111' },
  ],
}

const UPDATED_PREFERENCES_ADD: PreferencesFile = {
  fuelTypeDefault: 'SP95',
  favoriteStations: [
    { name: 'Station A', url: 'https://www.prix-carburants.gouv.fr/station/11111111' },
    { name: 'Station B', url: 'https://www.prix-carburants.gouv.fr/station/22222222' },
  ],
}

const UPDATED_PREFERENCES_EDIT: PreferencesFile = {
  fuelTypeDefault: 'SP95',
  favoriteStations: [
    { name: 'Station A Renamed', url: 'https://www.prix-carburants.gouv.fr/station/11111111' },
  ],
}

const ADDED_STATION_CHANGE: StationChange = {
  kind: 'added',
  station: { name: 'Station B', url: 'https://www.prix-carburants.gouv.fr/station/22222222' },
}

const EDITED_STATION_CHANGE: StationChange = {
  kind: 'edited',
  url: 'https://www.prix-carburants.gouv.fr/station/11111111',
  fieldChanges: [{ field: 'name', before: 'Station A', after: 'Station A Renamed' }],
}

interface FetchOptions {
  method?: string
  body?: string
}

function encodeBase64Utf8(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function decodeBase64Utf8(base64: string): string {
  const binary = atob(base64.replace(/\n/g, ''))
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

function githubReadResponse(data: PreferencesFile, sha: string) {
  return {
    status: 200,
    json: () => Promise.resolve({ content: encodeBase64Utf8(JSON.stringify(data)), sha }),
  }
}

function githubNotFoundResponse() {
  return { status: 404, json: () => Promise.resolve({}) }
}

function githubWriteResponse(status = 200) {
  return { status, ok: status >= 200 && status < 300, json: () => Promise.resolve({}) }
}

/**
 * A single fetch mock covering both shapes the composable issues: a GET
 * (existing-file read, no options) and a PUT (write, options.method === 'PUT').
 */
function buildFetchMock(readResponse: unknown, writeResponse: unknown) {
  return vi.fn((_url: string, options?: FetchOptions) => {
    if (options?.method === 'PUT') return Promise.resolve(writeResponse)
    return Promise.resolve(readResponse)
  })
}

function putBodyOf(fetchMock: ReturnType<typeof buildFetchMock>, callIndex: number) {
  const [, options] = fetchMock.mock.calls[callIndex] as [string, FetchOptions]
  return JSON.parse(options.body as string)
}

async function freshComposable() {
  vi.resetModules()
  const mod = await import('./useRemotePreferencesWrite')
  return mod.useRemotePreferencesWrite()
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

// ---------------------------------------------------------------------------
// D-1: Diff dialog shown before write — add station
// ---------------------------------------------------------------------------

describe('D-1: diff dialog shown before write — add station', () => {
  it('opens the write-confirm dialog with the added station and sends no PUT yet', async () => {
    const fetchMock = buildFetchMock(
      githubReadResponse(EXISTING_PREFERENCES, EXISTING_SHA),
      githubWriteResponse(),
    )
    vi.stubGlobal('fetch', fetchMock)

    const { writeDiff, isWriteDialogOpen, markStationChange, pushPreferences } =
      await freshComposable()
    markStationChange(ADDED_STATION_CHANGE)
    await pushPreferences(true, REPO_CONFIG, UPDATED_PREFERENCES_ADD, true)

    expect(isWriteDialogOpen.value).toBe(true)
    expect(writeDiff.value?.stationChanges).toEqual([ADDED_STATION_CHANGE])
    expect(writeDiff.value?.fuelTypeChange).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

// ---------------------------------------------------------------------------
// D-2: Diff dialog shown before write — edit station
// ---------------------------------------------------------------------------

describe('D-2: diff dialog shown before write — edit station', () => {
  it('opens the write-confirm dialog reflecting the edited station field', async () => {
    const fetchMock = buildFetchMock(
      githubReadResponse(EXISTING_PREFERENCES, EXISTING_SHA),
      githubWriteResponse(),
    )
    vi.stubGlobal('fetch', fetchMock)

    const { writeDiff, isWriteDialogOpen, markStationChange, pushPreferences } =
      await freshComposable()
    markStationChange(EDITED_STATION_CHANGE)
    await pushPreferences(true, REPO_CONFIG, UPDATED_PREFERENCES_EDIT, true)

    expect(isWriteDialogOpen.value).toBe(true)
    expect(writeDiff.value?.stationChanges).toEqual([EDITED_STATION_CHANGE])
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

// ---------------------------------------------------------------------------
// D-3: Confirmed write updates the remote file — add station
// ---------------------------------------------------------------------------

describe('D-3: confirmed write updates the remote file — add station', () => {
  it('PUTs with the sha fetched for the diff and sets writeSuccess', async () => {
    const fetchMock = buildFetchMock(
      githubReadResponse(EXISTING_PREFERENCES, EXISTING_SHA),
      githubWriteResponse(),
    )
    vi.stubGlobal('fetch', fetchMock)

    const { writeSuccess, isWriteDialogOpen, markStationChange, pushPreferences, confirmWrite } =
      await freshComposable()
    markStationChange(ADDED_STATION_CHANGE)
    await pushPreferences(true, REPO_CONFIG, UPDATED_PREFERENCES_ADD, true)
    await confirmWrite()

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(putBodyOf(fetchMock, 1).sha).toBe(EXISTING_SHA)
    expect(writeSuccess.value).toBe(true)
    expect(isWriteDialogOpen.value).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// D-4: Confirmed write updates the remote file — edit station
// ---------------------------------------------------------------------------

describe('D-4: confirmed write updates the remote file — edit station', () => {
  it('PUTs the edited content with the sha fetched for the diff and sets writeSuccess', async () => {
    const fetchMock = buildFetchMock(
      githubReadResponse(EXISTING_PREFERENCES, EXISTING_SHA),
      githubWriteResponse(),
    )
    vi.stubGlobal('fetch', fetchMock)

    const { writeSuccess, isWriteDialogOpen, markStationChange, pushPreferences, confirmWrite } =
      await freshComposable()
    markStationChange(EDITED_STATION_CHANGE)
    await pushPreferences(true, REPO_CONFIG, UPDATED_PREFERENCES_EDIT, true)
    await confirmWrite()

    expect(fetchMock).toHaveBeenCalledTimes(2)
    const putBody = putBodyOf(fetchMock, 1)
    expect(putBody.sha).toBe(EXISTING_SHA)
    expect(decodeBase64Utf8(putBody.content)).toContain('Station A Renamed')
    expect(writeSuccess.value).toBe(true)
    expect(isWriteDialogOpen.value).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// D-5: Cancelled write leaves the remote file unchanged, shows divergence notice
// ---------------------------------------------------------------------------

describe('D-5: cancelled write leaves the remote file unchanged, shows divergence notice', () => {
  it('sends no PUT and sets a persistent divergedNotice', async () => {
    const fetchMock = buildFetchMock(
      githubReadResponse(EXISTING_PREFERENCES, EXISTING_SHA),
      githubWriteResponse(),
    )
    vi.stubGlobal('fetch', fetchMock)

    const { divergedNotice, isWriteDialogOpen, markStationChange, pushPreferences, cancelWrite } =
      await freshComposable()
    markStationChange(ADDED_STATION_CHANGE)
    await pushPreferences(true, REPO_CONFIG, UPDATED_PREFERENCES_ADD, true)
    cancelWrite()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(isWriteDialogOpen.value).toBe(false)
    expect(divergedNotice.value).not.toBeNull()
  })
})

// ---------------------------------------------------------------------------
// D-6: First-time write creates the remote file directly, no diff dialog
// ---------------------------------------------------------------------------

describe('D-6: first-time write creates the remote file directly, no diff dialog', () => {
  it('PUTs without a sha and never opens the diff dialog', async () => {
    const fetchMock = buildFetchMock(githubNotFoundResponse(), githubWriteResponse())
    vi.stubGlobal('fetch', fetchMock)

    const { writeSuccess, isWriteDialogOpen, writeDiff, markStationChange, pushPreferences } =
      await freshComposable()
    markStationChange(ADDED_STATION_CHANGE)
    await pushPreferences(true, REPO_CONFIG, UPDATED_PREFERENCES_ADD, true)

    expect(isWriteDialogOpen.value).toBe(false)
    expect(writeDiff.value).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(putBodyOf(fetchMock, 1).sha).toBeUndefined()
    expect(writeSuccess.value).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// D-7: Stale sha (409 conflict) shows a conflict error
// ---------------------------------------------------------------------------

describe('D-7: stale sha (409 conflict) shows a conflict error', () => {
  it('sets the conflict message and does not report success', async () => {
    const fetchMock = buildFetchMock(githubReadResponse(EXISTING_PREFERENCES, EXISTING_SHA), {
      status: 409,
      json: () => Promise.resolve({}),
    })
    vi.stubGlobal('fetch', fetchMock)

    const { writeError, writeSuccess, markStationChange, pushPreferences, confirmWrite } =
      await freshComposable()
    markStationChange(ADDED_STATION_CHANGE)
    await pushPreferences(true, REPO_CONFIG, UPDATED_PREFERENCES_ADD, true)
    await confirmWrite()

    expect(writeError.value).toBe(CONFLICT_MESSAGE)
    expect(writeSuccess.value).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// D-8: Remote write failure (401) shows a non-blocking error
// ---------------------------------------------------------------------------

describe('D-8: remote write failure shows a non-blocking error', () => {
  it('notifies onUnauthorized and sets the session-expired message on a 401 PUT', async () => {
    const fetchMock = buildFetchMock(githubReadResponse(EXISTING_PREFERENCES, EXISTING_SHA), {
      status: 401,
      json: () => Promise.resolve({}),
    })
    vi.stubGlobal('fetch', fetchMock)
    const onUnauthorized = vi.fn()

    const { writeError, writeSuccess, markStationChange, pushPreferences, confirmWrite } =
      await freshComposable()
    markStationChange(ADDED_STATION_CHANGE)
    await pushPreferences(true, REPO_CONFIG, UPDATED_PREFERENCES_ADD, true)
    await confirmWrite(onUnauthorized)

    expect(onUnauthorized).toHaveBeenCalledTimes(1)
    expect(writeError.value).toBe(UNAUTHORIZED_MESSAGE)
    expect(writeSuccess.value).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// D-9: Written JSON never includes repo configuration
// ---------------------------------------------------------------------------

describe('D-9: written JSON never includes repo configuration', () => {
  it('the PUT body content decodes to only fuelTypeDefault and favoriteStations', async () => {
    const fetchMock = buildFetchMock(
      githubReadResponse(EXISTING_PREFERENCES, EXISTING_SHA),
      githubWriteResponse(),
    )
    vi.stubGlobal('fetch', fetchMock)

    const { markStationChange, pushPreferences, confirmWrite } = await freshComposable()
    markStationChange(ADDED_STATION_CHANGE)
    await pushPreferences(true, REPO_CONFIG, UPDATED_PREFERENCES_ADD, true)
    await confirmWrite()

    const putBody = putBodyOf(fetchMock, 1)
    const writtenContent = JSON.parse(decodeBase64Utf8(putBody.content))

    expect(Object.keys(writtenContent).sort()).toEqual(['favoriteStations', 'fuelTypeDefault'])
    expect(writtenContent).not.toHaveProperty('owner')
    expect(writtenContent).not.toHaveProperty('repo')
    expect(writtenContent).not.toHaveProperty('revalidateCacheDays')
  })
})

// ---------------------------------------------------------------------------
// TC-04: No pending changes on load — hasPendingChanges is false
// ---------------------------------------------------------------------------

describe('TC-04: no pending changes on load', () => {
  it('hasPendingChanges is false before any markStationChange call', async () => {
    const { hasPendingChanges } = await freshComposable()

    expect(hasPendingChanges.value).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// TC-05/06/07/08: markStationChange makes hasPendingChanges true
// ---------------------------------------------------------------------------

describe('TC-05/06/07/08: recording a station change makes hasPendingChanges true', () => {
  it('becomes true after an edited-station change is recorded', async () => {
    const { hasPendingChanges, markStationChange } = await freshComposable()
    markStationChange(EDITED_STATION_CHANGE)

    expect(hasPendingChanges.value).toBe(true)
  })

  it('becomes true after an added-station change is recorded', async () => {
    const { hasPendingChanges, markStationChange } = await freshComposable()
    markStationChange(ADDED_STATION_CHANGE)

    expect(hasPendingChanges.value).toBe(true)
  })

  it('becomes true after a removed-station change is recorded', async () => {
    const { hasPendingChanges, markStationChange } = await freshComposable()
    markStationChange({
      kind: 'removed',
      station: { name: 'Station A', url: 'https://www.prix-carburants.gouv.fr/station/11111111' },
    })

    expect(hasPendingChanges.value).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// TC-09: Two edits recorded before a push both stay pending — no flicker
// ---------------------------------------------------------------------------

describe('TC-09: recording edits to two different stations keeps hasPendingChanges true throughout', () => {
  it('stays true after the first edit, and stays true (not flickering) after the second', async () => {
    const { hasPendingChanges, markStationChange } = await freshComposable()

    markStationChange(EDITED_STATION_CHANGE)
    expect(hasPendingChanges.value).toBe(true)

    markStationChange(ADDED_STATION_CHANGE)
    expect(hasPendingChanges.value).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// TC-11: Two pending edits bundle into a single writeDiff.stationChanges
// ---------------------------------------------------------------------------

describe('TC-11: two pending edits bundle into one writeDiff on a single push', () => {
  it('writeDiff.stationChanges contains both the renamed and the added station', async () => {
    const fetchMock = buildFetchMock(
      githubReadResponse(EXISTING_PREFERENCES, EXISTING_SHA),
      githubWriteResponse(),
    )
    vi.stubGlobal('fetch', fetchMock)

    const { writeDiff, isWriteDialogOpen, markStationChange, pushPreferences } =
      await freshComposable()
    markStationChange(EDITED_STATION_CHANGE)
    markStationChange(ADDED_STATION_CHANGE)

    const bundledPreferences: PreferencesFile = {
      fuelTypeDefault: 'SP95',
      favoriteStations: [
        ...UPDATED_PREFERENCES_EDIT.favoriteStations,
        ...UPDATED_PREFERENCES_ADD.favoriteStations.slice(1),
      ],
    }
    await pushPreferences(true, REPO_CONFIG, bundledPreferences, true)

    expect(isWriteDialogOpen.value).toBe(true)
    expect(writeDiff.value?.stationChanges).toEqual([EDITED_STATION_CHANGE, ADDED_STATION_CHANGE])
    // A single GET only — one dialog, not one push per edit.
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

// ---------------------------------------------------------------------------
// TC-12: Confirmed write clears pendingStationChanges and hides the button
// ---------------------------------------------------------------------------

describe('TC-12: a confirmed, successful write clears pendingStationChanges', () => {
  it('hasPendingChanges becomes false and writeSuccess becomes true after confirmWrite', async () => {
    const fetchMock = buildFetchMock(
      githubReadResponse(EXISTING_PREFERENCES, EXISTING_SHA),
      githubWriteResponse(),
    )
    vi.stubGlobal('fetch', fetchMock)

    const { hasPendingChanges, writeSuccess, markStationChange, pushPreferences, confirmWrite } =
      await freshComposable()
    markStationChange(ADDED_STATION_CHANGE)
    await pushPreferences(true, REPO_CONFIG, UPDATED_PREFERENCES_ADD, true)
    await confirmWrite()

    expect(writeSuccess.value).toBe(true)
    expect(hasPendingChanges.value).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// TC-13: Cancelling keeps pendingStationChanges and hasPendingChanges true
// ---------------------------------------------------------------------------

describe('TC-13: cancelling the confirmation dialog keeps the pending change', () => {
  it('hasPendingChanges stays true after cancelWrite', async () => {
    const fetchMock = buildFetchMock(
      githubReadResponse(EXISTING_PREFERENCES, EXISTING_SHA),
      githubWriteResponse(),
    )
    vi.stubGlobal('fetch', fetchMock)

    const { hasPendingChanges, markStationChange, pushPreferences, cancelWrite } =
      await freshComposable()
    markStationChange(ADDED_STATION_CHANGE)
    await pushPreferences(true, REPO_CONFIG, UPDATED_PREFERENCES_ADD, true)
    cancelWrite()

    expect(hasPendingChanges.value).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// TC-14: A failed write keeps pendingStationChanges and hasPendingChanges true
// ---------------------------------------------------------------------------

describe('TC-14: a write that fails after confirmation keeps the pending change', () => {
  it('hasPendingChanges stays true and writeError is set after a failed confirmWrite', async () => {
    const fetchMock = buildFetchMock(githubReadResponse(EXISTING_PREFERENCES, EXISTING_SHA), {
      status: 500,
      ok: false,
      json: () => Promise.resolve({}),
    })
    vi.stubGlobal('fetch', fetchMock)

    const { hasPendingChanges, writeError, markStationChange, pushPreferences, confirmWrite } =
      await freshComposable()
    markStationChange(ADDED_STATION_CHANGE)
    await pushPreferences(true, REPO_CONFIG, UPDATED_PREFERENCES_ADD, true)
    await confirmWrite()

    expect(writeError.value).not.toBeNull()
    expect(hasPendingChanges.value).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// TC-15: No remote file — creates directly, no dialog, clears pending on success
// ---------------------------------------------------------------------------

describe('TC-15: no remote preferences file yet — direct create clears the pending change', () => {
  it('opens no dialog, PUTs directly, and hasPendingChanges becomes false on success', async () => {
    const fetchMock = buildFetchMock(githubNotFoundResponse(), githubWriteResponse())
    vi.stubGlobal('fetch', fetchMock)

    const { hasPendingChanges, isWriteDialogOpen, writeSuccess, markStationChange, pushPreferences } =
      await freshComposable()
    markStationChange(ADDED_STATION_CHANGE)
    await pushPreferences(true, REPO_CONFIG, UPDATED_PREFERENCES_ADD, true)

    expect(isWriteDialogOpen.value).toBe(false)
    expect(writeSuccess.value).toBe(true)
    expect(hasPendingChanges.value).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// TC-16: After a successful push, a new edit makes hasPendingChanges true again
// ---------------------------------------------------------------------------

describe('TC-16: editing another station after a successful save makes hasPendingChanges true again', () => {
  it('hasPendingChanges is true for the new, separate pending change', async () => {
    const fetchMock = buildFetchMock(
      githubReadResponse(EXISTING_PREFERENCES, EXISTING_SHA),
      githubWriteResponse(),
    )
    vi.stubGlobal('fetch', fetchMock)

    const { hasPendingChanges, markStationChange, pushPreferences, confirmWrite } =
      await freshComposable()
    markStationChange(ADDED_STATION_CHANGE)
    await pushPreferences(true, REPO_CONFIG, UPDATED_PREFERENCES_ADD, true)
    await confirmWrite()
    expect(hasPendingChanges.value).toBe(false)

    markStationChange(EDITED_STATION_CHANGE)

    expect(hasPendingChanges.value).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// TC-21: includeStationChanges: false never bundles or clears pendingStationChanges
// ---------------------------------------------------------------------------

describe('TC-21: a fuel-type-only push (includeStationChanges: false) is unaffected by pending station changes', () => {
  it('does not include the pending station change in writeDiff and does not clear it', async () => {
    const fetchMock = buildFetchMock(
      githubReadResponse(EXISTING_PREFERENCES, EXISTING_SHA),
      githubWriteResponse(),
    )
    vi.stubGlobal('fetch', fetchMock)

    const { hasPendingChanges, writeDiff, markStationChange, pushPreferences } =
      await freshComposable()
    markStationChange(EDITED_STATION_CHANGE)

    const fuelTypeOnlyPreferences: PreferencesFile = {
      fuelTypeDefault: 'Gasoil',
      favoriteStations: EXISTING_PREFERENCES.favoriteStations,
    }
    await pushPreferences(true, REPO_CONFIG, fuelTypeOnlyPreferences, false)

    expect(writeDiff.value?.stationChanges).toEqual([])
    expect(writeDiff.value?.fuelTypeChange).toEqual({ before: 'SP95', after: 'Gasoil' })
    // The station edit pending in StationManager is neither shown nor cleared.
    expect(hasPendingChanges.value).toBe(true)
  })

  it('does not create the remote file with the pending station change when none exists yet', async () => {
    const fetchMock = buildFetchMock(githubNotFoundResponse(), githubWriteResponse())
    vi.stubGlobal('fetch', fetchMock)

    const { hasPendingChanges, markStationChange, pushPreferences } = await freshComposable()
    markStationChange(EDITED_STATION_CHANGE)

    const fuelTypeOnlyPreferences: PreferencesFile = {
      fuelTypeDefault: 'Gasoil',
      favoriteStations: [],
    }
    await pushPreferences(true, REPO_CONFIG, fuelTypeOnlyPreferences, false)

    // The station edit was never bundled into this push, so it is still pending.
    expect(hasPendingChanges.value).toBe(true)
  })
})
