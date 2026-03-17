# Technical Specifications — Issue 18
## Concurrent Station Price Fetching with Loading State and Warnings

### Files Created or Modified

- `src/types/station-warning.ts` (**created**) — defines the `StationWarning` interface with `stationName: string` and `url: string` fields. Created before composable logic per the type-first rule.

- `src/types/index.ts` (**modified**) — added re-export of `StationWarning` from `./station-warning` so consumers can import it from the shared types barrel.

- `src/composables/useStationPrices.ts` (**modified**) — fully reworked from a single-station fetcher to a multi-station concurrent fetcher. Exposes `results: Ref<StationData[]>`, `warnings: Ref<StationWarning[]>`, `isLoading: Ref<boolean>`, and `loadAllStationPrices(): Promise<void>`. All station fetches are initiated concurrently using `Promise.allSettled`. The station list is obtained from `useStationStorage` at call time to preserve the singleton pattern.

- `src/pages/index.vue` (**modified**) — calls `loadAllStationPrices` on mount, renders `AppLoader` while `isLoading` is true, and renders a warning list below `StationManager` when `warnings` is non-empty. Each warning item displays the station name and a link to the station URL.

### Technical Choices

**`Promise.allSettled` instead of `Promise.all`:** Each `fetchOneStation` call already has an internal `try/catch` that catches network errors and never re-throws, so it always resolves. `Promise.allSettled` is used as a defensive guard to ensure that even if an unexpected throw were to escape `fetchOneStation`, the `isLoading` flag would still be set to false. It makes the intent explicit: all fetches must settle before loading ends.

**Response shape validation via `asFetchPageResponse`:** Instead of casting `response.json()` directly to the expected type, the raw JSON is passed through a runtime type guard. An unexpected shape (e.g. a Netlify error envelope) is treated as a warning rather than a crash. This satisfies security guideline 3 (treat Netlify function response as untrusted input).

**`useStationStorage()` called inside `loadAllStationPrices`:** The singleton composable returns the same module-level `stations` ref on every call. Calling it inside the action (rather than at module load time) ensures the station list is always current at the time of the fetch, avoiding stale captures.

**Spread-assign pattern for array updates:** `warnings.value = [...warnings.value, newItem]` is used instead of `warnings.value.push(newItem)`. This ensures Vue's reactivity system detects the change by replacing the array reference rather than mutating it in place.

**Warning items rendered as `<li>` in a `<ul>`:** Semantically correct for a list of warnings. The `aria-label` attribute makes the list accessible to screen readers.

### Self-Code Review

1. **Potential issue — concurrent writes to `warnings`/`results`:** Multiple `fetchOneStation` promises run concurrently. Each one does `warnings.value = [...warnings.value, item]`. In JavaScript's single-threaded event loop, `await` yields control at suspension points. If two callbacks both read `warnings.value` before either writes back, one write would overwrite the other. In practice, Vue reactive ref assignments and the spread read happen within a single synchronous task turn after each `await` resolves, so there is no true interleaving. The pattern is safe, but it is noted here for awareness. An alternative would be to collect results in a local array and assign once after `Promise.allSettled` resolves — this would be more robust and is worth considering if this function is ever refactored.

2. **`loadAllStationPrices` reads `stations.value` once at the start:** If `loadStations()` has not been called yet, `stations.value` will be empty and no fetches will run. This is the correct behaviour (TC-07), but callers must ensure stations are loaded before calling `loadAllStationPrices`.

3. **`AppLoader` `css-class` prop:** The `AppLoader` component accepts a `cssClass` prop. In the template `css-class` is used (kebab-case), which Vue correctly maps to `cssClass`. No issue.

status: ready
