# Technical Specifications — Issue #110: UI and UX improvements

## Files Changed

- `src/types/preferences.ts` — replaced `RemoteWritePreview`'s `{ beforeJson, afterJson }` text
  shape with a field-level shape: new `StationFieldChange`, `StationChange` (discriminated union:
  `edited`/`added`/`removed`), and `FuelTypeChange` types.
- `src/composables/useRemotePreferencesWrite.ts` — added `pendingStationChanges` (module-level
  state), `hasPendingChanges` (computed) and `markStationChange` to the composable's public
  surface; `decodeAndValidateExistingFile` now returns the parsed `PreferencesFile` instead of
  re-serialised JSON text; the write-confirm preview is now built from
  `pendingStationChanges` + a fuel-type before/after comparison instead of raw JSON diffing.
- `src/components/StationManagerTable.vue` — station add/edit/delete no longer call
  `pushPreferences`; they call `markStationChange` with the specific field(s) that changed.
  Removed the now-unused `useGitHubAuth`/`useRepoConfig`/`useDefaultFuelType`/
  `buildPreferencesFile` imports.
- `src/components/StationManager.vue` — added the "Enregistrer les modifications" button
  (visible only while `hasPendingChanges` is true) and the composables/handler needed to trigger
  the batched push.
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

3. **`pushPreferences`'s public signature is unchanged** — it still reads
   `pendingStationChanges` internally rather than taking it as a parameter. This keeps
   `StationPricesContent.vue`'s existing fuel-type-only call site untouched: it naturally gets an
   empty `stationChanges` list (no station edits happened) and only ever shows a
   `fuelTypeChange`, satisfying the "default fuel type flow is unaffected" rule without an
   `if (source === ...)` branch anywhere.

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

## Known limitation (documented, not fixed — out of test-cases.md scope)

If the very same row is edited twice before "Enregistrer les modifications" is clicked (e.g. the
name field is blurred, then blurred again with a further change), each save appends its own
`edited` entry rather than merging into one before→final row — the dialog would show two rows for
that station instead of one collapsed row. `test-cases.md` only requires that edits to
*different* stations bundle correctly (covered), not that repeated edits to the *same* field
collapse. Left as-is to avoid a stable-identity/coalescing mechanism the spec doesn't ask for.

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

status: ready
