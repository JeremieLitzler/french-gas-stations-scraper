# ADR-008: IndexedDB Over localStorage for Client-Side Persistence

**Date:** 2026-03-04
**Status:** Accepted

## Context

The application may need to persist data (such as extracted article state) on the client side across browser sessions. Two primary browser-native options exist: `localStorage` and `IndexedDB`.

`localStorage` is synchronous, string-only, and shared across all tabs of the same origin with a typical quota of 5 MB.

`IndexedDB` is an asynchronous, transactional, key-value object store that can hold structured data (objects, arrays, blobs) natively, with storage limits in the hundreds of megabytes.

## Decision

When client-side persistence is required in this application, **IndexedDB via a thin native wrapper** is the preferred storage mechanism. No third-party library is added; a small project-owned composable (~60–70 lines) wraps the event-based API in Promises.

The wrapper exposes three operations only: `get(key)`, `set(key, value)`, `del(key)`. It caches the `IDBDatabase` connection in a module-level variable to avoid re-opening the database on every call.

## Consequences

### Positive

- Async API does not block the main thread, keeping the UI responsive during reads and writes.
- Stores JavaScript objects natively — no JSON serialisation round-trip required for complex types such as `Article`.
- Significantly larger storage quota than `localStorage`.
- Transactional model reduces the risk of partial writes corrupting stored data.
- No additional dependency.

### Negative

- The native IndexedDB API is event-driven (`onsuccess` / `onerror`); each operation requires a `new Promise(...)` wrapper — more boilerplate than `localStorage`.
- Requires async/await handling in components and composables that currently use synchronous state.
- **Known limitation — multi-tab schema upgrade:** The native API fires `onblocked` when a schema version bump is pending but another tab still holds a connection. The wrapper does not handle this event. Consequence: if a future schema migration is deployed, tabs opened before the migration must be manually refreshed. Acceptable for a single-user, single-schema app.
- **Known limitation — no cursor/index support:** The wrapper covers only keyed get/set/delete. Any future need for range queries or indexed lookups would require extending the wrapper or adopting `idb`.

## Alternatives Considered

- **localStorage**: Simpler API but synchronous, string-only, and quota-constrained. Not suitable for storing structured objects without serialisation overhead.
- **sessionStorage**: Same limitations as `localStorage` plus data is lost when the tab closes — no cross-session persistence.
- **Cookie storage**: Not designed for application data; limited to 4 KB and sent with every HTTP request.
- **`idb` library**: Ergonomic Promise wrapper with full edge-case handling. Rejected to avoid adding a dependency for a use case covered by ~70 lines of native code.

## Notes

- At the time of writing (ADR-002), persistence was explicitly out of scope. This ADR supersedes that assumption for any future feature that introduces client-side persistence.
- If the wrapper needs to grow beyond get/set/delete, evaluate adopting `idb` at that point.
