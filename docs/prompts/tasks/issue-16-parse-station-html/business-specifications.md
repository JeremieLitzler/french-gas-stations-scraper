# Business Specifications — Issue #16
## Parse Station HTML and Return Structured JSON from fetch-page Function

## Goal and Scope

The `fetch-page` Netlify function currently returns raw HTML to the client. The client must not parse HTML in the browser. Instead, the function must parse the fetched HTML server-side and return a structured JSON object containing the station name and its available fuel prices.

This change also requires a new utility to perform the HTML parsing, which can be tested independently using HTML fixtures.

## Existing Types

The following types are already defined in `src/types/` and must be used as-is:

- `StationData` — `{ stationName: string, fuels: FuelPrice[] }`
- `FuelPrice` — `{ type: string, price: number | null }`

No new types need to be introduced.

## Files to Create or Modify

- `netlify/functions/fetch-page.ts` — modified: response shape changes from `{ success, html }` to `{ success, data: StationData }` on success; existing HTTP-method guard and domain allowlist remain unchanged.
- `src/utils/stationHtmlParser.ts` — new: a pure utility (no Vue dependencies) that accepts an HTML string and returns a `StationData` object or a structured error signal.

## Parsing Rules

### Station Name

The station name is found inside the element matching `#details_pdv .fr-h2`. The text content of this element is the station name.

### Fuel Rows

Each row in `.details_pdv tbody tr` represents one fuel entry:

- The first cell (`<td>`) contains a `<strong>` element whose text is the fuel type label (e.g. `SP95-E10 (E10)`, `Gazole (B7)`).
- The second cell (`<td class="prix">`) contains an optional `<strong>` element whose text is the numeric price (e.g. `1.829`). If the cell contains no `<strong>` element or the value is not a valid number, the price is `null`.

## Behaviour by Example (Example Mapping)

### Story: Successful parse of a valid station page

**Rule:** When the HTML contains a matching `.details_pdv tbody tr` selector, the function returns a `StationData` object.

| Example | Input | Expected output |
|---|---|---|
| Full fixture (INTERMARCHE-AOSTE) | HTML with 6 rows, 4 with prices and 2 empty | `stationName: "SAS CYRQUEN"`, `fuels` array with 6 entries; 2 entries have `price: null` |
| Full fixture (INTERMARCHE-APPRIEU) | HTML with rows, all prices present | `stationName` matches the `#details_pdv .fr-h2` text, all fuel prices are numeric |
| Row with empty price cell | `<td class="prix"></td>` | `price: null` for that row |
| Row with non-numeric price | `<td class="prix"><strong>N/A</strong></td>` | `price: null` for that row |

### Story: Selector not found

**Rule:** When the HTML does not contain any `.details_pdv tbody tr` elements, the parser signals a failure.

| Example | Input | Expected output |
|---|---|---|
| Empty HTML string | `""` | Error signal: `selector_not_found` |
| HTML with no `.details_pdv` table | Valid HTML but no matching selector | Error signal: `selector_not_found` |

**The Netlify function translates this error signal into:**
```
{ success: false, error: "selector_not_found" }
```
with HTTP status `422`.

### Story: Existing guards unchanged

**Rule:** HTTP method guard and domain allowlist must remain in place.

| Example | Input | Expected outcome |
|---|---|---|
| POST request | Any POST to the function | `405 Method Not Allowed` |
| Missing `url` parameter | GET with no `url` | `400 Bad Request` |
| Invalid URL format | GET with `url=not-a-url` | `400 Bad Request` |
| Disallowed domain | GET with `url=https://evil.com/` | `403 Forbidden` |

## Edge Cases

- A fuel row whose price cell contains only whitespace or `&nbsp;` must result in `price: null`.
- A fuel row whose first cell contains no `<strong>` element must be included in the fuels array with the type set to the full text content of the cell, trimmed.
- If the `#details_pdv .fr-h2` element is absent from the HTML, the station name is an empty string.
- The parser must handle both HTML fixtures without error.

## Constraints

- The HTML parsing utility must have no Vue dependencies — it is a pure utility function callable from both the Netlify function and from tests.
- The parser must not make any network requests. It receives an HTML string as input.
- The Netlify function must not expose raw HTML in any success or error response.
- The existing domain allowlist (`www.prix-carburants.gouv.fr`) must not change.
- The existing HTTP method check must not change.

## Files Summary

| File | Action | Role |
|---|---|---|
| `netlify/functions/fetch-page.ts` | Modify | Add HTML parsing after fetch; change response from `html` to `data: StationData` |
| `src/utils/stationHtmlParser.ts` | Create | Pure utility: parses HTML string into `StationData` or returns error signal |

status: ready
