# CI and releases

Operational notes for working on `.github/workflows/` and `scripts/release/`. The settled decisions and their rationale live in `CONTEXT.md` (CI, Deploy, Releases, Branch model); this file is the how-to and the gotchas that cost time to rediscover.

## Changing the release pipeline

`scripts/release/release.sh` is vendored byte-for-byte. To add or change pipeline behaviour — a guard, a preflight check, a recovery path — add a step to the `publish` or `preview` job in `release-bash.yml`, around the script. Leave the script matching upstream; `scripts/release/VENDORED.md` carries the one allowed local hunk and the procedure for syncing a deliberate upstream update.

The publish job already wraps the script with two preflight guards (issues #63, #64): the pushed `release/*` ref must be contained in `origin/develop`, and an orphaned tag from a half-finished run is deleted so the release re-cuts. The job's step comments and `VENDORED.md` explain both.

## Cutting a release

A release is cut by pushing a `release/<date>` branch off the tip of `develop` — not by a pull request, and not from `develop` itself (a push to `develop` only ever runs the dry-run preview to the run summary). The `release/*` push runs the `publish` job, which tags that commit and creates the GitHub release. A `workflow_dispatch` run with `mode=publish` does the same from `develop` or a `release/*` branch.

The release branch is disposable: it carries nothing to merge back, and once the `publish` job has tagged and released, its final step deletes the `release/*` branch from `origin`. Cut a fresh `release/<date>` for the next release rather than reusing one. A `workflow_dispatch` publish never deletes its ref, and a failed publish leaves the branch in place for a retry.

## GITHUB_TOKEN and downstream workflows

The publish job tags and releases with the default `GITHUB_TOKEN`, which by design does not trigger further workflow runs. Before adding a workflow that keys on `on: release` or `on: push: tags` (npm publish, a deploy, changelog sync), read the `permissions:` comment in `release-bash.yml`'s publish job — it needs a GitHub App or PAT token restored for the release to be visible to that workflow.

## Rulesets

The `protect-develop` ruleset targets `refs/heads/develop` only, so `release/**` pushes are not gated by it. It permits rebase-merges only and blocks force-push and deletion; there is no `protect-main` any more.

Changing a ruleset's enforcement is 2FA-gated. A CLI or agent token cannot flip it — the API call fails silently and leaves enforcement unchanged. Hand that step to the user to do in the repo's **Settings > Rules** UI.
