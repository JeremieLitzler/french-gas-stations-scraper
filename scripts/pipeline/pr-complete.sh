#!/usr/bin/env bash
# scripts/pipeline/pr-complete.sh
#
# Usage: bash scripts/pipeline/pr-complete.sh <worktree-path> <pr-url>
#
# Merges the PR (rebase strategy), removes the worktree, prunes git state,
# deletes the local branch, and fast-forwards develop to origin.
#
# Must be run BEFORE the worktree is removed so the branch name can be read.
#
# Arguments:
#   <worktree-path>  Absolute path to the feature worktree (e.g. .../feat_slug).
#   <pr-url>         Full GitHub PR URL to merge.

set -euo pipefail

WORKTREE="${1:?Usage: pr-complete.sh <worktree-path> <pr-url>}"
PR_URL="${2:?Usage: pr-complete.sh <worktree-path> <pr-url>}"

BARE_REPO="$(cd "$WORKTREE/.." && pwd)"
WT_NAME="$(basename "$WORKTREE")"
BRANCH="$(git -C "$WORKTREE" branch --show-current)"
DEVELOP="${BARE_REPO}/develop"

echo "==> Merging PR (rebase)..."
# Run from bare repo root so `gh` does not attempt a local `git switch develop`
# (which would fail because develop is already checked out in its own worktree).
(cd "$BARE_REPO" && gh pr merge "$PR_URL" --rebase --delete-branch)

echo "==> Removing worktree '${WT_NAME}'..."
git -C "$BARE_REPO" worktree remove --force "$WT_NAME" 2>/dev/null || true
# If git already deregistered the entry (e.g. a prior partial run), the
# directory may still exist on disk — delete it manually.
if [ -d "$WORKTREE" ]; then
  rm -rf "$WORKTREE"
fi

echo "==> Pruning stale worktree entries..."
git -C "$BARE_REPO" worktree prune

echo "==> Deleting local branch '${BRANCH}'..."
# Use -D (force) because GitHub rebase-merge does not create a merge commit,
# so git never considers the local branch "fully merged".
git -C "$BARE_REPO" branch -D "$BRANCH" 2>/dev/null || true

echo "==> Fetching origin and updating develop..."
git -C "$BARE_REPO" fetch origin
git -C "$DEVELOP" pull origin develop

echo "Done. develop is up to date."
