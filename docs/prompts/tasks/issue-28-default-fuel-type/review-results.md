# Review Results — Issue #28: Default Fuel Type

## Commands Run

### `npm run lint` output
No lint errors in changed files.

### `npm run type-check` output
Type-check passes with zero errors.

## Checklist

- [x] **Security rule 1 — validate stored value before use**: `loadDefaultFuelType` calls `get<unknown>` and passes the result through `isNonEmptyString()` before assigning to reactive state. `validatedDefaultFuelType` further cross-checks against `derivedFuelTypes` before the value drives any UI logic. Two-layer validation is in place.
- [x] **Security rule 2 — no `v-html`**: Absent from the entire component. The `Default` indicator renders a static string literal; no fuel label is ever passed to `v-html`.
- [x] **Security rule 3 — store plain string only**: `saveDefaultFuelType(label: string)` and `updateDefaultFuelType(label: string)` call `set(DEFAULT_FUEL_TYPE_KEY, label)` with the string directly — no structured payload.
- [x] **Security rule 4 — input array not mutated**: `orderFuelTypes` accepts `readonly string[]` and returns `[...fuelTypes]` or `[defaultFuelType, ...remaining]` via spread and `filter`. The input is never written to.
- [x] **Security rule 5 — `del()` not overwrite**: `clearDefaultFuelType` calls `del(DEFAULT_FUEL_TYPE_KEY)` and resets the in-memory ref to `null`. No empty-string or null overwrite.
- [x] **Button visibility matrix — all 3 conditions × 3 buttons**:
  - No default stored: `showSaveDefault = !hasStoredDefault` → visible; `showUpdateDefault` → false (hasStoredDefault false); `showClearDefault = hasStoredDefault` → false. Correct.
  - Default stored, selection = default: `showSaveDefault` → false; `showUpdateDefault` → false (`selectedFuelType === validatedDefaultFuelType`); `showClearDefault` → true. Correct.
  - Default stored, selection ≠ default: `showSaveDefault` → false; `showUpdateDefault` → true; `showClearDefault` → true. Correct.
- [x] **"Default" indicator is separate from buttons**: `<span class="default-indicator">Default</span>` with `v-if="isCurrentDefault"` is a distinct element — not a modifier on any button, not conditioned on `showSaveDefault`.
- [x] **Object Calisthenics**: All functions are small and single-purpose. Composable body exception is documented with a framework-convention rationale comment.
- [x] **No dead code, unused imports, or unreachable branches**: All imports are used. `updateDefaultFuelType` and `saveDefaultFuelType` have identical storage operations but are exposed as distinct named actions — intentional per spec. No unreachable branches.
- [x] **Naming clarity, no abbreviations**: All identifiers are fully spelled out (`validatedDefaultFuelType`, `hasStoredDefault`, `clearDefaultFuelType`, `resolveInitialSelection`, etc.).
- [x] **No destructuring reactivity loss**: `defaultFuelType` ref is returned as-is from the composable and accessed via `.value` everywhere — reactivity is preserved.
- [x] **Watch targets correct**: `watch(derivedFuelTypes, ...)` targets a `ComputedRef<string[]>` directly, which is valid in Vue 3. Watching `derivedFuelTypes` (not `availableFuelTypes`) correctly limits re-seeding to when the set of available types changes, not on every save/update/clear (documented in technical spec).
- [x] **No `any`/`unknown` without narrowing**: `get<unknown>` result is narrowed by `isNonEmptyString()` before assignment. No other unguarded `unknown` usage.
- [x] **No non-null assertions without null check**: The single `as Station` assertion (line 224) is guarded by the `oldByUrl.has(url)` check on line 219.
- [x] **Explicit return types on exported functions**: All exported functions in `fuelTypeUtils.ts`, `indexedDb.ts`, and `useDefaultFuelType.ts` carry explicit return type annotations (`string[]`, `Promise<void>`, `Promise<T | undefined>`, etc.).
- [x] **Side effects cleaned up with `onUnmounted`**: The dismiss timer is cleared in `onUnmounted(() => { clearDismissTimer() })`. The composable registers no lifecycle hooks, so no composable-level cleanup is needed.
- [x] **`async setup` + `<Suspense>`**: `StationPricesContent.vue` uses top-level awaits; its parent `StationPrices.vue` wraps it in `<Suspense>` with an `AppLoader` fallback.
- [x] **`hasStoredDefault` uses raw `defaultFuelType.value`**: Correctly bases button visibility on the raw ref, not `validatedDefaultFuelType`, so "Clear default" remains visible when the stored default is temporarily absent from the derived list (TC-15).
- [x] **`loadDefaultFuelType` ordered before `loadAllStationPrices`**: Ensures `defaultFuelType` is populated before `derivedFuelTypes` first emits, preventing a spurious fallback to first-item selection.
- [x] **Singleton pattern (ADR-002)**: Module-level `Ref<string | null>` is declared outside the composable function body; all consumers share the same reactive instance.
- [x] **Keyboard accessibility**: All three action buttons are standard `<button type="button">` elements — natively keyboard accessible.
- [x] **No new external dependency** introduced.
- [x] **CSS comments present**: All new rule sets (`.default-fuel-actions`, `.default-indicator`, `.default-fuel-button`) include a comment explaining why Tailwind arbitrary-value syntax for design tokens is avoided.

status: approved
