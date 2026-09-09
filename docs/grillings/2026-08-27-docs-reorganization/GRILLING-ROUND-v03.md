# Grilling round v03 — Grill the Docs, Phase 1

## Settled in v02

- **Q5 — Feature 8 = Daily price history.** The numbering gap is closed. Feature 8 covers the scheduled Netlify function (21:00 FR local, fixed fine-grained PAT per ADR-014, not the OAuth session) that scrapes every favorite station and appends to `history.csv` in the same repo Feature 2 writes preferences to. Source specs: `issue-112`, `issue-115`.
- **Q6 — Grill, then write, in this session.** Once the question frontier is empty, this same session writes every `docs/features/<feature>/README.md`, writes `CONTEXT.md`, and (subject to Q6b) removes the completed task folders. No separate follow-up ask to produce the docs.
- **Q6b — Two PRs.** PR 1: feature docs + `CONTEXT.md`. PR 2, after you have read PR 1 and confirmed nothing was lost: the task-folder deletion. The irreversible half is isolated behind your review.
- **Q7 — Feature 5 corrected.** Station edits and deletes are immediate and local (IndexedDB, auto-save on blur, delete with no dialog). The diff dialog belongs to the push-to-GitHub step and is shared with Feature 9's import flow — it confirms the push, never the edit, and only an authenticated user ever sees it.
- **Q8 — Feature 1 owns auth and the repo-config form** (the three fields of F3). Feature 2 consumes an already-resolved config. The config is a precondition of login, not of storage.
- **Q9 — Feature 7 trigger is as spec'd** (`issue-106`): hidden when GitHub sync is not fully configured or the user is not authenticated; visible-but-disabled-with-an-explanatory-message when local station edits have not yet been pushed.
- **Q10 — `docs/features/` is user-facing features only.** Release automation, CI/build config, UI/UX polish passes and the foundational ADRs stay where they already are; `CONTEXT.md` links to them in one short section.

## Findings — what I verified in the specs, the code, and GitHub

Facts, not questions. Object in any answer below if one looks wrong.

- **F6 — It is 29 completed folders, not 27, plus one template that stays.** Every `docs/prompts/tasks/issue-*` folder (issue-14 through issue-148, 29 of them) maps to a **CLOSED** GitHub issue. The 30th entry, `issue-[id]-[slug of taks title read from github]`, is the pipeline's working template — it is not an issue and must **not** be deleted. ✅
- **F7 — The "no default fuel type" rule is one rule, used in both places.** `issue-28` Story 2: when no default is stored, the first derived (first-encountered) fuel type is selected. When a default _is_ stored but is absent from the current derived list, the selection falls back to first-available and the stored default is left untouched. Feature 4 and Feature 6 share this exact rule, as you expected in v01. ✅
- **F8 — Station validation rules (Feature 5), identical for add and edit** (`issue-17`): (1) name must not be empty, whitespace-only counts as empty; (2) URL must start with `https://www.prix-carburants.gouv.fr/station/`; (3) a URL already present in another row is rejected. On a failed blur the field reverts to its last saved value with an inline error. Delete is immediate, no confirmation.
- **F9 — No further feature is hiding in the specs.** Every `business-specifications.md` under `docs/prompts/tasks/` maps to one of the nine features or to the non-product bucket from Q10. `issue-64`'s sub-issues A-F fold into Features 1 and 2; `issue-66` folds into Feature 4; `issue-31` into Features 5/6; the rest (`issue-14`, `-25`, `-30`, `-43`, `-50`, `-59`, `-70`, `-96`, `-101`, `-110`, `-120`, `-123`, `-136`) are non-product.
- **F10 — Feature 4 gains a second rule from `issue-66`, triggered by Feature 9.** On import, `fuelTypeDefault` from the file is checked against the fuel types actually offered by the merged station list. Unrecognised value: it is discarded, the stored IndexedDB value is kept, and a French warning is shown. A `null` value always passes. This is Feature 4 behaviour invoked from the Feature 9 import flow — a cross-feature link the docs need to record.
- **F11 — Reconciling Q6 and Q6b.** Q6's option text said "all on the current `docs/grill-the-docs` branch"; Q6b then split delivery into two PRs. Taken together: the **writing** (feature docs + `CONTEXT.md`) is committed on `docs/grill-the-docs` and becomes PR 1. The **deletion** is a fresh branch off `develop` opened only after PR 1 is merged and you have confirmed the extraction — PR 2. Object here if you meant the deletion to ride the same branch instead.

