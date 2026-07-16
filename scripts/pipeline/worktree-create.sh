#!/usr/bin/env bash
# scripts/pipeline/worktree-create.sh
#
# Usage: bash scripts/pipeline/worktree-create.sh <type> <slug>
#
# Creates a git worktree for a new feature/fix branch, installs npm deps,
# and prints the absolute worktree path as "Worktree: <path>".
#
# Works when called from any worktree (develop/, feat_*/, ci_*/) because
# the bare repo's shared git directory is discovered via
# `git rev-parse --git-common-dir` rather than assumed from folder nesting.
#
# Prerequisites: run fetch-origin.sh before this script.

set -euo pipefail

TYPE="${1:?Usage: worktree-create.sh <type> <slug>}"
SLUG="${2:?Usage: worktree-create.sh <type> <slug>}"

BARE_REPO="$(git rev-parse --path-format=absolute --git-common-dir)"
REPO_PARENT="$(dirname "$BARE_REPO")"
REPO_NAME="$(basename "$BARE_REPO" .git)"

WT_NAME="${REPO_NAME}_${TYPE}-${SLUG}"
BRANCH="${TYPE}/${SLUG}"
WT_PATH="${REPO_PARENT}/${WT_NAME}"

echo "==> Creating worktree '${WT_NAME}' on branch '${BRANCH}'..."
git -C "$BARE_REPO" worktree add "$WT_PATH" -b "$BRANCH" origin/develop

echo "==> Installing npm dependencies in ${WT_PATH}..."
(cd "$WT_PATH" && npm install --silent)

echo "Worktree: ${WT_PATH}"
