/**
 * Pure utility for fetching fuel types from a single station URL via the
 * Netlify fetch-page proxy. No Vue dependencies.
 *
 * Security: only URLs that have already been validated by isAllowedStationUrl
 * should be passed here. This function does not re-validate the URL.
 */

import { parseStationHtml } from '@/utils/stationHtmlParser'

const FETCH_PAGE_ENDPOINT = '/.netlify/functions/fetch-page'

type FetchPageSuccess = { success: true; html: string }
type FetchPageFailure = { success: false; error: string }
type FetchPageResponse = FetchPageSuccess | FetchPageFailure

function buildFetchUrl(stationUrl: string): string {
  return `${FETCH_PAGE_ENDPOINT}?url=${encodeURIComponent(stationUrl)}`
}

function toFetchPageResponse(json: unknown): FetchPageResponse {
  if (typeof json !== 'object' || json === null) {
    return { success: false, error: 'unexpected_response' }
  }
  const candidate = json as Record<string, unknown>
  if (candidate.success === true && typeof candidate.html === 'string') {
    return { success: true, html: candidate.html }
  }
  if (candidate.success === false && typeof candidate.error === 'string') {
    return { success: false, error: candidate.error }
  }
  return { success: false, error: 'unexpected_response' }
}

async function fetchPageResponse(stationUrl: string): Promise<FetchPageResponse> {
  const response = await fetch(buildFetchUrl(stationUrl))
  const json: unknown = await response.json()
  return toFetchPageResponse(json)
}

function extractFuelTypesFromParseResult(parseResult: ReturnType<typeof parseStationHtml>): string[] {
  if (!parseResult.success) return []
  return parseResult.fuels.map((fuel) => fuel.type)
}

/**
 * Fetch a station page and return the list of fuel type strings it offers.
 * Returns an empty list on any error (network, parse failure, malformed response).
 * The caller is responsible for ensuring the URL is from the allowed domain.
 */
export async function fetchFuelTypesForUrl(stationUrl: string): Promise<string[]> {
  try {
    const pageResponse = await fetchPageResponse(stationUrl)
    if (!pageResponse.success) return []
    const parseResult = parseStationHtml(pageResponse.html)
    return extractFuelTypesFromParseResult(parseResult)
  } catch {
    return []
  }
}
