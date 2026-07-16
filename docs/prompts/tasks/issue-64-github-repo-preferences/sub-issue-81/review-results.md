# Review Results — Sub-Issue F (#81): Netlify Functions for OAuth and GitHub API Proxy

Re-review after review-feedback fixes (SameSite bug, TS18046).

## `npm run lint`

9 errors reported, all in files unrelated to this sub-issue's changed files (`netlify/functions/**`):

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

(`rtk lint` itself failed to run in this environment — "Failed to run eslint... program not found" — so `npm run lint` was used directly; same underlying command, `eslint . --fix`.) No lint errors in `netlify/functions/**` — clean for the changed files.

## `npm run type-check`

Passes cleanly — no output. The previous `TS18046` error on `github-auth-callback.ts:88` (`payload` typed `unknown`) is resolved by the new `isAccessTokenPayload` type guard.

## Checklist

- Security guidelines coverage:
  - Rule 1 (never expose secret/token) — ✓. No response body, redirect URL, or log line contains `accessToken` or the client secret anywhere in the four functions.
  - Rule 2 (cookie flags: `HttpOnly`, `SameSite=Strict`, `Max-Age=28800`, `Secure` on HTTPS only) — ✓. `gh_token` cookie (`redirectToSettingsSuccess`, `github-auth-callback.ts:106-113`) now explicitly passes `sameSite: 'Strict'` alongside `HttpOnly`/`Max-Age=28800`/conditional `Secure`.
  - Rule 3 (state round-trip CSRF check) — ✓. `gh_oauth_state` cookie now uses `sameSite: 'Lax'` (`github-auth-start.ts:34-38`), so it survives GitHub's cross-site redirect back to the callback and `requestStateMatchesCookie` can actually see it. Security-guidelines.md rule 2 only mandates `Strict` for `gh_token`, so this is consistent with the guideline, not a deviation from it.
  - Rule 4 (forward owner/repo/path exactly, no server-side cross-check) — ✓. `buildContentsRequest`/`contentsUrl` forward the SPA-supplied values unchanged, percent-encoding each segment only for URL hygiene.
  - Rule 5 (401 clears cookie, no silent retry) — ✓. `forwardToGithub` returns `unauthorizedResponse` (clears `gh_token`) on any 401 from GitHub, never retries.
  - Rule 6 (token never reaches the SPA) — ✓. Confirmed across all four handlers.

- Object Calisthenics — ✓ overall (guard clauses only, no `else`, discriminated-union domain types for `ContentsRequest`, `SameSitePolicy` as a domain type for the cookie attribute, no abbreviations, functions stay small).
- Business spec match — ✓ for code behavior. `SameSite=Strict` in `business-specifications.md` (Sub-Issue F rule 1, Sub-Issue A going-live step 5) refers specifically to `gh_token`, which still uses `Strict`; the state cookie's `Lax` is an internal implementation detail the spec never mandated a value for, so no contradiction. One pre-existing stale line remains (not introduced or touched by this fix): Sub-Issue F rule 2 still describes an owner/repo cross-check that the amended `security-guidelines.md` rule 4 intentionally removed — documentation-only, previously flagged, out of `/jli-codes` scope to fix.
- No dead code/unused imports — ✓.
- Naming clarity — ✓, no abbreviations found.
- Vue/TS pitfalls — N/A (no Vue components/composables in this sub-issue). The `unknown`-narrowing pitfall from the previous review is now resolved: `isAccessTokenPayload` guards `payload` before `.access_token` is read, mirroring the existing `isWriteContentsPayload` pattern. No `any`, no non-null `!` assertions, all exported functions have explicit return types.

### Findings

None.

status: approved
