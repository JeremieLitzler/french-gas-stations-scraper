# Security Guidelines — Issue #70: gitingest digest generation

## Scope

Pipeline-only change: a shell script and agent markdown edits. No frontend, no Netlify function, no user-facing surface. The attack surface is restricted to local shell execution and file-system side effects.

## Rules

1. **Validate the worktree argument before use** — `scripts/pipeline/gitingest.sh`
   Reject empty or missing argument with a non-zero exit and a clear message before any file-system or subprocess operation. Prevents accidental execution against an unintended path if called without arguments from CI.

2. **Restrict digest scope to the worktree subtree** — `scripts/pipeline/gitingest.sh`
   The `gitingest` invocation must be scoped strictly to the worktree path passed as argument. It must not traverse parent directories or the bare-repo root. Prevents inadvertent inclusion of secrets (`.env`, credentials) stored outside the worktree.

3. **Exclude secrets-adjacent files from the digest** — `scripts/pipeline/gitingest.sh`
   The exclusion list (R1) already covers agent config and pipeline artifacts. Extend it to also exclude `.env*`, `*.pem`, `*.key`, and `node_modules/`. Prevents sensitive local files from being written into `digest.txt` and later read by a language model.

4. **Ensure `digest.txt` is `.gitignore`-listed before the script runs** — `.gitignore`
   R2 requires the entry; the script must still fail gracefully if the entry is missing rather than silently committing a large generated file. A pre-run check (`git check-ignore digest.txt`) provides an early-exit safety net.

status: ready
