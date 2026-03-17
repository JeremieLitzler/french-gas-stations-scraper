# Test Results — Issue 19

## Test run summary

Command: `npm test` (vitest)
Vitest version: 4.1.0

## New test files

- `src/utils/fuelTypeUtils.spec.ts` — unit tests for fuel type derivation, sort order, missing fuel type, and row mapping
- `src/components/StationPrices.spec.ts` — component tests for fuel-type selector rendering, active state, price table, loading state, and empty results

## Results

All test files: 12 passed (12)
All tests: 151 passed (151)

Includes all pre-existing tests plus the new tests for issue 19.

## Notes

Duplicate import warnings from Vitest are pre-existing and unrelated to issue 19 — they originate from type re-exports in `src/types/index.ts`. All tests still pass.

The `AsyncTaskManager` error in stdout originates from pre-existing HTML fixture tests (stationHtmlParser.spec.ts) that cause happy-dom to attempt fetching external stylesheet resources. This is a known pre-existing issue unrelated to issue 19 changes — these tests still pass.

### Test Summary

12 test files, 151 tests — all passed. No failures.

status: passed
