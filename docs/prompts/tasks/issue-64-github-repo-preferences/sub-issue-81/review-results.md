# Review Results — Sub-Issue F (#81): Netlify Functions for OAuth and GitHub API Proxy

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

No lint errors in `netlify/functions/**` — clean for the changed files.

## `npm run type-check`

```
netlify/functions/github-auth-callback.ts(88,19): error TS18046: 'payload' is of type 'unknown'.
netlify/functions/github-auth-callback.ts(88,55): error TS18046: 'payload' is of type 'unknown'.
```

Fails on a changed file — see Checklist finding below.

## Checklist

- Security guidelines coverage:
  - Rule 1 (never expose secret/token) — ✓. No response body, redirect URL, or log line contains `accessToken` or the client secret anywhere in the four functions.
  - Rule 2 (cookie flags: `HttpOnly`, `SameSite=Strict`, `Max-Age=28800`, `Secure` on HTTPS only) — ✗ for the `gh_oauth_state` cookie. See finding below; the `gh_token` cookie itself is correct (`TOKEN_COOKIE_MAX_AGE_SECONDS = 28800`, `HttpOnly`/`SameSite=Strict`/`Secure` all set via `buildSessionCookie`).
  - Rule 3 (state round-trip CSRF check) — ✗. The check exists (`requestStateMatchesCookie`) but is unreachable in real browsers because of the `SameSite=Strict` bug below — the cookie it depends on will never arrive at the callback.
  - Rule 4 (forward owner/repo/path exactly, no server-side cross-check) — ✓. `buildContentsRequest`/`contentsUrl` forward the SPA-supplied values unchanged, percent-encoding each segment only for URL hygiene.
  - Rule 5 (401 clears cookie, no silent retry) — ✓. `forwardToGithub` returns `unauthorizedResponse` (clears `gh_token`) on any 401 from GitHub, never retries.
  - Rule 6 (token never reaches the SPA) — ✓. Confirmed across all four handlers.

- Object Calisthenics — ✓ overall (guard clauses only, no `else`, discriminated-union domain types for `ContentsRequest`, no abbreviations, functions stay small).
- Business spec match — mostly ✓, with one stale doc noted below (not a code defect).
- No dead code/unused imports — ✓.
- Naming clarity — ✓, no abbreviations found.
- Vue/TS pitfalls — N/A (no Vue components/composables in this sub-issue); the one TS-unknown-narrowing pitfall found is listed below.

### Findings

1. **`gh_oauth_state` cookie uses `SameSite=Strict`, which breaks the OAuth flow in real browsers.**
   `netlify/functions/github-auth-start.ts:31-34` builds the state cookie via the shared `buildSessionCookie` (`netlify/functions/lib/cookies.ts:23-39`), which unconditionally sets `SameSite=Strict`. GitHub's redirect back to `github-auth-callback` is a cross-site top-level GET navigation (`github.com` → the app's domain). Per the `SameSite` spec, `Strict` cookies are withheld on cross-site navigations — only `Lax` (or `None`) cookies survive that hop. `requestStateMatchesCookie` (`github-auth-callback.ts:62-66`) will therefore always read `cookieState` as `undefined`, so `requestStateMatchesCookie` returns `false` and every real login attempt is routed to `redirectToSettingsError`, even with a valid `code`/`state` pair from GitHub.
   - **Failure scenario**: A user completes GitHub's consent screen and is redirected to `/.netlify/functions/github-auth-callback?code=...&state=...`. The `gh_oauth_state` cookie set in `github-auth-start` is not attached to this cross-site GET request by the browser. `requestStateMatchesCookie` fails, `validateCallbackRequest` returns `{ ok: false }`, and the user is bounced to `/settings?auth=error` — login can never succeed. This breaks business-spec Sub-Issue A rules 1/3 and test cases A-3/A-4/F-2.
   - **Fix**: the transient CSRF-state cookie needs `SameSite=Lax`, not `Strict`. Security-guidelines.md rule 2 only mandates `Strict` for `gh_token` (set on the same-site response after the flow completes, where `Strict` is safe and desirable); it says nothing about the state cookie's `SameSite`. Either parametrize `SameSite` in `buildSessionCookie`/`SessionCookieOptions`, or add a second builder for the short-lived CSRF cookie.

2. **Type-check failure**: `github-auth-callback.ts:88` — `const payload = await response.json()` yields `unknown` under the project's TS config; `payload.access_token` access does not compile (`TS18046`, confirmed by `npm run type-check` above). Needs a type guard before reading `.access_token`, mirroring the `isWriteContentsPayload` pattern already used in `github-api-proxy.ts:88-101`.

3. **Stale business spec** (documentation only, not a code defect): `business-specifications.md` Sub-Issue F rule 2 still says the proxy "validates that the requested owner/repo matches the stored config to prevent SSRF abuse." The implementation intentionally does not do this, per the amended `security-guidelines.md` rule 4 and the tech spec's documented decision. The business spec wasn't updated alongside that amendment and now contradicts both the security guidelines and the shipped code.

status: changes requested
