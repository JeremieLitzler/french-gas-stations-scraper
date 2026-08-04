# Technical Specifications — Issue #110: UI and UX improvements

## Files Changed

- `src/types/preferences.ts` — replaced `RemoteWritePreview`'s `{ beforeJson, afterJson }` text
  shape with a field-level shape: new `StationFieldChange`, `StationChange` (discriminated union:
  `edited`/`added`/`removed`), and `FuelTypeChange` types.
- `src/composables/useRemotePreferencesWrite.ts` — added `pendingStationChanges` (module-level
  state), `hasPendingChanges` (computed) and `markStationChange` to the composable's public
  surface; `decodeAndValidateExistingFile` now returns the parsed `PreferencesFile` instead of
  re-serialised JSON text; the write-confirm preview is now built from
  `pendingStationChanges` + a fuel-type before/after comparison instead of raw JSON diffing;
  `pushPreferences` takes a new `includeStationChanges: boolean` parameter so only the
  `StationManager`-triggered call bundles/clears `pendingStationChanges` (review fix, see decision
  #3).
- `src/components/StationManagerTable.vue` — station add/edit/delete no longer call
  `pushPreferences`; they call `markStationChange` with the specific field(s) that changed.
  Removed the now-unused `useGitHubAuth`/`useRepoConfig`/`useDefaultFuelType`/
  `buildPreferencesFile` imports.
- `src/components/StationManager.vue` — added the "Enregistrer les modifications" button
  (visible only while `hasPendingChanges` is true) and the composables/handler needed to trigger
  the batched push; calls `pushPreferences(..., includeStationChanges: true, ...)`.
- `src/components/StationPricesContent.vue` — `pushFuelTypeChange` now calls
  `pushPreferences(..., includeStationChanges: false, ...)` so a station edit pending in
  `StationManager` never leaks into a fuel-type-triggered push (review fix, see decision #3).
- `src/components/PreferencesDiffDialog.vue` — the GitHub write-confirm section's template now
  renders `writeDiff.stationChanges`/`writeDiff.fuelTypeChange` as field-level rows instead of
  `<pre>` JSON blocks; added `fieldLabel`/`stationChangeKey` helpers.
- `src/components/GitHubSyncSettings.vue` — the save/connect button row is now
  `flex-col` (stacked, full width) by default and `sm:flex-row` (side by side, auto width) from
  the `sm` breakpoint up.

## Non-trivial decisions

1. **Pending station changes are tracked as discrete recorded events, not derived by diffing two
   full station arrays.** A station's URL is its only identity, and comparing the GitHub-fetched
   "before" array against the current local "after" array by URL breaks the moment a URL itself
   is edited (it would show as a remove+add pair instead of a URL change) — and the business spec's
   example explicitly shows a URL field change as one row. Recording `{ field, before, after }` at
   the exact moment each edit is saved sidesteps the identity-matching problem entirely and is
   also what makes bundling multiple edits into one dialog straightforward.

2. **`pendingStationChanges` and `markStationChange` live in `useRemotePreferencesWrite`, not a
   new composable.** That composable already owns "what's about to be / was just pushed"
   (`writeDiff`, `pendingWrite`, `isWriting`); pending-but-not-yet-pushed changes are the same
   kind of state one step earlier in the same lifecycle. Splitting it into a second composable
   would force `StationManagerTable.vue` and `StationManager.vue` to each call two composables
   for one concern, and `useRemotePreferencesWrite` to import the new composable — which the
   composable-caller-responsibility convention forbids (composables never call other composables
   internally).

3. **`pushPreferences` takes an explicit `includeStationChanges: boolean` parameter** (added in
   review, replacing an earlier draft that read `pendingStationChanges` unconditionally). The
   earlier draft assumed `StationPricesContent.vue`'s fuel-type-only call site would "naturally"
   see an empty `stationChanges` list — that assumption breaks the moment a station edit is
   pending in `StationManager` at the time the user saves a default fuel type: both components
   render on the same page, so `pendingStationChanges` is genuinely non-empty at that call site
   too. `StationManager.vue` passes `true` (it is the intended trigger for bundling and clearing
   station edits); `StationPricesContent.vue` passes `false`, so a station edit still pending
   review in `StationManager` is never bundled into, shown by, or cleared by a fuel-type push
   (business-specifications.md: "the default fuel type save flow ... is unaffected").

4. **The pending-changes snapshot is taken synchronously at the top of `pushPreferences`, before
   the `fetchExistingFile` GET, and only that snapshot is cleared on success** (via
   `clearPendingStationChanges`'s reference-based filter, not a blind `= []`). Implements
   security-guidelines.md rule 3: the GET is the only await between "button clicked" and "dialog
   shown", so without freezing the snapshot first, an edit made during that window could appear
   in the dialog but be silently dropped by a later full clear — or be pushed without ever having
   been shown. Any edit made during the window stays pending afterwards for the next save.

5. **`decodeAndValidateExistingFile` now returns the parsed `PreferencesFile` instead of
   re-serialised JSON text.** The write-confirm dialog no longer needs the full remote text, only
   the single `fuelTypeDefault` field for comparison — returning the already-validated object
   avoids a pointless re-serialise/re-parse round trip and keeps `parseJsonFile`'s shape
   validation (security-guidelines.md issue #64 rule 8) as the sole gate before the value is used.

6. **`stationChangeKey` prefixes every generated key with `change.kind`** (`edited-<url>`,
   `added-<url>`, `removed-<url>`) rather than the bare URL, so a `v-for` key collision can never
   occur even if an edited and a removed/added entry happen to reference the same URL within one
   batch.

## Known limitations (documented, not fixed — out of test-cases.md scope)

1. If the very same row is edited twice before "Enregistrer les modifications" is clicked (e.g.
   the name field is blurred, then blurred again with a further change), each save appends its
   own `edited` entry rather than merging into one before→final row — the dialog would show two
   rows for that station instead of one collapsed row. `test-cases.md` only requires that edits to
   *different* stations bundle correctly (covered), not that repeated edits to the *same* field
   collapse. Left as-is to avoid a stable-identity/coalescing mechanism the spec doesn't ask for.

2. The fuel-type-triggered push (`includeStationChanges: false`) can no longer surface a real
   station-list drift against the remote file that isn't currently sitting in
   `pendingStationChanges` (e.g. a previous push failed and was cleared elsewhere, or the remote
   was changed from another device) — decision #1 sources station diffs only from the tracked
   `StationChange` event log, not from comparing the fetched remote array against the local one.
   Pre-issue-110 behaviour could surface this via full JSON diffing; re-deriving it here would mean
   reintroducing array-comparison diffing for one call site only, which test-cases.md does not ask
   for and which decision #1 deliberately moved away from. The PUT content itself is unaffected —
   it always sends the full, current, correct preferences file; only the write-confirm *preview*
   would miss an unreviewed station-side drift on a fuel-type-only save. Flagged for a follow-up
   issue if this turns out to matter in practice.

## Self-review: issues found and fixed

1. **Fixed** — an earlier draft cleared `pendingStationChanges.value = []` unconditionally on
   success. Since the snapshot is taken before an `await`, any edit made while that GET was in
   flight would have been silently discarded (not pushed, not shown, and now not pending either).
   Replaced with `clearPendingStationChanges`, which removes only the entries the completed push
   actually covered.
2. **Fixed** — `markStationChange` could be called with a zero-length `fieldChanges` array,
   producing a blank "edited" row (a station heading with nothing under it) in the confirmation
   dialog. `saveExistingRow` now only calls `markStationChange` when `buildFieldChanges` returns
   at least one entry.
3. **Fixed** — `stationChangeKey` initially used the bare station URL for every change kind. A
   station removed and a *different* new station added with the same URL later in the same
   session (or any coincidental URL reuse across change kinds within one batch) would have
   produced duplicate `:key` values. Prefixed every generated key with the change's `kind`.
4. **Fixed (review loop-back)** — `pushPreferences` read the shared `pendingStationChanges`
   unconditionally, so a station edit still pending in `StationManager` leaked into a fuel-type
   push from `StationPricesContent.vue`: it could be pushed with zero review (create-file path) or
   shown/cleared from a dialog opened by the wrong button. Added the `includeStationChanges`
   parameter (decision #3) so only the `StationManager`-triggered call bundles and clears
   `pendingStationChanges`.

## Test impact for the next phase

`src/composables/useRemotePreferencesWrite.spec.ts` (written for issue #64) asserts
`writeDiff.value?.beforeJson`/`afterJson` in two scenarios — D-1 (lines ~158-160) and D-2 (lines
~181-182). Those two assertions no longer compile against the new `RemoteWritePreview` shape and
must be rewritten to assert against `stationChanges`/`fuelTypeChange`. Because station changes are
now caller-tracked rather than derived, D-1/D-2's setup will also need an explicit
`markStationChange(...)` call before `pushPreferences(...)` to populate what the dialog should
show — the composable alone can no longer infer "a station was added/renamed" from a before/after
`PreferencesFile` pair. D-3 through D-9 assert PUT bodies, success flags, and error messages, none
of which changed shape, and should be unaffected.

`pushPreferences` also gained a new required `includeStationChanges: boolean` parameter (4th
positional argument, before the existing optional `onUnauthorized` callback — review fix, decision
#3). Every existing `pushPreferences(true, REPO_CONFIG, ...)` call in
`useRemotePreferencesWrite.spec.ts` (D-1 through D-9) needs `true` inserted as the 4th argument to
keep exercising the `StationManager`-equivalent path; a new test case should call it with `false`
and assert a pending `markStationChange(...)` entry is neither bundled into the preview/PUT
content nor cleared on success, covering the fuel-type-flow isolation this fix adds.

status: ready
