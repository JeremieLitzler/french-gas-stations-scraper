Commit the current phase's artifacts. Task folder: $ARGUMENTS

`$ARGUMENTS` is the task folder, given as a `@`-mention relative to the worktree root you
opened (e.g. `@docs/prompts/tasks/issue-<id>-<slug>`). If it is empty, stop and reply:

> Usage: `/jli-commits @<task-folder>` — open the feature worktree (`code <worktree>`)
> first, then pass the task folder relative to it.

Run all git commands from the worktree root (your current directory) — never from the bare
repo root, and never commit directly to `develop` or `main` (you are on the feature branch
the worktree created). Parse the issue `[id]` from the task-folder name (`issue-<id>-<slug>`).

## Sub-issue task folders

If the task folder is a `sub-issue-<n>` subfolder, its own artifacts
(`technical-specifications.md`, `review-results.md`, `test-results.md`) live in that
subfolder while the shared specs sit in the **parent**; parse `[id]` from `issue-<id>-<slug>`
or `sub-issue-<id>`. Otherwise it is a flat folder holding everything (see
`AGENT-COMMAND-MIGRATION.md` for the rationale).

## What this command does

This is the commit step run between phases. Inspect what changed, then create one
conventional commit with the matching type. Use `rtk` for all git commands.

```bash
rtk git status
```

## Choosing the commit type from what changed

Two rules decide the type:

- **Markdown-only** changes always use `docs`, scoped to the artifact.
- Changes that touch **source code** (or `*.spec.ts` test files) use `<type>` — the
  conventional-commit type `/jli-sets-up` inferred for this issue, encoded in the
  current branch name as `<type>/<slug>` (e.g. branch `fix/vi-mock-hoisting-fix` ->
  `<type>` = `fix`). Read the current branch (`rtk git status` or
  `rtk git branch --show-current`) and parse `<type>` from it — never choose it freely.

Stage and commit the changed files with the message that matches them:

| Changed files | Commit message |
|---|---|
| only `business-specifications.md` | `docs(specs): define specs for <short desc> (#[id])` |
| only `security-guidelines.md` | `docs(security): add security guidelines for <short desc> (#[id])` |
| only `test-cases.md` | `docs(cases): define test scenarios for <short desc> (#[id])` |
| source files + `technical-specifications.md` | `<type>: <imperative summary of the change from business-specifications.md> (#[id])` |
| `*.spec.ts` test files | `<type>: add tests for <short desc> (#[id])` |
| only `review-results.md` | `docs(review): record code review for <short desc> (#[id])` |
| `test-results.md` | `docs(results): record test results for <short desc> (#[id])` |

General conventional-commit rules: subject in imperative mood, lowercase, no period,
≤72 chars; put overflow in the body. Other file classes: `.claude/deprecated-agents`,
`CLAUDE.md`, or `.claude/settings.local.json` → `ci(agent): …`; `.claude/commands/jli-*.md`
→ `ci(commands): …`; other `docs/` files → `docs: …`; `.github/workflows` → `ci: …`.

Stage only the files belonging to the current phase, then:

```bash
rtk git add <files>
rtk git commit -m "<message>"
```

Do NOT push here — `/jli-ships` pushes.

## Bug discovery rule

If you discover a bug or code issue while committing, do NOT fix it here. Stop, describe the
bug, the file(s) affected, and the root cause, and tell the user to route it through
`/jli-codes @<task-folder>`.

## Shell command retry limit

Do not run more than 3 failing shell commands in total. After 3 failures, stop and report
the full error output to the user.

## Next

Report the commit. Then point the user to the next phase based on what was just committed:

- after specs → `/jli-verifies-security @<task-folder>`
- after security → `/jli-writes-tests-spec @<task-folder>`
- after test-cases → `/jli-codes @<task-folder>`
- after code/review (approved) → `/jli-writes-tests @<task-folder>`
- after review (changes requested) → `/jli-codes @<task-folder>`
- after `*.spec.ts` → `/jli-runs-tests @<task-folder>`
- after test-results (passed) → `/jli-ships @<task-folder>`
- after test-results (failed) → `/jli-codes @<task-folder>`

> Committed. You may run `/clear` before the next command.
