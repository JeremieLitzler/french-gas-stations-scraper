# Test Results — Issue #85: Read Preferences from Remote Repo on Load

## Test Run

Command: `npx vitest run --reporter=json` (Vitest v4.1.0) from the
`french-gas-stations-scraper_feat-load-remote-preferences` worktree.

## Files Run

All those mentioned in [technical specs](technical-specifications.md), plus the full existing suite.

## Results

### Failures

**`src/components/HomePageContent.spec.ts`**
Test: `C-17: every view reflects the same station list once a sync completes > shows the same remote-sourced list in every view, replacing the stale local one`

```
AssertionError: expected false to be true // Object.is equality
    at E:/Git/GitHub/french-gas-stations-scraper_feat-load-remote-preferences/src/components/HomePageContent.spec.ts:226:33
```

**`src/components/StationManager.spec.ts`**
Test: `loadStations is called on mount to seed defaults from IndexedDB > calls loadStations once when the component mounts`

```
AssertionError: expected "vi.fn()" to be called once, but got 0 times
    at E:/Git/GitHub/french-gas-stations-scraper_feat-load-remote-preferences/src/components/StationManager.spec.ts:90:30
```

### Test Summary

323 test files, 379 tests total — 2 failed.

- Test files: 319 passed, 4 failed
- Tests: 377 passed (2 failed)
- Duration: ~10 seconds

status: failed
