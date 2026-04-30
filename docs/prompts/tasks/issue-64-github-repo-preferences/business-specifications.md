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

1. The user can initiate a GitHub OAuth login flow from the Settings page. On success, an HTTP-only cookie containing the access token is set by the Netlify function that handles the OAuth callback.
2. The login flow uses the GitHub OAuth App authorization URL. The app requests only the minimum scopes needed to read and write a single file in one user-owned repository (`repo` scope or `public_repo` if the target repo is always public — see sub-issue B).
3. After the callback, the user is redirected back to the Settings page with a visible success or error state.
4. The user can log out; logout clears the HTTP-only cookie and removes the stored repo config from the Settings UI (but not from IndexedDB — station data is kept).
5. If the cookie is absent or expired when the app loads, the user is treated as unauthenticated; no error is shown unless they attempt a sync, add, update or delete action.
6. The HTTP-only cookie has a lifetime of **8 hours** (matching a typical browser session). After expiry, the user must re-authenticate. The cookie is not refreshed automatically; expiry is detected on the next GitHub API call returning 401.

### Edge cases integrated

- If the OAuth callback receives an error parameter from GitHub, the Netlify function returns a redirect to Settings with an error query param; the UI displays it.
- Token expiry is detected when a GitHub API call returns 401; the app clears the cookie and prompts the user to log in again.

### How to test locally

1. Start the app with `netlify dev` so Netlify Functions are available.
2. Navigate to the Settings page; confirm a "Login with GitHub" button is visible and all GitHub Sync fields are disabled.
3. Click "Login with GitHub"; confirm the browser redirects to GitHub's OAuth authorization page.
4. Authorize the app on GitHub; confirm the browser is redirected back to the Settings page with a success indicator and the fields are now enabled.
5. Reload the page; confirm the user remains logged in (cookie persists across reloads).
6. Click "Logout"; confirm the GitHub Sync fields are disabled again and no token cookie is present (inspect cookies in DevTools → Application → Cookies).
7. To simulate an expired/absent cookie: delete the cookie in DevTools, reload the page, and confirm the user is treated as unauthenticated with no error banner.

#### Going live

1. In the Netlify dashboard → Site settings → Environment variables, set `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` to the values from your GitHub OAuth App (see "GitHub OAuth App setup" in Sub-Issue F).
2. Update the Authorization callback URL in your GitHub OAuth App settings (github.com → Settings → Developer settings → OAuth Apps → your app) to point to the production domain: `https://<your-netlify-site>.netlify.app/.netlify/functions/github-auth-callback` (or your custom domain if configured).
3. Re-deploy the Netlify site so it picks up the new environment variables.
4. Verify the OAuth flow end-to-end on HTTPS: confirm the `gh_token` cookie is set with `HttpOnly` and `Secure` attributes (DevTools → Application → Cookies; `Secure` is automatically enforced on HTTPS).
5. Confirm the `SameSite=Strict` attribute is visible in the cookie inspector — this prevents CSRF on the production domain.

## Sub-Issue B — Repo Configuration

**Depends on:** Sub-Issue A (user must be authenticated)

### Rules

1. The Settings page exposes two text inputs: `owner/repo` (e.g. `alice/my-stations`) and file path (e.g. `stations.json`). Both fields are required before any sync can occur.
2. Configuration is validated on save: the Netlify proxy must be able to confirm the file path exists or the repo is reachable. If not, a human-readable error is shown.
3. The configuration (`owner/repo`, file path, and `revalidate-cache-days`) is stored both in IndexedDB (for local persistence across reloads) and in the user's remote JSON file under a `"settings"` section (see "Remote JSON file structure" below). For unauthenticated users, these fields are empty.
4. The scope requested during OAuth must cover private repositories if the user configures a private repo (`repo` scope); private vs. public is not pre-validated — the first sync attempt reveals access issues.

### How to test locally

