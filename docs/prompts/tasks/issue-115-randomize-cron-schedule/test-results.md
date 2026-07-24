# Test Results — Issue #115: Fix the Scheduled Run's Trigger Time

## Test Run

Command: `npx vitest run --reporter=json` (Vitest v4.1.0) from the
`french-gas-stations-scraper_fix-randomize-cron-schedule` worktree.

## Files Run

All those mentioned in [technical specs](technical-specifications.md):

- `netlify/functions/lib/scheduleGuards.spec.ts`
- Plus the full existing suite (352 test files, 418 tests total). Note:
  `scheduled-price-history.spec.ts` no longer exists — it was deleted per
  `technical-specifications.md` and `test-cases.md`, since it only covered the
  random-time-resolution logic this revision removes.

## Results

All tests passed. No failures.

### Test Summary

352 test files, 418 tests total — all passed.

- Test files: 352 passed
- Tests: 418 passed (0 failed)
- Duration: ~21 seconds

status: passed
