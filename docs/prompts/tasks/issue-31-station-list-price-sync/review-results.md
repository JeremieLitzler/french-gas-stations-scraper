# Review Results — Issue #31: Station List → Price Table Reactivity

## Commands Run

### `npm run lint` output

```
E:\...\AppToolTip.vue
  10:7  error  'tooltipParagraph' is assigned a value but never used

E:\...\ui\button\Button.vue
  4:10  error  'Primitive' is defined but never used
  4:26  error  'PrimitiveProps' is defined but never used

E:\...\ui\card\CardTitle.vue
  14:16  error  Parsing error: end-tag-with-attributes
  17:16  error  Parsing error: end-tag-with-attributes

E:\...\ui\label\Label.vue
  9:18  error  '_' is assigned a value but never used

E:\...\ui\separator\Separator.vue
  11:18  error  '_' is assigned a value but never used

E:\...\ui\table\TableEmpty.vue
  15:18  error  '_' is assigned a value but never used
```

All 8 errors are in pre-existing files not touched by this change. None of the changed files
(`useStationPrices.ts`, `StationPricesContent.vue`, `station-data.ts`, `fuelTypeUtils.spec.ts`,
`StationPrices.spec.ts`, `index.spec.ts`) produced lint errors.

### `npm run type-check` output

```
(no output — exit code 0)
```

Type-check passes with zero errors.

## Checklist

**Security guidelines:**
- Rule 1 (URL validation before fetch): Station URLs entering `addStationPrice` have already
  been validated by `useStationStorage.addStation` / `updateStation` before being persisted
  and reflected in `stations`. The watcher fires only after storage has validated and persisted
  the station. ✓
- Rule 2 (No v-html for station names): `StationPricesContent.vue` uses `{{ warning.stationName }}`
  and `{{ row.stationName }}` — text interpolation only. ✓
- Rule 3 (No inconsistent state on error): `removeStationPrice` clears the old entry before
  `addStationPrice` is called for URL changes. On fetch failure, `fetchOneStation` adds to
  warnings without adding to results. ✓

**Object Calisthenics:**
- No `else` keyword: all branches use early returns or `return` guards. ✓
- One level of indentation per method: `applyRemovals` and `applyAdditionOrRename` each handle
  one level of logic; `applyStationListChange` delegates to them. ✓
- No abbreviations: `url`, `station`, `previousStation`, `newStations`, `oldStations`,
  `oldByUrl`, `newByUrl` — all full words. ✓
- Entities kept small: all new functions are ≤5 lines. ✓

**Business spec compliance:**
- R1 (Station removal): `removeStationPrice(url)` removes from both `results` and `warnings`. ✓
- R2 (Station URL change): URL change detected as remove + add (old URL gone, new URL added). ✓
- R3 (Station name change): `renameStation(url, newName)` updates `stationName` in results
  without triggering a re-fetch. ✓
- R4 (Station addition): `addStationPrice(station)` fetches and appends result or warning. ✓
- R5 (Fuel type list consistency): `availableFuelTypes` is computed from `results.value`,
  always re-derived when results change. ✓
- R6 (Selected fuel type preserved unless it disappears): `watch(availableFuelTypes)` now
  preserves selection if the type still exists; resets only when missing. ✓
- R7 (Loading indicator during re-fetch): `addStationPrice` sets `isLoading = true` before
  fetch and `isLoading = false` after. ✓

**Vue/TypeScript-specific issues:**
- No destructuring of reactive objects (uses `.value` access pattern). ✓
- No `any` or `unknown` without narrowing (existing `asFetchPageResponse` narrowing preserved). ✓
- No non-null assertions without preceding null check: `oldByUrl.get(url) as Station` — this
  cast is safe because it follows `if (!oldByUrl.has(url)) return` guard. ✓
- Watcher on `stations` uses getter form implicitly (watching a `Ref` directly is correct in
  Vue 3 — `watch(ref, handler)` is valid and watches the ref's value). ✓
- No composable called inside a function — `useStationStorage` and `useStationPrices` are
  called at the top level of `<script setup>`. ✓
- `clearDismissTimer` cleanup preserved in `onUnmounted`. ✓

**No dead code or unused imports:** `isInitialized` is a plain `let` variable (not a ref)
since it only needs to be set once and never read reactively. `Station` type import added for
the new function signatures. All imports are used.

**Naming clarity:** All new identifiers are full words: `isInitialized`, `indexByUrl`,
`applyRemovals`, `applyAdditionOrRename`, `applyStationListChange`, `previousStation`,
`oldByUrl`, `newByUrl`. ✓

## Summary

The implementation correctly follows the imperative cross-composable reactivity pattern (ADR-009).
All business rules (R1–R7) are satisfied. Security guidelines are addressed. Type-check and lint
pass on the changed files. Pre-existing lint errors in untouched UI files are out of scope.

status: approved
