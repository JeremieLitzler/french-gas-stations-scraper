# Business Specifications — Issue 18

## Concurrent Station Price Fetching with Loading State and Warnings

### Goal and Scope

The application must fetch fuel price data for all stored stations concurrently when triggered, expose the aggregated results alongside a loading indicator, and surface warnings for any station whose data could not be parsed. This replaces the current single-station fetching behaviour in the price composable.

The scope covers:

- Replacing the single-station reactive state in `src/composables/useStationPrices.ts` with a multi-station model
- Adding warning display in the main page or below the station management UI
- No changes to the Netlify function, IndexedDB storage layer, or HTML parsing utility

### Files to Create or Modify

- `src/composables/useStationPrices.ts` — reworked to expose multi-station reactive state: a list of successful station results, a list of warning entries for stations that failed parsing, and a loading flag. Fetching all stations concurrently is initiated by a single trigger action.
- `src/pages/index.vue` — displays warning messages below the station management UI when the warnings list is non-empty. Also hosts the loading indicator while fetching is in progress.
- `src/types/` — if new types are needed for the warning shape or the multi-station result shape, they must be defined here before any composable logic uses them.

### Out of Scope for Issue 18

- `src/components/StationPrices.vue` — a new component responsible for rendering fuel prices on fuel type selection. This is planned for issue 19. Issue 18 must not implement or reference it.

### Rules and Constraints

1. The composable exposes exactly three reactive pieces of state to consumers: a list of successfully-parsed station data objects, a list of warning objects (each carrying the station name and URL), and a boolean loading flag.
2. All station fetches must be initiated concurrently — none waits for another to complete before starting.
3. The loading flag becomes true at the moment the first fetch is initiated and becomes false only after every fetch has settled (whether successfully or with a failure).
4. A station whose Netlify function response carries `{ success: false, error: "selector_not_found" }` is placed in the warnings list, not the results list. It does not cause the overall fetch to abort.
5. A station whose fetch throws a network error is also treated as a warning (not a fatal error) and is placed in the warnings list.
6. The results list contains only stations that produced at least one fuel price entry.
7. Warning messages rendered in the UI must reference both the station name and the station URL so the user can identify which station failed.
8. The composable follows the singleton pattern (ADR-002): shared reactive state is declared at module level so all consumers share the same reference.
9. The composable must be callable without arguments (the station list is obtained from the existing station storage composable).

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

#### Rule: Empty station list

**Example — No stations stored:**

- Given the station list is empty
- When the fetch action is triggered
- Then `isLoading` remains false (or transitions to false immediately)
- And `results` is empty
- And `warnings` is empty

### Edge Cases

- If the station list is empty when the fetch action is called, no HTTP requests are made and the loading flag must not remain true indefinitely.
- If the same composable state is consumed by multiple components, all components observe the same `isLoading`, `results`, and `warnings` transitions simultaneously (singleton guarantee).
- Re-triggering the fetch while a previous fetch is still in progress replaces the previous state: `isLoading` is reset to true, previous `results` and `warnings` are cleared, and the new set of concurrent fetches begins.

status: ready
