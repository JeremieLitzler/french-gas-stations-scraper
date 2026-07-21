/**
 * Tests for useRemotePreferencesWrite composable — Sub-Issue D, issue #64.
 *
 * useRemotePreferencesWrite is a singleton composable (ADR-002): writeDiff,
 * isWriteDialogOpen, writeError, writeSuccess, divergedNotice, and isWriting
 * are module-level refs shared across every consumer. vi.resetModules() +
 * dynamic import() gets a fresh module instance (and therefore fresh
 * reactive state) for each test, following the pattern established in
 * useRepoConfig.spec.ts and useRemotePreferencesSync.spec.ts.
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
 * Scenarios covered (test-cases.md, Sub-Issue D):
 *   D-1 — diff dialog shown before write, add station
 *   D-2 — diff dialog shown before write, edit station
 *   D-3 — confirmed write updates the remote file, add station
 *   D-4 — confirmed write updates the remote file, edit station
 *   D-5 — cancelled write leaves the remote file unchanged, shows divergence notice
 *   D-6 — first-time write creates the remote file directly, no diff dialog
 *   D-7 — stale sha (409 conflict) shows a conflict error
 *   D-8 — remote write failure (401) shows a non-blocking error
 *   D-9 — written JSON never includes repo configuration
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RepoConfigDraft } from '@/types/repo-config'
import type { PreferencesFile } from '@/types/preferences'

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
  it('opens the write-confirm dialog with before/after JSON and sends no PUT yet', async () => {
    const fetchMock = buildFetchMock(
      githubReadResponse(EXISTING_PREFERENCES, EXISTING_SHA),
      githubWriteResponse(),
    )
    vi.stubGlobal('fetch', fetchMock)

    const { writeDiff, isWriteDialogOpen, pushPreferences } = await freshComposable()
    await pushPreferences(true, REPO_CONFIG, UPDATED_PREFERENCES_ADD)

    expect(isWriteDialogOpen.value).toBe(true)
    expect(writeDiff.value?.beforeJson).toContain('Station A')
    expect(writeDiff.value?.beforeJson).not.toContain('Station B')
    expect(writeDiff.value?.afterJson).toContain('Station B')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

// ---------------------------------------------------------------------------
// D-2: Diff dialog shown before write — edit station
// ---------------------------------------------------------------------------

describe('D-2: diff dialog shown before write — edit station', () => {
  it('opens the write-confirm dialog reflecting the edited station name', async () => {
    const fetchMock = buildFetchMock(
      githubReadResponse(EXISTING_PREFERENCES, EXISTING_SHA),
      githubWriteResponse(),
    )
    vi.stubGlobal('fetch', fetchMock)

    const { writeDiff, isWriteDialogOpen, pushPreferences } = await freshComposable()
    await pushPreferences(true, REPO_CONFIG, UPDATED_PREFERENCES_EDIT)

    expect(isWriteDialogOpen.value).toBe(true)
    expect(writeDiff.value?.beforeJson).toContain('"Station A"')
    expect(writeDiff.value?.afterJson).toContain('Station A Renamed')
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

    const { writeSuccess, isWriteDialogOpen, pushPreferences, confirmWrite } =
      await freshComposable()
    await pushPreferences(true, REPO_CONFIG, UPDATED_PREFERENCES_ADD)
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

    const { writeSuccess, isWriteDialogOpen, pushPreferences, confirmWrite } =
      await freshComposable()
    await pushPreferences(true, REPO_CONFIG, UPDATED_PREFERENCES_EDIT)
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

    const { divergedNotice, isWriteDialogOpen, pushPreferences, cancelWrite } =
      await freshComposable()
    await pushPreferences(true, REPO_CONFIG, UPDATED_PREFERENCES_ADD)
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

    const { writeSuccess, isWriteDialogOpen, writeDiff, pushPreferences } =
      await freshComposable()
    await pushPreferences(true, REPO_CONFIG, UPDATED_PREFERENCES_ADD)

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
    const fetchMock = buildFetchMock(
      githubReadResponse(EXISTING_PREFERENCES, EXISTING_SHA),
      { status: 409, json: () => Promise.resolve({}) },
    )
    vi.stubGlobal('fetch', fetchMock)

    const { writeError, writeSuccess, pushPreferences, confirmWrite } = await freshComposable()
    await pushPreferences(true, REPO_CONFIG, UPDATED_PREFERENCES_ADD)
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
    const fetchMock = buildFetchMock(
      githubReadResponse(EXISTING_PREFERENCES, EXISTING_SHA),
      { status: 401, json: () => Promise.resolve({}) },
    )
    vi.stubGlobal('fetch', fetchMock)
    const onUnauthorized = vi.fn()

    const { writeError, writeSuccess, pushPreferences, confirmWrite } = await freshComposable()
    await pushPreferences(true, REPO_CONFIG, UPDATED_PREFERENCES_ADD)
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

    const { pushPreferences, confirmWrite } = await freshComposable()
    await pushPreferences(true, REPO_CONFIG, UPDATED_PREFERENCES_ADD)
    await confirmWrite()

    const putBody = putBodyOf(fetchMock, 1)
    const writtenContent = JSON.parse(decodeBase64Utf8(putBody.content))

    expect(Object.keys(writtenContent).sort()).toEqual(['favoriteStations', 'fuelTypeDefault'])
    expect(writtenContent).not.toHaveProperty('owner')
    expect(writtenContent).not.toHaveProperty('repo')
    expect(writtenContent).not.toHaveProperty('revalidateCacheDays')
  })
})
