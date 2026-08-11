# ADR-015: Bash Script (`release.sh`) as a Second Release Workflow

**Date:** 2026-08-11
**Status:** Accepted

## Context

ADR-004 established `semantic-release` (npm-based, triggered on push to `main`) as the project's release automation. Issue #133 asks for a new `.github/workflows/release-bash.yml` workflow built around [`release.sh`](https://github.com/JeremieLitzler/semantic-release-script-testing/blob/main/release.sh), a bash script that classifies conventional commits, computes the next version, generates release notes, and publishes a GitHub release. Its `gate()` approval prompts require `--yes` to bypass; without it, they call `die` in any non-TTY environment (`"no terminal available to confirm ... — rerun with --yes"`), so every CI run — preview or publish — must pass `--yes`. `--dry-run`/`-n` only skips the destructive remote operations (tag push, release publish); it does not skip the gates.

The new workflow triggers on a pull request merging from a source branch into a target branch, rather than on push to `main`. It is validated first against two temporary branches, then pointed at `develop` (source) and `main` (target) — both protected branches, so tag/release creation needs a GitHub App token rather than the default `GITHUB_TOKEN`.

This meant two release mechanisms existed side by side for a period: the existing `semantic-release` pipeline (ADR-004) and the new `release.sh`-based one. That coexistence, and the fact that the new pipeline was intended to be evaluated as a _replacement_ for the old one, was a significant enough shift to record. Issue #148 subsequently retired `release.yml` once `release-bash.yml` proved itself, per this ADR's Notes.

## Decision

Add `release-bash.yml`, running a vendored copy of `release.sh`, as a second, independent release pipeline with two modes, both against the configured target branch (source/target held as easily-changed workflow configuration, not hardcoded):

- **Preview** — any pull request opened/updated against the target branch runs `release.sh --yes --dry-run`: gates auto-confirm (required for CI), but no tag/push/release is created — surfaces the version bump and release notes the merge would produce.
- **Publish** — a pull request closed-as-merged into the target branch runs `release.sh --yes` (no `--dry-run`): creates the tag and GitHub release.
- Auth: publish mode uses a GitHub App token via `actions/create-github-app-token`, reusing the existing `GH_APP_ID` / `GH_APP_KEY` secrets (same secrets as `release.yml`'s `tibdex/github-app-token`, which is unmaintained). Preview mode does not push, so it does not need the App token.
- No bump-level override, no `CHANGELOG.md` committed back in either mode — output is a GitHub release (publish) or a surfaced preview (preview) only.
- `release.yml` (ADR-004's `semantic-release` workflow) was **not** removed or modified by this decision at the time it was made. It kept running on push to `main` in parallel until retired by issue #148 (see Notes).

The existing `semantic-release` workflow (`release.yml`) was a candidate for deprecation once `release-bash.yml` had proven itself on real merges into `develop`/`main`. No retirement date or criteria were set by this ADR at the time — that follow-up decision was made in issue #148 once the new pipeline had run successfully in production.

## Consequences

### Positive

- Human-reviewable, scriptable release notes and version decisions independent of the `semantic-release` npm dependency chain.
- Validated on temporary branches before touching `develop`/`main`, lowering the risk of a broken release process on protected branches.
- Reuses the existing GitHub App auth pattern and secrets — no new credentials to provision.
- Opens a path to retiring the heavier `semantic-release` toolchain (five npm packages per ADR-004) if `release.sh` proves sufficient.
- Remove dependencies to several NPM packages, some that can become a security issue over time.

### Negative

- Two release mechanisms ran in parallel for a period, which was a coexistence risk: both could have tagged/released from the same merge if triggers weren't kept mutually exclusive (`release.yml` triggered on push to `main`, `release-bash.yml` on PR-merge into a configurable target). Resolved by retiring `release.yml` in issue #148.
- `release.sh` is an external, actively-tested script (`semantic-release-script-testing`) rather than a versioned npm dependency — no changelog/semver guarantees on upstream changes; the vendored copy must be updated deliberately.
- Adds a second unattended (`--yes`) automation path; its publish mode has push access to protected branches, widening the blast radius of a release-process bug. Preview mode runs `--yes` on every PR update (including from external contributors), so its output must not be trusted for anything beyond display.

## Alternatives Considered

- **Replace `release.yml` outright**: rejected for now — the issue asks to validate the new script on temporary branches first, so removing the proven pipeline before that validation would leave no fallback.
- **Run `release.sh` from within the existing `release.yml` job**: rejected — mixing two differently-triggered, differently-configured release mechanisms in one workflow file would make the temporary branch → `develop`/`main` cutover harder to reason about and roll back.

## Notes

- Deprecating `release.yml` in favor of `release-bash.yml` was anticipated but not decided here. That follow-up decision was made and executed in issue #148 (2026-08-11): `release.yml`, `.releaserc`, and the `semantic-release` npm dependency chain (ADR-004) were removed; `release-bash.yml` is now the sole release pipeline.
- `tibdex/github-app-token` (used by the now-removed `release.yml`) was unmaintained; `release-bash.yml` uses `actions/create-github-app-token` instead. It no longer needs to coexist with `release.yml`'s auth pattern.
