# Test Cases — Issue #15: useStationStorage Composable

---

## Happy Path Scenarios

### TC-01: First load with empty database seeds the five default stations

**Precondition:** The IndexedDB store is empty (no station list has ever been saved).

**Action:** Call the load operation on the composable.

**Expected outcome:**
- The reactive station list contains exactly five stations.
- Each station matches one of the five default stations defined in the spec (name and URL both correct).
- The five default stations are persisted to IndexedDB (a subsequent read from the store returns the same five stations).

---

### TC-02: Subsequent load with populated database restores the stored list

**Precondition:** The IndexedDB store contains a list of three stations (different from the defaults).

**Action:** Call the load operation on the composable.

**Expected outcome:**
- The reactive station list contains exactly those three stored stations.
- The station names and URLs match exactly what was stored.
- The default seed is not applied (the stored list is not overwritten).
- IndexedDB still contains those same three stations after the load.

---

### TC-03: Adding a station appends it to the reactive list and persists it

**Precondition:** The composable has been loaded and the reactive list contains two stations.

**Action:** Call the add operation with a new station `{ name: "Test Station", url: "https://www.prix-carburants.gouv.fr/station/12345678" }`.

**Expected outcome:**
- The reactive list now contains three stations.
- The newly added station is the last entry in the list.
- IndexedDB contains all three stations (the two originals plus the new one).

---

### TC-04: Removing a station by URL shrinks the list and persists the removal

**Precondition:** The composable has been loaded and the reactive list contains three stations with distinct URLs.

**Action:** Call the remove operation with the URL of the second station.

**Expected outcome:**
- The reactive list now contains two stations.
- The removed station is no longer present in the list.
- The remaining two stations retain their original names and URLs.
- IndexedDB contains only the two remaining stations.

---

## Edge Case Scenarios

### TC-05: Removing a URL that does not exist in the list is a no-op

**Precondition:** The composable has been loaded and the reactive list contains two stations.

**Action:** Call the remove operation with a URL that does not match any station in the list.

**Expected outcome:**
- The reactive list is unchanged (still contains two stations).
- No error is thrown.
- IndexedDB is unchanged.

---

### TC-06: Second load when database already has data does not re-apply defaults

**Precondition:** The IndexedDB store contains exactly six stations (the five defaults plus one the user added in a prior session).

**Action:** Call the load operation.

**Expected outcome:**
- The reactive list contains all six stations.
- The composable does not overwrite the stored data with the five defaults.

---

### TC-07: Adding a station to an empty list (after first-load seed) results in six stations

**Precondition:** Load has been called on an empty database; the list now contains the five default stations.

**Action:** Call the add operation with a sixth valid station.

**Expected outcome:**
- The reactive list contains six stations.
- The sixth station appears last in the list.
- IndexedDB contains all six stations.

---

### TC-08: All consumers of the composable share the same reactive state (singleton)

**Precondition:** The composable has been loaded with two stations.

**Action:** Obtain a reference to the composable from two independent call sites in the same module. Use one reference to add a station.

**Expected outcome:**
- The reactive list visible through the second reference also reflects the newly added station.
- Both references point to the same reactive state.

---

## Security-Derived Scenarios

### TC-09: Attempting to add a station with a URL from a disallowed origin is rejected

**Precondition:** The composable is loaded and the reactive list contains two stations.

**Action:** Call the add operation with `{ name: "Evil Station", url: "https://evil.example.com/station/1" }`.

**Expected outcome:**
- The station is not appended to the reactive list (list remains at two stations).
- An error or rejection is returned to the caller (no silent swallow of the invalid input).
- IndexedDB is unchanged.

---

### TC-10: Attempting to add a station with a malformed URL is rejected

**Precondition:** The composable is loaded.

**Action:** Call the add operation with `{ name: "Bad URL Station", url: "not-a-valid-url" }`.

**Expected outcome:**
- The station is not appended to the reactive list.
- An error or rejection is returned to the caller.
- IndexedDB is unchanged.

---

### TC-11: Attempting to add a station with a name containing HTML tags is rejected or sanitised

**Precondition:** The composable is loaded.

**Action:** Call the add operation with `{ name: "<script>alert(1)</script>", url: "https://www.prix-carburants.gouv.fr/station/00000001" }`.

**Expected outcome:**
- Either the station is rejected (not stored), or the name stored in IndexedDB and reflected in the reactive list contains no HTML tags (the angle-bracket content has been stripped or escaped).
- No error is thrown that crashes the application.

---

### TC-12: Data read back from IndexedDB that lacks required fields is discarded

**Precondition:** IndexedDB has been manually populated (via test setup) with a malformed entry — an object missing the `url` field: `{ name: "Incomplete Station" }`.

**Action:** Call the load operation.

**Expected outcome:**
- The malformed entry is not present in the reactive list.
- Valid entries (if any) are loaded normally.
- No runtime error is thrown.

---

## Error and Failure Conditions

### TC-13: Load operation resolves gracefully when IndexedDB read returns undefined

**Precondition:** The IndexedDB store key for the station list returns `undefined` (key not yet set).

**Action:** Call the load operation.

**Expected outcome:**
- The composable treats the result as an empty store and applies the default seed.
- The reactive list contains the five default stations.
- No error is thrown.

---

### TC-14: Load called multiple times does not corrupt the stored data

**Precondition:** The composable has been loaded once and the reactive list contains three stations.

**Action:** Call the load operation a second time.

**Expected outcome:**
- The reactive list still contains the same three stations after the second load.
- IndexedDB still contains the same three stations (no duplication, no deletion).

---

status: ready
