# Technical Specifications — Sub-Issue C (#85): Read Preferences from Remote Repo on Load

## Summary of files created/changed

- `src/types/remote-preferences.ts` — new. `RemotePreferencesFile` (`{ stations, defaultFuel }`),
  the exact shape of the JSON file synced to the user's GitHub repo, shared by this sub-issue and
  the future Sub-Issue D write path.
- `src/utils/preferencesSyncTimestamp.ts` — new, changed in review pass 2. Pure IndexedDB-backed
  helpers: `markPreferencesSynced()` (writes `Date.now()` under `preferencesLastSyncedAt`),
  `isPreferencesStale(revalidateCacheDays)` (compares the stored timestamp's age against the
  threshold; treats an absent timestamp as stale), `getPreferencesSyncedAt()` (reads the raw
  stored value), and `restorePreferencesSyncedAt(timestamp)` (writes back a captured value, or
  deletes the key when it was previously absent) — the latter two added in review pass 2 to let
  a rolled-back remote merge undo the timestamp resets it triggered along the way.
- `src/composables/useRemotePreferencesSync.ts` — new. Singleton composable exposing
  `syncError` and `syncOnLoad(isAuthenticated, repoConfig, applyRemotePreferences, onUnauthorized)`.
  Skips entirely when unauthenticated, repo config is incomplete, or local data is still fresh;
  otherwise fetches the remote file via `github-api-proxy`, decodes/validates it, and delegates
  applying it to the caller-supplied `applyRemotePreferences` callback.
- `src/composables/useStationStorage.ts` — changed. Added `replaceStations(newStations)` (bulk
  replace for the remote merge, filtering out entries that fail the same URL/name validation
  `addStation` enforces). `addStation`/`removeStation`/`updateStation`/`replaceStations` now all
  call `markPreferencesSynced()` after a successful write (business-specifications.md Sub-Issue C
  rules 4–5: both a successful remote read and a user-triggered update reset the timestamp).
- `src/composables/useDefaultFuelType.ts` — changed. `saveDefaultFuelType`/`updateDefaultFuelType`/
  `clearDefaultFuelType` now also call `markPreferencesSynced()`, same rationale as above.
- `src/components/StationPricesContent.vue` — changed. Wires `useGitHubAuth`, `useRepoConfig`, and
  `useRemotePreferencesSync` alongside the existing `useStationStorage`/`useDefaultFuelType` calls,
  per the composable-caller-responsibility convention. Loads auth state, repo config, stations, and
  default fuel type in parallel, then runs `syncOnLoad` (which may replace both) before the existing
  `loadAllStationPrices` call, then renders `syncError` as a non-blocking banner.

## Non-trivial decisions

- **Where the sync runs: `StationPricesContent.vue`, not a new top-level wrapper.** "On application
  load" (rule 1) has no single existing entry point — `index.vue` is a thin static shell, and both
  `StationPricesContent.vue` and `StationManagerTable.vue` already independently call `loadStations()`
  in their own `<script async setup>`. `StationPricesContent.vue` is the one already wrapped in
  `<Suspense>` (via `StationPrices.vue`) and already the first place `stations`/`defaultFuelType` are
  loaded, so it's the natural place to also settle the remote sync before those singletons are read
  by `loadAllStationPrices`. `StationManagerTable.vue` needs no changes: `stations` is a shared
  singleton ref (ADR-002), so its own `watch(stations, ..., { immediate: true })` picks up a remote
  replace regardless of which component mounted first.
- **`syncOnLoad` runs after `loadStations()`/`loadDefaultFuelType()` but before `loadAllStationPrices`.**
  Ordering matters only for the last step: if remote data replaces the station list, the price fetch
  must use the fresh list, not the stale local one it just replaced. The auth/repo-config/stations/
  default-fuel loads themselves have no data dependency on each other, so they run via `Promise.all`.
- **`markPreferencesSynced()` lives inside each setter (`replaceStations`, `addStation`, `removeStation`,
  `updateStation`, `saveDefaultFuelType`, `updateDefaultFuelType`, `clearDefaultFuelType`), not called
  once by `useRemotePreferencesSync` after the merge.** Rule 4 (reset after a successful remote read)
  and rule 5 (reset after a user-triggered update) both want the same outcome — timestamp = now. Since
  applying a remote merge calls the same setters a user edit would call, reusing their existing
  timestamp reset avoids a second, redundant explicit call and keeps one setter change instead of two
  call sites needing to remember to mark synced.
