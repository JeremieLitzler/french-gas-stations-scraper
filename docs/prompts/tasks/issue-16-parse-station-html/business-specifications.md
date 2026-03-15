# Business Specifications — Issue #16
## Parse Station HTML in the Browser and Return Structured JSON

## Goal and Scope

The `fetch-page` Netlify function currently fetches raw HTML and returns it. Its sole responsibility is to proxy the HTTP request (bypassing CORS) — it must not parse HTML. Parsing happens client-side in the browser, where native DOM APIs (`DOMParser`, `querySelectorAll`) are available at zero dependency cost.

This feature introduces:
1. A pure browser-side utility `stationHtmlParser.ts` that parses an HTML string into a `StationData` object.
2. Integration of that utility into the composable that calls `fetch-page`, so the composable returns structured data instead of raw HTML.

`fetch-page.ts` is **not modified**.

## Existing Types

The following types are already defined in `src/types/` and must be used as-is:

- `StationData` — `{ stationName: string, fuels: FuelPrice[] }`
- `FuelPrice` — `{ type: string, price: number | null }`

No new types need to be introduced.

## Files to Create or Modify

- `src/utils/stationHtmlParser.ts` — new: a pure utility (no Vue dependencies) that accepts an HTML string and uses `DOMParser` + `querySelectorAll` to return a `StationData` object or a structured error signal. Uses only native browser APIs — zero extra dependencies.
- The composable that calls `fetch-page` (identify from codebase) — modified: after receiving `{ success, html }`, pass `html` to `stationHtmlParser` and return the resulting `StationData` to callers.

## Parsing Rules

### Station Name

The station name is found inside the element matching `#details_pdv .fr-h2`. The text content of this element is the station name. If absent, station name is an empty string.

### Fuel Rows

Each row in `.details_pdv tbody tr` represents one fuel entry:

- The first cell (`<td>`) contains a `<strong>` element whose text is the fuel type label (e.g. `SP95-E10 (E10)`, `Gazole (B7)`). If no `<strong>` is present, use the trimmed text content of the cell.
- The second cell (`<td class="prix">`) contains an optional `<strong>` element whose text is the numeric price (e.g. `1.829`). If the cell contains no `<strong>` element, the value is whitespace/`&nbsp;`, or the value is not a valid number, the price is `null`.

## Behaviour by Example (Example Mapping)

### Story: Successful parse of a valid station page

**Rule:** When the HTML contains matching `.details_pdv tbody tr` elements, the parser returns a `StationData` object.

| Example | Input | Expected output |
|---|---|---|
| Full fixture (INTERMARCHE-AOSTE) | HTML with 6 rows, 4 with prices and 2 empty | `stationName: "SAS CYRQUEN"`, `fuels` array with 6 entries; 2 entries have `price: null` |
| Full fixture (INTERMARCHE-APPRIEU) | HTML with rows, all prices present | `stationName` matches the `#details_pdv .fr-h2` text, all fuel prices are numeric |
| Row with empty price cell | `<td class="prix"></td>` | `price: null` for that row |
| Row with non-numeric price | `<td class="prix"><strong>N/A</strong></td>` | `price: null` for that row |
| Row with whitespace-only price | `<td class="prix"> </td>` | `price: null` for that row |
| Row with `&nbsp;` in price | `<td class="prix">&nbsp;</td>` | `price: null` for that row |

### Story: Selector not found

**Rule:** When the HTML does not contain any `.details_pdv tbody tr` elements, the parser signals a failure.

| Example | Input | Expected output |
|---|---|---|
| Empty HTML string | `""` | Error signal: `selector_not_found` |
| HTML with no `.details_pdv` table | Valid HTML but no matching selector | Error signal: `selector_not_found` |

**The composable translates this error signal into a warning displayed to the user** (exact UI TBD by existing composable patterns).

### Story: `fetch-page` function unchanged

**Rule:** `fetch-page.ts` must not be modified. It continues to return `{ success: true, html }` on success.

| Example | Input | Expected outcome |
|---|---|---|
| Valid station URL | GET with allowed domain URL | `200` with `{ success: true, html: "<html>..." }` |
| POST request | Any POST | `405 Method Not Allowed` |
| Missing `url` param | GET with no `url` | `400 Bad Request` |
| Invalid URL | GET with `url=not-a-url` | `400 Bad Request` |
| Disallowed domain | GET with `url=https://evil.com/` | `403 Forbidden` |

## Constraints

- `stationHtmlParser.ts` must use only native browser APIs (`DOMParser`, `querySelectorAll`) — no `jsdom`, `happy-dom`, or `cheerio` imports.
- The utility must have no Vue dependencies.
- The parser must not make any network requests.
- `fetch-page.ts` must not be modified.
- `jsdom` must not be added to `package.json` (remove it if the coder agent added it).

## Files Summary

| File | Action | Role |
|---|---|---|
| `netlify/functions/fetch-page.ts` | **No change** | Fetches HTML, returns `{ success, html }` |
| `src/utils/stationHtmlParser.ts` | Create | Pure utility: parses HTML string into `StationData` or returns error signal using native `DOMParser` |
| Composable calling `fetch-page` | Modify | Passes received HTML to `stationHtmlParser`, returns `StationData` to callers |

status: ready
