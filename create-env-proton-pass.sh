#!/usr/bin/env bash
# Creates .env.proton-pass at the repo root from .env.proton-pass-example,
# resolving the real Proton Pass share/item IDs via pass-cli (see README.md
# "Running Netlify functions locally").
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
EXAMPLE_FILE="$REPO_ROOT/.env.proton-pass-example"
TARGET_FILE="$REPO_ROOT/.env.proton-pass"

VAULT_NAME="Common"
ITEM_TITLE="(local) French Gas Stations Scrapper GitHub OAuth"

command -v pass-cli >/dev/null || { echo "pass-cli not found in PATH. Install it and run 'pass-cli login' first." >&2; exit 1; }
command -v jq >/dev/null || { echo "jq not found in PATH." >&2; exit 1; }
[ -f "$EXAMPLE_FILE" ] || { echo "Missing $EXAMPLE_FILE" >&2; exit 1; }

if [ -f "$TARGET_FILE" ]; then
  read -rp ".env.proton-pass already exists at $TARGET_FILE. Overwrite? [y/N] " REPLY
  [[ "$REPLY" =~ ^[Yy]$ ]] || { echo "Aborted."; exit 0; }
fi

echo "Resolving vault share id for '$VAULT_NAME'..."
SHARE_ID=$(pass-cli vault list --output json | jq -r --arg name "$VAULT_NAME" '.vaults[] | select(.name == $name) | .share_id')
[ -n "$SHARE_ID" ] || { echo "Could not resolve share id for vault '$VAULT_NAME'." >&2; exit 1; }

echo "Resolving item id for '$ITEM_TITLE'..."
ITEM_ID=$(pass-cli item list "$VAULT_NAME" --output json | jq -r --arg title "$ITEM_TITLE" '.items[] | select(.content.title == $title) | .id')
[ -n "$ITEM_ID" ] || { echo "Could not resolve item id for '$ITEM_TITLE' in vault '$VAULT_NAME'." >&2; exit 1; }

echo "SHARE_ID=$SHARE_ID"
echo "ITEM_ID=$ITEM_ID"

sed \
  -e "s|\[share-id-of-target-vault\]|$SHARE_ID|g" \
  -e "s|\[item-id-in-target-vault\]|$ITEM_ID|g" \
  "$EXAMPLE_FILE" > "$TARGET_FILE"

echo "Wrote $TARGET_FILE"
