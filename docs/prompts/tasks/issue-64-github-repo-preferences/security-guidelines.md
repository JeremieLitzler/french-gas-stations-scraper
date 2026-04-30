# Security Guidelines — Issue #64: GitHub Repository Preferences

## Rules

1. **Never expose the Client Secret or raw access token in any response body, redirect URL, or Netlify function log.**
   - Where: `github-auth-callback` and `github-api-proxy` Netlify functions.
   - Why: If either value leaks in a response or log line, an attacker can impersonate the user or the OAuth App indefinitely.

2. **Set the `gh_token` cookie with `HttpOnly`, `SameSite=Strict`, and `Max-Age=28800`; add `Secure` only when the request is over HTTPS (Netlify production enforces HTTPS; skip the flag in local HTTP dev to avoid breaking the flow).**
   - Where: `github-auth-callback` Netlify function, in the `Set-Cookie` header.
   - Why: `HttpOnly` prevents JavaScript from reading the token; `SameSite=Strict` blocks CSRF; the 8-hour `Max-Age` limits the window of a stolen cookie.

3. **Validate the `state` parameter round-trip in the OAuth callback to prevent CSRF on the authorization flow.**
   - Where: `github-auth-start` (generates and stores the state) and `github-auth-callback` (verifies it matches before exchanging the code).
   - Why: Without state verification, an attacker can trick the browser into completing an authorization with a code the attacker chose, binding the victim's session to the attacker's GitHub account.

4. **In the GitHub API proxy function, validate that the requested `owner/repo` matches the value stored in the user's session or IndexedDB-persisted config before forwarding any GitHub Contents API call.**
   - Where: `github-api-proxy` Netlify function.
   - Why: Without this check, an authenticated user (or a forged request) could use the proxy to read or write arbitrary GitHub repositories, constituting an SSRF / confused-deputy attack.

5. **Treat any 401 response from the GitHub API as a definitive signal that the token is invalid: clear the `gh_token` cookie server-side and surface a re-authentication prompt in the UI — do not silently retry with the same token.**
   - Where: `github-api-proxy` Netlify function (server-side cookie clear) and the composable that calls the proxy (UI prompt).
   - Why: Silently retrying prolongs the use of a revoked or expired credential and may produce confusing errors; clearing the cookie immediately restores a consistent unauthenticated state.

6. **Do not pass the raw access token to the Vue SPA at any point (not in a response body, not in a query parameter, not in a custom header the SPA can read).**
   - Where: all Netlify functions (`github-auth-callback`, `github-api-proxy`).
   - Why: Any value readable by JavaScript is readable by XSS payloads; the token must remain opaque to the browser and flow only through the `HttpOnly` cookie.

### ADR Required

Two new architectural patterns introduced by this feature are not yet documented:

1. **GitHub OAuth App flow with server-side token exchange via Netlify Functions** — The app has no existing authentication layer. Storing the access token in an HTTP-only cookie, using a Netlify function for the code-for-token exchange, and detecting auth state from the cookie's presence is a high-impact decision affecting security posture, deployment configuration (environment variables), and SPA auth-state detection.

2. **Remote user-owned GitHub repository as a durable sync backend via the GitHub Contents API** — The app currently stores all user data client-side only (ADR-008). Adding a user-owned GitHub repo as a remote persistence and sync tier — with a cache-invalidation strategy keyed on `revalidateCacheDays` — represents a new persistence layer that interacts with IndexedDB and warrants a dedicated ADR.

The orchestrator must pause and ask the human to approve both ADRs before coding starts.

status: ready