1. Start the app with `netlify dev` and log in via GitHub (see Sub-Issue A).
2. Navigate to the Settings page; confirm the `owner/repo` and file path inputs are enabled.
3. Enter a valid `owner/repo` (e.g. your own GitHub username and a test repo) and a file path (e.g. `stations.json`); click Save.
4. Confirm a success message appears and no error is shown.
5. Reload the page; confirm the `owner/repo` and file path fields retain their saved values (loaded from IndexedDB).
6. Enter an invalid `owner/repo` (e.g. `nonexistent-user/nonexistent-repo`); click Save; confirm a human-readable error is displayed.
7. Log out (Sub-Issue A) and reload; confirm the `owner/repo` and file path fields are empty and disabled.

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
3. If IndexedDB data is older than the threshold (or absent), the app fetches the JSON file from the remote repo via a Netlify proxy function and merges it into IndexedDB, replacing the existing data. The JSON file includes a `"settings"` section (see "Remote JSON file structure" below); the app reads `owner`, `repo`, and `revalidateCacheDays` from it and updates IndexedDB accordingly.
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
2. Before writing, the current file content is fetched from the remote repo and a diff is presented to the user (reusing the diff UI implemented in issue #63). The user must confirm before the write is committed.
3. The write uses the GitHub Contents API `PUT /repos/{owner}/{repo}/contents/{path}` with the file's current `sha` to avoid overwrite conflicts.
4. If the remote write fails, IndexedDB retains the update and a non-blocking error is shown; the write is not retried automatically.
5. The JSON written to the remote repo always includes the `"settings"` section (see "Remote JSON file structure" below), preserving the current `owner`, `repo`, and `revalidateCacheDays` values alongside `stations` and `defaultFuel`.

### Edge cases integrated

- If the remote file does not yet exist, the diff shows an empty baseline; the user confirms to create the file.
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
3. All fields in this section are disabled when the user is not authenticated.

### How to test locally

1. Start the app with `netlify dev`.
2. Navigate to the Settings page while unauthenticated; confirm all GitHub Sync fields (`owner/repo`, file path, `revalidate-cache-days`) are disabled/greyed out.
3. Log in (Sub-Issue A); confirm all fields become enabled.
4. Enter `0` or a negative number in `revalidate-cache-days`; confirm an inline validation error appears and the form cannot be saved.
5. Enter a valid positive integer (e.g. `7`); confirm it saves successfully.
6. Log out; confirm all fields are disabled again.

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

1. A new Netlify function handles the OAuth callback: receives the temporary `code`, exchanges it for an access token using the Client Secret (stored as a Netlify environment variable), and sets an HTTP-only `SameSite=Strict` cookie with a `Max-Age` of 28800 seconds (8 hours) before redirecting.
2. A new Netlify function proxies GitHub Contents API calls (read and write) using the token from the cookie. It validates that the requested `owner/repo` matches the stored config to prevent SSRF abuse.
3. Neither function exposes the Client Secret or the access token in any response body or redirect URL.

### OAuth Flow

The following sequence diagram describes the full OAuth flow across browser, Netlify Functions, and GitHub:

```mermaid
sequenceDiagram
    actor User as Browser (User)
    participant SPA as Vue SPA
    participant NF_Login as Netlify fn<br/>github-auth-start
    participant GitHub as GitHub OAuth
    participant NF_CB as Netlify fn<br/>github-auth-callback

    User->>SPA: Clicks "Login with GitHub"
    SPA->>NF_Login: GET /.netlify/functions/github-auth-start
    NF_Login-->>User: 302 Redirect → github.com/login/oauth/authorize?client_id=...&scope=repo&state=...
    User->>GitHub: Browser follows redirect (GitHub authorization page)
    User->>GitHub: Authorizes the app
    GitHub-->>User: 302 Redirect → /.netlify/functions/github-auth-callback?code=...&state=...
    User->>NF_CB: Browser follows redirect
    NF_CB->>GitHub: POST github.com/login/oauth/access_token (code + client_secret)
    GitHub-->>NF_CB: { access_token, scope, token_type }
    NF_CB-->>User: 302 Redirect → /settings?auth=success
    Note over NF_CB,User: Set-Cookie: gh_token=...; HttpOnly; SameSite=Strict; Max-Age=28800
    User->>SPA: Browser loads /settings
    SPA->>User: Settings page — authenticated state shown
```

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

### ADR Required

The feature introduces two new architectural patterns not yet documented:

1. **GitHub OAuth App flow with server-side token exchange via Netlify Functions** — The app currently has no authentication layer. Storing the access token in an HTTP-only cookie and relying on a Netlify function for the OAuth callback is a significant, high-impact decision affecting security posture, deployment config (env vars), and how the SPA detects auth state.

2. **Remote repository as user-data backend via GitHub Contents API** — The app currently stores all user data client-side only (ADR-008). Using a user-owned GitHub repo as a durable sync target is a new persistence tier that interacts with the existing IndexedDB layer and requires a cache-invalidation strategy. This warrants a dedicated ADR.

## Remote JSON File Structure

The JSON file stored in the user's GitHub repository has the following shape. For users who have never authenticated, the `settings` fields are empty/absent locally; for authenticated users, the settings are persisted both in IndexedDB and in the remote file:

```json
{
  "settings": {
    "owner": "alice",
    "repo": "my-stations",
    "revalidateCacheDays": 7
  },
  "stations": [
    { "name": "Station A", "url": "https://..." },
    { "name": "Station B", "url": "https://..." }
  ],
  "defaultFuel": "SP95"
}
```

- For unauthenticated users, the `settings` section is absent from any local representation; these fields are only populated once the user logs in and saves repo config.
- The `settings` section is always written alongside `stations` and `defaultFuel` on every remote write (Sub-Issue D).
- On remote read (Sub-Issue C), if the `settings` section is present, its values override the locally stored settings.

status: ready
