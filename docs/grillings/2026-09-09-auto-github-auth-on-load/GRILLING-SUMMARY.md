# Grilling summary — Auto-trigger GitHub auth on page load (issue #158)

## Shared understanding

Issue #158 asked the app to call `/.netlify/functions/github-auth-start` on page load when "no connection is detected", provided `owner/repo` and the file path are set. The grilling narrowed who this is for and how it behaves.

**Who it is for.** Only the returning user whose 8-hour GitHub OAuth cookie has silently expired. Today that user comes back, sees the amber "access revoked" warning at the top of the page, and has to scroll down to the GitHub settings section to click "Se connecter avec GitHub". A user who filled in the repo config but never logged in is out of scope: they may still be configuring, and pulling them to GitHub would be hostile. A user who logged out on purpose must never be pulled back in.

**How "expired" is told apart.** The existing `githubAuthenticated` flag is only present or absent, which cannot separate "never connected", "logged out" and "expired". A second IndexedDB marker, `githubWasAuthenticated`, is set on a successful OAuth callback and cleared only on explicit logout. Existing users get it backfilled on load whenever `githubAuthenticated` is read back `true`.

**Why the trigger runs after `syncOnLoad`, not before.** An expired cookie is invisible at load: the `githubAuthenticated` flag is still `true` until a GitHub call returns 401. So the check sits right after `syncOnLoad` in `HomePageContent.vue` (home page only, never on `mentions-legales`). Placed there, it also covers the case where a 401 on an earlier visit already cleared the flag, because `syncOnLoad` returns early when unauthenticated.

**Why a redirect, and why a countdown.** The first answer was a banner only, since an unattended navigation on load contradicts the feature's "silent when unauthenticated" rule. That answer was changed: when everything needed is present, the user wants to be taken to GitHub without scrolling or clicking. To keep that from being a surprise, a notice shows for 2 seconds ("Votre session GitHub a expiré. Reconnexion automatique dans 2 secondes…") with an "Annuler" button, then the app navigates to `github-auth-start`. With an active github.com session the round trip feels like a reload.

**Why there is no loop.** A user who declines on GitHub, or whose OAuth fails, comes back to `/?auth=error` with the marker still set, so without a guard they would be redirected again forever. An IndexedDB counter, `githubAutoReconnectAttempts`, allows one automatic attempt per expiry. It is incremented when the countdown starts, so cancelling, closing the tab or reloading during the countdown all use up the attempt. It is reset only on a successful callback or on logout.

**The fallback banner.** Once the attempt is used, or when a 401 happens later in the session (mid-session 401s never auto-redirect, so in-progress edits are not lost), the same notice shows in a fallback state: `SESSION_EXPIRED_MESSAGE` plus a "Se reconnecter à GitHub" button that calls `login()` directly, without touching the counter. The banner can be dismissed with a "×" for the rest of the page session and comes back on the next load. It is never dismissible for good, because a previously-authenticated user benefits from sync. While the notice is visible, the duplicate `ACCESS_REVOKED_MESSAGE` amber strip is hidden in the template.

**Gate.** Nothing happens unless `canInitiateLogin(repoConfig)` passes, which needs all three fields valid (`owner/repo`, file path, positive `revalidate-cache-days`), the same gate as the manual login button.

**Documentation.** Because an on-load navigation is surprising to a future reader and the banner-only alternative was weighed and rejected, the decision gets an ADR (ADR-018). The github-auth feature README and the `CONTEXT.md` glossary are updated. The OAuth mechanism (ADR-011) is unchanged.

## Decision index

