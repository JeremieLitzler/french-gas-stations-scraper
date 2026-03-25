import type { Station } from '@/types/station'
import type {
  PreferencesFile,
  PreferencesDiff,
  StationDiffRow,
  FuelTypeDiff,
} from '@/types/preferences'

const MAX_FILE_SIZE_BYTES = 1_000_000 // 1 MB
const ALLOWED_ORIGIN = 'https://www.prix-carburants.gouv.fr'
const ALLOWED_PATH_PREFIX = '/station/'
const MAX_NAME_LENGTH = 200
const DANGEROUS_KEYS = ['__proto__', 'constructor', 'prototype']

// ---------------------------------------------------------------------------
// Size guard
// ---------------------------------------------------------------------------

export function isFileSizeAcceptable(file: File): boolean {
  return file.size <= MAX_FILE_SIZE_BYTES
}

// ---------------------------------------------------------------------------
// JSON parsing
// ---------------------------------------------------------------------------

export function parseJsonFile(text: string): PreferencesFile | null {
  try {
    const parsed: unknown = JSON.parse(text)
    return validatePreferencesShape(parsed)
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Shape validation
// ---------------------------------------------------------------------------

function validatePreferencesShape(raw: unknown): PreferencesFile | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null
  if (hasDangerousKey(raw)) return null
  const record = raw as Record<string, unknown>
  if (!Object.prototype.hasOwnProperty.call(record, 'fuelTypeDefault')) return null
  if (!Object.prototype.hasOwnProperty.call(record, 'favoriteStations')) return null
  const fuelTypeDefault = validateFuelTypeDefault(record.fuelTypeDefault)
  if (fuelTypeDefault === undefined) return null
  // TODO: if the `fuelTypeDefault` is not a fuel type we recognize, we  reject the file
  // but that would require coupling this module with the fuel type list that we get from
  // each station.
  //
  // The tricky part is that the file may contain a station that offers a fuel type that
  // the stations in IndexedDB don't offer. So the default fuel type in imported file
  // may be legitimate.
  //
  // So the sensible option is to:
  // 1. parse all valid stations URL from IndexedDB and the files to extract a complete list of all fuel types.
  // 2. either:
  // 2.1. reject the default fuel type of the file if there's no match
  // 2.2. proceed with the diff as already implemented
  //
  // Note: the enum `fuelType` should be removed and dependencies to it updated accordingly.
  const favoriteStations = validateFavoriteStations(record.favoriteStations)
  if (favoriteStations === null) return null
  return { fuelTypeDefault, favoriteStations }
}

function hasDangerousKey(value: object): boolean {
  return DANGEROUS_KEYS.some((key) => Object.prototype.hasOwnProperty.call(value, key))
}

function validateFuelTypeDefault(value: unknown): string | null | undefined {
  if (value === null) return null
  if (typeof value === 'string') return value
  return undefined
}

function validateFavoriteStations(value: unknown): Station[] | null {
  if (!Array.isArray(value)) return null
  const stations: Station[] = []
  for (const item of value) {
    const station = validateStation(item)
    if (station === null) return null
    stations.push(station)
  }
  return stations
}

function validateStation(value: unknown): Station | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
  if (hasDangerousKey(value)) return null
  const record = value as Record<string, unknown>
  if (typeof record.name !== 'string') return null
  if (typeof record.url !== 'string') return null
  if (!isValidName(record.name)) return null
  if (!isValidUrl(record.url)) return null
  return { name: record.name, url: record.url }
}

// ---------------------------------------------------------------------------
// Field validators (replicating useStationStorage rules)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Diff computation
// ---------------------------------------------------------------------------

/**
 * Compare the imported file against the current IndexedDB state.
 * Returns null when the two states are identical (no changes needed).
 */
export function computeDiff(
  imported: PreferencesFile,
  storedStations: Station[],
  storedFuelType: string | null,
): PreferencesDiff | null {
  const stationRows = buildStationRows(imported.favoriteStations, storedStations)
  const fuelTypeDiff = buildFuelTypeDiff(imported.fuelTypeDefault, storedFuelType)
  if (stationRows.length === 0 && fuelTypeDiff === null) return null
  return { stationRows, fuelTypeDiff }
}

function buildStationRows(
  importedStations: Station[],
  storedStations: Station[],
): StationDiffRow[] {
  const storedByUrl = indexByUrl(storedStations)
  return importedStations.flatMap((fileStation) => toStationRow(fileStation, storedByUrl))
}

function indexByUrl(stations: Station[]): Map<string, Station> {
  const map = new Map<string, Station>()
  for (const station of stations) {
    map.set(station.url, station)
  }
  return map
}

function toStationRow(fileStation: Station, storedByUrl: Map<string, Station>): StationDiffRow[] {
  const stored = storedByUrl.get(fileStation.url) ?? null
  // TODO: if a station in file and IndexedDB have the same name but a different URL
  // make sure the URL difference is a path difference only.
  //
  // Ex: Station "à SUPER U APPRIEU" has URL="https://www.prix-carburants.gouv.fr/station/38690006?test=1" in the file
  // but in IndexedDB, it is the same station name but with URL="https://www.prix-carburants.gouv.fr/station/38690006".
  //
  // It shouldn't be marked as "Ajoutée".
  // Why? Because the source website defines URL as:
  // https://www.prix-carburants.gouv.fr/station/{station_id} only, without any query parameters.
  if (stored === null) {
    return [buildNewRow(fileStation)]
  }
  if (stored.name !== fileStation.name) {
    return [buildConflictRow(fileStation, stored)]
  }
  return []
}

function buildNewRow(fileStation: Station): StationDiffRow {
  return {
    kind: 'new',
    url: fileStation.url,
    fileStation,
    storedStation: null,
    selected: true,
    chosenName: null,
  }
}

function buildConflictRow(fileStation: Station, storedStation: Station): StationDiffRow {
  return {
    kind: 'conflict',
    url: fileStation.url,
    fileStation,
    storedStation,
    selected: false,
    chosenName: null,
  }
}

function buildFuelTypeDiff(
  fileValue: string | null,
  storedValue: string | null,
): FuelTypeDiff | null {
  if (fileValue === storedValue) return null
  return { fileValue, storedValue, chosen: null }
}
