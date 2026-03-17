# Technical Specifications — Fix: Loader not visible during scraping (#30)

## Summary

This document covers the Suspense wiring fix (Rules 5–7 of `business-specifications.md`). The original CSS bug fix (removing `css-class="fetch-loader"`) was committed in a prior pipeline run and is documented in the previous version of this file.

## Files Changed

### `src/components/StationPrices.vue`

- Removed the `<AppLoader v-if="isLoading" />` element and its import.
- Removed `isLoading` from the `useStationPrices` destructuring (no longer used in the template).
- Removed `onMounted` import and replaced the `onMounted(async () => {...})` block with two top-level `await` statements: `await loadStations()` then `await loadAllStationPrices(stations.value)`.
- Simplified `v-if="!isLoading && availableFuelTypes.length > 0"` to `v-if="availableFuelTypes.length > 0"` — the `isLoading` guard is no longer needed since by the time the component renders (after Suspense resolves), loading is complete.
- The linter auto-added `async` to the `<script setup>` tag (correct — top-level await requires it).

### `src/components/StationManager.vue`

- Removed `onMounted` import and replaced the `onMounted(async () => { await loadStations() })` block with a top-level `await loadStations()`.
- The linter auto-added `async` to the `<script setup>` tag.

### `src/pages/index.vue`

- Wrapped `<StationPrices />` and `<StationManager />` in a `<Suspense>` block with `<AppLoader />` as the `#fallback` slot.
- Added `AppLoader` import to `<script setup>`.

### `src/components/StationPrices.spec.ts`

- Removed TC-01, TC-02, TC-03 (AppLoader visibility tests inside StationPrices) — now obsolete since `AppLoader` is handled by the `<Suspense>` fallback, not rendered inside the component.
- Removed TC-11/TC-12 `isLoading`-based assertions; replaced with results-empty equivalents (selector/table hidden when results are empty).
- Added TC-07: verifies `AppLoader` is NOT rendered inside `StationPrices` after setup resolves.
- Updated `mountComponent()` to wrap `StationPrices` in a `<Suspense>` boundary (required for async components in Vue Test Utils).
- Removed `AppLoader` stub (no longer imported in `StationPrices`).
- Removed `mockIsLoading` from mock (no longer destructured in component).

### `src/components/StationManager.spec.ts`

- Updated `mountComponent()` to wrap `StationManager` in a `<Suspense>` boundary.
- Added `defineComponent` import.

## Technical Choices

### Why top-level `await` instead of keeping `onMounted`

Vue's `<Suspense>` only suspends a component tree when a component's `setup()` (or `<script setup>`) contains a top-level `await`. Components that defer async work to `onMounted` are fully mounted before `<Suspense>` activates its fallback — they never trigger suspension. Moving the `await` calls to the top level is the minimal, correct change to make `<Suspense>` work.

### Why `onUnmounted` after top-level `await` is valid in StationPrices

Vue 3 documentation notes that lifecycle hooks must be called synchronously in `setup()`. After a `await` in `<script setup>`, the component instance context is technically suspended, but Vue's compiler wraps the entire `<script setup>` in a way that lifecycle hooks registered after top-level awaits are correctly associated with the component instance. The `onUnmounted` here registers the cleanup timer, which is safe.

**Object Calisthenics exception**: The `<script setup>` block exceeds five lines because Vue `<script setup>` conventions require grouping all reactive state, watchers, and lifecycle hooks in one block — this is a documented framework exception.

## Self-Code Review

1. **Could the `watch(fetchCompleted, ...)` fire before the awaits complete?** No — `fetchCompleted` starts as `false` (from the mock and the real composable). The watch has no `immediate: true`, so it only fires on changes. Since `loadAllStationPrices` sets `fetchCompleted` to `true` only after all fetches complete, the watch fires after the top-level `await` settles.

2. **Could moving `await` before `onUnmounted` cause the cleanup to not register?** Tested and confirmed valid — Vue's compiler handles this correctly. The type-check and tests both pass.

3. **Does the `<Suspense>` in `index.vue` interact with the `<Suspense>` in `App.vue`?** No — each `<Suspense>` is independent. The local one in `index.vue` handles `StationPrices` and `StationManager` suspension. The outer one in `App.vue` handles layout loading.

status: ready
