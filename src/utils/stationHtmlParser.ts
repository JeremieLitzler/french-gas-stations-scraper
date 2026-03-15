/**
 * Pure browser-side utility for parsing gas station HTML pages.
 *
 * Uses native DOMParser and querySelectorAll — zero external dependencies.
 * No Vue imports. Safe to call from composables and unit tests (happy-dom
 * provides DOMParser in the test environment).
 *
 * Security: all text is extracted via textContent (never innerHTML) so
 * embedded markup from the external server is never forwarded as executable
 * content (security-guidelines.md rule 3).
 */

import type { FuelPrice, StationData } from '@/types'

const STATION_NAME_SELECTOR = '#details_pdv .fr-h2'
const FUEL_ROW_SELECTOR = '.details_pdv tbody tr'

type ParseSuccess = { success: true; data: StationData }
type ParseFailure = { success: false; error: 'selector_not_found' }
type ParseResult = ParseSuccess | ParseFailure

function parseHtmlDocument(htmlString: string): Document {
  return new DOMParser().parseFromString(htmlString, 'text/html')
}

function extractStationName(document: Document): string {
  const nameElement = document.querySelector(STATION_NAME_SELECTOR)
  if (nameElement === null) return ''
  return nameElement.textContent?.trim() ?? ''
}

function extractFuelType(row: Element): string {
  const firstCell = row.querySelector('td')
  if (firstCell === null) return ''
  const strongElement = firstCell.querySelector('strong')
  if (strongElement !== null) return strongElement.textContent?.trim() ?? ''
  return firstCell.textContent?.trim() ?? ''
}

function extractFuelPrice(row: Element): number | null {
  const priceCell = row.querySelector('td.prix')
  if (priceCell === null) return null
  const strongElement = priceCell.querySelector('strong')
  if (strongElement === null) return null
  const priceText = strongElement.textContent?.trim() ?? ''
  const parsed = parseFloat(priceText)
  if (!isFinite(parsed)) return null
  return parsed
}

function rowToFuelPrice(row: Element): FuelPrice {
  return {
    type: extractFuelType(row),
    price: extractFuelPrice(row),
  }
}

function extractFuelRows(document: Document): NodeListOf<Element> {
  return document.querySelectorAll(FUEL_ROW_SELECTOR)
}

function fuelRowsToArray(rows: NodeListOf<Element>): FuelPrice[] {
  return Array.from(rows).map(rowToFuelPrice)
}

/**
 * Parse a gas station HTML page into structured data.
 *
 * @param htmlString - Raw HTML string returned by fetch-page
 * @returns ParseSuccess with StationData, or ParseFailure with error code
 */
export function parseStationHtml(htmlString: string): ParseResult {
  const document = parseHtmlDocument(htmlString)
  const fuelRows = extractFuelRows(document)
  if (fuelRows.length === 0) return { success: false, error: 'selector_not_found' }
  return {
    success: true,
    data: {
      stationName: extractStationName(document),
      fuels: fuelRowsToArray(fuelRows),
    },
  }
}
