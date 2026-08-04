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

/**
 * A single before/after value for one field of one station, part of a
 * pending GitHub write's field-level diff (issue #110).
 */
export interface StationFieldChange {
  field: 'name' | 'url'
  before: string
  after: string
}

/**
 * The three kinds of station-list change tracked between GitHub pushes
 * (issue #110): a station's name and/or URL was edited, a station was
 * added, or a station was removed. Recorded as discrete events at the
 * moment each edit is saved locally, rather than derived by diffing two
 * full station arrays afterwards — the remote (pre-push) array and the
 * local array have no shared identity to match on once a station's URL
 * itself can change.
 */
export type StationChange =
  | { kind: 'edited'; url: string; fieldChanges: StationFieldChange[] }
  | { kind: 'added'; station: Station }
  | { kind: 'removed'; station: Station }

/**
 * Before/after value for the default fuel type, only present when the
 * remote file's value differs from the local value being pushed.
 */
export interface FuelTypeChange {
  before: string | null
  after: string | null
}

/**
 * Field-level preview for a pending write to the remote GitHub repo
 * (Sub-Issue D, issue #64; field-level shape added by issue #110) — a
 * single confirm/cancel, not a per-row merge, since the local state
 * already written to IndexedDB is already the value being pushed; there
 * is nothing to merge.
 */
export interface RemoteWritePreview {
  stationChanges: StationChange[]
  fuelTypeChange: FuelTypeChange | null
}
