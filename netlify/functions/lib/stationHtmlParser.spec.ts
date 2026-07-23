/**
 * Tests for the Netlify-Functions stationHtmlParser mirror — issue #112,
 * test-cases.md scenario 10.
 *
 * linkedom's DOMParser runs the same querySelector chain as the browser
 * version (src/utils/stationHtmlParser.ts), so no extra environment setup
 * is needed here.
 */

import { describe, expect, it } from 'vitest'
import { parseStationHtml } from './stationHtmlParser'

function buildStationHtml(rows: string): string {
  return `
    <html><body>
      <table class="details_pdv">
        <tbody>
          ${rows}
        </tbody>
      </table>
    </body></html>
  `
}

function buildFuelRow(fuelType: string, price: string): string {
  return `
    <tr>
      <td><strong>${fuelType}</strong></td>
      <td class="prix"><strong>${price}</strong></td>
    </tr>
  `
}

// ---------------------------------------------------------------------------
// Scenario 10: A station does not list a given fuel type that day
// ---------------------------------------------------------------------------

describe('Scenario 10: a fuel type absent from the page produces no entry for it', () => {
  it('returns only the fuel types actually present in the HTML', () => {
    const html = buildStationHtml(buildFuelRow('Gazole', '1.799') + buildFuelRow('SP95', '1.899'))

    const result = parseStationHtml(html)

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.fuels).toEqual([
      { type: 'Gazole', price: 1.799 },
      { type: 'SP95', price: 1.899 },
    ])
    expect(result.fuels.some((fuel) => fuel.type === 'E85')).toBe(false)
  })

  it("still returns the station's other listed fuel types when one is missing", () => {
    const html = buildStationHtml(buildFuelRow('Gazole', '1.799'))

    const result = parseStationHtml(html)

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.fuels).toHaveLength(1)
    expect(result.fuels[0]).toEqual({ type: 'Gazole', price: 1.799 })
  })
})
