// Node-compatible mirror of `src/utils/stationHtmlParser.ts` — same CSS
// selectors and text-only extraction, but backed by linkedom's DOMParser
// since the browser's native DOMParser does not exist in the Netlify
// Functions Node runtime. Kept as its own copy rather than a shared import
// because Netlify Functions and the SPA are separate TypeScript project
// references (technical-specifications.md) — any change to the scrape
// selector must be mirrored in both files.
//
// Security: text is read via textContent (never innerHTML), so embedded
// markup from the external server is never forwarded as executable content
// (security-guidelines.md rule 3, mirrored from the SPA's own rule).
import { DOMParser } from 'linkedom'

export interface ScrapedFuelPrice {
  type: string
  price: number | null
}

interface ParsedElement {
  querySelector(selector: string): ParsedElement | null
  textContent: string | null
}

interface ParsedDocument {
  querySelectorAll(selector: string): Iterable<ParsedElement>
}

const FUEL_ROW_SELECTOR = '.details_pdv tbody tr'

type ParseSuccess = { success: true; fuels: ScrapedFuelPrice[] }
type ParseFailure = { success: false }
export type StationParseResult = ParseSuccess | ParseFailure

function parseHtmlDocument(htmlString: string): ParsedDocument {
  return new DOMParser().parseFromString(htmlString, 'text/html')
}

function extractFuelType(row: ParsedElement): string {
  const firstCell = row.querySelector('td')
  if (firstCell === null) return ''
  const strongElement = firstCell.querySelector('strong')
  if (strongElement !== null) return strongElement.textContent?.trim() ?? ''
  return firstCell.textContent?.trim() ?? ''
}

function extractFuelPrice(row: ParsedElement): number | null {
  const priceCell = row.querySelector('td.prix')
  if (priceCell === null) return null
  const strongElement = priceCell.querySelector('strong')
  if (strongElement === null) return null
  const parsed = parseFloat(strongElement.textContent?.trim() ?? '')
  if (!isFinite(parsed)) return null
  return parsed
}

function rowToFuelPrice(row: ParsedElement): ScrapedFuelPrice {
  return { type: extractFuelType(row), price: extractFuelPrice(row) }
}

export function parseStationHtml(htmlString: string): StationParseResult {
  const document = parseHtmlDocument(htmlString)
  const fuelRows = Array.from(document.querySelectorAll(FUEL_ROW_SELECTOR))
  if (fuelRows.length === 0) return { success: false }
  return { success: true, fuels: fuelRows.map(rowToFuelPrice) }
}
