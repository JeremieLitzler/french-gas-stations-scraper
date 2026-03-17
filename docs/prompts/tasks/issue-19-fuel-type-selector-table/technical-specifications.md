# Technical Specifications — Issue 19

## Fuel-Type Selector and Price Table

### Files Created or Modified

| File | Change |
|---|---|
| `src/types/price-row.ts` | **New** — `PriceRow` interface: `{ stationName: string; resolvedPrice: number \| null }` |
| `src/types/index.ts` | **Modified** — added `export type { PriceRow } from './price-row'` |
| `src/utils/fuelTypeUtils.ts` | **New** — three exported pure functions: `deriveFuelTypes`, `resolvePrice`, `buildPriceRows` |
| `src/components/StationPrices.vue` | **Modified** — added fuel-type selector (button list) and price table using shared `Table`/`TableRow`/`TableHead`/`TableBody`/`TableCell` UI components |
| `src/pages/index.vue` | **Modified** — swapped component order so `StationPrices` renders above `StationManager` |

---

### Technical Choices

#### 1. `deriveFuelTypes` uses `Array.reduce` with an accumulator (not a `Set`)

A `Set` would be the most idiomatic deduplication approach in JavaScript, but `reduce` with an explicit accumulator array produces the same first-encountered order guarantee, avoids converting back to an array, and makes the intent explicit. The accumulator is a plain `string[]`, staying consistent with the type used throughout the feature.

#### 2. Sort comparator is extracted into a named function (`comparePriceRows`)

A sort comparator inlined inside `buildPriceRows` would add a second level of indentation inside the `sort` callback, violating Object Calisthenics rule 1 (one level of indentation per function). Extracting it as `comparePriceRows` keeps both functions within five lines and makes the sort logic independently readable.

#### 3. `watch(availableFuelTypes, ...)` drives the `selectedFuelType` reset

The spec states (Rule 12): "If results change, the selected fuel type resets to the first available type from the new results." Rather than watching `results` directly and re-deriving, the component watches the `availableFuelTypes` computed — the same derived value it renders. This avoids a duplicated derivation call and means the watcher fires only when the list actually changes (Vue's reactivity diffing handles this). An immediate watcher was not used to avoid resetting the selection on the first render before results exist.

#### 4. `selectedFuelType` is a plain `ref<string>` starting as `''`

The spec forbids a new composable for this state (Rule 12) and requires it to be local to `StationPrices.vue`. A plain `ref` is the minimal correct choice. The empty string initial value is safe because the `v-if="!isLoading && availableFuelTypes.length > 0"` guard prevents the selector and table from rendering before the watcher has set the first value.

#### 5. No `<select>` element; flat `<button>` list

Per business spec Rule 2, the selector must be a flat list of `<button>` elements. No `<select>` is used.

---

### Self-Code Review

**Potential issue 1 — Watcher fires before results exist on first mount:**
`watch(availableFuelTypes, ...)` is non-immediate by default, so it will not fire on the first render when `availableFuelTypes` is `[]`. This is intentional — when results first arrive, the computed transitions from `[]` to a non-empty list, triggering the watcher and setting `selectedFuelType` to the first type. No correction needed.

**Potential issue 2 — `resolvedPrice !== null` check in template:**
The template uses `row.resolvedPrice !== null ? row.resolvedPrice : '—'`. The `PriceRow.resolvedPrice` is typed as `number | null`, so this is the correct check. A `0` price (valid station price) is truthy and correctly renders as `0`. No correction needed.

**Potential issue 3 — `comparePriceRows` with two null prices returns 0 (stable sort):**
When both prices are null, the comparator returns `0`, leaving their relative order to the JS engine. The spec explicitly allows arbitrary order for stations both missing the type (Rule: "Station B and Station C in any order"). This is consistent with the spec; no correction needed.

status: ready
