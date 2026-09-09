# Grilling round v06 — Grill the Docs, Phase 1

## Settled in v05

Your v05 answer was (b) — corrections. Three land as factual edits to `GRILLING-SUMMARY.md`, no decision reopened:

- **Feature 9 slug** renamed `export-import` > `file-export-import` (already applied to the summary's slug list).
- **Feature 6** gains the sort rule: the price table is sorted ascending by price, cheapest first. Verified against `issue-19` — stations that do not carry the selected fuel type show a dash and sort to the bottom, keeping their relative order. Folded into the summary.
- No other wording change.

Two of your notes reopen a settled decision, so they get questions here rather than a silent edit.

## Reopened

- **Q4 — the fate of `docs/specs/`.** Q4 (a) kept `docs/specs/` untouched. Your note: _"since `docs/specs` contains empty markdown, delete it in first PR."_ Verified — all four files (`00-overview.md`, `01-requirements.md`, `02-architecture.md`, `03-data-models.md`) are a single H1 heading with zero body. So the premise of Q4 (a) — that there is spec content to leave in place and link to — is false. What is still live is whether the empty folder goes now and what else has to move with it. Q18.
- **Q1 delivery scope — the `jli-*` follow-up.** Q1 (a) ruled that pipeline-command changes are `/jli-tweaks-command-chain` territory, not part of this work. Your added line — _"PR 3: record a new issue to decide to keep or adapt the `/jli-_`commands to look up to`docs/features/`"\* — is a new deliverable. Its shape needs pinning: an issue, or an actual PR. Q19.

---

## Q18 - Deleting `docs/specs/`, and what moves with it

`docs/specs/` is four empty stubs. Deleting them is clean, but three files point at the folder:

- `CLAUDE.md` — the "Documentation" section lists `docs/specs/ — Project specifications and requirements`; Critical Rule #3 ("Spec-first") tells the reader to "read the relevant spec files".
- `docs/prompts/task-template.md` — references `docs/specs`.

(The `jli-*` command files do **not** reference it — checked.)

a. **Delete `docs/specs/` in PR 1 and fix the two referrers in the same PR.** Drop the `docs/specs/` bullet from `CLAUDE.md`'s Documentation section; adjust the "Spec-first" wording so it points at `docs/features/` and the per-issue `business-specifications.md` that still exist for active issues; update `docs/prompts/task-template.md`. `CONTEXT.md`'s non-product section then links only `docs/decisions/` and the root scripts. `CLAUDE.md` is a repo-root file, not a `.claude/commands/` pipeline file, so this does not touch the pipeline.
b. **Delete `docs/specs/` in PR 1 but leave the referrers for a follow-up.** The folder goes now; `CLAUDE.md` and the template keep dangling links until a separate instruction-file change fixes them.
c. **Keep `docs/specs/` (Q4 stands).** The stubs are harmless; a future issue fills or removes them.

➡️ Recommendation: (a). Four blank headings that `CLAUDE.md` sends every contributor to are worse than no folder. The referrer edits are two small deletions plus one wording tweak, they belong with the deletion so the tree is never in a knowingly-broken state, and none of it reaches the pipeline command chain. (b) ships broken links on purpose.

### Answer to Q18

(a)

---

## Q19 - Shape of the `jli-*` / `docs/features/` follow-up

You want it recorded that someone should decide whether the `jli-*` command chain should read or reference `docs/features/` (and `CONTEXT.md`) as inputs.

a. **File it as a GitHub issue during PR 1**, next to the Q16 issue — no "PR 3". Title around _"Decide whether the `jli-_`command chain should reference`docs/features/`and`CONTEXT.md`as spec inputs."* No command-file edits in this work stream.
b. **Make it a real third PR** in this stream that edits the`jli-\*`commands to consult`docs/features/`.
c. **Drop it** — out of scope, raise it later if it proves to matter.

➡️ Recommendation: (a). Whether the pipeline consumes the new docs is a pipeline-behaviour decision, which Q1 already placed in `/jli-tweaks-command-chain`, not here. An issue captures the intent now, while the context is fresh, without pulling command-chain edits into a docs reorganization. "PR 3" becomes the second follow-up issue filed during PR 1.

### Answer to Q19

(a)
