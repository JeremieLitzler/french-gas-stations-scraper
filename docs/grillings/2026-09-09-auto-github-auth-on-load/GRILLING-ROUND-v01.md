# Grilling round v01 — Auto-trigger GitHub auth on page load (issue #158)

## Settled so far (v00)

Nothing yet — this is the first round.

## Context the questions build on

- Issue #158 asks: fire `/.netlify/functions/github-auth-start` on page load when "no connection detected", gated on `owner/repo` and file path being present.
- `github-auth-start` is reached by `window.location.href = '/.netlify/functions/github-auth-start'` — a full-page navigation to GitHub.
- `isAuthenticated` is restored on load from the `githubAuthenticated` IndexedDB flag (a non-sensitive UI hint; the token is an HttpOnly cookie JS cannot read). That flag is removed on explicit logout, on a 401 (`handleUnauthorized`), and on a failed OAuth callback.
- The github-auth feature doc states as a rule: **"Silent when unauthenticated — no error is shown unless they attempt a sync"**; the app is explicitly usable with no GitHub account.
- `canInitiateLogin(config)` (gates the existing "Login with GitHub" button) requires three valid fields: `owner/repo`, file path, and a positive-integer `revalidate-cache-days`.
- The "on application load" sequence (auth init, repo-config load, `syncOnLoad`) lives in `HomePageContent.vue`, which mounts only on `index.vue`. The other route is `mentions-legales.vue`.

---

## Q1 — Motivating problem and success condition

The issue body is terse. Before designing a mechanism, pin down the user pain it solves — that decides who the trigger targets and how aggressive it should be.

Candidate framings:

a. **Expired session, returning user.** The 8-hour OAuth cookie has silently expired; the user keeps using the app not realising sync is dead and local data may be drifting from the GitHub file. Goal: get them re-authenticated with minimal friction.
b. **Half-configured, never logged in.** The user filled in `owner/repo` + file path but never completed login. Goal: carry them into the OAuth flow so setup finishes.
c. Both.

Also: what is "done"? Presumably the user returns authenticated and `syncOnLoad` then runs. Any explicit acceptance constraint about not disrupting the anonymous-use path?

➡️ Recommendation: **(a) as the sole driver; (b) explicitly out of scope.** A never-authenticated user may still be mid-configuration, and pulling them to GitHub the instant two fields are non-empty is hostile. Success = an expired-session returning user gets re-authenticated and `syncOnLoad` runs, with at most one redirect and no loop on failure, and the anonymous path unchanged.

### Answer to Q1

(a)

---

## Q2 — What "no connection detected" means, and whether "never logged in" is told apart from "session expired"

After `initializeAuthState()`, `isAuthenticated === false` covers three situations the code cannot currently distinguish: never authenticated; explicitly logged out; was authenticated, flag since cleared by a 401. The `githubAuthenticated` flag is just present or absent.

Options:

a. **No distinction.** Any `isAuthenticated === false` + config present = "no connection", trigger fires.
b. **Add a second persisted marker** (e.g. `githubWasAuthenticated`, set on first successful auth, cleared only on explicit logout) so the trigger can fire _only_ for "was connected, now isn't".
c. Use the in-memory `authError === SESSION_EXPIRED_MESSAGE` signal — but it does not survive a reload, so it cannot drive an on-load decision.

➡️ Recommendation: **(b).** Smallest change that targets exactly Q1(a) and skips both the not-configured-yet user and the deliberately-logged-out user. Explicit logout **must** suppress the trigger — otherwise logout is unusable, you bounce straight back in — and (a) cannot express that.

### Answer to Q2

(b)

---

## Q3 — Automatic redirect vs. an on-page reconnect prompt

`github-auth-start` is a full-page navigation away from the app to GitHub, before the app renders. The feature doc's "silent when unauthenticated" rule and the documented anonymous-use path are both in tension with an unattended redirect.

Options:

a. **Automatic.** On load, when conditions hold, set `window.location.href` to the start endpoint. Zero clicks; the user leaves for GitHub immediately.
b. **Prompt.** Render a prominent, dismissible banner ("Votre session GitHub a expiré — se reconnecter") whose button calls the existing `login()`. One click; nothing without intent.
c. **Hybrid.** Automatic only for the "session expired" case from Q2, banner otherwise.

➡️ Recommendation: **(b).** An unattended full-page redirect on load is a large departure from documented behaviour, hostile to someone who opened the app just to look at prices, and fragile — any failure risks a redirect loop (round 2 topic). A banner reconnects the returning user in one click, keeps the anonymous path intact, and reuses `login()` and the existing `SESSION_EXPIRED_MESSAGE` string. If you want (a), it must be narrow (only Q2(b)'s "was authenticated" case) and needs the loop guard from round 2. Note: option (c) collapses into (a) if Q2 lands on "no distinction".

### Answer to Q3

After auth happened, the callback already returns use to the home page and we're on a SPA so. But I like banner idea so go for (b).

---

## Q4 — Which config fields gate the trigger

The issue names two fields (`owner/repo`, file path). `canInitiateLogin` requires three (those plus a valid positive `revalidate-cache-days`); so does `hasCompleteRepoConfig` (used by `syncOnLoad` / `canRefreshNow`). `github-auth-start` itself needs no client input.

Options:

a. **Reuse `canInitiateLogin`** — all three fields, consistent with the "Login with GitHub" button's gate.
b. **New two-field check** matching the issue's literal wording (`owner/repo` + file path only).

➡️ Recommendation: **(a).** `revalidate-cache-days` defaults to 7 and is only invalid if the user typed garbage or a non-positive value — a state in which the manual "Login with GitHub" button is already disabled. Letting an auto-trigger bypass a gate the manual button enforces is inconsistent, and reusing `canInitiateLogin` keeps one definition of "ready to authenticate".

### Answer to Q4

(a)

---

## Q5 — Which routes the trigger applies to

Two pages: `index.vue` (prices + station manager) and `mentions-legales.vue` (static legal text). The on-load sequence lives in `HomePageContent.vue`, which mounts only on `index.vue`.

Options:

a. **`index.vue` only** — the legal page never triggers it.
b. **Every route** — a global router guard or `App.vue`-level check.

➡️ Recommendation: **(a).** GitHub sync is meaningless on the legal page. Keeping the trigger inside the existing `HomePageContent.vue` sequence means it composes with `initializeAuthState` / `loadRepoConfig` already resolved there, instead of a second load path in a router guard.

### Answer to Q5

(a)
