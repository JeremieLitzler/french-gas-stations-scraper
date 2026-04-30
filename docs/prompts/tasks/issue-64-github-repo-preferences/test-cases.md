# Test Cases — Issue #64: GitHub Repository Preferences

## Sub-Issue A — GitHub OAuth Login / Logout

### A-1: Login button visible when unauthenticated
- **Precondition:** No `gh_token` cookie is set.
- **Action:** Navigate to the Settings page.
- **Expected:** A "Login with GitHub" button is visible. All GitHub Sync fields (`owner/repo`, file path, `revalidate-cache-days`) are disabled/greyed out.

### A-2: Login flow redirects to GitHub authorization page
- **Precondition:** No `gh_token` cookie is set.
- **Action:** Click "Login with GitHub" on the Settings page.
- **Expected:** The browser redirects to GitHub's OAuth authorization URL (`github.com/login/oauth/authorize`), including the `client_id`, `scope`, and `state` query parameters.

### A-3: Successful OAuth callback sets cookie and redirects to Settings
- **Precondition:** The user completes GitHub authorization (code returned by GitHub).
- **Action:** The `github-auth-callback` Netlify function receives the `code` and valid `state` parameter.
- **Expected:** The function exchanges the code for a token, sets the `gh_token` cookie (`HttpOnly`, `SameSite=Strict`, `Max-Age=28800`), and redirects to `/settings?auth=success`. The Settings page shows an authenticated state.

### A-4: Authenticated state persists across page reloads
- **Precondition:** `gh_token` cookie is present and valid.
- **Action:** Reload the Settings page.
- **Expected:** The user remains authenticated. GitHub Sync fields are enabled.

### A-5: Logout clears authentication state and disables fields
- **Precondition:** User is authenticated (`gh_token` cookie present).
- **Action:** Click "Logout".
- **Expected:** The `gh_token` cookie is cleared. All GitHub Sync fields become disabled. Station data in IndexedDB is unchanged.

### A-6: Absent or expired cookie — unauthenticated state with no error banner
- **Precondition:** The `gh_token` cookie is absent or expired.
- **Action:** Navigate to the Settings page without performing any sync action.
- **Expected:** The user is shown as unauthenticated. No error banner is displayed.

### A-7: OAuth callback with error parameter shows error in UI
- **Precondition:** GitHub returns `error=access_denied` in the callback URL.
- **Action:** The `github-auth-callback` function receives the error parameter.
- **Expected:** The function redirects to `/settings?auth=error`. The Settings page displays a human-readable error message. No cookie is set.

### A-8: state parameter mismatch in OAuth callback is rejected
- **Precondition:** The `state` parameter in the callback does not match the one generated at login start.
- **Action:** The `github-auth-callback` function receives a mismatched `state`.
- **Expected:** The function does not exchange the code for a token. The response is an error redirect (or equivalent failure). No cookie is set.

### A-9: Token expiry detected on GitHub API call
- **Precondition:** User has a `gh_token` cookie that has been revoked on GitHub's side (simulated by revoking in GitHub OAuth settings).
- **Action:** User triggers any action that calls the GitHub API proxy.
- **Expected:** The proxy receives a 401 from GitHub, clears the `gh_token` cookie, and the UI prompts the user to log in again.

---

## Sub-Issue B — Repo Configuration

### B-1: owner/repo and file path inputs are enabled when authenticated
- **Precondition:** User is authenticated.
- **Action:** Navigate to the Settings page.
- **Expected:** The `owner/repo` and file path inputs are enabled and editable.

### B-2: Valid repo config saves successfully
- **Precondition:** User is authenticated. Inputs contain a valid `owner/repo` and file path pointing to an accessible repository.
- **Action:** Click Save.
- **Expected:** A success message appears. No error is shown. The values are persisted in IndexedDB and reloaded on next page visit.

### B-3: Saved config persists across reloads
- **Precondition:** User has saved a valid repo config.
- **Action:** Reload the Settings page.
- **Expected:** The `owner/repo` and file path fields display the previously saved values.

### B-4: Invalid repo config shows human-readable error
- **Precondition:** User is authenticated. Inputs contain a non-existent `owner/repo`.
- **Action:** Click Save.
- **Expected:** A human-readable error message is displayed. No success message appears.

### B-5: Fields are empty and disabled after logout
- **Precondition:** User has a saved repo config and logs out.
- **Action:** Log out, then navigate to or reload the Settings page.
- **Expected:** The `owner/repo` and file path fields are empty (cleared from the UI) and disabled.

---

## Sub-Issue C — Read Preferences from Remote Repo on Load

### C-1: Remote repo not fetched when IndexedDB data is fresh
- **Precondition:** User is authenticated and repo config is present. IndexedDB timestamp is within the `revalidate-cache-days` threshold.
- **Action:** Load the application.
- **Expected:** No request is made to the GitHub API proxy. IndexedDB data is used as-is.

### C-2: Remote repo fetched when IndexedDB data is stale
- **Precondition:** User is authenticated and repo config is present. IndexedDB timestamp is older than `revalidate-cache-days`.
- **Action:** Load the application.
- **Expected:** The app fetches the remote JSON file via the Netlify proxy. IndexedDB is updated with the remote data. The timestamp is reset to the current date and time.

