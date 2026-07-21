# Technical Specifications — Sub-Issue C (#85): Read Preferences from Remote Repo on Load

*(Sixth pass — implements business-specifications.md Sub-Issue C rules 7/8 (empty-state,
cross-view consistency) and security-guidelines.md rule 7 (bounded remote-fetch wait), per
`spec-review.md`.)*

## Summary of files created/changed

- `src/composables/useStationStorage.ts` — changed. Removed `DEFAULT_STATIONS` and
  `mergeWithDefaults()`; `loadStations()` now only reads and validates IndexedDB, with no seed
  merge or write-back side effect.
- `src/components/EmptyStationsMessage.vue` — new. Tiny shared presentational component (same
  precedent as `AppLoader.vue`) rendering "Aucune station pour le moment" with the invitation to
  use the Station Manager, so the wording lives in one place instead of being duplicated as a
  string literal in every view that needs it.
- `src/components/HomePageContent.vue` — new. Centralizes "on application load": auth state, repo
  config, station list, default fuel type, and the remote GitHub sync all resolve here once,
  before `StationPrices`/`StationManager` mount. Owns the `applyRemotePreferences` merge/rollback
  logic moved from `StationPricesContent.vue`.
- `src/pages/index.vue` — changed. Wraps `HomePageContent` in a page-level `<Suspense>` (fallback:
  `AppLoader`) instead of rendering `StationPrices`/`StationManager` directly.
- `src/components/StationPricesContent.vue` — changed. No longer calls `loadStations`,
  `loadDefaultFuelType`, `initializeAuthState`, `loadRepoConfig`, or `syncOnLoad`, and no longer
  owns the remote-merge/rollback functions — all moved to `HomePageContent.vue`. Only reads the
  already-loaded `stations`/`defaultFuelType` singletons. Renders `EmptyStationsMessage` when
  `stations` is empty.
- `src/components/StationManagerTable.vue` — changed. No longer calls `loadStations()`; dropped
  `async` from `<script setup>` since it has no remaining top-level `await`. Renders
  `EmptyStationsMessage` when `stations` is empty.
- `src/components/StationManager.vue` — changed. Removed the `<Suspense>`/`AppLoader` wrapper
  around `StationManagerTable`, now unnecessary since that component is no longer async.
- `src/composables/useRemotePreferencesSync.ts` — changed. Added a 10-second bound (via
  `AbortController`) on the GitHub proxy fetch (security-guidelines.md rule 7), extracted into a
  `fetchWithTimeout` helper.
- `README.md` (project root) — changed. Replaced the now-inaccurate "Starting list of stations"
  section with a note that the app shows an empty-state invitation instead of seeding example
  stations.

## Non-trivial decisions

- **Centralized load orchestration in a new `HomePageContent.vue`, rather than duplicating the
  sync call into `StationManagerTable.vue` or adding a shared "sync settled" flag.**
  business-specifications.md rule 8 requires every view to reflect the same post-sync outcome,
  with no view rendering before the sync outcome is known. Of the three approaches weighed in
  `spec-review.md`, centralizing is the only one that makes the race structurally impossible
  rather than merely handled: `StationPricesContent.vue`/`StationManagerTable.vue` don't exist in
  the DOM at all until `HomePageContent.vue`'s own `<Suspense>` boundary (in `index.vue`) resolves,
  so neither can render pre-sync data, and there is exactly one GitHub proxy call per page load
  instead of a possible two.
- **`applyRemotePreferences` and its rollback helpers moved wholesale to `HomePageContent.vue`
  rather than staying in `StationPricesContent.vue` and being called from the new component.**
  These functions close over `useStationStorage`/`useDefaultFuelType`'s setters, which
  `HomePageContent.vue` must call directly anyway (composable-caller-responsibility convention —
  a composable's data may only be read/written by the component that loaded it in the same
  `setup()`). Leaving them in `StationPricesContent.vue` would mean that component still needing
  `useDefaultFuelType`'s write functions and `useStationStorage`'s `replaceStations` purely to
  serve a merge it no longer triggers — dead responsibility in the wrong file.
- **`EmptyStationsMessage` is a shared component, not a duplicated string in each view.**
  test-cases.md C-16 requires the exact same message in both places; a shared component makes
  that guaranteed by construction (one place to change the wording) rather than by discipline
  across two files, following the same precedent as `AppLoader.vue`.
