# Business Specifications — Issue 19

## Fuel-Type Selector and Price Table

### Goal and Scope

The application must allow the user to select a fuel type from those available across all scraped stations and display a price table for that fuel type. The price table lists every station, sorted from cheapest to most expensive, with a dash for stations that do not carry the selected fuel type.

This feature builds on the concurrent fetch composable delivered in issue 18. The `StationPrices.vue` component, which already renders loading feedback and warnings, is extended to also show the fuel-type selector and price table once loading is complete.

The scope covers:

- Adding a fuel-type derivation utility or computed value that derives the list of available fuel types from `useStationPrices` results
- Adding a fuel-type selector (`<button>` list) to `StationPrices.vue` that defaults to the first available type and reacts to user clicks
- Adding a price table to `StationPrices.vue` that shows all stations sorted ascending by price for the selected fuel type, with a dash for stations that do not carry that type
- Unit tests for fuel type derivation, sort order, stations missing a fuel type, and selector change triggering re-render

The scope does not include:

- Changes to the Netlify function, IndexedDB storage, HTML parsing, or the concurrent fetch logic in `useStationPrices.ts`
- Changes to `index.vue`, `StationManager.vue`, or any other component not listed here
- Pagination, filtering beyond fuel type, or any other UI enhancement

### Files to Create or Modify

- `src/components/StationPrices.vue` — extended to render the fuel-type selector and price table below the existing loading/warning feedback, once fetching is complete and results are non-empty
- `src/utils/fuelTypeUtils.ts` (**new**) — pure utility functions for deriving available fuel types from `StationData[]` and for sorting/mapping stations for a given fuel type. No Vue dependencies.
- `src/types/` — if new types are needed to represent a price row (station name + resolved price for a selected fuel type), they must be defined here before any component or utility logic uses them.

### Rules and Constraints

1. Available fuel types are derived exclusively from the `results` in `useStationPrices` — only types present in at least one station's fuel list appear in the selector.
2. The selector is a flat list of `<button>` elements — no `<select>` element.
3. On load (when results first become available), the selector defaults to the first fuel type in the derived list.
4. When the user clicks a different fuel type button, the price table updates immediately.
5. The price table has two columns: Station Name and Price.
6. Rows are sorted ascending by price for the selected fuel type. Stations that carry the type are sorted by price; stations that do not carry the type appear at the end of the table.
7. A station that does not carry the selected fuel type renders a dash (`—`) in its price cell. It is never hidden from the table.
8. While `isLoading` is true, the `AppLoader` component is shown instead of the table and selector. The selector and table must not be visible during loading.
9. If `results` is empty after loading completes (all stations failed), no selector or table is shown — only the warnings list.
10. The selected fuel type is local state in `StationPrices.vue` — it does not need to be persisted or shared with any other component.
11. Pure derivation logic (fuel type list, row mapping, sort) lives in a utility file outside `StationPrices.vue` so it can be independently unit-tested.
12. No new composable is introduced for this feature. The selected fuel type is a plain `ref` inside `StationPrices.vue`.

### Example Mapping

#### Rule: Fuel type derivation

**Example — Derive from mixed results:**

- Given two stations: one offers SP95 and Gasoil, the other offers SP95 and E85
- When available fuel types are derived
- Then the list is `[SP95, Gasoil, E85]` (in first-encountered order, deduplicated)
- And types with null prices are still included if the type key exists in any station's fuel list

**Example — Empty results:**

- Given `results` is empty
- When available fuel types are derived
- Then the list is empty

**Example — All stations carry the same types:**

- Given three stations each carrying SP95 and SP98
- When available fuel types are derived
- Then the list contains SP95 and SP98 exactly once each

#### Rule: Sort order

**Example — Ascending sort for selected type:**

- Given three stations: Station A (SP95 = 1.89), Station B (SP95 = 1.75), Station C (SP95 = 1.95)
- When the user selects SP95
- Then the table rows appear in order: Station B, Station A, Station C

**Example — Station missing the selected type sorts to the bottom:**

- Given three stations: Station A (SP95 = 1.89), Station B (no SP95), Station C (SP95 = 1.75)
- When the user selects SP95
- Then the table rows appear in order: Station C (1.75), Station A (1.89), Station B (—)

**Example — Multiple stations missing the type retain relative order at the bottom:**

- Given Station A (SP95 = 1.80), Station B (no SP95), Station C (no SP95)
- When the user selects SP95
- Then Station A appears first, followed by Station B and Station C in any order (both show —)

#### Rule: Selector change triggers re-render

**Example — User selects a different fuel type:**

- Given the selector shows SP95 as the active type and the table shows SP95 prices
- When the user clicks the Gasoil button
- Then the table immediately re-renders with Gasoil prices and sort order
- And the Gasoil button is visually marked as active

#### Rule: Stations missing the selected fuel type

**Example — Station shows dash for missing type:**

- Given Station A carries SP95 but not E85
- When the user selects E85
- Then Station A's price cell displays a dash
- And Station A remains visible in the table

#### Rule: Loading state

**Example — Loader shown during fetch:**

- Given `isLoading` is true
- When the component renders
- Then `AppLoader` is visible and the selector and table are not rendered

**Example — Selector and table shown after loading:**

- Given loading has completed and `results` is non-empty
- When the component renders
- Then the selector and table are visible and `AppLoader` is not rendered

#### Rule: Empty results after loading

**Example — No stations succeeded:**

- Given loading has completed and `results` is empty
- When the component renders
- Then neither the selector nor the table is shown

### Edge Cases

- A fuel type that appears in the station's fuel list but has a `null` price is still included in the available fuel types list. Its price cell renders as a dash in the table (treated the same as a missing type for display purposes).
- If all stations produce null prices for the selected type, the sort order may be arbitrary but the table must still render.
- Changing the selected fuel type does not trigger a new fetch — it only re-filters and re-sorts the already-loaded results.
- If results change (e.g. user manually re-triggers a fetch in the future), the selected fuel type resets to the first available type from the new results.

status: ready
