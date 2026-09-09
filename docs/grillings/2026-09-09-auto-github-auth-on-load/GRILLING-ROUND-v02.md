# Grilling round v02 — Auto-trigger GitHub auth on page load (issue #158)

## Settled in v01

- **Q1 — Driver.** The one target is the *expired-session returning user* (8-hour OAuth cookie lapsed, sync silently dead). A user who filled in repo config but never logged in is **out of scope**. Success = that user gets re-authenticated and `syncOnLoad` then runs, at most one redirect, no loop on failure, anonymous-use path unchanged.
- **Q2 — Detection.** A second persisted marker is added (working name `githubWasAuthenticated`), set on first successful auth and cleared **only on explicit logout**. The trigger considers only "was connected, now isn't" — never "never connected" and never "logged out on purpose".
- **Q3 — Mechanism.** **No automatic redirect.** A prominent, on-page banner with a "reconnect" button that calls the existing `login()`. One user click, nothing without intent.
- **Q4 — Gate.** Reuse `canInitiateLogin(repoConfig)` — all three fields (`owner/repo`, file path, positive `revalidate-cache-days`), same gate as the manual "Se connecter avec GitHub" button.
- **Q5 — Scope.** `index.vue` only, inside the existing `HomePageContent.vue` load sequence. No router guard, nothing on `mentions-legales.vue`.

## Reopened

None.

## What this round found in the code

- `authError` **is already rendered today** — as a red `<p role="alert">` inside `GitHubSyncSettings.vue` (which sits inside `StationManager.vue` on `index.vue`). After an in-session 401, `handleUnauthorized` sets `authError = SESSION_EXPIRED_MESSAGE` ("Votre session GitHub a expiré. Merci de vous reconnecter.") and the "Se connecter avec GitHub" button reappears there.
- But that message is **in-memory only**. After a reload, `initializeAuthState()` resets `authError` to `null`; the user is silently `!isAuthenticated` with only the login button buried in the settings section and no explanation. That reload gap is the concrete hole #158 fills.
- On a 401 during `syncOnLoad`, `syncError` is separately set to `ACCESS_REVOKED_MESSAGE` ("L'accès à GitHub a été révoqué. Vos données locales sont utilisées.") and rendered as an amber banner in `HomePageContent.vue` — so two different strings can describe the same lapsed session.
- Existing non-blocking notices in `HomePageContent.vue` (`divergedNotice`, `writeSuccess`) use a plain amber/green `<p role="status">`, not a dismissible component.

---

## Q6 — `githubWasAuthenticated` marker: lifecycle, storage, migration

The marker from Q2 needs its exact rules pinned.

- **Set** — in `applyAuthCallbackResult('success')`, right where `githubAuthenticated` is persisted `true`.
- **Cleared** — in `logout()` only. **Not** in `handleUnauthorized()` (401), **not** on a failed callback, **not** on `revalidate-cache-days` becoming invalid. (A lapsed session is exactly when we want the marker to still be true.)
- **Storage** — IndexedDB, same wrapper and pattern as `githubAuthenticated` (ADR-008).
- **Migration / backfill** — a user already authenticated when this ships has `githubAuthenticated = true` but no marker. On load, whenever `githubAuthenticated` is read back as `true`, also write `githubWasAuthenticated = true`. Without this, an existing user gets no banner until their next fresh login.
- **Name** — `githubWasAuthenticated` vs e.g. `githubEverAuthenticated` / `githubSyncPreviouslyEnabled`.

➡️ Recommendation: adopt all five bullets as written. Name: **`githubWasAuthenticated`** — it pairs read-alike with `githubAuthenticated` and the "was" tense states the semantics. Backfill on the `initializeAuthState` path so it is a one-line side effect of restoring the existing flag.

### Answer to Q6

---

## Q7 — The banner-visibility predicate, where it is computed, and whether it can appear mid-session

Proposed predicate: **`!isAuthenticated && githubWasAuthenticated && canInitiateLogin(repoConfig)`**.

- Computed as a `computed` in `HomePageContent.vue`, evaluated after the load `Promise.all` (`initializeAuthState` + `loadRepoConfig` already resolved there).
- Being a `computed`, it also turns **true mid-session** the moment `handleUnauthorized()` flips `isAuthenticated` to `false` after a 401 in `syncOnLoad` or a later proxy call — the banner appears without a reload. Turns false again after a successful reconnect.
- If `githubWasAuthenticated` is true but `canInitiateLogin` is false (user later blanked a field), **no banner** — reconnecting is impossible until the field is fixed, and the settings section already flags the bad field.

