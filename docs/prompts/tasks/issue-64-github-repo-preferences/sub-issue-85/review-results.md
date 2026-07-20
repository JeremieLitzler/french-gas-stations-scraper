# Review Results — Sub-Issue C (#85): Read Preferences from Remote Repo on Load

## `rtk lint`

`rtk` failed in this environment before reaching eslint (infra issue, not a code issue):

```
Error: Failed to run eslint. Is it installed? Try: pip install eslint (or npm/pnpm for JS linters)
Caused by:
    program not found
```

Fell back to `npm run lint` (`eslint . --fix`). Result: 9 pre-existing errors, all in
`src/composables/usePreferencesExport.spec.ts` and `usePreferencesImport.spec.ts` (unused vars) —
confirmed via `git log -1 -- <both files>` that the last commit touching either file is
`25287b6`, unrelated to issue #64. None of the six files changed by this sub-issue produce any
lint error.

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
- Business spec match (Sub-Issue C rules 1–5, edge cases): one correctness gap found — see below.
  Otherwise ✓ for the staleness gate, the merge-and-replace behavior, the timestamp reset on
  both read and write paths (C-1 through C-9 in test-cases.md), and the 401/404 messaging.
- No dead code / unused imports: ✓
- Naming clarity: ✓ — no abbreviations in the new/changed code.
- Vue/TS pitfalls: ✓ — no reactive destructuring, no primitive `reactive()`, no unguarded `any`,
  explicit types throughout, `toRaw()` used correctly before IndexedDB writes.

### Finding: the rollback added for the previous review's atomicity fix marks the sync timestamp fresh even though the merge failed

`StationPricesContent.vue`'s `applyDefaultFuelOrRollback` (lines 121–131) rolls the station list
back to `previousStations` via `replaceStations(previousStations)` when the default-fuel write
throws, then re-throws so `refreshFromRemote` sets `syncError` to the generic "please reconnect"
message. This correctly restores the *station data* to its pre-merge value (the finding from the
prior review is fixed), but `replaceStations` unconditionally calls `markPreferencesSynced()`
(`useStationStorage.ts:143`) at the end of every call — including this rollback call, and
including the first, already-successful `replaceStations(data.stations)` call at line 117 before
the failure is even known. Neither call is a "successful remote read" (business-specifications.md
Sub-Issue C rule 4) nor a "user-triggered update" (rule 5); the merge as a whole failed.

- **Failure scenario:** IndexedDB data is stale → remote fetch/parse succeeds → `replaceStations`
  writes the new list and resets the timestamp to now → the default-fuel write then throws →
  the rollback writes the station list back to `previousStations` and resets the timestamp to
  now *again* → `syncError` correctly shows "please reconnect," but on the next page load
  `isPreferencesStale` sees a fresh timestamp and skips the remote fetch entirely, for a full
  `revalidateCacheDays` period. The user is left on the same stale local data the sync was
  supposed to refresh, with no error banner (it clears on the next mount, since `syncOnLoad`
  short-circuits before `refreshFromRemote` ever runs), and no further retry until they make a
  manual edit (which also resets the timestamp) or wait out the cache window again.
- This contradicts rule 4's premise that only a *successful* read updates the timestamp, and
  undercuts the guarantee the previous fix's own rationale claims to restore
  (technical-specifications.md item 4: "so the existing `syncError` message is accurate again") —
  the message is accurate, but a silent, incorrect timestamp reset survives the rollback.
- Same low-likelihood trigger as the prior finding (requires the first write to succeed and the
  second to fail), but it is a new, unaddressed side effect of that finding's own fix, and no
  test case in `test-cases.md` covers this path — worth closing now rather than carrying forward.
- Suggested direction (not prescriptive): only reset the timestamp once, after both writes have
  succeeded — e.g. have `applyRemotePreferences` call `markPreferencesSynced()` itself after a
  successful `applyDefaultFuel`, and have the rollback path restore the *previous* timestamp value
  (or at minimum avoid re-marking it fresh) instead of relying on `replaceStations`'s unconditional
  call for this callback's success signal.

## Status

status: changes requested
