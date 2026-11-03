# Grilling round v02 — Auto-trigger GitHub auth on page load (issue #158)

## Settled in v01

- **Q1 — Driver.** The one target is the _expired-session returning user_ (8-hour OAuth cookie lapsed, sync silently dead). A user who filled in repo config but never logged in is **out of scope**. Success = that user gets re-authenticated and `syncOnLoad` then runs, at most one redirect, no loop on failure, anonymous-use path unchanged.
- **Q2 — Detection.** A second persisted marker is added (working name `githubWasAuthenticated`), set on first successful auth and cleared **only on explicit logout**. The trigger considers only "was connected, now isn't" — never "never connected" and never "logged out on purpose".
- **Q3 — Mechanism.** **Hybrid (c).** When everything is present, the app **redirects automatically** to `github-auth-start`; a banner with a reconnect button exists as the fallback. An IndexedDB-persisted record of auto-redirect attempts prevents an infinite redirect loop.
- **Q4 — Gate.** Reuse `canInitiateLogin(repoConfig)` — all three fields (`owner/repo`, file path, positive `revalidate-cache-days`), same gate as the manual "Se connecter avec GitHub" button.
- **Q5 — Scope.** `index.vue` only, inside the existing `HomePageContent.vue` load sequence. No router guard, nothing on `mentions-legales.vue`.

## Reopened

- **Q3** — you changed your answer from (b) banner to (c) hybrid. This round was rewritten from scratch around that: the previous v02 had no answers, so nothing of yours was lost.

## What this round found in the code

- **An expired cookie is not visible at load.** `initializeAuthState()` restores `isAuthenticated` from the `githubAuthenticated` flag, and that flag is only removed on a 401 (`handleUnauthorized`), on logout, or on a failed callback. When the 8-hour cookie lapses silently, the flag is still `true` on the next visit: the app believes it is connected until `syncOnLoad` calls GitHub and gets a 401. So the common case is detected **after** `syncOnLoad`, not before it.
- The flag is already absent at load only if a 401 happened on a previous visit (the user saw the in-settings message and left without reconnecting).
- `syncOnLoad` runs right after the `Promise.all([initializeAuthState(), loadRepoConfig()])` in `HomePageContent.vue`, and returns early when `!isAuthenticated`. On a 401 it calls `handleUnauthorized()` (sets `authError = SESSION_EXPIRED_MESSAGE`, deletes the flag) and sets `syncError = ACCESS_REVOKED_MESSAGE`.
- **Loop source.** A user who declines on GitHub (or any OAuth failure) comes back to `/?auth=error`. `applyAuthCallbackResult('error')` deletes the flag but would leave `githubWasAuthenticated` untouched (Q2), so without a guard the next load would redirect again, and so on forever.
- If the user still has an active github.com session and has already authorised the OAuth app, GitHub bounces straight back with no screen: the round trip feels like a reload. If not, they land on the GitHub login page.
- `authError` is rendered as a red `<p role="alert">` in `GitHubSyncSettings.vue`; the existing notices in `HomePageContent.vue` (`divergedNotice`, `writeSuccess`) are plain amber/green `<p role="status">`.

## Q6 - `githubWasAuthenticated` marker: lifecycle, storage, migration

The marker from Q2 needs its exact rules pinned.

- **Set** — in `applyAuthCallbackResult('success')`, right where `githubAuthenticated` is persisted `true`.
- **Cleared** — in `logout()` only. **Not** in `handleUnauthorized()` (401), **not** on a failed callback, **not** on `revalidate-cache-days` becoming invalid. (A lapsed session is exactly when we want the marker to still be true.)
- **Storage** — IndexedDB, same wrapper and pattern as `githubAuthenticated` (ADR-008).
- **Migration / backfill** — a user already authenticated when this ships has `githubAuthenticated = true` but no marker. Whenever `githubAuthenticated` is read back as `true` on load, also write `githubWasAuthenticated = true`. Without this, an existing user gets no auto-reconnect until their next fresh login.
- **Name** — `githubWasAuthenticated` vs e.g. `githubEverAuthenticated` / `githubSyncPreviouslyEnabled`.

➡️ Recommendation: adopt all five bullets as written. Name: **`githubWasAuthenticated`** — it reads alongside `githubAuthenticated` and the "was" tense states the meaning. Backfill on the `initializeAuthState` path so it is a one-line side effect of restoring the existing flag.

### Answer to Q6

Looks good.

