/**
 * Tests for useStationStorage composable.
 *
 * IndexedDB is mocked with an in-memory Map. The composable is a singleton,
 * so vi.resetModules() + dynamic import() is used to get a fresh module
 * (and therefore a fresh stations ref) for each test.
 *
 * loadStations behaviour (updated):
 *   - Always merges the five README defaults into the stored list.
 *   - Missing defaults are prepended; existing stored stations are preserved.
 *   - If any defaults were missing, the merged list is persisted to IndexedDB.
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

// Non-default stations whose URLs do not overlap with DEFAULT_STATIONS
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

describe('TC-02: Load with stored non-default stations merges the five defaults in front', () => {
  it('prepends missing defaults while preserving user stations', async () => {
    store.set('stations', [USER_STATION_A, USER_STATION_B, USER_STATION_C])

    const { stations, loadStations } = await freshComposable()
    await loadStations()

    // 5 defaults prepended + 3 user stations = 8
    expect(stations.value).toHaveLength(8)

    // All five defaults are present
    for (const defaultStation of DEFAULT_STATIONS) {
      expect(stations.value.some((s) => s.url === defaultStation.url)).toBe(true)
    }

    // User stations are preserved at the end
    expect(stations.value[5]).toEqual(USER_STATION_A)
    expect(stations.value[6]).toEqual(USER_STATION_B)
    expect(stations.value[7]).toEqual(USER_STATION_C)

    // Merged list is persisted
    const storedInDb = store.get('stations') as Station[]
    expect(storedInDb).toHaveLength(8)
  })
})

describe('TC-03: Adding a station appends it to the merged list and persists it', () => {
  it('grows the list by one beyond the merged count', async () => {
    store.set('stations', [USER_STATION_A, USER_STATION_B])

    const { stations, loadStations, addStation } = await freshComposable()
    await loadStations()

    // After load: 5 defaults + 2 user = 7
    expect(stations.value).toHaveLength(7)

    const newStation: Station = {
      name: 'Test Station',
      url: 'https://www.prix-carburants.gouv.fr/station/12345678',
    }
    await addStation(newStation)

    expect(stations.value).toHaveLength(8)
    expect(stations.value[7]).toEqual(newStation)

    const storedInDb = store.get('stations') as Station[]
    expect(storedInDb).toHaveLength(8)
    expect(storedInDb[7]).toEqual(newStation)
  })
})

describe('TC-04: Removing a station by URL shrinks the list and persists the removal', () => {
  it('removes only the targeted station and updates IndexedDB', async () => {
    store.set('stations', [USER_STATION_A, USER_STATION_B, USER_STATION_C])

    const { stations, loadStations, removeStation } = await freshComposable()
    await loadStations()

    // After load: 5 defaults + 3 user = 8
    expect(stations.value).toHaveLength(8)

    await removeStation(USER_STATION_B.url)

    expect(stations.value).toHaveLength(7)
    expect(stations.value.find((s) => s.url === USER_STATION_B.url)).toBeUndefined()

    const storedInDb = store.get('stations') as Station[]
    expect(storedInDb).toHaveLength(7)
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

    // After load: 5 defaults + 2 user = 7; set was called once to persist merge
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

describe('TC-06: Load when stored list already contains all defaults does not add duplicates', () => {
  it('keeps exactly six stations when five defaults plus one user station are stored', async () => {
    const sixStations: Station[] = [
      ...DEFAULT_STATIONS,
      { name: 'User Station', url: 'https://www.prix-carburants.gouv.fr/station/99999999' },
    ]
    store.set('stations', sixStations)

    const { stations, loadStations } = await freshComposable()
    await loadStations()

    // All defaults already present — no new ones prepended
    expect(stations.value).toHaveLength(6)
    expect(stations.value).toEqual(sixStations)

    // No write needed since nothing changed
    const { set } = await import('../utils/indexedDb')
    expect(set).not.toHaveBeenCalled()
  })
})

describe('TC-07: Adding a station to an empty database results in six stations', () => {
  it('produces six stations after load-and-seed plus one add', async () => {
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
    store.set('stations', [USER_STATION_A, USER_STATION_B])

    vi.resetModules()
    const mod = await import('./useStationStorage')

    const ref1 = mod.useStationStorage()
    const ref2 = mod.useStationStorage()

    await ref1.loadStations()

    // After load: 5 defaults + 2 user = 7
    const newStation: Station = {
      name: 'Station C',
      url: 'https://www.prix-carburants.gouv.fr/station/33333333',
    }
    await ref1.addStation(newStation)

    // Both references must see the updated list (7 + 1 = 8)
    expect(ref2.stations.value).toHaveLength(8)
    expect(ref2.stations.value[7]).toEqual(newStation)
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

    // After load: 5 + 2 = 7
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
    expect(storedInDb).toHaveLength(5)
    expect(storedInDb.some((s) => s.name.includes('<script>'))).toBe(false)
  })
})

describe('TC-12: Data read back from IndexedDB that lacks required fields is discarded; defaults are merged', () => {
  it('filters out malformed entries and prepends the five defaults', async () => {
    const mixedData = [
      { name: 'Incomplete Station' }, // missing url — invalid
      { name: 'Valid Station', url: 'https://www.prix-carburants.gouv.fr/station/11111111' },
    ]
    store.set('stations', mixedData)

    const { stations, loadStations } = await freshComposable()

    await expect(loadStations()).resolves.toBeUndefined()

    // 1 valid stored + 5 defaults = 6 (defaults prepended)
    expect(stations.value).toHaveLength(6)
    expect(stations.value.some((s) => s.name === 'Valid Station')).toBe(true)
    for (const defaultStation of DEFAULT_STATIONS) {
      expect(stations.value.some((s) => s.url === defaultStation.url)).toBe(true)
    }
  })
})

// ---------------------------------------------------------------------------
// Error and Failure Conditions
// ---------------------------------------------------------------------------

describe('TC-13: Load operation resolves gracefully when IndexedDB read returns undefined', () => {
  it('seeds the five defaults when the store key is absent', async () => {
    const { stations, loadStations } = await freshComposable()

    await expect(loadStations()).resolves.toBeUndefined()

    expect(stations.value).toHaveLength(5)
    expect(stations.value).toEqual(DEFAULT_STATIONS)
  })
})

describe('TC-14: Load called multiple times does not duplicate defaults', () => {
  it('keeps the same merged count after a second load call', async () => {
    store.set('stations', [USER_STATION_A, USER_STATION_B, USER_STATION_C])

    const { stations, loadStations } = await freshComposable()
    await loadStations()
    // First load: 5 defaults + 3 user = 8; merged list is persisted to store
    const countAfterFirstLoad = stations.value.length

    await loadStations()
    // Second load reads the persisted merged list — all defaults already present, no new merge
    expect(stations.value).toHaveLength(countAfterFirstLoad)

    const storedInDb = store.get('stations') as Station[]
    expect(storedInDb).toHaveLength(countAfterFirstLoad)
  })
})

// ---------------------------------------------------------------------------
// New: Merge behaviour
// ---------------------------------------------------------------------------

describe('TC-NEW-01: Load merges only the missing defaults, not already-present ones', () => {
  it('prepends only the two defaults absent from the stored list', async () => {
    // Store 3 of the 5 defaults plus one user station
    const partialDefaults: Station[] = [
      DEFAULT_STATIONS[0],
      DEFAULT_STATIONS[2],
      DEFAULT_STATIONS[4],
      USER_STATION_A,
    ]
    store.set('stations', partialDefaults)

    const { stations, loadStations } = await freshComposable()
    await loadStations()

    // 2 missing defaults prepended + 4 stored = 6
    expect(stations.value).toHaveLength(6)

    // The two missing defaults are now present
    expect(stations.value.some((s) => s.url === DEFAULT_STATIONS[1].url)).toBe(true)
    expect(stations.value.some((s) => s.url === DEFAULT_STATIONS[3].url)).toBe(true)

    // User station still present
    expect(stations.value.some((s) => s.url === USER_STATION_A.url)).toBe(true)

    // Merged list persisted
    const storedInDb = store.get('stations') as Station[]
    expect(storedInDb).toHaveLength(6)
  })
})
