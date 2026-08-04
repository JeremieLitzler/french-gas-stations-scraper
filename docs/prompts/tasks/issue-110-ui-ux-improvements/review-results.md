# Review Results — Issue #110: UI and UX improvements

lint: fails, but only on two files not in scope of this task (`usePreferencesExport.spec.ts`,
`usePreferencesImport.spec.ts`) — confirmed via `git diff develop...HEAD` to be untouched by this
branch; pre-existing from issues #63/#69. Not caused by this implementation.

```
E:\...\src\composables\usePreferencesExport.spec.ts
  39:5  error  'lastDownloaded' is assigned a value but never used  @typescript-eslint/no-unused-vars

E:\...\src\composables\usePreferencesImport.spec.ts
   36:15  error  'PreferencesDiff' is defined but never used       @typescript-eslint/no-unused-vars
   71:33  error  '_s' is defined but never used                    @typescript-eslint/no-unused-vars
   72:36  error  '_url' is defined but never used                  @typescript-eslint/no-unused-vars
   72:50  error  '_s' is defined but never used                    @typescript-eslint/no-unused-vars
   73:42  error  '_label' is defined but never used                @typescript-eslint/no-unused-vars
  433:34  error  '_url' is defined but never used                  @typescript-eslint/no-unused-vars
  466:34  error  '_url' is defined but never used                  @typescript-eslint/no-unused-vars
  468:11  error  'externalUrl' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 9 problems (9 errors, 0 warnings)
```

type-check: fails, but exactly as anticipated and documented in
`technical-specifications.md`'s "Test impact for the next phase" section — the `RemoteWritePreview`
shape change breaks two pre-existing assertions in
`src/composables/useRemotePreferencesWrite.spec.ts` that `/jli-writes-tests` will rewrite.

```
src/composables/useRemotePreferencesWrite.spec.ts(158,29): error TS2339: Property 'beforeJson' does not exist on type 'RemoteWritePreview'.
src/composables/useRemotePreferencesWrite.spec.ts(159,29): error TS2339: Property 'beforeJson' does not exist on type 'RemoteWritePreview'.
src/composables/useRemotePreferencesWrite.spec.ts(160,29): error TS2339: Property 'afterJson' does not exist on type 'RemoteWritePreview'.
src/composables/useRemotePreferencesWrite.spec.ts(181,29): error TS2339: Property 'beforeJson' does not exist on type 'RemoteWritePreview'.
src/composables/useRemotePreferencesWrite.spec.ts(182,29): error TS2339: Property 'afterJson' does not exist on type 'RemoteWritePreview'.
```

## Checklist findings

### 1. `pendingStationChanges` is a shared singleton consumed unconditionally by `pushPreferences`, leaking into the fuel-type flow the ADR addendum says is "unaffected"

- Where: `src/composables/useRemotePreferencesWrite.ts:356` (`stationChangesSnapshot = pendingStationChanges.value` inside `pushPreferences`), consumed by both call sites — `src/components/StationManager.vue:25-28` (`onSaveChanges`, the intended trigger) and `src/components/StationPricesContent.vue:199-202` (`pushFuelTypeChange`, called from `onSaveDefault`).
- What's wrong: `pushPreferences` has no way to know which caller invoked it, so it always reads and bundles the *global* `pendingStationChanges` list — the one meant to represent "edits made in `StationManagerTable` since the last click of 'Enregistrer les modifications'". `StationPricesContent.vue`'s fuel-type save was never changed to exclude it (technical-specifications.md's decision #3 explicitly assumes "it naturally gets an empty stationChanges list" — that assumption doesn't hold once a station edit is pending at the time the user saves a fuel type).
- Failure scenario: user edits a station's name in `StationManager` (saved to IndexedDB, `markStationChange` records it, "Enregistrer les modifications" becomes visible) but does not click it. They then go select a new default fuel type and click "Enregistrer" in `StationPricesContent` (same page, no navigation needed — both components render together, see `src/pages/index.spec.ts`). `onSaveDefault` → `pushFuelTypeChange` → `pushPreferences` silently scoops up the pending station edit: if no remote file exists yet it is pushed with zero review (`createRemoteFile`, no dialog per Sub-Issue D rule 2); if a remote file exists, the write-confirm dialog opens from the fuel-type "Enregistrer" click showing an unrelated station change the user never asked to review from that button. Either way, `clearPendingStationChanges` then hides "Enregistrer les modifications" in `StationManager` — even though the user never clicked it. This contradicts business-specifications.md's explicit scoping ("the issue only scopes the new button to `StationManager`") and ADR-012's addendum ("the default fuel type save flow... unaffected by this addendum").
- Same root cause also works in reverse: because station-side diffing is now sourced only from the tracked `stationChanges` list (not derived by comparing before/after station arrays), a real station-list drift against the remote file that isn't currently sitting in `pendingStationChanges` (e.g. a previous push failed and was cleared, or the remote diverged from another device) will no longer surface in the fuel-type-triggered dialog at all, even though the full current station list is still included in the PUT content.
- Suggested direction: give `pushPreferences` an explicit parameter (e.g. `includeStationChanges: boolean`, or have `StationPricesContent.vue` pass an empty array) so only the `StationManager`-triggered call bundles/clears `pendingStationChanges`, keeping the fuel-type flow's write scoped to `fuelTypeChange` only as the business spec requires.

All other checklist items ✓

status: changes requested
