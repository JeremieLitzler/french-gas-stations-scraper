# Feature 3 — Scraping the station data

## Purpose

On page load, fetches every favorite station's page from `prix-carburants.gouv.fr` through a Netlify proxy (to get past CORS), parses each page into structured fuel-type/price data, runs all stations concurrently, and exposes the results, a warnings list for stations that could not be parsed, and a loading flag.

## Implementing code

- `netlify/functions/fetch-page/fetch-page.ts` — a pure HTTP proxy: `GET` with a `url` query param on the allowed domain, returns `{ success: true, html }`. It does not parse.
- `netlify/functions/lib/stationUrlAllowlist.ts` — the allowed origin / path-prefix check.
- `src/utils/stationHtmlParser.ts` — pure browser utility: `DOMParser` + `querySelectorAll`, HTML string in, `StationData` or a `selector_not_found` signal out. No Vue, no network, no `jsdom` / `cheerio`.
- `src/utils/stationFetcher.ts` — calls `fetch-page`, passes the HTML to the parser, returns `StationData`.
- `src/composables/useStationPrices.ts` — singleton; fetches a passed-in station list concurrently; exposes `results`, `warnings`, `isLoading`, a fetch-completed signal, plus incremental add/remove/refetch ops (those belong to Feature 5's reactivity).
- `src/components/StationPrices.vue` — owns the fetch-feedback UI: the loader, the success message, the warnings list. Calls the fetch in its own `onMounted`.
- `src/types/station-data.ts` (`StationData` = `{ stationName, fuels: FuelPrice[] }`), `src/types/fuel-price.ts` (`FuelPrice` = `{ type, price: number | null }`), `src/types/station-warning.ts`.

## Behaviour & rules

**Proxy only.** `fetch-page` never parses HTML. For an allowed URL it returns `200 { success: true, html }`; `405` for a non-`GET`; `400` for a missing or invalid `url`; `403` for a disallowed domain.

**Client-side parse.** The station name is the text of `#details_pdv .fr-h2` (empty string if absent). Each `.details_pdv tbody tr`: the first `<td>`'s `<strong>` is the fuel-type label (fall back to the trimmed cell text); the second `<td class="prix">`'s `<strong>` is the price — `null` if there is no `<strong>`, the content is whitespace or `&nbsp;`, or the text is not a valid number.

**Selector not found.** HTML with no matching `.details_pdv tbody tr` makes the parser return `selector_not_found`, which the composable turns into a user-facing warning.

**Concurrent.** All fetches start together; none waits on another. `isLoading` is `true` from the moment the first fetch starts and becomes `false` only after every fetch has settled.

**Warnings, not failures.** A `selector_not_found` response or a network error places that station in `warnings` (carrying its name and URL) and does not abort the run. `results` contains only stations that produced at least one fuel entry. Each rendered warning names both the station and its URL.

**Completion.** Once loading finishes, a success message is shown — even when there are warnings — and auto-dismisses after a short delay. An empty station list makes no requests, leaves `isLoading` false, and shows no success message.

**Caller-driven.** The composable never self-triggers. `StationPrices.vue` invokes the fetch in its own `onMounted`, passing `useStationStorage().stations.value`. Re-triggering clears the previous `results`, `warnings`, and any success message, and resets `isLoading`.

## Related ADRs

- [ADR-006](../../decisions/ADR-006-netlify-functions-for-cors-proxy.md) — Netlify Functions for CORS-free HTML fetching.
- [ADR-007](../../decisions/ADR-007-html-sanitization-for-vhtml.md) — HTML sanitization strategy for `v-html` rendering.
- [ADR-002](../../decisions/adr-002-state-management.md) — singleton composable for shared state.

## See also

- **Feature 4** derives the fuel-type list from `results`.
- **Feature 6** renders `results` as the price table.
- **Feature 5** drives incremental re-fetch when the station list changes.
- **Feature 8** scrapes the same pages the same way, server-side and on a schedule.

_Source specs (in git history): `issue-16`, `issue-18`._
