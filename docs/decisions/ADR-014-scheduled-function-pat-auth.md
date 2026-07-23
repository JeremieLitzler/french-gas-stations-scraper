# ADR-014: Scheduled Netlify Function with Fine-Grained PAT for Daily Price History

**Date:** 2026-07-23
**Status:** Proposed

## Context

Issue #112 needs a daily, unattended snapshot of every favorite station's fuel prices, appended
to `history.csv` in the user's configured GitHub repository (the same repository ADR-012 already
syncs `favoriteStations` to).

Every GitHub write today is initiated by an active browser session: ADR-011 issues an HTTP-only
OAuth cookie tied to that session, and ADR-012's `github-api-proxy` reads that cookie to call the
GitHub Contents API on the user's behalf. A scheduled (cron-triggered) function has no browser
session, no cookie, and no access to the IndexedDB values (`ownerRepo`, `filePath`) the Settings
UI writes client-side — none of the existing auth or config plumbing is reachable from it.

Netlify Scheduled Functions also only support fixed cron expressions in UTC, but the business
requirement (business-specifications.md, issue #112) is 21:00 **French local time**, which shifts
between UTC+1 (CET) and UTC+2 (CEST) twice a year — a fixed single cron entry cannot satisfy that
without a biannual manual edit.

## Decision

### Authentication

Use a **fixed, fine-grained GitHub Personal Access Token (PAT)**, scoped to only the target
repository with **Contents: Read and write** permission and nothing else, stored as a Netlify
environment variable (`HISTORY_GITHUB_PAT`). This credential is entirely independent of the
ADR-011 OAuth cookie: it is not issued by a user login, is not affected by logout or cookie
expiry, and is the only thing the scheduled function needs to call the GitHub Contents API
directly (no proxy function involved, since there is no browser request to proxy).

Companion fixed environment variables give the function everything else the browser-session flow
normally supplies:

- `HISTORY_GITHUB_OWNER`, `HISTORY_GITHUB_REPO` — the target repository, mirroring the value the
  user set as `ownerRepo` in the Settings UI (ADR-012's `RepoConfigDraft`).
- `HISTORY_PREFS_FILE_PATH` — the path to the synced preferences JSON file, mirroring the
  Settings UI's `filePath`, so the function can read `favoriteStations` the same way the SPA
  does. This must be kept in sync manually if the user ever changes the path in Settings.

`history.csv` itself is written at a fixed path (repo root) — not user-configurable — per the
issue's literal request for a file named `history.csv`.

### Scheduling Mechanism (DST handling)

The Netlify Scheduled Function's cron trigger fires **twice** a day, at 19:00 and 20:00 UTC —
covering both possible UTC offsets of 21:00 French local time. On each invocation, the function
computes the current wall-clock hour in the `Europe/Paris` time zone and exits immediately,
without touching `history.csv`, unless that hour is 21. This guarantees exactly one effective run
per day at true French local 21:00 year-round, with no manual cron edit needed at DST changeovers.

## Consequences

### Positive

- ✅ Fully decoupled from user browser sessions — the daily snapshot keeps running regardless of
  login state, cookie expiry, or whether anyone opens the app that day.
- ✅ Least-privilege credential: fine-grained PAT scoped to one repo, one permission, unlike the
  broader `repo`/`public_repo` OAuth scope already granted to browser sessions.
- ✅ DST-correct scheduling without recurring maintenance (no biannual cron edit).
- ✅ No new proxy function needed — the scheduled function calls the GitHub Contents API
  directly, since there's no browser request to shield the token from.

### Negative

- ⚠️ Fine-grained PATs expire after at most 1 year — requires a manual renewal; there is no
  refresh mechanism (same limitation ADR-011 already accepts for the OAuth token, but here with
  no user present to react to a 401).
- ⚠️ A silent-failure risk: an expired or revoked PAT makes the run fail with nobody watching
  unless Netlify function logs/alerts are checked deliberately.
- ⚠️ Two extra environment variables (`HISTORY_GITHUB_OWNER`, `HISTORY_PREFS_FILE_PATH`) must be
  kept manually in sync with whatever the user has configured in the Settings UI — they will
  silently drift if the user changes the Settings UI values without updating Netlify.
- ⚠️ Firing the scheduled trigger twice daily (to cover both DST offsets) means one invocation
  per day does no useful work beyond checking the clock and exiting — a minor, accepted overhead.
- ⚠️ This design is explicitly single-user/single-repo. Generalizing to multiple app users would
  require a fundamentally different config/credential storage approach (out of scope here).

## Alternatives Considered

1. **Reuse the ADR-011 OAuth cookie somehow**: Not possible — the cookie is scoped to a specific
   browser request/response cycle and does not exist outside of one; there is no session to draw
   it from in a cron context.
2. **Store a long-lived OAuth refresh token instead of a PAT**: GitHub OAuth Apps (ADR-011) do not
   issue refresh tokens for this flow type — would require switching to a GitHub App
   (installation tokens), a much larger change rejected as overkill for a single personal repo,
   same reasoning as ADR-011's own rejection of GitHub Apps.
3. **Classic PAT instead of fine-grained**: Simpler (optional expiration, one-time setup) but
   grants access to every repository the account can reach — rejected in favor of the narrower
   fine-grained scope for a single fixed target repo.
4. **Two static cron entries, manually swapped at DST changeovers**: Avoids the twice-daily
   no-op invocation but requires a human to remember and edit `netlify.toml` twice a year —
   rejected as an ongoing maintenance burden versus a self-adjusting runtime check.
5. **Netlify Blobs / KV for storing owner/repo/path server-side**: Would let the Settings UI push
   config to a place the function can read, avoiding manual env var sync — deferred as unneeded
   complexity for a single-user, single-repo scope; worth revisiting if this ever needs to
   generalize to multiple users.

## Notes

### PAT Setup Guide

1. Go to **github.com/settings/personal-access-tokens/new** (Fine-grained tokens), signed in as
   the account that owns the target repository.
2. **Token name**: something identifiable, e.g. `french-gas-stations-history-writer`.
3. **Expiration**: the maximum allowed (1 year). Set a calendar reminder ~2 weeks before expiry
   to regenerate and update the Netlify environment variable ahead of time — done early enough,
   this causes no downtime.
4. **Resource owner**: the user/org that owns the target repository.
5. **Repository access**: "Only select repositories" > choose exactly the one target repository.
6. **Permissions** > Repository permissions > **Contents: Read and write**. Leave every other
   permission at "No access".
7. Click **Generate token** and copy the value immediately — GitHub shows it only once.
8. In Netlify: Site settings > Environment variables > add `HISTORY_GITHUB_PAT` with the copied
   value, scoped to Functions (not exposed to the client bundle). Add `HISTORY_GITHUB_OWNER`,
   `HISTORY_GITHUB_REPO`, and `HISTORY_PREFS_FILE_PATH` alongside it.
9. Redeploy the site so the scheduled function picks up the new environment variables.
10. **If the token is ever leaked or the repo target changes**: revoke it immediately from the
    same GitHub settings page, generate a replacement, and update the Netlify variable — there is
    no automatic revocation.

- This ADR extends ADR-011 (browser-session OAuth) and ADR-012 (GitHub repo as sync backend) with
  a second, independent auth path for server-only, unattended writes. The two paths never share a
  credential.
- Should the app ever need to generalize to multiple users, this ADR's single-PAT/env-var design
  would need to be superseded — see Alternatives Considered, item 4.

## References

- [GitHub fine-grained personal access tokens documentation](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)
- [Netlify Scheduled Functions documentation](https://docs.netlify.com/functions/scheduled-functions/)
- [ADR-011: GitHub OAuth App Authentication](./ADR-011-github-oauth-app-auth.md)
- [ADR-012: User-Owned GitHub Repository as Remote Sync Backend](./ADR-012-github-repo-as-sync-backend.md)
