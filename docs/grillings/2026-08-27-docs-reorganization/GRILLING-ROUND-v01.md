# Grilling round v01 — Grill the Docs, Phase 1

Subject: reorganize `docs/` to remove `docs/prompts/tasks/` and get a structured doc folder that makes the project's features clear.

Answer under each `### Answer to Qn` heading, save the file, then tell me you answered.

---

## Q1 - Scope of "remove `docs/prompts/tasks/`"

The pipeline commands (`jli-sets-up`, `jli-codes`, `jli-ships`, etc.) actively read/write per-issue artifacts under `docs/prompts/tasks/issue-<id>-<slug>/` for every in-flight and future issue. "Removing" this folder from `docs/` can mean two very different things:

a. **Cleanup only** — archive/delete the ~28 existing _completed_-issue folders (stale history), but the pipeline keeps using `docs/prompts/tasks/` as its working directory for new issues going forward. No `.claude/` files change.
b. **Full relocation** — the pipeline's artifact directory itself moves out of `docs/` permanently (e.g. to `.claude/pipeline-artifacts/` or similar), so `docs/prompts/tasks/` stops existing as a concept. This requires editing all 14 `.claude/commands/jli-*.md` + `fix-pipeline.md` + the deprecated orchestrator agent — which CLAUDE.md's Critical Rule #1 says should go through `/jli-tweaks-command-chain`, not be done ad hoc inside a docs-reorg task.

➡️ Recommendation: (a). Do the docs cleanup now. Relocating the pipeline's working directory touches 16 command files that the whole workflow depends on; bundling that into a docs reorganization means a single change set where a docs mistake and a broken pipeline look the same. If you also want the artifact location changed, that is a separate `/jli-tweaks-command-chain` change so it gets tracked and reviewed on its own.

### Answer to Q1

(a)

---

## Q2 - Fate of the existing 28 completed `issue-*` folders

Once Q1 is decided, what happens to the content currently sitting in `docs/prompts/tasks/issue-101-...` through `issue-96-...`?

a. **Delete outright** — git history already preserves them; nothing else in the repo reads them once an issue is shipped.
b. **Archive first** — move them to a non-`docs/` location (e.g. `.claude/archive/tasks/` or a dedicated `docs-archive` branch) before removing from `docs/`, so they stay easy to browse without cluttering the doc structure.

➡️ Recommendation: (a). They are pipeline scratch artifacts, not reference documentation. An archive folder that nothing reads is the same clutter one directory over, and the content stays recoverable via `git log` / `git show` if it is ever needed.

### Answer to Q2

reverse engineer the app's features and extract them to `docs/features` in this grilling session. then delete them.

---

## Q3 - Feature taxonomy for the new structure

Based on `src/composables/`, `src/components/`, and `netlify/functions/`, the project groups into these features:

1. **Station price scraping** — `fetch-page` function, HTML parser, `useStationPrices`, `StationPrices*`
2. **Station management** — `useStationStorage`, `StationManager*`, IndexedDB persistence
3. **Fuel type selection** — `useDefaultFuelType`, `useKnownFuelTypes`
4. **GitHub sync & preferences** — OAuth (`useGitHubAuth`, `github-auth-*`), `useRepoConfig`, `useRemotePreferencesSync/Write`, export/import, `GitHubSyncSettings`, `PreferencesDiffDialog`
5. **Price history** — `scheduled-price-history` function
6. **Release & CI automation** — `release.sh`, GitHub Actions workflows

Plus a non-feature **cross-cutting/foundational** bucket for things that apply to the whole app rather than one feature (framework choice, state pattern, testing strategy, storage choice, sanitization) — currently ADR-001/002/003/005/008/009/010/013.

➡️ Recommendation: adopt the 6-feature list as-is. It maps one-to-one onto directories that already exist in the codebase, so each feature folder has an obvious owner set of files and nothing lands in two places at once. Tell me if any of the six should be split, merged, or renamed to match how you think about the product — feature #3 (fuel type selection) is the most likely merge candidate into #1, and #6 is the most likely to sit outside `docs/features/` entirely.

