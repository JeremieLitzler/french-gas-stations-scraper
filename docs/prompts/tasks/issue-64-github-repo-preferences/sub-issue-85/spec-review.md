# Spec Review — Sub-Issue C (#85): Read Preferences from Remote Repo on Load

**Source:** live investigation during a `/jli-codes` loop-back, not a PR review. The user manually
edited `DEFAULT_STATIONS` to `[]` in `src/composables/useStationStorage.ts` while testing and
reported the station list still didn't reflect the remote GitHub file — flagged as "part of the
sub issue but left out."

## Finding 1 — `DEFAULT_STATIONS` seed list is now obsolete

`useStationStorage.ts` unconditionally merges a hardcoded `DEFAULT_STATIONS` list (5 example
stations, documented in the README as the app's first-run seed) into `stations.value` on every
`loadStations()` call, for any URL not already present in IndexedDB — regardless of whether
GitHub sync is configured or authenticated. This predates issue #64 and was never updated to
account for the remote repo now being an available source of truth.

**Resolved by the user, not open for debate:** the static seed list is obsolete. All components
must render from remote/IndexedDB data only. When there are zero stations, the UI shows
**"Aucune station pour le moment"** and invites the user to add one via the Station Manager. The
user's `DEFAULT_STATIONS = []` edit is the intended end state, not a diagnostic workaround — it
should be formalized (and the seed-merge logic in `loadStations()`/`mergeWithDefaults()` likely
removed outright) rather than reverted.

## Finding 2 — remote sync is wired into only one of two components sharing the `stations` singleton

`index.vue` renders `<StationPrices>` (wraps `StationPricesContent.vue`) and `<StationManager>`
(wraps `StationManagerTable.vue`, inside a collapsed `<details>` — Vue still mounts it immediately
regardless of collapsed state) side by side. Both independently call
`useStationStorage().loadStations()` on mount; both read/write the same module-level `stations`
ref (ADR-002 singleton). **Only `StationPricesContent.vue` calls
`useRemotePreferencesSync().syncOnLoad()`.**

Consequence: `StationManagerTable.vue`'s local-only `loadStations()` (fast, no network) resolves
and renders first; `StationPricesContent.vue`'s slower chain (includes a network round-trip to the
GitHub proxy) only later calls `replaceStations()` to correct the shared ref. In the happy path
this is a brief flash of stale/local data; if that second step is slow, fails, or auth/repo-config
isn't ready, the station list shown everywhere the user actually manages stations reflects only
local/seed data indefinitely — which is what the user observed.

This was a known trade-off in the original Sub-Issue C implementation (see
`technical-specifications.md`'s "Non-trivial decisions" history): it assumed the shared singleton
would "catch up" once `StationPricesContent.vue` finished syncing. That assumption doesn't hold
once the fallback it was catching up *from* (`DEFAULT_STATIONS`) is removed and replaced with a
component that must correctly render an authoritative empty state instead.

**Not yet resolved — three options were presented, user has not picked one yet:**

1. **Centralize in `index.vue`** — move auth/repo-config/stations/sync loading up to `index.vue`
   as one async sequence that resolves before `StationPrices`/`StationManager` mount. Matches
   business-specifications.md's literal "on application load" wording; removes the race entirely;
   no duplicate network calls. Larger diff — touches `index.vue`, `StationPricesContent.vue`,
   `StationManagerTable.vue`, likely needs a page-level `<Suspense>` boundary.
2. **Duplicate the sync into `StationManagerTable.vue`** — smaller diff, stays within existing
   file boundaries, but both components would independently fetch from the GitHub proxy and could
   both attempt a rollback/replace concurrently.
3. **Gate on a shared "sync settled" flag** — new ref in `useRemotePreferencesSync` that
   `StationManagerTable.vue` awaits before rendering; keeps `StationPricesContent.vue` as sole
   trigger, avoids duplicate fetches, but adds a new synchronization primitive and still depends
   on `StationPricesContent.vue` mounting/succeeding at all.

The empty-state decision (Finding 1) likely lowers the stakes of whichever option is picked — the
worst case becomes a harmless flash of "Aucune station pour le moment" rather than fake stations —
but the spec should still say explicitly which component(s) own "on application load" so this
isn't left implicit a second time.

## Why this needs a new spec round rather than continuing in `/jli-codes`

- Both findings are new requirements, not implementations of anything currently in
  `business-specifications.md` — Sub-Issue C only describes merging remote data into IndexedDB, it
  says nothing about empty-state rendering or which component(s) trigger the sync.
- Finding 1 reaches beyond issue #64: `DEFAULT_STATIONS` is the app's general first-run experience
  for every user, not just ones with GitHub sync configured. Removing a documented feature
  (README-listed seed list) is a product decision, not a bug fix.
- Per `CLAUDE.md`: spec-first, and "never silently make a decision that affects architecture or
  data shape" — both apply directly to Finding 2's unresolved options.

## Scope suggested for the next `/jli-writes-spec` pass

- Formalize removal of `DEFAULT_STATIONS`/the seed-merge mechanism from `useStationStorage.ts`.
- Define the empty-state UI ("Aucune station pour le moment" + invitation to use the Station
  Manager) — which component(s) render it (`StationPricesContent.vue` only? Also
  `StationManagerTable.vue`?).
- Pick and document one of the three options above (or another) for which component(s) own
  triggering `syncOnLoad` on application load, closing the race this file describes.

status: review specs
