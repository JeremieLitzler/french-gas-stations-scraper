# Security Guidelines — Issue #106: Refresh Data Button

## Rules

1. **What**: Trigger the on-demand refresh through the existing validated fetch path
   (decode, shape-check via `parseJsonFile`, error mapping) — bypass only the
   revalidate-cache-days staleness check, never the content validation itself.
   **Where**: `useRemotePreferencesSync.ts`.
   **Why**: a parallel fetch path built for the manual trigger could skip the shape
   validation the automatic sync already enforces, letting a malformed or tampered
   remote file reach IndexedDB unchecked.

2. **What**: Apply the fetched station list and default fuel type only through the
   existing `replaceStations`/`saveDefaultFuelType`/`clearDefaultFuelType` setters —
   never write the remote array/value directly into IndexedDB.
   **Where**: `useStationStorage.ts`, `useDefaultFuelType.ts` (via the same
   `applyRemotePreferences`-style callback `HomePageContent.vue` already uses on load).
   **Why**: those setters are what enforce the `prix-carburants.gouv.fr` origin
   allowlist and HTML-tag stripping on station names; bypassing them would let a
   compromised or malicious remote file smuggle an off-origin URL or markup-bearing
   name into the price table.

3. **What**: Disable the action while a refresh is in flight and keep it on the same
   bounded fetch timeout (`REMOTE_FETCH_TIMEOUT_MS`) the automatic sync already uses —
   do not give the manual trigger its own unbounded request.
   **Where**: the on-demand trigger in `useRemotePreferencesSync.ts` and the button
   state in `StationManager.vue`.
   **Why**: without a concurrency guard, rapid repeated clicks fan out multiple
   requests through `github-api-proxy` against the user's OAuth rate limit; without
   the timeout, a hung upstream response leaves the confirmed action stuck
   indefinitely.

4. **What**: On a failed on-demand refresh, roll back both the local station/fuel-type
   data and the `preferencesLastSyncedAt` timestamp to their pre-click values — not
   the data alone.
   **Where**: the rollback path added to `useRemotePreferencesSync.ts` / its caller,
   mirroring `restorePreferencesSyncedAt`'s existing use in `HomePageContent.vue`.
   **Why**: rolling back only the data while leaving the timestamp advanced marks
   local state as freshly synced despite the fetch having failed, masking a real
   divergence from remote until the cache window naturally expires.

status: ready
