# Review Results — Sub-Issue B (#83): Repo Configuration (final re-review)

## `npm run lint`

`rtk lint` still fails to run in this environment ("Failed to run eslint... program not found" —
same known issue recorded in `sub-issue-81/review-results.md`), so `npm run lint` (`eslint . --fix`)
was used directly:

```
E:\Git\...\src\composables\usePreferencesExport.spec.ts
  39:5  error  'lastDownloaded' is assigned a value but never used  @typescript-eslint/no-unused-vars

E:\Git\...\src\composables\usePreferencesImport.spec.ts
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

All 9 errors are pre-existing in unrelated spec files (same as both prior review rounds).
`npx eslint src/composables/useRepoConfig.ts` (targeted run) reports zero errors — clean.

## `npm run type-check`

Passes cleanly — no output.

## Checklist

- Security guidelines coverage:
  - Rule 1 (never expose secret/token) — ✓.
  - Rule 2 (cookie flags) — N/A.
  - Rule 3 (state round-trip) — N/A.
  - Rule 4 (forward owner/repo/path exactly) — ✓.
  - Rule 5 (401 clears cookie server-side, composable surfaces a re-auth prompt) — ✓. `notifyUnauthorized` always resolves to `SESSION_EXPIRED_MESSAGE`, independent of callback wiring or failure.
  - Rule 6 (token never reaches the SPA) — ✓.

- Object Calisthenics — ✓. All three deviations in this file are now documented in both the
  code (inline comments at `useRepoConfig.ts:19-22`, `54-58`, `115-120`) and
  `technical-specifications.md`'s "Object Calisthenics exceptions" section: the composable
  body length, `resolveValidationError`'s guard-clause chain, and the third module-level
  variable `latestSaveRequestId`. Guard clauses only, no `else`, no abbreviations,
  discriminated-union domain types (`ProxyCheckResult`, `OwnerRepo`).
- Business spec match — ✓. Sub-Issue B rule 2 still implemented exactly: `persistRepoConfig`
  (`useRepoConfig.ts:156`) runs unconditionally on every save, unaffected by the
  `latestSaveRequestId` guard, which only gates the two reactive-state writes
  (`repoConfig.value`, `validationError.value`) — so "saving always persists to IndexedDB"
  still holds regardless of request ordering.
- No dead code/unused imports — ✓.
- Naming clarity — ✓.
- Vue/TS pitfalls — ✓. `repoConfig.value = { ...draft }` (`useRepoConfig.ts:157`) now assigns
  a shallow copy instead of aliasing the caller's object into singleton state, closing the
  gap where a caller mutating its own form-model object after `saveRepoConfig` returned could
  previously leak into the composable's shared reactive state without another explicit save.
  No destructuring of reactive state, no `reactive()` on a primitive, no `any`, no non-null
  `!`, all parameters and exported functions typed (aside from `useRepoConfig()` itself,
  matching existing precedent).

### Findings

None.

status: approved
