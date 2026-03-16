/**
 * Singleton composable for persisting the user's gas station list.
 *
 * The reactive station list is declared at module level so all consumers
 * share the same reference (ADR-002 singleton pattern).
 *
 * Persistence is handled via a thin IndexedDB wrapper (ADR-008).
 * All input is validated before being stored (security-guidelines.md).
 *
 * Object Calisthenics exception: the composable function body exceeds
 * five lines because Vue composable conventions require grouping all
 * returned reactive state and operations in one function — this is a
 * documented framework exception.
 */

import { ref } from 'vue'
import type { Ref } from 'vue'
import type { Station } from '@/types/station'
import { get, set } from '@/utils/indexedDb'

const STATIONS_KEY = 'stations'
const MAX_NAME_LENGTH = 200
const ALLOWED_ORIGIN = 'https://www.prix-carburants.gouv.fr'

const DEFAULT_STATIONS: readonly Station[] = [
  { name: 'à INTERMARCHE AOSTE', url: 'https://www.prix-carburants.gouv.fr/station/38490005' },
  { name: 'à INTERMARCHE APPRIEU', url: 'https://www.prix-carburants.gouv.fr/station/38140005' },
  { name: 'à SUPER U APPRIEU', url: 'https://www.prix-carburants.gouv.fr/station/38690006' },
  {
    name: "à INTERMARCHE TAIN L'HERMITAGE",
    url: 'https://www.prix-carburants.gouv.fr/station/26600007',
  },
  { name: 'à SUPER U SAINT-DONAT', url: 'https://www.prix-carburants.gouv.fr/station/26260001' },
]

const stations: Ref<Station[]> = ref([])

const ALLOWED_PATH_PREFIX = '/station/'

function isValidUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl)
    return parsed.origin === ALLOWED_ORIGIN && parsed.pathname.startsWith(ALLOWED_PATH_PREFIX)
  } catch {
    return false
  }
}

function stripHtmlTags(text: string): string {
  return text.replace(/<[^>]*>/g, '')
}

function isValidName(name: string): boolean {
  const stripped = stripHtmlTags(name)
  return stripped === name && name.trim().length > 0 && name.length <= MAX_NAME_LENGTH
}

function isStation(value: unknown): value is Station {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  return typeof candidate.name === 'string' && typeof candidate.url === 'string'
}

function filterValidStations(raw: unknown): Station[] {
  if (!Array.isArray(raw)) return []
  return raw.filter(isStation)
}

async function seedDefaults(): Promise<void> {
  const seedList = [...DEFAULT_STATIONS]
  await set(STATIONS_KEY, seedList)
  stations.value = seedList
}

async function loadStations(): Promise<void> {
  const stored = await get<unknown>(STATIONS_KEY)
  const validStations = filterValidStations(stored)
  if (validStations.length > 0) {
    stations.value = validStations
    return
  }
  await seedDefaults()
}

async function addStation(station: Station): Promise<void> {
  if (!isValidUrl(station.url)) throw new Error(`Invalid station URL: ${station.url}`)
  if (!isValidName(station.name)) throw new Error(`Invalid station name: ${station.name}`)
  const updated = [...stations.value, station]
  await set(STATIONS_KEY, updated)
  stations.value = updated
}

async function removeStation(url: string): Promise<void> {
  const filtered = stations.value.filter((station) => station.url !== url)
  const hasChanged = filtered.length !== stations.value.length
  if (!hasChanged) return
  await set(STATIONS_KEY, filtered)
  stations.value = filtered
}

async function updateStation(originalUrl: string, updated: Station): Promise<void> {
  if (!isValidUrl(updated.url)) throw new Error(`Invalid station URL: ${updated.url}`)
  if (!isValidName(updated.name)) throw new Error(`Invalid station name: ${updated.name}`)
  const index = stations.value.findIndex((station) => station.url === originalUrl)
  if (index === -1) return
  const updatedList = stations.value.map((station, listIndex) =>
    listIndex === index ? updated : station,
  )
  await set(STATIONS_KEY, updatedList)
  stations.value = updatedList
}

export function useStationStorage(): {
  stations: Ref<Station[]>
  loadStations: () => Promise<void>
  addStation: (station: Station) => Promise<void>
  removeStation: (url: string) => Promise<void>
  updateStation: (originalUrl: string, updated: Station) => Promise<void>
} {
  return {
    stations,
    loadStations,
    addStation,
    removeStation,
    updateStation,
  }
}
