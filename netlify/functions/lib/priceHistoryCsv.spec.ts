/**
 * Tests for priceHistoryCsv — issue #112, test-cases.md scenarios 8, 11-14.
 */

import { describe, expect, it } from 'vitest'
import { toCsvLine, updateHistoryCsv } from './priceHistoryCsv'
import type { PriceHistoryRow } from './priceHistoryCsv'

const CSV_HEADER = 'date,station_name,station_url,fuel_type,price'

function buildRow(overrides: Partial<PriceHistoryRow> = {}): PriceHistoryRow {
  return {
    date: '2026-07-23',
    stationName: 'Intermarché Apprieu',
    stationUrl: 'https://www.prix-carburants.gouv.fr/station/12345',
    fuelType: 'Gazole',
    price: 1.799,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Scenario 11: Row shape for a normal result
// ---------------------------------------------------------------------------

describe('Scenario 11: a normal result produces one row with date, name, URL, fuel type, and price', () => {
  it('joins the row fields in the documented column order', () => {
    const row = buildRow()

    expect(toCsvLine(row)).toBe(
      '2026-07-23,Intermarché Apprieu,https://www.prix-carburants.gouv.fr/station/12345,Gazole,1.799',
    )
  })
})

// ---------------------------------------------------------------------------
// Scenario 12: First-ever run creates the file
// ---------------------------------------------------------------------------

describe('Scenario 12: history.csv does not yet exist', () => {
  it('creates the header row followed by the day’s price rows', () => {
    const rows = [buildRow(), buildRow({ fuelType: 'SP95', price: 1.899 })]

    const csv = updateHistoryCsv(null, '2026-07-23', rows)

    expect(csv).toBe(
      [
        CSV_HEADER,
        '2026-07-23,Intermarché Apprieu,https://www.prix-carburants.gouv.fr/station/12345,Gazole,1.799',
        '2026-07-23,Intermarché Apprieu,https://www.prix-carburants.gouv.fr/station/12345,SP95,1.899',
        '',
      ].join('\n'),
    )
  })
})

// ---------------------------------------------------------------------------
// Scenario 13: Subsequent run updates the existing file
// ---------------------------------------------------------------------------

describe('Scenario 13: history.csv already has prior days’ rows', () => {
  it('preserves prior rows unchanged and appends the new day’s rows', () => {
    const existingCsv = [
      CSV_HEADER,
      '2026-07-22,Intermarché Apprieu,https://www.prix-carburants.gouv.fr/station/12345,Gazole,1.789',
      '',
    ].join('\n')
    const todaysRows = [buildRow({ date: '2026-07-23' })]

    const csv = updateHistoryCsv(existingCsv, '2026-07-23', todaysRows)

    expect(csv).toBe(
      [
        CSV_HEADER,
        '2026-07-22,Intermarché Apprieu,https://www.prix-carburants.gouv.fr/station/12345,Gazole,1.789',
        '2026-07-23,Intermarché Apprieu,https://www.prix-carburants.gouv.fr/station/12345,Gazole,1.799',
        '',
      ].join('\n'),
    )
  })
})

// ---------------------------------------------------------------------------
// Scenario 14: Re-running the same day replaces its rows
// ---------------------------------------------------------------------------

describe('Scenario 14: history.csv already has rows for today from an earlier run today', () => {
  it('removes today’s previous rows and replaces them with the fresh snapshot, leaving other days untouched', () => {
    const existingCsv = [
      CSV_HEADER,
      '2026-07-22,Intermarché Apprieu,https://www.prix-carburants.gouv.fr/station/12345,Gazole,1.789',
      '2026-07-23,Intermarché Apprieu,https://www.prix-carburants.gouv.fr/station/12345,Gazole,1.799',
      '2026-07-23,Intermarché Apprieu,https://www.prix-carburants.gouv.fr/station/12345,SP95,1.899',
      '',
    ].join('\n')
    const freshRows = [buildRow({ date: '2026-07-23', price: 1.749 })]

    const csv = updateHistoryCsv(existingCsv, '2026-07-23', freshRows)
    const lines = csv.split('\n').filter((line) => line.length > 0)

    expect(lines).toEqual([
      CSV_HEADER,
      '2026-07-22,Intermarché Apprieu,https://www.prix-carburants.gouv.fr/station/12345,Gazole,1.789',
      '2026-07-23,Intermarché Apprieu,https://www.prix-carburants.gouv.fr/station/12345,Gazole,1.749',
    ])
  })
})

// ---------------------------------------------------------------------------
// Scenario 8: No favorite stations configured
// ---------------------------------------------------------------------------

describe('Scenario 8: zero favorite stations produce zero rows for that day', () => {
  it('leaves an existing history.csv otherwise unchanged for that date', () => {
    const existingCsv = [
      CSV_HEADER,
      '2026-07-22,Intermarché Apprieu,https://www.prix-carburants.gouv.fr/station/12345,Gazole,1.789',
      '',
    ].join('\n')

    const csv = updateHistoryCsv(existingCsv, '2026-07-23', [])

    expect(csv).toBe(existingCsv)
  })
})
