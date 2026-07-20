# Security Guidelines: Exclude Spec Files from Netlify Function Build

This change only relocates existing function/spec file pairs into per-function subdirectories
(see `business-specifications.md`); it adds no new inputs, endpoints, dependencies, or secret
handling. Attack surface is therefore limited to regressions of already-accepted controls.

1. **What:** Verify each restructured function's shipped bundle contains only production code
   reachable from its entry file — no test code, mocks, or fixture data.
   **Where:** Build/deploy output for `github-api-proxy`, `github-auth-callback`,
   `github-auth-logout`, `github-auth-start`, `fetch-page` after the move.
   **Why:** Test fixtures for the OAuth functions contain mock tokens/state values that must
   never ship in a production bundle.

2. **What:** Confirm the existing request-boundary controls still apply unchanged after the
   move — `state`/CSRF validation and the HTTP-only cookie flow (ADR-011) for the auth
   functions, and the domain allowlist (ADR-006) for `fetch-page`. Deployed function names and
   endpoint paths must stay byte-identical to before the restructuring.
   **Where:** Each function's relocated entry file.
   **Why:** A silent rename or path change here would break the cookie-based auth flow or widen
   the proxy beyond its intended domain.

3. **What:** `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` must keep being read only from
   environment variables (`lib/environment.ts`) — no secret value may be copied into any moved
   or newly created file as part of the restructuring.
   **Where:** `netlify/functions/lib/environment.ts` and the relocated auth function files.
   **Why:** Multi-file moves are a common place for accidental hardcoding of secrets via
   copy-paste.

status: ready
