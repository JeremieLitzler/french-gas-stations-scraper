# Triggering the Pipeline Maintainer from the Main Conversation

This file documents how Claude Code (acting as the orchestrator in the main conversation) must handle a reported pipeline issue — i.e. a problem with agent instructions or workflow files.

## Why This Document Exists

`CLAUDE-AGENT-WORFLOW-ISSUES-HANDLING.md` describes the correct workflow but was written assuming agents are invoked via the native Task tool with `subagent_type="agent-X-name"`. That only works inside `.claude/agents/` agents invoked natively by Claude Code.

**From the main conversation, custom `subagent_type` names are not resolvable.** The `Agent` tool only accepts built-in types (`general-purpose`, `Explore`, `Plan`, etc.). Specialist agents must be invoked by reading their `.md` file and passing the content as the prompt to `Agent(subagent_type="general-purpose")`.

## Correct Workflow

### 1. Recognise the trigger

When the user reports a problem with agent behaviour or pipeline instructions, follow this document — **do not directly edit any file in `develop/`**.

### 2. Create a GitHub issue

Use `gh issue create` to record:

- What went wrong
- Which agent file(s) are affected
- What the fix should be

Record the issue number as `[id]` and derive a slug (≤ 30 chars).

### 3. Create a dedicated worktree

```bash
cd E:/Git/GitHub/french-gas-stations-scraper.git
git fetch origin
git worktree add docs_<slug> -b docs/<slug>
```

### 4. Invoke the pipeline maintainer

Read the agent file, then call the `Agent` tool:

```
Read [worktree]/.claude/agents/agent-7-pipeline-maintainer.md
→ Agent(
    subagent_type="general-purpose",
    prompt="<file content>\n\nIssue: <description>\nWorktree: <absolute path to new worktree>"
  )
```

Wait for the agent to report `status: ready`.

### 5. Invoke the git agent to commit

Read the git agent file, then call:

```
Read [worktree]/.claude/agents/agent-4-git.md
→ Agent(
    subagent_type="general-purpose",
    prompt="<file content>\n\nTask: Task 3 only (commit changed files)\nWorktree: <worktree>"
  )
```

Confirm the commit message with the user before proceeding.

### 6. Invoke the git agent for PR, merge, and cleanup

Invoke agent-4-git three more times for:

- **Task 6** — create PR (target: `develop`); show user the PR URL and ask for approval to merge
- **Task 7** — merge PR (only after user approval)
- **Task 8** — remove worktree and update develop

## What NOT to Do

- **Never directly edit files in `develop/`** — even if the fix seems trivial.
- **Never use `subagent_type="agent-7-pipeline-maintainer"`** or any other custom agent name from the `Agent` tool — it will fail with "Agent type not found".
- **Never fix pipeline issues inline** during a pipeline run for another issue — create a separate GitHub issue and worktree.
