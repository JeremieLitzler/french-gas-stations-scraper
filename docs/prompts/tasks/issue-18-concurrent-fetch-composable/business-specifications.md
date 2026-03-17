# Business Specifications — Issue 18

## Concurrent Station Price Fetching with Loading State and Warnings

### Goal and Scope

The application must fetch fuel price data for all stored stations concurrently when triggered, expose the aggregated results alongside a loading indicator, and surface warnings for any station whose data could not be parsed. This replaces the current single-station fetching behaviour in the price composable.

The scope covers:

- Replacing the single-station reactive state in `src/composables/useStationPrices.ts` with a multi-station model
- Adding warning display in the main page or below the station management UI
- No changes to the Netlify function, IndexedDB storage layer, or HTML parsing utility

### Files to Create or Modify

- `src/composables/useStationPrices.ts` — reworked to expose multi-station reactive state: a list of successful station results, a list of warning entries for stations that failed parsing, a loading flag, and a fetch-completed signal. Fetching all stations concurrently is initiated by a single trigger action.
- `src/components/StationPrices.vue` (**new**) — owns the fetch-related feedback UI: the loading indicator, the success feedback message, and the warnings list. Reads state from the prices composable directly. Placed below the station management UI.
- `src/pages/index.vue` — simplified to include `<StationManager />` and `<StationPrices />` only. All fetch-feedback rendering is delegated to `StationPrices.vue`.
- `src/types/` — if new types are needed for the warning shape or the multi-station result shape, they must be defined here before any composable logic uses them.

### Out of Scope for Issue 18

- Fuel type selection and price table rendering inside `StationPrices.vue` — those features are planned for issue 19. Issue 18 only adds the loading indicator, success message, and warnings list to `StationPrices.vue`.

### Rules and Constraints

1. The composable exposes exactly three reactive pieces of state to consumers: a list of successfully-parsed station data objects, a list of warning objects (each carrying the station name and URL), and a boolean loading flag.
2. All station fetches must be initiated concurrently — none waits for another to complete before starting.
3. The loading flag becomes true at the moment the first fetch is initiated and becomes false only after every fetch has settled (whether successfully or with a failure).
4. A station whose Netlify function response carries `{ success: false, error: "selector_not_found" }` is placed in the warnings list, not the results list. It does not cause the overall fetch to abort.
5. A station whose fetch throws a network error is also treated as a warning (not a fatal error) and is placed in the warnings list.
6. The results list contains only stations that produced at least one fuel price entry.
7. Warning messages rendered in the UI must reference both the station name and the station URL so the user can identify which station failed.
8. The composable follows the singleton pattern (ADR-002): shared reactive state is declared at module level so all consumers share the same reference.
9. The fetch action on the composable accepts the station list as a parameter. The caller component (`StationPrices.vue`) is responsible for calling `useStationStorage()` at the top level of its own `setup()` and passing `stations.value` to the fetch action in `onMounted`. The composable must not call any other composable inside a plain or async function — composables may only be called at the top level of `setup()`.
10. Once all fetches have settled and loading is complete, a success feedback message must be shown to the user in the UI. This message is shown regardless of whether there are warnings — it signals that the scraping run has finished. The message must auto-dismiss after a short delay (similar to the inline save confirmation in the station manager).
11. The composable must never self-trigger data fetching. The caller component (`StationPrices.vue`) is solely responsible for invoking the fetch action in its own `onMounted` hook. The composable only exposes state and actions; it never calls those actions itself.
12. `StationPrices.vue` must render below `StationManager` in a stacked vertical layout. The `index.vue` wrapper must use a `flex-col w-full` container so the two components stack vertically, not side-by-side.

### Example Mapping

#### Rule: All stations succeed

**Example — All success:**

- Given the station list contains three stations, each with a valid prix-carburants.gouv.fr URL
- When the fetch action is triggered
- Then `isLoading` is true during the fetch and false after all three responses settle
- And `results` contains three entries, one per station, each with fuel price data
- And `warnings` is empty

#### Rule: Mixed success and failure

**Example — One station fails parsing:**

- Given the station list contains three stations
- When the fetch action is triggered and one station's Netlify response returns `{ success: false, error: "selector_not_found" }`
- Then `results` contains the two successfully parsed stations
- And `warnings` contains one entry with the failing station's name and URL
- And `isLoading` is false after all three settle

#### Rule: All stations fail

**Example — All fail:**

- Given the station list contains two stations
- When the fetch action is triggered and both Netlify responses return `{ success: false, error: "selector_not_found" }`
- Then `results` is empty
- And `warnings` contains two entries
- And `isLoading` is false

#### Rule: Loading flag transitions

**Example — isLoading transitions:**

- Given the station list is non-empty
- When the fetch action is triggered
- Then `isLoading` is immediately true
- And `isLoading` becomes false only after the last promise settles (not after the first)

#### Rule: Network error treated as warning

**Example — Network failure:**

- Given the station list contains one station
- When the fetch action is triggered and the fetch throws a network error
- Then `warnings` contains one entry for that station
- And `results` is empty
- And `isLoading` is false

#### Rule: Warning display in UI

**Example — Warnings shown below station management UI:**

- Given at least one station produced a warning after fetching
- When the page renders
- Then a warning message is visible below the station management table
- And each warning message includes the station name and station URL

#### Rule: Success feedback message

**Example — All fetches complete, success message shown:**

- Given the station list is non-empty
- When all fetches have settled (regardless of how many warnings there are)
- Then a success feedback message is visible in the UI indicating the scraping run has finished
- And the message automatically disappears after a short delay

**Example — Success message shown even when there are warnings:**

- Given two stations were fetched, one succeeded and one produced a warning
- When loading finishes
- Then both the warning entry and the success feedback message are visible
- And the success message auto-dismisses after a short delay

**Example — Success message not shown before fetch completes:**

- Given a fetch is in progress
- When the page renders mid-fetch
- Then no success feedback message is visible yet

#### Rule: Empty station list

**Example — No stations stored:**

- Given the station list is empty
- When the fetch action is triggered
- Then `isLoading` remains false (or transitions to false immediately)
- And `results` is empty
- And `warnings` is empty

### Edge Cases

- If the station list is empty when the fetch action is called, no HTTP requests are made and the loading flag must not remain true indefinitely. No success feedback message is shown in this case (there was nothing to scrape).
- If the same composable state is consumed by multiple components, all components observe the same `isLoading`, `results`, and `warnings` transitions simultaneously (singleton guarantee).
- Re-triggering the fetch while a previous fetch is still in progress replaces the previous state: `isLoading` is reset to true, previous `results` and `warnings` are cleared, and the new set of concurrent fetches begins. Any visible success message from the previous run must be cleared when re-triggering starts.
- The success feedback message auto-dismisses after a short fixed delay and must not persist indefinitely.

status: ready