### C-3: Remote repo not fetched again after fresh load
- **Precondition:** The remote repo was just fetched (timestamp is now current).
- **Action:** Reload the application immediately.
- **Expected:** No request is made to the GitHub API proxy.

### C-4: IndexedDB timestamp resets after user-triggered update
- **Precondition:** User is authenticated with a saved station list.
- **Action:** Add, edit, or delete a station, or change the fuel type default.
- **Expected:** The IndexedDB timestamp is updated to the current date and time.

### C-5: settings section from remote file overrides local settings
- **Precondition:** The remote JSON file contains a `settings` section with `revalidateCacheDays` different from the locally stored value.
- **Action:** A stale-triggered remote fetch completes successfully.
- **Expected:** The `revalidateCacheDays` value in IndexedDB is updated to match the remote value.

### C-6: Remote fetch failure (404) prompts re-auth
- **Precondition:** User is authenticated. File path points to a non-existent file in the remote repo.
- **Action:** App loads with a stale IndexedDB timestamp and fetches the remote repo.
- **Expected:** An error or re-authentication prompt is shown. IndexedDB data is not modified.

### C-7: Remote fetch failure (401) clears cookie and shows warning
- **Precondition:** User's access token has been revoked.
- **Action:** App loads with a stale IndexedDB timestamp and the proxy returns 401.
- **Expected:** The app prompts re-authentication. If the user refuses, the `gh_token` cookie is cleared and a warning banner states that GitHub access was revoked, noting that IndexedDB data is being used.

---

## Sub-Issue D — Write Preferences to Remote Repo on Update

### D-1: Diff dialog shown before write
- **Precondition:** User is authenticated and repo config is present. Remote file exists.
- **Action:** Add or edit a station.
- **Expected:** A diff dialog appears showing the before (remote) and after (updated) JSON content. The write is not performed until the user confirms.

### D-2: Confirmed write updates the remote file
- **Precondition:** Diff dialog is shown.
- **Action:** User confirms the diff dialog.
- **Expected:** The GitHub Contents API `PUT` is called with the correct `sha`. The remote file is updated. A success indicator appears.

### D-3: Cancelled write leaves remote file unchanged, IndexedDB updated
- **Precondition:** Diff dialog is shown.
- **Action:** User cancels the diff dialog.
- **Expected:** No write is sent to the remote repo. IndexedDB retains the local update.

### D-4: Write to non-existent remote file shows empty diff baseline
- **Precondition:** User is authenticated and repo config is present. No remote file exists yet.
- **Action:** Add a station (triggering the first write).
- **Expected:** The diff dialog shows an empty baseline (no existing content) versus the new JSON. On confirm, the file is created in the remote repo.

### D-5: Stale sha (409 conflict) shows conflict error
- **Precondition:** The remote file's SHA has been advanced by a concurrent edit (simulated by editing the file directly on GitHub before confirming the write from the app).
- **Action:** User confirms the diff dialog.
- **Expected:** A conflict error is displayed instructing the user to refresh and retry. IndexedDB retains the local update.

### D-6: Remote write failure shows non-blocking error, IndexedDB retained
- **Precondition:** The OAuth token has been revoked before the write is confirmed.
- **Action:** User confirms the diff dialog.
- **Expected:** A non-blocking error notification is shown. IndexedDB still contains the updated data. The write is not retried automatically.

### D-7: Written JSON always includes settings section
- **Precondition:** User confirms a write after adding a station.
- **Action:** Inspect the JSON written to the remote repo.
- **Expected:** The file contains `settings`, `stations`, and `defaultFuel` keys. The `settings` section reflects the current `owner`, `repo`, and `revalidateCacheDays` values.

---

## Sub-Issue E — Settings UI for Repo Config and Cache Parameter

### E-1: revalidate-cache-days field accepts valid positive integer
- **Precondition:** User is authenticated.
- **Action:** Enter `7` in the `revalidate-cache-days` input and save.
- **Expected:** The value saves successfully. No validation error is shown.

### E-2: revalidate-cache-days field rejects zero
- **Precondition:** User is authenticated.
- **Action:** Enter `0` in the `revalidate-cache-days` input and attempt to save.
- **Expected:** An inline validation error appears. The form cannot be submitted.

### E-3: revalidate-cache-days field rejects negative numbers
- **Precondition:** User is authenticated.
- **Action:** Enter `-3` in the `revalidate-cache-days` input and attempt to save.
- **Expected:** An inline validation error appears. The form cannot be submitted.

### E-4: All GitHub Sync fields disabled when unauthenticated
- **Precondition:** No `gh_token` cookie is set.
- **Action:** Navigate to the Settings page.
- **Expected:** The `owner/repo`, file path, and `revalidate-cache-days` fields are all disabled/greyed out.

### E-5: All GitHub Sync fields enabled after login
- **Precondition:** User completes the OAuth login flow.
- **Action:** Navigate to (or reload) the Settings page.
- **Expected:** All three fields (`owner/repo`, file path, `revalidate-cache-days`) are enabled and editable.

### E-6: All GitHub Sync fields disabled after logout
- **Precondition:** User is authenticated and all fields are enabled.
- **Action:** Click "Logout".
- **Expected:** All three fields become disabled again.

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

status: ready
