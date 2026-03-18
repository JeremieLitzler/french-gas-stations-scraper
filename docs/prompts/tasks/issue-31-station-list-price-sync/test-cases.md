# Test Cases — Issue #31: Station List → Price Table Reactivity

## TC-01 — Station removal removes its price row

**Precondition:** The Price Table displays prices for stations A, B, and C. Station B has at
least one price row visible.
**Action:** The user removes station B from the Station List.
**Expected outcome:** All price rows associated with station B disappear from the Price Table
immediately. Prices for stations A and C remain unchanged.

## TC-02 — Station URL change removes old price row and triggers re-fetch

**Precondition:** The Price Table displays a price row for station A at URL-1.
**Action:** The user changes station A's URL to URL-2 and saves.
**Expected outcome:** The price row for URL-1 is removed immediately. A loading indicator
appears. When the fetch for URL-2 completes successfully, a new price row for station A
(with URL-2 prices) appears. No loading indicator remains.

## TC-03 — Station URL change with failed fetch shows warning

**Precondition:** The Price Table displays a price row for station A.
**Action:** The user changes station A's URL to an invalid or unreachable URL and saves.
**Expected outcome:** The old price row is removed. After the failed fetch, station A appears
in the warnings list. No stale price data for station A remains in the table.

## TC-04 — Station name change updates label without re-fetch

**Precondition:** The Price Table displays a price row labelled "Old Name" for a station whose
URL is unchanged.
**Action:** The user changes only the station's name to "New Name" and saves.
**Expected outcome:** The price row label updates to "New Name" in place. No loading indicator
appears. The price values remain unchanged (no re-fetch is triggered).

## TC-05 — Station addition triggers fetch and adds price row on success

**Precondition:** The Station List does not contain station Z.
**Action:** The user adds station Z (with a valid URL) to the Station List.
**Expected outcome:** A loading indicator appears. When the fetch completes successfully, a new
price row for station Z appears in the Price Table. No loading indicator remains.

## TC-06 — Station addition with invalid URL shows warning

**Precondition:** The Station List does not contain station Z.
**Action:** The user adds station Z with an invalid or unreachable URL.
**Expected outcome:** A loading indicator appears. After the failed fetch, station Z appears in
the warnings list. No price row for station Z appears in the table.

## TC-07 — Fuel type list is updated after station removal

**Precondition:** Only station A offers fuel type "GPL". Station A is in the Station List.
**Action:** The user removes station A.
**Expected outcome:** "GPL" is no longer present in the fuel type selector after station A is
removed. All other fuel types that remain in other stations' results are still listed.

## TC-08 — Selected fuel type is preserved after unrelated station change

**Precondition:** The user has selected fuel type "SP95". Multiple stations offer "SP95".
**Action:** The user removes a station that also offers "SP95" (but other stations still
offer it).
**Expected outcome:** "SP95" remains selected. The Price Table still displays "SP95" rows for
the remaining stations.

## TC-09 — Selected fuel type resets when it disappears after station removal

**Precondition:** The user has selected fuel type "GPL". Only one station offers "GPL", and
that station is present in the Station List.
**Action:** The user removes the station that exclusively offered "GPL".
**Expected outcome:** "GPL" is removed from the fuel type selector. The selection resets to
the first available fuel type (or the selector shows empty if no stations remain).

## TC-10 — Loading indicator is active only during ongoing re-fetch

**Precondition:** The Price Table is fully loaded (no active fetch in progress).
**Action:** The user adds a new station with a valid URL. Before the fetch completes, the user
views the Price Table.
**Expected outcome:** While the fetch is in progress, the loading indicator is visible.
Existing price rows for other stations remain visible during the fetch. Once the fetch
completes, the loading indicator disappears.

status: ready
