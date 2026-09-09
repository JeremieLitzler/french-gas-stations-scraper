# Feature 6 — Displaying the favorite station fuel prices

## Purpose

Once every favorite station has been scraped, shows a two-column price table for the selected fuel type, sorted cheapest first, with a dash for stations that do not carry that type.

## Implementing code

- `src/components/StationPrices.vue` — the parent: loader and warnings first, then the selector and table once loading is complete and `results` are non-empty.
- `src/components/StationPricesContent.vue` — the fuel-type selector (a button list) and the price table; holds `selectedFuelType` as local state.
- `src/utils/fuelTypeUtils.ts` — the pure functions that derive the available types and map/sort the stations into price rows for a selected type.
- `src/composables/useStationPrices.ts` — source of `results` and `isLoading`.
- `src/components/ui/table/`, `src/components/AppLoader.vue`.
- `src/types/price-row.ts`.

## Behaviour & rules

**Gating.** While `isLoading` is true, `AppLoader` is shown and neither the selector nor the table renders. After loading, if `results` is empty (every station failed), only the warnings list is shown — no selector, no table.

**Selector.** A flat list of `<button>` elements — never a `<select>`. It defaults to the first available type on load, applying the same stored-default handling as Feature 4. Clicking a type updates the table immediately and marks that button active. The selection is local to `StationPricesContent.vue` — not persisted, not shared.

**Table.** Two columns: Station Name and Price. Rows are sorted ascending by price for the selected type. A station that does not carry the selected type — or carries it with a `null` price — shows a dash (`—`) and sorts to the bottom, keeping its relative order among the other dash rows. It is never hidden.

**No re-fetch on type change.** Switching fuel type only re-filters and re-sorts the already-loaded results. If `results` themselves change (e.g. a manual refresh), the selected type resets to the first available from the new results.

## Related ADRs

- [ADR-013](../../decisions/ADR-013-page-level-load-orchestrator.md) — the load orchestrator decides what renders and when.
- [ADR-009](../../decisions/ADR-009-cross-composable-reactivity-pattern.md) — the table reacts to station-list changes.
- [ADR-002](../../decisions/adr-002-state-management.md) — singleton composable for shared state.

## See also

- **Feature 3** produces the price data.
- **Feature 4** owns the derived fuel-type list and the shared default-selection rule.
- **Feature 5** reconciles station-list changes into the table.

_Source specs (in git history): `issue-19` (see also `issue-18` for the parent component)._
