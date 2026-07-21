# Test Results — Issue #85: Read Preferences from Remote Repo on Load

## Test Run

Command: `npx vitest run --reporter=json` (Vitest v4.1.0) from the
`french-gas-stations-scraper_feat-load-remote-preferences` worktree.

## Files Run

All those mentioned in [technical specs](technical-specifications.md), plus the full existing suite.

## Results

### Failures

**`src/components/StationManager.spec.ts`**
Test: `loadStations is called on mount to seed defaults from IndexedDB > calls loadStations once when the component mounts`

```
AssertionError: expected "vi.fn()" to be called once, but got 0 times
    at E:/Git/GitHub/french-gas-stations-scraper_feat-load-remote-preferences/src/components/StationManager.spec.ts:90:30
```

Known, pre-existing gap — not introduced by this pass. This test asserts pre-refactor behavior
(`StationManagerTable.vue` calling `loadStations()` on mount); the sixth pass intentionally moved
that responsibility to `HomePageContent.vue` and this change was already reviewed and approved
(`review-results.md`). See `technical-specifications.md`'s "Seventh pass" and "Known gaps"
sections — this is a stale `.spec.ts` file that `/jli-writes-tests` needs to update, out of
`/jli-codes`'s scope.

`src/components/HomePageContent.spec.ts`'s previously-failing `C-17` test now passes: the seventh
pass's explicit `StationPrices` import in `HomePageContent.vue` fixed the auto-import resolution
bug that caused it.

### Test Summary

323 test files, 379 tests total — 1 failed.

- Test files: 321 passed, 2 failed
- Tests: 378 passed (1 failed)
- Duration: ~8 seconds

status: failed
