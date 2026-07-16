# Technical Specifications — Sub-Issue A (#82): GitHub OAuth Login / Logout

## Summary of files created/changed

- `src/composables/useGitHubAuth.ts` — new. Singleton composable (ADR-002) owning login/logout,
  auth-callback-param handling, and authenticated/error state: `isAuthenticated`, `authError`,
  `initializeAuthState`, `canInitiateLogin`, `login`, `logout`, `handleUnauthorized`.

No Settings page, repo-config fields, or IndexedDB schema for `owner`/`repo`/`revalidate-cache-days`
were created — see "Specifications Need Review" below.

## Non-trivial decisions

- **Composable-only scope, no Settings page.** Sub-Issue A's own test cases (A-1, A-2, A-3, A-5,
  A-6, A-7) reference a Settings page with `owner/repo`, file path, and `revalidate-cache-days`
  fields, but that page and its persistence/validation are owned by Sub-Issues B (#83) and E (#84),
  neither implemented yet. Per explicit user direction, this command implements only the
  login/logout composable and leaves the page to those sub-issues, accepting that several test
  cases are not satisfiable yet (see below).
- **`canInitiateLogin(config)` takes the repo-config draft as a parameter instead of owning it.**
  Business rule 1 ties the login button's enabled state to three field values this composable
  does not own. Accepting them as a parameter lets the future Settings page (Sub-Issue E) reuse
  this gating logic without `useGitHubAuth` reaching into IndexedDB keys that belong to Sub-Issue B.
- **Auth state persisted via the existing IndexedDB wrapper (`get`/`set`/`del`), not `localStorage`.**
  ADR-008 mandates IndexedDB for client-side persistence in this app; introducing a second storage
  mechanism for one boolean would contradict that decision without a stated reason to deviate.
- **The persisted flag is a non-sensitive UI hint, not an auth check.** The `gh_token` cookie is
  HttpOnly (ADR-011) — the SPA cannot read it to confirm the user is still logged in. `initializeAuthState`
  trusts the `auth=success` redirect param (set only by the trusted server-side callback function)
  and, on later reloads, a persisted boolean written at that same moment. This means a user who
  manually crafts `?auth=success` in the URL would see a false "authenticated" UI state; this is
  bounded because no real GitHub API call succeeds without the actual cookie, and `handleUnauthorized`
  (invoked by future Sub-Issue C/D composables on a 401) corrects it on the first real request.
  Verifying auth server-side on every load would need a dedicated status endpoint, out of scope here.
- **`handleUnauthorized` is exported but has no caller yet.** Security-guidelines.md rule 5 assigns
  the UI re-auth prompt to "the composable that calls the proxy" — that composable belongs to
  Sub-Issues C/D. `useGitHubAuth` exposes the hook now so those composables have a stable contract
  to call into once built, rather than inventing a second copy of the same state-clearing logic later.
- **`requestServerLogout` swallows fetch failures.** `logout()` always clears the local UI state
  even if the network call to the Netlify logout function fails, so a flaky connection cannot leave
  the UI stuck showing an authenticated session the user explicitly tried to leave (self-review fix).

## Self-code review

Three issues found and fixed after the first draft:

1. **`logout()` could throw on network failure, leaving the UI stuck authenticated.** The `fetch`
   call to `github-auth-logout` was unguarded; any network error would reject before the local
   `isAuthenticated`/`authError` state was cleared. Extracted `requestServerLogout()`, which
   catches and discards the error — the client-side state now always clears on explicit logout.
2. **`stripAuthCallbackParam` relied on implicit `URL` → string coercion for `history.replaceState`.**
   Changed to an explicit `url.toString()` call instead of passing the `URL` object directly.
3. **Stale `authError` could survive across composable re-initialization within the same SPA session.**
   `restoreStoredAuthState` only set `isAuthenticated` and left a prior `authError` (e.g. from an
   earlier failed action) visible on a later, unrelated visit to the auth-consuming page. Routed it
   through the shared `updateAuthState(authenticated, null)` helper so every explicit re-init clears
   any leftover error, matching business rule 5 ("no error is shown unless [a sync action] is attempted").

## Specifications Need Review

Please review current code and results.

The following `test-cases.md` scenarios for Sub-Issue A assume a Settings page with `owner/repo`,
file path, and `revalidate-cache-days` fields already exists, but that page is owned by Sub-Issues B
(#83) and E (#84), neither implemented at the time of this command:

- **A-1** — fields enabled / login button disabled on first visit: no page exists to hold these fields.
- **A-2** — login button disabled until all three fields are filled: same, plus depends on B/E's field state.
- **A-5** — `owner/repo`/file path disabled on reload while authenticated: field disable/enable state is Sub-Issue E's responsibility.
- **A-6** — logout re-enables `owner/repo`/file path fields: same.
- **A-7** — config fields enabled when unauthenticated: same.

`useGitHubAuth.ts` implements everything Sub-Issue A can own independently (`login`, `logout`,
callback-param handling, `canInitiateLogin` as a pure function of an externally-supplied config,
`handleUnauthorized`), and A-3, A-8 are satisfiable once a page wires this composable in. A-4, A-9
are backend behavior already covered by Sub-Issue F (#81). A-10 is satisfiable once Sub-Issues C/D
call `handleUnauthorized` on a 401.

Recommend either: (a) re-sequencing so Sub-Issue E's page (or a minimal shared fields component) is
built before or alongside Sub-Issue A so its own test cases are checkable in isolation, or (b) moving
A-1, A-2, A-5, A-6, A-7 into Sub-Issue E's test-cases.md, since they test field behavior E owns, and
leaving Sub-Issue A's test cases scoped to what `useGitHubAuth` alone controls.

status: review specs
