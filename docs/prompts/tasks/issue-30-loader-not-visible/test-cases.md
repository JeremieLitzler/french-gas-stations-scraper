# Test Cases — Fix: Loader not visible during scraping (#30)

## TC-01 — Loader is visible when `isLoading` is true

**Precondition**: The application is in the loading state (`isLoading = true`).
**Action**: Render `StationPrices.vue`.
**Expected outcome**: The `AppLoader` component is present in the DOM and visible — it renders with a full-screen overlay that covers the content beneath it.

## TC-02 — Loader is hidden when `isLoading` is false

**Precondition**: The application is not loading (`isLoading = false`).
**Action**: Render `StationPrices.vue`.
**Expected outcome**: The `AppLoader` component is absent from the DOM (not rendered).

## TC-03 — Loader receives no custom CSS class

**Precondition**: `StationPrices.vue` renders `AppLoader`.
**Action**: Inspect the rendered `AppLoader` element.
**Expected outcome**: The `AppLoader` wrapper element carries the component's built-in default Tailwind class string, not a bare unstyled identifier.

## TC-04 — AppLoader default class produces a visible overlay

**Precondition**: `AppLoader` is rendered without any `cssClass` prop.
**Action**: Inspect the rendered wrapper element's class attribute.
**Expected outcome**: The class attribute contains Tailwind utility classes that position the overlay centrally over the page (includes absolute or fixed positioning, full-width/height coverage, and a high z-index equivalent).

## TC-05 — AppLoader with explicit `cssClass` prop uses the provided class

**Precondition**: `AppLoader` is rendered with a valid `cssClass` prop value.
**Action**: Inspect the rendered wrapper element's class attribute.
**Expected outcome**: The wrapper element's class attribute matches exactly the value passed via `cssClass`, not the default string.

## TC-06 — Other usages of AppLoader (without prop) are unaffected

**Precondition**: `App.vue` renders `<AppLoader />` without any prop, while `isLoading` is true.
**Action**: Render `App.vue`.
**Expected outcome**: The `AppLoader` element is present and carries the default Tailwind class string unchanged.

## TC-07 — StationPrices does not render an internal loader when wrapped in Suspense

**Precondition**: `StationPrices.vue` is rendered inside a `<Suspense>` wrapper. The async initialisation has completed.
**Action**: Inspect the rendered output of `StationPrices.vue`.
**Expected outcome**: No `AppLoader` component is rendered inside `StationPrices.vue`; loading UI is handled entirely by the `<Suspense>` fallback.

## TC-08 — index.vue renders AppLoader as Suspense fallback during async initialisation

**Precondition**: `index.vue` wraps `<StationPrices />` and `<StationManager />` in a `<Suspense>` block with `<AppLoader />` as the fallback.
**Action**: Render `index.vue` while the async setup of its children has not yet resolved.
**Expected outcome**: The `<AppLoader />` fallback is shown in the DOM, not the content of `StationPrices` or `StationManager`.

## TC-09 — index.vue shows content after async initialisation completes

**Precondition**: `index.vue` wraps `<StationPrices />` and `<StationManager />` in `<Suspense>`.
**Action**: Render `index.vue` after the async setup of its children has resolved.
**Expected outcome**: `StationPrices` and `StationManager` content is visible; the `<AppLoader />` fallback is no longer in the DOM.

## TC-10 — StationManager does not render an internal loader

**Precondition**: `StationManager.vue` is rendered inside a `<Suspense>` wrapper. The async initialisation has completed.
**Action**: Inspect the rendered output of `StationManager.vue`.
**Expected outcome**: No `AppLoader` component is rendered inside `StationManager.vue`.

status: ready
