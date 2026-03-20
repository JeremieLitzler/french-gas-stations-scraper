#!/usr/bin/env bash
# scripts/pipeline/pr-complete.sh
#
# Usage: bash scripts/pipeline/pr-complete.sh <pr-url>
#
# Merges an open PR into develop (rebase strategy) and deletes the remote
# branch. Skips gracefully if the PR is already merged or closed.
#
# Run from any pipeline worktree. Follow with:
#   worktree-cleanup.sh <worktree-path>
#   refresh-develop.sh

set -euo pipefail

PR_URL="${1:?Usage: pr-complete.sh <pr-url>}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BARE_REPO="$(cd "$SCRIPT_DIR/../../.." && pwd)"

echo "==> Checking PR state..."
PR_STATE="$(gh pr view "$PR_URL" --json state --jq '.state' 2>/dev/null || echo "UNKNOWN")"

if [ "$PR_STATE" = "MERGED" ]; then
  echo "    PR already merged — nothing to do."
  exit 0
elif [ "$PR_STATE" = "CLOSED" ]; then
  echo "    PR is closed (not merged) — nothing to do."
  exit 0
fi

echo "==> Merging PR (rebase)..."
# Run from bare repo root so `gh` does not attempt a local `git switch develop`
# (which would fail because develop is already checked out in its own worktree).
(cd "$BARE_REPO" && gh pr merge "$PR_URL" --rebase --delete-branch)

echo "==> PR merged."
