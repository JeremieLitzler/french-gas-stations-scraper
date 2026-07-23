# Technical Specifications — Issue #112: Save Daily Price History

## Files Created

- `netlify/functions/scheduled-price-history/scheduled-price-history.ts` — the scheduled function's
  handler: guards, orchestrates reading favorites, scraping, and writing `history.csv`.
- `netlify/functions/lib/scheduleGuards.ts` — verifies the invocation came from Netlify's scheduler
  and that the current wall-clock hour in France is the target run hour.
- `netlify/functions/lib/stationUrlAllowlist.ts` — re-validates a favorite station's URL against the
  gas-station-price domain before it is ever fetched.
- `netlify/functions/lib/csvEscaping.ts` — escapes CSV field values against formula and structural
  injection.
- `netlify/functions/lib/stationHtmlParser.ts` — Node-compatible mirror of the SPA's HTML fuel-price
  parser, backed by `linkedom` instead of the browser's `DOMParser`.
- `netlify/functions/lib/githubContentsClient.ts` — minimal GitHub Contents API GET/PUT client
  authenticated with the fixed PAT.
- `netlify/functions/lib/priceHistoryCsv.ts` — builds `history.csv`'s row/header format and applies
  the same-day-replace rule.
- `netlify/functions/lib/favoriteStationsParser.ts` — minimal shape validation for the
  `favoriteStations` array read from the remote preferences file.

## Files Modified

- `netlify/functions/lib/environment.ts` — added `readHistoryConfig()`/`HistoryConfig`, reading the
  four new fixed environment variables (`HISTORY_GITHUB_PAT`, `HISTORY_GITHUB_OWNER`,
  `HISTORY_GITHUB_REPO`, `HISTORY_PREFS_FILE_PATH`) alongside the existing OAuth credential reader.
- `.env.proton-pass-example` — documented the new environment variables for local `netlify dev`.
- `package.json` / `package-lock.json` — added `linkedom` as a production dependency.

## Non-Trivial Decisions

**Duplicated parsing/validation logic instead of importing from `src/`.** `netlify/functions/**/*.ts`
and `src/**/*.ts` are separate TypeScript project references (`tsconfig.node.json` vs
`tsconfig.app.json`, both `composite: true`). Importing a `src/` file from a Netlify Function would
violate `vue-tsc --build`'s project-reference boundaries. `stationHtmlParser.ts`,
`stationUrlAllowlist.ts`, and `favoriteStationsParser.ts` are therefore small, intentional copies of
existing browser-side logic (`src/utils/stationHtmlParser.ts`, `preferencesImport.ts`'s URL/station
validators) — any change to the scrape selector or the allowed URL shape must be mirrored in both
places.

**`linkedom` for server-side HTML parsing.** The Node runtime has no native `DOMParser`. `linkedom`
provides a `DOMParser`-compatible API, letting the Node-side parser reuse the exact same
`querySelector` chain as the browser version instead of a regex-based reimplementation, which would
be more fragile and harder to keep in sync. Verified via `npm audit` that adding it introduces no new
vulnerabilities (it has zero transitive dependencies).

**A separate GitHub Contents API client instead of extending `github-api-proxy.ts`.** The existing
proxy forwards a browser's cookie-based OAuth token (ADR-011) and is already shipped/tested
(issue #86). The scheduled function's PAT (ADR-014) is a fundamentally different, server-only
credential with its own read/write needs (fixed owner/repo, no CORS/cookie concerns) — a small,
separate client avoids mixing two different auth models into one file and avoids touching tested
code for an unrelated auth path.

**Twice-daily cron (`0 19,20 * * *`) plus a `Europe/Paris` hour check**, per ADR-014: Netlify cron
schedules run in UTC and can't natively express "21:00 French local time" across DST changes without
a runtime check.

**`isScheduledInvocation` (checking for a `next_run` field) is kept as defense-in-depth** even though
the installed `@netlify/functions` package's own type declarations document `schedule()`-wrapped
functions as "not reachable via HTTP" — a detail discovered while implementing, not assumed at
ADR-014 time. The check is cheap and still satisfies security-guidelines.md rule 4's intent whether or
not the platform's own guarantee holds across versions.

**CSV row-date matching via a comma-prefix scan, not a CSV parsing library.** The date column is
always a plain, unescaped `YYYY-MM-DD` string (it can never contain a comma, quote, or
formula-trigger character), so identifying "today's rows" to replace is a safe substring match — no
need for a full CSV parser dependency for this one narrow operation.

**Base64 via Node's `Buffer` rather than the browser's `btoa`/`atob` workaround.** The existing
composables need a manual UTF-8 workaround because browsers' `atob`/`btoa` are Latin-1-only and don't
tolerate GitHub's line-wrapped base64. Node's `Buffer.from(text, 'base64')` handles UTF-8 and ignores
embedded whitespace natively, so the Netlify Function side is simpler by construction, not by
omission.

**`history.csv`'s path is a hardcoded constant, not an environment variable.** The spec names a fixed
file, `history.csv`, at the repository root; no configurability for this specific path was
requested (unlike the preferences file's path, which mirrors a value the user already configures in
the Settings UI).

## Self-Review Fixes

1. **`scrapeStation` now wraps its body in `try`/`catch`.** Without it, a rejected `fetch()` promise
   for one station (network error, timeout) would reject the whole `Promise.all` in
   `scrapeAllStations`, discarding every other station's rows for the day — directly contradicting
   the "only that station is omitted" rule.
2. **`fetchStationHtml` now uses an `AbortController` with a 10-second timeout**, mirroring
   `useRemotePreferencesSync.ts`'s existing pattern — an unresponsive station page could otherwise
   stall the whole run indefinitely (and risk the Netlify Function's own execution timeout aborting
   before any write happens).
3. **`rowDate` now returns the whole line when no comma is found**, instead of an off-by-one
   `slice(0, -1)` truncation, so a malformed existing CSV line is preserved as-is rather than
   silently corrupted.

No new ADR is required — every decision above elaborates on ADR-014's already-approved scope
(fixed PAT, fixed env vars, DST-aware double-fire) rather than introducing a new architectural
pattern.

status: ready
