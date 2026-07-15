# Business Specifications — Issue #64: GitHub Repository Preferences

## Goal and Scope

Allow a user to persist and synchronize their station list and fuel type default to a GitHub repository they own, using GitHub OAuth App authentication. The repository acts as a remote database. IndexedDB remains the primary runtime store; the remote repo is the durable backup and sync source.

This issue is split into sub-issues. Each section below corresponds to one sub-issue.

## Architecture decisions already resolved (do not re-ask)

- OAuth type: GitHub OAuth App (not GitHub App)
- OAuth callback: Netlify function exchanges the code for a token (Client Secret stays server-side)
- Token storage: HTTP-only cookie
- Repo config: `owner/repo` field + file path field (separate form inputs)
- Data format: same JSON structure as the static export/import feature

## Sub-Issue A — GitHub OAuth Login / Logout

**Depends on:** nothing

### Rules

1. The user can initiate a GitHub OAuth login flow from the Settings page once `owner/repo`, file path, and `revalidate-cache-days` are all filled in — the "Login with GitHub" button stays disabled until then (see Sub-Issue B). On success, an HTTP-only cookie containing the access token is set by the Netlify function that handles the OAuth callback.
2. The login flow uses the GitHub OAuth App authorization URL. The app requests only the minimum scopes needed to read and write a single file in one user-owned repository (`repo` scope or `public_repo` if the target repo is always public — see sub-issue B).
3. After the callback, the user is redirected back to the Settings page with a visible success or error state.
4. The user can log out; logout clears the HTTP-only cookie only — it does not disconnect the account from GitHub or touch stored data. The repo config (`owner/repo`, file path, `revalidate-cache-days`) and station data both remain in IndexedDB and in the Settings UI; the config fields become editable again (see Sub-Issue E).
5. If the cookie is absent or expired when the app loads, the user is treated as unauthenticated; no error is shown unless they attempt a sync, add, update or delete action.
6. The HTTP-only cookie has a lifetime of **8 hours** (matching a typical browser session). After expiry, the user must re-authenticate. The cookie is not refreshed automatically; expiry is detected on the next GitHub API call returning 401.

### Edge cases integrated

- If the OAuth callback receives an error parameter from GitHub, the Netlify function returns a redirect to Settings with an error query param; the UI displays it.
- Token expiry is detected when a GitHub API call returns 401; the app clears the cookie and prompts the user to log in again.

### How to test locally

1. Start the app with `netlify dev` so Netlify Functions are available.
2. Navigate to the Settings page; confirm a "Login with GitHub" button is visible but disabled, and the `owner/repo`, file path, and `revalidate-cache-days` fields are enabled and empty.
3. Fill in `owner/repo`, file path, and `revalidate-cache-days`; confirm "Login with GitHub" becomes enabled, then click it; confirm the browser redirects to GitHub's OAuth authorization page.
4. Authorize the app on GitHub; confirm the browser is redirected back to the Settings page with a success indicator and the `owner/repo`/file path fields are now disabled (read-only) while `revalidate-cache-days` stays editable.
5. Reload the page; confirm the user remains logged in (cookie persists across reloads) and the fields keep their disabled/enabled states.
6. Click "Logout"; confirm the `owner/repo`/file path fields become enabled again (still holding their previous values) and no token cookie is present (inspect cookies in DevTools → Application → Cookies).
7. To simulate an expired/absent cookie: delete the cookie in DevTools, reload the page, and confirm the user is treated as unauthenticated with no error banner and the config fields are enabled.

#### Going live

1. In the Netlify dashboard → Site settings → Environment variables, set `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` to the values from your GitHub OAuth App (see "GitHub OAuth App setup" in Sub-Issue F).
2. Update the Authorization callback URL in your GitHub OAuth App settings (github.com → Settings → Developer settings → OAuth Apps → your app) to point to the production domain: `https://<your-netlify-site>.netlify.app/.netlify/functions/github-auth-callback` (or your custom domain if configured).
3. Re-deploy the Netlify site so it picks up the new environment variables.
4. Verify the OAuth flow end-to-end on HTTPS: confirm the `gh_token` cookie is set with `HttpOnly` and `Secure` attributes (DevTools → Application → Cookies; `Secure` is automatically enforced on HTTPS).
5. Confirm the `SameSite=Strict` attribute is visible in the cookie inspector — this prevents CSRF on the production domain.

## Sub-Issue B — Repo Configuration

**Depends on:** nothing — `owner/repo`, file path, and `revalidate-cache-days` must be enterable before login, since they gate the "Login with GitHub" button (Sub-Issue A, rule 1)

