/**
 * Tests for useStationStorage composable.
 *
 * IndexedDB is mocked with an in-memory Map. The composable is a singleton,
 * so vi.resetModules() + dynamic import() is used to get a fresh module
 * (and therefore a fresh stations ref) for each test.
 *
 * loadStations behaviour (business-specifications.md Sub-Issue C, rule 7,
 * issue #64): reads and validates IndexedDB only. There is no default
 * seed list and no write-back side effect — the app never seeds a fixed
 * example station list, for any user (see test-cases.md C-16).
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
    // structuredClone simulates the IDB structured clone algorithm.
    // Passing a Vue Proxy would throw a DataCloneError here, acting as
    // a compile-time guard that toPlainStations() is applied before every set().
    const cloned = structuredClone(value)
    store.set(key, cloned)
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

const USER_STATION_A: Station = {
  name: 'Station A',
  url: 'https://www.prix-carburants.gouv.fr/station/11111111',
}
const USER_STATION_B: Station = {
  name: 'Station B',
  url: 'https://www.prix-carburants.gouv.fr/station/22222222',
}
const USER_STATION_C: Station = {
  name: 'Station C',
  url: 'https://www.prix-carburants.gouv.fr/station/33333333',
}

async function freshComposable() {
  vi.resetModules()
  const mod = await import('./useStationStorage')
  return mod.useStationStorage()
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  store.clear()
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// Happy Path
// ---------------------------------------------------------------------------

describe('TC-01: First load with an empty database yields an empty list, no seeding', () => {
  it('leaves the reactive list empty and never writes to IndexedDB', async () => {
    const { stations, loadStations } = await freshComposable()

    await loadStations()

    expect(stations.value).toEqual([])

    const { set } = await import('../utils/indexedDb')
    expect(set).not.toHaveBeenCalled()
  })
})

describe('TC-02: Load with stored stations returns exactly the stored list, unmodified', () => {
  it('does not add, remove, or reorder any stored station', async () => {
    store.set('stations', [USER_STATION_A, USER_STATION_B, USER_STATION_C])

    const { stations, loadStations } = await freshComposable()
    await loadStations()

    expect(stations.value).toEqual([USER_STATION_A, USER_STATION_B, USER_STATION_C])

    const { set } = await import('../utils/indexedDb')
    expect(set).not.toHaveBeenCalled()
  })
})

describe('TC-03: Adding a station appends it to the loaded list and persists it', () => {
  it('grows the list by one beyond the loaded count', async () => {
    store.set('stations', [USER_STATION_A, USER_STATION_B])

    const { stations, loadStations, addStation } = await freshComposable()
    await loadStations()

    expect(stations.value).toHaveLength(2)

    const newStation: Station = {
      name: 'Test Station',
      url: 'https://www.prix-carburants.gouv.fr/station/12345678',
    }
    await addStation(newStation)

    expect(stations.value).toHaveLength(3)
    expect(stations.value[2]).toEqual(newStation)

    const storedInDb = store.get('stations') as Station[]
    expect(storedInDb).toHaveLength(3)
    expect(storedInDb[2]).toEqual(newStation)
  })
})

describe('TC-04: Removing a station by URL shrinks the list and persists the removal', () => {
  it('removes only the targeted station and updates IndexedDB', async () => {
    store.set('stations', [USER_STATION_A, USER_STATION_B, USER_STATION_C])

    const { stations, loadStations, removeStation } = await freshComposable()
    await loadStations()

    expect(stations.value).toHaveLength(3)

    await removeStation(USER_STATION_B.url)

    expect(stations.value).toHaveLength(2)
    expect(stations.value.find((s) => s.url === USER_STATION_B.url)).toBeUndefined()

    const storedInDb = store.get('stations') as Station[]
    expect(storedInDb).toHaveLength(2)
    expect(storedInDb.find((s) => s.url === USER_STATION_B.url)).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Edge Cases
// ---------------------------------------------------------------------------

describe('TC-05: Removing a URL that does not exist in the list is a no-op', () => {
  it('leaves the reactive list and does not write to IndexedDB', async () => {
    store.set('stations', [USER_STATION_A, USER_STATION_B])

    const { stations, loadStations, removeStation } = await freshComposable()
    await loadStations()

    const lengthAfterLoad = stations.value.length

    vi.clearAllMocks()

    await expect(
      removeStation('https://www.prix-carburants.gouv.fr/station/99999999'),
    ).resolves.toBeUndefined()

    expect(stations.value).toHaveLength(lengthAfterLoad)

    const { set } = await import('../utils/indexedDb')
    expect(set).not.toHaveBeenCalled()
  })
})

describe('TC-07: Adding a station to an empty database results in a single station', () => {
  it('produces one station after load (empty) plus one add', async () => {
    const { stations, loadStations, addStation } = await freshComposable()
    await loadStations()

    expect(stations.value).toHaveLength(0)

    const onlyStation: Station = {
      name: 'Only Station',
      url: 'https://www.prix-carburants.gouv.fr/station/66666666',
    }
    await addStation(onlyStation)

    expect(stations.value).toHaveLength(1)
    expect(stations.value[0]).toEqual(onlyStation)

    const storedInDb = store.get('stations') as Station[]
    expect(storedInDb).toHaveLength(1)
    expect(storedInDb[0]).toEqual(onlyStation)
  })
})

describe('TC-08: All consumers of the composable share the same reactive state (singleton)', () => {
  it('reflects an addition made via one reference in the other reference', async () => {
    store.set('stations', [USER_STATION_A, USER_STATION_B])

    vi.resetModules()
    const mod = await import('./useStationStorage')

    const ref1 = mod.useStationStorage()
    const ref2 = mod.useStationStorage()

    await ref1.loadStations()

    const newStation: Station = {
      name: 'Station C',
      url: 'https://www.prix-carburants.gouv.fr/station/33333333',
    }
    await ref1.addStation(newStation)

    // Both references must see the updated list (2 + 1 = 3)
    expect(ref2.stations.value).toHaveLength(3)
    expect(ref2.stations.value[2]).toEqual(newStation)
    expect(ref1.stations.value).toBe(ref2.stations.value)
  })
})

// ---------------------------------------------------------------------------
// Security-Derived Scenarios
// ---------------------------------------------------------------------------

describe('TC-09: Attempting to add a station with a URL from a disallowed origin is rejected', () => {
  it('throws and leaves the list unchanged', async () => {
    store.set('stations', [USER_STATION_A, USER_STATION_B])

    const { stations, loadStations, addStation } = await freshComposable()
    await loadStations()

    const countBeforeAdd = stations.value.length

    await expect(
      addStation({ name: 'Evil Station', url: 'https://evil.example.com/station/1' }),
    ).rejects.toThrow()

    expect(stations.value).toHaveLength(countBeforeAdd)
  })
})

describe('TC-10: Attempting to add a station with a malformed URL is rejected', () => {
  it('throws and leaves the list unchanged', async () => {
    const { stations, loadStations, addStation } = await freshComposable()
    await loadStations()

    await expect(
      addStation({ name: 'Bad URL Station', url: 'not-a-valid-url' }),
    ).rejects.toThrow()

    expect(stations.value).toHaveLength(0)
  })
})

describe('TC-11: Attempting to add a station with a name containing HTML tags is rejected', () => {
  it('throws because the name contains angle-bracket constructs', async () => {
    const { stations, loadStations, addStation } = await freshComposable()
    await loadStations()

    await expect(
      addStation({
        name: '<script>alert(1)</script>',
        url: 'https://www.prix-carburants.gouv.fr/station/00000001',
      }),
    ).rejects.toThrow()

    expect(stations.value).toHaveLength(0)
    expect(store.get('stations')).toBeUndefined()
  })
})

describe('TC-12: Data read back from IndexedDB that lacks required fields is discarded, not seeded', () => {
  it('filters out malformed entries without adding anything in their place', async () => {
    const mixedData = [
      { name: 'Incomplete Station' }, // missing url — invalid
      { name: 'Valid Station', url: 'https://www.prix-carburants.gouv.fr/station/11111111' },
    ]
    store.set('stations', mixedData)

    const { stations, loadStations } = await freshComposable()

    await expect(loadStations()).resolves.toBeUndefined()

    expect(stations.value).toHaveLength(1)
    expect(stations.value[0].name).toBe('Valid Station')
  })
})

// ---------------------------------------------------------------------------
// Error and Failure Conditions
// ---------------------------------------------------------------------------

describe('TC-13: Load operation resolves gracefully when IndexedDB read returns undefined', () => {
  it('leaves the list empty when the store key is absent (test-cases.md C-16)', async () => {
    const { stations, loadStations } = await freshComposable()

    await expect(loadStations()).resolves.toBeUndefined()

    expect(stations.value).toEqual([])
  })
})

describe('TC-14: Load called multiple times yields the same result and never writes back', () => {
  it('keeps the same list after a second load call, with no IndexedDB write', async () => {
    store.set('stations', [USER_STATION_A, USER_STATION_B, USER_STATION_C])

    const { stations, loadStations } = await freshComposable()
    await loadStations()
    const countAfterFirstLoad = stations.value.length

    vi.clearAllMocks()

    await loadStations()
    expect(stations.value).toHaveLength(countAfterFirstLoad)

    const { set } = await import('../utils/indexedDb')
    expect(set).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// C-4, C-6: Remote-preferences sync timestamp (test-cases.md, Sub-Issue C)
// ---------------------------------------------------------------------------

describe('C-4: IndexedDB timestamp resets after adding a station', () => {
  it('writes preferencesLastSyncedAt to the current time', async () => {
    const { loadStations, addStation } = await freshComposable()
    await loadStations()

    const now = 1_700_000_000_000
    vi.spyOn(Date, 'now').mockReturnValue(now)

    await addStation({
      name: 'Timestamp Station',
      url: 'https://www.prix-carburants.gouv.fr/station/55555555',
    })

    expect(store.get('preferencesLastSyncedAt')).toBe(now)
  })
})

describe('C-6: IndexedDB timestamp resets after deleting a station', () => {
  it('writes preferencesLastSyncedAt to the current time', async () => {
    store.set('stations', [USER_STATION_A])

    const { loadStations, removeStation } = await freshComposable()
    await loadStations()

    const now = 1_700_000_000_000
    vi.spyOn(Date, 'now').mockReturnValue(now)

    await removeStation(USER_STATION_A.url)

    expect(store.get('preferencesLastSyncedAt')).toBe(now)
  })
})

// ---------------------------------------------------------------------------
// Regression: DataCloneError — Vue Proxy objects must not reach IndexedDB set()
// ---------------------------------------------------------------------------

describe('TC-NEW-02: set() is never called with Vue Proxy objects (DataCloneError regression)', () => {
  it('addStation does not throw a DataCloneError (structuredClone succeeds on the persisted value)', async () => {
    const { loadStations, addStation } = await freshComposable()
    await loadStations()

    // After loadStations the list is reactive; addStation spreads it and calls set().
    // The mock set() runs structuredClone() which would throw if any item is a Proxy.
    await expect(
      addStation({ name: 'Clone Test', url: 'https://www.prix-carburants.gouv.fr/station/77777777' }),
    ).resolves.toBeUndefined()
  })

  it('removeStation does not throw a DataCloneError after the list is reactive', async () => {
    store.set('stations', [USER_STATION_A, USER_STATION_B])
    const { loadStations, removeStation } = await freshComposable()
    await loadStations()

    await expect(removeStation(USER_STATION_A.url)).resolves.toBeUndefined()
  })

  it('updateStation does not throw a DataCloneError after the list is reactive', async () => {
    store.set('stations', [USER_STATION_A])
    const { loadStations, updateStation } = await freshComposable()
    await loadStations()

    await expect(
      updateStation(USER_STATION_A.url, {
        name: 'Updated A',
        url: USER_STATION_A.url,
      }),
    ).resolves.toBeUndefined()
  })

  it('the value persisted to IndexedDB by addStation is structuredClone-safe', async () => {
    const { loadStations, addStation } = await freshComposable()
    await loadStations()

    await addStation({ name: 'Clone Test', url: 'https://www.prix-carburants.gouv.fr/station/77777777' })

    // structuredClone is called inside the mock set(); if it did not throw,
    // the stored value is a plain object that can be read back without issues.
    const stored = store.get('stations') as Station[]
    expect(() => structuredClone(stored)).not.toThrow()
  })
})
