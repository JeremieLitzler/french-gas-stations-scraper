# Feature 9 — Export / Import to and from JSON files

## Purpose

Lets the user download their current preferences as `preferences.json` and re-import that file on the same or a different device, with a diff-and-resolve step before anything is written to IndexedDB. It exists for users who do not use GitHub sync.

## Implementing code

- `src/utils/preferencesExport.ts` — pure functions serialising IndexedDB state to the `PreferencesFile` JSON.
- `src/utils/preferencesImport.ts` — pure functions validating and diffing an imported file against IndexedDB.
- `src/composables/usePreferencesExport.ts` — singleton; orchestrates the export flow.
- `src/composables/usePreferencesImport.ts` — singleton; orchestrates the import flow (validate, diff, apply), including the `fuelTypeDefault` check owned by Feature 4.
- `src/components/PreferencesExport.vue` — the export button.
- `src/components/PreferencesImport.vue` — the file-input trigger and import feedback; uses `<Suspense>` with a visible loader while async work runs.
- `src/components/PreferencesDiffDialog.vue` — the diff table, the per-conflict pickers, and confirm/cancel (shared with Feature 7's push confirmation).
- `src/components/StationManager.vue` — mounts the export and import controls.
- `src/types/preferences.ts` (`PreferencesFile`, diff-row types).

## Behaviour & rules

**Export.** Serialises the current IndexedDB state — station list plus default fuel type — into the `PreferencesFile` shape and downloads it under a fixed filename: `preferences.json`.

**Import — validation first.** Before any UI is shown, the file is parsed and validated. It is rejected, with a user-visible error and no diff UI, if:

- it is not valid JSON;
- a required key is missing;
- `favoriteStations` is not an array;
- a station entry is missing `name` or `url`;
- a station URL fails the origin + path-prefix check;
- or a station name fails the name check (the same rules as Feature 5).

**Import — diff UI.** After successful validation, and before writing anything: a station comparison table plus one line for the default fuel type. Only items that differ are shown; identical items are omitted; the fuel-type line appears only when its value differs.

**Conflict handling.**

- Same URL in IndexedDB, different name in the file: the row shows both; the user picks which name to keep. Cannot proceed until resolved.
- URL in the file but not in IndexedDB: the row is labelled "Ajoutée" and pre-selected for import; the user may deselect it.
- URL matching ignores query parameters — only the path is compared (the source website does not support query strings on station URLs).
- Stations in IndexedDB but absent from the file are not shown and not modified. Import is additive / update-only; it never deletes existing stations.
- Fuel-type conflict (the file's `fuelTypeDefault` differs from the stored value, including one being empty/null): both are shown and the user must choose before confirming.

**Confirm and apply.** Every difference must have a selection before confirmation. On confirm, only the resolved choices are applied to IndexedDB via `useStationStorage` and `useDefaultFuelType`; a success message follows.

**No-op.** If the validated file is identical to the current IndexedDB state, the user is told no changes were found and no diff UI is shown.

**`fuelTypeDefault` check.** Runs after shape validation — see Feature 4's import-time validation rule: an unrecognised value is discarded with a French warning; `null` is always accepted.

## Related ADRs

- [ADR-008](../../decisions/ADR-008-client-side-storage.md) — IndexedDB is the import target and export source.
- [ADR-002](../../decisions/adr-002-state-management.md) — singleton composable for shared state.

## See also

- **Feature 2** uses the identical `PreferencesFile` shape against GitHub instead of a local file.
- **Feature 7** shares `PreferencesDiffDialog` (its before/after mode vs this feature's per-row merge mode).
- **Feature 4** owns the `fuelTypeDefault` validation this flow triggers.
- **Feature 5** owns the station name/URL validation rules reused here.

_Source specs (in git history): `issue-63` (shared diff component: `issue-64` sub-issue D; fuel-type check: `issue-66`)._
