/**
 * Tests for useKnownFuelTypes composable — Issue #66.
 *
 * Scenarios covered:
 *   TC-01 — Returns empty list when no station results are available
 *   TC-02 — Derives fuel types from station results
 *   TC-03 — Updates reactively when station results change
 *   TC-04 — Deduplicates fuel types across stations
 */

import { ref } from 'vue'
import { describe, expect, it } from 'vitest'
import type { StationData } from '@/types/station-data'
import { useKnownFuelTypes } from './useKnownFuelTypes'

// ---------------------------------------------------------------------------
// TC-01 — Empty list when no results
// ---------------------------------------------------------------------------

describe('TC-01: useKnownFuelTypes returns an empty list when no station results are available', () => {
  it('exposes an empty knownFuelTypes list when results is empty', () => {
    const results = ref<StationData[]>([])
    const { knownFuelTypes } = useKnownFuelTypes(results)

    expect(knownFuelTypes.value).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// TC-02 — Derives fuel types from station results
// ---------------------------------------------------------------------------

describe('TC-02: useKnownFuelTypes derives fuel types from station results', () => {
  it('exposes all unique fuel types present across stations', () => {
    const results = ref<StationData[]>([
      {
        stationName: 'Station A',
        url: 'https://www.prix-carburants.gouv.fr/station/1',
        fuels: [
          { type: 'SP95', price: 1.8 },
          { type: 'Gazole', price: 1.6 },
        ],
      },
      {
        stationName: 'Station B',
        url: 'https://www.prix-carburants.gouv.fr/station/2',
        fuels: [
          { type: 'Gazole', price: 1.65 },
          { type: 'E10', price: 1.75 },
        ],
      },
    ])
    const { knownFuelTypes } = useKnownFuelTypes(results)

    expect(knownFuelTypes.value).toContain('SP95')
    expect(knownFuelTypes.value).toContain('Gazole')
    expect(knownFuelTypes.value).toContain('E10')
    expect(knownFuelTypes.value).toHaveLength(3)
  })
})

// ---------------------------------------------------------------------------
// TC-03 — Updates reactively when results change
// ---------------------------------------------------------------------------

describe('TC-03: useKnownFuelTypes updates reactively when station results change', () => {
  it('includes the new fuel type after the results ref is updated', () => {
    const results = ref<StationData[]>([
      {
        stationName: 'Station A',
        url: 'https://www.prix-carburants.gouv.fr/station/1',
        fuels: [{ type: 'SP95', price: 1.8 }],
      },
    ])
    const { knownFuelTypes } = useKnownFuelTypes(results)

    expect(knownFuelTypes.value).not.toContain('GPL')

    results.value = [
      ...results.value,
      {
        stationName: 'Station B',
        url: 'https://www.prix-carburants.gouv.fr/station/2',
        fuels: [{ type: 'GPL', price: 0.9 }],
      },
    ]

    expect(knownFuelTypes.value).toContain('GPL')
  })
})

// ---------------------------------------------------------------------------
// TC-04 — Deduplicates fuel types across stations
// ---------------------------------------------------------------------------

describe('TC-04: useKnownFuelTypes deduplicates fuel types that appear in multiple stations', () => {
  it('lists SP95 exactly once even when multiple stations offer it', () => {
    const results = ref<StationData[]>([
      {
        stationName: 'Station A',
        url: 'https://www.prix-carburants.gouv.fr/station/1',
        fuels: [{ type: 'SP95', price: 1.8 }],
      },
      {
        stationName: 'Station B',
        url: 'https://www.prix-carburants.gouv.fr/station/2',
        fuels: [{ type: 'SP95', price: 1.82 }],
      },
      {
        stationName: 'Station C',
        url: 'https://www.prix-carburants.gouv.fr/station/3',
        fuels: [{ type: 'SP95', price: 1.79 }],
      },
    ])
    const { knownFuelTypes } = useKnownFuelTypes(results)

    const sp95Count = knownFuelTypes.value.filter((t) => t === 'SP95').length
    expect(sp95Count).toBe(1)
  })
})
