# Technical Specifications — Issue #28: Default Fuel Type

## Files Created or Changed

### `src/utils/indexedDb.ts` — unchanged
No modifications required. The `del(key)` helper already exists and is exported; `clearDefaultFuelType` imports it directly.

### `src/utils/fuelTypeUtils.ts` — modified
Added the `orderFuelTypes(fuelTypes, defaultFuelType)` pure function. Returns a new array with the default fuel type moved to index 0 when it is present in the list; otherwise returns an unchanged copy. The input array is never mutated (security-guidelines.md rule 4). Handles `null`, `undefined`, and absent-default cases identically (return unchanged copy).

### `src/composables/useDefaultFuelType.ts` — created / updated
Singleton composable following ADR-002. Declares a module-level `Ref<string | null>` so all consumers share reactive state. Exposes:
- `defaultFuelType` — reactive reference to the stored label (or `null`)
- `loadDefaultFuelType()` — reads from IndexedDB; rejects non-string and empty-string values before assigning to state (security-guidelines.md rule 1)
- `saveDefaultFuelType(label)` — writes a plain string to IndexedDB under `"defaultFuelType"` key (security-guidelines.md rule 3); used when no default exists
- `updateDefaultFuelType(label)` — same storage operation as save; semantically distinct action exposed for "Update default" button
- `clearDefaultFuelType()` — calls `del(DEFAULT_FUEL_TYPE_KEY)` to remove the key entirely; resets `defaultFuelType.value` to `null` (security-guidelines.md rule 5; never overwrites with empty/null)

### `src/components/StationPricesContent.vue` — modified

#### Computed properties added/updated

| Name | Type | Description |
|---|---|---|
| `derivedFuelTypes` | `string[]` | Raw derived list from results |
| `validatedDefaultFuelType` | `string \| null` | Cross-checks `defaultFuelType.value` against `derivedFuelTypes`; returns `null` when absent (security rule 1; TC-15 — stored value never cleared) |
| `availableFuelTypes` | `string[]` | `orderFuelTypes(derivedFuelTypes, validatedDefaultFuelType)` |
| `hasStoredDefault` | `boolean` | `defaultFuelType.value !== null` — source of truth for whether a default is stored |
| `isCurrentDefault` | `boolean` | `validatedDefaultFuelType !== null && selectedFuelType === validatedDefaultFuelType` |
| `showSaveDefault` | `boolean` | `!hasStoredDefault` — visible only when no default is stored |
| `showUpdateDefault` | `boolean` | `hasStoredDefault && selectedFuelType !== '' && selectedFuelType !== validatedDefaultFuelType` |
| `showClearDefault` | `boolean` | `hasStoredDefault` — visible whenever a default is stored |

#### Button visibility matrix

| Condition | "Save as default" | "Update default" | "Clear default" |
|---|---|---|---|
| No default stored | visible | hidden | hidden |
| Default stored, selection = default | hidden | hidden | visible |
| Default stored, selection ≠ default | hidden | visible | visible |

#### "Default" indicator
- Element: `<span class="default-indicator">Default</span>`
- Rendered when: `isCurrentDefault === true`
- **Separate from all three action buttons** — the indicator is not a state on the "Save as default" button, which is hidden whenever a default exists (business-specifications.md, Active State section)
- Rendered via `{{ }}` text interpolation — `v-html` is not used (security rule 2)

#### Event handlers

| Handler | Action |
|---|---|
| `onSaveDefault()` | Guards `selectedFuelType !== ''`; calls `saveDefaultFuelType(selectedFuelType)` |
| `onUpdateDefault()` | Guards `selectedFuelType !== ''`; calls `updateDefaultFuelType(selectedFuelType)` |
| `onClearDefault()` | Calls `clearDefaultFuelType()` |

#### Button styling
All three buttons use a single `.default-fuel-button` class applying the spec-mandated tokens:
- `background-color: var(--color-stone-200)` (maps to `--accent`)
- `color: var(--color-stone-800)` (maps to `--accent-foreground`)

The `.default-fuel-button--saved` modifier and the `isCurrentDefault`-based button label toggle from the previous pass are removed. The "Default" state is represented by the separate `.default-indicator` element only.

Custom CSS (not Tailwind arbitrary values) is used to keep design-token references centralised in the scoped `<style>` block (CLAUDE.md styling rule).

## Technical Choice Explanations

### Watch `derivedFuelTypes` instead of `availableFuelTypes` for selection seeding
`availableFuelTypes` recomputes whenever `defaultFuelType` changes (because it applies `orderFuelTypes`). Targeting `availableFuelTypes` in the watch would fire on every save/update/clear, re-seeding `selectedFuelType` unexpectedly. Watching `derivedFuelTypes` limits re-seeding to when the actual set of available fuel types changes.

### `hasStoredDefault` based on `defaultFuelType.value`, not `validatedDefaultFuelType`
`validatedDefaultFuelType` returns `null` when the stored default is absent from the current derived list (TC-15). If button visibility were derived from it, "Clear default" would disappear when the user's default fuel type becomes temporarily unavailable — even though the key still exists in IndexedDB. Using the raw `defaultFuelType.value` for `hasStoredDefault` keeps the clear action available whenever something is actually stored.

### `loadDefaultFuelType` called before `loadAllStationPrices`
The default must be in reactive state before `derivedFuelTypes` first emits a non-empty value. Loading it after would cause the `watch(derivedFuelTypes)` callback to fire with `null` and fall back to first-item selection.

## Self-Code Review

### Potential issue 1: Startup race between `loadDefaultFuelType` and the `watch(derivedFuelTypes)` trigger
No race exists. The ordering of awaits (`loadDefaultFuelType` before `loadAllStationPrices`) ensures `defaultFuelType` is populated before `derivedFuelTypes` first emits a non-empty value.

### Potential issue 2: `orderFuelTypes` allocates a new array on every computed evaluation
Acceptable for typical fuel type list sizes (5–10 items). No change needed.

### Potential issue 3: `clearDefaultFuelType` does not reset `selectedFuelType`
After clearing, `selectedFuelType` retains its current value. The fuel type list reverts to natural order (via `orderFuelTypes` returning an unchanged copy when `defaultFuelType.value` is `null`), but the selection itself is not forced to change. This matches TC-29 — only the list order reverts; the current selection is user-controlled.

status: ready
