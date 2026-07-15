Bootstrap a worktree for a feature — from a new issue, a sub-issue, or a merged spec: $ARGUMENTS

`$ARGUMENTS` identifies the work in one of these ways, matching the entry modes below:

- **Mode A — from scratch**: a GitHub issue number for a standalone feature or bug fix with
  no spec yet (and optionally a title / notes).
- **Mode B — continue from a merged spec**: the specs folder,
  `docs/prompts/tasks/issue-<id>-<slug>`.
- **Sub-issue variant of Mode B**: a sub-issue's number, when its spec was written and merged
  as part of a larger **parent** issue. This is detected automatically in Step 1.

If `$ARGUMENTS` is empty or the mode is unclear, ask before doing anything:

> Which scenario?
> 1. **From scratch** (new feature or bug fix, no spec yet) — reply with the **issue number**.
> 2. **Continue from a merged spec** — reply with the **specs folder**
>    (`docs/prompts/tasks/issue-<id>-<slug>`).

Decide the mode from the answer: a bare issue number > Mode A (then run the sub-issue check in
Step 1); a `docs/prompts/tasks/...` folder > Mode B.

## What this command does

This is the first step of the manual feature chain. It creates the isolated worktree the
later `jli-` commands run in. Run it from the `develop/` worktree (the session's working
directory).

- **Mode A (from scratch)** builds a brand-new task folder from the issue; the chain then
  starts at `/jli-writes-spec`. The common case for a small feature or bug fix run end-to-end.
- **Mode B (continue)** targets a feature whose spec was already written, reviewed, and
  **merged into develop**. The new worktree, branched from `origin/develop`, already contains
  the merged spec artifacts, so this command creates no task folder — it resumes the chain at
  the first phase not yet done.
- **Sub-issue variant** implements one sub-issue of a larger merged spec. The shared spec
  lives in the parent issue's folder; this command creates a per-sub-issue **subfolder** for
  that sub-issue's own outputs and resumes at `/jli-codes`.

### Step 1 — Identify the work

**Mode A:**
- Parse the issue number from `$ARGUMENTS`.
- Fetch the issue with `rtk gh issue view <number>` to get its title and body.
- **Sub-issue check** (run before building anything): if the issue title contains
  `Sub-Issue` (case-insensitive) or its body contains `Part of #<n>`, this is a sub-issue of
  parent `#<n>`. Do NOT continue as Mode A — parse the parent id and ask the user to confirm
  the switch:
  > Issue #<sub-id> is a sub-issue of #<parent-id>. Its spec should already be merged under
  > `docs/prompts/tasks/issue-<parent-id>-<parent-slug>`. Switch to the sub-issue variant
  > (implement it against that merged spec)? Confirm, or give the specs-folder path if it
  > differs.

  On confirmation, proceed with the **sub-issue variant** below. Otherwise (not a sub-issue):
- Build:
  - `slug` = a short (≤ 30 chars) kebab-case summary of the issue title (e.g.
    `back-button-fix`). Do NOT use the full title — long slugs cause path-length failures
    on Windows.
  - `type` = the conventional-commit type implied by the issue label or nature (`feat`,
    `fix`, `docs`, `refactor`, …).

**Mode B (whole-feature continue):**
- Parse the specs folder from `$ARGUMENTS`. Its name is `issue-<id>-<slug>`, so read `id` and
  `slug` straight from it — the implementation reuses the spec's own issue and slug.
- Infer `type` the same way as Mode A: `rtk gh issue view <id>`.

**Sub-issue variant:**
- `sub-id` = the sub-issue number; `sub-slug` = a short (≤ 30 chars) kebab-case summary of the
  sub-issue's **own** title (drop the `Sub-Issue X (#..):` prefix, e.g. `netlify-oauth-proxy`).
- `type` = inferred from the sub-issue's label/nature.
- `parent-folder` (relative) = `docs/prompts/tasks/issue-<parent-id>-<parent-slug>` — the
  merged specs folder confirmed above.

### Step 2 — Fetch origin and create the worktree

Run from `develop/`:

```bash
bash scripts/pipeline/fetch-origin.sh
bash scripts/pipeline/worktree-create.sh <type> <slug>
```

Use `<slug>` for Mode A, the parent `<slug>` for Mode B whole-feature, or `<sub-slug>` for
the sub-issue variant. `worktree-create.sh` creates the worktree folder
`<repo-name>_<type>-<slug>` (a sibling of the bare repo) on branch `<type>/<slug>` from
`origin/develop`, installs npm deps, and prints `Worktree: <absolute-path>`. Capture that
path as `[worktree]`.

