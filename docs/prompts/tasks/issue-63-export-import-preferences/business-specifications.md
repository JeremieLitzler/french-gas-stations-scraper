# Business Specifications — Issue #63: Export/Import User Preferences

## Goal and Scope

Allow the user to export their current preferences (station list + default fuel type) to a JSON file
and re-import that file on the same or a different device. On import, the user sees a diff UI and
resolves conflicts before any data is written to IndexedDB.

## JSON Format Contract

The exported and imported file must conform to this exact shape (validated on import):

```
{
  "fuelTypeDefault": "<string or null>",
  "favoriteStations": [
    { "name": "<string>", "url": "<encoded-url>" }
  ]
}
```

Any file that does not satisfy this shape is rejected with a user-visible error; nothing is written to
IndexedDB.

## Rules

### **Rule 1 — Export**

When the user triggers export, the app serialises the current IndexedDB state (station list +
default fuel type) into the JSON format above and downloads it as a `.json` file.
The filename is fixed: `preferences.json`.

### **Rule 2 — Import: file validation**

When the user selects a file to import, the app parses and validates it before showing any UI.
Rejection conditions:

- not valid JSON,
- missing required keys,
- `favoriteStations` is not an array,
- any station entry missing `name` or `url`,
- any station URL failing the existing origin + path-prefix
- validation (see `useStationStorage`),
- any station name failing the existing name validation.

On rejection the user sees an error message; no diff UI is shown.

### **Rule 3 — Import: diff UI**

After successful validation, the app presents, before writing anything:

- a comparison table for the stations
- a line for the default fuel type.

Each row of the table represents one item that differs between the file and IndexedDB. Identical items are not shown. The fuel type line is shown only when its value differs.

### **Rule 4 — Station conflict (same URL, different name)**

If a station with the same URL exists in IndexedDB but the file carries a different name,
the diff row shows both values and the user must choose which name to keep (file or IndexedDB).
The user cannot proceed until all such conflicts are resolved.

### **Rule 5 — New station**

If a station URL in the file does not exist in IndexedDB, the diff row is labelled "Ajoutée" and is
pre-selected for import (the user may deselect it).

URL matching ignores query parameters: a file URL of `.../station/1234?foo=bar` is considered the
same station as the stored `.../station/1234`. Only the path portion is compared.

In fact, the source website doesn't support query string in the station URL, hence the decision is valid.

### **Rule 6 — Removed station**

Stations present in IndexedDB but absent from the file are not shown and are not modified.
Import is additive/update-only; it never deletes existing stations.

### **Rule 7 — Fuel type conflict**

If the file's `fuelTypeDefault` differs from the IndexedDB value (including one being empty/null),
the diff UI shows both values and the user must choose which one to keep before confirming.
If both are identical (or both empty), no fuel-type row is shown.

### **Rule 8 — Confirm and apply**

When the user confirms the diff UI, the app applies only the resolved choices to IndexedDB using
the existing `useStationStorage` and `useDefaultFuelType` composables.
A success message is shown after writing completes.

All differences MUST have a user selection before confirmation.

### **Rule 9 — No diff, no import needed**

If the validated file is identical to the current IndexedDB state, the app informs the user that no
changes were found and does not show the diff UI.

## Files to Create or Modify

- `src/types/` — new type for the preferences JSON shape and for a diff row item
- `src/utils/preferencesExport.ts` — pure functions for serialising IndexedDB state to the JSON format
- `src/utils/preferencesImport.ts` — pure functions for validating and diffing the imported JSON against IndexedDB
- `src/composables/usePreferencesExport.ts` — singleton composable orchestrating the export flow
- `src/composables/usePreferencesImport.ts` — singleton composable orchestrating the import flow (validation, diff, apply)
- `src/components/PreferencesExport.vue` — new component with the export button
- `src/components/PreferencesImport.vue` — new component with the file input trigger and import feedback
- `src/components/PreferencesDiffDialog.vue` — new modal/dialog component that renders the diff table,
  conflict pickers, and confirm/cancel actions
- `src/components/StationManager.vue` — modified to include `PreferencesExport` and `PreferencesImport`

status: ready