### Rules

1. The Settings page exposes three inputs — `owner/repo` (e.g. `alice/my-stations`), file path (e.g. `stations.json`), and `revalidate-cache-days` — editable regardless of authentication state, and all three required before login can be initiated.
2. Saving always persists the configuration to IndexedDB. Server-side validation (confirming the file path exists or the repo is reachable via the Netlify proxy) requires an access token, so it only runs once the user is authenticated; while unauthenticated, values save without validation. If validation fails, a human-readable error is shown.
3. Once authenticated, `owner/repo` and file path become read-only; changing them requires logging out first (Sub-Issue A, rule 4). `revalidate-cache-days` remains editable at all times. For users who have never authenticated, all three fields are empty; a previously-authenticated, now logged-out user sees them prefilled from IndexedDB.
4. The scope requested during OAuth must cover private repositories if the user configures a private repo (`repo` scope); private vs. public is not pre-validated — the first authenticated sync attempt reveals access issues.

### How to test locally

1. Start the app with `netlify dev`. While unauthenticated, enter a valid `owner/repo` (e.g. your own GitHub username and a test repo), a file path (e.g. `stations.json`), and a `revalidate-cache-days` value; confirm they save to IndexedDB without a validation call.
2. Log in via GitHub (see Sub-Issue A); confirm the saved values persist and `owner/repo`/file path are now read-only.
3. Reload the page; confirm the `owner/repo` and file path fields still show the saved values (loaded from IndexedDB) and remain read-only.
4. Log out, change `owner/repo` to an invalid value (e.g. `nonexistent-user/nonexistent-repo`), then log back in; confirm a human-readable validation error is displayed post-login.
5. Log out; confirm the `owner/repo` and file path fields become editable again, still showing their previous values.

#### Going live

1. No additional environment variables are needed beyond those set for Sub-Issue A.
2. Use your production GitHub username and a real repository you own as the `owner/repo` value during first-time setup on the production site.
3. After saving the repo config, verify the Netlify proxy function successfully validates the repository by checking that no error message appears in the Settings UI.
4. Confirm the config persists across browser sessions by closing and reopening the production site.

## Sub-Issue C — Read Preferences from Remote Repo on Load

**Depends on:** Sub-Issues A, B

### Rules

1. On application load, if the user is authenticated and repo config is present, the app compares the age of the IndexedDB data against the configurable `revalidate-cache-days` parameter (default: 7 days, editable from Settings UI).
2. If IndexedDB data is younger than the threshold, the remote repo is not consulted; IndexedDB is used as-is.
3. If IndexedDB data is older than the threshold (or absent), the app fetches the JSON file from the remote repo via a Netlify proxy function and merges its `stations` and `defaultFuel` into IndexedDB, replacing the existing data. The remote file never carries `owner`, `repo`, or `revalidateCacheDays` — those stay exclusively in IndexedDB (Sub-Issue B).
4. After a successful remote read, the IndexedDB timestamp is updated to the current date and time.
5. Each user-triggered update (add/edit/delete station, change fuel default) also resets the timestamp.

### Edge cases integrated

- If the remote fetch fails (network error, 404, 401), the app asks the user to reauthenticate.
- If access is revoked (401 on any call), the app asks the user to reauthenticate. If he refuses, the cookie is cleared, the warning banner states that GitHub access was revoked and IndexedDB data is being used.

### How to test locally

1. Start the app with `netlify dev`, log in and configure a valid repo (Sub-Issues A, B).
2. Manually set the IndexedDB timestamp to more than `revalidate-cache-days` days ago (use DevTools → Application → IndexedDB to edit the stored value).
3. Reload the page; confirm the app fetches from the remote repo and updates IndexedDB (check the timestamp resets to today in DevTools).
4. Reload again immediately; confirm the remote repo is NOT fetched a second time (timestamp is fresh).
5. Add a station via the UI; confirm the IndexedDB timestamp resets.
6. Simulate a 404 by setting the file path to a non-existent file and waiting for the cache threshold; reload and confirm an error/re-auth prompt appears.

#### Going live

1. Ensure the remote JSON file exists in the configured GitHub repository before the first production load (or trigger a write from Sub-Issue D to create it).
2. On the production site, verify that the initial load fetches from the remote repo when the IndexedDB data is absent or stale, and that the timestamp is updated correctly.
3. If users report the remote fetch triggering too often or too rarely, adjust `revalidate-cache-days` in Settings to match the desired sync frequency.

