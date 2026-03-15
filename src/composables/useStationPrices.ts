/**
 * Composable for fetching and parsing gas station fuel prices.
 *
 * Calls the fetch-page Netlify function to retrieve raw HTML, then passes
 * the result through stationHtmlParser to produce structured StationData.
 *
 * Singleton pattern (ADR-002): shared reactive state is declared at module
 * level so all consumers share the same reference.
 *
 * Object Calisthenics exception: the composable function body exceeds five
 * lines because Vue composable conventions require grouping all returned
 * reactive state and operations in one function — documented framework
 * exception.
 */

import { ref } from 'vue'
import type { Ref } from 'vue'
import type { StationData } from '@/types'
import { parseStationHtml } from '@/utils/stationHtmlParser'

const FETCH_PAGE_ENDPOINT = '/.netlify/functions/fetch-page'

type FetchPageResponse = { success: true; html: string } | { success: false; error: string }

type StationPricesState = {
  stationData: Ref<StationData | null>
  isLoading: Ref<boolean>
  error: Ref<string | null>
}

const stationData: Ref<StationData | null> = ref(null)
const isLoading: Ref<boolean> = ref(false)
const error: Ref<string | null> = ref(null)

function buildFetchUrl(stationUrl: string): string {
  return `${FETCH_PAGE_ENDPOINT}?url=${encodeURIComponent(stationUrl)}`
}

async function fetchPageHtml(stationUrl: string): Promise<FetchPageResponse> {
  const response = await fetch(buildFetchUrl(stationUrl))
  return response.json() as Promise<FetchPageResponse>
}

function applyParseResult(html: string): void {
  const result = parseStationHtml(html)
  if (!result.success) {
    error.value = result.error
    return
  }
  stationData.value = result.data
}

async function loadStationPrices(stationUrl: string): Promise<void> {
  isLoading.value = true
  error.value = null
  stationData.value = null
  try {
    const pageResponse = await fetchPageHtml(stationUrl)
    if (!pageResponse.success) {
      error.value = pageResponse.error
      return
    }
    applyParseResult(pageResponse.html)
  } catch {
    error.value = 'fetch_failed'
  } finally {
    isLoading.value = false
  }
}

export function useStationPrices(): StationPricesState & {
  loadStationPrices: (stationUrl: string) => Promise<void>
} {
  return {
    stationData,
    isLoading,
    error,
    loadStationPrices,
  }
}