- **`StationManagerTable.vue`'s `async` keyword dropped, and `StationManager.vue`'s `<Suspense>`
  wrapper removed, rather than left in place as harmless dead weight.** Once `loadStations()` was
  removed, the component has no remaining top-level `await` — keeping `async setup` or a
  `<Suspense>` boundary around a component that never actually suspends is exactly the kind of
  leftover complexity a reviewer would flag as dead code.
- **The remote-fetch timeout (security-guidelines.md rule 7) is a fixed 10-second constant, not a
  configurable value.** Neither business-specifications.md nor security-guidelines.md specifies a
  duration — only that the wait must be bounded. A fixed constant satisfies that without inventing
  a new user-facing setting the spec never asked for; `revalidate-cache-days` already covers the
  user-configurable timing concern (how *often* to sync), which is a different axis from *how
  long a single attempt may hang*.

## Object Calisthenics exceptions

- `HomePageContent.vue`'s async setup body groups the whole application-load sequence in one
  place — same documented framework exception used throughout this codebase (`useGitHubAuth.ts`,
  `useRepoConfig.ts`, `useStationStorage.ts`).
- `EmptyStationsMessage.vue` has no exceptions — a single static paragraph, no logic.

## Self-code review

1. **A leading HTML comment before `<template>` risked a parse issue.** `HomePageContent.vue` was
   first written with its documentation comment as `<!-- ... -->` above the `<template>` block —
   no other `.vue` file in this codebase places a comment outside a recognized SFC block
   (`<template>`/`<script>`/`<style>`), so this was untested syntax for the toolchain in use here.
   Fixed by moving the documentation into a standard `/** ... */` block comment at the top of
   `<script setup>`, matching the header-comment convention already used by every composable in
   this codebase.
2. **Verified centralizing the load sequence does not introduce a new IndexedDB-failure blast
   radius.** Before this change, both `StationPricesContent.vue` and `StationManagerTable.vue`
   already called unguarded `loadStations()`/related composable loaders that can reject if
   IndexedDB itself fails (`src/utils/indexedDb.ts`'s `get()` propagates rejections) — either
   view could already fail to render on its own. Centralizing consolidates this into one failure
   point instead of two independent ones; it does not add a new failure mode. No fix needed —
   confirmed as a pre-existing characteristic, not a regression.
3. **Confirmed no dangling top-level `await` was left in `StationManagerTable.vue`** after
   dropping `async` from its `<script setup>` tag — a leftover `await` there would be a syntax
   error the build would catch, but re-reading the full file confirmed the only `await`s remaining
   are inside individual event-handler functions (`onDelete`, `onNewRowBlur`, etc.), which don't
   require the component itself to be async.

## Known gaps — not fixed here (out of scope for this command)

- `src/composables/useRemotePreferencesSync.spec.ts` still imports the deleted
  `@/types/remote-preferences` module and uses the old `stations`/`defaultFuel` field names.
- No existing `.spec.ts` file covers `HomePageContent.vue`, the new empty-state rendering, the
  removed `DEFAULT_STATIONS` seeding, or the fetch timeout — these are new test-cases.md scenarios
  (C-16 through C-19) that `/jli-writes-tests` has not yet authored against.
- `StationManagerTable.updateStation.spec.ts` / `useStationStorage.spec.ts` likely still assert
  against the removed default-seeding behavior in `loadStations()` — expected to need updating
  alongside the above.

### ADR Required

`HomePageContent.vue` introduces a pattern not yet documented in `docs/decisions/`: a dedicated,
page-level "load orchestrator" component that mediates several singleton composables
(`useGitHubAuth`, `useRepoConfig`, `useStationStorage`, `useDefaultFuelType`,
`useRemotePreferencesSync`) and gates a `<Suspense>` boundary in the page (`index.vue`) so that
*all* of a page's feature components mount only after a shared load sequence resolves. This
differs from the codebase's prior pattern (documented in ADR-002/ADR-009) where each feature's
own content component independently called its own composables' loaders — that prior pattern is
what produced the cross-component race this change closes (`spec-review.md`, sub-issue-85). An
ADR should record: why a shared load boundary is needed whenever two or more sibling components
read the same singleton state that a remote sync can change, and where this pattern should (or
should not) be reused for future page-level features.

status: ready
