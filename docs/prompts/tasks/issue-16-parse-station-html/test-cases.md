# Test Cases — Issue #16
## Parse Station HTML and Return Structured JSON

## TC-01: Parse valid fixture with mixed prices (AOSTE)

**Precondition:** The HTML fixture for INTERMARCHE-AOSTE is loaded as a string. It contains 6 fuel rows: 4 have valid prices and 2 have empty price cells.

**Action:** The parser utility is called with the AOSTE HTML string.

**Expected outcome:**
- The returned station name equals `"SAS CYRQUEN"`.
- The returned fuels array contains exactly 6 entries.
- The 4 rows with prices each have a non-null numeric price matching the fixture values.
- The 2 rows with empty price cells each have `price: null`.

## TC-02: Parse valid fixture with all prices present (APPRIEU)

**Precondition:** The HTML fixture for INTERMARCHE-APPRIEU is loaded as a string. It contains fuel rows, all with valid prices.

**Action:** The parser utility is called with the APPRIEU HTML string.

**Expected outcome:**
- The returned station name is a non-empty string matching the `#details_pdv .fr-h2` text in the fixture.
- All fuel entries have a non-null numeric price.
- The fuels array length matches the number of `<tr>` elements in `.details_pdv tbody`.

## TC-03: Row with whitespace-only price cell returns null price

**Precondition:** An HTML string is constructed containing one fuel row whose second cell contains only whitespace characters.

**Action:** The parser utility is called with that HTML string.

**Expected outcome:**
- The fuels array contains one entry with `price: null`.

## TC-04: Row with `&nbsp;` in price cell returns null price

**Precondition:** An HTML string is constructed containing one fuel row whose second cell contains only `&nbsp;`.

**Action:** The parser utility is called with that HTML string.

**Expected outcome:**
- The fuels array contains one entry with `price: null`.

## TC-05: Row with non-numeric price text returns null price

**Precondition:** An HTML string is constructed containing one fuel row whose second cell contains `<strong>N/A</strong>`.

**Action:** The parser utility is called with that HTML string.

**Expected outcome:**
- The fuels array contains one entry with `price: null`.

## TC-06: Row whose first cell has no `<strong>` element

**Precondition:** An HTML string is constructed containing one fuel row whose first cell has plain text (no `<strong>` wrapper) and a valid price in the second cell.

**Action:** The parser utility is called with that HTML string.

**Expected outcome:**
- The fuels array contains one entry whose type is the trimmed text content of the first cell.
- The price is the expected numeric value.

## TC-07: No `.details_pdv tbody tr` selector found — empty HTML

**Precondition:** An empty string is provided as input.

**Action:** The parser utility is called with the empty string.

**Expected outcome:**
- The parser signals a failure with the code `"selector_not_found"`.
- No fuels array is returned.

## TC-08: No `.details_pdv tbody tr` selector found — valid HTML without the table

**Precondition:** A valid HTML string is provided that contains no `.details_pdv` table.

**Action:** The parser utility is called with that HTML string.

**Expected outcome:**
- The parser signals a failure with the code `"selector_not_found"`.

## TC-09: Missing station name element returns empty string

**Precondition:** An HTML string is constructed containing a valid `.details_pdv tbody tr` section but no `#details_pdv .fr-h2` element.

**Action:** The parser utility is called with that HTML string.

**Expected outcome:**
- The parsing succeeds (fuels are returned normally).
- The station name is an empty string `""`.

## TC-10: Netlify function returns structured JSON on success (AOSTE fixture)

**Precondition:** The Netlify function handler is called with a GET request and a valid station URL. The upstream fetch is mocked to return the AOSTE HTML fixture.

**Action:** The handler processes the request.

**Expected outcome:**
- The response has HTTP status `200`.
- The response body is valid JSON with `{ success: true, data: { stationName, fuels } }`.
- No `html` field is present in the response body.

## TC-11: Netlify function returns 422 when selector not found

**Precondition:** The Netlify function handler is called with a GET request and a valid station URL. The upstream fetch is mocked to return HTML with no `.details_pdv tbody tr` elements.

**Action:** The handler processes the request.

**Expected outcome:**
- The response has HTTP status `422`.
- The response body is `{ success: false, error: "selector_not_found" }`.

## TC-12: Netlify function rejects POST requests (guard unchanged)

**Precondition:** The Netlify function handler is called with an HTTP POST request.

**Action:** The handler processes the request.

**Expected outcome:**
- The response has HTTP status `405`.
- The response body contains `{ success: false, error: "Method not allowed" }`.

## TC-13: Netlify function rejects missing URL parameter (guard unchanged)

**Precondition:** The Netlify function handler is called with a GET request and no `url` query parameter.

**Action:** The handler processes the request.

**Expected outcome:**
- The response has HTTP status `400`.
- The response body contains `{ success: false, error: "Missing url parameter" }`.

## TC-14: Netlify function rejects invalid URL format (guard unchanged)

**Precondition:** The Netlify function handler is called with a GET request and `url=not-a-url`.

**Action:** The handler processes the request.

**Expected outcome:**
- The response has HTTP status `400`.
- The response body contains `{ success: false, error: "Invalid URL format" }`.

## TC-15: Netlify function rejects disallowed domain (guard unchanged)

**Precondition:** The Netlify function handler is called with a GET request and a URL pointing to a domain not in the allowlist (e.g. `https://evil.com/station`).

**Action:** The handler processes the request.

**Expected outcome:**
- The response has HTTP status `403`.
- The response body contains `{ success: false }` and an error describing domain rejection.

## TC-16: Response body never contains raw HTML

**Precondition:** The Netlify function handler is called with a valid request. The upstream fetch is mocked to return any HTML.

**Action:** The handler processes the request (whether it succeeds or fails parsing).

**Expected outcome:**
- The response body, when parsed as JSON, contains no field named `html`.
- The response body contains no field whose value is a string longer than a reasonable structured-data threshold (i.e. not raw HTML).

status: ready
