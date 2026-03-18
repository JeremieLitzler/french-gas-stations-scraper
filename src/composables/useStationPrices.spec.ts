/**
 * Tests for useStationPrices composable.
 *
 * `fetch` is mocked via vi.stubGlobal so each test controls per-station
 * HTTP responses without real network calls.
 *
 * `loadAllStationPrices` accepts the station list as a parameter, so no
 * useStationStorage mock is needed here.
 *
 * vi.resetModules() + dynamic import() is used to get a fresh composable
 * instance for each test — the composable uses standard Vue pattern
 * (refs declared inside the function body), so each call to useStationPrices()
 * returns independent reactive state.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Station } from '../types/station'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATION_A: Station = {
  name: 'Station A',
  url: 'https://www.prix-carburants.gouv.fr/station/11111111',
}
const STATION_B: Station = {
  name: 'Station B',
  url: 'https://www.prix-carburants.gouv.fr/station/22222222',
}
const STATION_C: Station = {
  name: 'Station C',
  url: 'https://www.prix-carburants.gouv.fr/station/33333333',
}

const VALID_HTML = `
  <table class="details_pdv">
    <tbody>
      <tr><td><strong>SP95</strong></td><td class="prix"><strong>1.799</strong></td></tr>
    </tbody>
  </table>
`

function makeFetchSuccess(html: string) {
  return vi.fn().mockResolvedValue({
    json: () => Promise.resolve({ success: true, html }),
  })
}

function makeFetchSelectorNotFound() {
  return vi.fn().mockResolvedValue({
    json: () => Promise.resolve({ success: false, error: 'selector_not_found' }),
  })
}

function makeFetchNetworkError() {
  return vi.fn().mockRejectedValue(new Error('Network error'))
}

function makeFetchUnexpectedShape() {
  return vi.fn().mockResolvedValue({
    json: () => Promise.resolve({ something: 'unexpected' }),
  })
}

async function freshComposable() {
  vi.resetModules()
  const mod = await import('./useStationPrices')
  return mod.useStationPrices()
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.restoreAllMocks()
})

// ---------------------------------------------------------------------------
// TC-01: All stations succeed
// ---------------------------------------------------------------------------

describe('TC-01: all stations succeed — results populated, warnings empty', () => {
  it('populates results with one entry per station and leaves warnings empty', async () => {
    vi.stubGlobal('fetch', makeFetchSuccess(VALID_HTML))

    const { results, warnings, isLoading, loadAllStationPrices } = await freshComposable()

    await loadAllStationPrices([STATION_A, STATION_B, STATION_C])

    expect(results.value).toHaveLength(3)
    expect(warnings.value).toHaveLength(0)
    expect(isLoading.value).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// TC-02: One station returns selector_not_found
// ---------------------------------------------------------------------------

describe('TC-02: one station returns selector_not_found — placed in warnings', () => {
  it('puts the failing station in warnings and successful ones in results', async () => {
    let callCount = 0
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() => {
        callCount++
        if (callCount === 2) {
          return Promise.resolve({ json: () => Promise.resolve({ success: false, error: 'selector_not_found' }) })
        }
        return Promise.resolve({ json: () => Promise.resolve({ success: true, html: VALID_HTML }) })
      }),
    )

    const { results, warnings, isLoading, loadAllStationPrices } = await freshComposable()

    await loadAllStationPrices([STATION_A, STATION_B, STATION_C])

    expect(results.value).toHaveLength(2)
    expect(warnings.value).toHaveLength(1)
    expect(isLoading.value).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// TC-03: All stations return selector_not_found
// ---------------------------------------------------------------------------

describe('TC-03: all stations return selector_not_found — results empty, all in warnings', () => {
  it('leaves results empty and puts all stations in warnings', async () => {
    vi.stubGlobal('fetch', makeFetchSelectorNotFound())

    const { results, warnings, isLoading, loadAllStationPrices } = await freshComposable()

    await loadAllStationPrices([STATION_A, STATION_B])

    expect(results.value).toHaveLength(0)
    expect(warnings.value).toHaveLength(2)
    expect(isLoading.value).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// TC-04: isLoading transitions
// ---------------------------------------------------------------------------

describe('TC-04: isLoading is true during fetch and false after all settle', () => {
  it('is true immediately after triggering and false after completion', async () => {
    let resolveFetch!: (value: unknown) => void
    const pendingPromise = new Promise((resolve) => { resolveFetch = resolve })

    vi.stubGlobal(
      'fetch',
      vi.fn().mockReturnValue(
        pendingPromise.then(() => ({
          json: () => Promise.resolve({ success: true, html: VALID_HTML }),
        })),
      ),
    )

    const { isLoading, loadAllStationPrices } = await freshComposable()

    const loadingPromise = loadAllStationPrices([STATION_A])
    // isLoading must be true before the fetch resolves
    expect(isLoading.value).toBe(true)

    resolveFetch(undefined)
    await loadingPromise

    expect(isLoading.value).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// TC-05: Network error for one station treated as warning
// ---------------------------------------------------------------------------

describe('TC-05: network error for one station — treated as warning', () => {
  it('puts the erroring station in warnings and keeps the successful one in results', async () => {
    let callCount = 0
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return Promise.reject(new Error('Network error'))
        }
        return Promise.resolve({ json: () => Promise.resolve({ success: true, html: VALID_HTML }) })
      }),
    )

    const { results, warnings, isLoading, loadAllStationPrices } = await freshComposable()

    await loadAllStationPrices([STATION_A, STATION_B])

    expect(warnings.value).toHaveLength(1)
    expect(results.value).toHaveLength(1)
    expect(isLoading.value).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// TC-06: All stations produce network errors
// ---------------------------------------------------------------------------

describe('TC-06: all stations produce network errors — results empty, all in warnings', () => {
  it('leaves results empty and puts all stations in warnings', async () => {
    vi.stubGlobal('fetch', makeFetchNetworkError())

    const { results, warnings, isLoading, loadAllStationPrices } = await freshComposable()

    await loadAllStationPrices([STATION_A, STATION_B])

    expect(results.value).toHaveLength(0)
    expect(warnings.value).toHaveLength(2)
    expect(isLoading.value).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// TC-07: Empty station list
// ---------------------------------------------------------------------------

describe('TC-07: empty station list — no loading, no results, no warnings', () => {
  it('makes no fetch calls and leaves all state at defaults', async () => {
    const mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)

    const { results, warnings, isLoading, loadAllStationPrices } = await freshComposable()

    await loadAllStationPrices([])

    expect(isLoading.value).toBe(false)
    expect(results.value).toHaveLength(0)
    expect(warnings.value).toHaveLength(0)
    expect(mockFetch).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// TC-08: Station URL is percent-encoded in the fetch request
// ---------------------------------------------------------------------------

describe('TC-08: station URL is percent-encoded in the fetch request', () => {
  it('calls fetch with the station URL percent-encoded in the query string', async () => {
    const specialStation: Station = {
      name: 'Special',
      url: 'https://www.prix-carburants.gouv.fr/station/12345?foo=bar&baz=qux',
    }

    const mockFetch = makeFetchSuccess(VALID_HTML)
    vi.stubGlobal('fetch', mockFetch)

    const { loadAllStationPrices } = await freshComposable()
    await loadAllStationPrices([specialStation])

    const calledUrl = mockFetch.mock.calls[0][0] as string
    expect(calledUrl).toContain('url=')
    expect(calledUrl).toContain(encodeURIComponent(specialStation.url))
    expect(calledUrl).not.toContain(specialStation.url.slice(specialStation.url.indexOf('?')))
  })
})

// ---------------------------------------------------------------------------
// TC-09: Netlify function returns unexpected response shape
// ---------------------------------------------------------------------------

describe('TC-09: unexpected response shape — treated as warning', () => {
  it('puts the station in warnings and leaves results empty', async () => {
    vi.stubGlobal('fetch', makeFetchUnexpectedShape())

    const { results, warnings, isLoading, loadAllStationPrices } = await freshComposable()

    await loadAllStationPrices([STATION_A])

    expect(warnings.value).toHaveLength(1)
    expect(results.value).toHaveLength(0)
    expect(isLoading.value).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// TC-10: Re-triggering clears previous state
// ---------------------------------------------------------------------------

describe('TC-10: re-triggering clears previous state', () => {
  it('clears results and warnings at the start of a new fetch run', async () => {
    vi.stubGlobal('fetch', makeFetchSuccess(VALID_HTML))

    const { results, warnings, loadAllStationPrices } = await freshComposable()

    await loadAllStationPrices([STATION_A, STATION_B])
    expect(results.value).toHaveLength(2)

    vi.stubGlobal('fetch', makeFetchSuccess(VALID_HTML))

    await loadAllStationPrices([STATION_C])

    expect(results.value).toHaveLength(1)
    expect(results.value[0].stationName).toBe(STATION_C.name)
    expect(warnings.value).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// TC-11: Warning entry contains station name and URL
// ---------------------------------------------------------------------------

describe('TC-11: warning entry contains station name and URL', () => {
  it('populates stationName and url fields on the warning entry', async () => {
    vi.stubGlobal('fetch', makeFetchSelectorNotFound())

    const { warnings, loadAllStationPrices } = await freshComposable()

    await loadAllStationPrices([STATION_A])

    expect(warnings.value).toHaveLength(1)
    expect(warnings.value[0].stationName).toBe(STATION_A.name)
    expect(warnings.value[0].url).toBe(STATION_A.url)
  })
})

// ---------------------------------------------------------------------------
// TC-14: Independent state — each composable call returns its own refs
// ---------------------------------------------------------------------------

describe('TC-14: independent state — each useStationPrices() call returns its own refs', () => {
  it('state changes in one instance do not affect another instance', async () => {
    vi.stubGlobal('fetch', makeFetchSuccess(VALID_HTML))

    vi.resetModules()
    const mod = await import('./useStationPrices')

    const consumer1 = mod.useStationPrices()
    const consumer2 = mod.useStationPrices()

    await consumer1.loadAllStationPrices([STATION_A])

    expect(consumer1.results.value).toHaveLength(1)
    expect(consumer2.results.value).toHaveLength(0)
    expect(consumer1.results.value).not.toBe(consumer2.results.value)
  })
})

// ---------------------------------------------------------------------------
// TC-15: Fetch calls are initiated concurrently
// ---------------------------------------------------------------------------

describe('TC-15: fetch calls are initiated concurrently, not sequentially', () => {
  it('starts all fetches before any of them resolves', async () => {
    const fetchCallTimes: number[] = []
    const resolvers: Array<() => void> = []

    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() => {
        fetchCallTimes.push(Date.now())
        return new Promise<{ json: () => Promise<unknown> }>((resolve) => {
          resolvers.push(() =>
            resolve({ json: () => Promise.resolve({ success: true, html: VALID_HTML }) }),
          )
        })
      }),
    )

    const { loadAllStationPrices } = await freshComposable()
    const loadPromise = loadAllStationPrices([STATION_A, STATION_B])

    // Both fetches must have been called before we resolve any
    await Promise.resolve() // allow microtasks to run
    expect(fetchCallTimes).toHaveLength(2)

    // Now resolve all
    for (const resolve of resolvers) resolve()
    await loadPromise
  })
})

// ---------------------------------------------------------------------------
// Issue-31 TC-01: removeStationPrice removes matching result entry
// ---------------------------------------------------------------------------

describe('Issue-31 TC-01: removeStationPrice removes the matching result and leaves others intact', () => {
  it('removes only the result with the matching URL', async () => {
    vi.stubGlobal('fetch', makeFetchSuccess(VALID_HTML))

    const { results, removeStationPrice, loadAllStationPrices } = await freshComposable()

    await loadAllStationPrices([STATION_A, STATION_B, STATION_C])
    expect(results.value).toHaveLength(3)

    removeStationPrice(STATION_B.url)

    expect(results.value).toHaveLength(2)
    expect(results.value.every((r) => r.url !== STATION_B.url)).toBe(true)
    expect(results.value.some((r) => r.url === STATION_A.url)).toBe(true)
    expect(results.value.some((r) => r.url === STATION_C.url)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Issue-31 TC-01 (warnings): removeStationPrice also removes matching warning
// ---------------------------------------------------------------------------

describe('Issue-31 TC-01 (warnings): removeStationPrice removes the matching warning entry', () => {
  it('removes only the warning with the matching URL', async () => {
    vi.stubGlobal('fetch', makeFetchSelectorNotFound())

    const { warnings, removeStationPrice, loadAllStationPrices } = await freshComposable()

    await loadAllStationPrices([STATION_A, STATION_B])
    expect(warnings.value).toHaveLength(2)

    removeStationPrice(STATION_A.url)

    expect(warnings.value).toHaveLength(1)
    expect(warnings.value[0].url).toBe(STATION_B.url)
  })
})

// ---------------------------------------------------------------------------
// Issue-31 TC-04: renameStation updates the stationName without re-fetching
// ---------------------------------------------------------------------------

describe('Issue-31 TC-04: renameStation updates stationName without triggering a fetch', () => {
  it('renames the matching result and leaves fuels unchanged', async () => {
    const mockFetch = makeFetchSuccess(VALID_HTML)
    vi.stubGlobal('fetch', mockFetch)

    const { results, renameStation, loadAllStationPrices } = await freshComposable()

    await loadAllStationPrices([STATION_A])
    const callsAfterLoad = mockFetch.mock.calls.length

    renameStation(STATION_A.url, 'Renamed Station')

    expect(mockFetch.mock.calls.length).toBe(callsAfterLoad)
    expect(results.value[0].stationName).toBe('Renamed Station')
    expect(results.value[0].url).toBe(STATION_A.url)
    expect(results.value[0].fuels).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// Issue-31 TC-04 (non-match): renameStation ignores entries that do not match
// ---------------------------------------------------------------------------

describe('Issue-31 TC-04 (non-match): renameStation does not affect entries with a different URL', () => {
  it('leaves all other results unchanged', async () => {
    vi.stubGlobal('fetch', makeFetchSuccess(VALID_HTML))

    const { results, renameStation, loadAllStationPrices } = await freshComposable()

    await loadAllStationPrices([STATION_A, STATION_B])

    renameStation(STATION_A.url, 'Renamed A')

    const stationB = results.value.find((r) => r.url === STATION_B.url)
    expect(stationB?.stationName).toBe(STATION_B.name)
  })
})

// ---------------------------------------------------------------------------
// Issue-31 TC-05: addStationPrice appends result on successful fetch
// ---------------------------------------------------------------------------

describe('Issue-31 TC-05: addStationPrice appends a new result on successful fetch', () => {
  it('appends the new station result after a successful fetch', async () => {
    vi.stubGlobal('fetch', makeFetchSuccess(VALID_HTML))

    const { results, addStationPrice } = await freshComposable()

    expect(results.value).toHaveLength(0)

    await addStationPrice(STATION_A)

    expect(results.value).toHaveLength(1)
    expect(results.value[0].url).toBe(STATION_A.url)
    expect(results.value[0].stationName).toBe(STATION_A.name)
  })
})

// ---------------------------------------------------------------------------
// Issue-31 TC-06: addStationPrice adds to warnings on failed fetch
// ---------------------------------------------------------------------------

describe('Issue-31 TC-06: addStationPrice places station in warnings on failed fetch', () => {
  it('adds a warning entry and no result when fetch fails', async () => {
    vi.stubGlobal('fetch', makeFetchSelectorNotFound())

    const { results, warnings, addStationPrice } = await freshComposable()

    await addStationPrice(STATION_A)

    expect(results.value).toHaveLength(0)
    expect(warnings.value).toHaveLength(1)
    expect(warnings.value[0].url).toBe(STATION_A.url)
  })
})

// ---------------------------------------------------------------------------
// Issue-31 TC-10: addStationPrice sets isLoading during fetch and clears it after
// ---------------------------------------------------------------------------

describe('Issue-31 TC-10: addStationPrice sets isLoading to true during fetch and false after', () => {
  it('is true before the fetch resolves and false after', async () => {
    let resolveFetch!: (value: unknown) => void
    const pendingPromise = new Promise((resolve) => { resolveFetch = resolve })

    vi.stubGlobal(
      'fetch',
      vi.fn().mockReturnValue(
        pendingPromise.then(() => ({
          json: () => Promise.resolve({ success: true, html: VALID_HTML }),
        })),
      ),
    )

    const { isLoading, addStationPrice } = await freshComposable()

    const addPromise = addStationPrice(STATION_A)
    expect(isLoading.value).toBe(true)

    resolveFetch(undefined)
    await addPromise

    expect(isLoading.value).toBe(false)
  })
})
