# Test Cases — Issue #64: GitHub Repository Preferences

## Sub-Issue A — GitHub OAuth Login / Logout

*(Rescoped: this sub-issue owns only the login-readiness check, auth-state detection, and the
login/logout actions — not the Settings page or its fields, which are Sub-Issue E's
responsibility. Field-visibility scenarios formerly listed here now live under Sub-Issue E.)*

### A-1: Login-readiness check reports not ready when repo config is incomplete
- **Precondition:** A repo-config draft (`owner/repo`, file path, `revalidate-cache-days`) has at least one value empty or invalid.
- **Action:** Evaluate the login-readiness check against the draft.
- **Expected:** The check reports "not ready".

### A-2: Login-readiness check reports ready when repo config is complete and valid
- **Precondition:** `owner/repo` and file path are non-empty; `revalidate-cache-days` is a positive integer.
- **Action:** Evaluate the login-readiness check against the draft.
- **Expected:** The check reports "ready".

### A-3: Triggering login navigates to the GitHub OAuth start endpoint
- **Precondition:** None.
- **Action:** Trigger the login action.
- **Expected:** The browser navigates to the GitHub OAuth start endpoint. (That endpoint's own redirect to GitHub's authorization page with `client_id`/`scope`/`state` is Sub-Issue F's behavior, covered by F-1.)

### A-4: A successful-callback indicator marks the user authenticated
- **Precondition:** The app loads with a success indicator present in the URL (set by Sub-Issue F's callback function after a completed OAuth exchange, covered by F-2).
- **Action:** The app processes the page load.
- **Expected:** The user is shown as authenticated; no error is present; the success indicator is removed from the URL afterward.

### A-5: Authenticated state persists across a plain reload
- **Precondition:** The user previously completed a successful login in this browser. The URL carries no callback indicator this time.
- **Action:** Reload the page.
- **Expected:** The user remains shown as authenticated.

### A-6: Logout clears the authenticated state without touching station data
- **Precondition:** The user is shown as authenticated.
- **Action:** Trigger the logout action.
- **Expected:** The user is shown as unauthenticated afterward, with no error. Station data and repo config values in IndexedDB are unchanged.

### A-7: Logout clears local authenticated state even if the server-side call fails
- **Precondition:** The user is shown as authenticated; the network request to the logout endpoint fails (e.g. offline).
- **Action:** Trigger the logout action.
- **Expected:** The user is still shown as unauthenticated locally afterward.

### A-8: No prior session and no callback indicator — unauthenticated with no error banner
- **Precondition:** The user has never logged in. The URL carries no success/error indicator.
- **Action:** Load the app.
- **Expected:** The user is shown as unauthenticated. No error is displayed.

### A-9: An error-callback indicator shows a human-readable error
- **Precondition:** The app loads with an error indicator present in the URL (set by Sub-Issue F's callback function after a failed OAuth exchange, covered by F-3).
- **Action:** The app processes the page load.
- **Expected:** The user is shown as unauthenticated. A human-readable error message is displayed. The error indicator is removed from the URL afterward.

### A-10: A 401 from a GitHub API call clears the authenticated state and prompts re-login
*(Verifiable end-to-end once Sub-Issues C/D wire their proxy-calling composable(s) into this hook.)*
- **Precondition:** The user is shown as authenticated; a GitHub API call made through the proxy returns 401 (e.g. the token was revoked).
- **Action:** The calling composable reports the 401 to the auth composable.
- **Expected:** The user is shown as unauthenticated afterward, with a message prompting re-login.

---

## Sub-Issue B — Repo Configuration

### B-1: owner/repo and file path are disabled once authenticated
- **Precondition:** User is authenticated.
- **Action:** Navigate to the Settings page.
- **Expected:** The `owner/repo` and file path inputs are disabled (read-only), showing their saved values. A message instructs the user to log out to change them.

### B-2: Valid repo config saves without validation while unauthenticated
- **Precondition:** User is unauthenticated (never authenticated, or logged out). Inputs contain a valid `owner/repo` and file path.
- **Action:** Fill in the fields and save.
- **Expected:** The values persist to IndexedDB. No server-side validation call is made (no access token exists yet to call the Netlify proxy).

### B-3: Saved config persists across reloads and after login
- **Precondition:** User saved a valid repo config while unauthenticated.
- **Action:** Reload the Settings page, then log in via GitHub.
- **Expected:** The `owner/repo` and file path fields display the previously saved values (loaded from IndexedDB) both before and after login.

### B-4: Invalid repo config shows human-readable error once authenticated
- **Precondition:** User is unauthenticated. `owner/repo` is set to a non-existent value (e.g. `nonexistent-user/nonexistent-repo`) and saved.
- **Action:** Log in via GitHub.
- **Expected:** A human-readable validation error is displayed after login, once the Netlify proxy validates the saved config.

### B-5: Fields become enabled again after logout, retaining their values
- **Precondition:** User has a saved repo config and logs out.
- **Action:** Log out, then navigate to or reload the Settings page.
- **Expected:** The `owner/repo` and file path fields display their previously saved values and are enabled (editable).

---

## Sub-Issue C — Read Preferences from Remote Repo on Load

### C-1: Remote repo not fetched when IndexedDB data is fresh
- **Precondition:** User is authenticated and repo config is present. IndexedDB timestamp is within the `revalidate-cache-days` threshold.
- **Action:** Load the application.
- **Expected:** No request is made to the GitHub API proxy. IndexedDB data is used as-is.

### C-2: Remote repo fetched when IndexedDB data is stale
- **Precondition:** User is authenticated and repo config is present. IndexedDB timestamp is older than `revalidate-cache-days`.
- **Action:** Load the application.
- **Expected:** The app fetches the remote JSON file via the Netlify proxy. IndexedDB is updated with the remote `favoriteStations` and `fuelTypeDefault`. The timestamp is reset to the current date and time.

### C-3: Remote repo not fetched again after fresh load
- **Precondition:** The remote repo was just fetched (timestamp is now current).
- **Action:** Reload the application immediately.
- **Expected:** No request is made to the GitHub API proxy.

### C-4: IndexedDB timestamp resets after adding a station
- **Precondition:** User is authenticated with a saved station list.
- **Action:** Add a station.
- **Expected:** The IndexedDB timestamp is updated to the current date and time.

### C-5: IndexedDB timestamp resets after editing a station
- **Precondition:** User is authenticated with a saved station list.
- **Action:** Edit a station.
- **Expected:** The IndexedDB timestamp is updated to the current date and time.

### C-6: IndexedDB timestamp resets after deleting a station
- **Precondition:** User is authenticated with a saved station list.
- **Action:** Delete a station.
- **Expected:** The IndexedDB timestamp is updated to the current date and time.

### C-7: IndexedDB timestamp resets after changing the fuel type default
- **Precondition:** User is authenticated with a saved station list.
- **Action:** Change the default fuel type.
- **Expected:** The IndexedDB timestamp is updated to the current date and time.

### C-8: Remote fetch failure (404) prompts re-auth
- **Precondition:** User is authenticated. File path points to a non-existent file in the remote repo.
- **Action:** App loads with a stale IndexedDB timestamp and fetches the remote repo.
- **Expected:** An error or re-authentication prompt is shown. IndexedDB data is not modified.

### C-9: Remote fetch failure (401) clears cookie and shows warning
- **Precondition:** User's access token has been revoked.
- **Action:** App loads with a stale IndexedDB timestamp and the proxy returns 401.
- **Expected:** The app prompts re-authentication. If the user refuses, the `gh_token` cookie is cleared and a warning banner states that GitHub access was revoked, noting that IndexedDB data is being used.

### C-10: Remote file with a null or empty-string default fuel type is accepted
- **Precondition:** User is authenticated, repo config is present, IndexedDB is stale. The remote file has `favoriteStations` with at least one valid station and `fuelTypeDefault` set to `null` or `""`.
- **Action:** Load the application.
- **Expected:** IndexedDB's default fuel type is cleared/empty and its station list is replaced with the remote stations. No error is shown. The timestamp resets to now.

### C-11: Remote file with an empty station list is accepted
- **Precondition:** User is authenticated, repo config is present, IndexedDB is stale. The remote file has `favoriteStations: []` and a valid string `fuelTypeDefault`.
- **Action:** Load the application.
- **Expected:** IndexedDB's station list is replaced with an empty list and its default fuel type is updated to the remote value. No error is shown. The timestamp resets to now.

### C-12: Remote file missing a required key is rejected as invalid content
- **Precondition:** User is authenticated, repo config is present, IndexedDB is stale. The remote file has only one of `fuelTypeDefault` / `favoriteStations` — the other key is entirely absent.
- **Action:** Load the application.
- **Expected:** IndexedDB is left unchanged. A message distinct from the re-authentication prompt (C-8/C-9) states the remote file's content is invalid. The timestamp is not reset.

### C-13: Remote file with a wrong-type default fuel value is rejected as invalid content
- **Precondition:** User is authenticated, repo config is present, IndexedDB is stale. The remote file's `fuelTypeDefault` is present but is neither `null` nor a string (e.g. a number).
- **Action:** Load the application.
- **Expected:** Same as C-12 — IndexedDB is left unchanged, the invalid-content message is shown, the timestamp is not reset.

### C-14: Remote file with one malformed station entry is rejected as invalid content
- **Precondition:** User is authenticated, repo config is present, IndexedDB is stale. The remote file's `favoriteStations` array contains one entry failing station validation (e.g. missing `name`, or a `url` outside the allowed domain), alongside otherwise-valid entries.
- **Action:** Load the application.
- **Expected:** The whole file is rejected, not just the malformed entry (partial acceptance is out of scope — tracked in issue #105). IndexedDB is left unchanged, the invalid-content message is shown, the timestamp is not reset.

### C-15: The invalid-content message is distinct from the re-authentication prompt
- **Precondition:** One scenario from C-12/C-13/C-14 (malformed remote content) and one scenario from C-8/C-9 (fetch failure) have both been observed.
- **Action:** Compare the message shown in each case.
- **Expected:** The messages differ. The malformed-content message does not ask the user to reconnect or re-authenticate.

### C-16: No stations anywhere shows an empty-state invitation, not example stations
- **Precondition:** IndexedDB has no stations and no sync timestamp. The user is unauthenticated, or repo config is incomplete, or the remote file has an empty `favoriteStations` list.
- **Action:** Load the application.
- **Expected:** Every view that displays the station list (the price table area and the Station Manager) shows "Aucune station pour le moment" and invites the user to add one via the Station Manager. No hardcoded example stations appear anywhere. No error banner accompanies the message.

### C-17: Every view reflects the same station list once a sync completes
- **Precondition:** User is authenticated, repo config is present, IndexedDB is stale or empty, and the remote file has one or more stations.
- **Action:** Load the application and wait for the sync to complete.
- **Expected:** Every view that displays the station list (the price table area and the Station Manager) shows the same, remote-sourced list. No view is left showing the empty state, or a different or stale list, once the sync has completed.

### C-18: No view shows a stale list before the sync outcome is known
- **Precondition:** User is authenticated, repo config is present, and IndexedDB holds a station list from a previous session that differs from what the remote file currently contains; IndexedDB is stale.
- **Action:** Load the application, observing every view that displays the station list from first paint through sync completion.
- **Expected:** No view displays the previous/local station list at any point before the sync outcome is known. Each such view shows either a neutral loading state or nothing until the final, synced list is ready, then shows that final list directly.

### C-19: A hung remote sync fetch does not block the app indefinitely
- **Precondition:** User is authenticated, repo config is present, IndexedDB is stale. The request to the GitHub API proxy never resolves (simulated hang).
- **Action:** Load the application and wait.
- **Expected:** After a bounded wait, the app stops waiting for the remote fetch and falls back to displaying the local IndexedDB state (or the empty state, per C-16, if none exists) instead of hanging indefinitely — the station list becomes visible and interactive.

---

## Sub-Issue D — Write Preferences to Remote Repo on Update

### D-1: Diff dialog shown before write — add station
- **Precondition:** User is authenticated and repo config is present. Remote file exists.
- **Action:** Add a station.
- **Expected:** A diff dialog appears showing the before (remote) and after (updated) JSON content. The write is not performed until the user confirms.

### D-2: Diff dialog shown before write — edit station
- **Precondition:** User is authenticated and repo config is present. Remote file exists.
- **Action:** Edit an existing station.
- **Expected:** A diff dialog appears showing the before (remote) and after (updated) JSON content. The write is not performed until the user confirms.

### D-3: Confirmed write updates the remote file — add station
- **Precondition:** Diff dialog is shown after adding a station.
- **Action:** User confirms the diff dialog.
- **Expected:** The GitHub Contents API `PUT` is called with the correct `sha`. The remote file is updated. A success indicator appears.

### D-4: Confirmed write updates the remote file — edit station
- **Precondition:** Diff dialog is shown after editing a station.
- **Action:** User confirms the diff dialog.
- **Expected:** The GitHub Contents API `PUT` is called with the correct `sha`. The remote file is updated. A success indicator appears.

### D-5: Cancelled write leaves remote file unchanged, shows divergence notice
- **Precondition:** Diff dialog is shown (remote file exists).
- **Action:** User cancels the diff dialog.
- **Expected:** No write is sent to the remote repo. IndexedDB retains the local update. A persistent notice states that local data differs from the remote file; it remains visible until the next successful write.

### D-6: First-time write creates the remote file directly, no diff dialog
- **Precondition:** User is authenticated and repo config is present. No remote file exists yet.
- **Action:** Add a station (triggering the first write).
- **Expected:** No diff dialog appears. The file is created directly in the remote repo, containing the new station data.

### D-7: Stale sha (409 conflict) shows conflict error
- **Precondition:** The remote file's SHA has been advanced by a concurrent edit (simulated by editing the file directly on GitHub before confirming the write from the app).
- **Action:** User confirms the diff dialog.
- **Expected:** A conflict error is displayed instructing the user to refresh and retry. IndexedDB retains the local update.

### D-8: Remote write failure shows non-blocking error, IndexedDB retained
- **Precondition:** The OAuth token has been revoked before the write is confirmed.
- **Action:** User confirms the diff dialog.
- **Expected:** A non-blocking error notification is shown. IndexedDB still contains the updated data. The write is not retried automatically.

### D-9: Written JSON never includes repo configuration
- **Precondition:** User confirms a write after adding a station.
- **Action:** Inspect the JSON written to the remote repo.
- **Expected:** The file contains only `favoriteStations` and `fuelTypeDefault` keys. It never includes `owner`, `repo`, or `revalidateCacheDays`.

---

## Sub-Issue E — Settings UI for Repo Config and Cache Parameter

### E-1: revalidate-cache-days field accepts valid positive integer
- **Precondition:** None — `revalidate-cache-days` is editable regardless of authentication state.
- **Action:** Enter `7` in the `revalidate-cache-days` input and save.
- **Expected:** The value saves successfully. No validation error is shown.

### E-2: revalidate-cache-days field rejects zero
- **Precondition:** None — `revalidate-cache-days` is editable regardless of authentication state.
- **Action:** Enter `0` in the `revalidate-cache-days` input and attempt to save.
- **Expected:** An inline validation error appears. The form cannot be submitted.

### E-3: revalidate-cache-days field rejects negative numbers
- **Precondition:** None — `revalidate-cache-days` is editable regardless of authentication state.
- **Action:** Enter `-3` in the `revalidate-cache-days` input and attempt to save.
- **Expected:** An inline validation error appears. The form cannot be submitted.

### E-4: All GitHub Sync fields enabled when unauthenticated
- **Precondition:** No `gh_token` cookie is set.
- **Action:** Navigate to the Settings page.
- **Expected:** The `owner/repo`, file path, and `revalidate-cache-days` fields are all enabled.

### E-5: Owner, Repo, and file path GitHub Sync fields disabled after login
- **Precondition:** User completes the OAuth login flow.
- **Action:** Navigate to (or reload) the Settings page.
- **Expected:** `owner/repo` and file path fields are disabled (read-only), showing their saved values. `revalidate-cache-days` remains enabled.

### E-6: Owner, Repo, and file path fields re-enabled after logout
- **Precondition:** User is authenticated; `owner/repo` and file path are disabled.
- **Action:** Click "Logout".
- **Expected:** `owner/repo` and file path fields become enabled again, retaining their values. `revalidate-cache-days` remains enabled throughout (it was never disabled).

### E-7: Login button reflects the login-readiness check
- **Precondition:** User is unauthenticated on the Settings page. `owner/repo` and file path are filled in; `revalidate-cache-days` is empty.
- **Action:** Observe the "Login with GitHub" button, then fill in a valid positive integer for `revalidate-cache-days`.
- **Expected:** The button is disabled while any field is empty or invalid, and becomes enabled once `owner/repo`, file path, and `revalidate-cache-days` are all filled in and valid (Sub-Issue A's login-readiness check).

---

## Sub-Issue F — Netlify Functions for OAuth and GitHub API Proxy

### F-1: github-auth-start redirects to GitHub authorization URL
- **Precondition:** `GITHUB_CLIENT_ID` environment variable is set.
- **Action:** GET `/.netlify/functions/github-auth-start`.
- **Expected:** Response is a 302 redirect to `github.com/login/oauth/authorize` with `client_id`, `scope=repo`, and a `state` parameter.

### F-2: github-auth-callback exchanges code for token and sets cookie
- **Precondition:** Valid `code` and matching `state` are present in the callback query string. `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` are set.
- **Action:** GET `/.netlify/functions/github-auth-callback?code=...&state=...`.
- **Expected:** The function calls GitHub's token endpoint server-side. Response is a 302 to `/settings?auth=success` with `Set-Cookie: gh_token=...; HttpOnly; SameSite=Strict; Max-Age=28800`. The token value does NOT appear in the redirect URL or response body.

### F-3: github-auth-callback with error parameter redirects to error state
- **Precondition:** Callback URL contains `error=access_denied`.
- **Action:** GET `/.netlify/functions/github-auth-callback?error=access_denied`.
- **Expected:** Response is a 302 to `/settings?auth=error`. No cookie is set.

### F-4: github-api-proxy forwards owner/repo/path unchanged to GitHub
- **Precondition:** User is authenticated. The request specifies an `owner/repo` and file `path`.
- **Action:** Call the proxy with a given `owner/repo`/`path`.
- **Expected:** The GitHub Contents API call the proxy issues targets exactly that `owner/repo`/`path` — no substitution, inference, or override occurs before forwarding. (No mismatch check exists server-side; GitHub's own OAuth token scope is the authorization boundary, per `security-guidelines.md` rule 4.)

### F-5: github-api-proxy does not expose the access token in the response
- **Precondition:** User is authenticated.
- **Action:** Trigger any proxied GitHub API call (e.g. read file).
- **Expected:** The response body and headers do not contain the raw `gh_token` value or `GITHUB_CLIENT_SECRET`.

### F-6: Client Secret is never present in any response body or redirect URL
- **Precondition:** App is running with valid environment variables.
- **Action:** Trigger both the OAuth start and callback flows; inspect all HTTP responses.
- **Expected:** `GITHUB_CLIENT_SECRET` value does not appear in any response body, redirect URL, or observable log output.

### F-7: Logout Netlify function clears the gh_token cookie
- **Precondition:** `gh_token` cookie is present and valid.
- **Action:** Call the logout Netlify function (e.g. via the Settings page "Logout" control).
- **Expected:** The response clears the `gh_token` cookie (e.g. `Set-Cookie` with `Max-Age=0` or an expired date). No error occurs even if the cookie was already absent.

status: ready
