# Review Results — Sub-Issue B (#83): Repo Configuration (re-review after fixes)

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

All 9 errors are pre-existing in unrelated spec files (same as the prior review round).
`npx eslint src/composables/useRepoConfig.ts` (targeted run) reports zero errors — clean.

## `npm run type-check`

Passes cleanly — no output.

## Checklist

- Security guidelines coverage:
  - Rule 1 (never expose secret/token) — ✓, unchanged from prior round.
  - Rule 2 (cookie flags) — N/A.
  - Rule 3 (state round-trip) — N/A.
  - Rule 4 (forward owner/repo/path exactly) — ✓, unchanged from prior round (`github-api-proxy.ts` not touched this round).
  - Rule 5 (401 clears cookie server-side, composable surfaces a re-auth prompt) — ✓, **Finding 1 resolved.** `notifyUnauthorized` (`useRepoConfig.ts:101-108`) now always resolves to `SESSION_EXPIRED_MESSAGE`, independent of whether `onUnauthorized` was passed and independent of that callback throwing (wrapped in `try/catch`). The re-auth prompt is now guaranteed by this composable alone, matching the wording already used by `useGitHubAuth.ts`'s own `SESSION_EXPIRED_MESSAGE`.
  - Rule 6 (token never reaches the SPA) — ✓, unchanged.

- Object Calisthenics:
  - **Finding 2 resolved.** `resolveValidationError`'s guard-clause chain now has a documented exception, both inline (`useRepoConfig.ts:110-115`) and in `technical-specifications.md` ("Object Calisthenics exceptions"), matching the `validateCallbackRequest` precedent.
  - **New finding, see below (Finding 1).** The new `latestSaveRequestId` module-level counter is a third piece of shared module state in this file (alongside `repoConfig` and `validationError`), where the ≤2-variable guideline and this codebase's own precedent (`useGitHubAuth.ts` keeps exactly 2: `isAuthenticated`, `authError`) both point to 2. No exception is documented for it.
  - Otherwise ✓ — guard clauses only, no `else`, no abbreviations, discriminated-union domain types unchanged.

- Business spec match — ✓. Sub-Issue B rule 2 still implemented exactly (save always persists — the new `requestId` guard only gates the `validationError` write, never `persistRepoConfig`/`repoConfig.value`, so "saving always persists to IndexedDB" still holds unconditionally). No scope creep: the race-condition guard fixes a self-identified bug, not a new feature.
- No dead code/unused imports — ✓.
- Naming clarity — ✓. `requestId`, `latestSaveRequestId` are clear, no abbreviations.
- Vue/TS pitfalls — ✓, same as prior round: no reactive destructuring, no `reactive()` on a primitive, no `any`, no non-null `!`, all parameters and exported functions typed (aside from `useRepoConfig()` itself, matching existing precedent). The new `try/catch` in `notifyUnauthorized` and the `requestId` check in `saveRepoConfig` don't introduce any of the listed pitfalls.

### Findings

1. **Undocumented Object Calisthenics deviation: `latestSaveRequestId` is a third module-level state variable in a file that otherwise holds to 2.**
   `src/composables/useRepoConfig.ts:53` — `repoConfig` and `validationError` were already documented (implicitly, by precedent) as this composable's 2 pieces of shared state, matching `useGitHubAuth.ts`'s own 2 (`isAuthenticated`, `authError`). `latestSaveRequestId` adds a third, with no exception note in `technical-specifications.md`'s "Object Calisthenics exceptions" section (which already documents the file's other two deviations). Low severity — either add a documented-exception note there (the counter exists solely to guard against a stale concurrent `saveRepoConfig` call overwriting `validationError`, and isn't part of the composable's public reactive surface), for consistency with how the two prior deviations in this same file were handled.

status: changes requested