- **`useRemotePreferencesSync` never calls `useGitHubAuth`, `useRepoConfig`, `useStationStorage`, or
  `useDefaultFuelType` itself** — per this command's composable-caller-responsibility rule. The
  caller (`StationPricesContent.vue`) passes `isAuthenticated`/`repoConfig` as values and an
  `applyRemotePreferences` callback built from `replaceStations`/`saveDefaultFuelType`/
  `clearDefaultFuelType`, mirroring the `onUnauthorized` callback pattern `useRepoConfig.ts`
  already established for the same reason.
- **A malformed/missing `stations` field in the remote JSON is treated as a parse failure (`syncError`
  set, IndexedDB untouched), not as an empty list.** `parseStations` returns `null` (not `[]`) when
  the field isn't an array, so `parseRemoteJson` rejects the whole payload — otherwise a corrupted
  remote file could silently wipe the local station list via `replaceStations`. Individual malformed
  *entries* inside an otherwise-valid array are still dropped (shape-checked here, fully re-validated
  by `replaceStations`), consistent with `loadStations`' existing forgiving treatment of bad entries
  in already-stored local data.
- **401 handling reuses `useRepoConfig.ts`'s established pattern**: `notifyUnauthorized` always
  resolves (try/catch around the optional `onUnauthorized` callback) and `syncError` is always set to
  a fixed message, rather than gating on whether the callback succeeds. The `github-api-proxy`
  function already clears the `gh_token` cookie unconditionally on any 401 (security-guidelines.md
  rule 5) before the SPA ever sees the response, so business-specifications.md's edge case ("if he
  refuses, the cookie is cleared...") is resolved the same way Sub-Issue B already resolved it: the
  cookie clear is unconditional and server-side, not gated on a user prompt the SPA would need to
  build. `syncError` doubles as the "warning banner" the edge case calls for.
- **404/network/other fetch failures collapse into one generic `syncError` message.**
  business-specifications.md's edge cases list network error, 404, and 401 together as "the app asks
  the user to reauthenticate," with 401 singled out only for the extra cookie/banner detail already
  covered above. A single `REMOTE_FETCH_FAILED_MESSAGE` for the non-401 cases matches that literal
  grouping without inventing a wrong-file-path-specific message the spec doesn't ask for.

## Object Calisthenics exceptions

- `useRemotePreferencesSync()`'s returned function body groups reactive state and one operation in
  one composable — same documented framework exception used throughout this codebase
  (`useGitHubAuth.ts`, `useRepoConfig.ts`, `useStationStorage.ts`).
- `splitOwnerRepo` is duplicated (not extracted to a shared util) between `useRepoConfig.ts` and this
  new composable, matching this codebase's existing precedent of small validator duplication across
  files (e.g. `isValidUrl`/`isValidName`/`stripHtmlTags` are already duplicated between
  `useStationStorage.ts` and `preferencesImport.ts`) rather than introducing a new shared-utils module
  for a four-line function.

## Self-code review fixes applied

1. **Uncaught-exception crash risk in base64/JSON decoding.** `atob()` throws a `DOMException` on
   invalid base64 (a corrupted or unexpected `content` field from GitHub); this was unguarded and
   would have propagated out of `syncOnLoad` into `StationPricesContent.vue`'s top-level `<Suspense>`
   `await`, breaking the whole page's initial render instead of degrading to a sync-error banner.
   Wrapped the decode+parse call in `fetchRemotePreferences` in a `try/catch` that resolves to the
   `'error'` outcome.
2. **Uncaught-exception crash risk when applying the merge.** `applyRemotePreferences` (which writes
   through `useStationStorage`/`useDefaultFuelType`) can reject on an IndexedDB failure; this was
   unguarded in `refreshFromRemote`; for the same reason as above, an unhandled rejection here would
   have crashed the page instead of leaving the still-valid local data in place. Wrapped the call in
   `try/catch`, falling back to `REMOTE_FETCH_FAILED_MESSAGE` on failure.