### Jeremie's feedback

Everything is fine, but one comment:

> F8: On a failed blur the field reverts to its last saved value with an inline error

This seems off. If any validation error occurs, it is better to leave the typed value and inform user

---

## Q11 - `docs/features/` folder naming, and where the feature numbers live

Your feature numbers are load-bearing — the Feature 8 gap was its own question in v02. That raises the question of whether the folder names carry the number.

a. **Slug only** — `docs/features/github-auth/README.md`, `docs/features/daily-price-history/README.md`. The number lives in `CONTEXT.md`'s ordered list and in each README's H1 ("Feature 1 — GitHub Auth"), not in the path.
b. **Number-prefixed** — `docs/features/01-github-auth/README.md` ... `docs/features/09-export-import/README.md`. Path order matches reading order at a glance.

➡️ Recommendation: (a). `CONTEXT.md` is already the ordered index (Q3), so the folder tree does not need to re-encode the sequence. A number-prefixed folder has to be `git mv`d — and every inbound link updated — the first time a feature is inserted or reordered, which is exactly the churn this reorganization is trying to end. The number stays visible where it matters: the index and the page title.

### Answer to Q11

Slug only indeed.

---

## Q12 - What each `docs/features/<feature>/README.md` contains

Q2 deletes the task folders, so `business-specifications.md` stops being a link target — whatever rule knowledge is worth keeping has to be _in_ the feature doc or it is only in git history. This decides how much gets copied.

a. **Thin index** — per feature: a one-paragraph purpose, a bullet list of the implementing code (components, composables, utils, Netlify functions), and links to the related ADRs. Business rules are not restated; they remain in the git history of the deleted folders.
b. **Index + captured rules** — everything in (a), plus a "Behaviour & rules" section that restates in prose the rules worth keeping: validation rules, visibility matrices, fallback logic, cross-feature triggers (F7, F8, F10). Test-case tables, file-modification lists and security/technical-spec artifacts are **not** carried over — those stay in git history.
c. **Full spec merge** — move the whole `business-specifications.md` (and possibly `technical-specifications.md`, `security-guidelines.md`) into the feature doc verbatim.

➡️ Recommendation: (b). The stated goal is "a doc folder that makes the project's features clear"; (a) satisfies that only until PR 2 merges, after which the rules are gone from the working tree entirely. (c) drags in per-issue scaffolding — file lists, test IDs, "status: ready" — that is stale the day an unrelated PR touches those files, and buries the behaviour a reader wants under implementation minutiae.

### Answer to Q12

(b)

---

## Q13 - Where `CONTEXT.md` lives

a. **Repo root** — `./CONTEXT.md`, a peer of `CLAUDE.md`.
b. **`docs/CONTEXT.md`** — inside the tree it indexes.

➡️ Recommendation: (a). It is an orientation file for humans and agents, the same category as `CLAUDE.md`, not a documentation artifact in its own right. Contributors and tooling look for it at the root. `docs/` holds the detailed material it points into.

### Answer to Q13

(a)

---

## Q14 - What `CONTEXT.md` covers, beyond the feature list

Q3 fixes that the nine-feature list lands in `CONTEXT.md`. Q10 adds a short section linking the non-product work. The question is whether it stops there.

a. **Feature map + pointers only** — the nine features with a one-line description and a link to each `docs/features/` folder, then the short "non-product work" section (Q10) linking `docs/decisions/`, `docs/specs/` and the root scripts. Nothing else.
b. **Full orientation doc** — (a) plus a stack summary, a data-flow description, a persistence model and a glossary — some of which restates `CLAUDE.md`.

➡️ Recommendation: (a). `CLAUDE.md` already carries the stack, the architecture and the data flow. `CONTEXT.md`'s unique, not-yet-written job is the feature map. Keeping it to exactly that stops the two files from drifting out of sync as the app changes.

### Answer to Q14

(a) + app's glossary unless it exists in the feature's Markdown?
