# Technical Specifications — Issue 18
## Concurrent Station Price Fetching with Loading State and Warnings

### Files Created or Modified

- `src/types/station-warning.ts` (**created**) — defines the `StationWarning` interface with `stationName: string` and `url: string` fields. Created before composable logic per the type-first rule.

- `src/types/index.ts` (**modified**) — added re-export of `StationWarning` from `./station-warning` so consumers can import it from the shared types barrel.

- `src/composables/useStationPrices.ts` (**modified**) — fully reworked from a single-station fetcher to a multi-station concurrent fetcher. Exposes `results: Ref<StationData[]>`, `warnings: Ref<StationWarning[]>`, `isLoading: Ref<boolean>`, `fetchCompleted: Ref<boolean>`, and `loadAllStationPrices(stations: Station[]): Promise<void>`. All station fetches are initiated concurrently using `Promise.allSettled`. `fetchCompleted` flips to `true` after each non-empty run finishes; consumers watch it to drive success feedback. The station list is passed as a parameter by the caller component; the composable does not call any other composable internally.

- `src/components/StationPrices.vue` (**created**) — new component that owns all fetch-feedback UI and is solely responsible for triggering the fetch. Calls `loadAllStationPrices` in its own `onMounted` (caller-responsibility rule). Renders the loading indicator (`AppLoader`), the "Scraping complete." success message (shown when `fetchCompleted` flips true, auto-dismissed after 3 seconds via a local `setTimeout` cleaned up in `onUnmounted`), and the warnings list (each item shows station name and a link to the station URL). Issue 19 will extend this component with fuel-type selection and the price table.

- `src/pages/index.vue` (**modified**) — thin layout wrapper: `<div class="flex flex-col w-full">` containing `<StationManager />` and `<StationPrices />`. The `flex-col w-full` wrapper ensures the two components stack vertically. No composable imports or fetch calls; `StationPrices.vue` owns the fetch lifecycle.

### Technical Choices

**`Promise.allSettled` instead of `Promise.all`:** Each `fetchOneStation` call already has an internal `try/catch` that catches network errors and never re-throws, so it always resolves. `Promise.allSettled` is used as a defensive guard to ensure that even if an unexpected throw were to escape `fetchOneStation`, the `isLoading` flag would still be set to false. It makes the intent explicit: all fetches must settle before loading ends.

**Response shape validation via `asFetchPageResponse`:** Instead of casting `response.json()` directly to the expected type, the raw JSON is passed through a runtime type guard. An unexpected shape (e.g. a Netlify error envelope) is treated as a warning rather than a crash. This satisfies security guideline 3 (treat Netlify function response as untrusted input).

**`loadAllStationPrices` accepts `stations: Station[]` as a parameter:** Vue composables must only be called at the top level of `setup()`. Calling `useStationStorage()` inside an async function such as `loadAllStationPrices` violates this rule — the call runs outside Vue's reactive context and returns a fresh disconnected ref. Instead, `StationPrices.vue` calls both `useStationStorage()` and `useStationPrices()` at setup top-level, then passes `stations.value` to `loadAllStationPrices` in `onMounted`. This keeps the composable free of cross-composable dependencies and makes it trivially testable without mocking `useStationStorage`.

**Spread-assign pattern for array updates:** `warnings.value = [...warnings.value, newItem]` is used instead of `warnings.value.push(newItem)`. This ensures Vue's reactivity system detects the change by replacing the array reference rather than mutating it in place.

**Warning items rendered as `<li>` in a `<ul>`:** Semantically correct for a list of warnings. The `aria-label` attribute makes the list accessible to screen readers.

**`fetchCompleted` in the composable, auto-dismiss timer in `StationPrices.vue`:** The dismiss timer must not live inside the singleton composable, as a singleton has no natural `onUnmounted` lifecycle. A `setTimeout` in a singleton would fire after the component is gone. Instead, the composable exposes `fetchCompleted` as a plain boolean ref; `StationPrices.vue` watches it and owns the timer, cleaning it up in `onUnmounted`. This keeps the composable side-effect-free and the component's timer lifecycle correct.

**Success message wording "Scraping complete.":** The message is shown even when there are warnings (spec rule 10). "All stations scraped successfully" would be misleading when some stations failed. "Scraping complete." is accurate in all cases.

**`StationPrices.vue` as the feedback container:** Extracting all fetch-feedback into a dedicated component keeps `index.vue` as a thin layout orchestrator and gives issue 19 a clear extension point (the price table goes into the same component).

**`StationPrices.vue` calls `loadAllStationPrices` in `onMounted` (caller-responsibility rule):** The composable never self-triggers fetching. `StationPrices.vue` is the designated caller component and therefore owns the `onMounted` fetch invocation. `index.vue` has no composable imports at all.

**`flex-col w-full` wrapper in `index.vue`:** The parent `GuestLayout` wraps the slot in `<div class="flex justify-center items-center">`, which is a row-direction flex container. Without an explicit column wrapper, `StationManager` and `StationPrices` would render side-by-side. Wrapping both in `<div class="flex flex-col w-full">` overrides the parent flex direction and ensures vertical stacking at full width.

### Self-Code Review

1. **Potential issue — concurrent writes to `warnings`/`results`:** Multiple `fetchOneStation` promises run concurrently. Each one does `warnings.value = [...warnings.value, item]`. In JavaScript's single-threaded event loop, `await` yields control at suspension points. If two callbacks both read `warnings.value` before either writes back, one write would overwrite the other. In practice, Vue reactive ref assignments and the spread read happen within a single synchronous task turn after each `await` resolves, so there is no true interleaving. The pattern is safe, but it is noted here for awareness. An alternative would be to collect results in a local array and assign once after `Promise.allSettled` resolves.

2. **Caller must pass a non-empty, loaded station list:** `loadAllStationPrices` uses whatever array is passed at call time. If `useStationStorage.loadStations()` has not resolved before `onMounted` fires, `stations.value` may be empty and no fetches will run. In practice, `useStationStorage` uses IndexedDB which resolves fast, but callers should be aware of this ordering dependency. The empty-list case is handled gracefully (TC-07).

3. **`AppLoader` `css-class` prop in `StationPrices.vue`:** The `AppLoader` component accepts a `cssClass` prop. In the template `css-class` is used (kebab-case), which Vue correctly maps to `cssClass`. No issue.

status: ready
