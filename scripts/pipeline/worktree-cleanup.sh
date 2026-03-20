#!/usr/bin/env bash
# scripts/pipeline/worktree-cleanup.sh
#
# Usage: bash scripts/pipeline/worktree-cleanup.sh <worktree-path>
#
# Removes a pipeline worktree directory, prunes stale git entries, and
# deletes the local branch. Safe to re-run if a prior attempt was partial.
#
# Run after pr-complete.sh (or after a manual GitHub merge/close).
# Follow with refresh-develop.sh to fast-forward the develop worktree.

set -euo pipefail

WORKTREE="${1:?Usage: worktree-cleanup.sh <worktree-path>}"

BARE_REPO="$(cd "$WORKTREE/.." && pwd)"
WT_NAME="$(basename "$WORKTREE")"

# Read branch name before the worktree is removed
BRANCH="$(git -C "$WORKTREE" branch --show-current 2>/dev/null || true)"

echo "==> Removing worktree '${WT_NAME}'..."
git -C "$BARE_REPO" worktree remove --force "$WT_NAME" 2>/dev/null || true
# If git already deregistered the entry, the directory may still exist on disk
if [ -d "$WORKTREE" ]; then
  rm -rf "$WORKTREE"
fi

echo "==> Pruning stale worktree entries..."
git -C "$BARE_REPO" worktree prune

if [ -n "$BRANCH" ]; then
  echo "==> Deleting local branch '${BRANCH}'..."
  # Use -D (force) because GitHub rebase-merge does not create a merge commit,
  # so git never considers the local branch "fully merged".
  git -C "$BARE_REPO" branch -D "$BRANCH" 2>/dev/null || true
fi

echo "==> Worktree '${WT_NAME}' cleaned up."