- Q1 (v01) — Sole target: the expired-session returning user; never-logged-in users are out of scope; at most one redirect, no loop, anonymous use unchanged.
- Q2 (v01) — Add a second persisted marker to detect "was connected, now isn't"; explicit logout suppresses the trigger.
- Q3 (v01, answer revised before v02) — Hybrid: automatic redirect when everything is present, banner as fallback, IndexedDB-stored attempts prevent a loop.
- Q4 (v01) — Gate on `canInitiateLogin(repoConfig)` (three fields).
- Q5 (v01) — `index.vue` only, inside `HomePageContent.vue`'s load sequence.
- Q6 (v02) — Marker `githubWasAuthenticated` in IndexedDB; set on callback success; cleared only in `logout()`; backfilled on load when `githubAuthenticated` is `true`.
- Q7 (v02) — Single check right after `syncOnLoad`: `!isAuthenticated && githubWasAuthenticated && canInitiateLogin(repoConfig) && attempt allowed`.
- Q7b (v02) — No auto-redirect on a mid-session 401; banner only.
- Q8 (v02) — `githubAutoReconnectAttempts` (number, IndexedDB), limit 1, reset on callback success and logout, never on error/401/reload.
- Q9 (v02) — Banner shows when not authenticated, marker set, gate passes, and no auto-redirect is pending.
- Q10 (v02) — 2-second notice with a cancel button before redirecting; cancel uses the attempt and shows the banner.
- Q11 (v02) — Banner reuses `SESSION_EXPIRED_MESSAGE`; composables' `authError` and `syncError` paths unchanged.
- Q11b (v03) — Hide the `ACCESS_REVOKED_MESSAGE` strip in the template while the reconnect notice is visible.
- Q12 (v02) — Dedicated `GitHubReconnectNotice.vue` rendered from `HomePageContent.vue`.
- Q12b (v02) — Dismissible, reappears on next load; no persisted dismissal.
- Q13 (v02) — Banner button "Se reconnecter à GitHub" calls `login()` directly, no counter check; amber `role="status"`, Tailwind only.
- Q14 (v02) — Write ADR-018; update github-auth feature README and `CONTEXT.md` glossary; ADR-011 untouched.
- Q15 (v03) — One `GitHubReconnectNotice.vue` with `countdown` and `fallback` states; emits `cancel`, `reconnect`, `dismiss`.
- Q15b (v03) — Static countdown text, "Annuler" label, `role="status"`, no focus move.
- Q16 (v03) — Counter incremented when the countdown starts.
- Q17 (v03) — "×" button (`aria-label="Masquer"`) in `fallback` only; in-memory dismissal for the page session; banner returns on next load.

Superseded: Q3's original answer (b, banner only) was replaced by (c, hybrid) before v02 was answered; v02 was rewritten around it. Q11's "different scroll region" rationale was wrong for `syncError`, which led to Q11b.

## Paste-ready for issue #158

> **Scope after design review**
>
> Target only the returning user whose GitHub session (8-hour OAuth cookie) has expired. Users who never logged in, or who logged out on purpose, are not affected.
>
> - Add an IndexedDB marker `githubWasAuthenticated`: set on a successful OAuth callback, cleared only on logout, backfilled on load for already-authenticated users.
> - On the home page, right after `syncOnLoad`, if the user is not authenticated, the marker is set, and `canInitiateLogin(repoConfig)` passes, show a 2-second notice ("Votre session GitHub a expiré. Reconnexion automatique dans 2 secondes…") with an "Annuler" button, then redirect to `/.netlify/functions/github-auth-start`.
> - Loop guard: `githubAutoReconnectAttempts` in IndexedDB allows one automatic attempt per expiry. It is incremented when the countdown starts and reset on successful callback or logout.
> - Fallback: when the attempt is used, or on a 401 later in the session, show a banner with `SESSION_EXPIRED_MESSAGE` and a "Se reconnecter à GitHub" button calling `login()`. Dismissible ("×") for the current page session; it reappears on next load.
> - Both states live in one `GitHubReconnectNotice.vue` component. While it is visible, the `ACCESS_REVOKED_MESSAGE` strip is hidden.
> - Mid-session 401s never auto-redirect.
> - Docs: ADR-018, github-auth feature README (narrow the "silent when unauthenticated" rule), `CONTEXT.md` glossary.

## Not grilled, decided while writing this

Object to any of these before they become a spec:

- **Where the logic lives.** Not discussed. I assumed the marker read/write and the attempt counter live in `useGitHubAuth.ts` (next to `githubAuthenticated`), and the countdown timer and dismissal state live in `HomePageContent.vue`. A separate `useGitHubAutoReconnect` composable is the alternative.
  - Agreed
- **Leaving the page during the countdown.** If the user navigates to `mentions-legales` within the 2 seconds, I assumed the timer is cleared on unmount and no redirect happens. The attempt is already used (Q16), so the next home-page load shows the banner.
  - Correct
- **Landing on `/?auth=error` after the attempt.** I assumed the existing red `CALLBACK_ERROR_MESSAGE` in the settings section still shows, alongside the fallback banner at the top. Nothing in the grilling changed that path.
  - Correct
- **Counter values.** I assumed only "below 1" vs "1 or more" matters; nothing reads the number for display.
  - Yes