## Q7 - When the auto-redirect fires during the load sequence

Given the finding above, there are two load-time moments where "was connected, now isn't" becomes known:

- **(i) Before `syncOnLoad`** — flag absent, `githubWasAuthenticated` true, `canInitiateLogin(repoConfig)` true. Happens when a 401 occurred on an earlier visit.
- **(ii) Right after `syncOnLoad`'s 401** — the flag was still `true`, the GitHub call returned 401, `handleUnauthorized()` just ran. This is the **common** case: the cookie lapsed between visits.

Options:

a. **Both (i) and (ii)** — one check, evaluated after `syncOnLoad` returns: `!isAuthenticated && githubWasAuthenticated && canInitiateLogin(repoConfig) && attempt allowed` (Q8). Running it after `syncOnLoad` covers (i) too, because `syncOnLoad` returns early when `!isAuthenticated`.
b. **(i) only** — the user who hits a fresh 401 sees the banner this visit, and is auto-redirected only on their next visit.

➡️ Recommendation: **(a)**, as a single check placed right after the `syncOnLoad` call in `HomePageContent.vue`. (b) would miss the case that motivates the issue, and splitting the check in two places adds nothing since (a) already covers (i).

### Answer to Q7

A

## Q7b - Does a 401 later in the session (not during load) also auto-redirect?

After load, other GitHub calls can still return 401: a refresh, a write of preferences, etc. `handleUnauthorized()` runs the same way.

a. **No — banner only mid-session.** Auto-redirect is a load-time behaviour. Mid-session, the user may be editing a station or the repo settings; navigating away under them would lose that work.
b. **Yes — same check, any time.** A watcher on `isAuthenticated` redirects whenever the predicate becomes true.

➡️ Recommendation: **(a).** Your Q3 answer was about arriving on the page with everything present. A navigation the user didn't ask for while they are typing is the one case where auto-redirect clearly hurts. The banner covers it with one click.

### Answer to Q7b

A

To be clear: when I return to the app after the cookie expired, I see the warning on top and I have to scroll to "click" the button to authenticate again. This is the scenario we need to tackle.

## Q8 - The loop guard: what is stored, the attempt limit, and when it resets

Your Q3 answer: "The IndexedDB can store the attempts of automatic redirect". The rules to pin:

- **Key and shape** — `githubAutoReconnectAttempts`, a number, in IndexedDB via the same wrapper as the other flags.
- **Limit** — auto-redirect only while the count is below **1**, i.e. one automatic attempt per expiry. Matches Q1's "at most one redirect".
- **Increment** — written **before** setting `window.location.href`, so a tab closed on the GitHub page still counts as an attempt.
- **Reset to 0 (delete the key)** — on `applyAuthCallbackResult('success')`, and in `logout()`.
- **Not reset** — on `/?auth=error`, on a 401, on reload. After a failed or abandoned attempt, the user gets the banner (Q9) until they reconnect by hand.

➡️ Recommendation: adopt as written, with a limit of **1**. A higher limit only helps a user whose network failed mid-OAuth, and the banner already covers them; a limit of 1 makes "no loop" trivially true. Storing a number rather than a boolean leaves room to raise the limit later without a migration.

### Answer to Q8

A

## Q9 - When the banner shows

With auto-redirect as the main path, the banner is the fallback. Proposed predicate, as a `computed` in `HomePageContent.vue`:

**`!isAuthenticated && githubWasAuthenticated && canInitiateLogin(repoConfig) && attempts >= limit`**, plus the mid-session case from Q7b.

In practice it shows when:

- the automatic attempt has already been used (the user declined on GitHub, OAuth failed, or they closed the tab on the GitHub page);
- a 401 happens mid-session (if Q7b = a).

It never shows when `canInitiateLogin` is false (reconnecting is impossible until the field is fixed, and the settings section already flags it), and it disappears after a successful reconnect.

➡️ Recommendation: adopt as written. Simplest form: show the banner whenever `!isAuthenticated && githubWasAuthenticated && canInitiateLogin(repoConfig)` and **no auto-redirect is about to happen**. That one rule covers both cases above.

### Answer to Q9

I approve

## Q10 - What the user sees just before the auto-redirect

When the check from Q7 passes, the app can:

a. **Redirect immediately** — set `window.location.href` with no notice.
b. **Show a short notice first** ("Session GitHub expirée — reconnexion…") for ~1–2 s, then redirect.
c. **Show a notice with a cancel button** for a few seconds; cancelling uses up the attempt and shows the banner instead.

