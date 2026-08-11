# Test Cases: Release via `release.sh`

## Trigger scope

1. Given the workflow's configured target branch is `T`, when a pull request is opened against `T`, then the preview job runs.
2. Given a preview already ran for a pull request, when new commits are pushed to that same pull request, then the preview job re-runs and reflects the PR's current commits (no stale output from the earlier push).
3. Given the workflow's configured target branch is `T`, when a pull request is opened against a different branch, then neither the preview job nor the publish job runs.
4. Given the workflow's configured target branch is `T` and source branch is `S`, when a pull request from `S` is merged into `T`, then the publish job runs.
5. Given the workflow's configured target branch is `T`, when a pull request is merged into a branch other than `T`, then the publish job does not run.
6. Given a pull request targets `T`, when it is closed without being merged (declined or abandoned), then neither the preview job nor the publish job runs.

## Preview mode

7. Given a pull request against `T` has releasable (conventional-commit) changes since the last tag, when the preview job runs, then it surfaces the computed version bump and release notes, and creates no tag, pushes nothing, and publishes no GitHub release.
8. Given a pull request against `T` has no releasable commits since the last tag, when the preview job runs, then it completes successfully, without failing, showing no version bump or release notes.
9. Given the preview job holds no write-scoped credentials, when it runs on a pull request from an external contributor or fork, then it still completes and displays the preview output without erroring due to missing credentials.

## Publish mode

10. Given a pull request merging into `T` has releasable commits since the last tag, when the publish job runs, then it creates a new git tag and publishes a GitHub release containing the generated notes.
11. Given a pull request merging into `T` has no releasable commits since the last tag, when the publish job runs, then it completes without creating a tag or a release, and without failing the run.
12. Given a git tag for the version the publish job computes already exists, when the publish job runs, then it fails visibly and does not overwrite or duplicate the existing tag or release.
13. Given a publish run is already in progress for `T`, when a second pull request merges into `T` before the first run finishes, then the second run waits for the first to complete rather than racing it.
14. Given a publish run is in progress for `T`, when a preview job starts for an unrelated pull request against `T` at the same time, then the preview job proceeds independently and is not blocked by the in-progress publish run.
15. Given a publish run just completed successfully, when the repository is inspected afterward, then no `CHANGELOG.md` change was committed as part of the run.

## Unattended execution

16. Given GitHub Actions provides no interactive terminal, when either the preview job or the publish job runs, then it completes without pausing for interactive confirmation and without failing due to a missing terminal.

## Branch configuration

17. Given the source and target branch values are set to two temporary branches for validation, when a pull request from the temporary source branch merges into the temporary target branch, then the publish job runs against those temporary branches, leaving `develop` and `main` untouched.
18. Given the source and target branch values are later switched to `develop` and `main`, when a pull request from `develop` merges into `main`, then the publish job runs against `develop`/`main` using the same trigger and execution behaviour validated on the temporary branches.

## Authentication and protected branches

19. Given `develop` and `main` are configured as protected branches, when the publish job pushes a tag and creates a release, then the push and release creation succeed despite the branch protection rules.

## Security: untrusted input handling

20. Given a pull request's commit message contains shell metacharacters (e.g. backticks, `$( )`, quotes), when the preview or publish job processes that commit for its release notes, then the workflow completes without executing the embedded content as a shell command, and the commit message appears only as inert text in the output.
21. Given a pull request originates from a fork, when its preview job runs, then the run has no access to repository secrets.

status: ready
