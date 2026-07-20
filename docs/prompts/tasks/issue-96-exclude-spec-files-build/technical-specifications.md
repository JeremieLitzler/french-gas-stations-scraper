# Technical Specifications: Exclude Spec Files from Netlify Function Build

## Files changed

- `netlify/functions/fetch-page.ts` -> `netlify/functions/fetch-page/fetch-page.ts` — moved, no
  content change (no shared-lib imports to fix).
- `netlify/functions/github-api-proxy.ts` -> `netlify/functions/github-api-proxy/github-api-proxy.ts`
  — moved; `./lib/*` imports updated to `../lib/*`.
- `netlify/functions/github-api-proxy.spec.ts` -> `netlify/functions/github-api-proxy/github-api-proxy.spec.ts`
  — moved, no import change (spec imports its sibling `./github-api-proxy` unchanged).
- `netlify/functions/github-auth-callback.ts` -> `netlify/functions/github-auth-callback/github-auth-callback.ts`
  — moved; `./lib/*` imports updated to `../lib/*`.
- `netlify/functions/github-auth-callback.spec.ts` -> `netlify/functions/github-auth-callback/github-auth-callback.spec.ts`
  — moved; its cross-function import of `github-auth-start`'s handler updated from
  `./github-auth-start` to `../github-auth-start/github-auth-start`.
- `netlify/functions/github-auth-logout.ts` -> `netlify/functions/github-auth-logout/github-auth-logout.ts`
  — moved; `./lib/*` imports updated to `../lib/*`.
- `netlify/functions/github-auth-logout.spec.ts` -> `netlify/functions/github-auth-logout/github-auth-logout.spec.ts`
  — moved, no import change.
- `netlify/functions/github-auth-start.ts` -> `netlify/functions/github-auth-start/github-auth-start.ts`
  — moved; `./lib/*` imports updated to `../lib/*`.
- `netlify/functions/github-auth-start.spec.ts` -> `netlify/functions/github-auth-start/github-auth-start.spec.ts`
  — moved, no import change.
- `netlify/functions/lib/*.ts` — unchanged (location and content); still shared by all five
  functions via one-level-deeper relative imports.

## Decisions

- **Used `git mv` for every relocation** rather than delete+recreate, so `git log --follow`
  keeps each file's history across the move.
- **Left `netlify.toml` untouched.** Netlify's `zip-it-and-ship-it` bundler already treats a
  subdirectory whose name matches an entry file inside it (`<name>/<name>.ts`) as a single
  function, and ignores any other file in that directory as a non-entry point — this is the
  same mechanism that already kept `lib/` from being deployed. No new build configuration was
  needed; the existing `functions = "netlify/functions"` setting already scans recursively.
- **`tsconfig.node.json`'s `netlify/functions/**/*.ts` glob required no change** — it was
  already recursive, so it covers the new nested paths without edits.
- **Cross-function import in `github-auth-callback.spec.ts` was updated to reach into its
  sibling directory** (`../github-auth-start/github-auth-start`) rather than, say, re-exporting
  `github-auth-start`'s handler from a shared location — the spec only needs the handler
  function for a two-step OAuth flow test, so a direct relative import keeps the change minimal
  and consistent with how the file already imported it (a bare relative path, not a package
  alias).
- **No changes to `github-auth-start.ts`'s `CALLBACK_PATH` constant.** It already holds the
  route (`/.netlify/functions/github-auth-callback`), which depends on the function's deployed
  name, not its file path — the directory-per-function layout keeps the deployed name identical
  (`github-auth-callback`), so the route stays correct unmodified.

status: ready