In **Mode B** and the **sub-issue variant**, because the spec was merged into develop, the new
worktree already contains the parent specs folder with its artifacts. (If a needed branch name
still exists from an earlier cycle and was not deleted after its merge, `worktree-create.sh`
errors that the branch already exists — delete the stale local branch, then re-run.)

### Step 3 — Task folder

**Mode A:**
- `task-folder` = `[worktree]/docs/prompts/tasks/issue-<id>-<slug>/`; relative form
  `docs/prompts/tasks/issue-<id>-<slug>`.
- Write `[task-folder]/README.md` containing:
  - A first line: `Worktree: [worktree]` (so the path is recorded for reference).
  - The issue title and the full issue body fetched in Step 1, plus any extra notes the user
    passed in `$ARGUMENTS`. This is the feature request the spec phase will read.
- Do NOT create the task folder before the worktree path is confirmed.

**Mode B (whole-feature continue):**
- The task folder already exists (it came with the merge) — do NOT recreate or overwrite it.
- Update only the first `Worktree:` line of its `README.md` to `[worktree]`.

**Sub-issue variant:**
- The shared parent specs folder already exists in the worktree — do NOT recreate, copy, or
  duplicate the shared specs.
- Create the per-sub-issue subfolder `[worktree]/<parent-folder>/sub-issue-<sub-id>/` (it
  starts empty; the implementation-phase commands fill it with `technical-specifications.md`,
  `review-results.md`, and `test-results.md`).
- The `@`-mention every downstream command takes is this subfolder:
  `docs/prompts/tasks/issue-<parent-id>-<parent-slug>/sub-issue-<sub-id>`.

## Commit rules reference (used by every git step in this chain)

- Changes to `.claude/deprecated-agents`, `CLAUDE.md`, or `.claude/settings.local.json` → `ci(agent): …`
- Changes to `.claude/commands/jli-*.md` → `ci(commands): …`
- Changes under `docs/` → `docs: …` (pipeline artifacts use the scoped types below)
- Changes under `.github/workflows` → `ci: …`
- Everything else follows conventional commits: `feat`, `fix`, `docs`, `style`, `refactor`,
  `test`, `chore`, `perf`, `ci`. Subject: imperative, lowercase, no period, ≤72 chars.

This command does not commit anything itself.

## Shell command retry limit

Do not run more than 3 failing shell commands in total. After 3 failures, stop and report
the full error output to the user.

## Next

Report the absolute worktree path and the relative task-folder path.

**Mode A:**

> Worktree and task folder ready.
> Worktree: `[worktree]`
> Task folder (relative): `docs/prompts/tasks/issue-<id>-<slug>`
>
> Next: open the worktree in its own editor window so the rest of the chain runs in its
> context:
>
> ```
> code [worktree]
> ```
>
> Then, from that window, run `/jli-writes-spec @docs/prompts/tasks/issue-<id>-<slug>`. Every later
> command takes the task folder as a `@`-mention relative to the worktree root — you never
> need the absolute path again. The final cleanup command is the exception: it runs back in
> this `develop` window.

**Mode B (whole-feature continue):** determine the resume point from which artifacts already
exist in the task folder, walking the chain order:

- no `security-guidelines.md` present > resume at `/jli-verifies-security`
- else no `test-cases.md` present > resume at `/jli-writes-tests-spec`
- else > resume at `/jli-codes`

Then show:

> Worktree ready with the merged spec.
> Worktree: `[worktree]`
> Task folder (relative): `docs/prompts/tasks/issue-<id>-<slug>`
>
> Next: open the worktree in its own editor window:
>
> ```
> code [worktree]
> ```
>
> Then, from that window, resume the chain at `/<resume-command> @docs/prompts/tasks/issue-<id>-<slug>`.
> Every later command takes the task folder as a `@`-mention relative to the worktree root.
> The final cleanup command runs back in this `develop` window.

**Sub-issue variant:** the shared spec is complete in the parent folder, so resume at
`/jli-codes` with the **subfolder** as the task folder:

> Worktree ready for sub-issue #<sub-id> against the merged #<parent-id> spec.
> Worktree: `[worktree]`
> Sub-issue task folder (relative): `docs/prompts/tasks/issue-<parent-id>-<parent-slug>/sub-issue-<sub-id>`
>
> Next: open the worktree in its own editor window:
>
> ```
> code [worktree]
> ```
>
> Then, from that window, run
> `/jli-codes @docs/prompts/tasks/issue-<parent-id>-<parent-slug>/sub-issue-<sub-id>`. Every later
> command takes that subfolder as its `@`-mention; each reads the shared specs from the parent
> folder automatically. (If the parent folder is missing `security-guidelines.md` or
> `test-cases.md`, run the matching shared-spec command against the parent folder first.) The
> final cleanup command runs back in this `develop` window.
