Push, open the PR, and merge. Task folder: $ARGUMENTS

`$ARGUMENTS` is the task folder, given as a `@`-mention relative to the worktree root you
opened (e.g. `@docs/prompts/tasks/issue-<id>-<slug>`). If it is empty, stop and reply:

> Usage: `/jli-ships @<task-folder>` — run this from the feature worktree
> (`code <worktree>`), passing the task folder relative to it.

Run from the feature worktree root (your current directory). Parse the issue `[id]` from the
task-folder name. The pipeline scripts resolve the bare repo automatically. This command is
outward-facing and irreversible — honour the two approval gates below. It does NOT remove the
worktree (you are standing in it); cleanup is a separate command run from `develop`.

## Sub-issue task folders

If the task folder is a `sub-issue-<n>` subfolder, read `business-specifications.md` (for the
PR title) from its **parent** folder and read `test-results.md` from the subfolder; parse
`[id]` from `issue-<id>-<slug>` or `sub-issue-<id>` (so the PR closes the sub-issue).
Otherwise it is a flat folder holding everything (see `AGENT-COMMAND-MIGRATION.md` for the
rationale).

## Step 1 — Push and open the PR

Confirm `test-results.md` in the task folder ends with `status: passed`. If not, stop and
tell the user to finish `/jli-runs-tests @<task-folder>` first.

Derive the PR title from `business-specifications.md` (short imperative summary, ≤70 chars).
Write the PR body to a temp file: a summary of what changed and why, a test-plan checklist,
and `Closes #[id]`. Target branch is always `develop` — never `main`.

```bash
cat > /tmp/pr-body.md << 'EOF'
<body content here>
EOF

bash scripts/pipeline/pr-create.sh "$(pwd)" "<title>" /tmp/pr-body.md
```

`pr-create.sh` pushes the branch and opens the PR against `develop`, printing `PR: <url>`.

**Approval gate 1:** before running `pr-create.sh`, show the user the proposed PR title and
body and ask for approval. If they decline, stop.

## Step 2 — Merge (after approval)

**Approval gate 2:** show the user the PR URL and ask for approval to merge. If they decline,
stop — the PR stays open for them to merge manually.

```bash
bash scripts/pipeline/pr-complete.sh <pr-url>
```

Merges with rebase and deletes the remote branch. Skips gracefully if already merged/closed.

## Shell command retry limit

Do not run more than 3 failing shell commands in total. After 3 failures, stop and report
the full error output to the user.

## Next

> PR merged. Last step — clean up the worktree from the `develop` window (you can't remove
> the worktree you're standing in):
>
> ```
> code [develop-worktree]
> ```
>
> Then run `/jli-cleans <worktree-folder-name>` there (the folder name is the last
> segment of this worktree's path, e.g. `<repo-name>_<type>-<slug>`).
