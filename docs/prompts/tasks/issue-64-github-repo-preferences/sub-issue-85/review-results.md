# Review Results — Sub-Issue C (#85): Read Preferences from Remote Repo on Load

*(Sixth pass — reviewing commit 117fd47 "feat(github-sync): centralize load orchestration, add
empty state (#85)" and its security counterpart 1bcc6d2 "feat(security): require bounded wait for
remote sync fetch (#85)", per technical-specifications.md's "Sixth pass" changelog. Supersedes the
prior review-results.md, which reviewed the fifth pass only.)*

## `rtk lint`

`rtk` failed in this environment before reaching eslint (infra issue, not a code issue):

```
Error: Failed to run eslint. Is it installed? Try: pip install eslint (or npm/pnpm for JS linters)
Caused by:
    program not found
```

Fell back to `npm run lint` (`eslint . --fix`):

```
E:\...\src\composables\usePreferencesExport.spec.ts
  39:5  error  'lastDownloaded' is assigned a value but never used  @typescript-eslint/no-unused-vars

E:\...\src\composables\usePreferencesImport.spec.ts
   36:15  error  'PreferencesDiff' is defined but never used       @typescript-eslint/no-unused-vars
   71:33  error  '_s' is defined but never used                    @typescript-eslint/no-unused-vars
   72:36  error  '_url' is defined but never used                  @typescript-eslint/no-unused-vars
   72:50  error  '_s' is defined but never used                    @typescript-eslint/no-unused-vars
   73:42  error  '_label' is defined but never used                @typescript-eslint/no-unused-vars
  433:34  error  '_url' is defined but never used                  @typescript-eslint/no-unused-vars
  466:34  error  '_url' is defined but never used                  @typescript-eslint/no-unused-vars
  468:11  error  'externalUrl' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 9 problems (9 errors, 0 warnings)
```

Unchanged from the previous pass — last touched by commit `25287b6`, unrelated to issue #64/#85.
None of the files this pass changed (`useStationStorage.ts`, `EmptyStationsMessage.vue`,
`HomePageContent.vue`, `src/pages/index.vue`, `StationPricesContent.vue`,
`StationManagerTable.vue`, `StationManager.vue`, `useRemotePreferencesSync.ts`) produce a lint
error.

## `npm run type-check`

```
> vue-boilerplate-jli@0.0.0 type-check
> vue-tsc --build

src/composables/useRemotePreferencesSync.spec.ts(33,44): error TS2307: Cannot find module '@/types/remote-preferences' or its corresponding type declarations.
```

Same documented, out-of-scope gap as the previous pass (owned by `/jli-writes-tests-spec`/
`/jli-writes-tests` — tracked in technical-specifications.md's "Known gaps"). Every file this pass
changed type-checks cleanly, including the new `HomePageContent.vue`'s calls into
`useGitHubAuth`/`useRepoConfig`/`useDefaultFuelType`/`useStationStorage`/
`useRemotePreferencesSync` (verified each destructured export exists with the signature
`HomePageContent.vue` assumes).

## Checklist

- Security guidelines: ✓
  - Rules 1–6: unchanged by this pass — no OAuth/cookie/proxy code touched.
  - Rule 7 (bound the remote-fetch wait): ✓ — `useRemotePreferencesSync.ts`'s new
    `fetchWithTimeout` wraps the proxy `fetch` in an `AbortController` with a 10 s
    (`REMOTE_FETCH_TIMEOUT_MS`) bound, aborting and rejecting instead of hanging. The rejection
    flows through the existing `handleFetchFailure` catch-all branch into
    `REMOTE_FETCH_FAILED_MESSAGE`, and `HomePageContent.vue` awaits `syncOnLoad` after already
    having loaded local IndexedDB state via `loadStations()`/`loadDefaultFuelType()` in the same
    `Promise.all`, so a timed-out sync falls back to the already-loaded local state (or the empty
    state if none exists) rather than blocking indefinitely — matches C-19.
- Business spec match (Sub-Issue C rules 7–8 and their edge cases): ✓
  - Rule 7 (no seeded example list, ever): ✓ — `useStationStorage.ts`'s `loadStations()` now only
    reads and validates IndexedDB; `DEFAULT_STATIONS`/`mergeWithDefaults()` are gone. Both
    `StationPricesContent.vue` and `StationManagerTable.vue` render the new
    `EmptyStationsMessage.vue` ("Aucune station pour le moment...") when `stations.length === 0`,
    with no error banner tied to it — matches C-16.
  - Rule 8 (no view renders a stale/pre-sync list): ✓ — `HomePageContent.vue` is the only place
    that calls `loadStations`/`loadDefaultFuelType`/`syncOnLoad`; `StationPricesContent.vue` and
    `StationManagerTable.vue` no longer call any of these themselves (confirmed by grep — neither
    file references `loadStations`, `loadDefaultFuelType`, `initializeAuthState`,
    `loadRepoConfig`, or `syncOnLoad`) and only read the shared `stations`/`defaultFuelType`
    singletons. Because `StationPrices`/`StationManager` are rendered in `HomePageContent.vue`'s
    own template, and `HomePageContent.vue` itself doesn't mount until its `<Suspense>` boundary
    in `index.vue` resolves (i.e., after `syncOnLoad` settles), neither child can exist in the DOM
    with pre-sync data — matches C-17/C-18. The inner `<Suspense>` around
    `StationPricesContent.vue` (in `StationPrices.vue`, pre-existing) only gates the live price
    fetch (`loadAllStationPrices`), which runs after `stations.value` already holds the final
    synced list, so it doesn't reintroduce the race.
- Object Calisthenics: ✓ — `HomePageContent.vue`'s async setup and `useStationStorage.ts`'s
  `replaceStations` are flat, single-indentation-level bodies; `applyRemotePreferences` /
  `applyDefaultFuelOrRollback` / `applyDefaultFuel` are each a single small function with one
  responsibility rather than one nested block. `EmptyStationsMessage.vue` is a single static
  paragraph. Documented framework exceptions (async `setup()` grouping) match the existing
  precedent in `useGitHubAuth.ts`/`useRepoConfig.ts`/`useStationStorage.ts`.
- No dead code / unused imports: ✓ — `StationManagerTable.vue`'s dropped `async` has no leftover
  top-level `await` (confirmed: remaining `await`s are inside `onDelete`/`onNewRowBlur`/etc. event
  handlers, not at the script body's top level); `StationManager.vue`'s removed `<Suspense>`/
  `AppLoader` wrapper has no orphaned references to either.
- Naming clarity: ✓ — no abbreviations introduced; `applyRemotePreferences`,
  `applyDefaultFuelOrRollback`, `fetchWithTimeout`, `previousSyncedAt` are descriptive and
  consistent with existing conventions in the file.
- Vue/TS pitfalls (checked against current Vue reactivity/composables/TypeScript docs and MDN's
  `URL`): ✓
  - `HomePageContent.vue` destructures `stations`/`loadStations`/`replaceStations` etc. directly
    from each composable's return object — no reactivity loss, since each composable returns
    already-created `Ref`s (not a `reactive()` object being destructured).
  - `fetchWithTimeout`'s `AbortController` is created fresh per call (not module-level), so
    concurrent invocations don't share or clobber each other's abort signal.
  - `applyDefaultFuelOrRollback`'s `catch` re-throws after rolling back, and the one caller
    (`refreshFromRemote`) wraps its `applyRemotePreferences(data)` call in its own `try`/`catch`,
    so the rejection is caught once and mapped to `syncError` rather than propagating unhandled
    out of `HomePageContent.vue`'s top-level `await`.
  - No `any`/`unknown` without a narrowing guard, no non-null `!` assertions, and all new/changed
    exported functions have explicit return types.

No findings.

## Status

status: approved
