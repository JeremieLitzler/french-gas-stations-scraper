# Feature 1 — GitHub Auth

## Purpose

Lets a user connect the app to a GitHub repository they own so their preferences can be synced there (Feature 2, Feature 7, Feature 9's counterpart). It owns two things: the GitHub OAuth App login/logout flow, and the repo-configuration form — `owner/repo`, the preferences file path, and `revalidate-cache-days` — whose three fields must all be valid before login is offered.

Values for `owner/repo` and the preferences file path lock once the user is authenticated.

Everything downstream consumes an already-resolved repo config and a known auth state.

## Implementing code

- `netlify/functions/github-auth-start/` — builds the GitHub OAuth authorization URL and redirects the browser to it.
- `netlify/functions/github-auth-callback/` — exchanges the `code` for an access token server-side (Client Secret never leaves the function), sets the token as an HTTP-only cookie, redirects back to Settings with a success or error state.
- `netlify/functions/github-auth-logout/` — clears the token cookie.
- `netlify/functions/lib/cookies.ts` — cookie serialization/parsing helpers.
- `netlify/functions/lib/environment.ts` — reads `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`.
- `src/composables/useGitHubAuth.ts` — auth-state detection, the login-readiness check, the login/logout actions the Settings page calls, and the auto-reconnect state (`githubWasAuthenticated` marker, `githubAutoReconnectAttempts` loop guard, `needsReconnect` / `canAutoReconnect`).
- `src/composables/useRepoConfig.ts` — reactive state and validation for the three config fields; the authenticated-only reachability check against the Netlify proxy (`classifyProxyResponse` / `checkProxyReachable`).
- `src/components/GitHubSyncSettings.vue` — the Settings "GitHub Sync" section: login/logout control and the three fields with their enabled/disabled logic. The login/logout button pair is marked for extraction into its own component (`<!-- GitHub Auth compoment start (to extract) -->`).
- `src/components/OrgRestrictionNotice.vue`, `src/utils/orgRestrictionNotice.ts`, `src/types/org-restriction-notice.ts` — the org-OAuth-restriction (HTTP 403) message and its settings-page link.
- `src/types/repo-config.ts` — the `RepoConfig` shape.
- `src/components/GitHubReconnectNotice.vue`, `src/types/github-reconnect.ts` — the auto-reconnect notice (2-second countdown, then fallback banner) for a previously-authenticated user whose session expired.
- `src/components/HomePageContent.vue` — runs the auto-reconnect check right after `syncOnLoad`, owns the countdown timer and the in-memory banner dismissal.

## Behaviour & rules

**Auth model.** GitHub **OAuth App** (not a GitHub App). The callback is handled by a Netlify function that does the code-for-token exchange server-side; the Client Secret and the raw token never appear in any response body or redirect URL. The token is stored in an HTTP-only, `SameSite=Strict` cookie (also `Secure` over HTTPS) with an **8-hour** lifetime. It is not refreshed automatically — expiry is detected when a GitHub API call returns 401, at which point the app clears the cookie and prompts re-authentication. The OAuth scope covers a single user-owned repository (private repos need `repo` scope); public vs private is not pre-validated — the first authenticated sync reveals an access problem.

**Login readiness.** The user can start the OAuth flow only once all three config fields — `owner/repo`, file path, and `revalidate-cache-days` — are present and valid. The Settings page's "Login with GitHub" button is enabled/disabled from this check. `revalidate-cache-days` must be a positive integer; `≤ 0` is rejected inline.

**Field locking.** While unauthenticated, all three fields are editable and save to IndexedDB without server-side validation. Once authenticated, `owner/repo` and the file path become read-only — changing them requires logging out first — while `revalidate-cache-days` stays editable at all times. A previously-authenticated, now-logged-out user sees the fields prefilled from IndexedDB.

**Logout.** Clears the cookie only. It does not revoke the app on GitHub and does not touch stored data: repo config and station data both remain in IndexedDB.

**Silent when unauthenticated, except after an expiry.** A user who never logged in, or who logged out on purpose, is simply treated as unauthenticated on load. No error is shown unless they attempt a sync, add, update, or delete that needs GitHub. The one exception is the auto-reconnect below.

**Auto-reconnect after an expiry (ADR-018).** A second IndexedDB key, `githubWasAuthenticated`, is set on a successful OAuth callback and cleared only on logout; it is backfilled on load whenever `githubAuthenticated` is read back `true`. On the home page only, right after `syncOnLoad` (an expired cookie is only discovered by its 401), when the user is not authenticated, the marker is set and the login-readiness check passes, the app shows "Votre session GitHub a expiré. Reconnexion automatique dans 2 secondes…" with an "Annuler" button, then navigates to the OAuth start endpoint.

- One automatic attempt per expiry: `githubAutoReconnectAttempts` is incremented when the countdown starts (so cancel, closing the tab or reloading during the countdown all use it up). It is reset on logout and on a proven session, meaning a later plain load that still finds `githubAuthenticated` set. It is never reset on the OAuth callback itself, so neither a declined login nor a login whose token the API still rejects can redirect again.
- Once the attempt is used, or after a 401 later in the session, the same notice shows as a banner: the session-expired message, a "Se reconnecter à GitHub" button that starts the login without touching the counter, and a "×" that hides it for the current page session. It comes back on the next load.
- A 401 later in the session never auto-redirects, so in-progress edits are not lost.
- While the notice is visible, the "L'accès à GitHub a été révoqué" sync strip is hidden; other sync errors still show.
- "Se déconnecter" stays available after an expiry (not authenticated, marker set), next to "Se connecter avec GitHub", so the user can opt out of sync without logging in first.
- Known gap: `syncOnLoad` only calls GitHub when the cache is stale, so with a fresh cache an expired cookie is not detected on load and no countdown shows.

**Org OAuth restriction (403).** When the configured repo sits under a GitHub organization that blocks third-party OAuth Apps, GitHub returns 403 with a recognisable `message`. That specific case is surfaced identically at all three call sites (`useRepoConfig`, `useRemotePreferencesSync`, `useRemotePreferencesWrite`) as a distinct, non-retryable error with this exact French text:

> Le dépôt choisi se trouve sous une organisation n'autorisant pas l'authentification avec votre compte et le dépôt choisi. Veuillez visiter ce lien pour autoriser l'accès.

"lien" opens, in a new tab, the org's OAuth-App access-settings page. The link is built only from the `owner` already configured in the app — never from any field in GitHub's response body. A 403 that is not this case (rate limiting, other causes, unparseable body) falls back to the call site's existing generic message. Re-authenticating does not clear this state, so it is never surfaced as the re-auth prompt.

## Related ADRs

- [ADR-011](../../decisions/ADR-011-github-oauth-app-auth.md) — GitHub OAuth App authentication via Netlify functions with an HTTP-only cookie.
- [ADR-018](../../decisions/ADR-018-auto-reconnect-github-on-load.md) — auto-reconnect to GitHub on load for previously-authenticated users whose session expired.
- [ADR-006](../../decisions/ADR-006-netlify-functions-for-cors-proxy.md) — the Netlify-function-as-proxy pattern these auth functions and the API proxy share.

## See also

- **Feature 2** consumes the resolved repo config and auth state to decide whether preferences come from IndexedDB or the GitHub file.
- **Feature 7** (refresh from remote) is only offered when this feature reports the user as authenticated and the config as complete.
- **Feature 8** deliberately does _not_ use this OAuth session — it authenticates with a fixed PAT (ADR-014). See the glossary entry "OAuth session vs PAT".

_Source specs (removed in this reorganization, in git history): `issue-64` sub-issues A, B, E, F; `issue-108`; `issue-120`._
