/**
 * Tests for fuelTypeUtils pure utility functions.
 *
 * TC-01 through TC-10 from test-cases.md.
 */

import { describe, expect, it } from 'vitest'
import type { StationData } from '@/types/station-data'
import { buildPriceRows, deriveFuelTypes, resolvePrice } from './fuelTypeUtils'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeStation(name: string, fuels: { type: string; price: number | null }[]): StationData {
  return { stationName: name, fuels }
}

// ---------------------------------------------------------------------------
// TC-01 — Fuel type derivation: mixed results
// ---------------------------------------------------------------------------

describe('TC-01: deriveFuelTypes with mixed results', () => {
  it('returns first-encountered order, deduplicated', () => {
    const stations: StationData[] = [
      makeStation('Station A', [
        { type: 'SP95', price: 1.89 },
        { type: 'Gasoil', price: 1.75 },
      ]),
      makeStation('Station B', [
        { type: 'SP95', price: 1.79 },
        { type: 'E85', price: 0.99 },
      ]),
    ]

    const result = deriveFuelTypes(stations)

    expect(result).toEqual(['SP95', 'Gasoil', 'E85'])
  })
})

// ---------------------------------------------------------------------------
// TC-02 — Fuel type derivation: empty results
// ---------------------------------------------------------------------------

describe('TC-02: deriveFuelTypes with empty results', () => {
  it('returns an empty list', () => {
    const result = deriveFuelTypes([])

    expect(result).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// TC-03 — Fuel type derivation: all stations carry the same types
// ---------------------------------------------------------------------------

describe('TC-03: deriveFuelTypes when all stations carry the same types', () => {
  it('returns each type exactly once', () => {
    const stations: StationData[] = [
      makeStation('Station A', [
        { type: 'SP95', price: 1.85 },
        { type: 'SP98', price: 1.95 },
      ]),
      makeStation('Station B', [
        { type: 'SP95', price: 1.80 },
        { type: 'SP98', price: 1.90 },
      ]),
      makeStation('Station C', [
        { type: 'SP95', price: 1.88 },
        { type: 'SP98', price: 1.98 },
      ]),
    ]

    const result = deriveFuelTypes(stations)

    expect(result).toEqual(['SP95', 'SP98'])
  })
})

// ---------------------------------------------------------------------------
// TC-04 — Fuel type derivation: fuel type with null price is included
// ---------------------------------------------------------------------------

describe('TC-04: deriveFuelTypes includes fuel types with null price', () => {
  it('includes the type even when its price is null', () => {
    const stations: StationData[] = [
      makeStation('Station A', [{ type: 'E10', price: null }]),
    ]

    const result = deriveFuelTypes(stations)

    expect(result).toContain('E10')
  })
})

// ---------------------------------------------------------------------------
// TC-05 — Sort order: ascending by price for selected type
// ---------------------------------------------------------------------------

describe('TC-05: buildPriceRows sorts rows ascending by price', () => {
  it('orders rows cheapest first', () => {
    const stations: StationData[] = [
      makeStation('Station A', [{ type: 'SP95', price: 1.89 }]),
      makeStation('Station B', [{ type: 'SP95', price: 1.75 }]),
      makeStation('Station C', [{ type: 'SP95', price: 1.95 }]),
    ]

    const rows = buildPriceRows(stations, 'SP95')

    expect(rows.map((r) => r.stationName)).toEqual(['Station B', 'Station A', 'Station C'])
    expect(rows.map((r) => r.resolvedPrice)).toEqual([1.75, 1.89, 1.95])
  })
})

// ---------------------------------------------------------------------------
// TC-06 — Sort order: station missing selected type sorts to bottom
// ---------------------------------------------------------------------------

describe('TC-06: buildPriceRows places station missing the type last', () => {
  it('puts the station without the fuel type at the end', () => {
    const stations: StationData[] = [
      makeStation('Station A', [{ type: 'SP95', price: 1.89 }]),
      makeStation('Station B', [{ type: 'Gasoil', price: 1.60 }]),
      makeStation('Station C', [{ type: 'SP95', price: 1.75 }]),
    ]

    const rows = buildPriceRows(stations, 'SP95')

    expect(rows[0].stationName).toBe('Station C')
    expect(rows[0].resolvedPrice).toBe(1.75)
    expect(rows[1].stationName).toBe('Station A')
    expect(rows[1].resolvedPrice).toBe(1.89)
    expect(rows[2].stationName).toBe('Station B')
    expect(rows[2].resolvedPrice).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// TC-07 — Sort order: multiple stations missing the type appear at the end
// ---------------------------------------------------------------------------

describe('TC-07: buildPriceRows places all missing-type stations after priced ones', () => {
  it('places Station A first and the two null-price stations last', () => {
    const stations: StationData[] = [
      makeStation('Station A', [{ type: 'SP95', price: 1.80 }]),
      makeStation('Station B', []),
      makeStation('Station C', []),
    ]

    const rows = buildPriceRows(stations, 'SP95')

    expect(rows[0].stationName).toBe('Station A')
    expect(rows[0].resolvedPrice).toBe(1.80)

    const remaining = rows.slice(1).map((r) => r.stationName)
    expect(remaining).toContain('Station B')
    expect(remaining).toContain('Station C')

    rows.slice(1).forEach((r) => {
      expect(r.resolvedPrice).toBeNull()
    })
  })
})

// ---------------------------------------------------------------------------
// TC-08 — Price row: null price resolves as null
// ---------------------------------------------------------------------------

describe('TC-08: resolvePrice returns null when the fuel price is null', () => {
  it('returns null for a fuel entry that exists but has a null price', () => {
    const station = makeStation('Station A', [{ type: 'SP95', price: null }])

    const result = resolvePrice(station, 'SP95')

    expect(result).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// TC-09 — Price row: station carrying the type has its price resolved
// ---------------------------------------------------------------------------

describe('TC-09: resolvePrice returns the price when the fuel type exists', () => {
  it('returns 1.85 for SP95 at Station A', () => {
    const station = makeStation('Station A', [{ type: 'SP95', price: 1.85 }])

    const result = resolvePrice(station, 'SP95')

    expect(result).toBe(1.85)
  })
})

// ---------------------------------------------------------------------------
// TC-10 — Price row: station not carrying the type has null resolved price
// ---------------------------------------------------------------------------

describe('TC-10: resolvePrice returns null when the station does not carry the type', () => {
  it('returns null when the station has no entry for the selected fuel type', () => {
    const station = makeStation('Station A', [{ type: 'Gasoil', price: 1.60 }])

    const result = resolvePrice(station, 'SP95')

    expect(result).toBeNull()
  })
})
