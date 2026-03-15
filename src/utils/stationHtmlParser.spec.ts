/**
 * Tests for stationHtmlParser utility.
 *
 * happy-dom (the Vitest test environment) provides DOMParser natively,
 * so no extra dependencies are needed — the parser runs exactly as it
 * would in a real browser.
 *
 * Fixtures in tests/fixtures/ are used for TC-01 and TC-02.
 * All other test cases use minimal inline HTML strings.
 */

import { describe, expect, it } from 'vitest'
import aostHtml from '../../tests/fixtures/INTERMARCHE-AOSTE.html?raw'
import apprieuHtml from '../../tests/fixtures/INTERMARCHE-APPRIEU.html?raw'
import { parseStationHtml } from './stationHtmlParser'

// ---------------------------------------------------------------------------
// Minimal HTML builders for targeted edge-case tests
// ---------------------------------------------------------------------------

function buildRowHtml(firstCellContent: string, secondCellContent: string): string {
  return `
    <html><body>
      <div id="details_pdv">
        <p class="fr-h2">Test Station</p>
        <table class="details_pdv">
          <tbody>
            <tr>
              <td>${firstCellContent}</td>
              <td class="prix">${secondCellContent}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </body></html>
  `
}

function buildNoTableHtml(): string {
  return '<html><body><p>No fuel table here</p></body></html>'
}

function buildNoNameHtml(): string {
  return `
    <html><body>
      <div id="details_pdv">
        <table class="details_pdv">
          <tbody>
            <tr>
              <td><strong>SP95-E10 (E10)</strong></td>
              <td class="prix"><strong>1.829</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
    </body></html>
  `
}

// ---------------------------------------------------------------------------
// TC-01: Full AOSTE fixture — mixed prices
// ---------------------------------------------------------------------------

describe('TC-01: parse INTERMARCHE-AOSTE fixture with mixed prices', () => {
  it('extracts station name and 6 fuel rows, 2 of which have null prices', () => {
    const html = aostHtml
    const result = parseStationHtml(html)

    expect(result.success).toBe(true)
    if (!result.success) return

    expect(result.data.stationName).toBe('SAS CYRQUEN')
    expect(result.data.fuels).toHaveLength(6)

    const nullPrices = result.data.fuels.filter((fuel) => fuel.price === null)
    const numericPrices = result.data.fuels.filter((fuel) => fuel.price !== null)

    expect(nullPrices).toHaveLength(2)
    expect(numericPrices).toHaveLength(4)
    numericPrices.forEach((fuel) => {
      expect(typeof fuel.price).toBe('number')
      expect(isFinite(fuel.price as number)).toBe(true)
    })
  })

  it('extracts correct numeric prices for rows that have them', () => {
    const html = aostHtml
    const result = parseStationHtml(html)

    expect(result.success).toBe(true)
    if (!result.success) return

    const prices = result.data.fuels.map((fuel) => fuel.price)
    // AOSTE fixture prices in order: 1.829, 1.929, null, null, 1.969, 0.999
    expect(prices).toEqual([1.829, 1.929, null, null, 1.969, 0.999])
  })
})

// ---------------------------------------------------------------------------
// TC-02: Full APPRIEU fixture
// ---------------------------------------------------------------------------

describe('TC-02: parse INTERMARCHE-APPRIEU fixture', () => {
  it('extracts a non-empty station name matching the h2 element', () => {
    const html = apprieuHtml
    const result = parseStationHtml(html)

    expect(result.success).toBe(true)
    if (!result.success) return

    expect(result.data.stationName).toBe('INTERMARCHE APPRIEU')
    expect(result.data.stationName.length).toBeGreaterThan(0)
  })

  it('extracts 6 fuel rows with the correct price values', () => {
    const html = apprieuHtml
    const result = parseStationHtml(html)

    expect(result.success).toBe(true)
    if (!result.success) return

    expect(result.data.fuels).toHaveLength(6)
    // APPRIEU fixture: SP95-E10(1.869), SP98(1.989), SP95(null), E85(0.758), Gazole(2.069), GPLc(null)
    const prices = result.data.fuels.map((fuel) => fuel.price)
    expect(prices).toEqual([1.869, 1.989, null, 0.758, 2.069, null])
  })
})

