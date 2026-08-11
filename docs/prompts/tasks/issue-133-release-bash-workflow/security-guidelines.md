# Security Guidelines: Release via `release.sh`

1. **What**: The preview job must never receive the GitHub App token (`GH_APP_ID`/`GH_APP_KEY`) or any secret with write access, and its job `permissions:` block must be scoped to read-only (no `contents: write`, no `pull-requests: write`). **Where**: the preview job in `.github/workflows/release-bash.yml`. **Why**: preview runs on every pull request targeting the branch, including ones from external contributors or forks — granting it write credentials would let an untrusted PR obtain push/release access it has no business having.

2. **What**: Trigger preview with `pull_request`, never `pull_request_target`. **Where**: `.github/workflows/release-bash.yml` preview trigger. **Why**: `pull_request_target` runs with the base repo's secrets and permissions against the fork's checked-out code — the classic GitHub Actions privilege-escalation combo; `pull_request` keeps fork runs in the fork's own low-privilege context.

3. **What**: Never interpolate PR/commit data (titles, commit messages, branch names) directly into a shell `run:` string; pass it through environment variables or the script's own argument parsing instead. **Where**: any workflow step that feeds commit/PR text to `release.sh`. **Why**: `release.sh` classifies arbitrary conventional-commit messages, which on a fork PR are fully attacker-controlled — unescaped shell interpolation of that text is a known GitHub Actions script-injection vector.

4. **What**: Scope the GitHub App installation used for publish to `contents: write` only on this repository — no `admin`, no org-wide install. **Where**: the GitHub App configuration backing `GH_APP_ID`/`GH_APP_KEY` (same app as `release.yml`, per ADR-015). **Why**: this token is deliberately used to bypass branch protection on `develop`/`main` for tag pushes and releases; a broader grant widens what a compromised publish run (or leaked secret) could do beyond tagging/releasing.

5. **What**: Pin the vendored `release.sh` copy to a specific reviewed commit/tag from `JeremieLitzler/semantic-release-script-testing` rather than tracking its default branch, and re-review the diff on every deliberate sync (per the business spec's "kept in sync deliberately"). **Where**: the vendored script file(s) in this repo. **Why**: it is an external, non-npm dependency with no semver/changelog guarantees — an unreviewed upstream change could alter what an unattended (`--yes`) job executes against protected branches.

status: ready
