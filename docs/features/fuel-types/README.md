# Feature 4 — List of fuel types

## Purpose

Derives the set of fuel types actually offered across the scraped stations, lets the user pick one as a persisted default, and auto-selects that default once scraping finishes. It also validates a `fuelTypeDefault` coming in from an import or a GitHub sync against the derived set.

## Implementing code

- `src/composables/useDefaultFuelType.ts` — singleton; owns the default fuel type state and its IndexedDB persistence; `saveDefault`, `updateDefault`, `clearDefault`, `isCurrentDefault`.
- `src/composables/useKnownFuelTypes.ts` — reactive list of known fuel-type strings, derived (via `deriveFuelTypes`) from `useStationPrices` results; performs no network calls itself.
- `src/utils/fuelTypeUtils.ts` — `deriveFuelTypes` (first-encountered order, deduplicated) and the pure "reorder with default first" function.
- `src/components/StationPricesContent.vue` — renders the selector, the save/update/clear actions per the visibility matrix, and the "Default" indicator; wires the composable and the ordering function.
- `src/utils/indexedDb.ts` — the `remove` helper used to clear the stored key.

## Behaviour & rules

**Derivation.** Fuel types come exclusively from `useStationPrices` `results` — only types present in at least one station's fuel list, in first-encountered order, deduplicated. A type whose price is `null` is still included.

**Default selection on load.** When results first arrive: if a default is stored and present in the derived list, select it. If none is stored, select the first derived type. If a default is stored but absent from the list (the station set changed), fall back to first-available and leave the stored default untouched. Feature 6 applies the same rule.

**Button visibility matrix.**

- No default stored: "Save as default" visible; "Update default" and "Clear default" hidden.
- Default stored, current selection equals the default: "Clear default" visible; the other two hidden.
- Default stored, current selection differs from the default: "Update default" and "Clear default" visible; "Save as default" hidden.

**Actions.** "Save as default" / "Update default" store the current selection under a dedicated IndexedDB key. "Clear default" removes the key entirely — not an empty string, not `"null"`. After clearing, the list returns to natural first-encountered order and "Save as default" reappears.

**Ordered list.** When a default exists it is moved to the front and the rest keep first-encountered order; with no default the order is unchanged.

**"Default" indicator.** Shown near the selector or on the selected row when `isCurrentDefault` is true. It is not the "Save as default" button (which is hidden whenever a default exists).

**Import-time validation** (invoked from Feature 9's import and the Feature 2 sync). After a preferences file passes shape validation, `fuelTypeDefault` is checked against the fuel types offered by the merged station list (imported stations + IndexedDB stations), fetching only URLs not already fetched. A `null` value skips the check. If the value matches no offered type it is discarded, the stored IndexedDB value is kept unchanged, and a non-blocking French warning is shown while the rest of the diff proceeds normally. The `FuelType` enum was removed — fuel types are plain `string` with runtime validation everywhere.

## Related ADRs

- [ADR-008](../../decisions/ADR-008-client-side-storage.md) — the default is persisted to IndexedDB.
- [ADR-013](../../decisions/ADR-013-page-level-load-orchestrator.md) — selection is resolved by the load orchestrator once results are in.
- [ADR-002](../../decisions/adr-002-state-management.md) — singleton composable for shared state.

## See also

- **Feature 3** produces the `results` the list is derived from.
- **Feature 6** renders the table and applies the same default-selection rule.
- **Feature 9** triggers the `fuelTypeDefault` validation on import.
- **Feature 2** carries the default fuel type as part of the preferences payload.

_Source specs (in git history): `issue-19`, `issue-28`, `issue-66`._
