# Technical Specifications — Issue #50: Rework UX / UI (Bug Feedback Loop Run)

## Changes

### `src/pages/mentions-legales.vue`

Added a sticky "← Accueil" button positioned `fixed top-4 left-4 z-10` that navigates back to the home page via `<RouterLink to="/">`. The button uses pill styling (`bg-white border border-gray-300 rounded-full px-3 py-1 text-sm shadow hover:bg-gray-50`). The main content wrapper gained `pt-16` so the fixed button does not overlap the `<h1>` on page load.

### `docs/decisions/ADR-010-markdown-runtime-parsing.md`

Rewrote the ADR to accurately reflect the **actual decision made**: inline HTML in the Vue template, no `marked` dependency, no runtime Markdown parsing. Status changed from **Superseded** to **Accepted**. Title updated to "Static Content Rendering Strategy for the Mentions Légales Page".

### `docs/decisions/README.md`

Updated the ADR-010 index row to show status **Accepted** and the corrected title.

## Technical Choices

### `fixed` vs `sticky` for the home button

`fixed top-4 left-4` was chosen over `sticky top-0` because `sticky` only works relative to the nearest scrolling ancestor. Since the page's scrolling ancestor is `<body>` and the button is not a direct child of a scroll container with overflow, `sticky` would not produce the intended pinned-to-viewport behavior. `fixed top-4 left-4` is unambiguous: the button is always at the top-left of the viewport regardless of scroll position.

`pt-16` on the content wrapper compensates for the fixed button's height (~40 px including margin), preventing the `<h1>` from being hidden beneath the button on initial render.

### No script block added to `mentions-legales.vue`

`<RouterLink>` is auto-imported by `unplugin-vue-components` (configured in `vite.config.ts`), so no `<script setup>` block is required. The component remains purely declarative.

## Self-Code Review

1. **Z-index conflict**: `z-10` is low; if a future component (e.g. a modal overlay) uses a lower z-index, the button remains on top. If a higher z-index is introduced elsewhere, the button could be hidden. Currently safe — no modals exist on this page.
2. **`pt-16` is a magic number**: If the button's size changes (e.g. font-size or padding increases), `pt-16` may need adjustment. Acceptable trade-off; a CSS custom property would be over-engineering for a single static page.
3. **No `aria-label`**: The button text "← Accueil" is visible and descriptive enough for screen readers. No additional aria attribute is needed.

status: ready
