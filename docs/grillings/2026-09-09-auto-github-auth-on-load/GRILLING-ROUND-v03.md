# Grilling round v03 — Auto-trigger GitHub auth on page load (issue #158)

## Settled in v02

- **Q6 — Marker.** `githubWasAuthenticated` in IndexedDB (ADR-008 wrapper). Set in `applyAuthCallbackResult('success')`; cleared **only** in `logout()` (not on 401, not on a failed callback, not on invalid config). Backfilled on load whenever `githubAuthenticated` is read back `true`.
- **Q7 — Redirect point.** One check placed right after `syncOnLoad` in `HomePageContent.vue`: `!isAuthenticated && githubWasAuthenticated && canInitiateLogin(repoConfig) && attempt allowed`. It covers both "flag already absent at load" and "fresh 401 from `syncOnLoad`".
- **Q7b — Mid-session 401.** No auto-redirect after load; banner only. Your target scenario, stated in your answer: coming back after the cookie expired, you see the amber warning at the top and have to scroll down to the settings button to log in again. Q7 removes that scroll.
- **Q8 — Loop guard.** I read your "A" as accepting the bullets as written (there were no lettered options): `githubAutoReconnectAttempts` (number, IndexedDB), automatic attempts allowed only while the count is below **1**, incremented before navigating, reset (key deleted) on callback success and on logout, never reset on `/?auth=error`, 401 or reload.
- **Q9 — Banner predicate.** Banner shows when `!isAuthenticated && githubWasAuthenticated && canInitiateLogin(repoConfig)` and no auto-redirect is about to happen. Disappears after a successful reconnect.
- **Q10 — Pre-redirect UX.** **(c)** A notice with a cancel button, **2-second** timeout, then redirect. Cancelling uses up the attempt and shows the banner instead.
- **Q11 — Messages.** Banner reuses `SESSION_EXPIRED_MESSAGE`; the in-settings `authError` line and the `syncError` / `ACCESS_REVOKED_MESSAGE` path stay as they are in the composables. (See Q11b: one display detail reopens.)
- **Q12 — Placement.** Dedicated `GitHubReconnectNotice.vue`, rendered from `HomePageContent.vue`.
- **Q12b — Dismissal.** **(y)** Dismissible, reappears on next load. No persisted dismissal, because an authenticated user benefits from sync.
- **Q13 — Banner copy and action.** Message `SESSION_EXPIRED_MESSAGE`; button "Se reconnecter à GitHub"; calls `login()` directly, which neither checks nor increments the attempt counter; amber `role="status"` strip, Tailwind only.
- **Q14 — Documentation.** Write a short ADR (next number: **ADR-018**) for the auto-reconnect; update the github-auth feature README and the CONTEXT.md glossary. ADR-011 untouched.

## Reopened

- **Q11**, narrowly. My Q11 reasoning said the duplicate sat "in a different scroll region". That holds for the in-settings `authError` line, but **not** for `syncError`: the `ACCESS_REVOKED_MESSAGE` amber strip is rendered in `HomePageContent.vue`, i.e. the same top-of-page area as the new notice. It is the "warning on top" from your Q7b answer. The composable side of Q11 stays settled; only whether both strips are _displayed_ together is reopened, as Q11b.

## Q11b - Hide the `ACCESS_REVOKED_MESSAGE` strip while the reconnect notice is visible

When the reconnect notice shows after a 401 (countdown, or banner after a mid-session 401), the top of the page would show two amber strips saying nearly the same thing: "L'accès à GitHub a été révoqué. Vos données locales sont utilisées." and "Votre session GitHub a expiré. Merci de vous reconnecter."

a. **Hide the `syncError` strip in the template whenever the reconnect notice is visible.** `syncError` is still set in the composable (Q11 unchanged); only its display is conditioned. Other `syncError` values (invalid remote content, network failure) are unaffected, since this only applies to `ACCESS_REVOKED_MESSAGE`.
b. **Show both.**

➡️ Recommendation: **(a).** One template condition, no composable change, and it removes exactly the duplicate you described. The reconnect notice says more (it carries the action), so it is the one to keep.

### Answer to Q11b

## I understand now > A

## Q15 - One component with two states for the countdown and the banner

Q10 adds a countdown notice (message + cancel) next to the fallback banner from Q12 (message + reconnect button + dismiss). Both say the session expired and live at the top of the page.

a. **One `GitHubReconnectNotice.vue` with two states**: `countdown` (message + "Annuler") and `fallback` (message + "Se reconnecter à GitHub" + dismiss). `HomePageContent.vue` passes the state; the component emits `cancel`, `reconnect`, `dismiss`.
b. **Two components** (`GitHubAutoReconnectCountdown.vue` + `GitHubReconnectNotice.vue`).

➡️ Recommendation: **(a).** Same message, same place, same styling. The countdown only ever turns into the banner (on cancel) or into a navigation, so one component switching state reads naturally and avoids layout jumping between two components.

### Answer to Q15

A

## Q15b - Countdown copy and cancel label

- **Message**: "Votre session GitHub a expiré. Reconnexion automatique dans 2 secondes…" — static text, no ticking seconds.
- **Cancel button label**: "Annuler".
- **Accessibility**: `role="status"` like the other notices (polite announcement); the cancel button gets focus? **No** — moving focus on load is intrusive, and 2 seconds is too short to rely on keyboard users reaching it anyway.

➡️ Recommendation: adopt as written. A live "2… 1…" countdown adds a ticking timer to test for a 2-second window, so static text is enough. Not moving focus follows the existing notices.

### Answer to Q15b

Approved

## Q16 - When the attempt counter is incremented, now that there is a countdown

Q8 says "incremented before navigating". With a 2-second countdown and a cancel button, the two candidate moments are:

a. **When the countdown starts.** Cancel, a closed tab during the countdown, a reload during the countdown, and the actual redirect all count as the one attempt. Cancel then only has to switch the component to `fallback`.
b. **When the timer fires**, just before `window.location.href`; cancel also writes the counter.

➡️ Recommendation: **(a).** One write, in one place, before any branching. With (b), a reload during the 2 seconds would leave the counter at 0 and restart the countdown on every reload, which is a soft loop.

### Answer to Q16

A

## Q17 - What "dismissible, reappears on next load" means exactly

Pinning Q12b(y):

- **Control**: a "×" icon button with `aria-label="Masquer"`, only in the `fallback` state (the countdown has "Annuler" instead).
- **Memory**: an in-memory `ref` in `HomePageContent.vue`, not persisted.
- **Within the same page session**: once dismissed, the banner stays hidden even if another 401 happens later in the same session.
- **On next load**: the attempt is already used (Q8), so no countdown. The banner shows again in `fallback`.

➡️ Recommendation: adopt as written. Staying hidden for the rest of the session respects the user's choice to ignore it; the next load brings it back, as your answer asked.

### Answer to Q17

Approved
