# Technical Specifications — Refresh Data From Remote Source (Issue #106)

## Files Changed

- `src/utils/applyRemotePreferences.ts` (new) — extracted, stateless "apply an
  already-validated remote `PreferencesFile` through `replaceStations`/
  `saveDefaultFuelType`/`clearDefaultFuelType`, with rollback of both the
  station list and the sync timestamp on failure" logic, shared by
  `HomePageContent.vue`'s on-load sync and `StationManager.vue`'s new
  on-demand refresh.
- `src/composables/useRemotePreferencesSync.ts` — adds `isRefreshing` (module
  state), `refreshNow` (on-demand counterpart to `syncOnLoad`: same
  fetch/validate/apply path via `refreshFromRemote`, bypasses the
  `isPreferencesStale` check, guards against a concurrent call), and
  `canRefreshNow` (exposes the same authenticated + complete-repo-config
  condition `syncOnLoad` already gates on, for the UI's visibility check).
- `src/components/StationManager.vue` — adds the "Actualiser les données"
  button, its confirmation dialog, and the wiring to `refreshNow` via a local
  `applyRemotePreferences` callback built from this component's own
  `useStationStorage`/`useDefaultFuelType` setters.
- `src/components/HomePageContent.vue` — its local `applyRemotePreferences`/
  `applyDefaultFuelOrRollback`/`applyDefaultFuel` trio is replaced by a call
  into the new shared util; behavior is unchanged.

## Non-Trivial Decisions

1. **Shared util instead of duplicating the rollback logic (touches a third
   file beyond the spec's listed two).** The rollback-on-failure behavior
   (roll back both the station list and `preferencesLastSyncedAt` together,
   security-guidelines.md rule 4) is security-critical and was already
   implemented once in `HomePageContent.vue`. Duplicating it verbatim into
   `StationManager.vue` risked the two copies drifting apart over time. Per
   Vue's composables guide, *pure* reusable logic (no lifecycle/reactive
   state of its own) belongs in a plain function, not a composable — so it
   was extracted into `src/utils/applyRemotePreferences.ts`, taking the
   caller's own setters as parameters (same style as
   `usePreferencesImport.ts`'s `applyDiff`). This was confirmed with the user
   before implementing, since it deviates from business-specifications.md's
   listed file set.

2. **`canRefreshNow` returned as a plain function, not a computed ref.** The
   composable never calls `useGitHubAuth()`/`useRepoConfig()` itself
   (composable-caller-responsibility convention), so it cannot own a
   `computed` over their state. It mirrors `useGitHubAuth.ts`'s
   `canInitiateLogin` — a pure function the caller evaluates against its own
   reactive state — rather than exposing `hasCompleteRepoConfig` directly and
   letting each caller re-derive the `isAuthenticated &&` condition.

3. **Confirmation dialog closes synchronously before `refreshNow` is
   awaited**, rather than staying open with its own disabled state during the
   fetch. The trigger button becomes the loading indicator instead (matches
   "Enregistrer les modifications"'s existing pattern), and closing
   synchronously — before any `await` — means there is no reactive frame
   where a second click could reopen it, so no separate re-entrancy guard is
   needed on the dialog itself.

4. **"Actualiser les données" is disabled (not hidden) while there are
   pending unsaved changes (`hasPendingChanges` from issue #110), with an
   explanatory message.** This was raised during self-review: a refresh
   replaces the entire local station list (rule 3), so confirming it while
   local edits are still unpushed to GitHub would silently discard those
   edits with no separate warning. Confirmed with the user, who chose
   "disabled with explanatory text" over hiding the action outright, for
   discoverability. **This condition is not currently written into
   business-specifications.md's Rule 1** (which lists only auth + repo
   config) or covered by any test-cases.md scenario — recommend a
   `/jli-writes-spec` pass to add it as a rule and a `/jli-writes-tests-spec`
   pass to add a covering test case before this is considered fully
   speced.

5. **Button label is in French** ("Actualiser les données" / "Actualisation…"
   / "Confirmer" / "Annuler"), matching every other UI string in
   `StationManager.vue`, rather than the English "Refresh data" from the
   issue title.

## Self-Review Fixes Applied

- Renamed the composable's exported visibility function from
  `isRefreshAvailable` to `canRefreshNow` — an `is`-prefixed name reads as a
  boolean/ref in this file (which also exports the genuinely reactive
  `isRefreshing`), risking a future caller treating it as one instead of
  calling it.
- Wrapped two lines exceeding the project's `printWidth: 100` (the button's
  attribute list and the `refreshNow(...)` call) to match Prettier's
  formatting.
- Disabled the refresh action while `hasPendingChanges` is true (see
  Decision 4) instead of allowing a confirmed refresh to silently discard
  unpushed local edits.

## Object Calisthenics Exceptions

- `StationManager.vue`'s `setup()` now calls seven composables at its top
  level (beyond the two-instance-variable guideline) — same documented
  framework exception already in place for six, extended by one for
  `useRemotePreferencesSync`.
- `useRemotePreferencesSync()`'s function body remains long for the same
  documented reason as before (grouping all returned reactive state/
  operations in one composable).

status: ready
