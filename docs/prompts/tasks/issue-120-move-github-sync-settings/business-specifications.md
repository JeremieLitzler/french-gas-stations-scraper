# Business Specifications — Move GitHub Sync Settings

## Goal

Retire the standalone `/settings` page. The GitHub sync section it hosted becomes part of
Station Manager, always visible, directly below the collapsible station list. The footer no
longer links to `/settings`.

## Rules (Example Mapping)

**Rule 1 — GitHub sync settings live inside Station Manager, not on a separate page.**
The section (login/logout, `owner/repo`, file path, sync-frequency fields, save action) appears
right after the collapsible "Afficher / masquer la liste" block, always visible — not nested
inside the collapsible itself.
Example: on the home page, without expanding the station list, the user already sees
"Synchronisation GitHub" below it.

**Rule 2 — The `/settings` page and route are removed; no replacement page or redirect is kept.**
A bookmark or link to `/settings` no longer resolves to a settings page.

**Rule 3 — The footer's "Paramètres" link is removed.**
Example: the footer shows credits, Licence, Hébergé sur Netlify, and Mentions légales only.

**Rule 4 — GitHub sync behavior is unchanged by the move.** Auth state display, field
validation (owner/repo, file path, sync-frequency), save/login/logout actions, and their error
messages behave exactly as they did on `/settings`.

**Rule 5 — Loading the GitHub sync section never blocks the rest of Station Manager.**
The station list, import/export controls, and "Enregistrer les modifications" button are usable
immediately; only the GitHub sync section itself shows a loading indicator while its own data
(auth state, saved repo config) resolves.
Example: right after opening the app, the user can already expand and edit the station list
while "Synchronisation GitHub" briefly shows a loader in place of its fields.

**Rule 6 — Completing GitHub login (success or error) returns the user to the home page.**
The outcome (success or error) is reflected via the same messaging previously shown on
`/settings`, now surfaced within Station Manager's GitHub sync section on the home page. The
callback query parameter is cleaned from the URL once handled, same as before — only the page
it's cleaned from changes (home instead of `/settings`).

## Files

- `src/components/StationManager.vue` — hosts the GitHub sync section after the collapsible
  station list, with its own loading indicator per Rule 5.
- `src/components/GitHubSyncSettings.vue` — same responsibilities (auth + repo config UI),
  relocated only.
- `src/pages/settings.vue` — deleted (Rule 2).
- `src/components/layout/AppFooter.vue` — "Paramètres" link removed (Rule 3).
- `netlify/functions/github-auth-callback/github-auth-callback.ts` — redirects to the home page
  instead of `/settings` after login (Rule 6).
- `src/composables/useGitHubAuth.ts` — reads and cleans the callback query parameter from
  whichever page it now lands on (home page, per Rule 6); no page path is hardcoded here today,
  but its tests assume `/settings` and need updating for consistency.
- Existing tests referencing `/settings` or the current settings-page layout
  (`useGitHubAuth.spec.ts`, `GitHubSyncSettings.spec.ts`, `StationManager.spec.ts`, and any
  `settings.vue`/router test) — updated to match the new location and redirect target.

status: ready
