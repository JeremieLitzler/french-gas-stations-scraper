# Business Specifications — Fix: Loader not visible during scraping (#30)

## Goal

The loading indicator must be visually present whenever the application is fetching fuel prices or loading the station list from IndexedDB. Two distinct problems exist:

1. `AppLoader` in `StationPrices.vue` was invisible because a custom `cssClass` prop was passed with no associated styles (original bug).
2. The page is white for a couple of seconds on load because `<Suspense>` is not wired correctly: both `StationPrices` and `StationManager` perform async work in `onMounted` rather than in the component's `setup()`, so `<Suspense>` has nothing to suspend on and never shows the fallback loader.

## Context

See `CLAUDE.md` for project architecture and code conventions.

`AppLoader` accepts an optional `cssClass` prop that replaces its entire default Tailwind class string. When a caller passes a bare class name that carries no styles, the loader renders but is invisible.

Vue's `<Suspense>` mechanism suspends a component tree only when a component's `setup()` (or `<script setup>`) contains a top-level `await`. Components that defer async work to `onMounted` are fully mounted before `<Suspense>` activates its fallback.

## Rules

### Rule 1 — Loader is visible during scraping

While `StationPrices` is loading prices, `AppLoader` must be clearly visible to the user.

### Rule 2 — No custom class override without styles

Any usage of `AppLoader` that passes a `cssClass` prop must pass a valid, complete Tailwind class string. Passing a bare identifier with no associated styles is not allowed. Omitting the prop uses the component's built-in default styling.

### Rule 3 — Default styling is self-contained in AppLoader

The default appearance (full-screen overlay, centred spinner, semi-transparent background, high z-index) is defined inside `AppLoader.vue` and applies whenever no `cssClass` prop is provided.

### Rule 4 — Other usages remain unaffected

The `App.vue` usage of `<AppLoader />` (no prop) must continue to work without change.

### Rule 5 — StationPrices suspends until prices and fuel types are ready

`StationPrices` must perform its async initialisation (load stations, then fetch all station prices) as a top-level `await` in `<script setup>` so that `<Suspense>` suspends the component until the data is ready to display. `AppLoader` must not be rendered conditionally inside `StationPrices` — the `<Suspense>` fallback handles the loading state.

### Rule 6 — StationManager suspends until the station list is ready

`StationManager` must perform its async initialisation (load the IndexedDB station list) as a top-level `await` in `<script setup>` so that `<Suspense>` suspends the component until the list is ready to display. No loader is rendered inside `StationManager` itself.

### Rule 7 — index.vue wraps its children in a local Suspense

`index.vue` must wrap `<StationPrices />` and `<StationManager />` in a `<Suspense>` block with `<AppLoader />` as the fallback. This local `<Suspense>` is independent of the one in `App.vue` which handles layout loading.

## Files to Modify

- `src/components/StationPrices.vue` — remove the `css-class` prop on `<AppLoader>`, remove the in-template `v-if="isLoading"` conditional, move async initialisation from `onMounted` to top-level `await` in `<script setup>`.
- `src/components/StationManager.vue` — move async initialisation from `onMounted` to top-level `await` in `<script setup>`.
- `src/pages/index.vue` — add a local `<Suspense>` wrapper with `<AppLoader />` fallback.

status: ready
