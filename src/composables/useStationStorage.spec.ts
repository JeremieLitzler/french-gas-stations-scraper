/**
 * Tests for useStationStorage composable.
 *
 * IndexedDB is mocked with an in-memory Map. The composable is a singleton,
 * so vi.resetModules() + dynamic import() is used to get a fresh module
 * (and therefore a fresh stations ref) for each test.
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

const DEFAULT_STATIONS: Station[] = [
  { name: 'à INTERMARCHE AOSTE', url: 'https://www.prix-carburants.gouv.fr/station/38490005' },
  { name: 'à INTERMARCHE APPRIEU', url: 'https://www.prix-carburants.gouv.fr/station/38140005' },
  { name: 'à SUPER U APPRIEU', url: 'https://www.prix-carburants.gouv.fr/station/38690006' },
  {
    name: "à INTERMARCHE TAIN L'HERMITAGE",
    url: 'https://www.prix-carburants.gouv.fr/station/26600007',
  },
  { name: 'à SUPER U SAINT-DONAT', url: 'https://www.prix-carburants.gouv.fr/station/26260001' },
]

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

describe('TC-01: First load with empty database seeds the five default stations', () => {
  it('populates the reactive list with the five defaults and persists them', async () => {
    const { stations, loadStations } = await freshComposable()

    await loadStations()

    expect(stations.value).toHaveLength(5)
    expect(stations.value).toEqual(DEFAULT_STATIONS)

    const storedInDb = store.get('stations') as Station[]
    expect(storedInDb).toEqual(DEFAULT_STATIONS)
  })
})

describe('TC-02: Subsequent load with populated database restores the stored list', () => {
  it('uses the stored list and does not overwrite with defaults', async () => {
    const threeStations: Station[] = [
      { name: 'Station A', url: 'https://www.prix-carburants.gouv.fr/station/11111111' },
      { name: 'Station B', url: 'https://www.prix-carburants.gouv.fr/station/22222222' },
      { name: 'Station C', url: 'https://www.prix-carburants.gouv.fr/station/33333333' },
    ]
    store.set('stations', threeStations)

    const { stations, loadStations } = await freshComposable()
    await loadStations()

    expect(stations.value).toHaveLength(3)
    expect(stations.value).toEqual(threeStations)

    const storedInDb = store.get('stations') as Station[]
    expect(storedInDb).toEqual(threeStations)
  })
})

describe('TC-03: Adding a station appends it to the reactive list and persists it', () => {
  it('grows the list by one and writes all three stations to IndexedDB', async () => {
    const initial: Station[] = [
      { name: 'Station A', url: 'https://www.prix-carburants.gouv.fr/station/11111111' },
      { name: 'Station B', url: 'https://www.prix-carburants.gouv.fr/station/22222222' },
    ]
    store.set('stations', initial)

    const { stations, loadStations, addStation } = await freshComposable()
    await loadStations()

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
    const threeStations: Station[] = [
      { name: 'Station A', url: 'https://www.prix-carburants.gouv.fr/station/11111111' },
      { name: 'Station B', url: 'https://www.prix-carburants.gouv.fr/station/22222222' },
      { name: 'Station C', url: 'https://www.prix-carburants.gouv.fr/station/33333333' },
    ]
    store.set('stations', threeStations)

    const { stations, loadStations, removeStation } = await freshComposable()
    await loadStations()

    await removeStation('https://www.prix-carburants.gouv.fr/station/22222222')

    expect(stations.value).toHaveLength(2)
    expect(stations.value.find((s) => s.url === 'https://www.prix-carburants.gouv.fr/station/22222222')).toBeUndefined()
    expect(stations.value[0]).toEqual(threeStations[0])
    expect(stations.value[1]).toEqual(threeStations[2])

    const storedInDb = store.get('stations') as Station[]
    expect(storedInDb).toHaveLength(2)
    expect(storedInDb.find((s) => s.url === 'https://www.prix-carburants.gouv.fr/station/22222222')).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Edge Cases
// ---------------------------------------------------------------------------

describe('TC-05: Removing a URL that does not exist in the list is a no-op', () => {
  it('leaves the reactive list and IndexedDB unchanged', async () => {
    const twoStations: Station[] = [
      { name: 'Station A', url: 'https://www.prix-carburants.gouv.fr/station/11111111' },
      { name: 'Station B', url: 'https://www.prix-carburants.gouv.fr/station/22222222' },
    ]
    store.set('stations', twoStations)

    const { stations, loadStations, removeStation } = await freshComposable()
    await loadStations()

    const setCallsBefore = (store.get('stations') as Station[]).length

    await expect(
      removeStation('https://www.prix-carburants.gouv.fr/station/99999999'),
    ).resolves.toBeUndefined()

    expect(stations.value).toHaveLength(2)
    expect(store.get('stations')).toEqual(twoStations)

    // The set call count should not have increased (no write on no-op)
    const { set } = await import('../utils/indexedDb')
    // set was called once during loadStations? No — loadStations with existing data does no write.
    // set was not called at all after removeStation no-op, so mock call count should be 0.
    expect(set).not.toHaveBeenCalled()

    void setCallsBefore // suppress unused warning
  })
})

describe('TC-06: Second load when database already has data does not re-apply defaults', () => {
  it('loads six stations (five defaults plus one user station) without overwriting', async () => {
    const sixStations: Station[] = [
      ...DEFAULT_STATIONS,
      { name: 'User Station', url: 'https://www.prix-carburants.gouv.fr/station/99999999' },
    ]
    store.set('stations', sixStations)

    const { stations, loadStations } = await freshComposable()
    await loadStations()

    expect(stations.value).toHaveLength(6)
    expect(stations.value).toEqual(sixStations)

    const storedInDb = store.get('stations') as Station[]
    expect(storedInDb).toEqual(sixStations)
  })
})

describe('TC-07: Adding a station to an empty list (after first-load seed) results in six stations', () => {
  it('produces six stations with the new one last', async () => {
    const { stations, loadStations, addStation } = await freshComposable()
    await loadStations()

    expect(stations.value).toHaveLength(5)

    const sixth: Station = {
      name: 'Sixth Station',
      url: 'https://www.prix-carburants.gouv.fr/station/66666666',
    }
    await addStation(sixth)

    expect(stations.value).toHaveLength(6)
    expect(stations.value[5]).toEqual(sixth)

    const storedInDb = store.get('stations') as Station[]
    expect(storedInDb).toHaveLength(6)
    expect(storedInDb[5]).toEqual(sixth)
  })
})

describe('TC-08: All consumers of the composable share the same reactive state (singleton)', () => {
  it('reflects an addition made via one reference in the other reference', async () => {
    const twoStations: Station[] = [
      { name: 'Station A', url: 'https://www.prix-carburants.gouv.fr/station/11111111' },
      { name: 'Station B', url: 'https://www.prix-carburants.gouv.fr/station/22222222' },
    ]
    store.set('stations', twoStations)

    // Reset modules once, then import the module twice to get two call-site references
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

    // Both references must see the updated list
    expect(ref2.stations.value).toHaveLength(3)
    expect(ref2.stations.value[2]).toEqual(newStation)
    expect(ref1.stations.value).toBe(ref2.stations.value)
  })
})

// ---------------------------------------------------------------------------
// Security-Derived Scenarios
// ---------------------------------------------------------------------------

describe('TC-09: Attempting to add a station with a URL from a disallowed origin is rejected', () => {
  it('throws and leaves the list and IndexedDB unchanged', async () => {
    const twoStations: Station[] = [
      { name: 'Station A', url: 'https://www.prix-carburants.gouv.fr/station/11111111' },
      { name: 'Station B', url: 'https://www.prix-carburants.gouv.fr/station/22222222' },
    ]
    store.set('stations', twoStations)

    const { stations, loadStations, addStation } = await freshComposable()
    await loadStations()

    await expect(
      addStation({ name: 'Evil Station', url: 'https://evil.example.com/station/1' }),
    ).rejects.toThrow()

    expect(stations.value).toHaveLength(2)
    const storedInDb = store.get('stations') as Station[]
    expect(storedInDb).toEqual(twoStations)
  })
})

describe('TC-10: Attempting to add a station with a malformed URL is rejected', () => {
  it('throws and leaves the list unchanged', async () => {
    const { stations, loadStations, addStation } = await freshComposable()
    await loadStations()

    await expect(
      addStation({ name: 'Bad URL Station', url: 'not-a-valid-url' }),
    ).rejects.toThrow()

    // List remains at five defaults
    expect(stations.value).toHaveLength(5)
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

    expect(stations.value).toHaveLength(5)

    const storedInDb = store.get('stations') as Station[]
    // IndexedDB was written once (the seed); no additional write for the rejected station
    expect(storedInDb).toHaveLength(5)
    expect(
      storedInDb.some((s) => s.name.includes('<script>')),
    ).toBe(false)
  })
})

describe('TC-12: Data read back from IndexedDB that lacks required fields is discarded', () => {
  it('filters out malformed entries while loading valid ones normally', async () => {
    const mixedData = [
      { name: 'Incomplete Station' }, // missing url — invalid
      { name: 'Valid Station', url: 'https://www.prix-carburants.gouv.fr/station/11111111' },
    ]
    store.set('stations', mixedData)

    const { stations, loadStations } = await freshComposable()

    await expect(loadStations()).resolves.toBeUndefined()

    expect(stations.value).toHaveLength(1)
    expect(stations.value[0]).toEqual({
      name: 'Valid Station',
      url: 'https://www.prix-carburants.gouv.fr/station/11111111',
    })
  })
})

// ---------------------------------------------------------------------------
// Error and Failure Conditions
// ---------------------------------------------------------------------------

describe('TC-13: Load operation resolves gracefully when IndexedDB read returns undefined', () => {
  it('seeds the five defaults when the store key is absent', async () => {
    // store is empty — get('stations') returns undefined

    const { stations, loadStations } = await freshComposable()

    await expect(loadStations()).resolves.toBeUndefined()

    expect(stations.value).toHaveLength(5)
    expect(stations.value).toEqual(DEFAULT_STATIONS)
  })
})

describe('TC-14: Load called multiple times does not corrupt the stored data', () => {
  it('keeps the same three stations after a second load call', async () => {
    const threeStations: Station[] = [
      { name: 'Station A', url: 'https://www.prix-carburants.gouv.fr/station/11111111' },
      { name: 'Station B', url: 'https://www.prix-carburants.gouv.fr/station/22222222' },
      { name: 'Station C', url: 'https://www.prix-carburants.gouv.fr/station/33333333' },
    ]
    store.set('stations', threeStations)

    const { stations, loadStations } = await freshComposable()
    await loadStations()
    await loadStations()

    expect(stations.value).toHaveLength(3)
    expect(stations.value).toEqual(threeStations)

    const storedInDb = store.get('stations') as Station[]
    expect(storedInDb).toEqual(threeStations)
  })
})
