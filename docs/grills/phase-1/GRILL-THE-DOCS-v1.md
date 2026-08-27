# Grill the Docs — Phase 1

Reorganize `docs/` to remove `docs/prompts/tasks/` and get a structured doc folder that makes the project's features clear.

Fill in each `**Answer QX:**` line and hand the file back.

---

❓ **Q1** - **Scope of "remove `docs/prompts/tasks/`"**: The pipeline commands (`jli-sets-up`, `jli-codes`, `jli-ships`, etc.) actively read/write per-issue artifacts under `docs/prompts/tasks/issue-<id>-<slug>/` for every in-flight and future issue. "Removing" this folder from `docs/` can mean two very different things:

(a) **Cleanup only** — archive/delete the ~28 existing *completed*-issue folders (stale history), but the pipeline keeps using `docs/prompts/tasks/` as its working directory for new issues going forward. No `.claude/` files change.

(b) **Full relocation** — the pipeline's artifact directory itself moves out of `docs/` permanently (e.g. to `.claude/pipeline-artifacts/` or similar), so `docs/prompts/tasks/` stops existing as a concept. This requires editing all 14 `.claude/commands/jli-*.md` + `fix-pipeline.md` + the deprecated orchestrator agent — which CLAUDE.md's Critical Rule #1 says should go through `/jli-tweaks-command-chain`, not be done ad hoc inside a docs-reorg task.

➡️ (a) — do the docs cleanup now; if you also want the pipeline's artifact location changed, that's a separate `/jli-tweaks-command-chain` change so it gets tracked/reviewed on its own.

**Answer Q1:**

---

❓ **Q2** - **Fate of the existing 28 completed `issue-*` folders**: Once decided (Q1), what happens to the actual content currently sitting in `docs/prompts/tasks/issue-101-...` through `issue-96-...`?

1. **Delete outright** — git history already preserves them; nothing else in the repo reads them once an issue is shipped.
2. **Archive first** — move them to a non-`docs/` location (e.g. `.claude/archive/tasks/` or a dedicated `docs-archive` branch) before removing from `docs/`, so they stay easy to browse without cluttering the doc structure.

➡️ 1 (delete outright) — they're pipeline scratch artifacts, not reference documentation, and remain recoverable via `git log`/`git show` if ever needed.

**Answer Q2:**

---

❓ **Q3** - **Feature taxonomy for the new structure**: Based on `src/composables/`, `src/components/`, and `netlify/functions/`, I'd group the project into these features:

1. **Station price scraping** — `fetch-page` function, HTML parser, `useStationPrices`, `StationPrices*`
2. **Station management** — `useStationStorage`, `StationManager*`, IndexedDB persistence
3. **Fuel type selection** — `useDefaultFuelType`, `useKnownFuelTypes`
4. **GitHub sync & preferences** — OAuth (`useGitHubAuth`, `github-auth-*`), `useRepoConfig`, `useRemotePreferencesSync/Write`, export/import, `GitHubSyncSettings`, `PreferencesDiffDialog`
5. **Price history** — `scheduled-price-history` function
6. **Release & CI automation** — `release.sh`, GitHub Actions workflows

Plus a non-feature **cross-cutting/foundational** bucket for things that apply to the whole app rather than one feature (framework choice, state pattern, testing strategy, storage choice, sanitization) — currently ADR-001/002/003/005/008/009/010/013.

➡️ Use this 6-feature list as-is; does it match how you think about the product, or would you split/merge/rename any of these?

**Answer Q3:**

---

❓ **Q4** - **Where do existing ADRs and specs physically live relative to the new feature folders?**

1. **Index only** — ADRs stay in `docs/decisions/` and specs stay in `docs/specs/` exactly where they are; new `docs/features/<feature>/README.md` files just link out to the relevant ADRs/specs for that feature. Lowest churn, no broken links, ADR numbering untouched.
2. **Physical move/split** — feature-specific ADRs and spec content get physically relocated into `docs/features/<feature>/`, leaving only truly cross-cutting ADRs in `docs/decisions/`. Higher churn, renumbering/relinking risk, but everything about a feature lives in one folder.

➡️ 1 (index only) — ADRs are dated decision records tied to a sequential number; moving/splitting them risks breaking that history for a benefit (co-location) a good index page already gives you.

**Answer Q4:**
