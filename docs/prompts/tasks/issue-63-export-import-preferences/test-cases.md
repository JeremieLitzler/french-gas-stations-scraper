# Test Cases — Issue #63: Export/Import User Preferences

## Export

### TC-EXP-01 — Export produces a valid JSON file with current state
- **Precondition:** IndexedDB contains at least one station and a non-null default fuel type.
- **Action:** User triggers the export action.
- **Expected:** A file named `preferences.json` is downloaded. Its content is valid JSON conforming to the contract: `{ fuelTypeDefault, favoriteStations: [{ name, url }] }`.

### TC-EXP-02 — Export with empty station list
- **Precondition:** IndexedDB contains no stations and no default fuel type (null).
- **Action:** User triggers the export action.
- **Expected:** A file named `preferences.json` is downloaded. `favoriteStations` is an empty array; `fuelTypeDefault` is null.

### TC-EXP-03 — Export filename is always `preferences.json`
- **Precondition:** Any IndexedDB state.
- **Action:** User triggers the export action.
- **Expected:** The downloaded file is named exactly `preferences.json` regardless of the content.

---

## Import — File Validation

### TC-IMP-VAL-01 — Valid file passes validation and shows diff UI
- **Precondition:** A JSON file conforming to the contract exists; its content differs from IndexedDB.
- **Action:** User selects the file for import.
- **Expected:** The diff UI is displayed. No error message is shown.

### TC-IMP-VAL-02 — File that is not valid JSON is rejected
- **Precondition:** A file with non-JSON content (e.g. plain text).
- **Action:** User selects the file for import.
- **Expected:** An error message is shown to the user. The diff UI is not shown. IndexedDB is not modified.

### TC-IMP-VAL-03 — File missing required top-level keys is rejected
- **Precondition:** A JSON file missing `favoriteStations` or `fuelTypeDefault`.
- **Action:** User selects the file for import.
- **Expected:** An error message is shown. The diff UI is not shown. IndexedDB is not modified.

### TC-IMP-VAL-04 — File with `favoriteStations` not being an array is rejected
- **Precondition:** A JSON file where `favoriteStations` is a string, number, or object.
- **Action:** User selects the file for import.
- **Expected:** An error message is shown. The diff UI is not shown. IndexedDB is not modified.

### TC-IMP-VAL-05 — Station entry missing `name` is rejected
- **Precondition:** A JSON file where one station entry has no `name` key.
- **Action:** User selects the file for import.
- **Expected:** An error message is shown. The diff UI is not shown. IndexedDB is not modified.

### TC-IMP-VAL-06 — Station entry missing `url` is rejected
- **Precondition:** A JSON file where one station entry has no `url` key.
- **Action:** User selects the file for import.
- **Expected:** An error message is shown. The diff UI is not shown. IndexedDB is not modified.

### TC-IMP-VAL-07 — Station URL failing the origin + path-prefix validation is rejected
- **Precondition:** A JSON file where one station URL does not match the allowed origin and path prefix.
- **Action:** User selects the file for import.
- **Expected:** An error message is shown. The diff UI is not shown. IndexedDB is not modified.

### TC-IMP-VAL-08 — Station name failing name validation is rejected
- **Precondition:** A JSON file where one station name fails the name validation rules.
- **Action:** User selects the file for import.
- **Expected:** An error message is shown. The diff UI is not shown. IndexedDB is not modified.

### TC-IMP-VAL-09 — File exceeding the size limit is rejected
- **Precondition:** A JSON file larger than the allowed maximum size (e.g. > 1 MB).
- **Action:** User selects the file for import.
- **Expected:** An error message is shown before parsing. The diff UI is not shown. IndexedDB is not modified.

---

## Import — Diff UI

### TC-IMP-DIFF-01 — No diff shown when file is identical to IndexedDB
- **Precondition:** A valid JSON file whose content is identical to the current IndexedDB state (same stations, same fuel type default).
- **Action:** User selects the file for import.
- **Expected:** The app informs the user that no changes were found. The diff UI is not shown. IndexedDB is not modified.

