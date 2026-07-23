# Test Cases — Issue #112: Save Daily Price History

## Scheduling and Trigger

1. **Correct local time in summer (CEST)**: the scheduled trigger fires at 19:00 UTC during a
   period when French local time is UTC+2. Action: the function runs. Expected: the run proceeds
   and updates `history.csv`, since 19:00 UTC is 21:00 French local time.

2. **Off-hour invocation skipped in summer**: the scheduled trigger fires at 20:00 UTC during the
   same UTC+2 period (22:00 French local time). Action: the function runs. Expected: the function
   exits without touching `history.csv` — it is not the target local hour.

3. **Correct local time in winter (CET)**: the scheduled trigger fires at 20:00 UTC during a
   period when French local time is UTC+1. Action: the function runs. Expected: the run proceeds
   and updates `history.csv`, since 20:00 UTC is 21:00 French local time.

4. **Off-hour invocation skipped in winter**: the scheduled trigger fires at 19:00 UTC during the
   same UTC+1 period (20:00 French local time). Action: the function runs. Expected: the function
   exits without touching `history.csv`.

## Authentication and Configuration

5. **Invalid or expired PAT**: the configured GitHub token is invalid or expired. Action: the
   scheduled run fires at the correct local time. Expected: the run fails, `history.csv` is left
   completely unchanged (no partial write), and the failure is only observable in the function's
   own logs — no user-facing notification occurs.

6. **Preferences file missing or unreadable**: the remote preferences JSON file (at the
   configured path) does not exist or cannot be parsed at run time. Action: the scheduled run
   fires at the correct local time. Expected: the run fails without writing to `history.csv`,
   since the list of favorite stations cannot be determined.

## Reading Favorite Stations

7. **Stations come from the remote file, not local storage**: the remote preferences JSON file
   lists a set of favorite stations. Action: a scheduled run executes. Expected: exactly the
   stations listed in the remote file are scraped that day — the run does not depend on, or
   reference, any browser-side IndexedDB state.

8. **No favorite stations configured**: the remote preferences JSON file lists zero favorite
   stations. Action: a scheduled run executes. Expected: the run completes without error and adds
   no price rows for that day (an existing `history.csv` is left otherwise unchanged for that
   date).

## Scraping and Partial Failures

9. **One station fails to scrape**: of several favorite stations, one station's page cannot be
   scraped (e.g. unreachable page). Action: a scheduled run executes. Expected: rows for every
   other favorite station are still written for that day; the failing station contributes no rows
   and does not stop the run.

10. **A station does not list a given fuel type that day**: a favorite station's page is scraped
    successfully but does not show one of the fuel types it sometimes lists. Action: a scheduled
    run executes. Expected: no row is written for that station/fuel-type pair that day; rows for
    the station's other listed fuel types are written normally.

## Row Content and File Structure

11. **Row shape for a normal result**: a favorite station lists a fuel type and price on the day
    of the run. Action: a scheduled run executes successfully. Expected: `history.csv` gains one
    row containing that day's date, the station's name, its URL, the fuel type, and the price —
    matching the values the SPA would otherwise display for that station.

12. **First-ever run creates the file**: `history.csv` does not yet exist in the target
    repository. Action: a scheduled run executes successfully. Expected: `history.csv` is created
    with a header row followed by that day's price rows.

13. **Subsequent run updates the existing file**: `history.csv` already exists with prior days'
    rows. Action: a scheduled run executes successfully on a new day. Expected: the prior rows are
    preserved unchanged, and the new day's rows are added.

## Re-run Idempotency

14. **Re-running the same day replaces its rows**: `history.csv` already contains rows for
    today's date from an earlier run today. Action: the scheduled function runs again the same
    day (e.g. manual retry). Expected: today's previously written rows are removed and replaced
    by the fresh snapshot — today's date ends up with exactly one set of rows, not duplicated
    entries, while all other days' rows are untouched.

## Security — CSV Content Safety

15. **Station name contains a formula-triggering character**: a favorite station's configured
    name begins with a character such as `=`, `+`, `-`, or `@`. Action: a scheduled run writes a
    row for that station. Expected: the value is written in a form that a spreadsheet application
    would display as literal text, not execute as a formula.

16. **Station name contains a comma or quote**: a favorite station's configured name contains a
    comma or a quotation mark. Action: a scheduled run writes a row for that station. Expected:
    the row is quoted/escaped so the value stays within its own field — it does not split into
    extra columns or corrupt the row structure.

## Security — Scrape Target Validation

17. **Remote file lists a URL outside the allowed domain**: the preferences JSON file (editable
    directly on GitHub, outside the app) contains a favorite station URL whose host is not the
    allowed gas-station-price domain. Action: a scheduled run executes. Expected: that URL is not
    fetched; no row is produced for it, and the run continues normally for the remaining stations.

## Security — Invocation Source

18. **Direct call to the function's endpoint**: the function's URL is invoked directly over HTTP
    (not by the Netlify scheduler). Action: the request is made. Expected: no GitHub write occurs
    and `history.csv` is left unchanged.

status: ready
