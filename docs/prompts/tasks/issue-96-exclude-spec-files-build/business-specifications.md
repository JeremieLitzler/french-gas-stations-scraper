# Business Specifications: Exclude Spec Files from Netlify Function Build

## Goal and Scope

Fix production deploy failures caused by test files being mistaken for deployable Netlify
functions. After this change, running the production build must deploy exactly the intended
serverless functions — never their test files — and this must remain true as new functions and
tests are added in the future, not just for the four functions currently affected.

## Rule: One function per directory

Each Netlify function's implementation and its test file live together in their own
subdirectory named after the function, instead of sitting as flat sibling files directly under
`netlify/functions/`.

- Affected today: `github-api-proxy`, `github-auth-callback`, `github-auth-logout`,
  `github-auth-start` (each has a `.spec` file currently deployed as a bogus extra function).
- `fetch-page` (no test file yet) moves into the same per-directory layout for consistency, so
  every function follows one uniform rule with no special-cased exception.
- Example: `github-api-proxy.ts` + `github-api-proxy.spec.ts` become
  `github-api-proxy/github-api-proxy.ts` + `github-api-proxy/github-api-proxy.spec.ts`.

## Rule: Shared helpers stay shared

The `lib/` folder (`cookies.ts`, `environment.ts`, `http-responses.ts`) keeps its current
location outside the per-function directories, since its contents are imported by several
functions and are not themselves deployable functions. Each function's imports of `lib/` keep
resolving correctly after the move.

## Rule: Test files must never be deployable

Regardless of how many test files exist alongside a function's implementation, or how test
naming evolves, none of them may be deployed as a separate serverless function. This is an
outcome the build must guarantee going forward, not a one-time cleanup of the four files listed
above.

## Edge Cases

- A production build (`npm run build` / `netlify build`) after the restructuring must deploy
  only the five intended functions (`fetch-page`, `github-api-proxy`, `github-auth-callback`,
  `github-auth-logout`, `github-auth-start`) — confirmed by the absence of any `*.spec`-named
  function in the deploy output.
- All existing tests for these functions must still be discovered and must still pass after the
  files move into per-function directories — no regression in test coverage or results.
- Local development (`netlify dev`) must continue to serve all five functions at their existing
  endpoints (e.g. `/.netlify/functions/fetch-page`) — the public function names/URLs do not
  change, only their file locations on disk.

## Files Affected

- `netlify/functions/github-api-proxy.ts`, `github-auth-callback.ts`, `github-auth-logout.ts`,
  `github-auth-start.ts`, `fetch-page.ts` — each relocates into its own same-named subdirectory.
- `netlify/functions/*.spec.ts` (matching the five above) — relocates alongside its
  implementation file in the new subdirectory.
- `netlify/functions/lib/*.ts` — unchanged in location; referenced via relative imports from the
  new, one-level-deeper function directories.

status: ready