➡️ Recommendation: adopt the predicate and the reactive `computed` in `HomePageContent.vue` as written, including the mid-session appearance and the "no banner when `canInitiateLogin` is false" carve-out.

### Answer to Q7

---

## Q8 — Relationship to the existing `authError` line and to `syncError`'s revoked-access message

Three surfaces could describe one lapsed session: the new banner, the in-settings `authError` `<p>`, and the `syncError` amber banner (`ACCESS_REVOKED_MESSAGE`).

Options:

a. **Banner is the single home for "session expired".** It reuses `SESSION_EXPIRED_MESSAGE` verbatim. The in-settings `authError` `<p>` stays as-is (it still fires for the `CALLBACK_ERROR_MESSAGE` failed-login case and is harmless when both show, since the user is looking at either the top of the page or the settings section, not both). `syncError`'s `ACCESS_REVOKED_MESSAGE` path is left untouched — different message, different meaning ("declined re-auth / access revoked"), and it only appears after a sync actually ran.
b. **Consolidate.** Route the 401 path so only the new banner shows; suppress `authError` / `ACCESS_REVOKED_MESSAGE` when the banner is visible.
c. Banner gets its **own new string**, not `SESSION_EXPIRED_MESSAGE`.

➡️ Recommendation: **(a).** Smallest change, no rewiring of `syncError`/`useRemotePreferencesSync`. Reusing `SESSION_EXPIRED_MESSAGE` keeps one canonical "your session expired" sentence. Consolidation (b) touches three composables for a cosmetic dedupe that users will almost never see because the surfaces are in different scroll regions.

### Answer to Q8

---

## Q9 — Banner placement, and whether it is dismissible

Options for **placement**:

a. Inline in `HomePageContent.vue`'s template, as another `<p role="status">` alongside `syncErrorText` / `writeErrorText` / `divergedNotice`.
b. A dedicated `GitHubReconnectNotice.vue` component (message + button), rendered from `HomePageContent.vue`.

Options for **dismissal**:

x. **Not dismissible** — stays until the user reconnects or logs out. Matches the existing `divergedNotice` / `writeSuccess` pattern.
y. Dismissible, reappears on next load.
z. Dismissible, dismissal persisted (never nags again until auth state changes).

➡️ Recommendation: **(b) + (x).** A dedicated component because this notice carries an action (a button), unlike the plain-text notices — and it keeps `HomePageContent.vue`'s template flat. Not dismissible because it only ever shows to someone who *chose* sync before (Q2), the nudge is the point, and a persisted dismissal (z) would let them forget indefinitely while local data drifts.

### Answer to Q9

---

## Q10 — Banner copy and button behaviour

- **Message**: reuse `SESSION_EXPIRED_MESSAGE` — "Votre session GitHub a expiré. Merci de vous reconnecter." (per Q8 recommendation).
- **Button label**: "Se reconnecter à GitHub" (the settings button says "Se connecter avec GitHub"; "reconnecter" better fits this context).
- **Button action**: call the existing `login()` directly. No draft to save first — repo config is already in IndexedDB (that is the gate), and this banner is outside the settings form, so `GitHubSyncSettings.onLogin`'s save-before-navigate step does not apply.
- **Styling**: amber `role="status"` strip, consistent with `divergedNotice`; Tailwind utilities only.

➡️ Recommendation: adopt as written.

### Answer to Q10

---

## Q11 — ADR, or documentation-only?

The github-auth feature README rule "Silent when unauthenticated — no error is shown unless they attempt a sync" gets a narrow carve-out: a previously-authenticated user now sees a reconnect banner on load.

Against the ADR bar: (1) trivially reversible, (2) self-explanatory from the feature doc once written, (3) the real alternative (auto-redirect) is already recorded in Q3 of this grilling.

➡️ Recommendation: **doc-only, no ADR.** Update: the **github-auth feature README** (carve-out to the "silent" rule; add `githubWasAuthenticated` to Implementing Code + Behaviour; note the new banner and that `login()`/OAuth are unchanged); the **CONTEXT.md glossary** (entry for the `githubWasAuthenticated` marker, contrasted with the `githubAuthenticated` UI hint); a one-line pointer from the **preferences-storage README** is not needed. ADR-011 is untouched — the auth mechanism does not change.

### Answer to Q11
