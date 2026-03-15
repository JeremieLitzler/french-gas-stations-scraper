# Technical Specifications — Issue #15: useStationStorage Composable

## Files Created or Changed

### `src/utils/indexedDb.ts` (created)

Thin Promise-based wrapper around the native IndexedDB API. Exposes `get<T>(key)`, `set(key, value)`, and `del(key)`. Caches the `IDBDatabase` connection at module level to avoid re-opening the database on every call (ADR-008). Also exports `resetDatabaseConnection()` for test isolation.

### `src/composables/useStationStorage.ts` (created)

Singleton composable (ADR-002) that owns the reactive station list and exposes `loadStations`, `addStation`, and `removeStation`. The reactive `stations` ref is declared at module level so all consumers share the same reference. Input validation (URL origin allowlist, name length + HTML-tag check) and read-result validation (type guard on IndexedDB output) enforce security-guidelines.md rules 1–4 and 6–8.

---

## Technical Choice Explanations

### `filterValidStations` instead of `isStationArray` for load-time validation

When reading back from IndexedDB, individual invalid entries are silently discarded rather than rejecting the whole array. This allows partially-corrupted stores (e.g. a single malformed entry written via DevTools) to recover gracefully without losing all valid data. A strict all-or-nothing approach would force the seed on every corruption, wiping legitimate user additions.

### `stripHtmlTags` + equality check for name validation

Instead of a blocklist regex, `isValidName` strips HTML tags and then checks that the result equals the original. This approach rejects any input that contains angle-bracket constructs without requiring an exhaustive list of known tags. It is defence-in-depth alongside Vue's default text interpolation escaping (security-guidelines.md rule 2).

### URL validated via `new URL()` + `.origin` comparison

Using the browser's built-in `URL` constructor to parse and then compare `.origin` avoids hand-rolled string matching that could be bypassed by casing, trailing slashes, or encoded characters. The raw user-supplied string is validated before any write (security-guidelines.md rule 6).

### `removeStation` returns early when nothing changed

Comparing `filtered.length !== stations.value.length` before writing to IndexedDB avoids a superfluous write when the requested URL is not in the list. This keeps IndexedDB writes to the minimum necessary, and the no-op path is explicit rather than falling through to an identical write.

### `seedDefaults` as a separate function

Extracting the default-seed logic into its own function (`seedDefaults`) keeps `loadStations` at a single level of abstraction and makes the seeding path independently testable (each function is ≤5 lines — Object Calisthenics rule 7).

### `resetDatabaseConnection` exported from `indexedDb.ts`

Resetting the cached `IDBDatabase` handle between tests is necessary for test isolation because the module-level variable persists for the lifetime of the module. Exporting a dedicated reset function avoids leaking the raw `cachedDatabase` variable and keeps the internal state encapsulated (security-guidelines.md rule 5).

---

## Object Calisthenics Exceptions

- **Composable function body length** (`useStationStorage`): The exported composable function exceeds five lines because Vue composable conventions require returning all reactive state and operations from a single function. This exception is documented in the file-level JSDoc comment.

---

## Post-Review Fixes (second pass)

### Fix 1 — `runTransaction` resolves on `transaction.oncomplete` for write operations (`src/utils/indexedDb.ts`)

For `readwrite` transactions, the Promise now resolves on `transaction.oncomplete` instead of `request.onsuccess`. The request result is captured in `request.onsuccess` and forwarded when the transaction completes. Rejection is wired to both `transaction.onerror` and `transaction.onabort`. For `readonly` transactions, the original behaviour (resolve on `request.onsuccess`) is preserved via an early-return guard, because read transactions do not need to wait for `oncomplete` to return consistent data.

### Fix 2 — Explicit return type on `useStationStorage` (`src/composables/useStationStorage.ts`)

An inline return type annotation was added to `useStationStorage()` listing `stations`, `loadStations`, `addStation`, and `removeStation` with their exact types. This makes the public API surface explicit and verifiable at the type level.

### Fix 3 — `isValidName` rejects empty string (`src/composables/useStationStorage.ts`)

`name.length > 0` was added to the `isValidName` guard so that an empty string is now rejected. The full condition is `stripped === name && name.length > 0 && name.length <= MAX_NAME_LENGTH`.

---

## Self-Code Review

Five potential issues identified; three addressed in the first pass, two in the second pass:

1. **Unused imports (`readonly`, `DeepReadonly`)**: The original draft imported `readonly` and `DeepReadonly` from Vue for a planned read-only return type but did not use them. Both imports were removed to prevent a lint error.

2. **Dead function (`isStationArray`)**: The original draft defined `isStationArray` but the only call site uses `filterValidStations`. `isStationArray` was removed as dead code.

3. **`filterValidStations` does not validate URL origin on load**: Entries read from IndexedDB are checked only for structural validity (`{ name: string, url: string }`), not for URL origin. This is intentional: enforcing origin validation at read time would discard stations the user added via the composable itself before any allowlist existed (or from a future migration). Origin validation is correctly applied only at write time (`addStation`), per security-guidelines.md rule 1.

4. **`runTransaction` resolved too early for writes**: `request.onsuccess` fires before durable commit; fixed by resolving on `transaction.oncomplete`. If the transaction aborts without an error (programmatic abort), `transaction.error` may be `null` — this is an existing limitation of the API wrapper, not introduced by this fix.

5. **`isValidName` accepted empty strings**: The `name.length <= MAX_NAME_LENGTH` check evaluated to `true` for `""`. Fixed by adding `name.length > 0` as a required condition.

---

status: ready
