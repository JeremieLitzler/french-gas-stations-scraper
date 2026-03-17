/**
 * Composable for concurrently fetching and parsing fuel prices for all stored stations.
 *
 * Fetches every station in the list at the same time, collects successful
 * parse results in `results`, and records failures (selector not found or
 * network errors) in `warnings`. The `isLoading` flag is true from the
 * moment the first request is initiated until all promises settle.
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
import type { Station, StationData, StationWarning } from '@/types'
import { parseStationHtml } from '@/utils/stationHtmlParser'
import { useStationStorage } from '@/composables/useStationStorage'

const FETCH_PAGE_ENDPOINT = '/.netlify/functions/fetch-page'

type FetchPageSuccess = { success: true; html: string }
type FetchPageFailure = { success: false; error: string }
type FetchPageResponse = FetchPageSuccess | FetchPageFailure

type StationPricesState = {
  results: Ref<StationData[]>
  warnings: Ref<StationWarning[]>
  isLoading: Ref<boolean>
}

const results: Ref<StationData[]> = ref([])
const warnings: Ref<StationWarning[]> = ref([])
const isLoading: Ref<boolean> = ref(false)

function buildFetchUrl(stationUrl: string): string {
  return `${FETCH_PAGE_ENDPOINT}?url=${encodeURIComponent(stationUrl)}`
}

function asFetchPageResponse(json: unknown): FetchPageResponse {
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
  return asFetchPageResponse(json)
}

function toStationWarning(station: Station): StationWarning {
  return { stationName: station.name, url: station.url }
}

function applySuccessResponse(station: Station, html: string): void {
  const parseResult = parseStationHtml(html)
  if (!parseResult.success) {
    warnings.value = [...warnings.value, toStationWarning(station)]
    return
  }
  results.value = [...results.value, { stationName: station.name, fuels: parseResult.fuels }]
}

async function fetchOneStation(station: Station): Promise<void> {
  try {
    const pageResponse = await fetchPageResponse(station.url)
    if (!pageResponse.success) {
      warnings.value = [...warnings.value, toStationWarning(station)]
      return
    }
    applySuccessResponse(station, pageResponse.html)
  } catch {
    warnings.value = [...warnings.value, toStationWarning(station)]
  }
}

async function loadAllStationPrices(): Promise<void> {
  const { stations } = useStationStorage()
  const stationList = stations.value

  results.value = []
  warnings.value = []

  if (stationList.length === 0) return

  isLoading.value = true
  await Promise.allSettled(stationList.map(fetchOneStation))
  isLoading.value = false
}

export function useStationPrices(): StationPricesState & {
  loadAllStationPrices: () => Promise<void>
} {
  return {
    results,
    warnings,
    isLoading,
    loadAllStationPrices,
  }
}
