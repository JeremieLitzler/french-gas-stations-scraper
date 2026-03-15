# Test Cases — Issue #16
## Parse Station HTML in the Browser and Return Structured JSON

All parser tests run in the Vitest + happy-dom environment, which provides native `DOMParser` — no extra dependencies needed.

## TC-01: Parse valid fixture with mixed prices (AOSTE)

**Precondition:** The HTML fixture for INTERMARCHE-AOSTE is loaded as a string. It contains 6 fuel rows: 4 have valid prices and 2 have empty price cells.

**Action:** `stationHtmlParser` is called with the AOSTE HTML string.

**Expected outcome:**
- The returned station name equals `"SAS CYRQUEN"`.
- The returned fuels array contains exactly 6 entries.
- The 4 rows with prices each have a non-null numeric price matching the fixture values.
- The 2 rows with empty price cells each have `price: null`.

## TC-02: Parse valid fixture with all prices present (APPRIEU)

**Precondition:** The HTML fixture for INTERMARCHE-APPRIEU is loaded as a string. It contains fuel rows, all with valid prices.

**Action:** `stationHtmlParser` is called with the APPRIEU HTML string.

**Expected outcome:**
- The returned station name is a non-empty string matching the `#details_pdv .fr-h2` text in the fixture.
- All fuel entries have a non-null numeric price.
- The fuels array length matches the number of `<tr>` elements in `.details_pdv tbody`.

## TC-03: Row with whitespace-only price cell returns null price

**Precondition:** An HTML string is constructed containing one fuel row whose second cell contains only whitespace characters.

**Action:** `stationHtmlParser` is called with that HTML string.

**Expected outcome:**
- The fuels array contains one entry with `price: null`.

## TC-04: Row with `&nbsp;` in price cell returns null price

**Precondition:** An HTML string is constructed containing one fuel row whose second cell contains only `&nbsp;`.

**Action:** `stationHtmlParser` is called with that HTML string.

**Expected outcome:**
- The fuels array contains one entry with `price: null`.

## TC-05: Row with non-numeric price text returns null price

**Precondition:** An HTML string is constructed containing one fuel row whose second cell contains `<strong>N/A</strong>`.

**Action:** `stationHtmlParser` is called with that HTML string.

**Expected outcome:**
- The fuels array contains one entry with `price: null`.

## TC-06: Row whose first cell has no `<strong>` element

**Precondition:** An HTML string is constructed containing one fuel row whose first cell has plain text (no `<strong>` wrapper) and a valid price in the second cell.

**Action:** `stationHtmlParser` is called with that HTML string.

**Expected outcome:**
- The fuels array contains one entry whose type is the trimmed text content of the first cell.
- The price is the expected numeric value.

## TC-07: No `.details_pdv tbody tr` selector found — empty HTML

**Precondition:** An empty string is provided as input.

**Action:** `stationHtmlParser` is called with the empty string.

**Expected outcome:**
- The parser signals a failure with the code `"selector_not_found"`.
- No fuels array is returned.

## TC-08: No `.details_pdv tbody tr` selector found — valid HTML without the table

**Precondition:** A valid HTML string is provided that contains no `.details_pdv` table.

**Action:** `stationHtmlParser` is called with that HTML string.

**Expected outcome:**
- The parser signals a failure with the code `"selector_not_found"`.

## TC-09: Missing station name element returns empty string

**Precondition:** An HTML string is constructed containing a valid `.details_pdv tbody tr` section but no `#details_pdv .fr-h2` element.

**Action:** `stationHtmlParser` is called with that HTML string.

**Expected outcome:**
- The parsing succeeds (fuels are returned normally).
- The station name is an empty string `""`.

status: ready
