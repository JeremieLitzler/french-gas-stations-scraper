# CONTEXT.md

The feature map for this project. It names what the app does, points at where each feature is documented, and defines the vocabulary that spans features.

For _how_ the code is built — stack, architecture, data flow, conventions — see `CLAUDE.md`. For _why_ a decision was made, see `docs/decisions/`. This file is the index that ties them together.

## What the app does

A web app that shows fuel prices for a user's favorite French gas stations. It scrapes each station's page on `prix-carburants.gouv.fr` through a Netlify function, aggregates the results into one sortable price table, and optionally syncs the user's station list and default fuel type to a GitHub repository they own.

## Feature map

Each feature has a folder under `docs/features/` with a `README.md` covering its purpose, the code that implements it, and its behaviour rules.

1. **[GitHub Auth](docs/features/github-auth/README.md)** — OAuth App login/logout against GitHub, plus the repo-configuration form (`owner/repo`, preferences file path, `revalidate-cache-days`) that gates login.
2. **[Reading and storing the preferences](docs/features/preferences-storage/README.md)** — the preferences payload (default fuel type + favorite stations) held in IndexedDB, and read from the configured GitHub file when the user is authenticated.
3. **[Scraping the station data](docs/features/station-scraping/README.md)** — on page load, fetching and parsing each favorite station's HTML into fuel type / price data.
4. **[List of fuel types](docs/features/fuel-types/README.md)** — deriving the fuel-type list from scraped stations and selecting the user's default, with the fallback and import-validation rules.
5. **[Managing favorite stations](docs/features/station-management/README.md)** — add / edit / delete favorite stations in an inline table, with validation and immediate local persistence.
6. **[Displaying the favorite station fuel prices](docs/features/price-display/README.md)** — the price table for the selected fuel type, sorted cheapest first.
7. **[Synchronize from GitHub preference file](docs/features/sync-from-github/README.md)** — a manual "refresh from remote" action that replaces local data with the configured GitHub file's contents.
8. **[Daily price history](docs/features/daily-price-history/README.md)** — a scheduled Netlify function that scrapes every favorite station once a day and appends to `history.csv` in the same GitHub repo.
9. **[Export / Import to and from JSON files](docs/features/file-export-import/README.md)** — download the preferences as `preferences.json` and re-import it with a diff-and-resolve step, for users who do not use GitHub sync.

## Non-product work

Documented work that is not a user-facing feature. It stays where it already lives:

- **Architecture decisions** — `docs/decisions/` (`README.md` is the index). Foundational: ADR-001 (Vue 3), ADR-002 (singleton composables), ADR-003 (Tailwind + shadcn-vue), ADR-005 (Vitest), ADR-010 (Mentions Légales rendering).
- **Branch model** — one long-lived branch, `develop` (the GitHub default and the trunk). Every change lands by a rebase-merged pull request against `develop`; `feat/`, `fix/`, `docs/`, and `ci/` branches all branch off it and merge back into it. There is no `main` (ADR-016, superseding ADR-015).
- **Release automation** — the vendored `scripts/release/release.sh`, driven by `.github/workflows/release-bash.yml`: a push to `develop` runs a dry-run preview to the run summary; a release is cut by pushing a `release/<date>` branch, which tags the commit, publishes the GitHub release, and deletes the spent branch. ADR-015 supersedes ADR-004; ADR-016 now supersedes ADR-015. Day-to-day operating guide: `docs/agents/ci.md`.
- **CI and build config** — `.github/workflows/` (`pr-build.yml` runs tests + build on every PR to `develop`), `netlify.toml`, `vite.config.ts`, `vitest` setup.
- **UI/UX polish history** — captured in git history and closed issues, superseded by the feature docs above.

## Glossary

Terms that appear across more than one feature. A feature README defines anything local to that feature inline.

- **Preferences file** — the JSON document with the exact shape `{ "fuelTypeDefault": string | null, "favoriteStations": [{ "name": string, "url": string }] }`. It is what Export/Import writes, what the GitHub sync reads and writes, and what the daily history job reads. It never carries `owner`, `repo`, or `revalidate-cache-days` — those live only in IndexedDB.
- **Favorite station** — one `{ name, url }` entry in the user's list. The `url` is a `https://www.prix-carburants.gouv.fr/station/…` page URL and is the identity of the station (query parameters are ignored when matching).
- **Default fuel type** — `fuelTypeDefault`: the one fuel type the user has designated as their preferred view, persisted as a plain string (or `null` for "none chosen"). Selected automatically once scraping finishes.
- **Known / derived fuel types** — the set of fuel types actually present in at least one scraped station's results. The selector and the import-time validation of `fuelTypeDefault` both work against this set, not a fixed list.
- **Repo config** — the three IndexedDB-stored fields `owner/repo`, preferences file path, and `revalidate-cache-days`. All three must be valid before GitHub login is offered; `owner/repo` and the path lock once authenticated.
- **Diff dialog** — `PreferencesDiffDialog.vue`, shared by two flows: the Import merge (per-conflict pick between file and local) and the push-to-GitHub confirmation (a single before/after confirm). It is never shown for a plain local station edit.
- **Pending change** — a local station-list edit that has been written to IndexedDB but not yet pushed to the GitHub preferences file. While any exist, the "Refresh from remote" action is visible but disabled.
- **OAuth session vs PAT** — the browser features authenticate to GitHub with a short-lived HTTP-only cookie from the OAuth App flow (ADR-011). The daily history job instead uses a fixed fine-grained Personal Access Token stored as a Netlify environment variable (ADR-014); logging out in the browser has no effect on it.
- **Revalidate-cache-days** — the staleness threshold (positive integer, default 7). On load, an authenticated user's IndexedDB data older than this many days triggers a read from the GitHub preferences file.
