# Technical Specifications — Issue #16
## Parse Station HTML in the Browser and Return Structured JSON

## Files Created or Changed

| File | Action | Description |
|---|---|---|
| `src/utils/stationHtmlParser.ts` | Created | Pure utility: parses HTML string into `StationData` using native `DOMParser` and `querySelectorAll` |
| `src/composables/useStationPrices.ts` | Created | Singleton composable: fetches raw HTML via `fetch-page`, delegates parsing to `stationHtmlParser`, exposes reactive `StationData`, loading, and error state |

`netlify/functions/fetch-page.ts` — **not modified**, as specified.

## Technical Choices

### `stationHtmlParser.ts` — DOMParser over alternatives

`DOMParser` is a native browser API (and provided by happy-dom in tests). Using it avoids adding `jsdom`, `cheerio`, or any other dependency. The parser runs in the browser where `DOMParser` is always available.

Reason for extracting into a separate utility: testability. A pure function with string input and structured output is trivially testable without mounting a Vue component or mocking the network.

### Return type: discriminated union (`ParseResult`)

The parser returns `{ success: true, data: StationData } | { success: false, error: 'selector_not_found' }` rather than throwing. This matches the existing `fetch-page` response shape and avoids try/catch at the composable level for expected failure cases (no selector found is not an exceptional condition — some pages may simply lack the table).

### `textContent` not `innerHTML` for all text extraction

All text extraction uses `textContent`, which returns the raw text content of an element stripped of any markup. This satisfies security guideline 3: no markup from the external server is forwarded as executable content.

### `td.prix` CSS class selector for price cells

The second `<td>` in each fuel row carries the class `prix` alongside other layout classes. The selector `td.prix` correctly targets elements that have `prix` in their class list (CSS class selector semantics, not exact match).

### Singleton composable pattern for `useStationPrices`

Following ADR-002, module-level reactive state (`stationData`, `isLoading`, `error`) is shared across all consumers. A single `loadStationPrices(url)` action updates shared state. This avoids redundant concurrent fetches if multiple components consume the composable.

### `catch` without binding the error variable

The `try/catch` in `loadStationPrices` catches network errors and sets `error.value = 'fetch_failed'` — a static string, never the raw exception message (satisfies security guideline 8). The caught value is intentionally not bound (`catch {` not `catch (err) {`) since it is not used.

## Self-Code Review

### Potential issue 1: `td.prix` selector may not match if class order changes

The selector `td.prix` matches any `<td>` that has `prix` in its class list, regardless of order. CSS class selectors are order-independent. This is robust against class reordering by the upstream HTML. **No change needed.**

### Potential issue 2: `NodeListOf<Element>` `forEach` vs `Array.from`

`Array.from(rows).map(rowToFuelPrice)` correctly converts the `NodeList` to an array before mapping. Using `NodeList.forEach` would work but would not allow `.map`. The `Array.from` approach is idiomatic and has no performance concern for the number of rows involved (< 20). **No change needed.**

### Potential issue 3: Singleton state not reset between stations

`useStationPrices` is a singleton — if the user switches from one station to another, `stationData.value` is set to `null` at the start of `loadStationPrices`. This prevents stale data from a previous station from being visible during loading. `error.value` and `isLoading.value` are also reset at the start. **This is correct and intentional.**

status: ready
