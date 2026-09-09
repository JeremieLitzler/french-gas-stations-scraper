# ADR-016: Single-Trunk, Push-Triggered Release Model

**Date:** 2026-09-09
**Status:** Accepted

## Context

ADR-015 established `release-bash.yml` running the vendored `scripts/release/release.sh` on a **pull request merging `develop` into `main`**: an open/updated PR ran a dry-run preview, a merged PR ran the publish. Issue #148 then retired `semantic-release` (`release.yml`, `.releaserc`, the npm dependency chain — ADR-004), leaving `release-bash.yml` as the sole pipeline but keeping the two-branch, PR-triggered shape.

That shape has a structural flaw. With two long-lived branches and a pull-request release, every release replays `develop`'s commits onto `main` under new SHAs — GitHub's "Rebase and merge" rewrites hashes even when a fast-forward was possible. `develop` and `main` diverge permanently: at the time of this ADR they held identical trees except for three dependency bumps, yet `git log develop..main` showed ~24 commits and `git log main..develop` ~27, all rebased copies. The release tag lands on a `main` commit `develop` does not carry, so `git describe --tags develop` stops resolving to the real last version. The pipeline also needed a GitHub App token (`GH_APP_ID` / `GH_APP_KEY`) because it pushed tags to two protected branches, and it required two branch rulesets (`protect-develop`, `protect-main`).

The `main` branch carried no unique content — it was stale history from the last release. It served only as the release PR's target.

## Decision

Move to a **single-trunk, push-triggered** release model, per the `single-trunk-release-migration` playbook.

- **`develop` is the only long-lived branch** — the GitHub default and the trunk. It gains commits only by rebase-merged pull request. `main` is retired and deleted.
- **`release-bash.yml` triggers on `push`, not on `pull_request`:**
  - a push to `develop` (a merge counts) runs `release.sh --yes --dry-run` and writes the pending version + notes to the run summary — the **preview** job;
  - a release is cut by pushing a `release/<date>` branch off `develop`; that runs the **publish** job (tag + GitHub release), then deletes the spent `release/*` branch from `origin`;
  - `workflow_dispatch` offers `mode=preview|publish` from the Actions tab.
- **Auth is the default `GITHUB_TOKEN`.** Nothing protects tags and no workflow keys on `on: release` or `on: push: tags`, so `contents: write` is enough. The GitHub App token is gone; `GH_APP_ID` / `GH_APP_KEY` can be deleted. Trade-off: a release created with `GITHUB_TOKEN` triggers no further workflow — if one is added later, restore an App or PAT token (documented in the workflow's `permissions:` comment and `docs/agents/ci.md`).
- **One branch ruleset**, `protect-develop`, targeting `refs/heads/develop` only: rebase-merge allowed, force-push and deletion blocked. `release/**` is intentionally ungated. `protect-main` is deleted.
- **`release.sh` stays vendored** at the ADR-015 pin (`de0a43a7`), with one recorded local hunk: its preflight branch check is widened from `== "main"` to a `case` accepting `develop`, `release/*`, and `HEAD` (`scripts/release/VENDORED.md`).
- **`docs/agents/ci.md`** is the steady-state operating guide for the pipeline.

This supersedes ADR-015 (and, transitively, ADR-004).

## Consequences

### Positive

- The release tag is always on a commit `develop` carries, so `git describe --tags develop` reports the correct last version. No permanent branch divergence.
- One branch, one ruleset, no App token, one fewer pair of secrets — less to provision, protect, and reason about.
- A release is a single `git push` of a dated branch; no release pull request to open, review, and merge.
- Preview runs on every push to the trunk, not on every PR update from any contributor, narrowing what untrusted input the `--yes` automation sees.

### Negative

- `release/**` is unprotected: anyone who can push to the repo can cut a release. The publish job's own guards (the ref must be contained in `origin/develop`; an orphaned tag is reset) are the only gate. An optional required-reviewer or wait timer on the `CI` environment can be added without editing the workflow.
- Losing the App token means the release triggers no downstream workflow. Any future `on: release` / `on: push: tags` automation must restore a token first.
- A force-push to a `release/*` branch, or reusing a stale one, can re-fire a publish. Mitigated by the pipeline deleting the branch after a successful publish and by cutting a fresh `release/<date>` each time.
- Existing release history on `main` is abandoned in place (the branch is deleted after confirming nothing deploys from it); tags from past releases remain reachable from `develop`.

## Alternatives Considered

- **Keep the develop/main PR release, just automate the divergence cleanup**: rejected — it fights the tool. "Rebase and merge" rewrites SHAs by design; no amount of scripting makes the tag land on a commit the working branch carries while two branches exist.
- **Make `main` the trunk instead of `develop`**: rejected by the repo owner. `develop` is already the default branch and the entire `jli-` worktree pipeline (`refresh-develop.sh`, `pr-create.sh --base develop`, `worktree-create.sh` off `origin/develop`) is built around it; switching to `main` is a larger, riskier diff for no functional gain. `release.sh`'s branch check is widened to suit.
- **Gate `release/**` with a second ruleset**: rejected for now — it would re-introduce the two-ruleset overhead the migration removes. The publish job's containment check plus the optional `CI` environment gate cover the risk.

## Notes

- Migration executed on branch `ci/single-trunk-release-migration`. Owner actions that an agent token cannot perform (2FA-gated ruleset enforcement, branch deletion, deploy-provider repoint, secret deletion) are listed in that PR's description.
- Verification (playbook Step 4): after merge, a push to `develop` runs a green preview showing `Version: X -> Y`; a pushed `release/<date>` publishes and self-deletes; `git fetch --tags --prune && git describe --tags develop` resolves to the bare new tag with the release branch gone from `origin`.
