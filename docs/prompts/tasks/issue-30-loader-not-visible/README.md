# Issue #30 — The loader is not visible while the scraping is ongoing

## User Request

Tackle GitHub issue 30.

## Issue Details

**Title:** The loader is not visible while the scraping is ongoing
**URL:** https://github.com/JeremieLitzler/french-gas-stations-scraper/issues/30
**Status:** OPEN
**Author:** @JeremieLitzler

## Description

The loader is likely shown, but invisible. Fix the CSS using Tailwind already on the project.

## Pipeline Metadata

- Type: fix
- Slug: loader-not-visible
- Branch: fix/loader-not-visible
- Worktree: E:/Git/GitHub/french-gas-stations-scraper.git/fix_loader-not-visible
- Task folder: docs/prompts/tasks/issue-30-loader-not-visible/

## Additional Bug (reported after initial fix)

The page is white for a couple of seconds on load because `<Suspense>` is not wired up correctly.

- `StationPrices` and `StationManager` are async components
- `index.vue` (the page component) should also be async
- On `StationPrices`: `AppLoader` should show until the prices table and fuel type list are ready
- On `StationManager`: `AppLoader` should show until the IndexedDB station list is ready to display

This fix must be included in the same branch as the `css-class` fix.
