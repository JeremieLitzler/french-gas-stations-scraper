# Business Specifications — Fix: Loader not visible during scraping (#30)

## Goal

The loading indicator must be visually present and correctly styled whenever the application is fetching fuel prices. Currently it renders but is invisible because it receives a custom class name that has no associated styles.

## Context

See `CLAUDE.md` for project architecture and code conventions.

The `AppLoader` component accepts an optional `cssClass` prop that replaces its entire default Tailwind class string. When a caller passes a bare class name that carries no styles, the loader renders but is invisible.

## Rules

### Rule 1 — Loader is visible during scraping

While `isLoading` is `true` in `StationPrices.vue`, a spinning loader icon must be clearly visible to the user, centred on screen with an opaque overlay that blocks interaction with the content beneath it.

### Rule 2 — No custom class override without styles

Any usage of `AppLoader` that passes a `cssClass` prop must either:
- pass a valid, complete Tailwind class string that produces a visible result, or
- omit the prop entirely to use the component's built-in default styling.

Passing a bare identifier with no associated styles is not allowed.

### Rule 3 — Default styling is self-contained in AppLoader

The default appearance (full-screen overlay, centred spinner, semi-transparent background, high z-index) is defined inside `AppLoader.vue` and applies whenever no `cssClass` prop is provided.

### Rule 4 — Other usages remain unaffected

The `App.vue` usage of `<AppLoader />` (no prop) and any future usages that omit the prop must continue to work without change.

## Files to Modify

- `src/components/StationPrices.vue` — remove or correct the `css-class` prop passed to `<AppLoader>` so the default styles apply.

status: ready
