#!/usr/bin/env bash
# scripts/pipeline/gitingest.sh <worktree-path>
#
# Generate a single-file codebase digest at <worktree-path>/digest.txt.
# digest.txt is excluded from git via .gitignore and must never be committed.
#
# Usage:
#   bash scripts/pipeline/gitingest.sh /abs/path/to/worktree

set -euo pipefail

# ── Argument validation ────────────────────────────────────────────────────────

if [[ $# -lt 1 || -z "${1-}" ]]; then
  echo "Error: worktree path argument is required." >&2
  echo "Usage: bash scripts/pipeline/gitingest.sh <worktree-path>" >&2
  exit 1
fi

WORKTREE="$1"

if [[ ! -d "$WORKTREE" ]]; then
  echo "Error: worktree path does not exist or is not a directory: $WORKTREE" >&2
  exit 1
fi

# Resolve to an absolute path so all subsequent references are unambiguous.
WORKTREE="$(cd "$WORKTREE" && pwd)"

# ── Safety check: digest.txt must be git-ignored ──────────────────────────────

if ! git -C "$WORKTREE" check-ignore -q digest.txt 2>/dev/null; then
  echo "Error: digest.txt is not listed in .gitignore for this worktree." >&2
  echo "Add 'digest.txt' under the '# Generated files' section before running this script." >&2
  exit 1
fi

OUTPUT_FILE="$WORKTREE/digest.txt"

# ── Dependency check ──────────────────────────────────────────────────────────

if ! command -v gitingest &>/dev/null; then
  echo "Error: 'gitingest' is not installed or not in PATH." >&2
  echo "Install it with: pip install gitingest" >&2
  exit 1
fi

# ── Generate digest ───────────────────────────────────────────────────────────

gitingest "$WORKTREE" \
  --output "$OUTPUT_FILE" \
  -e "/docs/prompts/tasks/**/README.md,/docs/prompts/tasks/**/review-results.md,/docs/prompts/tasks/**/test-results.md,/docs/prompts/tasks/**/security-guidelines.md,*.spec.ts,.claude/*,scripts/*"

echo "Digest written to: $OUTPUT_FILE"
