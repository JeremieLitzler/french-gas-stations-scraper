/**
 * Tests for the updateStation operation added to useStationStorage.
 *
 * The composable is a singleton, so vi.resetModules() + dynamic import()
 * is used to get a fresh module (and therefore a fresh stations ref) for each test.
 *
 * Note: loadStations always merges the five README defaults. Tests that seed
 * non-default stations will see 5 + N entries after loadStations.
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

// Use unique URLs that don't overlap with DEFAULT_STATIONS
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
  it('updates name and writes to IndexedDB, preserving other stations', async () => {
    store.set('stations', [stationA, stationB])

    const { stations, loadStations, updateStation } = await freshComposable()
    await loadStations()

    const countBeforeUpdate = stations.value.length

    const updated: Station = { name: 'New Name', url: stationA.url }
    await updateStation(stationA.url, updated)

    // List length unchanged
    expect(stations.value).toHaveLength(countBeforeUpdate)

    // Target station now has new name
    const found = stations.value.find((s) => s.url === stationA.url)
    expect(found?.name).toBe('New Name')

    // Persisted correctly
    const stored = store.get('stations') as Station[]
    const storedFound = stored.find((s) => s.url === stationA.url)
    expect(storedFound?.name).toBe('New Name')
  })
})

// ---------------------------------------------------------------------------
// TC-19: updateStation rejects invalid name
// ---------------------------------------------------------------------------

describe('TC-19: updateStation throws and does not persist when name is empty', () => {
  it('throws an error and leaves the station unchanged', async () => {
    store.set('stations', [stationA])

    const { stations, loadStations, updateStation } = await freshComposable()
    await loadStations()

    await expect(
      updateStation(stationA.url, { name: '', url: stationA.url }),
    ).rejects.toThrow()

    const found = stations.value.find((s) => s.url === stationA.url)
    expect(found?.name).toBe(stationA.name)

    const stored = store.get('stations') as Station[]
    const storedFound = stored.find((s) => s.url === stationA.url)
    expect(storedFound?.name).toBe(stationA.name)
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

    const found = stations.value.find((s) => s.url === stationA.url)
    expect(found?.name).toBe(stationA.name)
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

    const found = stations.value.find((s) => s.url === stationA.url)
    expect(found?.url).toBe(stationA.url)
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

    const found = stations.value.find((s) => s.url === stationA.url)
    expect(found?.url).toBe(stationA.url)
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

    const countAfterLoad = stations.value.length
    vi.clearAllMocks()

    const { set } = await import('../utils/indexedDb')

    await expect(
      updateStation('https://www.prix-carburants.gouv.fr/station/99999', {
        name: 'Ghost',
        url: 'https://www.prix-carburants.gouv.fr/station/99999',
      }),
    ).resolves.toBeUndefined()

    expect(stations.value).toHaveLength(countAfterLoad)
    expect(stations.value.find((s) => s.url === stationA.url)).toEqual(stationA)
    expect(set).not.toHaveBeenCalled()
  })
})
