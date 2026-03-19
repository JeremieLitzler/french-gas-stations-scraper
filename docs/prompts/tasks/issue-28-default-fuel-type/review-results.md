# Review Results — Issue #28: Default Fuel Type

## Commands Run

- `npm run lint` output

None of the changed files produced lint errors.

### `npm run type-check` output

Type-check passes with zero errors.

## Checklist

- [x] **Security rule 1 — validate stored value before use**: `loadDefaultFuelType` in `useDefaultFuelType.ts` uses `isNonEmptyString` to reject non-string and empty-string values from IndexedDB. The component's `validatedDefaultFuelType` computed cross-checks the accepted string against `derivedFuelTypes` before treating it as valid — returning `null` when absent from the live list. Two-layer validation is in place.
- [x] **Security rule 2 — no `v-html`**: All fuel type label rendering uses `{{ }}` text interpolation throughout `StationPricesContent.vue`. No `v-html` usage in any changed file.
- [x] **Security rule 3 — plain string storage only**: `saveDefaultFuelType(label: string)` passes the label directly to `set(DEFAULT_FUEL_TYPE_KEY, label)`. No object serialisation.
- [x] **Security rule 4 — input array not mutated**: `orderFuelTypes` accepts `readonly string[]`, returns `[...fuelTypes]` or `[defaultFuelType, ...remaining]` via spread and `filter`. The input is never mutated.
- [x] **Object Calisthenics**: All functions are small and single-purpose. The composable body exception is documented inline with a framework-convention rationale.
- [x] **Business spec — Story 1 (save default)**: "Save as default" button is inside `v-if="availableFuelTypes.length > 0"`, calls `onSaveDefault()` which guards against empty selection, and applies the `default-fuel-button--saved` modifier class via `isCurrentDefault`.
- [x] **Business spec — Story 2 (load and apply on startup)**: `loadDefaultFuelType()` is awaited before `loadAllStationPrices`; `resolveInitialSelection` uses `validatedDefaultFuelType` to prefer the stored default over the first available item.
- [x] **Business spec — Story 2 fallback (stored default absent from derived list)**: `validatedDefaultFuelType` returns `null` when the stored value is not in `derivedFuelTypes`; `resolveInitialSelection` falls back to `fuelTypes[0]`. The persisted IndexedDB value is left intact (TC-11).
- [x] **Business spec — Story 3 (update default)**: `showUpdateDefault` is `true` only when a validated default exists and the current selection differs. "Update default" button is rendered conditionally and calls `onSaveDefault()`.
- [x] **Business spec — Story 4 (ordered list)**: `availableFuelTypes` computed applies `orderFuelTypes(derivedFuelTypes.value, validatedDefaultFuelType.value)` reactively.
- [x] **Keyboard accessibility**: Both "Save as default" and "Update default" are `<button type="button">` elements.
- [x] **No new external dependency** introduced.
- [x] **Watch target is `derivedFuelTypes` not `availableFuelTypes`**: Prevents spurious re-seeding of `selectedFuelType` when only ordering changes (TC-09 / TC-11).
- [x] **`isCurrentDefault` computed**: Uses `validatedDefaultFuelType.value` (not raw `defaultFuelType.value`) — false when no default is set or when the stored default is absent from the live list.
- [x] **`showUpdateDefault` computed**: Guards on `selectedFuelType.value !== ''` in addition to the default/selection mismatch check — prevents the button showing when no fuel type is selected.
- [x] **Singleton composable pattern (ADR-002)**: Module-level `Ref<string | null>` declared outside the function body; all consumers share the same reactive reference.
- [x] **IndexedDB key distinct from stations key**: Key is `"defaultFuelType"`, separate from `"stations"`.
- [x] **No dead code or unused imports**: All imported symbols are used. No unreachable branches.
- [x] **No `any` / `unknown` without narrowing**: `get<unknown>` result is narrowed by `isNonEmptyString` before assignment.
- [x] **No unguarded non-null assertions**: `oldByUrl.get(url) as Station` at line 189 is preceded by a passing `oldByUrl.has(url)` check — the assertion is safe.
- [x] **All exported functions have explicit return types**: `deriveFuelTypes`, `resolvePrice`, `buildPriceRows`, `orderFuelTypes` all carry explicit return types. Composable functions `loadDefaultFuelType` and `saveDefaultFuelType` are typed `Promise<void>`.
- [x] **Composable prefixed with `use`**: `useDefaultFuelType`. Correct.
- [x] **No reactive arg accepted by composable** — `toValue()`/`toRef()` not applicable.
- [x] **Side effect cleanup**: `useDefaultFuelType` registers no timers or listeners. The `dismissTimer` side effect in `StationPricesContent.vue` is cleaned up in `onUnmounted`.
- [x] **Styling — CSS comments present**: All three new rule sets (`.default-fuel-actions`, `.default-fuel-button`, `.default-fuel-button--saved`) include an explanatory comment stating why Tailwind arbitrary values for design tokens are avoided.
- [x] **Naming clarity**: All identifiers are unambiguous and consistent with project conventions (`validatedDefaultFuelType`, `derivedFuelTypes`, `resolveInitialSelection`, `onSaveDefault`, `isCurrentDefault`, `showUpdateDefault`).

status: approved
