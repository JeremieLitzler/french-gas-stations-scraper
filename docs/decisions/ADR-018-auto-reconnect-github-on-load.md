# ADR-018: Auto-Reconnect to GitHub on Load for Previously-Authenticated Users

**Date:** 2026-11-03
**Status:** Accepted

## Context

The GitHub OAuth token lives in an HTTP-only cookie with an 8-hour lifetime and no refresh (ADR-011). When it lapses between visits, the returning user lands on the home page, `syncOnLoad` gets a 401, and the only way back is an amber "access revoked" strip at the top and a "Se connecter avec GitHub" button far down in the GitHub settings section. Issue #158 asked for the OAuth flow to start on load when "no connection is detected".

Two facts shaped the design:

- The `githubAuthenticated` IndexedDB flag is only present or absent, so it cannot separate "never connected", "logged out on purpose" and "session expired". Only the last case should ever be pulled back to GitHub.
- An expired cookie is invisible at load: the flag is still `true` until a GitHub call returns 401. The trigger can only run after `syncOnLoad`.

The github-auth feature doc also stated "Silent when unauthenticated": no message unless the user attempts something that needs GitHub.

The decision was grilled in `docs/grillings/2026-09-09-auto-github-auth-on-load/`.

## Decision

On the home page only, right after `syncOnLoad` in `HomePageContent.vue`, a previously-authenticated user whose session expired is redirected to `/.netlify/functions/github-auth-start` automatically, after a 2-second notice with a cancel button.

- **Marker.** A second IndexedDB key, `githubWasAuthenticated`, is set on a successful OAuth callback and cleared only on explicit logout. It is backfilled on load whenever `githubAuthenticated` is read back `true`, so users authenticated before this change are covered.
- **Condition.** `!isAuthenticated && githubWasAuthenticated && canInitiateLogin(repoConfig)` (`needsReconnect`), plus an unused automatic attempt (`canAutoReconnect`).
- **Loop guard.** `githubAutoReconnectAttempts` (a number in IndexedDB) allows one automatic attempt per expiry. It is incremented when the countdown starts, so cancelling, closing the tab or reloading during the countdown all use it up. It is reset on logout, and on a *proven* session: a later plain load that still finds `githubAuthenticated` set, meaning the previous load got no 401. It is deliberately not reset on the OAuth callback itself. A declined or failed round trip (`/?auth=error`), and a login that succeeds but whose token the API still rejects (wrong scope, revoked repo grant), therefore never redirect again.
- **Fallback banner.** When the attempt is used, or after a 401 later in the session (which never auto-redirects, so in-progress edits are not lost), the same `GitHubReconnectNotice.vue` shows a banner with `SESSION_EXPIRED_MESSAGE`, a "Se reconnecter à GitHub" button calling `login()`, and a dismiss control that hides it for the current page session only.
- While the notice is visible, the duplicate `ACCESS_REVOKED_MESSAGE` strip is hidden.
- **Opt-out.** "Se déconnecter" is also shown in the GitHub settings section when the user is not authenticated but `githubWasAuthenticated` is set, so a user who no longer wants sync can clear the marker without logging in first.

The OAuth mechanism itself (ADR-011) is unchanged.

## Consequences

### Positive

- A returning user with an active github.com session gets reconnected with no click and no scrolling; the round trip feels like a reload.
- Never-connected and logged-out users are untouched; the anonymous-use path is unchanged.
- No redirect loop is possible: at most one automatic navigation per expiry.

### Negative

- The app now navigates away on load in one case, which narrows the "silent when unauthenticated" rule. A reader of `HomePageContent.vue` has to know about this ADR to expect it.
- Two more IndexedDB keys to keep consistent with `githubAuthenticated`.
- A user without an active github.com session lands on the GitHub login page after 2 seconds unless they cancel.
- The trigger relies on `syncOnLoad` getting a 401, and `syncOnLoad` only calls GitHub when the local cache is older than `revalidate-cache-days`. While the cache is fresh, an expired cookie is not detected on load; it surfaces later through a 401 on a write or refresh, which shows the fallback banner. A load-time session probe is tracked as a follow-up.

## Alternatives Considered

- **Banner only, no automatic redirect.** Closest to the existing "silent" rule and the safest, but it keeps the click the issue wanted to remove. It was first chosen, then rejected in favour of the hybrid.
- **Redirect immediately, no notice.** Fastest, but surprising; the 2-second cancellable notice costs little.
- **Trigger on any unauthenticated user with a complete repo config.** Would pull in users still configuring the app and users who logged out on purpose.
- **Auto-redirect on mid-session 401s too.** Rejected: navigating away while the user edits stations or settings loses their work.
- **Reset the attempt counter on every successful callback** (the grilled first version). Rejected during code review: a login that succeeds while the API keeps returning 401 would loop.
- **Persisted banner dismissal.** Rejected: a previously-authenticated user benefits from sync, so the banner returns on the next load.

## Notes

- Issue: #158
- Grilling record: `docs/grillings/2026-09-09-auto-github-auth-on-load/GRILLING-SUMMARY.md`
