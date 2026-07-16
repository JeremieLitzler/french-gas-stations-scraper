#!/usr/bin/env bash
# scripts/pipeline/sub-issue-folder-create.sh
#
# Usage: bash scripts/pipeline/sub-issue-folder-create.sh <worktree-path> <parent-id> <parent-slug> <sub-id>
#
# Creates the per-sub-issue output subfolder inside a merged parent spec's
# task folder, for the sub-issue variant of /jli-sets-up:
#   <worktree-path>/docs/prompts/tasks/issue-<parent-id>-<parent-slug>/sub-issue-<sub-id>/
#
# The subfolder starts empty; downstream jli- commands (jli-codes,
# jli-reviews-code, jli-runs-tests) fill it with technical-specifications.md,
# review-results.md, and test-results.md.
#
# Fails if the parent task folder is missing (the merged spec must already be
# present in the worktree) or if the sub-issue subfolder already exists
# (re-running would silently reuse stale output from a prior cycle).

set -euo pipefail

WORKTREE="${1:?Usage: sub-issue-folder-create.sh <worktree-path> <parent-id> <parent-slug> <sub-id>}"
PARENT_ID="${2:?Usage: sub-issue-folder-create.sh <worktree-path> <parent-id> <parent-slug> <sub-id>}"
PARENT_SLUG="${3:?Usage: sub-issue-folder-create.sh <worktree-path> <parent-id> <parent-slug> <sub-id>}"
SUB_ID="${4:?Usage: sub-issue-folder-create.sh <worktree-path> <parent-id> <parent-slug> <sub-id>}"

PARENT_FOLDER="docs/prompts/tasks/issue-${PARENT_ID}-${PARENT_SLUG}"
SUB_FOLDER="${PARENT_FOLDER}/sub-issue-${SUB_ID}"

if [ ! -d "${WORKTREE}/${PARENT_FOLDER}" ]; then
  echo "error: parent task folder not found: ${PARENT_FOLDER}" >&2
  echo "The merged spec must already exist in the worktree before creating a sub-issue subfolder." >&2
  exit 1
fi

if [ -e "${WORKTREE}/${SUB_FOLDER}" ]; then
  echo "error: sub-issue folder already exists: ${SUB_FOLDER}" >&2
  exit 1
fi

echo "==> Creating sub-issue folder '${SUB_FOLDER}'..."
mkdir -p "${WORKTREE}/${SUB_FOLDER}"

echo "Sub-issue folder: ${SUB_FOLDER}"
