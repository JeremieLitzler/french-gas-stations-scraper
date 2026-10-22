# CI and releases

Operational notes for working on `.github/workflows/`. The settled decisions and their rationale live in `CONTEXT.md` § "Non-product work" and in ADR-017; this file is the how-to and the gotchas that cost time to rediscover.

## Changing the release pipeline

To add or change pipeline behaviour — a guard, a preflight check, a recovery path — add a step to the relevant job in `release.yml`, around the script. `release.sh` is never edited here; to move to a newer one, change `RELEASE_SCRIPT_REF` as the comment above it describes.

The `publish` job is gated by `guard` and `test`, refuses a `release/*` ref that `origin/develop` does not contain, and deletes an orphaned tag left by a half-finished run so the release re-cuts. The step comments in `release.yml` explain each.

## Cutting a release

A release is cut by pushing a `release/<date>` branch off the tip of `develop` — not by a pull request, and not from `develop` itself (a push to `develop` only runs the dry-run preview). The `release/*` push runs the `publish` job, which tags that commit and creates the GitHub release; the `deploy-site` job then calls `NETLIFY_BUILD_HOOK`. A `deploy-site` dispatch from `develop` redeploys the site without a release. A `workflow_dispatch` run with `action=publish` cuts the release from `develop` or a `release/*` branch.

The release branch is disposable: it carries nothing to merge back, and once the `publish` job has tagged and released, its final step deletes the `release/*` branch from `origin`. Cut a fresh `release/<date>` for the next release rather than reusing one. A `workflow_dispatch` publish never deletes its ref, and a failed publish leaves the branch in place for a retry.

## GITHUB_TOKEN and downstream workflows

The publish job tags and releases with the default `GITHUB_TOKEN`, which by design does not trigger further workflow runs. Before adding a workflow that keys on `on: release` or `on: push: tags` (npm publish, a deploy, changelog sync), restore a GitHub App or PAT token in the `publish` job, or the release will not trigger it.

## Rulesets

The `protect-develop` ruleset targets `refs/heads/develop` only, so `release/**` pushes are not gated by it. It permits rebase-merges only and blocks force-push and deletion; there is no `protect-main` any more.

Changing a ruleset's enforcement is 2FA-gated. A CLI or agent token cannot flip it — the API call fails silently and leaves enforcement unchanged. Hand that step to the user to do in the repo's **Settings > Rules** UI.
