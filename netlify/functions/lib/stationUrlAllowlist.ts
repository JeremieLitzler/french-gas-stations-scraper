// Re-validates favorite-station URLs read from the remote preferences file
// before the scheduled price-history function fetches them (issue #112,
// security-guidelines.md rule 3). Mirrors the origin/path allowlist
// `src/utils/preferencesImport.ts` enforces in the browser — duplicated
// here because Netlify Functions do not import from `src/`
// (technical-specifications.md). The remote file can be edited outside the
// app (ADR-012), so a URL is never trusted as-is.
const ALLOWED_ORIGIN = 'https://www.prix-carburants.gouv.fr'
const ALLOWED_PATH_PREFIX = '/station/'

export function isAllowedStationUrl(rawUrl: string): boolean {
  const parsed = parseUrl(rawUrl)
  if (parsed === null) return false
  return parsed.origin === ALLOWED_ORIGIN && parsed.pathname.startsWith(ALLOWED_PATH_PREFIX)
}

function parseUrl(rawUrl: string): URL | null {
  try {
    return new URL(rawUrl)
  } catch {
    return null
  }
}
