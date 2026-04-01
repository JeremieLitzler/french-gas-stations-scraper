# Test Cases — Issue #66: Validate fuelTypeDefault on import

## FuelType enum removal

No runtime tests — verified by `vue-tsc`.

---

## useKnownFuelTypes composable

### TC-01 — Returns empty list when no station results are available
- **Precondition:** The composable is initialised with an empty station results list.
- **Action:** Read the exposed reactive fuel types list.
- **Expected:** The list is empty.

### TC-02 — Derives fuel types from station results
- **Precondition:** The composable is initialised with station results containing fuels `["SP95", "Gazole", "E10"]` across two stations.
- **Action:** Read the exposed reactive fuel types list.
- **Expected:** The list contains exactly `["SP95", "Gazole", "E10"]` (or a superset with no duplicates), derived from `deriveFuelTypes`.

### TC-03 — Updates reactively when station results change
- **Precondition:** The composable is initialised with station results for one fuel type `["SP95"]`.
- **Action:** Update the station results to include an additional fuel type `"GPL"`.
- **Expected:** The exposed list updates to include `"GPL"` without requiring a re-initialisation.

### TC-04 — Deduplicates fuel types across stations
- **Precondition:** Multiple stations all return `"SP95"` as one of their fuels.
- **Action:** Read the exposed reactive fuel types list.
- **Expected:** `"SP95"` appears exactly once in the list.

---

## Async fuel-type validation in import flow

### TC-05 — Null fuelTypeDefault skips the fuel-type check
- **Precondition:** A valid preferences file with `fuelTypeDefault: null` is selected.
- **Action:** The import flow processes the file.
- **Expected:** No network calls are made for the fuel-type check; the import proceeds without any warning about fuelTypeDefault.

### TC-06 — Recognised fuelTypeDefault is accepted
- **Precondition:** A valid preferences file with `fuelTypeDefault: "SP95"` is selected. At least one station (from the file or IndexedDB) returns `"SP95"` as an offered fuel type.
- **Action:** The import flow processes the file.
- **Expected:** No fuelTypeDefault warning is shown; the stored value is updated to `"SP95"`.

### TC-07 — Unrecognised fuelTypeDefault triggers a warning and preserves stored value
- **Precondition:** A valid preferences file with `fuelTypeDefault: "GPL"` is selected. No fetched station offers `"GPL"`. IndexedDB currently stores `fuelTypeDefault: "SP95"`.
- **Action:** The import flow processes the file.
- **Expected:**
  - A non-blocking French warning is shown: "Le type de carburant par défaut de votre fichier n'existe dans aucune station. La valeur en mémoire de l'application est conservé."
  - The stored `fuelTypeDefault` remains `"SP95"` (unchanged).
  - The rest of the import diff (station rows) is still presented normally.

### TC-08 — Known fuel types from existing fetch results are reused (no duplicate fetches)
- **Precondition:** The main price-loading flow has already fetched results for station URLs A and B (offering `["SP95", "E10"]`). An import file contains station URL A (already fetched) and station URL C (not yet fetched, offering `["Gazole"]`). `fuelTypeDefault` in the file is `"Gazole"`.
- **Action:** The import flow performs the fuel-type check.
- **Expected:**
  - No new network call is made for station URL A.
  - One network call is made for station URL C.
  - `"Gazole"` is recognised as valid (it comes from URL C's result).
  - No warning is shown.

### TC-09 — Import-time fetch only targets allowed domain URLs
- **Precondition:** An import file contains a station with a URL pointing to an external domain (not `prix-carburants.gouv.fr`) and `fuelTypeDefault: "SP95"`.
- **Action:** The import flow attempts the fuel-type check.
- **Expected:** No network call is made for the disallowed URL; it is silently skipped during the validation step.

### TC-10 — Malformed Netlify response during import-time fetch is handled gracefully
- **Precondition:** A valid preferences file with `fuelTypeDefault: "SP95"` is selected. One import-only station URL triggers a Netlify call that returns a malformed (non-array) fuel list.
- **Action:** The import flow performs the fuel-type check.
- **Expected:** The malformed response is ignored (does not throw); the check continues with whatever valid results are available. No unhandled error surfaces to the user.

### TC-11 — fuelTypeDefault with special characters does not cause rendering issues
- **Precondition:** A valid preferences file with a `fuelTypeDefault` containing characters outside normal fuel-type names (e.g. `"<script>alert(1)</script>"`) is selected.
- **Action:** The import flow processes the file and shows a warning.
- **Expected:** Any displayed message containing the value renders it as plain text — no script executes, no HTML is injected.

---

## Suspense loading state

### TC-12 — Loading fallback is visible during async import operations
- **Precondition:** The import component is mounted. A valid preferences file is selected that triggers async fuel-type network calls.
- **Action:** Observe the UI state while the async calls are in flight.
- **Expected:** A loading indicator (not a blank or stale UI) is visible until all async work completes.

### TC-13 — Loading fallback is dismissed after import completes (success path)
- **Precondition:** Same as TC-12.
- **Action:** Await the completion of all async import operations.
- **Expected:** The loading indicator is no longer shown; the import result (diff or confirmation) is displayed.

### TC-14 — Loading fallback is dismissed after import completes (warning path)
- **Precondition:** Same as TC-07, with loading indicator visible during async fetch.
- **Action:** Await the completion of all async import operations.
- **Expected:** The loading indicator is dismissed; the warning message and import diff are displayed.

status: ready
