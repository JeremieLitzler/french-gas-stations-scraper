# Business Specifications — Issue #50: Rework UX / UI

## Goal

Improve the app's identity and usability: rename it "Coup de pompe", translate all UI labels to French, add a foldable station list table, an `<h1>` heading, and a "Mentions légales" page whose content is loaded from a static Markdown asset.

## Scope

HTML entry point, layout components, existing Vue page/component labels, one new page, one new Markdown asset, and the router configuration to expose the new page.

## Files to Create or Modify

- `index.html` — update `<title>`, add `<meta name="description">`, update `<meta name="apple-mobile-web-app-title">`
- `src/pages/index.vue` — add `<h1>` displaying the app name
- `src/components/StationPrices.vue` — translate heading and description to French
- `src/components/StationManager.vue` — translate heading and description to French; wrap only the `<Suspense>` block (which renders `StationManagerTable`) in a `<details>`/`<summary>` element that is closed by default
- `src/components/StationManagerTable.vue` — translate column headers and placeholders to French
- `src/components/layout/AppFooter.vue` — add a navigation link to the "Mentions légales" page
- `src/pages/mentions-legales.vue` — new page that reads `src/assets/mentions-legales.md`, parses it with `marked`, and renders the HTML safely
- `src/assets/mentions-legales.md` — new static Markdown file with placeholder content; all links that would reference "jeremielitzler.fr" use "coupdepompe.madebyjeremie.fr" instead
- `src/utils/markdownParser.ts` — new pure utility that accepts a Markdown string and returns sanitized HTML (uses `marked` for parsing and the existing sanitization strategy per ADR-007)

## Rules

### R1 — Page title
The `<title>` in `index.html` is "Coup de pompe". The `<meta name="apple-mobile-web-app-title">` is updated to match.

### R2 — Meta description
A `<meta name="description">` tag is added to `index.html`. Suggested content: "Coup de pompe — Comparez les prix des carburants dans vos stations préférées."

### R3 — H1 heading on home page
The home page (`src/pages/index.vue`) displays an `<h1>` whose text matches the `<title>`. It is visible above the prices and station sections.

### R4 — All UI labels in French
Every user-visible English string in components (`StationPrices.vue`, `StationManager.vue`, `StationManagerTable.vue`) is replaced with its French equivalent. Column headers ("Name" → "Nom", "URL" → "URL"), section headings ("Prices" → "Prix", "Station List" → "Liste des stations"), descriptions, and input placeholders are all translated.

### R5 — Foldable station table
Inside `StationManager.vue`, the `<Suspense>` block containing `StationManagerTable` is wrapped in a `<details>`/`<summary>` element. The `<summary>` label is in French. The `<details>` element does not carry the `open` attribute — the table is collapsed by default. The heading, description paragraph, and add-station form row (if any) remain always visible outside `<details>`.

### R6 — Mentions légales page
A new page is accessible at `/mentions-legales`. It reads `src/assets/mentions-legales.md` at runtime, parses it with `marked`, sanitizes the output per ADR-007, and renders it. The page is reachable via a link in `AppFooter.vue`.

### R7 — Markdown content asset
`src/assets/mentions-legales.md` contains placeholder legal text in French. No link in this file references "jeremielitzler.fr" — all such links use "coupdepompe.madebyjeremie.fr".

### ADR Required

Using `marked` (or another Markdown-to-HTML library) to parse a static asset at runtime is a new pattern not yet documented in the project's ADRs. An ADR is needed to capture: the choice of `marked` over alternatives, why runtime parsing from a `.md` asset is preferred over pre-compiled HTML or a CMS, and how it integrates with the existing ADR-007 sanitization strategy.

status: ready
