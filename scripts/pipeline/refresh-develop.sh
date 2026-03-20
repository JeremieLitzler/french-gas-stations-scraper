#!/usr/bin/env bash
# scripts/pipeline/refresh-develop.sh
#
# Usage: bash scripts/pipeline/refresh-develop.sh
#
# Fetches all remote refs and fast-forwards the develop worktree to
# origin/develop. Call this at the end of every pipeline cycle to ensure
# the next pipeline starts from an up-to-date base.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BARE_REPO="$(cd "$SCRIPT_DIR/../../.." && pwd)"
DEVELOP="${BARE_REPO}/develop"

echo "==> Fetching origin..."
git -C "$BARE_REPO" fetch origin

echo "==> Updating develop..."
git -C "$DEVELOP" pull origin develop

echo "==> develop is up to date."
