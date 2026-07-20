# Review Results — Sub-Issue C (#85): Read Preferences from Remote Repo on Load

## `rtk lint`

`rtk` failed in this environment before reaching eslint (infra issue, not a code issue):

```
Error: Failed to run eslint. Is it installed? Try: pip install eslint (or npm/pnpm for JS linters)
Caused by:
    program not found
```

Fell back to `npm run lint` (`eslint . --fix`) per the user's direction. Result: 9 pre-existing
errors, all in `src/composables/usePreferencesExport.spec.ts` and
`usePreferencesImport.spec.ts` (unused vars) — confirmed via `git log` that this branch has not
touched either file (last commit touching them: `25287b6`, unrelated to issue #64). None of the
five files changed by this sub-issue produce any lint error.

## `npm run type-check`

```
> vue-boilerplate-jli@0.0.0 type-check
> vue-tsc --build
```

Passed cleanly, no errors.

## Checklist

- Security guidelines (all 6 rules): ✓ — this sub-issue is read-only against `github-api-proxy`,
  which already implements rules 1–6 unchanged. `useRemotePreferencesSync.ts` reuses
  `useRepoConfig.ts`'s established 401 pattern: `notifyUnauthorized` always resolves and
  `syncError` is always set (rule 5); the token itself is never read by the SPA, only the
  base64 `content` field already scrubbed of secrets by the proxy (rule 6).
- Object Calisthenics: ✓ — no `else`, no abbreviations, module state stays at one ref per file
  (`syncError`), documented framework exception for the composable body (consistent with
  `useGitHubAuth.ts`/`useRepoConfig.ts`/`useStationStorage.ts`).
- Business spec match (Sub-Issue C rules 1–5, edge cases): ✓ for the staleness gate, the
  merge-and-replace behavior, the timestamp reset on both read and write paths (C-1 through
  C-9 in test-cases.md), and the 401/404 messaging. One correctness gap found — see below.
- No dead code / unused imports: ✓
- Naming clarity: ✓ — no abbreviations in the new/changed code (pre-existing single-letter `s`
  in `useStationStorage.ts`'s `toPlainStations` predates this diff, out of scope).
- Vue/TS pitfalls: ✓ — no reactive destructuring, no primitive `reactive()`, no unguarded `any`,
  explicit types throughout, `toRaw()` used correctly before IndexedDB writes.

### Finding: `applyRemotePreferences` is not atomic — a mid-sequence IndexedDB failure leaves stations and default fuel from different sources

`StationPricesContent.vue`'s `applyRemotePreferences` (lines 106–113) calls
`await replaceStations(data.stations)` followed by `await saveDefaultFuelType(data.defaultFuel)`
(or `clearDefaultFuelType()`). Both are independent `await set(...)` calls to IndexedDB.
`refreshFromRemote` (`useRemotePreferencesSync.ts:196-201`) wraps the whole call in one
`try/catch`, and the code comment there states the intent is that a failure leaves "the
still-valid local data in place." That's only true if the *first* write throws. If
`replaceStations` succeeds and the second write (`saveDefaultFuelType`/`clearDefaultFuelType`)
then throws — e.g. a quota-exceeded error on the second `IDBObjectStore.put`, or the connection
being invalidated between the two calls — the station list is already the new remote one while
`defaultFuelType` is still the old local value. `syncError` is then set to
`REMOTE_FETCH_FAILED_MESSAGE`, which reads as "nothing changed, please reconnect," but the
station list actually did change. This contradicts business-specifications.md Sub-Issue C rule 3
("merges ... into IndexedDB" as one operation) and the self-review note in
technical-specifications.md item 2, which assumes the fallback is "leaving the still-valid local
data in place."

- **Failure scenario:** remote fetch/parse succeeds → `replaceStations` writes the new station
  list to IndexedDB successfully → `saveDefaultFuelType` throws (any IndexedDB write error) →
  user sees a "reconnect" banner while their station list has silently changed underneath them
  with no default-fuel update to match.
- Low likelihood (both writes hit the same DB/store, so a mid-sequence failure requires the
  first `put` to succeed and the second to fail), but the current code does not prevent it and
  the accompanying comments claim a guarantee that isn't actually held.

## Status

status: changes requested
