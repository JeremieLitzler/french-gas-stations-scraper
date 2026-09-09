# Grilling round v02 — Grill the Docs, Phase 1

## Settled in v01

- **Q1 — (a) Cleanup only.** `docs/prompts/tasks/` stays the pipeline's working directory for new issues. No `.claude/commands/jli-*.md` file is touched by this work.
- **Q2 — Delete, but only after extraction.** The 27 completed `issue-*` folders get deleted, and before that their feature knowledge is reverse-engineered into `docs/features/`. (What "in this grilling session" means concretely is Q6.)
- **Q3 — Your 8-feature list replaces mine.** My 6-feature taxonomy is dropped. Your list (Features 1-7 and 9) is the starting point, to be challenged against `docs/prompts/tasks/**/business-specifications.md` and no other Markdown, and it must end up in a `CONTEXT.md` that does not exist yet.
- **Q4 — (a) Index only.** ADRs stay in `docs/decisions/`, specs stay in `docs/specs/`, feature folders link out to them.

## Findings — what I verified in the specs and the code

These are facts, not questions. Object in any answer below if one looks wrong.

- **F1 — The gap you suspected in Feature 5 does not exist.** The default fuel type _is_ pushed to GitHub from the fuel type list. `src/components/StationPricesContent.vue:210-224` — `onSaveDefault`, `onUpdateDefault` and `onClearDefault` each `await pushFuelTypeChange()` (defined line 197), which builds a `PreferencesFile` and calls `pushPreferences`. No `/create-gh-issue` needed.
- **F2 — Q4's premise was wrong, its answer still holds.** Not all ADRs are feature-agnostic: ADR-006 (Netlify proxy) belongs to scraping, ADR-011 (OAuth app) to GitHub auth, ADR-012 (repo as sync backend) to preferences, ADR-014 (scheduled function PAT) to price history, ADR-004 and ADR-015 to release automation. Answer (a) is unaffected — it is arguably the stronger choice _because_ those ADRs are feature-tied and would otherwise have to be split out.
- **F3 — Repo config is three fields, not two.** issue-64 Sub-Issue A rule 1: `owner/repo`, the preferences file path, **and** `revalidate-cache-days`. The login button stays disabled until all three are valid.
- **F4 — Neither `docs/features/` nor any `CONTEXT.md` exists in the repo today.** Both are new files this work creates.
- **F5 — `PreferencesDiffDialog.vue` serves two flows, not one.** It is driven by `usePreferencesImport` (the import diff, issue-63 rules 3-5) _and_ by `useRemotePreferencesWrite` (`isWriteDialogOpen` / `writeDiff` / `confirmWrite`, the confirmation before pushing to GitHub). See Q7.

---

## Q5 - Feature 8, and the missing price-history feature

Your list runs Feature 1 through Feature 7, then jumps to Feature 9. Feature 8 is absent.

Separately, one whole area of the app appears nowhere in your list: the **daily price history**. Per `issue-112-save-daily-price-history` and `issue-115-randomize-cron-schedule`, a scheduled Netlify function runs once a day at 21:00 French local time, authenticates with a fixed fine-grained PAT stored as a Netlify env var (explicitly _not_ the browser OAuth session — ADR-014), scrapes every favorite station, and appends to `history.csv` in the same GitHub repo Feature 2 writes preferences to.

a. **Feature 8 = Daily price history** — add it, and the numbering gap is explained.
b. **Price history is deliberately excluded** from `docs/features/` because no user-facing screen exposes it.
c. **Feature 8 was something else** you meant to write and lost — tell me what, and price history is handled separately.

➡️ Recommendation: (a). It has its own ADR, its own auth model, its own spec, and it runs whether or not anyone opens the app — that is a feature, not infrastructure. It also writes into the same repository Feature 2 owns, so omitting it documents the sync story with a hole where an invisible writer touches the user's repo.

### Answer to Q5

Yes, (a) is the answer!

---

## Q6 - What this grilling session actually produces

Q2 says extract the features "in this grilling session"; Q3 says the list must land in a future `CONTEXT.md`. Those are two different amounts of work to put inside a grilling session, which normally ends at a summary.

a. **Grill to a summary only** — the session ends with `GRILLING-SUMMARY.md` holding the agreed feature list; writing `docs/features/`, writing `CONTEXT.md` and deleting the task folders is a separate follow-up ask.
b. **Grill, then write** — once the question frontier is empty, this same session writes `docs/features/<feature>/README.md` for every feature, writes `CONTEXT.md`, and deletes the 27 completed task folders, all on the current `docs/grill-the-docs` branch.
c. **Interleave** — write each feature's doc as soon as its questions settle, rather than waiting for the frontier to close.

➡️ Recommendation: (b). The spec content is loaded into this session now and re-deriving it in a fresh one is exactly the cost you are avoiding. But keep the writing _after_ the frontier closes rather than interleaved: several of the questions below (Q5, Q8) change which folders exist at all, so writing early guarantees rewriting.

