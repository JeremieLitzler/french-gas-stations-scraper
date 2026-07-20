# Review Results: Sub-Issue E — Settings UI for Repo Config and Cache Parameter

## `rtk lint`

`rtk lint` failed on this machine for reasons unrelated to the code under review:

```
Error: Failed to run eslint. Is it installed? Try: pip install eslint (or npm/pnpm for JS linters)

Caused by:
    program not found
```

`rtk` is not resolving the project-local `node_modules/.bin/eslint` binary (environment/PATH
issue, not a code defect). Fell back to `npm run lint` (`eslint . --fix`) to still get lint
coverage:

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
`usePreferencesImport.spec.ts` — files untouched by this task. None of the changed files
(`GitHubSyncSettings.vue`, `settings.vue`, `AppFooter.vue`) have any lint errors.

## `npm run type-check`

Passed cleanly, no output:

```
> vue-boilerplate-jli@0.0.0 type-check
> vue-tsc --build
```

## Checklist

- ✓ Every rule in `security-guidelines.md` (parent issue #64) is verifiably addressed:
  - Rules 1, 2, 3, 4, 6 concern the Netlify functions (`github-auth-callback`,
    `github-auth-start`, `github-api-proxy`) — none of those files are touched by this
    sub-issue's changes, so they are not applicable here.
  - Rule 5 ("treat any 401 as a signal to clear the cookie and prompt re-authentication"):
    `GitHubSyncSettings.vue` wires `useGitHubAuth().handleUnauthorized` through to
    `saveRepoConfig(currentDraft.value, isAuthenticated.value, handleUnauthorized)` in both
    `onSave` and `onLogin`, matching the composable-caller-responsibility convention documented
    in `useRepoConfig.ts` (the composable itself never calls `useGitHubAuth`). `useRepoConfig`'s
    `resolveValidationError` already guarantees the re-auth message and callback invocation on a
    401 (merged and reviewed in #83) — this component correctly supplies the callback rather
    than omitting it.
- ✓ Object Calisthenics respected:
  - No `else`, no `reactive()` on primitives, no getters/setters.
  - Domain type `RepoConfigDraft` used for the draft shape instead of loose fields.
  - The 4 `ref`/`computed` bindings at module scope of `setup()` exceed the ≤2-instance-variable
    guideline; the file documents this as the same framework exception already used in
    `StationManagerTable.vue` (verified: that file declares 5 top-level `ref`s), so the
    exception is consistent with existing project convention, not a new one-off.
  - No abbreviations in any identifier (`ownerRepoDraft`, `filePathDraft`, `cacheDaysDraft`,
    `currentDraft`, `cacheDaysError`, `loginReady`, `isSaving`, `onSave`, `onLogin`, `onLogout`).
- ✓ Implementation matches business spec — Sub-Issue E rules 1–4, cross-checked against
  test cases E-1 through E-7:
  - Rule 1 (GitHub Sync section with login/logout + three fields): present.
  - Rule 2 (`revalidate-cache-days` positive-integer validation, ≤0 rejected inline):
    `parseCacheDays` rejects non-integers (including decimals) and `cacheDaysError` flags any
    non-empty value that isn't a positive integer; the Save/Login buttons are disabled while
    `cacheDaysError` is set. An empty field is deliberately not flagged as an inline error (only
    blocks login-readiness) — this matches the documented decision and `useGitHubAuth`'s
    existing `hasValidCacheDays` semantics (`!== null`), not a gap.
  - Rule 3 (`owner/repo`/file path disabled once authenticated, log-out message,
    `revalidate-cache-days` always editable): `:disabled="isAuthenticated"` on the first two
    inputs only; the cache-days input carries no `:disabled` binding at all, so it stays
    editable in both auth states.
  - Rule 4 (login button gated by Sub-Issue A's `canInitiateLogin`): `loginReady` computed
    calls `canInitiateLogin(currentDraft.value)` reactively.
  - Post-review fix (draft persisted before OAuth navigation): confirmed present — `onLogin`
    awaits `saveRepoConfig` before calling `login()`, gated behind `loginReady` so only a
    complete/valid draft is persisted.
  - No scope creep: the diff is limited to the new component, the new page, and the one-line
    footer link addition.
- ✓ No dead code, unused imports, or unreachable branches.
- ✓ Naming clarity — no abbreviations, no single-letter variables.
- ✓ Vue/TS pitfalls (checked against the fetched Vue reactivity-fundamentals and
  reusability/composables guides):
  - `useGitHubAuth()` and `useRepoConfig()` each return a plain object of individual `ref`s
    (not a `reactive()`-wrapped object), so destructuring them in `GitHubSyncSettings.vue`
    (`const { isAuthenticated, authError, ... } = useGitHubAuth()`) preserves reactivity per
    Vue's documented composable convention — this is not the "destructuring a reactive object
    loses reactivity" pitfall.
  - No reactive property is watched directly (no `watch()` calls in this file), so the
    getter-vs-direct-reactive-property pitfall does not apply.
  - No props exist on this component (it has none defined), so no prop-mutation risk.
  - No `reactive()` calls anywhere in the file.
  - No `any`/`unknown`, no non-null `!` assertions; `parseCacheDays`, `onSave`, `onLogin`,
    `onLogout` all carry explicit return types.
  - No new composable is defined here (only consumed), so the `use`-prefix/`toValue()`/
    `toRef()` conventions don't apply. No DOM event listeners or other side effects are
    registered directly in this component, so no `onUnmounted` cleanup is needed.
  - `<script async setup>` (enabling the top-level `await Promise.all([...])`) matches the
    existing async-component + `<Suspense>` convention already used in
    `StationManagerTable.vue` and `StationPricesContent.vue`.

status: approved
