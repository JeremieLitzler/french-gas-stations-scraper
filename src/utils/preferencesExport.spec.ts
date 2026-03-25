/**
 * Tests for preferencesExport pure utility functions — Issue #63.
 *
 * Scenarios covered:
 *   TC-EXP-01 — Export produces a valid JSON file with current state
 *   TC-EXP-02 — Export with empty station list
 *   TC-EXP-03 — Export filename is always preferences.json
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import type { Station } from '@/types/station'
import { buildPreferencesFile, downloadPreferencesFile } from './preferencesExport'

// ---------------------------------------------------------------------------
// TC-EXP-01 — Export produces a valid JSON file with current state
// ---------------------------------------------------------------------------

describe('TC-EXP-01: buildPreferencesFile returns the expected JSON shape', () => {
  it('includes all stations and the fuel type default', () => {
    const stations: Station[] = [
      { name: 'Station A', url: 'https://www.prix-carburants.gouv.fr/station/1' },
      { name: 'Station B', url: 'https://www.prix-carburants.gouv.fr/station/2' },
    ]
    const fuelTypeDefault = 'SP95'

    const result = buildPreferencesFile(stations, fuelTypeDefault)

    expect(result.fuelTypeDefault).toBe('SP95')
    expect(result.favoriteStations).toHaveLength(2)
    expect(result.favoriteStations[0]).toEqual({ name: 'Station A', url: 'https://www.prix-carburants.gouv.fr/station/1' })
    expect(result.favoriteStations[1]).toEqual({ name: 'Station B', url: 'https://www.prix-carburants.gouv.fr/station/2' })
  })
})

// ---------------------------------------------------------------------------
// TC-EXP-02 — Export with empty station list
// ---------------------------------------------------------------------------

describe('TC-EXP-02: buildPreferencesFile with empty state', () => {
  it('returns an empty favoriteStations array and null fuelTypeDefault', () => {
    const result = buildPreferencesFile([], null)

    expect(result.favoriteStations).toEqual([])
    expect(result.fuelTypeDefault).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// TC-EXP-03 — Export filename is always preferences.json
// ---------------------------------------------------------------------------

describe('TC-EXP-03: downloadPreferencesFile triggers download with filename preferences.json', () => {
  let createdAnchors: HTMLAnchorElement[] = []
  let originalCreateElement: typeof document.createElement
  let originalCreateObjectURL: typeof URL.createObjectURL
  let originalRevokeObjectURL: typeof URL.revokeObjectURL

  beforeEach(() => {
    createdAnchors = []
    originalCreateElement = document.createElement.bind(document)
    originalCreateObjectURL = URL.createObjectURL
    originalRevokeObjectURL = URL.revokeObjectURL

    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreateElement(tag)
      if (tag === 'a') {
        createdAnchors.push(el as HTMLAnchorElement)
        vi.spyOn(el as HTMLAnchorElement, 'click').mockImplementation(() => {})
      }
      return el
    })

    URL.createObjectURL = vi.fn(() => 'blob:mock-url')
    URL.revokeObjectURL = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    URL.createObjectURL = originalCreateObjectURL
    URL.revokeObjectURL = originalRevokeObjectURL
  })

  it('creates an anchor with download attribute set to preferences.json', () => {
    downloadPreferencesFile({ fuelTypeDefault: 'SP95', favoriteStations: [] })

    expect(createdAnchors).toHaveLength(1)
    expect(createdAnchors[0].download).toBe('preferences.json')
  })

  it('triggers a click on the anchor element', () => {
    downloadPreferencesFile({ fuelTypeDefault: null, favoriteStations: [] })

    expect(createdAnchors[0].click).toHaveBeenCalledOnce()
  })
})
