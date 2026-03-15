# Code Review Results — Issue #15: useStationStorage Composable

## Files Reviewed

- `src/utils/indexedDb.ts`
- `src/composables/useStationStorage.ts`

---

## Tool Output

### `rtk lint` (equivalent: `npm run lint`)

```
> vue-boilerplate-jli@0.0.0 lint
> eslint . --fix

Oops! Something went wrong! :(

ESLint: 9.39.4

SyntaxError: Unexpected token ':'
    at compileSourceTextModule (node:internal/modules/esm/utils:318:16)
    at ModuleLoader.moduleStrategy (node:internal/modules/esm/translators:99:18)
    ...
```

This is the pre-existing `eslint.config.js` syntax error noted as out of scope for this issue. No lint findings are attributable to the reviewed files.

### `npm run type-check`

```
> vue-boilerplate-jli@0.0.0 type-check
> vue-tsc --build
```

Exit 0 — no TypeScript errors.

---

## Security Guidelines Verification

| Rule | Status | Notes |
|------|--------|-------|
| 1. Validate URL format before storing | Met | `isValidUrl` uses `new URL()` + `.origin` comparison against `ALLOWED_ORIGIN` before any write in `addStation`. |
| 2. Validate name length and character set | Met | `isValidName` enforces `stripped === name && name.length > 0 && name.length <= MAX_NAME_LENGTH`. Empty string is rejected. |
| 3. Do not render via `v-html` | Met | No Vue templates in the reviewed files. No `v-html` introduced by this issue. |
| 4. Treat IndexedDB reads as untrusted | Met | `filterValidStations` + `isStation` type guard discards any entry not matching `{ name: string, url: string }`. |
| 5. Do not expose DB handle outside composable | Met | Only `stations`, `loadStations`, `addStation`, `removeStation` are returned. `resetDatabaseConnection` is exported from the utility for test isolation, not from the composable. |
| 6. No URL-encoding transformations | Met | Raw user-supplied string passed directly to `new URL()` without pre-processing; no normalisation applied before storage. |
| 7. No secrets or environment variables | Met | All configuration declared as module-level constants. No `import.meta.env` access. |
| 8. No network requests | Met | Only IndexedDB API calls; no `fetch`, `XMLHttpRequest`, or dynamic `import()` in either file. |

---

## Business Specification Verification

### Singleton pattern (ADR-002)

Met. `stations` is declared at module level as `const stations: Ref<Station[]> = ref([])`. All consumers share the same reference.

### Station type reuse

Met. `Station` is imported from `@/types/station` and used as the list element type throughout.

### Default station list

Met. All five default stations are present in `DEFAULT_STATIONS` with exact names and URLs matching the business spec.

### Load behaviour

Met. `loadStations` reads from IndexedDB, runs `filterValidStations`, and branches:
- Non-empty valid list → assigns to `stations.value`, returns.
- Empty or absent → calls `seedDefaults`, which writes defaults to IndexedDB and assigns to `stations.value`.

### Add behaviour

Met. `addStation` validates URL origin and name, appends to the current list, writes the full updated list under `STATIONS_KEY`, then updates `stations.value`.

### Remove behaviour

Met. `removeStation` filters by URL, short-circuits with an early return if nothing changed (no superfluous write), otherwise writes the filtered list and updates `stations.value`.

### Persistence key

Met. Single constant `STATIONS_KEY = 'stations'` used for all reads and writes.

### IndexedDB wrapper

Met. `indexedDb.ts` exposes `get<T>`, `set`, `del`, and `resetDatabaseConnection`. The composable imports only `get` and `set`. Remove overwrites the list under a single key rather than deleting individual entries, which is correct for the "single key" storage model in the spec.

### Write durability (Post-Review Fix 1)

Met. For `readwrite` transactions, `runTransaction` now resolves on `transaction.oncomplete` rather than `request.onsuccess`, ensuring the Promise only resolves after durable commit. `readonly` transactions retain the original `request.onsuccess` path via an early-return guard.

---

## Code Quality

### Dead code / unused imports

None. All imports (`ref`, `Ref`, `Station`, `get`, `set`) are used. No functions are defined but unreferenced.

### Type safety

No `any`. No unguarded `!` (non-null assertions). All exported functions carry explicit return types: `useStationStorage` has an inline return type annotation listing all four members with their exact types. Internal helpers have unambiguous inferred return types.

### Naming clarity

No abbreviations. All identifiers are self-descriptive (`filterValidStations`, `isValidUrl`, `isValidName`, `stripHtmlTags`, `seedDefaults`, `runTransaction`, `openDatabase`).

### Vue / composable conventions

- `use` prefix on the exported composable — correct.
- Returns a plain object containing refs and async functions — correct.
- Module-level singleton `stations` ref — correct per ADR-002.

### Known limitation (not a finding)

`transaction.onabort` in `runTransaction` rejects with `transaction.error`, which may be `null` for programmatic aborts. This is explicitly acknowledged in the technical spec (Post-Review Fixes, Fix 1) as an existing limitation of the IndexedDB API, not introduced by this issue.

### Missing `.spec.ts` file

Not a finding. The test file is authored by the test-writer agent in Pass 2, after this review.

---

## Summary

Both files are clean. Type-check exits with zero errors. The lint crash is the pre-existing `eslint.config.js` syntax error, explicitly out of scope. All eight security rules are verifiably addressed. All business spec requirements are correctly implemented. No dead code, no `any`, no missing return types, no naming issues. Composable conventions and the singleton pattern are correctly applied. Post-Review Fixes 1–3 from the technical spec (write durability, explicit return type, empty-name rejection) are all present in the current code.

status: approved