### Answer to Q6

(b)

---

## Q6b - Delivery shape of the writing

Assuming Q6 lands on (b) or (c), the extraction and the deletion are two very different diffs: roughly 8 new documents, versus the removal of 27 folders.

a. **One PR** — feature docs, `CONTEXT.md` and the task-folder deletion together.
b. **Two PRs** — first the feature docs and `CONTEXT.md`; then, once you have read them and confirmed nothing was lost, the deletion.

➡️ Recommendation: (b). The deletion is the irreversible half and it is only safe once you have confirmed the extraction captured what you need. It also keeps the review honest: 27 deleted folders in the same diff as 8 new documents means the new documents get skimmed.

### Answer to Q6b

(b)

---

## Q7 - Feature 5's "diff screen ... to confirm any edits"

You wrote that a diff screen confirms any edit to a favorite station. The specs and the code say something more specific:

- `issue-17-station-management-ui`: inline edits **auto-save on blur** — no per-row Save button, no confirmation. Delete is immediate, explicitly "without any confirmation dialog".
- `src/components/StationManagerTable.vue:240-257,306`: on blur the row calls `updateStation` (writing straight to IndexedDB), then `markStationChange` to record a _pending_ change.
- The diff dialog appears one step later, when those accumulated pending changes are **pushed to GitHub** — `useRemotePreferencesWrite`'s `isWriteDialogOpen` / `writeDiff` / `confirmWrite`, behind "Enregistrer les modifications" (F5).

So a diff does exist, but it confirms the _push_, not the _edit_, and it only ever appears for an authenticated user.

a. **Correct Feature 5** — edits and deletes are immediate and local; the diff dialog belongs to the push-to-GitHub step and is shared with Feature 9 (import).
b. **Keep it as written** — you consider the push confirmation close enough to "confirm any edits" for the feature doc.
c. **It is a gap** — you want an unauthenticated user to get a confirmation too, which does not exist today, so record it and open an issue.

➡️ Recommendation: (a). Where the confirmation sits decides who owns the dialog in the docs. Describing it as edit confirmation would make an unauthenticated user's experience unrecognisable from the doc, since they never see it at all.

### Answer to Q7

(a)

---

## Q8 - The Feature 1 / Feature 2 boundary

The `<!-- GitHub Auth compoment start (to extract) -->` markers you added wrap only the login/logout button pair (`src/components/GitHubSyncSettings.vue:171-194`). The repo configuration form — three fields, per F3 — sits outside them and stays in `GitHubSyncSettings.vue`.

a. **Feature 1 owns auth _and_ the repo config form.** Feature 2 consumes an already-resolved config.
b. **Feature 1 owns only login/logout.** Feature 2 owns the config form, since those fields decide where preferences are read and written.

➡️ Recommendation: (a). The config is a precondition of login, not of storage: the login button is disabled until all three fields are valid, and the fields lock once authenticated — your own Feature 1 text says so. That coupling is auth's.

### Answer to Q8

## (a)

## Q9 - Feature 7's trigger condition

Your text is cut off: "user has not a pendy modified station". `issue-106-refresh-data-button` states it precisely — Rule 1: the action is shown only when GitHub sync is fully configured _and_ the user is authenticated. Rule 8: when local station edits have not yet been pushed, the action is **visible but disabled, with an explanatory message**, deliberately not hidden, so the reason stays discoverable.

a. **As spec'd** — hidden when unconfigured or unauthenticated; visible-but-disabled-with-message when edits are pending.
b. **Something else** — say what you intended.

➡️ Recommendation: (a). It is what is built and what the spec argues for, and the hidden/disabled distinction is exactly the kind of detail a feature doc exists to record.

### Answer to Q9

## Specs are right > (a)

## Q10 - Where the non-product work goes

Between your list and mine, a large body of documented work belongs to no feature:

- release automation (`release.sh`, ADR-004, ADR-015, issues #133/#148/#59),
- build and CI config (#96 Netlify build, #123 Vitest bump, #136 test fix, #70 gitingest),
- UI/UX polish passes (#50, #110, #43, #30),
- and the foundational ADRs (001, 002, 003, 005, 007, 008, 009, 010, 013).

a. **`docs/features/` holds user-facing features only.** Everything else stays where it already is — `docs/decisions/`, repo root — and `CONTEXT.md` links to it in a short section.
b. **Add a sibling folder** (`docs/engineering/` or similar) for release, CI, build and test-infrastructure documentation.
c. **Fold it into `CONTEXT.md` prose** with no folder at all.

➡️ Recommendation: (a). It keeps `docs/features/` meaning exactly one thing — something a user of the app can do — which is the property that makes the folder worth creating. The ADR index already covers the foundational decisions, and the UI/UX passes are history rather than reference: they describe how a screen came to look as it does, which the feature doc supersedes.

### Answer to Q10

(a)
