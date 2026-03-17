# Issue 18: feat: implement price-data composable with concurrent fetching, loading state, and warnings

## GitHub Issue

**Number:** 18
**Title:** feat: implement price-data composable with concurrent fetching, loading state, and warnings
**Labels:** status:ready

## Context

Closes part of #9. Depends on #15 and #16.

On page load the app must call the Netlify function for every station concurrently, show a loader until all responses arrive, and surface warnings for stations that fail parsing.

## Acceptance criteria

- `src/composables/useStationPrices.ts` created
- Calls `/.netlify/functions/fetch-page?url=<encoded-url>` for each station in the list concurrently (`Promise.all` or equivalent)
- Exposes reactive state: `isLoading`, `results: StationData[]`, `warnings: { stationName: string; url: string }[]`
- A station is added to `warnings` when the function returns `{ success: false, error: "selector_not_found" }`
- `isLoading` is `true` from the first call until all promises settle
- Warning messages are displayed below the station management UI, referencing the station name and URL
- Unit tests cover: all success, mixed success/warning, all warnings, loading flag transitions
