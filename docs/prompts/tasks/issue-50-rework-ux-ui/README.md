# Issue #50 — Rework UX / UI

## Request

### in index.html

- replace `<title>` in head to be "Coup de pompe"
- suggest a description and add it to `<head>` in the description meta tag
- update all labels to French in components
- make the station list foldable using native HTML `<details>` and `<summary>`. By default, it is closed.
- add `<h1>` with the `<title>` of `<head>`
- add a page with this model: https://jeremielitzler.fr/page/mentions-legales/. All links referencing "jeremielitzler.fr" should become "coupdepompe.madebyjeremie.fr".

## Clarification Answers (provided by user)

1. **Mentions légales content delivery** → Option A: Static Markdown file (`src/assets/mentions-legales.md`) parsed at runtime with `marked`. User will provide final content later — use placeholder content for now.

2. **Station list folding scope** → Table only: only the `StationManagerTable` block inside `StationManager.vue` gets wrapped in `<details>`/`<summary>`. The heading, description, and add-station form remain always visible.
