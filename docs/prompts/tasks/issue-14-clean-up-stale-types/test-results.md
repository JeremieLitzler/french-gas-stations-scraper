# Test Results — issue-14-clean-up-stale-types

## Command

```bash
cd "E:/Git/GitHub/french-gas-stations-scraper.git/feat_clean-up-stale-types" && npm test
```

Vitest v4.1.0 — non-watch mode.

## Warnings (non-fatal)

During test collection, Vitest reported duplicated import warnings caused by the transition state of the types barrel:

- `FuelPrice` — duplicate resolved to `src/types/index.ts` (ignoring `src/types/fuel-price.ts`)
- `StationData` — duplicate resolved to `src/types/station-data.ts` (ignoring `src/types/index.ts`)
- `Station` — duplicate resolved to `src/types/station.ts` (ignoring `src/types/index.ts`)

These are expected during the clean-up refactor and do not affect test outcomes.

There was also a non-fatal happy-dom error related to async task manager teardown during browser frame cleanup; this is a known happy-dom lifecycle issue unrelated to the feature under test.

## Test Files

| File | Result |
|------|--------|
| (4 test files — names not printed by runner in this mode) | passed |

## Test Counts

| Metric | Value |
|--------|-------|
| Test files | 4 passed (4 total) |
| Tests | 64 passed (64 total) |
| Failures | 0 |

## Timing

- Start: 23:54:29
- Duration: 1.39s (transform 762ms, setup 0ms, import 2.06s, tests 121ms, environment 1.20s)

---

### Test Summary

All 64 tests across 4 test files passed with no failures. The duplicated-import warnings are a transient artifact of the ongoing types clean-up and do not indicate regressions.

status: passed
