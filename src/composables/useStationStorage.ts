/**
 * Singleton composable for persisting the user's gas station list.
 *
 * The reactive station list is declared at module level so all consumers
 * share the same reference (ADR-002 singleton pattern).
 *
 * Persistence is handled via a thin IndexedDB wrapper (ADR-008).
 * All input is validated before being stored (security-guidelines.md).
 *
 * Object Calisthenics exception: the composable const body exceeds
 * five lines because Vue composable conventions require grouping all
 * returned reactive state and operations in one function — this is a
 * documented framework exception.
 */

import { ref, toRaw } from 'vue'
import type { Ref } from 'vue'
import type { Station } from '@/types/station'
import { get, set } from '@/utils/indexedDb'
import { markPreferencesSynced } from '@/utils/preferencesSyncTimestamp'

const STATIONS_KEY = 'stations'
const MAX_NAME_LENGTH = 200
const ALLOWED_ORIGIN = 'https://www.prix-carburants.gouv.fr'

// Module-level ref — all consumers share the same reactive state (ADR-002 singleton pattern).
const stations: Ref<Station[]> = ref([])

export function useStationStorage() {
  const ALLOWED_PATH_PREFIX = '/station/'

  const isValidUrl = (rawUrl: string): boolean => {
    try {
      const parsed = new URL(rawUrl)
      return parsed.origin === ALLOWED_ORIGIN && parsed.pathname.startsWith(ALLOWED_PATH_PREFIX)
    } catch {
      return false
    }
  }

  const stripHtmlTags = (text: string): string => {
    return text.replace(/<[^>]*>/g, '')
  }

  const isValidName = (name: string): boolean => {
    const stripped = stripHtmlTags(name)
    return stripped === name && name.trim().length > 0 && name.length <= MAX_NAME_LENGTH
  }

  const isStation = (value: unknown): value is Station => {
    if (typeof value !== 'object' || value === null) return false
    const candidate = value as Record<string, unknown>
    return typeof candidate.name === 'string' && typeof candidate.url === 'string'
  }

  const filterValidStations = (raw: unknown): Station[] => {
    if (!Array.isArray(raw)) return []
    return raw.filter(isStation)
  }

  /**
   * Strip Vue Proxy wrappers from every station before writing to IndexedDB.
   * The structured clone algorithm used by IDB cannot serialize Proxy objects,
   * so calling set() with reactive items would throw a DataCloneError.
   */
  const toPlainStations = (list: Station[]): Station[] => {
    return list.map((s) => ({ ...toRaw(s) }))
  }

  const loadStations = async (): Promise<void> => {
    const stored = await get<unknown>(STATIONS_KEY)
    stations.value = filterValidStations(stored)
  }

  const addStation = async (station: Station): Promise<void> => {
    if (!isValidUrl(station.url)) throw new Error(`Invalid station URL: ${station.url}`)
    if (!isValidName(station.name)) throw new Error(`Invalid station name: ${station.name}`)
    const updated = [...stations.value, station]
    await set(STATIONS_KEY, toPlainStations(updated))
    stations.value = updated
    await markPreferencesSynced()
  }

  const removeStation = async (url: string): Promise<void> => {
    const filtered = stations.value.filter((station) => station.url !== url)
    const hasChanged = filtered.length !== stations.value.length
    if (!hasChanged) return
    await set(STATIONS_KEY, toPlainStations(filtered))
    stations.value = filtered
    await markPreferencesSynced()
  }

  const updateStation = async (originalUrl: string, updated: Station): Promise<void> => {
    if (!isValidUrl(updated.url)) throw new Error(`Invalid station URL: ${updated.url}`)
    if (!isValidName(updated.name)) throw new Error(`Invalid station name: ${updated.name}`)
    const index = stations.value.findIndex((station) => station.url === originalUrl)
    if (index === -1) return
    const updatedList = stations.value.map((station, listIndex) =>
      listIndex === index ? updated : station,
    )
    await set(STATIONS_KEY, toPlainStations(updatedList))
    stations.value = updatedList
    await markPreferencesSynced()
  }

  /**
   * Bulk-replaces the entire station list (Sub-Issue C, issue #64): applies a
   * remote GitHub repo copy fetched on app load, dropping any entry that
   * fails the same validation `addStation` enforces rather than rejecting
   * the whole batch — mirroring `loadStations`' forgiving treatment of
   * existing IndexedDB data, since this is bulk data from an external file,
   * not a single direct user action.
   */
  const replaceStations = async (newStations: Station[]): Promise<void> => {
    const validStations = newStations.filter(
      (station) => isValidUrl(station.url) && isValidName(station.name),
    )
    await set(STATIONS_KEY, toPlainStations(validStations))
    stations.value = validStations
    await markPreferencesSynced()
  }

  return {
    stations,
    loadStations,
    addStation,
    removeStation,
    updateStation,
    replaceStations,
  }
}
