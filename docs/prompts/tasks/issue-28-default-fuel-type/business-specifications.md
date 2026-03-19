# Business Specifications — Issue #28: Default Fuel Type

## Goal and Scope

Allow the user to designate one fuel type as their personal default. The default is persisted to IndexedDB (ADR-008) so it survives page reloads. When the price view loads, it selects the default fuel type automatically instead of the first type in the derived list. The user can update the default at any time by selecting a different fuel type and triggering an explicit "Save as default" action; they can also clear it.

## Stories

### Story 1 — Save a default fuel type

**Rule:** When the user clicks "Save as default" on the currently selected fuel type, that type is stored in IndexedDB under a dedicated key.

**Rule:** The action is only available after at least one fuel type is selected (i.e. the price table is visible).

**Rule:** After saving, the UI reflects that this type is the current default (e.g. a visual indicator on the button).

### Story 2 — Load and apply the default on startup

**Rule:** When the price view initialises and a default is stored, the selected fuel type is set to the stored default instead of the first available type.

**Rule:** If the stored default fuel type is not present in the derived list (e.g. the station list changed), the selection falls back to the current first-available logic and the stored default is left unchanged.

**Rule:** If no default is stored, behaviour is unchanged — the first derived fuel type is selected.

### Story 3 — Update the default

**Rule:** An "Update default" action is visible only when a default already exists AND the currently selected fuel type is different from the stored default.

**Example:** Default is "SP95", user selects "Gasoil" → "Update default" appears. User clicks it → default becomes "Gasoil".

### Story 4 — Ordered fuel type list

**Rule:** The fuel type list is reordered so the default type always appears first, followed by the remaining types in their existing first-encountered order.

**Rule:** If no default exists, the order is unchanged.

## Files to Create or Modify

- `src/utils/indexedDb.ts` — no change needed; existing `get`/`set` API is sufficient.
- `src/composables/useDefaultFuelType.ts` — **new** singleton composable; owns the default fuel type reactive state and its IndexedDB persistence. Follows ADR-002 singleton pattern and ADR-008 storage approach.
- `src/utils/fuelTypeUtils.ts` — add a pure function that, given the derived list and an optional default, returns the reordered list (default first, rest unchanged).
- `src/components/StationPricesContent.vue` — integrate the new composable; render the save/update action; pass the default to the ordering function.
- `src/utils/fuelTypeUtils.spec.ts` — extend with tests for the new ordering function.
- `src/composables/useDefaultFuelType.spec.ts` — **new** test file for the composable.

## Constraints

- No new external dependency.
- The default is stored as a plain string (the fuel type label) under a new IndexedDB key distinct from the stations key.
- All reads/writes to IndexedDB are async; the UI must not block while persisting.
- The save/update action must be keyboard accessible (a standard `<button>` element).

status: ready
