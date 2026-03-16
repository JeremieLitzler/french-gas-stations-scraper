/**
 * Tests for the updateStation operation added to useStationStorage.
 *
 * The composable is a singleton, so vi.resetModules() + dynamic import()
 * is used to get a fresh module (and therefore a fresh stations ref) for each test.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Station } from '../types/station'

// ---------------------------------------------------------------------------
// In-memory IndexedDB mock
// ---------------------------------------------------------------------------

const store = new Map<string, unknown>()

vi.mock('../utils/indexedDb', () => ({
  get: vi.fn((key: string) => Promise.resolve(store.get(key))),
  set: vi.fn((key: string, value: unknown) => {
    store.set(key, value)
    return Promise.resolve()
  }),
  del: vi.fn((key: string) => {
    store.delete(key)
    return Promise.resolve()
  }),
  resetDatabaseConnection: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function freshComposable() {
  vi.resetModules()
  const mod = await import('./useStationStorage')
  return mod.useStationStorage()
}

const stationA: Station = {
  name: 'Station A',
  url: 'https://www.prix-carburants.gouv.fr/station/11111',
}
const stationB: Station = {
  name: 'Station B',
  url: 'https://www.prix-carburants.gouv.fr/station/22222',
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  store.clear()
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// TC-18: updateStation updates in-memory list and persists
// ---------------------------------------------------------------------------

describe('TC-18: updateStation replaces the matching station and persists the list', () => {
  it('updates the reactive list and writes to IndexedDB', async () => {
    store.set('stations', [stationA, stationB])

    const { stations, loadStations, updateStation } = await freshComposable()
    await loadStations()

    const updated: Station = { name: 'New Name', url: stationA.url }
    await updateStation(stationA.url, updated)

    expect(stations.value[0].name).toBe('New Name')
    expect(stations.value[0].url).toBe(stationA.url)
    expect(stations.value).toHaveLength(2)

    const stored = store.get('stations') as Station[]
    expect(stored[0].name).toBe('New Name')
  })
})

// ---------------------------------------------------------------------------
// TC-19: updateStation rejects invalid name
// ---------------------------------------------------------------------------

describe('TC-19: updateStation throws and does not persist when name is empty', () => {
  it('throws an error and leaves the list unchanged', async () => {
    store.set('stations', [stationA])

    const { stations, loadStations, updateStation } = await freshComposable()
    await loadStations()

    await expect(
      updateStation(stationA.url, { name: '', url: stationA.url }),
    ).rejects.toThrow()

    expect(stations.value[0].name).toBe(stationA.name)

    const stored = store.get('stations') as Station[]
    expect(stored[0].name).toBe(stationA.name)
  })
})

describe('TC-19b: updateStation throws and does not persist when name is whitespace-only', () => {
  it('throws an error for whitespace-only name', async () => {
    store.set('stations', [stationA])

    const { stations, loadStations, updateStation } = await freshComposable()
    await loadStations()

    await expect(
      updateStation(stationA.url, { name: '   ', url: stationA.url }),
    ).rejects.toThrow()

    expect(stations.value[0].name).toBe(stationA.name)
  })
})

// ---------------------------------------------------------------------------
// TC-20: updateStation rejects invalid URL
// ---------------------------------------------------------------------------

describe('TC-20: updateStation throws and does not persist when URL is invalid', () => {
  it('throws an error for a URL with wrong origin', async () => {
    store.set('stations', [stationA])

    const { stations, loadStations, updateStation } = await freshComposable()
    await loadStations()

    await expect(
      updateStation(stationA.url, { name: stationA.name, url: 'https://example.com/station/1' }),
    ).rejects.toThrow()

    expect(stations.value[0].url).toBe(stationA.url)
  })
})

describe('TC-20b: updateStation throws and does not persist when URL lacks /station/ prefix', () => {
  it('throws an error for a URL with correct origin but wrong path', async () => {
    store.set('stations', [stationA])

    const { stations, loadStations, updateStation } = await freshComposable()
    await loadStations()

    await expect(
      updateStation(stationA.url, {
        name: stationA.name,
        url: 'https://www.prix-carburants.gouv.fr/other/11111',
      }),
    ).rejects.toThrow()

    expect(stations.value[0].url).toBe(stationA.url)
  })
})

// ---------------------------------------------------------------------------
// TC-21: updateStation is a no-op when original URL not found
// ---------------------------------------------------------------------------

describe('TC-21: updateStation is a no-op when the original URL does not exist', () => {
  it('does not throw and does not write to IndexedDB', async () => {
    store.set('stations', [stationA])

    const { stations, loadStations, updateStation } = await freshComposable()
    await loadStations()

    const { set } = await import('../utils/indexedDb')
    vi.clearAllMocks()

    await expect(
      updateStation('https://www.prix-carburants.gouv.fr/station/99999', {
        name: 'Ghost',
        url: 'https://www.prix-carburants.gouv.fr/station/99999',
      }),
    ).resolves.toBeUndefined()

    expect(stations.value).toHaveLength(1)
    expect(stations.value[0]).toEqual(stationA)
    expect(set).not.toHaveBeenCalled()
  })
})
