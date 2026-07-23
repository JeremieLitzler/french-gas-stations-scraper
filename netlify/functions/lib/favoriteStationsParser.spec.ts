/**
 * Tests for favoriteStationsParser — issue #112, test-cases.md scenarios 6-8.
 */

import { describe, expect, it } from 'vitest'
import { parseFavoriteStations } from './favoriteStationsParser'

// ---------------------------------------------------------------------------
// Scenario 6: Preferences file missing or unreadable
// ---------------------------------------------------------------------------

describe('Scenario 6: the remote preferences content cannot be parsed', () => {
  it('returns null when the content is not valid JSON', () => {
    expect(parseFavoriteStations('not json')).toBeNull()
  })

  it('returns null when favoriteStations is missing from the parsed object', () => {
    expect(parseFavoriteStations(JSON.stringify({ fuelTypeDefault: 'Gazole' }))).toBeNull()
  })

  it('returns null when favoriteStations is not an array', () => {
    expect(parseFavoriteStations(JSON.stringify({ favoriteStations: 'oops' }))).toBeNull()
  })

  it('returns null when a station entry is missing name or url', () => {
    const json = JSON.stringify({
      favoriteStations: [{ name: 'Intermarché Apprieu' }],
    })

    expect(parseFavoriteStations(json)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Scenario 7: Stations come from the remote file, not local storage
// ---------------------------------------------------------------------------

describe('Scenario 7: exactly the stations listed in the remote file are returned', () => {
  it('returns the name/url pairs from favoriteStations unchanged', () => {
    const json = JSON.stringify({
      favoriteStations: [
        { name: 'Intermarché Apprieu', url: 'https://www.prix-carburants.gouv.fr/station/12345' },
        { name: 'Intermarché Aoste', url: 'https://www.prix-carburants.gouv.fr/station/67890' },
      ],
    })

    expect(parseFavoriteStations(json)).toEqual([
      { name: 'Intermarché Apprieu', url: 'https://www.prix-carburants.gouv.fr/station/12345' },
      { name: 'Intermarché Aoste', url: 'https://www.prix-carburants.gouv.fr/station/67890' },
    ])
  })
})

// ---------------------------------------------------------------------------
// Scenario 8: No favorite stations configured
// ---------------------------------------------------------------------------

describe('Scenario 8: zero favorite stations configured', () => {
  it('returns an empty array, not null, for an empty favoriteStations list', () => {
    expect(parseFavoriteStations(JSON.stringify({ favoriteStations: [] }))).toEqual([])
  })
})
