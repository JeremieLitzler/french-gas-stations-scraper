import type { Station } from '@/types/station'
import type { PreferencesFile } from '@/types/preferences'

/**
 * Serialise the current IndexedDB state into the preferences JSON shape.
 * Pure function — no side effects.
 */
export function buildPreferencesFile(
  stations: Station[],
  fuelTypeDefault: string | null,
): PreferencesFile {
  return {
    fuelTypeDefault,
    favoriteStations: stations.map(toPlainStation),
  }
}

function toPlainStation(station: Station): Station {
  return { name: station.name, url: station.url }
}

/**
 * Trigger a browser file download for the given preferences object.
 * The filename is always `preferences.json`.
 */
export function downloadPreferencesFile(preferences: PreferencesFile): void {
  const json = JSON.stringify(preferences, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const objectUrl = URL.createObjectURL(blob)
  triggerDownload(objectUrl)
  URL.revokeObjectURL(objectUrl)
}

function triggerDownload(objectUrl: string): void {
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = 'preferences.json'
  anchor.click()
}
