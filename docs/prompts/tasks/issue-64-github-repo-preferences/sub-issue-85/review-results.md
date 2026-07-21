# Review Results — Sub-Issue C (#85): Read Preferences from Remote Repo on Load

*(Fifth pass — reviewing commit "fix(github-sync): flatten error-mapping in remote preferences
sync", which extracts `handleFetchFailure` to address this file's prior finding.)*

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
`useRemotePreferencesSync.ts`, the only file this pass changed, produces no lint error.

## `npm run type-check`

```
> vue-boilerplate-jli@0.0.0 type-check
> vue-tsc --build

src/composables/useRemotePreferencesSync.spec.ts(33,44): error TS2307: Cannot find module '@/types/remote-preferences' or its corresponding type declarations.
```

Same documented, out-of-scope gap as the previous pass (owned by `/jli-writes-tests-spec`/
`/jli-writes-tests`). No other file fails to type-check.

## Checklist

- Security guidelines (all 6 rules): ✓ — unchanged from the prior pass. Rule 5's re-auth path
  (`RemoteUnauthorizedError` → `notifyUnauthorized` → `ACCESS_REVOKED_MESSAGE`, no silent retry)
  now lives in `handleFetchFailure` instead of inline in `resolveRemotePreferences`'s `catch`,
  but the behavior is identical — verified line-by-line against the previous version.
- Object Calisthenics: ✓ — the prior finding is fixed. `handleFetchFailure` holds the three
  `instanceof` branches as sibling statements at a single indentation level (no wrapping `try`);
  `resolveRemotePreferences`'s `catch` body is now the single statement
  `return handleFetchFailure(error, onUnauthorized)`. Checked every other function in the file
  for the same pattern (`requestRemoteFile`, `extractResponseContent`, `decodeAndParseRemoteFile`,
  `fetchRemotePreferences`, `notifyUnauthorized`, `refreshFromRemote`, `syncOnLoad`) — each keeps
  `try`/`catch` and `if` guards as siblings, not nested inside one another, consistent with the
  now-fixed function.
- Business spec match (Sub-Issue C rules 1–6, edge cases): ✓ — no behavior changed by this pass;
  the three `syncError` outcomes (`ACCESS_REVOKED_MESSAGE`, `INVALID_REMOTE_CONTENT_MESSAGE`,
  `REMOTE_FETCH_FAILED_MESSAGE`) and their triggering conditions are byte-for-byte the same as
  the previously-reviewed logic, just relocated.
- No dead code / unused imports: ✓
- Naming clarity: ✓ — `handleFetchFailure` is descriptive, no abbreviations; parameters
  (`error`, `onUnauthorized`) match existing conventions in the file.
- Vue/TS pitfalls (checked against current Vue reactivity/composables/TypeScript docs and MDN's
  `URL`): ✓ — `handleFetchFailure`'s `catch (error)` remains typed `unknown` and is narrowed via
  `instanceof` before use; its explicit `Promise<null>` return type is assignable to
  `resolveRemotePreferences`'s declared `Promise<PreferencesFile | null>` (`null` is a member of
  that union), and returning the call directly (no `await`) is correct here since nothing after
  it needs to observe or transform the settled value before the enclosing `async` function
  resolves.

No findings.

## Status

status: approved
