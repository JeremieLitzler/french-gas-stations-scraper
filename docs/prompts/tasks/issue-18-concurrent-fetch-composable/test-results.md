# Test Results — Issue 18

## Test run summary

Command: `npm test` (vitest)
Vitest version: 4.1.0

## New test files

- `src/composables/useStationPrices.spec.ts` — 15 test cases for the composable
- `src/pages/index.spec.ts` — 2 test cases for the index page warning display

## Results

All test files: 10 passed (10)
All tests: 127 passed (127)

Includes all pre-existing tests plus the 17 new tests for issue 18.

## Notes

ECONNREFUSED noise in stdout originates from pre-existing HTML fixture tests
(stationHtmlParser.spec.ts) that cause happy-dom to attempt fetching
external stylesheet resources. This is a known pre-existing issue unrelated
to issue 18 changes — these tests still pass.

### Test Summary

10 test files, 127 tests — all passed. No failures.

status: passed
