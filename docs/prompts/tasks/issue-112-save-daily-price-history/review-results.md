# Review Results — Issue #112: Save Daily Price History

lint: clean (9 pre-existing failures in `usePreferencesExport.spec.ts` / `usePreferencesImport.spec.ts` — both untouched on this branch, confirmed via `git diff develop...HEAD` showing no changes to either file; unrelated to this feature)
type-check: clean

## Checklist findings

- **Duplicated `jsonResponse` instead of reusing the existing shared helper** —
  `netlify/functions/scheduled-price-history/scheduled-price-history.ts:31-33` defines a local
  `jsonResponse(statusCode, body)` that reimplements `netlify/functions/lib/http-responses.ts`'s
  `jsonResponse` (same `Content-Type: application/json` header shape, same `JSON.stringify(body)`
  body). That shared helper already lives in the same `netlify/functions/lib/` directory this
  function already imports five other modules from (`scheduleGuards`, `stationUrlAllowlist`,
  `stationHtmlParser`, `favoriteStationsParser`, `priceHistoryCsv`) — there is no project-reference
  boundary excuse here, unlike the `src/`-mirrored files the technical spec justifies. It's also
  the established convention: all four existing Netlify functions
  (`github-api-proxy`, `github-auth-callback`, `github-auth-logout`, `github-auth-start`) import
  `jsonResponse` from `lib/http-responses.ts` rather than defining their own. Replace the local
  `jsonResponse` with `import { jsonResponse } from '../lib/http-responses'` (its optional
  `setCookieValues` param defaults to `[]`, so call sites are unaffected).

All other checklist items ✓

status: changes requested
