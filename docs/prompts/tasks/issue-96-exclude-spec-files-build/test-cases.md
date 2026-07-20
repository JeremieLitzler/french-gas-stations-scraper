# Test Cases: Exclude Spec Files from Netlify Function Build

## Build output

1. **Only intended functions deploy.** Given the restructured `netlify/functions/` layout, when
   a production build/deploy runs, then the deploy output lists exactly the five intended
   functions (`fetch-page`, `github-api-proxy`, `github-auth-callback`, `github-auth-logout`,
   `github-auth-start`) and no function whose name contains `.spec` or otherwise corresponds to
   a test file.
2. **Build does not fail.** Given the new per-function directory layout, when the production
   build runs, then it completes successfully with no deploy errors about invalid function
   names.

## Test suite regression

3. **Existing tests still run.** Given the function/spec file pairs have moved into per-function
   subdirectories, when the test suite runs, then every test that previously existed for
   `github-api-proxy`, `github-auth-callback`, `github-auth-logout`, and `github-auth-start` is
   still discovered and still passes, with no drop in count or coverage.

## Local development parity

4. **Endpoints unchanged.** Given the restructured layout, when the app runs locally via
   `netlify dev`, then each of the five functions is still reachable at its existing endpoint
   path (e.g. `/.netlify/functions/fetch-page`) and behaves exactly as before the move.

## Security regressions (from `security-guidelines.md`)

5. **No test code in production bundle.** Given a function has been moved into its own
   directory alongside its spec file, when the production bundle for that function is
   inspected, then it contains no test-only code, mocks, or fixture data.
6. **OAuth flow unaffected.** Given the GitHub OAuth functions have moved, when a user goes
   through login (`github-auth-start` → GitHub → `github-auth-callback`), then `state`/CSRF
   validation, the HTTP-only cookie behaviour, and the 8-hour session still work exactly as
   before the move.
7. **Domain allowlist unaffected.** Given `fetch-page` has moved, when it receives a request for
   a URL outside the whitelisted domain, then it still rejects the request the same way it did
   before the move.
8. **Secrets stay in environment variables.** Given the restructuring touched multiple files,
   when the moved auth functions are inspected, then `GITHUB_CLIENT_ID`/`GITHUB_CLIENT_SECRET`
   are still read only from environment variables, with no secret value hardcoded anywhere.

status: ready
