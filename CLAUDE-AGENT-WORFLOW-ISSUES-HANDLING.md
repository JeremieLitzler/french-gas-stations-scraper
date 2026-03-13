# Agent Pipeline Issue Handling

This file documents how to handle issues discovered in the multi-agent pipeline (e.g. broken agent instructions, incorrect git steps, missing edge cases).

## Rule: Never Modify `develop` Directly

The `develop` branch is protected and does not accept direct pushes.
**All fixes to agent pipeline files must go through a dedicated worktree and a PR.**

## Workflow

### 1. Identify the Issue

The user reports a problem with an agent's behaviour or output (e.g. a git command fails, a step is missing, an edge case is not handled).

### 2. Create a GitHub Issue

Open a GitHub issue describing:

- What went wrong
- Which agent file(s) are affected
- What the fix should be

Record the issue number — it becomes the worktree identifier.

### 3. Create a Dedicated Worktree

From inside the bare repository root (`<repo>.git/`):

```bash
git fetch origin
git worktree add docs_<slug> -b docs/<slug>
```

- `<slug>` must be ≤ 30 characters.
- Use type `docs` for agent instruction files (`.claude/agents/`) and this file.
- Use type `ci` for workflow or CI config files.

### 4. Spawn the Pipeline Maintainer Agent

**From a native `.claude/agents/` agent (e.g. agent-0-orchestrator):** Use the Task tool with `subagent_type="agent-7-pipeline-maintainer"`. Pass:

- `Issue: [description of the problem]`
- `Worktree: [absolute path to the worktree]`

**From the main conversation or a general-purpose subagent:** Custom `subagent_type` names are not resolvable. Read the agent file first, then call the `Agent` tool with `subagent_type="general-purpose"`, passing the file content plus the issue details as the prompt:

```
Read [worktree]/.claude/agents/agent-7-pipeline-maintainer.md
→ Agent(
    subagent_type="general-purpose",
    prompt="<file content>\n\nIssue: <description>\nWorktree: <absolute path to worktree>"
  )
```

See `CLAUDE-ISSUE-TRIGGERING-PIPELINE-MAINTAINER-FROM-MAIN-CONVERSATION.md` for the full step-by-step procedure.

The agent will identify all files that need updating, apply the minimal fix, and report back a summary of changes with `status: ready`.

Claude Code may also suggest improvements beyond what the agent proposes — the user decides what to include.

**Never edit files in `<repo>.git/develop/` directly.**

### 5. Commit via the Git Agent

**From a native `.claude/agents/` agent:** Use the Task tool with `subagent_type="agent-4-git"`, instructing it to stage and commit the changed files. Pass `Worktree: [worktree]`.

**From the main conversation or a general-purpose subagent:** Read the git agent file first, then call:

```
Read [worktree]/.claude/agents/agent-4-git.md
→ Agent(
    subagent_type="general-purpose",
    prompt="<file content>\n\nTask: Task 3 only (commit changed files)\nWorktree: <worktree>"
  )
```

Commit rules:

- Files under `.claude/agents/` use commit type and scope `ci(agent)`.
- Files under `docs/` or at the repo root (`CLAUDE*.md`) use commit type `docs`.
- Stage only the affected files.

Confirm the commit message with the user before pushing.

### 6. Push and Open a PR

**From a native `.claude/agents/` agent:** Use the Task tool with `subagent_type="agent-4-git"`, instructing it to perform **Task 6** (create PR) and wait for PR URL, then **Task 7** (merge PR) after user approval. Pass `Worktree: [worktree]`.

**From the main conversation or a general-purpose subagent:** Read the git agent file and use `Agent(subagent_type="general-purpose")` for each of Task 6, Task 7, and Task 8 separately — same pattern as Step 5.

Target branch: `develop`.

### 7. Post-Merge Cleanup

**From a native `.claude/agents/` agent:** Use the Task tool with `subagent_type="agent-4-git"`, instructing it to perform **Task 8** (remove worktree and update develop). Pass `Worktree: [worktree]`.

**From the main conversation or a general-purpose subagent:** Read the git agent file and call `Agent(subagent_type="general-purpose")` with Task 8 as the prompt, same pattern as Step 5.
