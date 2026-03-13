# Claude Agent Brain Update: Parallel Development with Git Worktrees

## Overview

When a repo is cloned with `git clone --bare`, every branch can be checked out as an isolated **worktree** — a real directory on disk with its own working tree but sharing the same `.git` object store. This means multiple Claude instances can work on different branches simultaneously without stepping on each other.

---

## Why Worktrees Over Branches / Stashes

| Concern                  | Classic clone                              | Bare + worktrees                                |
| ------------------------ | ------------------------------------------ | ----------------------------------------------- |
| Switching context        | `git stash` / `git checkout` (destructive) | Just open another terminal in another directory |
| Parallel agents          | Impossible (shared index)                  | Native — each worktree has its own index        |
| Disk usage               | Full copy per clone                        | One object store, thin working trees            |
| Merge conflicts at setup | Frequent                                   | Zero — each agent works in isolation            |
| CI-like discipline       | Hard                                       | Natural — each worktree maps to one branch      |

---

## Recommended Directory Convention

Worktrees live **inside** the bare repo directory, named `<type>_<slug>`:

```plaintext
<repo>.git/
  develop/                  ← long-lived worktree for develop
  feat_new-ui/              ← one Claude instance
  fix_auth-bug/             ← another Claude instance
  ci_add-support-worktree/  ← this file lives here
```

The `<type>` prefix matches the branch type (`feat`, `fix`, `chore`, `ci`, `docs`, …) and is separated from the slug by an underscore. This keeps all worktrees co-located with the bare repo and immediately readable in a directory listing.

Create a worktree for a task (run from anywhere, `GIT_DIR` points at the bare repo):

```bash
git -C <repo>.git worktree add <type>_<slug> -b <type>/<slug>
```

Remove it when merged:

```bash
git -C <repo>.git worktree remove <type>_<slug>
git -C <repo>.git branch -d <type>/<slug>
```

---

## Agent Operating Protocol

### 1. One task → one worktree → one terminal

Each Claude instance receives **one well-scoped task** and operates in **its own worktree directory**. It never touches files outside that directory.

```plaintext
Terminal A  →  <repo>.git/feat_notifications   →  branch: feat/notifications
Terminal B  →  <repo>.git/fix_post-scheduling  →  branch: fix/post-scheduling
Terminal C  →  <repo>.git/ci_add-support-worktree → branch: ci/add-support-worktree
```

### 2. Task handoff format

When spawning a parallel Claude agent, supply:

```plaintext
Task:       <one-sentence description>
Worktree:   <repo>.git/<type>_<slug>/
Branch:     <type>/<slug>
Base:       develop
Scope:      <list of files / modules the agent may touch>
Definition of Done: <acceptance criteria>
```

### 3. Agent startup checklist

Before touching any code, the agent MUST:

1. `git status` — confirm clean working tree.
2. `git log --oneline -5` — understand recent history on this branch.
3. Read any relevant `CLAUDE.md` or project docs in the worktree.
4. Confirm task scope matches the branch name.

### 4. Agent work loop

```plaintext
read task → read relevant files → plan → implement → run tests → commit
```

- Commits go on the local branch only.
- Do **not** push or open PRs unless explicitly instructed.
- Do **not** run `git merge`, `git rebase`, or `git reset --hard` without user confirmation.

### 5. Finishing a task

The agent reports back:

```plaintext
Status:   done | blocked | needs-review
Branch:   <branch-name>
Commits:  <short log>
Notes:    <anything the orchestrator needs to know before merging>
```

---

## Parallelism Patterns

### Pattern A — Feature Fan-Out

Break a large feature into independent sub-tasks, assign one worktree each, merge back to `develop` in order of completion.

```plaintext
develop
  ├── feat/notifications-model       (Agent 1)
  ├── feat/notifications-api         (Agent 2)
  └── feat/notifications-ui          (Agent 3, unblocked after Agent 1 merges)
```

### Pattern B — Bug Swarm

Multiple bugs reported at once. Each gets its own fix branch and Claude instance. Review + merge independently.

```plaintext
develop
  ├── fix/post-scheduling-timezone   (Agent 1)
  ├── fix/image-upload-memory-leak   (Agent 2)
  └── fix/oauth-token-refresh        (Agent 3)
```

### Pattern C — Spike + Implement

Agent 1 runs a research / prototype spike on a throwaway branch.
Agent 2 waits for the spike findings, then implements on a clean branch.

---

## Guardrails for Agents

