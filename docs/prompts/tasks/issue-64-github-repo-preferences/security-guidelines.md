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

4. **Forward `owner`/`repo`/`path` to the GitHub Contents API exactly as supplied by the authenticated SPA request — never substitute, infer, or independently source these values server-side.**
   - Where: `github-api-proxy` Netlify function.
   - Why: No server-side session or config store exists for these values (IndexedDB is client-only, ADR-008); the proxy's real authorization boundary is GitHub's own OAuth token scope (`repo`/`public_repo`) — the user's token cannot reach a repository they don't already own or have write access to, so a forged request gains nothing beyond what the token itself already permits.

5. **Treat any 401 response from the GitHub API as a definitive signal that the token is invalid: clear the `gh_token` cookie server-side and surface a re-authentication prompt in the UI — do not silently retry with the same token.**
   - Where: `github-api-proxy` Netlify function (server-side cookie clear) and the composable that calls the proxy (UI prompt).
   - Why: Silently retrying prolongs the use of a revoked or expired credential and may produce confusing errors; clearing the cookie immediately restores a consistent unauthenticated state.

6. **Do not pass the raw access token to the Vue SPA at any point (not in a response body, not in a query parameter, not in a custom header the SPA can read).**
   - Where: all Netlify functions (`github-auth-callback`, `github-api-proxy`).
   - Why: Any value readable by JavaScript is readable by XSS payloads; the token must remain opaque to the browser and flow only through the `HttpOnly` cookie.

status: ready