// ---------------------------------------------------------------------------
// TC-03: Whitespace-only price cell → null
// ---------------------------------------------------------------------------

describe('TC-03: row with whitespace-only price cell returns null price', () => {
  it('returns null for a price cell containing only spaces', () => {
    const html = buildRowHtml('<strong>SP95</strong>', '   ')
    const result = parseStationHtml(html)

    expect(result.success).toBe(true)
    if (!result.success) return

    expect(result.data.fuels).toHaveLength(1)
    expect(result.data.fuels[0].price).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// TC-04: &nbsp; in price cell → null
// ---------------------------------------------------------------------------

describe('TC-04: row with &nbsp; in price cell returns null price', () => {
  it('returns null for a price cell containing only a non-breaking space', () => {
    const html = buildRowHtml('<strong>SP95</strong>', '&nbsp;')
    const result = parseStationHtml(html)

    expect(result.success).toBe(true)
    if (!result.success) return

    expect(result.data.fuels).toHaveLength(1)
    expect(result.data.fuels[0].price).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// TC-05: Non-numeric price text → null
// ---------------------------------------------------------------------------

describe('TC-05: row with non-numeric price text returns null price', () => {
  it('returns null when price cell contains <strong>N/A</strong>', () => {
    const html = buildRowHtml('<strong>Gazole</strong>', '<strong>N/A</strong>')
    const result = parseStationHtml(html)

    expect(result.success).toBe(true)
    if (!result.success) return

    expect(result.data.fuels).toHaveLength(1)
    expect(result.data.fuels[0].price).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// TC-06: First cell without <strong> — fallback to cell text content
// ---------------------------------------------------------------------------

describe('TC-06: row whose first cell has no <strong> uses cell text as fuel type', () => {
  it('extracts the trimmed text content of the first cell as the fuel type', () => {
    const html = buildRowHtml('Plain Fuel Type', '<strong>1.750</strong>')
    const result = parseStationHtml(html)

    expect(result.success).toBe(true)
    if (!result.success) return

    expect(result.data.fuels).toHaveLength(1)
    expect(result.data.fuels[0].type).toBe('Plain Fuel Type')
    expect(result.data.fuels[0].price).toBe(1.75)
  })
})

// ---------------------------------------------------------------------------
// TC-07: Empty HTML string → selector_not_found
// ---------------------------------------------------------------------------

describe('TC-07: empty HTML string produces selector_not_found error', () => {
  it('returns success: false with error "selector_not_found"', () => {
    const result = parseStationHtml('')

    expect(result.success).toBe(false)
    if (result.success) return

    expect(result.error).toBe('selector_not_found')
  })
})

// ---------------------------------------------------------------------------
// TC-08: Valid HTML without .details_pdv table → selector_not_found
// ---------------------------------------------------------------------------

describe('TC-08: HTML with no .details_pdv table produces selector_not_found error', () => {
  it('returns success: false with error "selector_not_found"', () => {
    const result = parseStationHtml(buildNoTableHtml())

    expect(result.success).toBe(false)
    if (result.success) return

    expect(result.error).toBe('selector_not_found')
  })
})

// ---------------------------------------------------------------------------
// TC-09: Missing #details_pdv .fr-h2 → stationName is empty string
// ---------------------------------------------------------------------------

describe('TC-09: HTML with fuel rows but no station name element returns empty stationName', () => {
  it('returns success: true with stationName equal to empty string', () => {
    const result = parseStationHtml(buildNoNameHtml())

    expect(result.success).toBe(true)
    if (!result.success) return

    expect(result.data.stationName).toBe('')
    expect(result.data.fuels).toHaveLength(1)
  })
})
