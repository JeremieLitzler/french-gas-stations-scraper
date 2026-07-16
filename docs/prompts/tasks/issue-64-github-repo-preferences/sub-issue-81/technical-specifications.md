# Technical Specifications — Sub-Issue F (#81): Netlify Functions for OAuth and GitHub API Proxy

## Summary of files created/changed

- `netlify/functions/lib/cookies.ts` — new. Cookie parsing/building helpers shared by all four functions: `parseCookies`, `buildSessionCookie`, `buildExpiredCookie`, `isHttpsRequest`.
- `netlify/functions/lib/environment.ts` — new. `readGithubOAuthCredentials()` reads and validates `GITHUB_CLIENT_ID`/`GITHUB_CLIENT_SECRET`.
- `netlify/functions/lib/http-responses.ts` — new. `jsonResponse`/`redirectResponse` helpers that build `HandlerResponse` objects, including `multiValueHeaders` for multiple `Set-Cookie` values.
- `netlify/functions/github-auth-start.ts` — new. Generates `state`, sets a short-lived `gh_oauth_state` cookie, redirects to GitHub's OAuth authorize URL.
- `netlify/functions/github-auth-callback.ts` — new. Validates `state`, exchanges `code` for an access token server-side, sets the `gh_token` cookie, redirects to `/settings?auth=success` or `?auth=error`.
- `netlify/functions/github-auth-logout.ts` — new. Clears the `gh_token` cookie; succeeds even if absent.
- `netlify/functions/github-api-proxy.ts` — new. Proxies GitHub Contents API `GET`/`PUT` calls using the token from the `gh_token` cookie.

## Non-trivial decisions

- **Shared helpers in `netlify/functions/lib/`, not top-level files.** Netlify's function discovery treats every top-level file in the functions directory as its own endpoint; a subdirectory keeps `cookies.ts`/`environment.ts`/`http-responses.ts` as plain importable modules instead of accidentally becoming (broken) functions.
- **Second `gh_oauth_state` cookie instead of a signed/stateless state value.** A plain HttpOnly cookie round-trip is the simplest way to verify the `state` GitHub echoes back actually originated from this browser session, without adding a signing dependency for a 5-minute-lived, non-sensitive value.
- **`Authorization: Bearer <token>` instead of the classic `token <token>` scheme.** Both work for GitHub OAuth App tokens; `Bearer` is GitHub's current documented recommendation across REST API auth methods, so using it avoids depending on the older, GitHub-specific scheme.
- **`github-api-proxy` forwards `owner`/`repo`/`path` exactly as supplied by the SPA, with no server-side reference to cross-check against.** Per `security-guidelines.md` rule 4 (amended): IndexedDB is client-only and no session store exists yet, so the authorization boundary is GitHub's own OAuth token scope, not app-level ownership validation. `owner`/`repo`/`path` are still percent-encoded before being placed in the request URL — necessary input hygiene, distinct from the (intentionally dropped) mismatch check.
- **`github-auth-logout` requires `POST`, not `GET`.** The business spec doesn't name a method; `POST` avoids a state-changing action being triggerable via a plain link/prefetch, on top of the `SameSite=Strict` protection already in place.
- **Proxy request/response shape is a thin passthrough** (forwards GitHub's JSON body and status code as-is on non-401 responses) rather than a normalized/typed contract. Sub-Issues C and D (not yet implemented) own the composables that will interpret this data; inventing a stable contract now, before those consumers exist, would be guessing at their needs.
- **Callback handler split into `validateCallbackRequest` + `exchangeCodeForAccessToken` + two `redirectToSettings*` helpers** rather than one long guarded function. The OAuth callback has five sequential failure points (wrong method, GitHub error param, state mismatch, missing code, missing env credentials, failed exchange); grouping the first four into a single validation step keeps the top-level `handler` to three guard-style checks instead of six, while each extracted function stays near the 5-line calisthenics target. Documented as a partial exception to the "5 lines per method" rule: `validateCallbackRequest` itself is a linear sequence of four guard clauses (~15 lines) because splitting it further would fragment one coherent validation into indirection without improving readability.

## Self-review fixes applied

1. `exchangeCodeForAccessToken` (github-auth-callback.ts) — wrapped the `fetch` call in `try/catch`. Previously, any network failure while calling GitHub's token endpoint would throw out of the handler as an unhandled rejection instead of redirecting to `/settings?auth=error` like every other failure path.
2. `forwardToGithub` (github-api-proxy.ts) — same fix: wrapped the GitHub Contents API call in `try/catch`, returning a `502` JSON error instead of crashing the function on a network failure.
3. `contentsUrl` (github-api-proxy.ts) — `owner`, `repo`, and each `path` segment are now percent-encoded with `encodeURIComponent` before being interpolated into the GitHub API URL. Unescaped values could otherwise inject extra path segments (e.g. a `path` containing `../`) and redirect the proxy's request outside `/repos/{owner}/{repo}/contents/{path}` — relevant regardless of the rule-4 authorization-boundary decision, since it's basic input hygiene at a system boundary.

status: ready