### Answer to Q3

I think your list is too small. Here what I think it is.

The list of feature need to be saved in the future `CONTEXT.md` that will written.

My list should be challenged from `docs\prompts\tasks\**\business-specifications.md`. No need to look to any other markdown file.

#### Feature 1 - GitHub Auth

`github-auth-callback`, `github-auth-start` and `github-auth-logout` handle the user's connection to GitHub Auth.

`<!-- GitHub Auth compoment start (to extract) -->` indicate the component to create extracting it out of `src/components/GitHubSyncSettings.vue`.

To connect, the user must provide the owner/repo and the preferences filename since it locked on once the user is authenticated.

#### Feature 2 - Reading and storing the preferences

The data is defined as:

- the default fuel type
- the favorite stations.

A station is defined with a name and a URL (used for scraping).

There are two scenarios:

- The user is not authenticated: the data is saved to IndexedDB storage to persist it on a single device.
- The user is authenticated: the data is read from the GitHub preferences file specified in the `GitHubSyncSettings.vue`. The data is also refreshing or setting the data to IndexedDB storage.

#### Feature 3 - Scraping the station data

On each page load, using function `fetch-page` to scrap the HTML and extract the fuel prices of the station.

#### Feature 4 - List of fuel types

The list of fuel types is built as the favorite stations are scrapped.

Once scraping is completed, the default fuel type preferred by the user is selected from the list.

If no default fuel type exists for the user, then review `docs\prompts\tasks\**\business-specifications.md` for the rule.

#### Feature 5 - Managing favorite stations

User can:

- add a station with a name (non-empty) and a URL. Review `docs\prompts\tasks\**\business-specifications.md` for the validation rules
- edit a station by modifying the name or URL.
- remove a station

A diff screen is displayed to the user to confirm any edits. See `src\components\PreferencesDiffDialog.vue`.

Editing an item in the favorite stations reflect onto the `src\components\StationPrices.vue` and `src\components\StationPricesContent.vue` reactively.

If user is authenticated, it also prompts the user to save to GitHub preference file after any modification to the list.

Note: we might be missing the default fuel type preference trigger to save it to GitHub from the fuel type list. If so, /create-gh-issue for this.

#### Feature 6 - Displaying the favorite station fuel prices

Once all favorite stations are scrapped, display prices for the default user fuel type or the default fuel type if user hasn't a preference. Review `docs\prompts\tasks\**\business-specifications.md` for the rule which should end up the same rule as Feature 4.

#### Feature 7 - Synchronize From GitHub preference file

A button is displayed when:

- user is authenticated.
- user has not a pendy modified station.

#### Feature 9 - Export / Import to and from JSON files

The feature still need to exist for user who would not use the GitHub storage.

Review `docs\prompts\tasks\issue-63-export-import-preferences\business-specifications.md` for the logic.

---

## Q4 - Where existing ADRs and specs physically live relative to the new feature folders

a. **Index only** — ADRs stay in `docs/decisions/` and specs stay in `docs/specs/` exactly where they are; new `docs/features/<feature>/README.md` files just link out to the relevant ADRs/specs for that feature. Lowest churn, no broken links, ADR numbering untouched.
b. **Physical move/split** — feature-specific ADRs and spec content get physically relocated into `docs/features/<feature>/`, leaving only truly cross-cutting ADRs in `docs/decisions/`. Higher churn, renumbering/relinking risk, but everything about a feature lives in one folder.

➡️ Recommendation: (a). ADRs are dated decision records tied to a sequential number, and CLAUDE.md's Critical Rule #4 makes `docs/decisions/README.md` the canonical index. Moving or splitting them breaks that sequence for a benefit — co-location — that a good feature index page already delivers.

### Answer to Q4

It seems that all ADR non feature related so (a) seems the right fit.
