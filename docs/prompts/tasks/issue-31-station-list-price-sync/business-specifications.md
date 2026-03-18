# Business Specifications — Issue #31: Station List → Price Table Reactivity

## Goal and Scope

When the user modifies, removes, or adds a station in the Station List, the Price Table must
update automatically without requiring a full page reload. The fuel type selector must also
reflect the updated set of fuel types available across the new station list.

## Rules

### R1 — Station removal removes its prices

When a station is deleted from the Station List, all price rows for that station are removed
from the Price Table immediately.

### R2 — Station URL change re-fetches prices

When an existing station's URL is changed and saved, the price entry for the old URL is removed
and a new fetch is triggered for the updated station. If the new URL is invalid or the fetch
fails, the station appears in the warnings list instead.

### R3 — Station name change updates the price row label

When only a station's name is changed (URL unchanged), the corresponding price row label in the
Price Table is updated to reflect the new name. No re-fetch is performed.

### R4 — Station addition triggers a price fetch

When a new station is added, a price fetch is initiated for that station. On success the new
price row appears in the Price Table. On failure the station appears in the warnings list.

### R5 — Fuel type list stays consistent with current results

After any station change, the list of available fuel types is re-derived from the updated set
of results. Fuel types that no longer appear in any result are removed from the selector.

### R6 — Selected fuel type is preserved unless it disappears

The currently selected fuel type remains selected after a station change, UNLESS that fuel type
no longer exists in the updated fuel type list. In that case, the selection resets to the first
available fuel type (or empty if no results remain).

### R7 — Loading indicator during re-fetch

While a re-fetch is in progress following a station add or URL change, the loading state is
active. All other Price Table interactions are still accessible (the existing rows remain
visible during the fetch).

## Files to Create or Modify

- `src/composables/useStationPrices.ts` — expose incremental update operations (add, remove,
  re-fetch by URL) alongside the existing full-load operation; manages price results reactively
- `src/components/StationPricesContent.vue` — observe station list changes from `useStationStorage`
  and delegate to `useStationPrices` accordingly

## Observable Outcomes

- Deleting a station row: the matching price row disappears without a page reload.
- Changing a station URL: the old price row disappears; a loading indicator appears; the new
  price row appears on success (or a warning on failure).
- Changing only a station name: the price row label updates in place, no loading indicator.
- Adding a station: a loading indicator appears; the new price row appears on success (or warning
  on failure).
- Fuel type selector reflects only fuel types present in current fetched results.
- Selected fuel type survives station changes unless it is no longer available.

## Architectural Pattern

The cross-composable reactivity integration follows the Imperative pattern documented in
ADR-009. `StationPricesContent.vue` watches `useStationStorage`'s station list and explicitly
calls `useStationPrices` operations (add, remove, update). Composables remain decoupled.

status: ready
