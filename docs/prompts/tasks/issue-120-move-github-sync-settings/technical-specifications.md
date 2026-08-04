# Technical Specifications — Move GitHub Sync Settings

## Files changed

- `src/components/StationManager.vue` — added a `<div class="mt-4"><Suspense>…</Suspense></div>`
  wrapping `<GitHubSyncSettings />` right after the `<details>` station-list block (sibling, not
  nested inside it), with `AppLoader` as the `#fallback`.
- `src/pages/settings.vue` — deleted.
- `src/components/layout/AppFooter.vue` — removed the "Paramètres" `<AppLink to="/settings">` and
  its preceding separator.
- `netlify/functions/github-auth-callback/github-auth-callback.ts` — renamed
  `SETTINGS_SUCCESS_PATH`/`SETTINGS_ERROR_PATH` to `HOME_SUCCESS_PATH`/`HOME_ERROR_PATH` (values
  `/?auth=success` / `/?auth=error`), renamed `redirectToSettingsError`/`redirectToSettingsSuccess`
  to `redirectToHomeError`/`redirectToHomeSuccess`, and updated the file's top comment. Cookie
  construction (`buildSessionCookie`/`buildExpiredCookie`, flags, ordering) was left untouched, per
  security-guidelines.md rule 2.
- `src/composables/useGitHubAuth.ts` — no behavioral change (it already reads/strips the callback
  query param from `window.location` without hardcoding a page path). Updated a stale doc comment
  that referenced "the future Settings page."
- `src/components/GitHubSyncSettings.vue` — no behavioral change (same auth + repo-config UI,
  relocated only). Updated the top doc comment to reflect it now lives inside `StationManager.vue`
  instead of a standalone settings page.

Test files (`useGitHubAuth.spec.ts`, `GitHubSyncSettings.spec.ts`, `StationManager.spec.ts`,
`AppFooter.test.ts`, `github-auth-callback.spec.ts`) were intentionally left untouched — test
authoring belongs to `/jli-writes-tests-spec` and `/jli-writes-tests`, not this command.

## Non-trivial decisions

- **Nested `<Suspense>` scoped to the new section, not a new StationManager-level async setup.**
  `StationManager.vue` stays a plain (non-async) component; only `GitHubSyncSettings` (already an
  async component) gets its own local `<Suspense>` boundary. Vue resolves nested `<Suspense>`
  boundaries independently — the outer boundary (`HomePageContent`'s, per ADR-013) doesn't wait on
  this inner one, and this inner one doesn't block sibling content in `StationManager` from
  rendering. This satisfies Rule 5 without turning `StationManager` itself into an async component,
  which would have forced every caller of `StationManager` to add its own `<Suspense>` handling.
- **Redundant `initializeAuthState()`/`loadRepoConfig()` call is accepted, not eliminated.**
  `HomePageContent.vue` (ADR-013's page-level load orchestrator) already awaits both before
  `StationManager` ever mounts on the home page, so `GitHubSyncSettings`'s own top-level
  `await Promise.all([initializeAuthState(), loadRepoConfig()])` re-reads already-resolved,
  idempotent state (an extra IndexedDB read each) once it moves onto the home page — previously
  this redundancy didn't exist because `/settings` was a separate route `HomePageContent` never
  ran on. Eliminating it would require `GitHubSyncSettings` to receive this data from a parent
  instead of loading it itself, which would (a) break the composable-caller-responsibility
  convention's requirement that a component calling a composable's data also triggers its own
  fetch, and (b) contradict the business spec's explicit framing of `GitHubSyncSettings.vue` as
  "same responsibilities, relocated only." The cost is one redundant `get()` per key on page load,
  not a user-visible delay.
- **Spacing wrapper (`mt-4`) added around the new section.** Neither the `<details>` block nor
  `GitHubSyncSettings`'s own root add a top margin, so without it the section would visually touch
  the collapsible list. A plain wrapper `<div>` was used rather than editing
  `GitHubSyncSettings.vue`'s own root class, keeping that component's template exactly as it was
  before the move (per the "relocated only" framing).
- **Netlify function constant/function renames instead of just value changes.** `SETTINGS_*` names
  would now describe the callback's actual behavior (redirect to home) incorrectly if only the
  string values changed; renaming keeps the code self-documenting without adding comments.

status: ready
