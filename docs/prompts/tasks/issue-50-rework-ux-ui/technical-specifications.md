# Technical Specifications — Issue #50: Rework UX / UI (Bug Feedback Loop — Inline HTML)

## Files Created or Modified

### Modified

- `src/pages/mentions-legales.vue` — Replaced dynamic `v-html` + `marked` approach with static inline HTML template. All legal content is hardcoded directly in the template using Tailwind classes (`text-3xl font-bold mb-4` for h1, `text-2xl font-semibold mt-6 mb-2` for h2, `text-xl font-medium mt-4 mb-1` for h3, `underline text-blue-600 hover:text-blue-800` for links). External links use `target="_blank" rel="noopener"`. No `<script setup>` block — the component is purely presentational.
- `src/components/layout/AppFooter.vue` — Translated all visible English text to French: "Made 🛠️ by" → "Fait 🛠️ par", "and" → "et", "License" → "Licence", "Hosted on Netlify" → "Hébergé sur Netlify". "Mentions légales" was already French.
- `package.json` — Removed `marked` runtime dependency.
- `package-lock.json` — Updated by `npm install` to reflect `marked` removal.
- `docs/decisions/ADR-010-markdown-runtime-parsing.md` — Status updated from Accepted to Superseded; supersession note added at the top.
- `docs/decisions/README.md` — ADR-010 row updated to reflect Superseded status.

### Deleted

- `src/utils/markdownParser.ts` — No longer needed; inline HTML eliminates the parse-then-sanitize pipeline.
- `src/assets/mentions-legales.md` — Content now lives directly in the Vue template.

## Technical Choices

### Inline HTML over `v-html` + `marked`

Chosen because: (1) eliminates `marked` as a runtime dependency, (2) allows Tailwind utility classes to be applied directly to each element — not possible with `v-html`-rendered HTML — and (3) the content is static legal text that does not change frequently. The tradeoff is that future updates require editing a `.vue` file rather than a `.md` file, but this is acceptable for a rarely-changed legal page.

### No `<script setup>` block

The component has no reactive state, no lifecycle hooks, and no imports. Omitting `<script setup>` entirely is idiomatic Vue for purely presentational components and avoids dead code.

### `rel="noopener"` on external links

All external links (`href` starting with `http`) include `target="_blank" rel="noopener"` to prevent tab-napping. `noreferrer` is omitted because the spec only requires `noopener` for this page.

## Self-Code Review

1. **Potential issue — duplicate Tailwind classes:** `mt-2` is applied to many `<p>` elements for spacing. If the design requires a different spacing in the future, each element must be updated individually. Mitigation: acceptable for a static legal page with no dynamic content.

2. **No heading hierarchy skip check:** The template goes from `h2` to `h3` correctly, but if a section were accidentally to have only `h3` without a parent `h2`, it would break semantic heading structure. The current template has been manually verified — no such issue exists.

3. **`rel="noopener"` without `noreferrer`:** The CNIL link uses `rel="noopener"` only. `noreferrer` would also suppress the `Referer` header, which is slightly more privacy-preserving. However, for a government link this is inconsequential and the spec did not require it.

status: ready
