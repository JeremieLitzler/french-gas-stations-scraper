#!/usr/bin/env bash
# scripts/pipeline/worktree-create.sh
#
# Usage: bash scripts/pipeline/worktree-create.sh <type> <slug>
#
# Creates a git worktree for a new feature/fix branch, installs npm deps,
# and prints the absolute worktree path as "Worktree: <path>".
#
# Works when called from any worktree (develop/, feat_*/,  ci_*/) because
# the bare repo is always the parent directory of whichever worktree holds
# this script.
#
# Prerequisites: run fetch-origin.sh before this script.

set -euo pipefail

TYPE="${1:?Usage: worktree-create.sh <type> <slug>}"
SLUG="${2:?Usage: worktree-create.sh <type> <slug>}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# scripts/pipeline is 2 levels below the worktree root, which is 1 level
# below the bare repo: <bare-repo>/<worktree>/scripts/pipeline
BARE_REPO="$(cd "$SCRIPT_DIR/../../.." && pwd)"

WT_NAME="${TYPE}_${SLUG}"
BRANCH="${TYPE}/${SLUG}"
WT_PATH="${BARE_REPO}/${WT_NAME}"

echo "==> Creating worktree '${WT_NAME}' on branch '${BRANCH}'..."
git -C "$BARE_REPO" worktree add "$WT_NAME" -b "$BRANCH" origin/develop

echo "==> Installing npm dependencies in ${WT_PATH}..."
(cd "$WT_PATH" && npm install --silent)

echo "Worktree: ${WT_PATH}"
