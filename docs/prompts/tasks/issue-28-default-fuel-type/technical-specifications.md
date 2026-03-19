# Technical Specifications — Issue #28: Default Fuel Type

## Files Created or Changed

### `src/utils/fuelTypeUtils.ts` — modified
Added the `orderFuelTypes(fuelTypes, defaultFuelType)` pure function. Returns a new array with the default fuel type moved to index 0 when it is present in the list; otherwise returns an unchanged copy. The input array is never mutated (security-guidelines.md rule 4). Handles `null`, `undefined`, and absent-default cases identically (return unchanged copy).

### `src/composables/useDefaultFuelType.ts` — created
New singleton composable following ADR-002. Declares a module-level `Ref<string | null>` so all consumers share reactive state. Exposes:
- `defaultFuelType` — reactive reference to the stored label (or `null`)
- `loadDefaultFuelType()` — reads from IndexedDB; rejects non-string and empty-string values before assigning to state (security-guidelines.md rule 1)
- `saveDefaultFuelType(label)` — writes a plain string to IndexedDB under a dedicated key `"defaultFuelType"`, distinct from the `"stations"` key (security-guidelines.md rule 3)

### `src/components/StationPricesContent.vue` — modified
- Imports `useDefaultFuelType` and `orderFuelTypes`.
- Adds `derivedFuelTypes` computed (raw derived list from results).
- Adds `validatedDefaultFuelType` computed: cross-checks `defaultFuelType.value` against `derivedFuelTypes.value` and returns `null` when the stored value is absent from the live list (security-guidelines.md rule 1). The persisted value in IndexedDB is never cleared — only the component-level view of it is nulled (TC-11).
- Replaces the former `availableFuelTypes` computed with one that applies `orderFuelTypes(derivedFuelTypes, validatedDefaultFuelType)` so the list is reactively reordered whenever the validated default changes.
- Changes the `watch` target from `availableFuelTypes` to `derivedFuelTypes` to avoid spurious re-seeding of `selectedFuelType` on default changes; uses `resolveInitialSelection` to prefer the validated default over the first item when applicable (TC-09, TC-11).
- `resolveInitialSelection` uses `validatedDefaultFuelType` (not raw `defaultFuelType`) ensuring a stored value absent from the live list is never selected.
- Adds `isCurrentDefault` computed (boolean): true when `validatedDefaultFuelType` is non-null and equals `selectedFuelType` — drives the "Default saved" active state on the save button.
- Adds `showUpdateDefault` computed (boolean): true when `validatedDefaultFuelType` is non-null and the selection differs — controls the "Update default" button.
- Adds `onSaveDefault()` async function: guard against empty selection, then calls `saveDefaultFuelType`.
- Adds "Save as default" `<button>` and conditional "Update default" `<button>` inside `v-if="availableFuelTypes.length > 0"` — both are plain `<button>` elements for keyboard accessibility (TC-19, TC-20).
- All label rendering uses `{{ }}` text interpolation — `v-html` is not used (security-guidelines.md rule 2).
- Awaits `loadDefaultFuelType()` between `loadStations()` and `loadAllStationPrices()` so the default is known before the derived list is built.
- All three new custom CSS rule sets (`.default-fuel-actions`, `.default-fuel-button`, `.default-fuel-button--saved`) include an explanatory comment in `<style scoped>` stating why Tailwind arbitrary values were not used (CLAUDE.md styling rule).

## Technical Choice Explanations

### Watch `derivedFuelTypes` instead of `availableFuelTypes` for selection seeding
`availableFuelTypes` is recomputed whenever `defaultFuelType` changes (because it applies `orderFuelTypes`). If the watch targeted `availableFuelTypes`, saving a new default would trigger the watcher, which would re-evaluate `resolveInitialSelection` and potentially reset `selectedFuelType` to the new default even when the user had explicitly picked a different type. Watching `derivedFuelTypes` instead means selection is only re-seeded when the actual set of available fuel types changes (stations added/removed), not when ordering changes.

### `defaultIndex <= 0` guard in `orderFuelTypes`
Handles both "not found" (`indexOf` returns `-1`) and "already first" (`indexOf` returns `0`) in a single condition, avoiding a second branch. When index is 0, returning a copy without reordering is both correct and avoids an unnecessary `filter` pass.

### `loadDefaultFuelType` called before `loadAllStationPrices`
The default must be in reactive state before `derivedFuelTypes` first emits a non-empty value. If it were loaded after, the `watch(derivedFuelTypes)` callback would fire with an empty `defaultFuelType.value` and fall back to first-item selection, requiring additional logic to correct afterward.

### "Save as default" button always visible when fuel types are shown
The spec (Story 1, TC-14) makes "Save as default" the baseline action available whenever a fuel type is selected. "Update default" is an additional contextual action. Hiding "Save as default" when a default already matches would require the user to know they need "Update default" — keeping "Save as default" visible as the primary CTA with a visual active state is simpler and aligns with TC-06/TC-13 expectations.

## Self-Code Review

### Potential issue 1: Startup race between `loadDefaultFuelType` and the `watch(derivedFuelTypes)` trigger
If `loadAllStationPrices` returns synchronously (e.g. empty station list), `derivedFuelTypes` stays empty and the watch never fires — no selection is made. This is correct behaviour (table stays hidden). If prices resolve asynchronously, `defaultFuelType` is already loaded by the time the watch fires. `validatedDefaultFuelType` returns `null` when `derivedFuelTypes` is still empty, which is correct — when the watch fires after prices load, `validatedDefaultFuelType` recomputes against the populated list and `resolveInitialSelection` picks the stored default if present. No race exists.

**Resolution:** The ordering of awaits (`loadDefaultFuelType` before `loadAllStationPrices`) is the fix. No further change needed.

### Potential issue 2: `showUpdateDefault` and "Save as default" both visible simultaneously
When a default exists and the selection differs, both "Save as default" and "Update default" render at the same time. Both call the same `onSaveDefault()` handler. This is intentional per the spec but could confuse users. A cleaner UX would hide "Save as default" when "Update default" is shown — however the spec explicitly states TC-14 ("only Save as default") implying "Save as default" is always present. The current implementation follows the spec exactly.

**Resolution:** No change; spec-compliant. A follow-up UX improvement could be tracked separately.

### Potential issue 3: `orderFuelTypes` allocates a new array on every computed evaluation
Every time `defaultFuelType` or `derivedFuelTypes` changes, `availableFuelTypes` recomputes and `orderFuelTypes` returns a fresh array. For typical fuel type lists (5–10 items), this is negligible. If the list were large, memoisation could help, but that would conflict with the no-external-dependency constraint.

**Resolution:** Acceptable for the expected data size. No change needed.

status: ready