- **Never** `rm -rf` or delete files outside the worktree's own directory.
- **Never** modify the bare repo's `config`, `hooks`, or `packed-refs` directly.
- **Never** run `git worktree add/remove` from within a worktree — only the orchestrator (human or top-level agent) manages worktree lifecycle.
- **Always** scope file edits to the modules listed in the task handoff.
- **Always** run the project's test suite before committing.

---

## Quick Reference Commands

```bash
# List all active worktrees
git worktree list

# Add a worktree for a new feature branch (run from inside <repo>.git/)
git worktree add feat_foo -b feat/foo

# Add a worktree for an existing remote branch
git worktree add fix_bar origin/fix/bar

# Remove a worktree after merging
git worktree remove feat_foo

# Prune stale worktree refs (after manual directory deletion)
git worktree prune
```

---

## Agent Definition Updates Required

The table below lists every `.claude/agents` file that needs changes to support the worktree workflow, what must change, and why.

### agent-0-orchestrator.md — High impact

| Where                 | Current                                       | Required change                                                                                                                                                      |
| --------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Step 0                | Delegates branch creation to agent-4          | Instruct agent-4 (Task 1 + Task 2) to create the worktree and **report back the worktree path**; orchestrator then stores it and passes it to every subsequent agent |
| Every Task tool spawn | No worktree path in handoff                   | Add `Worktree:` field (value received from agent-4) to every subagent task handoff                                                                                   |
| Step 5 — end          | "return local repository to `develop` branch" | Instruct agent-4 to remove the worktree (`git worktree remove`) — develop refresh is also handled by agent-4 Task 5                                                  |

### agent-4-git.md — High impact

| Task   | Current                         | Required change                                                                                                                                                                                     |
| ------ | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Task 1 | `git pull` on develop           | `git fetch origin` — bare repo has no working tree to pull into                                                                                                                                     |
| Task 2 | `git checkout -b <type>/<slug>` | Run `git worktree add <type>_<slug> -b <type>/<slug>` from inside `<repo>.git/`; report the resulting worktree path back to the orchestrator                                                        |
| Task 5 | Push branch                     | Run from inside the worktree directory received from the orchestrator; after push, also pull latest into the `develop` worktree (`git -C <repo>.git/develop pull`) so it is ready for the next task |

### agent-6-reviewer.md — Medium impact

`npm run lint` and `npm run type-check` are currently described as running "from the repository root". With worktrees the bare repo root has no `node_modules`. The agent must `cd` to the worktree path passed by the orchestrator before running any shell command.

### agent-3-tester.md — Medium impact

Same issue as the reviewer: `npm run test` must run from the **worktree root**, not the bare repo root. The agent must use the worktree path from the task handoff explicitly.

### agent-2-coder.md — Low impact

No git or shell commands, but all file reads and writes are implicitly scoped to the worktree. Add one line: _"All paths are relative to the worktree root passed by the orchestrator."_

### agent-1-specs.md, agent-5-security.md — Low impact

No git or shell operations, but both agents write output files to `[task-folder]` which lives inside the worktree. They must receive the `Worktree:` field in their task handoff so they can resolve `[task-folder]` as an absolute path.

---

### Change summary

| Agent file              | Impact | Change type                                                                     |
| ----------------------- | ------ | ------------------------------------------------------------------------------- |
| agent-0-orchestrator.md | High   | Worktree lifecycle (create + remove) + task handoff format                      |
| agent-4-git.md          | High   | Task 1 → fetch, Task 2 → verify, Task 5 → cd to worktree                        |
| agent-6-reviewer.md     | Medium | Explicit `cd <worktree>` before lint / type-check                               |
| agent-3-tester.md       | Medium | Explicit `cd <worktree>` before test run                                        |
| agent-2-coder.md        | Low    | Note about path root                                                            |
| agent-1-specs.md        | Low    | Receive `Worktree:` in task handoff to resolve `[task-folder]` as absolute path |
| agent-5-security.md     | Low    | Same as above                                                                   |

---

## Updating Agent Memory

After validating this workflow on a real task, update the project memory file (path shown by Claude at session start) with:

```markdown
## Worktree Workflow

- Repo is a bare clone; worktrees live **inside** `<repo>.git/` as `<type>_<slug>/`
- Naming: directory `feat_my-feature` ↔ branch `feat/my-feature`
- One Claude instance per worktree terminal
- See CLAUDE-AGENT-WITH-WORKTREE.md on branch ci/add-support-worktree for full protocol
```
