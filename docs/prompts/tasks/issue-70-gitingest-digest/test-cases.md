# Test Cases — Issue #70: gitingest digest generation

## Notes on scope

This feature is entirely pipeline-level: a shell script (`gitingest.sh`) and edits to agent markdown files. There are no TypeScript source files and no runtime application behaviour to test with Vitest. Structural correctness of agent markdown edits is verified by human review and by `vue-tsc` (which ignores `.md` files).

Shell script behaviour is verifiable through manual / CI integration testing (Bats or equivalent). The scenarios below describe the observable behaviour of `scripts/pipeline/gitingest.sh`.

---

## TC-01 — Missing argument exits with non-zero status and error message

**Precondition:** The script is called with no arguments.

**Action:** Run `bash scripts/pipeline/gitingest.sh`.

**Expected outcome:** The process exits with a non-zero status code. Standard error contains a message indicating that a worktree path argument is required.

---

## TC-02 — Valid worktree path produces digest.txt at worktree root

**Precondition:** A valid worktree path is provided. The worktree contains source files. `digest.txt` does not yet exist at the worktree root.

**Action:** Run `bash scripts/pipeline/gitingest.sh <worktree-path>`.

**Expected outcome:** The process exits with status 0. A file named `digest.txt` exists at `<worktree-path>/digest.txt` with non-empty content.

---

## TC-03 — Excluded paths are absent from the digest

**Precondition:** The worktree contains files matching the exclusion patterns: `docs/prompts/tasks/**/README.md`, `docs/prompts/tasks/**/review-results.md`, `docs/prompts/tasks/**/test-results.md`, `docs/prompts/tasks/**/security-guidelines.md`, a `*.spec.ts` file, a file under `.claude/`, a file under `scripts/`, a `.env` file, a `*.pem` file, a `*.key` file, and a file under `node_modules/`.

**Action:** Run `bash scripts/pipeline/gitingest.sh <worktree-path>` and inspect `digest.txt`.

**Expected outcome:** None of the files matching the exclusion patterns appear in `digest.txt`. Regular source files (e.g. `src/App.vue`) are present.

---

## TC-04 — digest.txt is not staged or committed after the script runs

**Precondition:** `digest.txt` is listed in `.gitignore`. The script has been run and `digest.txt` exists.

**Action:** Run `git status` inside the worktree.

**Expected outcome:** `digest.txt` is not listed as a modified or untracked file (it is ignored by git).

---

## TC-05 — .gitignore entry for digest.txt exists under the correct section

**Precondition:** The updated `.gitignore` file is read.

**Action:** Search `.gitignore` for `digest.txt`.

**Expected outcome:** The entry `digest.txt` is present under the `# Generated files` section (or equivalent comment).

---

## TC-06 — Digest scope is restricted to the worktree subtree

**Precondition:** A valid worktree path is provided. Files exist both inside the worktree and in parent directories outside it.

**Action:** Run `bash scripts/pipeline/gitingest.sh <worktree-path>` and inspect `digest.txt`.

**Expected outcome:** Only files within `<worktree-path>` appear in the digest. No file paths from parent directories or the bare-repo root are present.

---

## Agent markdown edits — no runtime tests

The following rules (R3, R4, R5, R6) describe structural edits to agent `.md` files:

- R3: `agent-4-git.md` gains a Task 5.5 section.
- R4: `agent-0-orchestrator.md` gains a Step 4.5 invocation between Step 4 and Step 5.
- R5 / R6: `agent-2-coder.md`, `agent-3-test-writer.md`, `agent-6-reviewer.md` each gain a conditional `digest.txt` read instruction.

**No runtime tests — verified by human review.**

status: ready