## Sub-Issue D — Write Preferences to Remote Repo on Update

**Depends on:** Sub-Issues A, B, C

### Rules

1. Whenever the user saves a change to their station list or fuel type default, the updated data is first written to IndexedDB, then a write request is sent to the remote repo via Netlify function.
2. If the remote file already exists, its current content is fetched and a diff is presented to the user (reusing the diff UI implemented in issue #63); the user must confirm before the write is committed. If the remote file does not yet exist, it is created directly with no diff or confirmation step.
3. The write uses the GitHub Contents API `PUT /repos/{owner}/{repo}/contents/{path}` with the file's current `sha` to avoid overwrite conflicts.
4. If the remote write fails, IndexedDB retains the update and a non-blocking error is shown; the write is not retried automatically.
5. The JSON written to the remote repo always contains only `stations` and `defaultFuel` — never `owner`, `repo`, or `revalidateCacheDays`.
6. If the user cancels the diff dialog, no write is sent; a persistent notice states that local data differs from the remote file, shown until the next successful write.

### Edge cases integrated

- If the `sha` is stale (concurrent edit from another device), the Netlify function receives a 409; the app shows a conflict error and asks the user to refresh and retry.

### How to test locally

1. Start the app with `netlify dev`, log in, configure a valid repo, and ensure a remote file exists (or is absent for the "new file" path).
2. Add or edit a station via the UI; confirm a diff dialog appears showing the before/after JSON.
3. Confirm the write; verify the remote file in GitHub now contains the updated station data (check via GitHub UI or `gh api`).
4. Cancel the diff dialog; confirm the remote file is unchanged but IndexedDB retains the local update.
5. Simulate a 409 by editing the remote file directly in GitHub (to advance its SHA) and then confirming a write from the app; confirm a conflict error is displayed.
6. Simulate a write failure (e.g. revoke the OAuth token in GitHub settings, then trigger a write); confirm a non-blocking error appears and IndexedDB still has the updated data.

#### Going live

1. On the production site, perform a real station add or edit and confirm the write to GitHub completes successfully (verify the commit appears in the GitHub repository history).
2. Verify the diff dialog renders correctly on the production domain before the user confirms the write.
3. If a 409 conflict occurs in production (e.g. the user edited the file directly on GitHub), confirm the error message is user-friendly and instructs them to refresh and retry.

## Sub-Issue E — Settings UI for Repo Config and Cache Parameter

**Depends on:** Sub-Issues A, B

### Rules

1. The Settings page gains a "GitHub Sync" section with: login/logout control, `owner/repo` field, file path field, and a `revalidate-cache-days` number input.
2. `revalidate-cache-days` accepts a positive integer; values ≤ 0 are rejected with an inline validation message.
3. `owner/repo` and file path are disabled once the user is authenticated — a message instructs the user to log out to change them (Sub-Issue B, rule 3). `revalidate-cache-days` is always editable, whether authenticated or not.

### How to test locally

1. Start the app with `netlify dev`.
2. Navigate to the Settings page while unauthenticated; confirm all GitHub Sync fields (`owner/repo`, file path, `revalidate-cache-days`) are enabled.
3. Log in (Sub-Issue A); confirm `owner/repo` and file path become disabled while `revalidate-cache-days` stays enabled.
4. Enter `0` or a negative number in `revalidate-cache-days`; confirm an inline validation error appears and the form cannot be saved.
5. Enter a valid positive integer (e.g. `7`); confirm it saves successfully.
6. Log out; confirm `owner/repo` and file path become enabled again.

#### Going live

1. No additional deployment steps beyond Sub-Issue A — the Settings UI is entirely client-side.
2. On the production site, verify the GitHub Sync section layout is correct on both desktop and mobile viewports.
3. Confirm field-level validation (e.g. `revalidate-cache-days` ≤ 0) works identically in the production build as in local dev.

## Sub-Issue F — Netlify Functions for OAuth and GitHub API Proxy

**Depends on:** nothing (can be developed in parallel with A)

### GitHub OAuth App setup (prerequisite)

Before coding or testing any part of this feature, a GitHub OAuth App must be registered. This is a one-time manual step performed by whoever deploys the app.

1. Go to github.com → Settings → Developer settings → OAuth Apps → **New OAuth App**.
2. Fill in the form:
   - **Application name**: any descriptive name (e.g. `French Gas Stations – Local Dev`).
   - **Homepage URL**: `http://localhost:8888` for local development, or your production Netlify URL for a production app.
   - **Authorization callback URL**:
     - Local dev: `http://localhost:8888/.netlify/functions/github-auth-callback`
     - Production: `https://<your-netlify-site>.netlify.app/.netlify/functions/github-auth-callback` (or your custom domain)
   - You may register two separate OAuth Apps — one for local dev and one for production — to keep callback URLs clean.
3. After creating the app, GitHub shows a **Client ID** (always visible) and allows you to generate a **Client Secret** (shown once — copy it immediately).
4. Store these values:
   - **Local dev**: create a `.env` file at the repo root (never commit it) with:
     ```
     GITHUB_CLIENT_ID=<your-client-id>
     GITHUB_CLIENT_SECRET=<your-client-secret>
     ```
     `netlify dev` reads `.env` automatically and injects variables into the Netlify Functions runtime.
   - **Production**: go to the Netlify dashboard → Site settings → Environment variables and add `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`. Re-deploy after saving.

### Rules

1. The OAuth callback and cookie behavior (server-side code exchange, `HttpOnly`/`SameSite=Strict`, 8-hour lifetime) follow ADR-011; see Sub-Issue A for the user-facing login/logout behavior.
2. A new Netlify function proxies GitHub Contents API calls (read and write) using the token from the cookie. It validates that the requested `owner/repo` matches the stored config to prevent SSRF abuse.
3. Neither function exposes the Client Secret or the access token in any response body or redirect URL.

### OAuth Flow

See ADR-011's OAuth Flow diagram for the full sequence across the SPA, the Netlify functions (`github-auth-start`, `github-auth-callback`), and GitHub.

### How to test locally

1. Create a GitHub OAuth App in your GitHub account (Settings → Developer settings → OAuth Apps). Set the Authorization callback URL to `http://localhost:8888/.netlify/functions/github-auth-callback`.
2. Set `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` environment variables in your local `.env` file (or via `netlify dev` configuration).
3. Start the app with `netlify dev`.
4. Trigger login from the Settings page and complete the GitHub authorization; confirm the browser lands on `/settings?auth=success` and the cookie `gh_token` is set (check DevTools → Application → Cookies; confirm it is HttpOnly).
5. Confirm the cookie `Max-Age` is 28800 seconds (8 hours).
6. Trigger a GitHub API proxy call (e.g. saving repo config); confirm the function reads the token from the cookie and does NOT return it in the response body.
7. Manually delete the `gh_token` cookie in DevTools; reload and confirm the app treats the user as unauthenticated.
8. Test an OAuth error: append `?error=access_denied` to the callback URL in your browser; confirm the app redirects to `/settings?auth=error` and displays an error message.

### Going live

1. Register a **separate production GitHub OAuth App** (see "GitHub OAuth App setup" above) with the Authorization callback URL set to the production Netlify domain — do not reuse the local dev app, as GitHub validates the callback URL exactly.
2. Add `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` in the Netlify dashboard → Site settings → Environment variables, then trigger a re-deploy so the functions pick up the new values.
3. Verify the production callback URL is reachable: open `https://<your-site>/.netlify/functions/github-auth-start` in a browser and confirm it redirects to GitHub's authorization page.
4. Complete a full OAuth authorization on the production site; confirm the `gh_token` cookie is set with `HttpOnly` and `Secure` attributes (HTTPS enforces `Secure` automatically — verify in DevTools).
5. Confirm the cookie `SameSite=Strict` attribute is present; this is critical for CSRF protection on the production domain.
6. Verify neither `GITHUB_CLIENT_SECRET` nor the raw `gh_token` value appears anywhere in Netlify function response bodies or redirect URLs (check Netlify function logs in the Netlify dashboard).

### Architectural decisions documented

The two new architectural patterns this feature introduces are documented in [ADR-011](../../../decisions/ADR-011-github-oauth-app-auth.md) (GitHub OAuth App flow with server-side token exchange) and [ADR-012](../../../decisions/ADR-012-github-repo-as-sync-backend.md) (user-owned GitHub repo as sync backend). ADR-012 still needs the amendments listed in `spec-review.md` (drop the remote `"settings"` section, mock-`Date.now()` test note, drop the Firebase mention) applied separately.

## Remote JSON File Structure

The JSON file stored in the user's GitHub repository has the following shape — it never carries repo configuration, only station data:

```json
{
  "stations": [
    { "name": "Station A", "url": "https://..." },
    { "name": "Station B", "url": "https://..." }
  ],
  "defaultFuel": "SP95"
}
```

- `owner`, `repo`, and `revalidate-cache-days` live only in IndexedDB (Sub-Issue B); they are never written to or read from the remote file.

status: ready
