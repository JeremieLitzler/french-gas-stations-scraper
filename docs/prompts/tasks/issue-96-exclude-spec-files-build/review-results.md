# Review Results: Exclude Spec Files from Netlify Function Build

## `rtk lint`

`rtk lint` failed on this machine for reasons unrelated to the code under review:

```
Error: Failed to run eslint. Is it installed? Try: pip install eslint (or npm/pnpm for JS linters)

Caused by:
    program not found
```

`rtk` is not resolving the project-local `node_modules/.bin/eslint` binary (environment/PATH
issue, not a code defect — `node_modules/.bin/eslint` exists). Fell back to `npm run lint`
(`eslint . --fix`) to still get lint coverage:

```
E:\...\src\composables\usePreferencesExport.spec.ts
  39:5  error  'lastDownloaded' is assigned a value but never used  @typescript-eslint/no-unused-vars

E:\...\src\composables\usePreferencesImport.spec.ts
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

All 9 errors are pre-existing, in `src/composables/usePreferencesExport.spec.ts` and
`usePreferencesImport.spec.ts` — files untouched by this task. None of the changed
`netlify/functions/**` files have any lint errors.

## `npm run type-check`

Passed cleanly, no output:

```
> vue-boilerplate-jli@0.0.0 type-check
> vue-tsc --build
```

## Checklist

- ✓ Every rule in `security-guidelines.md` is verifiably addressed:
  - Rule 1 (no test code in shipped bundle): satisfied structurally — each function's
    directory now contains exactly one entry file matching the directory name
    (`github-api-proxy/github-api-proxy.ts`, etc.), which is the mechanism `technical-specifications.md`
    documents as excluding sibling `.spec.ts` files from `zip-it-and-ship-it`'s bundling.
    No leftover flat `.ts`/`.spec.ts` files remain directly under `netlify/functions/`
    (verified).
  - Rule 2 (request-boundary controls / endpoint identity unchanged): confirmed — directory
    names match the original function names exactly (`fetch-page`, `github-api-proxy`,
    `github-auth-callback`, `github-auth-logout`, `github-auth-start`), so deployed function
    names/paths are unchanged. `CALLBACK_PATH` in `github-auth-start.ts` still hardcodes
    `/.netlify/functions/github-auth-callback`, unaffected by the move. State/CSRF validation
    (`requestStateMatchesCookie`) and cookie helpers (`buildSessionCookie`,
    `buildExpiredCookie`, `isHttpsRequest`) are untouched — only their import paths changed.
  - Rule 3 (no secrets copied/hardcoded during the move): confirmed — `lib/environment.ts` is
    untouched in both location and content; all five functions still read credentials via
    `readGithubOAuthCredentials()` / environment variables, no literal secret values appear in
    any diff.
- ✓ Object Calisthenics: no new logic introduced — diffs are import-path-only (`./lib/*` →
  `../lib/*`) plus one cross-directory import fix in `github-auth-callback.spec.ts`. Existing
  function bodies are unchanged and were not in scope for calisthenics re-review.
- ✓ Implementation matches business spec — no missing requirements, no scope creep:
  - "One function per directory" — all five functions (`fetch-page`, `github-api-proxy`,
    `github-auth-callback`, `github-auth-logout`, `github-auth-start`) moved into same-named
    subdirectories, including `fetch-page` (no spec file yet) for consistency, as specified.
  - "Shared helpers stay shared" — `lib/` unchanged in location; all consuming imports updated
    to `../lib/*` and resolve correctly.
  - Edge case "existing tests still discovered/pass" — spec files moved alongside their
    implementation; sibling imports (`./github-api-proxy`, `./github-auth-logout`,
    `./github-auth-start`) preserved unchanged; the one cross-function import in
    `github-auth-callback.spec.ts` (importing `github-auth-start`'s handler) was correctly
    updated to `../github-auth-start/github-auth-start`. `npm run test` itself is
    `/jli-runs-tests`'s job, not run here.
  - Edge case "local dev endpoints unchanged" — deployed function name is derived from the
    directory name, which was kept identical to the original function name, so
    `/.netlify/functions/<name>` paths are unaffected.
  - No scope creep: diffs touch only import paths; no unrelated logic, formatting, or
    refactoring changes are mixed in.
- ✓ No dead code, unused imports, or unreachable branches introduced by this change.
- ✓ Naming clarity — no abbreviations introduced; all identifiers in the diffs are pre-existing
  and unchanged.
- ✓ Vue/TS pitfalls — not applicable; this change touches only Netlify function files (Node/TS
  serverless handlers), no Vue reactivity, composables, or component code.

status: approved
