# Feature 8 — Daily price history

## Purpose

Once a day, with no user present, scrapes every favorite station and appends the day's prices to `history.csv` in the same GitHub repository the app syncs preferences to. It runs on a schedule, independent of anyone having the app open. Single-user, single-repo by design.

## Implementing code

- `netlify/functions/scheduled-price-history/scheduled-price-history.ts` — the scheduled function; owns the run end to end: read favorites, scrape, update `history.csv`. Not reachable from any SPA action or user HTTP call.
- `netlify/functions/lib/scheduleGuards.ts` — `isScheduledInvocation`, the only pre-run check kept.
- `netlify/functions/lib/favoriteStationsParser.ts` — parses `favoriteStations` out of the remote preferences JSON.
- `netlify/functions/lib/priceHistoryCsv.ts`, `netlify/functions/lib/csvEscaping.ts` — build and merge the CSV.
- `netlify/functions/lib/githubContentsClient.ts` — `sha`-based create-or-update against the GitHub Contents API.
- `netlify/functions/lib/stationHtmlParser.ts` — the parse logic, server-side.
- **Netlify environment variables** — the fine-grained PAT, and the fixed `owner/repo` plus preferences file path this function has no browser session to read.

## Behaviour & rules

**Schedule.** Fires once a day at a fixed literal `19:00 UTC` cron — 21:00 French local in summer (CEST), 20:00 in winter (CET). The value must be a literal: Netlify's build step reads the `schedule()` cron argument straight from source text without executing the file, so a computed value cannot deploy. The French local time is not DST-corrected — the actual local hour drifts by one across the year, an accepted trade-off of one static cron entry. Changing it means editing the literal in source and redeploying; there is no runtime mechanism.

**No local-hour guard.** `isTargetLocalHour` / `TARGET_LOCAL_HOUR` were removed — their bug was silently skipping a legitimate invocation that landed outside the one accepted local hour. `isScheduledInvocation`, confirming the call came from Netlify's scheduler, is the only check before a run.

**Authentication.** A fixed, fine-grained Personal Access Token, scoped to only the target repository with Contents read/write, stored as a Netlify environment variable. It does not use, and is not affected by, the browser OAuth session (ADR-011) — a user logging out in their browser has no effect on this job. An invalid or expired token fails the run with no write (no partial file); the failure is visible only in Netlify function logs, since no user is present to notify.

**Inputs.** Favorite stations are read from the same remote preferences JSON the SPA syncs (`favoriteStations`), not from IndexedDB. The owner/repo and preferences file path are fixed environment variables, kept in sync manually with whatever the user set in the Settings UI — the function does not discover them dynamically.

**Scraping.** Same method as the SPA. If a station's page fails to scrape, or does not list a given fuel type that day, only that station (or that station/fuel pair) is omitted from the day's rows — every other favorite is still written normally.

**Rows.** One row per station/fuel-type combination present that day: date, station name, station URL, fuel type, price.

**Idempotent per day.** Before appending, any existing rows dated today are removed, then the fresh snapshot is written. Running the job twice in one day never produces duplicate entries for that day.

**First run.** Creates `history.csv` with a header row if it does not already exist, using the same `sha`-based create-vs-update mechanism established for the preferences file.

## Related ADRs

- [ADR-014](../../decisions/ADR-014-scheduled-function-pat-auth.md) — scheduled Netlify function with a fine-grained PAT for daily price history (**Proposed**). Its "Scheduling Mechanism" section reflects the single fixed cron trigger.
- [ADR-012](../../decisions/ADR-012-github-repo-as-sync-backend.md) — the repo and the `sha`-based Contents API write mechanism.

## See also

- **Feature 2** reads the same `favoriteStations` from the same repository.
- **Feature 3** performs the same scrape in the browser.
- **Feature 1** — contrast the auth model: this job uses a PAT, not the OAuth session (glossary: "OAuth session vs PAT").

_Source specs (in git history): `issue-112`, `issue-115`._
