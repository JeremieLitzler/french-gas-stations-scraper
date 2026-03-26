A pipeline issue has been reported: $ARGUMENTS

Follow this workflow to fix it.

## What NOT to do

- Never directly edit files in `develop/` from the main conversation
- Never fix pipeline issues inline during a pipeline run for another issue — this must be a separate worktree
- ALWAYS use `subagent_type="general-purpose"`
- Never run git or gh commands directly — always delegate to agent-4-git via the Agent tool

## Step 1 — Create a GitHub issue

Use `gh issue create` to record:

- What went wrong
- Which agent or file(s) are affected
- What the fix should be

Record the issue number as `[id]` and derive a slug (≤ 30 chars, kebab-case).

## Step 2 — Create a dedicated worktree

Invoke agent-4-git via the Agent tool (`subagent_type="general-purpose"`). Pass the full content of `.claude/agents/agent-4-git.md` as the prompt, then append:

```
Perform Task 1 and Task 2 only.
Type: ci
Slug: <slug>
```

Record the `Worktree: <path>` value printed by the agent as `[worktree]`.

## Step 3 — Apply the fix

Read and edit the affected files directly in the main conversation. You may read and edit:

- `[worktree]/.claude/agents/agent-*.md` — agent instruction files
- `[worktree]/CLAUDE.md` — main project instructions
- `[worktree]/CLAUDE-*.md` — supplementary workflow documents
- `[worktree]/.claude/commands/*.md` — skill files

Do not edit source code, test files, or pipeline artifacts under `docs/prompts/tasks/`.

For every change:

- Apply the minimal fix that resolves the issue
- Consider cascading effects across other agents that rely on the same convention
- List any additional gaps you find but do not fix them without explicit instruction

## Step 4 — Commit

Invoke agent-4-git via the Agent tool (`subagent_type="general-purpose"`). Pass the full content of `.claude/agents/agent-4-git.md` as the prompt, then append:

```
Worktree: [worktree]

Stage only these files and commit them:
<list every file you edited in Step 3>

Use commit type ci(agent) for files under .claude/agents/ or .claude/commands/.
Use commit type docs for CLAUDE*.md files.
Do not push yet.
Closes #[id]
```

## Step 5 — Push and open a PR

Invoke agent-4-git via the Agent tool (`subagent_type="general-purpose"`). Pass the full content of `.claude/agents/agent-4-git.md` as the prompt, then append:

```
Worktree: [worktree]

Perform Task 5 and Task 6.

For Task 5: all files were already committed in the previous step — just push the branch.
For Task 6: derive the PR title from the issue title (#[id]). The PR body must include:
- a summary of what was wrong and what was fixed
- Closes #[id]
Target branch: develop
```

Record the `PR: <url>` value printed by the agent.

Show the user the PR URL and ask for approval to merge.

## Step 6 — Merge and clean up

Once approved, invoke agent-4-git via the Agent tool (`subagent_type="general-purpose"`). Pass the full content of `.claude/agents/agent-4-git.md` as the prompt, then append:

```
Worktree: [worktree]

Perform Task 7 then Task 8.
PR URL: <pr-url>
```
