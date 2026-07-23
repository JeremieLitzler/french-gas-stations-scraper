// Minimal favoriteStations shape validation for the remote preferences file
// (ADR-012), read server-side by the scheduled price-history function.
// Reduced from `src/utils/preferencesImport.ts`'s validateFavoriteStations
// (Netlify Functions do not import from `src/`, see
// technical-specifications.md) — this only needs the station list, not the
// full PreferencesFile shape (fuelTypeDefault is irrelevant here).
export interface FavoriteStation {
  name: string
  url: string
}

export function parseFavoriteStations(jsonText: string): FavoriteStation[] | null {
  const parsed = parseJson(jsonText)
  if (typeof parsed !== 'object' || parsed === null) return null
  const record = parsed as Record<string, unknown>
  return validateStations(record.favoriteStations)
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function validateStations(value: unknown): FavoriteStation[] | null {
  if (!Array.isArray(value)) return null
  const stations: FavoriteStation[] = []
  for (const item of value) {
    const station = validateStation(item)
    if (station === null) return null
    stations.push(station)
  }
  return stations
}

function validateStation(value: unknown): FavoriteStation | null {
  if (typeof value !== 'object' || value === null) return null
  const record = value as Record<string, unknown>
  if (typeof record.name !== 'string' || typeof record.url !== 'string') return null
  return { name: record.name, url: record.url }
}