3. **Malformed remote file could silently wipe local data.** `parseStations` originally defaulted a
   missing/wrong-type `stations` field to `[]` rather than rejecting the payload, so a corrupted
   remote file (valid JSON, but `stations` renamed/omitted) would have replaced the local station
   list with an empty one via `replaceStations` instead of failing safely. Changed `parseStations` to
   return `null` for a missing/wrong-type field, which `parseRemoteJson` now propagates as a full
   parse failure (IndexedDB left untouched, `syncError` shown) — matching C-8's "IndexedDB data is
   not modified" requirement for corrupt data too, not just HTTP failures.

## Review fixes applied (review-results.md, sub-issue-85)

4. **`applyRemotePreferences` was not atomic.** It called `replaceStations(data.stations)` and then
   `saveDefaultFuelType`/`clearDefaultFuelType` as two independent IndexedDB writes inside one
   `try/catch` in `refreshFromRemote`. If the first succeeded and the second threw, the station list
   was already replaced from remote while the default fuel stayed stale — yet `syncError` showed a
   generic "please reconnect" message that implied nothing had changed, contradicting Sub-Issue C
   rule 3 ("merges ... into IndexedDB" as one operation) and this file's own item 2 above (which
   assumed the fallback left "local data in place"). Fixed in `StationPricesContent.vue`: capture
   `stations.value` before the merge, and if the default-fuel write throws after the station write
   succeeded, roll the station list back to its pre-merge value via `replaceStations` before
   re-throwing, so the existing `syncError` message is accurate again. A true single-transaction
   write across both IndexedDB keys would require a new multi-key primitive in `indexedDb.ts`; a
   compensating rollback of the one setter that can succeed-then-be-followed-by-a-failure is the
   minimal fix that restores the stated guarantee without that broader change.

## Review fixes applied (review-results.md, sub-issue-85, second pass)

5. **The rollback from fix #4 left the sync timestamp marked fresh despite the merge failing.**
   `replaceStations` (called both for the initial station write and for the rollback itself) and
   `saveDefaultFuelType`/`clearDefaultFuelType` all call `markPreferencesSynced()` unconditionally
   as part of their contract for direct user edits (Sub-Issue C rule 5). During a failed merge,
   this meant the rollback's own `replaceStations(previousStations)` call re-stamped the timestamp
   to "now" a second time, even though neither call was a successful remote read (rule 4) nor a
   real user edit — so a failed merge left IndexedDB looking freshly synced, and the next page
   load's `isPreferencesStale` check would skip retrying the fetch that had just failed, for a
   full `revalidateCacheDays` period, with no further error shown. Fixed by capturing the
   timestamp via a new `getPreferencesSyncedAt()` before the merge starts and restoring it via a
   new `restorePreferencesSyncedAt(timestamp)` after the rollback's `replaceStations` call, so a
   failed merge leaves both the station data and the staleness state exactly as they were before
   the sync attempt.

### Specifications Need Review

`parseRemoteJson` currently rejects the *entire* remote file (returns `null`, IndexedDB
untouched, generic `REMOTE_FETCH_FAILED_MESSAGE` shown) when **either** `stations` **or**
`defaultFuel` fails to parse — even if the other field is perfectly valid. This coupling was an
implementation choice made by analogy to the `stations`-corruption rationale already documented
above ("Non-trivial decisions", item on malformed `stations`); it was never derived from
`business-specifications.md`.

Checked `business-specifications.md` (Sub-Issue C) and `test-cases.md` (C-1..C-9): the spec only
defines "reject the whole file, leave IndexedDB untouched" for **fetch failures** — network
error, 404, 401 (edge cases under Sub-Issue C, and C-8/C-9). It says nothing about what happens
when the fetch succeeds but only one of the two fields in the JSON body is malformed. `stations`
and `defaultFuel` are independent fields with no logical dependency on each other, so treating a
malformed `defaultFuel` as invalidating an otherwise-valid `stations` array (or vice versa) isn't
something the spec asks for — and the resulting `REMOTE_FETCH_FAILED_MESSAGE` ("Merci de vous
reconnecter") is actively misleading in that case, since nothing about authentication or the
fetch itself failed.

Please clarify Sub-Issue C to state explicitly whether a partially-malformed remote file should:
(a) still reject the whole sync (current behavior, made explicit and intentional rather than
incidental), or (b) apply whichever field parsed successfully and leave the other untouched
locally, with a distinct "remote file partially malformed" message instead of the re-auth one.

status: review specs
