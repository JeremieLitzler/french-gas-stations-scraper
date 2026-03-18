# Test Cases — issue #25: unit tests for useStationPrices

## Context

The `useStationPrices` composable fetches and parses fuel prices for a list of
stations concurrently. The composable was reworked in issue #18 — the public
API uses `loadAllStationPrices(stations)` (multi-station), `results`, `warnings`,
`isLoading`, and `fetchCompleted`.

The scenarios below correspond to the intent described in issue #25, mapped to
the actual API.

---

## TC-01: All stations succeed — results populated, warnings empty

**Precondition:** `fetch` is mocked to return `{ success: true, html: <valid HTML> }` for every call.

**Action:** Call `loadAllStationPrices` with three stations.

**Expected outcome:** `results` contains one entry per station; `warnings` is empty; `isLoading` is `false`.

---

## TC-02: One station returns selector\_not\_found — placed in warnings

**Precondition:** `fetch` returns `selector_not_found` for the second station and a valid response for the others.

**Action:** Call `loadAllStationPrices` with three stations.

**Expected outcome:** `results` has two entries; `warnings` has one entry; `isLoading` is `false`.

---

## TC-03: All stations return selector\_not\_found — results empty, all in warnings

**Precondition:** `fetch` is mocked to return `{ success: false, error: 'selector_not_found' }` for every call.

**Action:** Call `loadAllStationPrices` with two stations.

**Expected outcome:** `results` is empty; `warnings` has two entries; `isLoading` is `false`.

---

## TC-04: isLoading is true during fetch and false after all settle

**Precondition:** `fetch` is mocked with a pending promise that has not yet resolved.

**Action:** Start `loadAllStationPrices` with one station without awaiting it.

**Expected outcome:** `isLoading` is `true` immediately after the call starts.

**Then:** Resolve the pending promise and await the load.

**Expected outcome:** `isLoading` is `false`.

---

## TC-05: Network error for one station — treated as warning

**Precondition:** `fetch` rejects for the first station and succeeds for the second.

**Action:** Call `loadAllStationPrices` with two stations.

**Expected outcome:** `warnings` has one entry; `results` has one entry; `isLoading` is `false`.

---

## TC-06: All stations produce network errors — results empty, all in warnings

**Precondition:** `fetch` rejects for every call.

**Action:** Call `loadAllStationPrices` with two stations.

**Expected outcome:** `results` is empty; `warnings` has two entries; `isLoading` is `false`.

---

## TC-07: Empty station list — no loading, no results, no warnings

**Precondition:** `fetch` is mocked (but should not be called).

**Action:** Call `loadAllStationPrices` with an empty array.

**Expected outcome:** `isLoading` is `false`; `results` is empty; `warnings` is empty; `fetch` was not called.

---

## TC-08: Station URL is percent-encoded in the fetch request

**Precondition:** A station has a URL containing query-string characters (`?`, `&`).

**Action:** Call `loadAllStationPrices` with that station.

**Expected outcome:** The `fetch` call URL contains `url=` followed by the percent-encoded station URL; the raw query characters do not appear unencoded after the `url=` parameter.

---

## TC-09: Netlify function returns unexpected response shape — treated as warning

**Precondition:** `fetch` resolves with a JSON body that matches neither the success nor the failure contract (e.g. `{ something: 'unexpected' }`).

**Action:** Call `loadAllStationPrices` with one station.

**Expected outcome:** `warnings` has one entry; `results` is empty; `isLoading` is `false`.

---

## TC-10: Re-triggering clears previous state — no stale data

**Precondition:** A previous call to `loadAllStationPrices` has populated `results` with two entries.

**Action:** Call `loadAllStationPrices` again with a single different station.

**Expected outcome:** `results` contains exactly one entry (the new station); `warnings` is empty — no stale data from the previous run.

---

## TC-11: Warning entry contains station name and URL

**Precondition:** `fetch` returns `selector_not_found` for a station.

**Action:** Call `loadAllStationPrices` with that station.

**Expected outcome:** The warning entry has `stationName` equal to the station's name and `url` equal to the station's URL.

---

## TC-14: Independent state — each composable call returns its own refs

**Precondition:** Two separate calls to `useStationPrices()` from the same module.

**Action:** Call `loadAllStationPrices` on the first instance with one station.

**Expected outcome:** The first instance's `results` has one entry; the second instance's `results` is still empty; the two `results` refs are not the same object reference.

---

## TC-15: Fetch calls are initiated concurrently, not sequentially

**Precondition:** `fetch` is mocked with a deferred promise for each call; call times are recorded.

**Action:** Call `loadAllStationPrices` with two stations without awaiting resolution.

**Expected outcome:** Both `fetch` calls are initiated (recorded) before either resolves — confirming concurrent execution via `Promise.allSettled`.

---

status: ready