➡️ Recommendation: **(a).** With an active github.com session the round trip is near-transparent, and any delay just slows that down. A user who lands on the GitHub login page and doesn't want it can come back. The attempt counter means they won't be redirected again, and the banner explains what happened. (c) is the polite option if the surprise bothers you, but it adds a timer and a cancel path to test.

### Answer to Q10

C feels natural. timeout = 2 sec

## Q11 - Banner relationship to the existing `authError` line and to `syncError`'s revoked-access message

Up to three surfaces could describe one lapsed session: the new banner, the in-settings `authError` `<p>`, and the `syncError` amber banner (`ACCESS_REVOKED_MESSAGE`). With auto-redirect, (ii) from Q7 sets both messages and then leaves the page, so the overlap only matters when the banner is shown (attempt used, or mid-session).

a. **Banner is the single home for "session expired".** It reuses `SESSION_EXPIRED_MESSAGE` verbatim. The in-settings `authError` `<p>` stays as-is (it still serves the `CALLBACK_ERROR_MESSAGE` failed-login case). `syncError`'s `ACCESS_REVOKED_MESSAGE` path is untouched.
b. **Consolidate.** Suppress `authError` / `ACCESS_REVOKED_MESSAGE` while the banner is visible.
c. Banner gets its **own new string**.

➡️ Recommendation: **(a).** Smallest change, no rewiring of `useRemotePreferencesSync`. One canonical "your session expired" sentence. Consolidation touches three composables for a duplicate that sits in a different scroll region.

### Answer to Q11

A

## Q12 - Banner placement

a. Inline in `HomePageContent.vue`'s template, as another `<p role="status">` next to `syncErrorText` / `writeErrorText` / `divergedNotice`.
b. A dedicated `GitHubReconnectNotice.vue` component (message + button), rendered from `HomePageContent.vue`.

➡️ Recommendation: **(b).** This notice carries an action (a button), unlike the plain-text notices, and a component keeps `HomePageContent.vue`'s template flat and gives the banner its own spec.

### Answer to Q12

B

## Q12b - Is the banner dismissible?

x. **Not dismissible** — stays until the user reconnects or logs out. Matches `divergedNotice` / `writeSuccess`.
y. Dismissible, reappears on next load.
z. Dismissible, dismissal persisted.

➡️ Recommendation: **(x).** It only ever shows to someone who chose sync before (Q2) and whose automatic attempt already failed, so the nudge is the point. Logging out is the explicit way to say "stop", and it clears the marker. A persisted dismissal (z) would let local data drift with no reminder.

### Answer to Q12b

Y. The user can choose to ignore, but there is no point to dismiss forever since an authenticated user benefits from GitHub sync.

## Q13 - Banner copy, button label and button action

- **Message**: reuse `SESSION_EXPIRED_MESSAGE` — "Votre session GitHub a expiré. Merci de vous reconnecter." (per Q11).
- **Button label**: "Se reconnecter à GitHub".
- **Button action**: call the existing `login()` directly. A manual click does **not** check or increment the attempt counter (Q8 limits _automatic_ redirects only). No draft to save first: repo config is already in IndexedDB (that is the gate).
- **Styling**: amber `role="status"` strip, consistent with `divergedNotice`; Tailwind utilities only.

➡️ Recommendation: adopt as written.

### Answer to Q13

Approved

## Q14 - ADR, or documentation-only?

The github-auth feature README rule "Silent when unauthenticated — no error is shown unless they attempt a sync" is now broken more deeply than a banner would: the app **navigates away on load** for a returning user, and adds a persisted loop guard. Against the ADR bar: (1) it is reversible, but (2) an unattended redirect on load is surprising to anyone reading the code later, and (3) there was a real alternative (banner only) that you weighed and rejected in Q3.

➡️ Recommendation: **write a short ADR** ("Auto-reconnect to GitHub on load for previously-authenticated users"), recording the hybrid decision, the `githubWasAuthenticated` marker, the one-attempt loop guard and the rejected banner-only option. Also update the **github-auth feature README** (narrow the "silent" rule; add the marker, the attempt counter, the redirect point and the banner to Implementing Code and Behaviour) and the **CONTEXT.md glossary** (entries for `githubWasAuthenticated` and the auto-reconnect attempt, contrasted with the `githubAuthenticated` UI hint). ADR-011 is untouched: the OAuth mechanism itself does not change.

### Answer to Q14

Approved
