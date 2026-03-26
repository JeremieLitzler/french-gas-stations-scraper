/**
 * Tests for preferencesImport pure utility functions — Issue #63.
 *
 * Scenarios covered:
 *   TC-IMP-VAL-02  — File that is not valid JSON is rejected
 *   TC-IMP-VAL-03  — File missing required top-level keys is rejected
 *   TC-IMP-VAL-04  — favoriteStations not an array is rejected
 *   TC-IMP-VAL-05  — Station entry missing name is rejected
 *   TC-IMP-VAL-06  — Station entry missing url is rejected
 *   TC-IMP-VAL-07  — Station URL failing origin + path-prefix validation is rejected
 *   TC-IMP-VAL-08  — Station name failing name validation is rejected
 *   TC-IMP-VAL-09  — File exceeding size limit is rejected (isFileSizeAcceptable)
 *   TC-IMP-DIFF-01 — No diff when file is identical to IndexedDB state
 *   TC-IMP-DIFF-02 — New station row is shown pre-selected as kind "new"
 *   TC-IMP-DIFF-07 — Identical station rows are excluded from diff
 *   TC-IMP-DIFF-08 — Stations absent from file are not shown in diff
 *   TC-IMP-DIFF-09 — Fuel type diff row produced when values differ
 *   TC-IMP-DIFF-10 — Fuel type diff not produced when values are identical
 *   TC-IMP-DIFF-11 — Station URL with query params matches stored URL by path (not marked new)
 *   TC-SEC-01      — JSON with prototype-polluting key is rejected
 */

import { describe, expect, it } from 'vitest'
import type { Station } from '@/types/station'
import { isFileSizeAcceptable, parseJsonFile, computeDiff } from './preferencesImport'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_URL = 'https://www.prix-carburants.gouv.fr/station/1234'
const VALID_URL_2 = 'https://www.prix-carburants.gouv.fr/station/5678'

function makeFile(sizeBytes: number): File {
  const content = 'x'.repeat(sizeBytes)
  return new File([content], 'test.json', { type: 'application/json' })
}

function validJson(overrides: object = {}): string {
  return JSON.stringify({
    fuelTypeDefault: 'SP95',
    favoriteStations: [{ name: 'Ma Station', url: VALID_URL }],
    ...overrides,
  })
}

// ---------------------------------------------------------------------------
// TC-IMP-VAL-09 — isFileSizeAcceptable
// ---------------------------------------------------------------------------

