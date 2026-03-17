# Test Cases — Issue 18
## Concurrent Station Price Fetching with Loading State and Warnings

### TC-01: All stations succeed — results populated, warnings empty

- **Precondition:** The station list contains three stations. The fetch function for each station returns a successful response with valid HTML containing fuel rows.
- **Action:** Trigger the fetch-all action.
- **Expected outcome:** After all fetches settle, `results` contains three entries (one per station, each with a non-empty fuels array). `warnings` is empty. `isLoading` is false.

### TC-02: One station returns selector_not_found — placed in warnings

- **Precondition:** The station list contains three stations. Two return successful HTML responses; one returns `{ success: false, error: "selector_not_found" }`.
- **Action:** Trigger the fetch-all action.
- **Expected outcome:** `results` contains two entries. `warnings` contains one entry with the failing station's name and URL. `isLoading` is false.

### TC-03: All stations return selector_not_found — results empty, all in warnings

- **Precondition:** The station list contains two stations. Both return `{ success: false, error: "selector_not_found" }`.
- **Action:** Trigger the fetch-all action.
- **Expected outcome:** `results` is empty. `warnings` contains two entries (one per station). `isLoading` is false.

### TC-04: isLoading is true during fetch and false after all settle

- **Precondition:** The station list contains at least one station. The fetch response is delayed (not yet resolved).
- **Action:** Trigger the fetch-all action. Observe `isLoading` before and after promises settle.
- **Expected outcome:** `isLoading` is true immediately after triggering. `isLoading` becomes false only after all promises settle. It does not become false after only the first promise settles.

### TC-05: Network error for one station — treated as warning

- **Precondition:** The station list contains two stations. One station's fetch throws a network error. The other succeeds.
- **Action:** Trigger the fetch-all action.
- **Expected outcome:** `warnings` contains one entry for the station that threw a network error. `results` contains one entry for the successful station. `isLoading` is false.

### TC-06: All stations produce network errors — results empty, all in warnings

- **Precondition:** The station list contains two stations. Both fetches throw a network error.
- **Action:** Trigger the fetch-all action.
- **Expected outcome:** `results` is empty. `warnings` contains two entries. `isLoading` is false.

### TC-07: Empty station list — no loading, no results, no warnings

- **Precondition:** The station list is empty.
- **Action:** Trigger the fetch-all action.
- **Expected outcome:** `isLoading` is false (never becomes true or immediately reverts). `results` is empty. `warnings` is empty. No HTTP requests are made.

### TC-08: Station URL is percent-encoded in the fetch request

- **Precondition:** The station list contains one station with a URL containing characters that require encoding (e.g. a query string or special characters).
- **Action:** Trigger the fetch-all action.
- **Expected outcome:** The HTTP request sent to the Netlify function has the station URL percent-encoded in the `?url=` query parameter.

### TC-09: Netlify function returns unexpected response shape — treated as warning

- **Precondition:** The station list contains one station. The fetch returns a response whose JSON does not match either `{ success: true, html }` or `{ success: false, error }`.
- **Action:** Trigger the fetch-all action.
- **Expected outcome:** `warnings` contains one entry for that station. `results` is empty. `isLoading` is false.

### TC-10: Re-triggering clears previous state

- **Precondition:** A previous fetch-all has completed, leaving `results` with two entries and `warnings` empty. The station list now has one station.
- **Action:** Trigger the fetch-all action again.
- **Expected outcome:** `results` and `warnings` are cleared at the start of the new fetch. `isLoading` becomes true. After the new fetch settles, `results` reflects only the new fetch's outcome.

### TC-11: Warning entry contains station name and URL

- **Precondition:** The station list contains one station named "Test Station" with a specific URL. The fetch returns `{ success: false, error: "selector_not_found" }`.
- **Action:** Trigger the fetch-all action.
- **Expected outcome:** The single entry in `warnings` has a `stationName` field equal to "Test Station" and a `url` field equal to the station's URL.

### TC-12: Warning messages rendered in the UI include station name and URL

- **Precondition:** The composable `warnings` list contains one entry with a known station name and URL.
- **Action:** Render the page component that displays warnings.
- **Expected outcome:** The rendered output contains the station name and the station URL in the warning section below the station management table.

### TC-13: No warning messages rendered when warnings list is empty

- **Precondition:** The composable `warnings` list is empty.
- **Action:** Render the page component.
- **Expected outcome:** No warning section is visible in the rendered output.

### TC-14: Singleton — multiple consumers share the same state

- **Precondition:** Two separate consumers call the composable.
- **Action:** Trigger the fetch-all action via one consumer. Observe the other consumer's reactive state.
- **Expected outcome:** Both consumers observe the same `isLoading`, `results`, and `warnings` values simultaneously (singleton guarantee from ADR-002).

### TC-15: Fetch calls are initiated concurrently (not sequentially)

- **Precondition:** The station list contains at least two stations. Each fetch has a controlled delay.
- **Action:** Trigger the fetch-all action.
- **Expected outcome:** All fetch calls are initiated before any of them resolves (i.e. the second fetch starts before the first one completes).

status: ready
