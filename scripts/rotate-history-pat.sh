#!/usr/bin/env bash
# Rotates HISTORY_GITHUB_PAT end to end (ADR-014): set in Netlify, redeploy
# production, verify GitHub accepts the token. Never prints or stores the token.
#
# Usage (repo root, own terminal so the token never enters a chat transcript):
#   bash scripts/rotate-history-pat.sh [site-name] [timeout-minutes]
# Requires the Netlify CLI (logged in: `netlify login`), jq and curl.
# Mirror of rotate-history-pat.ps1 for Linux/macOS; keep the two in sync.
set -euo pipefail

SITE="${1:-coup-de-pompe}"
TIMEOUT_MINUTES="${2:-10}"

# Git Bash on Windows rewrites path-like arguments; harmless no-ops elsewhere.
export MSYS_NO_PATHCONV=1
export MSYS2_ARG_CONV_EXCL='*'

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

# --- 0. Prerequisites -------------------------------------------------------
for tool in netlify jq curl; do
  command -v "$tool" >/dev/null 2>&1 || fail "$tool not found. Install it first (netlify: npm i -g netlify-cli)."
done
# `netlify status` exits non-zero outside a linked folder even when logged in, so test the login with an API call.
netlify api listAccountsForUser >/dev/null 2>&1 || fail 'Not logged in to Netlify. Run: netlify login'

netlify_json() {
  local operation="$1" data="$2" output
  output="$(netlify api "$operation" --data "$data")" || fail "netlify $operation failed."
  printf '%s' "$output"
}

site_info="$(netlify_json getSite "$(jq -cn --arg id "$SITE.netlify.app" '{site_id: $id}')")"
site_id="$(jq -r '.id // empty' <<<"$site_info")"
account_id="$(jq -r '.account_id // empty' <<<"$site_info")"
[ -n "$site_id" ] || fail "Site '$SITE' not found."
echo "Site: $(jq -r '.name' <<<"$site_info") ($site_id)"

# --- 1. Read the PAT without echo -------------------------------------------
read -r -s -p 'Paste the new HISTORY_GITHUB_PAT (hidden): ' pat || true
echo >&2
pat="$(printf '%s' "$pat" | tr -d '[:space:]')"
[ -n "$pat" ] || fail 'Empty token.'
[[ "$pat" =~ ^(github_pat_|ghp_)[A-Za-z0-9_]+$ ]] || fail 'Value does not look like a GitHub PAT (expected github_pat_... or ghp_...).'

# --- 2. Set it in Netlify (production context) -------------------------------
# No --scope: the variable keeps the scopes it already has. --secret keeps its value unreadable.
# The token is briefly visible as an argument of this process (the CLI has no stdin option).
netlify env:set HISTORY_GITHUB_PAT "$pat" --context production --secret --site "$site_id" --force >/dev/null \
  || fail 'netlify env:set failed.'
echo 'HISTORY_GITHUB_PAT updated (production).'

# --- 3. Redeploy production and wait -----------------------------------------
build="$(netlify_json createSiteBuild "$(jq -cn --arg id "$site_id" '{site_id: $id, clear_cache: false}')")"
deploy_id="$(jq -r '.deploy_id // empty' <<<"$build")"
[ -n "$deploy_id" ] || fail 'Build triggered but no deploy id returned.'
echo "Build triggered (deploy $deploy_id). Waiting..."

deadline=$((SECONDS + TIMEOUT_MINUTES * 60))
state=''
while :; do
  sleep 10
  deploy="$(netlify_json getDeploy "$(jq -cn --arg id "$deploy_id" '{deploy_id: $id}')")"
  state="$(jq -r '.state' <<<"$deploy")"
  echo "  state: $state"
  [ "$state" != 'error' ] || fail "Deploy failed: $(jq -r '.error_message // "unknown"' <<<"$deploy")"
  [ "$state" != 'ready' ] || break
  [ "$SECONDS" -lt "$deadline" ] || fail "Deploy not ready after $TIMEOUT_MINUTES minutes (last state: $state)."
done
echo 'Deploy ready.'

# --- 4. Verify the token against the history repo ----------------------------
# `netlify env:get` does not resolve the site outside a linked folder, so read through the API.
production_env_value() {
  local variable
  variable="$(netlify_json getEnvVar "$(jq -cn --arg a "$account_id" --arg s "$site_id" --arg k "$1" '{account_id: $a, site_id: $s, key: $k}')")"
  jq -r '[.values[] | select(.context == "production" or .context == "all")] | sort_by(.context != "production") | (.[0].value // "")' <<<"$variable" | tr -d '[:space:]'
}
owner="$(production_env_value HISTORY_GITHUB_OWNER)"
repo="$(production_env_value HISTORY_GITHUB_REPO)"
[ -n "$owner" ] && [ -n "$repo" ] || fail 'Could not read HISTORY_GITHUB_OWNER / HISTORY_GITHUB_REPO from Netlify.'

encoded_owner="$(jq -rn --arg v "$owner" '$v | @uri')"
encoded_repo="$(jq -rn --arg v "$repo" '$v | @uri')"
# The Authorization header goes through curl's stdin config so the token never appears in a process argument list.
# The body is discarded by keeping only the last line (the status code): `-o /dev/null` fails for a native curl under Git Bash.
newline=$'\n'
auth_header="header = \"Authorization: Bearer $pat\""
response="$(printf '%s\n' "$auth_header" | curl -sS -w "${newline}%{http_code}" -K - \
  -H 'Accept: application/vnd.github+json' -H 'User-Agent: rotate-history-pat' \
  "https://api.github.com/repos/$encoded_owner/$encoded_repo/contents/history.csv")" || fail 'GitHub request failed.'
unset auth_header
status="${response##*"$newline"}"
unset pat

case "$status" in
  200) echo "OK: GitHub accepts the token ($owner/$repo, history.csv found)." ;;
  404) echo "OK: GitHub accepts the token ($owner/$repo; history.csv does not exist yet)." ;;
  401) fail 'GitHub returned 401: the token value is wrong. Regenerate it, copy it again, and re-run.' ;;
  403) fail 'GitHub returned 403: the token lacks Contents read/write on this repository.' ;;
  *) fail "Unexpected GitHub status $status." ;;
esac
