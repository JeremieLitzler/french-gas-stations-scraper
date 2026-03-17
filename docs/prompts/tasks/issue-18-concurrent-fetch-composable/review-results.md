# Code Review Results — Issue 18

## Lint Output

```
E:\...\netlify\functions\fetch-page.ts
  13:3   error  'context' is defined but never used  @typescript-eslint/no-unused-vars
  37:12  error  'error' is defined but never used    @typescript-eslint/no-unused-vars

E:\...\src\components\AppLink.vue
  25:34  error  'props' is assigned a value but never used  @typescript-eslint/no-unused-vars

E:\...\src\components\AppToolTip.vue
  10:7  error  'tooltipParagraph' is assigned a value but never used  @typescript-eslint/no-unused-vars

E:\...\src\components\ui\button\Button.vue
  4:10  error  'Primitive' is defined but never used       @typescript-eslint/no-unused-vars
  4:26  error  'PrimitiveProps' is defined but never used  @typescript-eslint/no-unused-vars

E:\...\src\components\ui\card\CardTitle.vue
  14:16  error  Parsing error: end-tag-with-attributes  vue/no-parsing-error
  17:16  error  Parsing error: end-tag-with-attributes  vue/no-parsing-error

E:\...\src\components\ui\label\Label.vue
  9:18  error  '_' is assigned a value but never used  @typescript-eslint/no-unused-vars

E:\...\src\components\ui\separator\Separator.vue
  11:18  error  '_' is assigned a value but never used  @typescript-eslint/no-unused-vars

E:\...\src\components\ui\table\TableEmpty.vue
  15:18  error  '_' is assigned a value but never used  @typescript-eslint/no-unused-vars

E:\...\src\router\index.ts
  9:26  error  'to' is defined but never used     @typescript-eslint/no-unused-vars
  9:30  error  '_from' is defined but never used  @typescript-eslint/no-unused-vars
```

All 13 lint errors are pre-existing in files not modified by this issue. No lint errors in the changed files.

## Type Check Output

`vue-tsc --build` — no errors, no output.

## Review Findings

### Changed files reviewed

- `src/types/station-warning.ts`
- `src/types/index.ts`
- `src/composables/useStationPrices.ts`
- `src/pages/index.vue`

### Security guidelines

- Rule 1 (URL encoding): `encodeURIComponent` applied in `buildFetchUrl`. Verified.
- Rule 2 (No direct browser fetch): All fetches go through `/.netlify/functions/fetch-page`. Verified.
- Rule 3 (Treat response as untrusted): `asFetchPageResponse` validates the shape at runtime before accessing fields. Verified.
- Rule 4 (No raw HTML rendered): Only parsed `StationData` (fuels list) enters `results`; raw HTML is never exposed in reactive state. Verified.
- Rule 5 (No internal error details in UI): Warning messages in `index.vue` display only `stationName` and `url` — not the raw `error` field. Verified.
- Rule 6 (Concurrent fetch isolation): `fetchOneStation` has a `try/catch` that converts any thrown error to a warning. `Promise.allSettled` ensures one failure cannot abort others. Verified.
- Rule 7 (No new external dependencies): Only native `fetch` and `Promise` APIs used. Verified.
- Rule 8 (IndexedDB input treated as untrusted): Station URLs pass through `encodeURIComponent` before use. Verified.

### Object Calisthenics

- One level of indentation per method: all functions are flat or extract inner logic. Verified.
- No `else` keyword: all branches use early returns or guard clauses. Verified.
- No abbreviations: `station`, `results`, `warnings`, `fetchOneStation`, `applySuccessResponse` — all names are clear. Verified.
- Singleton pattern: module-level refs, composable function returns references. Verified.

### Business spec compliance

- Composable exposes exactly `results`, `warnings`, `isLoading`, `loadAllStationPrices`. Verified.
- Concurrent fetches: `Promise.allSettled(stationList.map(fetchOneStation))`. Verified.
- `isLoading` true until all settle: set before `Promise.allSettled`, cleared in `finally`-equivalent position after await. Verified.
- `selector_not_found` goes to `warnings`: handled in `fetchOneStation`. Verified.
- Network errors go to `warnings`: caught in the `catch` block. Verified.
- `StationPrices.vue` is NOT referenced or implemented (out of scope for issue 18). Verified.
- Warning messages show station name and URL in `index.vue`. Verified.
- Empty station list: early return before `isLoading` is set. Verified.

No findings. All checklist items pass.

status: approved
