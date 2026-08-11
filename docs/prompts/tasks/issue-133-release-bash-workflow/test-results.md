# Test Results: Release via `release.sh`

No `.spec.ts` suite exists for this feature — `manual-validation-plan.md` replaces it with a
GitHub-driven runbook, since `release-bash.yml` is CI/CD configuration with no TypeScript
surface for Vitest to exercise (see that file's opening note, and the discussion in
`/jli-writes-tests` for this task).

## Why validation is pending, not run

GitHub only registers a workflow's `pull_request` triggers once the workflow file exists on
the repository's default branch (`develop` here, confirmed via `gh repo view`). Right now
`.github/workflows/release-bash.yml` exists only on `feat/release-bash-workflow` — merging it
into `develop` is a prerequisite for Stage 1 of `manual-validation-plan.md` to produce any
observable run at all, not a follow-up to it. Two further findings from checking before
shipping:

- `develop` is protected by an active ruleset (`protect-develop`), so this can only land via a
  reviewed PR — not a direct push — which is exactly the `/jli-ships` flow this file unblocks.
- `main` does not exist yet as a branch in this repository. Stage 3 of the validation plan
  (switching `RELEASE_SOURCE_BRANCH`/`RELEASE_TARGET_BRANCH` to `develop`/`main`) needs `main`
  created first — out of scope for this ship, tracked as a later step.

Merging this PR into `develop` is itself inert for `release-bash.yml`: the workflow only acts
on PRs targeting the configured `RELEASE_TARGET_BRANCH` (currently `temp-target-branch`), so a
merge into `develop` matches neither `preview` nor `publish`'s trigger condition and fires
nothing.

## What happens next

Once merged, Stage 1 and Stage 2 of `manual-validation-plan.md` will be run against
`temp-source-branch`/`temp-target-branch` (pushed and PR'd separately, after this merge). The
expected outcome, computed ahead of time from this branch's actual commit history: last
reachable tag `v0.28.0`, ten `feat`/`docs`/`test`/`refactor` commits for issue #133 plus one
pre-existing `ci(commands)` commit already on `develop` (not part of #133, but within the same
"since last tag" range `release.sh` computes), no breaking-change commits, so a `minor` bump to
`v0.29.0`. This file will be updated with the actual observed outcome once Stage 1/2 run.

status: pending-post-merge
