import type { Station } from '@/types/station'

/**
 * The exact shape of the exported/imported JSON file.
 * Any file that does not satisfy this shape is rejected on import.
 */
export interface PreferencesFile {
  fuelTypeDefault: string | null
  favoriteStations: Station[]
}

/**
 * The kind of change a diff row represents.
 */
export type DiffRowKind = 'new' | 'conflict'

/**
 * A row in the diff table representing a station that differs between
 * the imported file and the current IndexedDB state.
 *
 * - kind 'new': the URL is absent from IndexedDB — pre-selected for import.
 * - kind 'conflict': the URL exists in IndexedDB but with a different name —
 *   the user must choose which name to keep.
 */
export interface StationDiffRow {
  kind: DiffRowKind
  url: string
  fileStation: Station
  /** Present only for 'conflict' rows. */
  storedStation: Station | null
  /** User selection: true means "include/use file value", null means unresolved. */
  selected: boolean
  /** For 'conflict' rows: which name the user chose — 'file' | 'stored' | null (unresolved). */
  chosenName: 'file' | 'stored' | null
}

/**
 * Represents the diff result for the default fuel type.
 * Only produced when the file value differs from IndexedDB.
 */
export interface FuelTypeDiff {
  fileValue: string | null
  storedValue: string | null
  /** Which value the user chose — null when unresolved. */
  chosen: 'file' | 'stored' | null
}

/**
 * The full result of diffing an imported file against IndexedDB.
 */
export interface PreferencesDiff {
  stationRows: StationDiffRow[]
  fuelTypeDiff: FuelTypeDiff | null
}
