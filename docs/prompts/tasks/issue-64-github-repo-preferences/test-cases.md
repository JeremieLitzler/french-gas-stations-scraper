# Test Cases — Issue #64: GitHub Repository Preferences

## Sub-Issue A — GitHub OAuth Login / Logout

### A-1: Fields enabled and login button disabled on first visit
- **Precondition:** No `gh_token` cookie is set. `owner/repo`, file path, and `revalidate-cache-days` are empty.
- **Action:** Navigate to the Settings page.
- **Expected:** The `owner/repo`, file path, and `revalidate-cache-days` fields are enabled and empty. A "Login with GitHub" button is visible but disabled.

### A-2: Login button stays disabled until all config fields are filled in
- **Precondition:** No `gh_token` cookie is set. `owner/repo` and file path are filled in; `revalidate-cache-days` is empty.
- **Action:** Observe the "Login with GitHub" button.
- **Expected:** The button remains disabled.

### A-3: Login flow redirects to GitHub authorization page
- **Precondition:** No `gh_token` cookie is set. `owner/repo`, file path, and `revalidate-cache-days` are all filled in, enabling the "Login with GitHub" button.
- **Action:** Click "Login with GitHub" on the Settings page.
- **Expected:** The browser redirects to GitHub's OAuth authorization URL (`github.com/login/oauth/authorize`), including the `client_id`, `scope`, and `state` query parameters.

### A-4: Successful OAuth callback sets cookie and redirects to Settings
*(Manual/integration test — exercises the `github-auth-callback` Netlify function via a real OAuth redirect; not verifiable in a Vitest unit test.)*
- **Precondition:** The user completes GitHub authorization (code returned by GitHub).
- **Action:** The `github-auth-callback` Netlify function receives the `code` and valid `state` parameter.
- **Expected:** The function exchanges the code for a token, sets the `gh_token` cookie (`HttpOnly`, `SameSite=Strict`, `Max-Age=28800`), and redirects to `/settings?auth=success`. The Settings page shows an authenticated state.

### A-5: Authenticated state persists across page reloads
- **Precondition:** `gh_token` cookie is present and valid.
- **Action:** Reload the Settings page.
- **Expected:** The user remains authenticated. `owner/repo` and file path fields are disabled (read-only), showing their saved values. `revalidate-cache-days` remains enabled.

### A-6: Logout clears the cookie and re-enables config fields
- **Precondition:** User is authenticated (`gh_token` cookie present); `owner/repo` and file path are disabled and show saved values.
- **Action:** Click "Logout".
- **Expected:** The `gh_token` cookie is cleared. `owner/repo` and file path fields become enabled again, still showing their previous values. Station data in IndexedDB is unchanged.

### A-7: Absent or expired cookie — unauthenticated state with no error banner
*(Manual test — requires deleting/expiring a browser cookie.)*
- **Precondition:** The `gh_token` cookie is absent or expired.
- **Action:** Navigate to the Settings page without performing any sync action.
- **Expected:** The user is shown as unauthenticated. No error banner is displayed. Config fields are enabled.

### A-8: OAuth callback with error parameter shows error in UI
- **Precondition:** GitHub returns `error=access_denied` in the callback URL.
- **Action:** The `github-auth-callback` function receives the error parameter.
- **Expected:** The function redirects to `/settings?auth=error`. The Settings page displays a human-readable error message. No cookie is set.

### A-9: state parameter mismatch in OAuth callback is rejected
- **Precondition:** The `state` parameter in the callback does not match the one generated at login start.
- **Action:** The `github-auth-callback` function receives a mismatched `state`.
- **Expected:** The function does not exchange the code for a token. The response is an error redirect (or equivalent failure). No cookie is set.

### A-10: Token expiry detected on GitHub API call
- **Precondition:** User has a `gh_token` cookie that has been revoked on GitHub's side (simulated by revoking in GitHub OAuth settings).
- **Action:** User triggers any action that calls the GitHub API proxy.
- **Expected:** The proxy receives a 401 from GitHub, clears the `gh_token` cookie, and the UI prompts the user to log in again.

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
- **Expected:** The app fetches the remote JSON file via the Netlify proxy. IndexedDB is updated with the remote `stations` and `defaultFuel`. The timestamp is reset to the current date and time.

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
- **Expected:** The file contains only `stations` and `defaultFuel` keys. It never includes `owner`, `repo`, or `revalidateCacheDays`.

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

### F-4: github-api-proxy rejects request for mismatched owner/repo
- **Precondition:** User is authenticated. Request targets an `owner/repo` different from the one stored in config.
- **Action:** Call the proxy with a different `owner/repo`.
- **Expected:** The proxy returns an error (4xx) without forwarding the request to GitHub.

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
