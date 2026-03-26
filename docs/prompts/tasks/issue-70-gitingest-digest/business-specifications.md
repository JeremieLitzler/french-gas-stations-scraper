# Business Specifications — Issue #70: Integrate gitingest digest generation

## Goal

After every successful branch push (Task 5), generate a full codebase snapshot file (`digest.txt`) at the worktree root so that agents in Bug Feedback Loop re-runs can read a single file instead of exploring the codebase file-by-file.

## Scope

Pipeline-only change. No changes to the Vue.js frontend or Netlify function. No runtime behaviour change for end users.

## Rules

### R1 — New pipeline script

A new shell script `scripts/pipeline/gitingest.sh` must accept a worktree path as its sole argument and produce `digest.txt` at that worktree root.

- The script must exclude pipeline artifacts and agent configuration noise: `docs/prompts/tasks/**/README.md`, `docs/prompts/tasks/**/review-results.md`, `docs/prompts/tasks/**/test-results.md`, `docs/prompts/tasks/**/security-guidelines.md`, `*.spec.ts`, `.claude/*`, `scripts/*`.
- If the worktree path is not provided, the script must exit with a non-zero status and a clear error message.

### R2 — digest.txt is not committed

`digest.txt` must be listed in `.gitignore` under the `# Generated files` section so it is never accidentally committed.

### R3 — Task 5.5 in agent-4-git

`.claude/agents/agent-4-git.md` must document a new **Task 5.5** positioned between Task 5 and Task 6:

- Run the `gitingest.sh` script with the worktree path.
- The output file `digest.txt` is produced at the worktree root.
- Do not stage or commit `digest.txt`.

### R4 — Task 5.5 in agent-0-orchestrator

`.claude/agents/agent-0-orchestrator.md` must invoke **Task 5.5** (generate codebase digest) between Step 4 and Step 5 of the pipeline.

### R5 — Digest read instructions for consumer agents

Three agent files must include an instruction to read `digest.txt` when it exists:

- `agent-2-coder.md`: read `digest.txt` first before reading individual files, when in a Bug Feedback Loop re-run.
- `agent-3-test-writer.md`: in Pass 2, read `digest.txt` to understand file structure and exported API surface before reading individual implementation files.
- `agent-6-reviewer.md`: read `digest.txt` for a comprehensive codebase overview before examining changed files.

### R6 — Digest read is conditional

Each consumer agent instruction must be conditional: read `digest.txt` only if it exists at the worktree root. No agent must fail or block if the file is absent.

status: ready
