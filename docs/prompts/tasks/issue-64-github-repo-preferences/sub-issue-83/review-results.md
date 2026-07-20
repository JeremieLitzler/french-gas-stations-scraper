# Review Results — Sub-Issue B (#83): Repo Configuration

## `npm run lint`

`rtk lint` itself failed to run in this environment ("Failed to run eslint... program not found" —
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

All 9 errors are in `usePreferencesExport.spec.ts`/`usePreferencesImport.spec.ts` — pre-existing,
unrelated to this sub-issue's changed files. `npx eslint src/composables/useRepoConfig.ts
netlify/functions/github-api-proxy/github-api-proxy.ts` (targeted run) reports zero errors —
clean for the changed files.

## `npm run type-check`

Passes cleanly — no output.

## Checklist

- Security guidelines coverage:
  - Rule 1 (never expose secret/token) — ✓. `useRepoConfig.ts` never touches the token; `github-api-proxy.ts`'s new `repoCheck` path reuses the same header-building code as `read`, which never logs or returns the token.
  - Rule 2 (cookie flags) — N/A, this sub-issue does not touch cookie issuance.
  - Rule 3 (state round-trip) — N/A, no OAuth flow code touched.
  - Rule 4 (forward owner/repo/path exactly, no server-side cross-check) — ✓. The new `repoCheck` branch forwards `owner`/`repo` exactly as supplied by the SPA, percent-encoded only for URL hygiene (`contentsUrl`, github-api-proxy.ts:151-161), consistent with the existing `read`/`write` branches.
  - Rule 5 (401 clears cookie server-side, composable surfaces a re-auth prompt) — **✗, see Finding 1.** Server-side half is fine (`unauthorizedResponse` clears the cookie for the new `repoCheck` path exactly as it already did for `read`/`write`), but the composable half is not self-contained.
  - Rule 6 (token never reaches the SPA) — ✓. `checkProxyReachable` only reads `response.status`, never the body, for both the file check and the repo check.

- Object Calisthenics — mostly ✓ (guard clauses only, no `else`, discriminated-union domain types for `ProxyCheckResult`/`ContentsRequest`, no abbreviations, `useRepoConfig()`'s own body-length exception already documented in its header comment matching `useGitHubAuth.ts`/`useStationStorage.ts` precedent). **One gap, see Finding 2.**
- Business spec match — ✓. Rule 2 (save always persists; validation only when authenticated; human-readable error on failure) is implemented exactly, including the "file exists OR repo reachable" two-step check the rule names. Rule 1/3/4 correctly left to Sub-Issues A/E/F as scoped in `technical-specifications.md`.
- No dead code/unused imports — ✓.
- Naming clarity — ✓, no abbreviations found in either changed file.
- Vue/TS pitfalls — no destructuring of reactive state (all access is via qualified `draft.field` paths, so reactivity is preserved), no `reactive()` on a primitive, composable returns a plain object of refs/functions (not wrapped in `reactive()`), no `any`, no non-null `!` assertions, all parameters typed, all functions except `useRepoConfig()` itself have explicit return types (that one omission matches `useGitHubAuth()`/`useStationStorage()`'s existing pattern, not a regression). `useRepoConfig` takes no reactive args, so `toValue()`/`toRef()` normalization doesn't apply. No side effects requiring `onUnmounted` cleanup. `URLSearchParams` used correctly for query-string building (no raw string concatenation, no `new URL()` parse-failure risk since it's never constructed from an untrusted absolute string).

### Findings

1. **`saveRepoConfig`'s `onUnauthorized` callback is optional, so security-guidelines.md rule 5's UI-prompt requirement isn't guaranteed by this composable alone.**
   `src/composables/useRepoConfig.ts:91-94,124-136` — `notifyUnauthorized` calls `onUnauthorized?.()` and always resolves to `null`. If a caller invokes `saveRepoConfig` without passing `onUnauthorized` (or passes a no-op), a 401 from the validation call resolves `validationError.value` to `null` — i.e. the UI shows *no error at all* for an expired/revoked session, which is the opposite of "surface a re-authentication prompt in the UI." Rule 5 explicitly names "the composable that calls the proxy" as responsible for the UI prompt, but that responsibility is entirely outsourced to correct call-site wiring with no fallback. Recommend either making `onUnauthorized` a required parameter, or having `resolveValidationError` set a dedicated message (mirroring `useGitHubAuth.ts`'s `SESSION_EXPIRED_MESSAGE`) in addition to invoking the callback, so the guideline holds even if a future caller forgets to wire it.

2. **`resolveValidationError`'s guard-clause chain exceeds the 5-line Object Calisthenics guideline without a documented exception.**
   `src/composables/useRepoConfig.ts:96-112` — 12 lines of sequential guard clauses (owner/repo format, file-path presence, file-check outcomes, repo-check outcomes). This is the same shape as `github-auth-callback.ts`'s `validateCallbackRequest` from Sub-Issue F, which received an explicit documented exception in that sub-issue's `technical-specifications.md` ("splitting further would fragment one coherent validation into indirection without improving readability"). No equivalent note exists in this sub-issue's `technical-specifications.md`. Low severity — add the same documented-exception note for consistency with the established precedent.

status: changes requested
