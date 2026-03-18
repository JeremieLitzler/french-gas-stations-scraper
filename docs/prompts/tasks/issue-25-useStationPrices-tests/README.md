# Issue #25 — test(composable): add unit tests for useStationPrices

## User Request

Tackle GitHub issue 25. No specs needed. Just test writer (skip Step 1 specs and Step 1.5 security; go directly to Step 1.75 test cases after Step 0 branching).

## Issue Description

`useStationPrices` composable was introduced in #24 but has no unit test coverage. The test scope for that PR was limited to the `stationHtmlParser` utility.

## Missing test cases

- `loadStationPrices` sets `isLoading: true` during fetch and `false` after (success and failure)
- On success: `stationData` is populated with `station.name` (from the `Station` argument) and the parsed fuels array
- On `selector_not_found`: `error` is set to `'selector_not_found'`, `stationData` remains `null`
- On network failure (fetch throws): `error` is set to `'fetch_failed'`
- On fetch-page returning `{ success: false, error }`: `error` is set from the response error string
- State (`stationData`, `error`, `isLoading`) is reset at the start of each call — no stale data from a previous station

## Notes

- Use `vi.stubGlobal('fetch', ...)` or `vi.fn()` to mock `fetch` — no real network calls
- Singleton state must be reset between tests (`beforeEach`)
- The composable is browser-side; test environment is Vitest + happy-dom
