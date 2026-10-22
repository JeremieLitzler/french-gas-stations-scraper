# CI and releases

Operational notes for working on `.github/workflows/` and `scripts/release/`. The settled decisions and their rationale live in `CONTEXT.md` § "Non-product work" (Branch model, Release automation, CI and build config) and in ADR-016; this file is the how-to and the gotchas that cost time to rediscover.

## Changing the release pipeline

`release.sh` is not stored in this repo: `.github/workflows/release.yml` downloads it from JeremieLitzler/semantic-release-script at the SHA pinned in `RELEASE_SCRIPT_REF` (tag v1.0.0). To add or change pipeline behaviour — a guard, a preflight check, a recovery path — add a step to the relevant job in `release.yml`, around the script. To move to a newer script, change the pin as the comment above `RELEASE_SCRIPT_REF` describes.

The `publish` job runs after `guard` (the ref must be `develop` or `release/*`) and `test` (`npm ci`, `npm audit signatures`, `npm run test`, `npm run build`). It refuses a `release/*` ref that `origin/develop` does not contain, and deletes an orphaned tag left by a half-finished run so the release re-cuts.

## Cutting a release

A release is cut by pushing a `release/<date>` branch off the tip of `develop` — not by a pull request, and not from `develop` itself (a push to `develop` only ever runs the dry-run preview to the run summary). The `release/*` push runs the `publish` job, which tags that commit and creates the GitHub release; the `deploy-site` job then calls `NETLIFY_BUILD_HOOK`. A `deploy-site` dispatch from `develop` redeploys the site without a release. A `workflow_dispatch` run with `action=publish` cuts the release from `develop` or a `release/*` branch.

The release branch is disposable: it carries nothing to merge back, and once the `publish` job has tagged and released, its final step deletes the `release/*` branch from `origin`. Cut a fresh `release/<date>` for the next release rather than reusing one. A `workflow_dispatch` publish never deletes its ref, and a failed publish leaves the branch in place for a retry.

## GITHUB_TOKEN and downstream workflows

The publish job tags and releases with the default `GITHUB_TOKEN`, which by design does not trigger further workflow runs. Before adding a workflow that keys on `on: release` or `on: push: tags` (npm publish, a deploy, changelog sync), note that the `publish` job in `release.yml` runs on `GITHUB_TOKEN` (`contents: write`) — it needs a GitHub App or PAT token restored for the release to be visible to that workflow.

## Rulesets

The `protect-develop` ruleset targets `refs/heads/develop` only, so `release/**` pushes are not gated by it. It permits rebase-merges only and blocks force-push and deletion; there is no `protect-main` any more.

Changing a ruleset's enforcement is 2FA-gated. A CLI or agent token cannot flip it — the API call fails silently and leaves enforcement unchanged. Hand that step to the user to do in the repo's **Settings > Rules** UI.
