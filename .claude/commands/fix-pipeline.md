A pipeline issue has been reported: $ARGUMENTS

Follow this workflow to fix it.

## What NOT to do

- Never directly edit files in `develop/` from the main conversation
- Never fix pipeline issues inline during a pipeline run for another issue — this must be a separate worktree
- ALWAYS use `subagent_type="general-purpose"`

## Step 1 — Create a GitHub issue

Use `gh issue create` to record:

- What went wrong
- Which agent or file(s) are affected
- What the fix should be

Record the issue number as `[id]` and derive a slug (≤ 30 chars, kebab-case).

## Step 2 — Create a dedicated worktree

The session runs from `develop/`. The bare repo root is `..`.

```bash
git -C .. fetch origin
git -C .. worktree add ci_<slug> -b ci/<slug> origin/develop
```

Record the resulting worktree absolute path as `[worktree]`.

## Step 3 — Apply the fix

Read and edit the affected files directly in the main conversation. You may read and edit:

- `[worktree]/.claude/agents/agent-*.md` — agent instruction files
- `[worktree]/CLAUDE.md` — main project instructions
- `[worktree]/CLAUDE-*.md` — supplementary workflow documents

Do not edit source code, test files, or pipeline artifacts under `docs/prompts/tasks/`.

For every change:

- Apply the minimal fix that resolves the issue
- Consider cascading effects across other agents that rely on the same convention
- List any additional gaps you find but do not fix them without explicit instruction

## Step 4 — Commit

Stage only the affected files and commit using conventional commits:

- Files under `.claude/agents/` → `ci(agent): <message>`
- Files at the repo root (`CLAUDE*.md`) → `docs: <message>`

Use `rtk git add <files>` and `rtk git commit -m "..."`.

## Step 5 — Push and open a PR

```bash
rtk git push origin ci/<slug>
gh pr create --base develop --title "<title>" --body "<body with Closes #[id]>"
```

Show the user the PR URL and ask for approval to merge.

## Step 6 — Merge and clean up

Once approved, remove the worktree first (so the branch is free), then merge from the bare repo root:

```bash
git -C .. worktree remove --force ci_<slug>
git -C .. worktree prune
cd .. && gh pr merge <pr-url> --rebase --delete-branch
git -C .. fetch origin
```

Then pull latest into `develop/`:

```bash
git pull --rebase origin develop
```
