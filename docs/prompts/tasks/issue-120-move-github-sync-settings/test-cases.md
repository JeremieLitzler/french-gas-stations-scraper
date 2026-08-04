# Test Cases — Move GitHub Sync Settings

These scenarios are covered by adjusting existing test files — no new test files are expected.

## `StationManager.spec.ts`

1. **GitHub sync section is always visible, right after the collapsible station list.**
   Given the component has rendered, the "Synchronisation GitHub" section is present in the
   page below the "Afficher / masquer la liste" toggle, without expanding it.

2. **The rest of Station Manager is usable before the GitHub sync section's own data resolves.**
   Given the GitHub sync section's own data (auth state, saved repo config) has not yet
   resolved, the station list, import/export controls, and "Enregistrer les modifications"
   button (when applicable) are already interactive.

3. **The GitHub sync section shows its own loading indicator while resolving.**
   Given the GitHub sync section's data has not yet resolved, a loading indicator appears in
   its place; once resolved, the indicator is replaced by its fields.

## `AppFooter.test.ts`

4. **No "Paramètres" link is rendered.**
   Given the footer has rendered, no link with the text "Paramètres" or pointing to `/settings`
   exists among its links.

## `github-auth-callback.spec.ts`

5. **Successful login redirects to the home page.**
   Given a valid `code` and matching `state`, the response redirects to the home page with
   `auth=success` in the query string (previously `/settings?auth=success`), and still sets the
   `gh_token` cookie exactly as before.

6. **Failed/errored login redirects to the home page.**
   Given a callback with an `error` parameter, a missing/invalid `code`, or a `state` mismatch,
   the response redirects to the home page with `auth=error` in the query string (previously
   `/settings?auth=error`), and still sets no `gh_token` cookie.

## `useGitHubAuth.spec.ts`

7. **A successful callback landing on the home page marks the user authenticated and cleans the URL.**
   Given the current location is the home page with `?auth=success`, initializing auth state
   marks the user authenticated and rewrites the URL to the bare home path (no query string).

8. **A failed callback landing on the home page shows the error and cleans the URL.**
   Given the current location is the home page with `?auth=error`, initializing auth state
   shows the callback error message and rewrites the URL to the bare home path (no query
   string).

## Not covered by a runtime test

- Removal of `/settings` as a page and route: no runtime test — verified by the page file no
  longer existing (file-based routing regenerates the route table on build).
- `GitHubSyncSettings.spec.ts`: no change needed — it mounts the component directly in its own
  `<Suspense>` boundary, so its behavior (Rule 4 — login/logout, field validation, save) is
  unaffected by which parent now renders it.

status: ready
