#!/usr/bin/env bash
# scripts/pipeline/pr-create.sh
#
# Usage: bash scripts/pipeline/pr-create.sh <worktree-path> <title> <body-file>
#
# Pushes the current branch and opens a PR against `develop`.
# Prints the PR URL as "PR: <url>".
#
# Arguments:
#   <worktree-path>  Absolute path to the feature worktree.
#   <title>          PR title (≤70 chars, imperative mood).
#   <body-file>      Path to a file containing the full PR body (markdown).

set -euo pipefail

WORKTREE="${1:?Usage: pr-create.sh <worktree-path> <title> <body-file>}"
TITLE="${2:?Usage: pr-create.sh <worktree-path> <title> <body-file>}"
BODY_FILE="${3:?Usage: pr-create.sh <worktree-path> <title> <body-file>}"

BRANCH="$(git -C "$WORKTREE" branch --show-current)"

echo "==> Pushing branch '${BRANCH}' to origin..."
git -C "$WORKTREE" push origin "$BRANCH"

echo "==> Creating PR..."
PR_URL="$(cd "$WORKTREE" && gh pr create \
  --base develop \
  --title "$TITLE" \
  --body-file "$BODY_FILE")"

echo "PR: ${PR_URL}"
