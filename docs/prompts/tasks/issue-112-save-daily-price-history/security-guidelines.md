# Security Guidelines — Issue #112: Save Daily Price History

1. **Secret handling for the fixed GitHub PAT.**
   **What**: `HISTORY_GITHUB_PAT` (and its companion `HISTORY_GITHUB_OWNER`/`HISTORY_GITHUB_REPO`/
   `HISTORY_PREFS_FILE_PATH` values) must never appear in logs, error responses, or any output
   returned by the scheduled function; scope the variable to the Functions runtime only, never to
   the client bundle. **Where**: the scheduled function and its Netlify environment-variable
   configuration (ADR-014). **Why**: a leaked fine-grained PAT grants direct write access to the
   target repository's contents.

2. **Escape CSV output against formula and structure injection.**
   **What**: values written into `history.csv` (station name, URL, fuel type) must be quoted/
   escaped so a value beginning with `=`, `+`, `-`, or `@` cannot execute as a formula when the
   file is opened in a spreadsheet application, and embedded commas or quotes cannot break a row
   into extra fields. **Where**: the row-writing step of the scheduled function, before the write
   to GitHub. **Why**: station names are user-supplied (via the Settings/Station Manager flow);
   an unescaped value is a classic CSV/formula injection vector (CWE-1236) once the file is opened
   locally.

3. **Re-apply the existing domain allowlist to every scrape call this function makes.**
   **What**: enforce the same host whitelist already required for `fetch-page` (ADR-006) when the
   scheduled function fetches each favorite station's page — do not treat a URL from the remote
   preferences file as pre-trusted. **Where**: the scheduled function's per-station scrape step.
   **Why**: `favoriteStations` now originates from a GitHub-hosted JSON file (ADR-012) that could
   be edited outside the app; without re-validation, a tampered file could make the server-side
   function fetch an arbitrary or internal URL (SSRF).

4. **Reject invocations that did not come from the Netlify scheduler.**
   **What**: the function must verify it was invoked by the scheduled trigger (not a direct HTTP
   request to its endpoint URL) before performing any GitHub write, and no-op otherwise.
   **Where**: entry point of the scheduled function. **Why**: scheduled function endpoints remain
   reachable by their normal URL; without this check, anyone who discovers it could trigger
   unwanted privileged GitHub writes or burn the PAT's API rate limit on demand.

status: ready
