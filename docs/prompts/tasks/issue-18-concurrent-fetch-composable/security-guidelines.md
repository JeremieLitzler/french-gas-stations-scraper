# Security Guidelines — Issue 18
## Concurrent Station Price Fetching with Loading State and Warnings

### Guidelines

1. **URL encoding for query parameters** — Where: the composable layer, before constructing the Netlify function call URL. Why: station URLs are user-supplied strings stored in IndexedDB; passing them unencoded as query parameters allows injection of additional query-string keys or path segments that could alter the Netlify function's behaviour or be forwarded to the upstream government server in an unexpected way. Every station URL must be percent-encoded before being appended to the `?url=` parameter.

2. **No direct browser fetch to station URLs** — Where: the composable layer. Why: fetching `prix-carburants.gouv.fr` directly from the browser violates the CORS policy established in ADR-006 and would expose the user's IP to the upstream server without going through the Netlify proxy. All HTML retrieval must go through `/.netlify/functions/fetch-page`.

3. **Treat Netlify function response as untrusted input** — Where: the composable layer, when consuming the JSON response. Why: the response shape may not match the expected `{ success: true, html: string }` or `{ success: false, error: string }` contract if the function returns an error status or unexpected payload. The composable must validate the response shape before accessing its fields; an unexpected shape must be treated as a warning, not a crash.

4. **No rendering of raw HTML from the function response** — Where: any component that consumes `results` from the composable. Why: the `html` field returned by the Netlify function contains raw HTML from an external server. Rendering it directly via `v-html` without sanitization would introduce XSS risk. The composable must pass the HTML through the existing `parseStationHtml` parser and expose only the parsed, structured fuel data — never the raw HTML string — in the reactive `results` list.

5. **No exposure of internal error details in the UI** — Where: the warning display in `src/pages/index.vue`. Why: surfacing raw error strings from the Netlify function response (e.g. the `error` field value) to the user may leak implementation details. Warning messages must be composed from the station name and URL only — not from the raw error payload.

6. **Concurrent fetch isolation** — Where: the composable layer. Why: using `Promise.all` or equivalent means that a rejection in one promise must not silently suppress results from other stations. Each per-station fetch must be individually wrapped so that a failure is captured as a warning and the remaining fetches continue to completion. An uncaught rejection propagating out of the concurrent batch would leave `isLoading` permanently true.

7. **No new external dependencies introduced** — Where: `package.json` and the composable implementation. Why: adding a third-party HTTP client or concurrency library would expand the attack surface and dependency risk. The implementation must use native browser `fetch` and `Promise` APIs only.

8. **Input from IndexedDB treated as untrusted** — Where: the composable layer, when reading the station list from `useStationStorage`. Why: although `useStationStorage` validates URLs before storing them, the composable must not assume the station list is safe. Each station URL used to build a fetch request must be encoded (see rule 1) regardless of its apparent validity.

status: ready
