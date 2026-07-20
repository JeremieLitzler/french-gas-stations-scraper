# Test Results — Issue #85: Read Preferences from Remote Repo on Load

## Test Run

Command: `npx vitest run --reporter=json` (Vitest v4.1.0) from the
`french-gas-stations-scraper_feat-load-remote-preferences` worktree.

## Files Run

All those mentioned in [technical specs](technical-specifications.md), plus the full existing
suite (313 test files, 366 tests total).

## Results

### Failures

43 tests failed, all outside the files this sub-issue's tests target
(`useRemotePreferencesSync.spec.ts`, `useStationStorage.spec.ts`,
`useStationStorage.updateStation.spec.ts`, `useDefaultFuelType.spec.ts` all pass in full).
Every failing sub-issue-84 test (which passed with all tests green) is either in
`StationPrices.spec.ts`, `StationPricesContent.spec.ts`, or `src/pages/index.spec.ts` —
components this sub-issue's implementation changed (`StationPricesContent.vue` now awaits
`useGitHubAuth`/`useRepoConfig`/`useRemotePreferencesSync` before rendering). This looks like a
regression introduced by that change, not by the new tests.

- **`src/components/StationPrices.spec.ts`** — 10 failures: TC-07, TC-13, TC-15, TC-16, TC-17,
  TC-18, TC-19, TC-20, TC-22, TC-23, TC-24 (element/selector lookups returning `undefined` or
  empty arrays; several `Cannot read properties of undefined (reading 'trigger'/'text'/'classes')`).
- **`src/components/StationPricesContent.spec.ts`** — 25 failures: TC-01, TC-02, TC-04, TC-05,
  TC-07, TC-08, TC-09, and Issue-28 TC-06, TC-07, TC-09, TC-10, TC-12, TC-16, TC-17, TC-19,
  TC-20, TC-21, TC-22, TC-23, TC-25, TC-26, TC-27, TC-28, TC-29, TC-30, TC-31, TC-34, TC-37,
  TC-38, TC-39 — same pattern: mock composable functions not called, or elements/buttons not
  found in the rendered output.
- **`src/pages/index.spec.ts`** — 1 failure: TC-12 (warning text assertion `expected false to
  be true`).

Representative errors (full list in the JSON capture below is available on request):

```
StationPrices.spec.ts:144 — AssertionError: expected true to be false
StationPrices.spec.ts:225 — TypeError: Cannot read properties of undefined (reading 'text')
StationPricesContent.spec.ts:196 — expected "vi.fn()" to be called with arguments: [ 'https://example.com/station/b' ] — Number of calls: 0
StationPricesContent.spec.ts:314 — AssertionError: expected [] to include 'Définir par défaut'
StationPricesContent.spec.ts:408 — TypeError: Cannot read properties of undefined (reading 'text')
index.spec.ts:191 — AssertionError: expected false to be true
```

### Test Summary

313 test files, 366 tests total — 43 failed.

- Test files: 267 passed, 46 failed
- Tests: 323 passed (43 failed)
- Duration: ~6 seconds

status: failed