describe('TC-IMP-VAL-09: isFileSizeAcceptable', () => {
  it('accepts a file at exactly 1 MB', () => {
    const file = makeFile(1_000_000)
    expect(isFileSizeAcceptable(file)).toBe(true)
  })

  it('rejects a file exceeding 1 MB', () => {
    const file = makeFile(1_000_001)
    expect(isFileSizeAcceptable(file)).toBe(false)
  })

  it('accepts an empty file', () => {
    const file = makeFile(0)
    expect(isFileSizeAcceptable(file)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// TC-IMP-VAL-02 — Not valid JSON
// ---------------------------------------------------------------------------

describe('TC-IMP-VAL-02: parseJsonFile rejects non-JSON content', () => {
  it('returns null for plain text', () => {
    expect(parseJsonFile('not json')).toBeNull()
  })

  it('returns null for an empty string', () => {
    expect(parseJsonFile('')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// TC-IMP-VAL-03 — Missing required top-level keys
// ---------------------------------------------------------------------------

describe('TC-IMP-VAL-03: parseJsonFile rejects files missing required keys', () => {
  it('returns null when fuelTypeDefault is missing', () => {
    expect(parseJsonFile(JSON.stringify({ favoriteStations: [] }))).toBeNull()
  })

  it('returns null when favoriteStations is missing', () => {
    expect(parseJsonFile(JSON.stringify({ fuelTypeDefault: 'SP95' }))).toBeNull()
  })

  it('returns null for an empty JSON object', () => {
    expect(parseJsonFile('{}')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// TC-IMP-VAL-04 — favoriteStations not an array
// ---------------------------------------------------------------------------

describe('TC-IMP-VAL-04: parseJsonFile rejects favoriteStations that is not an array', () => {
  it('returns null when favoriteStations is a string', () => {
    expect(parseJsonFile(JSON.stringify({ fuelTypeDefault: null, favoriteStations: 'oops' }))).toBeNull()
  })

  it('returns null when favoriteStations is a number', () => {
    expect(parseJsonFile(JSON.stringify({ fuelTypeDefault: null, favoriteStations: 42 }))).toBeNull()
  })

  it('returns null when favoriteStations is an object', () => {
    expect(parseJsonFile(JSON.stringify({ fuelTypeDefault: null, favoriteStations: {} }))).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// TC-IMP-VAL-05 — Station entry missing name
// ---------------------------------------------------------------------------

describe('TC-IMP-VAL-05: parseJsonFile rejects station entries with no name', () => {
  it('returns null when a station has no name field', () => {
    const json = JSON.stringify({
      fuelTypeDefault: null,
      favoriteStations: [{ url: VALID_URL }],
    })
    expect(parseJsonFile(json)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// TC-IMP-VAL-06 — Station entry missing url
// ---------------------------------------------------------------------------

describe('TC-IMP-VAL-06: parseJsonFile rejects station entries with no url', () => {
  it('returns null when a station has no url field', () => {
    const json = JSON.stringify({
      fuelTypeDefault: null,
      favoriteStations: [{ name: 'Ma Station' }],
    })
    expect(parseJsonFile(json)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// TC-IMP-VAL-07 — Station URL failing origin + path-prefix validation
// ---------------------------------------------------------------------------

describe('TC-IMP-VAL-07: parseJsonFile rejects station URLs failing origin/path validation', () => {
  it('returns null for a URL from a different origin', () => {
    const json = JSON.stringify({
      fuelTypeDefault: null,
      favoriteStations: [{ name: 'Station', url: 'https://evil.com/station/1' }],
    })
    expect(parseJsonFile(json)).toBeNull()
  })

  it('returns null for a URL with correct origin but wrong path prefix', () => {
    const json = JSON.stringify({
      fuelTypeDefault: null,
      favoriteStations: [{ name: 'Station', url: 'https://www.prix-carburants.gouv.fr/other/1' }],
    })
    expect(parseJsonFile(json)).toBeNull()
  })

  it('returns null for a non-URL string', () => {
    const json = JSON.stringify({
      fuelTypeDefault: null,
      favoriteStations: [{ name: 'Station', url: 'not-a-url' }],
    })
    expect(parseJsonFile(json)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// TC-IMP-VAL-08 — Station name failing name validation
// ---------------------------------------------------------------------------

describe('TC-IMP-VAL-08: parseJsonFile rejects station names that fail name validation', () => {
  it('returns null when name contains HTML tags', () => {
    const json = JSON.stringify({
      fuelTypeDefault: null,
      favoriteStations: [{ name: '<script>alert(1)</script>', url: VALID_URL }],
    })
    expect(parseJsonFile(json)).toBeNull()
  })

  it('returns null when name is an empty string (whitespace only)', () => {
    const json = JSON.stringify({
      fuelTypeDefault: null,
      favoriteStations: [{ name: '   ', url: VALID_URL }],
    })
    expect(parseJsonFile(json)).toBeNull()
  })

  it('returns null when name exceeds 200 characters', () => {
    const json = JSON.stringify({
      fuelTypeDefault: null,
      favoriteStations: [{ name: 'a'.repeat(201), url: VALID_URL }],
    })
    expect(parseJsonFile(json)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// TC-IMP-DIFF-11 — Station URL with query params matches stored URL by path
// ---------------------------------------------------------------------------

describe('TC-IMP-DIFF-11: computeDiff treats file URLs with query params as matching the stored path-only URL', () => {
  it('does not mark the station as new when the file URL has extra query params', () => {
    const stored: Station[] = [{ name: 'Ma Station', url: VALID_URL }]
    const imported = {
      fuelTypeDefault: null,
      favoriteStations: [{ name: 'Ma Station', url: VALID_URL + '?utm_source=export' }],
    }

    const result = computeDiff(imported, stored, null)

    expect(result).toBeNull()
  })

  it('still produces a conflict row when the name differs, even with query params on file URL', () => {
    const stored: Station[] = [{ name: 'Ancien Nom', url: VALID_URL }]
    const imported = {
      fuelTypeDefault: null,
      favoriteStations: [{ name: 'Nouveau Nom', url: VALID_URL + '?ref=import' }],
    }

    const result = computeDiff(imported, stored, null)

    expect(result).not.toBeNull()
    expect(result!.stationRows[0].kind).toBe('conflict')
  })

  it('marks the station as new when the URL path differs (not just query params)', () => {
    const stored: Station[] = [{ name: 'Ma Station', url: VALID_URL }]
    const imported = {
      fuelTypeDefault: null,
      favoriteStations: [{ name: 'Ma Station', url: VALID_URL_2 }],
    }

    const result = computeDiff(imported, stored, null)

    expect(result).not.toBeNull()
    expect(result!.stationRows[0].kind).toBe('new')
  })
})

// ---------------------------------------------------------------------------
// TC-SEC-01 — Prototype-polluting key is rejected
// ---------------------------------------------------------------------------

describe('TC-SEC-01: parseJsonFile rejects JSON with prototype-polluting keys', () => {
  it('returns null when the top-level object has __proto__', () => {
    // Manually building the JSON string to avoid JSON.stringify stripping __proto__
    const json = '{"__proto__": {"polluted": true}, "fuelTypeDefault": null, "favoriteStations": []}'
    expect(parseJsonFile(json)).toBeNull()
  })

  it('returns null when the top-level object has constructor', () => {
    const json = '{"constructor": {}, "fuelTypeDefault": null, "favoriteStations": []}'
    expect(parseJsonFile(json)).toBeNull()
  })

  it('returns null when a station entry has __proto__', () => {
    // JSON.stringify({ '__proto__': ... }) silently strips __proto__ (prototype setter, not own property)
    // Use a raw JSON string so the key is present after JSON.parse
    const json = `{"fuelTypeDefault":null,"favoriteStations":[{"__proto__":{"polluted":true},"name":"Station","url":"${VALID_URL}"}]}`
    expect(parseJsonFile(json)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Happy path — parseJsonFile accepts valid input
// ---------------------------------------------------------------------------

describe('parseJsonFile: accepts a well-formed preferences file', () => {
  it('returns the parsed PreferencesFile when input is valid', () => {
    const result = parseJsonFile(validJson())

    expect(result).not.toBeNull()
    expect(result!.fuelTypeDefault).toBe('SP95')
    expect(result!.favoriteStations).toHaveLength(1)
    expect(result!.favoriteStations[0].name).toBe('Ma Station')
    expect(result!.favoriteStations[0].url).toBe(VALID_URL)
  })

  it('accepts fuelTypeDefault as null', () => {
    const result = parseJsonFile(JSON.stringify({
      fuelTypeDefault: null,
      favoriteStations: [],
    }))
    expect(result).not.toBeNull()
    expect(result!.fuelTypeDefault).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// TC-IMP-DIFF-01 — No diff when identical
// ---------------------------------------------------------------------------

describe('TC-IMP-DIFF-01: computeDiff returns null when file matches IndexedDB', () => {
  it('returns null when stations and fuel type are identical', () => {
    const stations: Station[] = [{ name: 'Ma Station', url: VALID_URL }]
    const imported = { fuelTypeDefault: 'SP95', favoriteStations: stations }

    const result = computeDiff(imported, stations, 'SP95')

    expect(result).toBeNull()
  })

  it('returns null when both have empty stations and null fuel type', () => {
    const result = computeDiff({ fuelTypeDefault: null, favoriteStations: [] }, [], null)

    expect(result).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// TC-IMP-DIFF-02 — New station row pre-selected
// ---------------------------------------------------------------------------

describe('TC-IMP-DIFF-02: computeDiff marks new station rows as kind "new" and pre-selected', () => {
  it('produces a new row when the URL is absent from IndexedDB', () => {
    const imported = {
      fuelTypeDefault: null,
      favoriteStations: [{ name: 'Nouvelle', url: VALID_URL }],
    }
    const result = computeDiff(imported, [], null)

    expect(result).not.toBeNull()
    expect(result!.stationRows).toHaveLength(1)
    expect(result!.stationRows[0].kind).toBe('new')
    expect(result!.stationRows[0].selected).toBe(true)
    expect(result!.stationRows[0].url).toBe(VALID_URL)
  })
})

// ---------------------------------------------------------------------------
// TC-IMP-DIFF-04 — Name conflict row unresolved
// ---------------------------------------------------------------------------

describe('TC-IMP-DIFF-04: computeDiff marks conflict rows with chosenName null', () => {
  it('produces a conflict row when the URL exists but name differs', () => {
    const stored: Station[] = [{ name: 'Ancien Nom', url: VALID_URL }]
    const imported = {
      fuelTypeDefault: null,
      favoriteStations: [{ name: 'Nouveau Nom', url: VALID_URL }],
    }

    const result = computeDiff(imported, stored, null)

    expect(result).not.toBeNull()
    expect(result!.stationRows).toHaveLength(1)
    expect(result!.stationRows[0].kind).toBe('conflict')
    expect(result!.stationRows[0].chosenName).toBeNull()
    expect(result!.stationRows[0].fileStation.name).toBe('Nouveau Nom')
    expect(result!.stationRows[0].storedStation!.name).toBe('Ancien Nom')
  })
})

// ---------------------------------------------------------------------------
// TC-IMP-DIFF-07 — Identical stations excluded from diff
// ---------------------------------------------------------------------------

describe('TC-IMP-DIFF-07: computeDiff excludes stations that are identical', () => {
  it('does not produce a row for a station present in both with the same name', () => {
    const station: Station = { name: 'Identique', url: VALID_URL }
    const imported = { fuelTypeDefault: null, favoriteStations: [station] }

    const result = computeDiff(imported, [station], null)

    expect(result).toBeNull()
  })

  it('produces rows only for changed stations when some are identical', () => {
    const unchanged: Station = { name: 'Identique', url: VALID_URL }
    const changed: Station = { name: 'Ancien Nom', url: VALID_URL_2 }
    const imported = {
      fuelTypeDefault: null,
      favoriteStations: [
        unchanged,
        { name: 'Nouveau Nom', url: VALID_URL_2 },
      ],
    }

    const result = computeDiff(imported, [unchanged, changed], null)

    expect(result).not.toBeNull()
    expect(result!.stationRows).toHaveLength(1)
    expect(result!.stationRows[0].url).toBe(VALID_URL_2)
  })
})

// ---------------------------------------------------------------------------
// TC-IMP-DIFF-08 — Stations absent from file are not shown
// ---------------------------------------------------------------------------

describe('TC-IMP-DIFF-08: computeDiff ignores stations in IndexedDB that are absent from the file', () => {
  it('produces no row for a stored station not in the imported file', () => {
    const storedOnly: Station = { name: 'Only In Store', url: VALID_URL_2 }
    const imported = { fuelTypeDefault: null, favoriteStations: [] }

    const result = computeDiff(imported, [storedOnly], null)

    expect(result).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// TC-IMP-DIFF-09 — Fuel type diff row when values differ
// ---------------------------------------------------------------------------

describe('TC-IMP-DIFF-09: computeDiff produces fuelTypeDiff when values differ', () => {
  it('produces a fuelTypeDiff when file value differs from stored value', () => {
    const imported = { fuelTypeDefault: 'Gasoil', favoriteStations: [] }

    const result = computeDiff(imported, [], 'SP95')

    expect(result).not.toBeNull()
    expect(result!.fuelTypeDiff).not.toBeNull()
    expect(result!.fuelTypeDiff!.fileValue).toBe('Gasoil')
    expect(result!.fuelTypeDiff!.storedValue).toBe('SP95')
    expect(result!.fuelTypeDiff!.chosen).toBeNull()
  })

  it('produces a fuelTypeDiff when file has null and stored has a value', () => {
    const imported = { fuelTypeDefault: null, favoriteStations: [] }

    const result = computeDiff(imported, [], 'SP95')

    expect(result).not.toBeNull()
    expect(result!.fuelTypeDiff!.fileValue).toBeNull()
    expect(result!.fuelTypeDiff!.storedValue).toBe('SP95')
  })
})

// ---------------------------------------------------------------------------
// TC-IMP-DIFF-10 — Fuel type diff not shown when identical
// ---------------------------------------------------------------------------

describe('TC-IMP-DIFF-10: computeDiff produces no fuelTypeDiff when values are the same', () => {
  it('returns null for fuelTypeDiff when both values are the same string', () => {
    const imported = {
      fuelTypeDefault: 'SP95',
      favoriteStations: [{ name: 'Station', url: VALID_URL }],
    }
    const stored: Station[] = []

    const result = computeDiff(imported, stored, 'SP95')

    expect(result).not.toBeNull()
    expect(result!.fuelTypeDiff).toBeNull()
  })

  it('returns null for fuelTypeDiff when both values are null', () => {
    const imported = {
      fuelTypeDefault: null,
      favoriteStations: [{ name: 'Station', url: VALID_URL }],
    }

    const result = computeDiff(imported, [], null)

    expect(result).not.toBeNull()
    expect(result!.fuelTypeDiff).toBeNull()
  })
})
