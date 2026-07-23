# Business Specifications — Issue #112: Save Daily Price History

## Goal and Scope

Once a day, automatically capture the current price of every favorite station's fuel types and
append it to a durable, versioned history file (`history.csv`) in the user's configured GitHub
repository (the same repository the app already syncs `favoriteStations` to, per ADR-012). No
user interaction is required for this to happen — it runs on a schedule, independent of anyone
having the app open.

This is a single-user feature: the target repository is fixed configuration, not per-visitor.

## Files to Create or Modify

- A new **scheduled Netlify function** — triggered automatically once per day; not reachable via
  any SPA action or HTTP call a user initiates. Owns the daily run end to end: read favorites,
  scrape prices, update `history.csv`.
- **Environment variable configuration** (documented alongside existing Netlify env vars) — holds
  the fixed GitHub credential and target locations this function needs, since it has no browser
  session to draw them from.
- `history.csv`, in the user's configured repository — the durable output. Created on first run
  if absent; updated on every subsequent run.

## Rules

**Runs daily at 21:00 French local time**, adjusting for daylight saving (19:00 UTC in summer,
20:00 UTC in winter) — matching "end of day" in France year-round, not a fixed UTC offset.

**Authenticates with a fixed, fine-grained GitHub Personal Access Token**, scoped to only the
target repository with Contents read/write permission, stored as a Netlify environment variable.
It does not use, and is not affected by, the browser OAuth session from ADR-011 — a user logging
out of the app in their browser has no effect on this job. If the token is invalid or expired,
the run fails without writing anything to `history.csv` (no partial file), and the failure is
only visible in Netlify function logs since no user is present to be notified.

**Reads favorite stations from the same remote preferences JSON file the SPA already syncs**
(`favoriteStations`, per ADR-012), not from IndexedDB, since the scheduled function has no
browser context to read local storage from. The GitHub owner/repo and the preferences file's
path are fixed environment variables, kept in sync manually with whatever the user has set in
the Settings UI — the scheduled function does not discover this value dynamically.

**Scrapes each favorite station the same way the SPA does today.** If a station's page fails to
scrape, or does not list a given fuel type that day, only that station (or that station/fuel
pair) is omitted from the day's rows — every other favorite station or fuel type is still
written normally.

**Each written row records: date, station name, station URL, fuel type, and price** — one row
per station/fuel-type combination present that day. Example: a station listing Gazole at 1,969
on 2026-07-23 produces one row for that date, station, URL, "Gazole", and "1,969".

**Re-running the job for a day that already has rows replaces those rows** rather than
duplicating them: before appending, any existing rows dated today are removed, then the fresh
snapshot is written. Running the job twice in the same day never produces duplicate entries for
that day.

**First run creates `history.csv`** (with a header row) if it does not already exist, using the
same create-vs-update (`sha`-based) write mechanism already established for the preferences file
in ADR-012.

### ADR Required

This introduces a new architectural pattern not covered by any existing ADR: a **time-triggered
(scheduled/cron) Netlify function** that authenticates to GitHub independently of any browser
session, using a fixed, long-lived Personal Access Token instead of the OAuth-cookie flow from
ADR-011. Existing ADRs (011, 012) assume every GitHub write is initiated by, and authenticated
through, an active user session — this feature breaks that assumption and should be documented
as its own decision, including the PAT's scope, expiration/rotation caveats, and the fact that
this design is explicitly single-user/single-repo (not a pattern to generalize to multi-tenant
use without further decisions).

status: ready
