# Security Guidelines — Move GitHub Sync Settings

1. **What**: Keep the post-login redirect target a hardcoded, relative literal path (e.g. `/`)
   — never build it from request data (query params, headers, `state`).
   **Where**: `netlify/functions/github-auth-callback/github-auth-callback.ts`
   (`SETTINGS_SUCCESS_PATH` / `SETTINGS_ERROR_PATH`, or their renamed equivalents), which flow
   unvalidated into the `Location` response header (`redirectResponse` in
   `netlify/functions/lib/http-responses.ts`).
   **Why**: an attacker-influenced redirect target turns the OAuth callback into an open
   redirect usable for phishing.

2. **What**: When editing this file for the redirect-target change, leave the `Set-Cookie`
   construction (`buildSessionCookie`/`buildExpiredCookie` calls, cookie flags, and ordering)
   untouched.
   **Where**: `netlify/functions/github-auth-callback/github-auth-callback.ts`.
   **Why**: the `HttpOnly`/`Secure`/`SameSite=Strict` flags are load-bearing for the token-theft
   and CSRF protections already decided in ADR-011 — an incidental edit here would silently
   regress them.

status: ready
