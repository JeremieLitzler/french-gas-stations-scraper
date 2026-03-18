# Technical Specifications — Issue #31: Station List → Price Table Reactivity

## Files Changed

### `src/types/station-data.ts`
Added `url: string` field to `StationData`. Required for incremental operations to identify
which result or warning belongs to which station by URL.

### `src/composables/useStationPrices.ts`
Added three incremental update operations alongside the existing `loadAllStationPrices`:
- `removeStationPrice(url)` — removes matching entries from `results` and `warnings` by URL
- `addStationPrice(station)` — fetches a single station and appends its result or warning; sets `isLoading` during the fetch
- `renameStation(url, newName)` — updates `stationName` in the matching result without re-fetching

Updated `applySuccessResponse` to include `url` in the `StationData` object it appends to `results`.

### `src/components/StationPricesContent.vue`
Added reactive station list watcher (ADR-009 imperative pattern):
- `watch(stations, applyStationListChange)` — fires on every station list mutation after initialization
- `applyStationListChange(newStations, oldStations)` — diffs old and new lists by URL: dispatches `removeStationPrice` for removed URLs, `addStationPrice` for added URLs, `renameStation` for name-only changes
- `isInitialized` flag prevents the watcher from firing during the initial `loadStations()` call (which would trigger a double-fetch)

Updated `watch(availableFuelTypes)` to preserve the selected fuel type if it still exists in
the new list (R6); only resets to the first available type when the selected type disappears.

### `src/utils/fuelTypeUtils.spec.ts`
Updated `makeStation` helper to include `url` field (required by updated `StationData` type).

### `src/components/StationPrices.spec.ts`
Updated `makeStation` helper to include `url` field. Added `removeStationPrice`,
`addStationPrice`, `renameStation` stubs to the `useStationPrices` mock.

### `src/pages/index.spec.ts`
Added `removeStationPrice`, `addStationPrice`, `renameStation` stubs to the `useStationPrices`
mock to prevent runtime errors if the watcher fires during tests.

## Technical Choices

**`isInitialized` flag over `watchEffect` timing tricks**: Vue watchers are set up before
`await` in `<script async setup>`, so `watch(stations)` would fire when `loadStations()` sets
`stations.value`. A plain boolean flag is simpler and more readable than alternatives like
`nextTick` guards or setting up the watcher after the awaits.

**Fire-and-forget `addStationPrice` in watcher**: The stations watcher callback is synchronous;
`addStationPrice` is async. The promise is not awaited in the watcher callback — this is
intentional. The loading state (`isLoading`) correctly reflects the in-flight fetch, and the
result/warning is appended when the fetch settles. Awaiting in a watcher callback would require
`{ flush: 'post' }` and extra error handling that adds complexity without meaningful benefit.

**URL as the identity key for `StationData`**: Station names can change (R3), so `stationName`
is not a stable identity. URL is the natural key used throughout `useStationStorage`. Adding
`url` to `StationData` makes the incremental operations straightforward and consistent.

**No concurrent-fetch guard in `addStationPrice`**: If two stations are added in rapid
succession, two `addStationPrice` calls run concurrently and `isLoading` may momentarily
flicker to `false` between them. A ref counter would prevent this but adds complexity. The
existing `loadAllStationPrices` has the same trade-off; consistency with the existing pattern
is preferred.

## Object Calisthenics Exceptions

- `StationPricesContent.vue` `<script setup>` block exceeds five lines — Vue composable
  convention requires all setup logic in one block (documented exception, same as existing code).
- `applyStationListChange` has a `continue` statement inside a `for...of` loop — this is an
  early-return equivalent for loop iterations, consistent with the no-else rule.

status: ready
