# Technical Specifications — Issue #63: Export/Import User Preferences

## Files Created or Modified

### New files

| File | Description |
|------|-------------|
| `src/types/preferences.ts` | Defines `PreferencesFile`, `DiffRowKind`, `StationDiffRow`, `FuelTypeDiff`, and `PreferencesDiff` types. |
| `src/utils/preferencesExport.ts` | Pure functions: `buildPreferencesFile` (serialise state → JSON shape) and `downloadPreferencesFile` (trigger browser download). |
| `src/utils/preferencesImport.ts` | Pure functions: `isFileSizeAcceptable`, `parseJsonFile` (parse + validate the imported JSON), `computeDiff` (diff imported file against stored state). |
| `src/composables/usePreferencesExport.ts` | Singleton composable — exposes `isExporting` and `exportPreferences`. Reads current state from `useStationStorage` and `useDefaultFuelType`, serialises and downloads. |
| `src/composables/usePreferencesImport.ts` | Singleton composable — exposes `diff`, `importError`, `importSuccess`, `isDialogOpen`, `handleFileSelected`, `applyDiff`, `cancelImport`, `resetState`. Orchestrates file validation, diff computation, and writing back to IndexedDB. |
| `src/components/PreferencesExport.vue` | Button that calls `exportPreferences`. Disabled while exporting. |
| `src/components/PreferencesImport.vue` | File input (hidden, triggered via a styled label/button). Calls `handleFileSelected` on change. Shows error and success messages. |
| `src/components/PreferencesDiffDialog.vue` | Modal dialog rendered via `<Teleport to="body">`. Displays the diff table (station rows) and fuel type diff. Provides conflict resolution controls (radio buttons for name conflicts, checkboxes for new stations). Confirm button is disabled until all conflicts are resolved. |

### Modified files

| File | Description |
|------|-------------|
| `src/components/StationManager.vue` | Added `<PreferencesExport />`, `<PreferencesImport />` buttons above the station table, and `<PreferencesDiffDialog />` at the bottom. |

## Technical Choices

### Validation in utils, not in composable

All JSON parsing and validation logic lives in `src/utils/preferencesImport.ts` as pure functions. The composable (`usePreferencesImport`) is a thin orchestrator. This separation makes the validation logic independently testable without mounting Vue components or mocking reactive state.

### Diff as immutable computation, mutations applied separately

`computeDiff` returns a fresh `PreferencesDiff` object. User choices (chosenName, selected) are applied as direct mutations on the diff rows via the dialog component. This avoids a second data structure and keeps the diff state co-located with the display model. The alternative — keeping a separate "choices" map — would require synchronisation between the two structures.

### Composable caller responsibility for addStation / updateStation

`applyDiff` receives `addStation`, `updateStation`, `saveDefaultFuelType`, and `clearDefaultFuelType` as parameters rather than calling other composables internally. This follows the project's composable caller responsibility rule (CLAUDE.md) — composables must not call other composables inside functions, only at the top level of setup.

### File size guard before JSON.parse

The size check (`isFileSizeAcceptable`) runs before `file.text()` and `JSON.parse`. A 1 MB limit is generous for a preferences file (which would typically be a few kilobytes) and prevents parsing-induced tab hangs from adversarially large files (security guideline 4).

### Prototype pollution guard on every parsed object

`hasDangerousKey` is called on the top-level object and on every station entry. This guard runs before any property access, ensuring that `__proto__`, `constructor`, or `prototype` keys never reach application code.

### No `<dialog>` element — manual overlay with Teleport

The diff dialog uses a `<div role="dialog">` rendered via `<Teleport to="body">` rather than the native `<dialog>` element. The project already follows this pattern (no native `<dialog>` precedent). The native element would require `.showModal()` / `.close()` imperative calls that conflict with Vue's reactive template-driven approach.

Object Calisthenics exception: `PreferencesDiffDialog.vue` exceeds the fifty-line entity limit because it bundles template markup and script logic in a single SFC — Vue SFC conventions require this co-location, and splitting the template into sub-components would add excessive component hierarchy for a self-contained modal.

## Self-Code Review — Bugs and Improvements Found

1. **`cancelImport` did not reset `importSuccess`** — Fixed: `importSuccess.value = false` added to `cancelImport`.
2. **`applyDiff` has no guard for unresolved conflicts** — Acceptable: the confirm button is always disabled via `isConfirmEnabled` in the dialog. A defensive guard would add noise without a user-visible benefit in the current architecture.
3. **`downloadPreferencesFile` revokes the object URL synchronously after `anchor.click()`** — On most browsers `click()` is asynchronous (the download is queued). Revoking immediately after `click()` is the standard pattern and is safe because the browser has already queued the download by the time `revokeObjectURL` runs.

status: ready
