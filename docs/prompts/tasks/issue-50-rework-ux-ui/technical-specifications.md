# Technical Specifications — Issue #50: Rework UX / UI

## Files Created or Modified

### Created

- `src/utils/markdownParser.ts` — Pure async utility that parses a Markdown string through `marked` (with a renderer override that injects `rel="noopener noreferrer"` on every link) and then sanitizes the result via `sanitizeBodyHtml` (DOMPurify, ADR-007). Exported API: `parseMarkdown(markdown: string): Promise<string>`.
- `src/pages/mentions-legales.vue` — New page at route `/mentions-legales`. Imports `src/assets/mentions-legales.md` as a raw string via Vite's `?raw` suffix, calls `parseMarkdown` in `onMounted`, and renders the result via `v-html`.
- `src/assets/mentions-legales.md` — Already created in the specs commit. Contains the French legal notices with all references to `jeremielitzler.fr` replaced by `coupdepompe.madebyjeremie.fr`.

### Modified

- `index.html` — `<title>` changed to "Coup de pompe"; `<meta name="apple-mobile-web-app-title">` updated to match; `<meta name="description">` added.
- `src/pages/index.vue` — `<h1>` has `text-center` added to center the app title on the page (bug fix).
- `src/components/StationPrices.vue` — Heading changed from "Prices" to "Prix"; description translated to French.
- `src/components/StationManager.vue` — Heading changed from "Station List" to "Liste des stations"; description translated to French; `<Suspense>` block wrapped in a `<details>`/`<summary>` element (closed by default, `<summary>` in French).
- `src/components/StationManagerTable.vue` — Column header "Name" changed to "Nom"; new-row name placeholder changed to "Nom de la station".
- `src/components/layout/AppFooter.vue` — Added `|` separator and `<AppLink to="/mentions-legales">Mentions légales</AppLink>`.
- `package.json` / `package-lock.json` — `marked` added as a runtime dependency.

### Bug fixes (post-PR)

- `src/components/StationPricesContent.vue` — Translated all English UI strings to French: fuel type management button labels ("Définir par défaut", "Mettre à jour le défaut", "Effacer le défaut"), default indicator badge ("Par défaut"), price table headers ("Nom de la station", "Prix"), success message ("Récupération terminée."), warning list aria-label and warning item text ("Impossible de charger les prix pour").

## Technical Choices

### `marked` renderer override vs. DOMPurify hook for `rel` attribute

A `marked` renderer override (`RendererObject.link`) was chosen over a post-sanitize DOMPurify DOM walk because it is simpler, zero-allocation, and composable: the attribute is baked in before DOMPurify runs, so there is no risk of DOMPurify stripping a dynamically added attribute.

### `onMounted` for `parseMarkdown` call

`parseMarkdown` is called inside `onMounted` rather than at the top level of `<script setup>` so that the component does not block rendering on the async parse (the asset is tiny, but the pattern keeps component setup synchronous and consistent with Vue conventions).

### Vite `?raw` import

`import mentionsLegalesRaw from '@/assets/mentions-legales.md?raw'` is resolved at build time by Vite — no runtime fetch, no network dependency. TypeScript support is provided by `/// <reference types="vite/client" />` in `env.d.ts`.

## Self-Code Review

1. **Potential bug — `marked.use` is module-global:** The `marked.use({ renderer: safeLinksRenderer })` call mutates the global `marked` instance at module import time. If another part of the app ever imports `marked` directly after this module loads, it will also get the renderer override. This is acceptable here since `markdownParser.ts` is the only consumer, but could cause subtle issues in tests if modules are cached unexpectedly. Mitigation: tests should import `parseMarkdown` through the module, not `marked` directly.

2. **Potential issue — empty `parsedContent` flash:** `parsedContent` starts as `''`, so the `v-html` binding briefly renders an empty `<div>` before `onMounted` resolves. For a bundled asset this is imperceptibly fast, but if a loading indicator were needed, a `v-if` guard could be added. Not required by the spec.

3. **Object Calisthenics note — `safeLinksRenderer.link` uses `this.parser`:** The `this` context is provided by `marked`'s renderer API; this is a framework convention exception (documented in the agent rules). No extract is possible without losing access to `this.parser.parseInline`.

status: ready
