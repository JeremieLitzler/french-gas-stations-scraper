# Test Cases — Station Management UI (#17)

## TC-01: Station list renders all existing stations

**Precondition:** `useStationStorage` returns a reactive list of two stations: `{ name: "Station A", url: "https://www.prix-carburants.gouv.fr/station/11111" }` and `{ name: "Station B", url: "https://www.prix-carburants.gouv.fr/station/22222" }`.
**Action:** Mount `StationManager`.
**Expected outcome:** The table contains two data rows (excluding the empty new-station row). Each row shows the station name in the Name column and the station URL in the URL column.

## TC-02: Each existing row cell is an editable input

**Precondition:** At least one station is in the list.
**Action:** Mount `StationManager` and inspect the rendered rows.
**Expected outcome:** Each Name cell and each URL cell in the existing rows is an `<input>` element (not plain text).

## TC-03: Editing a name auto-saves on blur with valid value

**Precondition:** A station with name "Station A" and a valid URL is in the list.
**Action:** Change the name input of that row to "Station A Updated" and trigger blur.
**Expected outcome:** `updateStation` is called with the original URL and the updated station object. The row reflects the new name.

## TC-04: Editing a URL auto-saves on blur with valid value

**Precondition:** A station with URL `https://www.prix-carburants.gouv.fr/station/11111` is in the list.
**Action:** Change the URL input to `https://www.prix-carburants.gouv.fr/station/99999` and trigger blur.
**Expected outcome:** `updateStation` is called with the original URL (`/station/11111`) and the updated station object containing the new URL (`/station/99999`). The row reflects the new URL.

## TC-05: Editing a name to empty reverts and shows inline error

**Precondition:** A station with name "Station A" is in the list.
**Action:** Clear the name input and trigger blur.
**Expected outcome:** An inline error is visible adjacent to the name input. The input reverts to "Station A". `updateStation` is not called.

## TC-06: Editing a name to whitespace-only reverts and shows inline error

**Precondition:** A station with name "Station A" is in the list.
**Action:** Replace the name input with "   " (spaces only) and trigger blur.
**Expected outcome:** An inline error is visible adjacent to the name input. The input reverts to "Station A". `updateStation` is not called.

## TC-07: Editing a URL to an invalid format reverts and shows inline error

**Precondition:** A station with a valid URL is in the list.
**Action:** Change the URL input to `https://example.com/station/1` and trigger blur.
**Expected outcome:** An inline error is visible adjacent to the URL input. The input reverts to the original URL. `updateStation` is not called.

## TC-08: Editing a URL to a duplicate of another row reverts and shows inline error

**Precondition:** Two stations are in the list: one with URL `/station/11111` and one with URL `/station/22222`.
**Action:** Change the URL input of the first row to `/station/22222` (the second row's URL) and trigger blur.
**Expected outcome:** An inline error is visible adjacent to the URL input. The input reverts to `/station/11111`. `updateStation` is not called.

## TC-09: Inline error clears when user starts typing in the errored field

**Precondition:** An inline error is displayed on a name or URL input after a failed blur.
**Action:** The user begins typing in the errored input field.
**Expected outcome:** The inline error disappears.

## TC-10: Delete action removes the row immediately

**Precondition:** A station is in the list.
**Action:** Click the delete action for that row.
**Expected outcome:** `removeStation` is called with the station's URL. The row is no longer visible in the table.

## TC-11: Empty new-station row is always present at the bottom

**Precondition:** The station list has any number of entries (including zero).
**Action:** Mount `StationManager`.
**Expected outcome:** The last row in the table has two empty inputs and no delete action.

## TC-12: New-station row auto-saves when both fields are valid on blur

**Precondition:** The empty row's name input contains "New Station" and URL input contains `https://www.prix-carburants.gouv.fr/station/77777`.
**Action:** Trigger blur on either input.
**Expected outcome:** `addStation` is called with `{ name: "New Station", url: "https://www.prix-carburants.gouv.fr/station/77777" }`. The new station appears as a regular row. The empty row resets to blank.

## TC-13: New-station row does not save when only one field is filled on blur

**Precondition:** The empty row's name input contains "New Station" and the URL input is blank.
**Action:** Trigger blur on the name input.
**Expected outcome:** `addStation` is not called. No inline error is shown. The empty row remains as-is.

## TC-14: New-station row shows inline error when both fields filled but URL is invalid on blur

**Precondition:** The empty row's name input contains "New Station" and URL input contains `https://example.com/1`.
**Action:** Trigger blur on the URL input.
**Expected outcome:** An inline error is visible adjacent to the URL input. `addStation` is not called.

## TC-15: New-station row shows inline error when both fields filled but name is empty

**Precondition:** The empty row's name input is blank (or whitespace-only) and URL input contains a valid URL.
**Action:** Trigger blur on the URL input.
**Expected outcome:** An inline error is visible adjacent to the name input. `addStation` is not called.

## TC-16: New-station row rejects a duplicate URL

**Precondition:** The list contains a station with URL `https://www.prix-carburants.gouv.fr/station/38490005`. The empty row has name "Another" and that same URL.
**Action:** Trigger blur on the URL input.
**Expected outcome:** An inline error is visible adjacent to the URL input. `addStation` is not called.

## TC-17: Input values are trimmed before validation and storage

**Precondition:** The empty row's name input contains "  New Station  " (leading/trailing spaces) and URL input contains `  https://www.prix-carburants.gouv.fr/station/55555  ` (spaces).
**Action:** Trigger blur on either input.
**Expected outcome:** `addStation` is called with `{ name: "New Station", url: "https://www.prix-carburants.gouv.fr/station/55555" }` (trimmed values). No inline error is shown.

## TC-18: updateStation — composable updates in-memory list and persists

**Precondition:** The station list contains `{ name: "Old Name", url: "https://www.prix-carburants.gouv.fr/station/11111" }`.
**Action:** Call `updateStation` with original URL `/station/11111` and updated object `{ name: "New Name", url: "https://www.prix-carburants.gouv.fr/station/11111" }`.
**Expected outcome:** The reactive `stations` list reflects the updated name. The updated list is written to IndexedDB.

## TC-19: updateStation — rejects invalid name

**Precondition:** A station exists in the list.
**Action:** Call `updateStation` with an empty name in the updated object.
**Expected outcome:** An error is thrown. The station list is unchanged. IndexedDB is not written.

## TC-20: updateStation — rejects invalid URL

**Precondition:** A station exists in the list.
**Action:** Call `updateStation` with a URL not matching the allowed origin/path in the updated object.
**Expected outcome:** An error is thrown. The station list is unchanged. IndexedDB is not written.

## TC-21: updateStation — no-op when original URL not found

**Precondition:** The station list does not contain a station with URL `/station/99999`.
**Action:** Call `updateStation` with original URL `/station/99999`.
**Expected outcome:** No error is thrown. The station list is unchanged. IndexedDB is not written.

## TC-22: Raw storage errors are not exposed verbatim in the UI

**Precondition:** `addStation` or `updateStation` is configured to throw an internal error with a message like "IDBTransaction failed: quota exceeded".
**Action:** Trigger the condition that causes the error (e.g. blur on a valid new row).
**Expected outcome:** The user sees a generic error message, not the raw error message text. The form remains usable.

status: ready
