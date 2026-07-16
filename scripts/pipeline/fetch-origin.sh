#!/usr/bin/env bash
# scripts/pipeline/fetch-origin.sh
#
# Usage: bash scripts/pipeline/fetch-origin.sh [bare-repo-path]
#
# Ensures the bare repo has `origin` configured with the correct fetch
# refspec, then fetches all remote refs.
#
# <bare-repo-path> defaults to the shared git directory of the worktree
# this script is run from (via `git rev-parse --git-common-dir`), which
# is correct regardless of naming/nesting convention.
#
# Called automatically by worktree-create.sh. Run standalone when only
# a fetch is needed (e.g. Task 1 without Task 2).

set -euo pipefail

DEFAULT_BARE="$(git rev-parse --path-format=absolute --git-common-dir)"
BARE_REPO="${1:-$DEFAULT_BARE}"

# Ensure origin remote exists
if ! git -C "$BARE_REPO" remote get-url origin &>/dev/null; then
  REMOTE_URL="$(git remote get-url origin 2>/dev/null || true)"
  if [ -z "$REMOTE_URL" ]; then
    echo "ERROR: origin remote not found in bare repo and could not be inferred." >&2
    echo "Run: git -C \"$BARE_REPO\" remote add origin <url>" >&2
    exit 1
  fi
  git -C "$BARE_REPO" remote add origin "$REMOTE_URL"
fi

# Ensure full refspec so remote-tracking refs stay current
git -C "$BARE_REPO" config remote.origin.fetch "+refs/heads/*:refs/remotes/origin/*"
git -C "$BARE_REPO" fetch origin

echo "==> origin fetched (bare repo: $BARE_REPO)"
