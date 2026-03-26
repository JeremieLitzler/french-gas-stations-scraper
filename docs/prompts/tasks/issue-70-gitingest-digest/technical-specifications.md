# Technical Specifications — Issue #70: gitingest digest generation

## Files Created or Changed

| File | Change |
|------|--------|
| `scripts/pipeline/gitingest.sh` | New script — validates worktree argument, checks `digest.txt` is git-ignored, verifies `gitingest` binary is present, then runs `gitingest` with the full exclusion list to produce `<worktree>/digest.txt`. |
| `.gitignore` | Added `digest.txt` under the `# Generated files` section. |
| `.claude/agents/agent-4-git.md` | Added **Task 5.5** between Task 5 and Task 6 — instructs the agent to run `gitingest.sh` with the worktree path and report `digest.txt written`. |
| `.claude/agents/agent-0-orchestrator.md` | Added **Step 4.5** between Step 4 and Step 5 — instructs the orchestrator to invoke agent-4-git Task 5.5 after the push and before PR creation. |
| `.claude/agents/agent-2-coder.md` | Added conditional `digest.txt` read instruction at the top of initial instructions for Bug Feedback Loop re-runs. |
| `.claude/agents/agent-3-test-writer.md` | Added conditional `digest.txt` read instruction in Pass 2, before reading individual implementation files. |
| `.claude/agents/agent-6-reviewer.md` | Added conditional `digest.txt` read instruction at the start of the agent's reading sequence. |

## Technical Choices

### Argument validation before directory resolution

The script validates that an argument was provided and is non-empty before calling `cd` to resolve the absolute path. This prevents `cd` from silently resolving to the home directory on an empty string, which would scope the digest to the wrong subtree.

### `git check-ignore` as a pre-flight safety net

Instead of trusting that `.gitignore` was updated correctly, the script uses `git check-ignore -q digest.txt` inside the worktree to confirm the file is actually ignored before generating it. This catches `.gitignore` misconfiguration before any file is written, rather than after — cheaper to fail early.

### `command -v gitingest` binary check

`set -euo pipefail` would cause a `command not found` error to terminate the script with a non-descriptive message. An explicit pre-flight check produces a clear install instruction, reducing operator confusion in CI environments where `gitingest` may not be pre-installed.

### Absolute `--output` path

The script sets `OUTPUT_FILE="$WORKTREE/digest.txt"` and passes it explicitly rather than relying on `gitingest`'s default output (which writes `digest.txt` in the CWD). This ensures the file always lands at the worktree root regardless of where the script is called from.

### Conditional digest.txt read in consumer agents

Each consumer agent instruction uses "if it exists" wording (R6) rather than a mandatory read. This keeps the pipeline forward-compatible: agents called before Task 5.5 (e.g. Pass 2 test-writer, which runs before Step 4) will not fail if `digest.txt` is absent, while agents invoked after Step 4.5 benefit from the digest.

## Self-Code Review — Three potential issues identified

1. **`docs/prompts/tasks/**/business-specifications.md` is not excluded.** The spec only requires excluding `README.md`, `review-results.md`, `test-results.md`, and `security-guidelines.md` from the pipeline artifact folder. `business-specifications.md` and `test-cases.md` are intentionally included (they are useful context for agents reading the digest). This is correct per the spec.

2. **`gitingest` `--exclude-pattern` glob interpretation.** The `**` double-glob pattern (`docs/prompts/tasks/**/README.md`) may not be interpreted the same way by all shells. `gitingest` passes patterns to its internal path-matching layer (Python `fnmatch` / `pathlib`). Tested: `gitingest` CLI accepts and handles `**` patterns correctly. No issue.

3. **`set -euo pipefail` and the `!` negation in the `git check-ignore` block.** In bash, `if ! cmd; then` correctly prevents the `set -e` trap from firing on the non-zero exit of `cmd` inside the `if` condition. The negation is safe. No issue.

status: ready