### TC-IMP-DIFF-02 — New station row is shown pre-selected as "Ajoutée"
- **Precondition:** A valid JSON file contains a station URL not present in IndexedDB.
- **Action:** User selects the file for import.
- **Expected:** The diff UI shows a row for the new station labelled "Ajoutée", pre-selected.

### TC-IMP-DIFF-03 — New station can be deselected before confirming
- **Precondition:** As TC-IMP-DIFF-02.
- **Action:** User deselects the new station row, then confirms.
- **Expected:** The station is not added to IndexedDB.

### TC-IMP-DIFF-04 — Name conflict row shows both names and blocks confirmation until resolved
- **Precondition:** A valid JSON file contains a station URL that exists in IndexedDB but with a different name.
- **Action:** User selects the file for import without resolving the conflict.
- **Expected:** The diff UI shows a conflict row with both names. The confirm button is disabled until the user picks one name.

### TC-IMP-DIFF-05 — Name conflict resolved by choosing file value
- **Precondition:** A conflict row exists (same URL, different names).
- **Action:** User selects the file name for that row, then confirms.
- **Expected:** IndexedDB is updated with the file name for that station URL.

### TC-IMP-DIFF-06 — Name conflict resolved by keeping IndexedDB value
- **Precondition:** A conflict row exists (same URL, different names).
- **Action:** User selects the IndexedDB name for that row, then confirms.
- **Expected:** IndexedDB retains the existing name for that station URL.

### TC-IMP-DIFF-07 — Stations identical in both file and IndexedDB are not shown in diff
- **Precondition:** A valid JSON file where some stations are identical to IndexedDB entries.
- **Action:** User selects the file for import.
- **Expected:** Rows for identical stations do not appear in the diff table.

### TC-IMP-DIFF-08 — Stations absent from file are not shown and not deleted
- **Precondition:** IndexedDB contains stations not present in the imported file.
- **Action:** User selects the file for import and confirms.
- **Expected:** Stations not in the file remain unchanged in IndexedDB after the import.

### TC-IMP-DIFF-09 — Fuel type diff row shown when values differ
- **Precondition:** A valid JSON file with a `fuelTypeDefault` different from the IndexedDB value.
- **Action:** User selects the file for import.
- **Expected:** The diff UI shows a fuel type row displaying both values. The confirm button is disabled until the user picks one.

### TC-IMP-DIFF-10 — Fuel type diff not shown when values are identical
- **Precondition:** A valid JSON file with the same `fuelTypeDefault` as IndexedDB.
- **Action:** User selects the file for import.
- **Expected:** No fuel type row appears in the diff UI.

### TC-IMP-DIFF-11 — Fuel type resolved by choosing file value
- **Precondition:** A fuel type conflict row exists.
- **Action:** User selects the file value and confirms.
- **Expected:** The default fuel type in IndexedDB is updated to the file value.

### TC-IMP-DIFF-12 — Fuel type resolved by keeping IndexedDB value
- **Precondition:** A fuel type conflict row exists.
- **Action:** User selects the IndexedDB value and confirms.
- **Expected:** The default fuel type in IndexedDB remains unchanged.

### TC-IMP-DIFF-13 — Confirmation blocked when any unresolved difference remains
- **Precondition:** The diff UI displays at least one unresolved conflict (name or fuel type).
- **Action:** User attempts to confirm without resolving all conflicts.
- **Expected:** Confirmation is not possible; the confirm button remains disabled.

---

## Import — Apply

### TC-IMP-APPLY-01 — Confirmed changes are applied to IndexedDB
- **Precondition:** The diff UI shows new stations and/or a fuel type change; all conflicts resolved.
- **Action:** User confirms.
- **Expected:** IndexedDB is updated with the resolved selections. A success message is shown.

### TC-IMP-APPLY-02 — Cancel closes the diff UI without modifying IndexedDB
- **Precondition:** The diff UI is open.
- **Action:** User cancels.
- **Expected:** The diff UI closes. IndexedDB is not modified.

---

## Security

### TC-SEC-01 — JSON with prototype-polluting key is rejected
- **Precondition:** A JSON file containing a key such as `__proto__` or `constructor` at the top level or within a station entry.
- **Action:** User selects the file for import.
- **Expected:** An error message is shown. The diff UI is not shown. IndexedDB is not modified.

status: ready
