# Review Results — Sub-Issue C (#85): Read Preferences from Remote Repo on Load

*(Fourth pass — reviewing the field-name fix + error-signaling rework in commit "fix(github-sync):
align remote preferences field names with spec".)*

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

Confirmed via `git log -1 -- <both files>` that the last commit touching either file is
`25287b6`, unrelated to issue #64/#85. None of the files this pass changed
(`useRemotePreferencesSync.ts`, `StationPricesContent.vue`) produce any lint error.

## `npm run type-check`

```
> vue-boilerplate-jli@0.0.0 type-check
> vue-tsc --build

src/composables/useRemotePreferencesSync.spec.ts(33,44): error TS2307: Cannot find module '@/types/remote-preferences' or its corresponding type declarations.
```

Matches technical-specifications.md's documented "Known gap" — the spec file still imports the
deleted `@/types/remote-preferences` module and uses the old `stations`/`defaultFuel` field
names, and updating it is explicitly out of scope for `/jli-codes` (owned by
`/jli-writes-tests-spec`/`/jli-writes-tests`). No other file in the tree fails to type-check.

## Checklist

- Security guidelines (all 6 rules): ✓ — rules 1/2/3/6 are not applicable to this file (no
  Client Secret/cookie/state handling here). Rule 5 (401 ⇒ definitive, re-auth prompt, no
  silent retry): `requestRemoteFile` throws `RemoteUnauthorizedError` on 401, caught once in
  `resolveRemotePreferences`, which calls `notifyUnauthorized` and sets `syncError` to
  `ACCESS_REVOKED_MESSAGE` — no retry with the same token anywhere in the path. Rule 4 (forward
  `owner`/`repo`/`path` exactly as supplied): `buildProxyUrl` forwards `config.ownerRepo`/
  `config.filePath` from IndexedDB untouched, consistent with the proxy-side rule this file
  doesn't itself enforce but must not violate.
- Business spec match (Sub-Issue C rules 1–6, edge cases, "Remote JSON File Structure"): ✓ —
  field names now match (`favoriteStations`/`fuelTypeDefault`); a `null`/empty-string
  `fuelTypeDefault` and an empty `favoriteStations` array are accepted (verified against
  `parseJsonFile`'s `validateFuelTypeDefault`/`validateFavoriteStations`, which treat both as
  valid); a missing key, wrong-typed `fuelTypeDefault`, or one malformed station entry all
  reject the *whole* file via `RemoteContentInvalidError` → `INVALID_REMOTE_CONTENT_MESSAGE`,
  distinct from `ACCESS_REVOKED_MESSAGE`/`REMOTE_FETCH_FAILED_MESSAGE` (test-cases.md C-10
  through C-15 are all satisfiable against this implementation).
- Object Calisthenics: **1 finding** (see below) — everything else holds: no `else` anywhere
  (guard clauses throughout), no abbreviations, the two new error classes have zero instance
  variables, `splitOwnerRepo`'s duplication with `useRepoConfig.ts` is pre-existing and already
  documented.
- No dead code / unused imports: ✓ — `Station`/`RemotePreferencesFile` type import removed
  along with the file; `PreferencesFile`, `parseJsonFile` both used.
- Naming clarity: ✓ — `fuelTypeDefault` renamed consistently through
  `StationPricesContent.vue`'s `applyDefaultFuelOrRollback`/`applyDefaultFuel` to match the new
  field name; no new abbreviations introduced.
- Vue/TS pitfalls (checked against current Vue reactivity/composables/TypeScript docs and MDN's
  `URL`/`URLSearchParams`): ✓ — no reactive destructuring (`stations.value` read directly, not
  destructured); `catch (error)` is narrowed via `instanceof` before use, no unguarded
  `any`/`unknown`; all module-private functions have explicit return types; `buildProxyUrl`'s
  use of `URLSearchParams` correctly percent-encodes the `path` param (e.g. slashes in a nested
  file path) per MDN, unchanged from the prior approved pass.

### Finding: nested indentation in `resolveRemotePreferences`'s catch block

**File:** `src/composables/useRemotePreferencesSync.ts`, lines 181–200.

```ts
async function resolveRemotePreferences(
  repoConfig: RepoConfigDraft,
  onUnauthorized: UnauthorizedCallback,
): Promise<PreferencesFile | null> {
  try {
    return await fetchRemotePreferences(repoConfig)
  } catch (error) {
    if (error instanceof RemoteUnauthorizedError) {
      await notifyUnauthorized(onUnauthorized)
      syncError.value = ACCESS_REVOKED_MESSAGE
      return null
    }
    if (error instanceof RemoteContentInvalidError) {
      syncError.value = INVALID_REMOTE_CONTENT_MESSAGE
      return null
    }
    syncError.value = REMOTE_FETCH_FAILED_MESSAGE
    return null
  }
}
```

The two `if` bodies sit two indentation levels deep (function → `catch` → `if`), violating
"one level of indentation per method." This is also a regression in flatness from the prior
approved pass's `refreshFromRemote`, which handled its three outcomes (`unauthorized`/`error`/
`ok`) as three sequential `if`s at a single level, with no wrapping `try`/`catch` — that
review found no indentation issue because nothing was nested inside another block.

**Suggested fix:** extract the catch body into its own single-purpose function, e.g.:

```ts
async function handleFetchFailure(
  error: unknown,
  onUnauthorized: UnauthorizedCallback,
): Promise<null> {
  if (error instanceof RemoteUnauthorizedError) {
    await notifyUnauthorized(onUnauthorized)
    syncError.value = ACCESS_REVOKED_MESSAGE
    return null
  }
  if (error instanceof RemoteContentInvalidError) {
    syncError.value = INVALID_REMOTE_CONTENT_MESSAGE
    return null
  }
  syncError.value = REMOTE_FETCH_FAILED_MESSAGE
  return null
}

async function resolveRemotePreferences(
  repoConfig: RepoConfigDraft,
  onUnauthorized: UnauthorizedCallback,
): Promise<PreferencesFile | null> {
  try {
    return await fetchRemotePreferences(repoConfig)
  } catch (error) {
    return handleFetchFailure(error, onUnauthorized)
  }
}
```

This restores one level of indentation in both functions and keeps the error-to-message mapping
as its own testable unit.

## Status

status: changes requested
