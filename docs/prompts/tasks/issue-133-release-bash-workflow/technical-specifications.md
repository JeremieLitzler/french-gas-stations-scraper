# Technical Specifications: Release via `release.sh`

## Files created or changed

- `.github/workflows/release-bash.yml` — new workflow with three jobs (`determine-mode`, `preview`, `publish`) implementing the preview/publish modes described in the business spec.
- `scripts/release/release.sh` — vendored, byte-for-byte copy of upstream `release.sh` pinned to commit `de0a43a7790f509371219087c10602a0f8c39bb9` of `JeremieLitzler/semantic-release-script-testing`.
- `scripts/release/VENDORED.md` — new file recording the vendored source, the pinned commit, and the deliberate-sync procedure (security guideline 5).

## Non-trivial decisions

**Branch config as a workflow-level `env:` block, not repository variables.** `on:` triggers cannot reference expressions at all, so the target-branch filter has to run inside a job step either way; between a workflow-level `env:` block and GitHub repository variables (`vars.*`), the user chose the `env:` block so switching from the temporary branches to `develop`/`main` stays a version-controlled, reviewable commit rather than an out-of-band UI change.

**A leading `determine-mode` job computes booleans instead of filtering directly in each job's `if:`.** `pull_request.branches:` can't take an expression, and workflow-level `env` context is not reliably available inside job-level `if:` conditions, but job outputs via the `needs` context are. Centralizing the trigger-scope logic (target branch match, closed-vs-merged) in one job also means the six trigger-scope test cases are exercised by one script instead of duplicated conditionals in both `preview` and `publish`.

**PR/branch data passed through step-level `env:`, not interpolated into `run:` strings.** Per security guideline 3, `BASE_REF`, `EVENT_ACTION` and `PULL_REQUEST_MERGED` are read as shell variables (`$BASE_REF`, …) rather than `${{ github.event... }}` appearing inside the script body — this holds even though these particular fields are structurally constrained (branch names, a fixed action enum, a boolean) and not free text like a commit message, since the guideline calls out branch names explicitly and the cost of doing it the safe way is zero.

**`release.sh`'s "no commits in range" `die()` is caught and turned into a successful no-op.** The vendored script itself treats an empty commit range as a hard failure (`die "no commit to release in range"`, exit 1) — there's no flag to make it a soft success. Business spec/test cases 8 and 11 require both modes to complete without failing when there are no releasable commits, so each `run:` step tees the script's output, inspects the exit code, and re-raises everything except that one specific message (matched by exact substring). Any other non-zero exit — a genuinely already-existing tag (test 12), a push failure, an auth failure — still fails the job visibly, since the substring won't match.

**Publish's checkout uses `token: <GitHub App token>` (persisted), not just `GH_TOKEN` for the `gh` CLI.** `release.sh` pushes the tag with a plain `git push origin <tag>`, not `gh`. Setting `GH_TOKEN` alone only authenticates the `gh` CLI calls (issue lookups, `gh release create`); the tag push needs git itself to be authenticated, which `actions/checkout`'s `token:` input provides via a persisted credential helper. Preview never pushes, so its checkout keeps `persist-credentials: false` and relies on the default `GITHUB_TOKEN` only for the `gh` CLI issue-title lookups (contents/issues/pull-requests all read-only), satisfying security guideline 1 and test case 9/21.

**`RELEASE_SOURCE_BRANCH` is declared but not used as an active filter.** The business spec and test cases describe the publish trigger purely in terms of the *target* branch (any PR merged into `T` triggers publish); no test case asks for a PR to be rejected because it came from a branch other than the configured source. `RELEASE_SOURCE_BRANCH` is kept as documentation of the intended pairing (and for a future workflow iteration to use, e.g. an eventual `release.yml` cutover decision) rather than silently adding an unrequested filter.

**Preview's concurrency group cancels in-progress runs per PR; publish's group queues per target branch.** Test case 2 wants a fresh push to reflect the PR's current commits without stale output — cancelling a superseded preview run for the same PR number is the natural way to avoid two previews for the same PR racing each other in the log. Test case 13 wants overlapping publish runs on the same target branch to queue rather than race, so `cancel-in-progress: false` there is deliberate — the opposite behavior would silently drop a merge's release. Test case 14 (preview unaffected by an in-progress publish) is satisfied because the two concurrency groups are named independently (`release-bash-preview-<PR number>` vs `release-bash-publish-<target branch>`) and are scoped per job, not per workflow.

**`scripts/release/release.sh` is invoked via `bash scripts/release/release.sh …`, not `./scripts/release/release.sh`.** The file was vendored via the GitHub API and written on a Windows checkout, so its executable bit is not reliably set in git. Invoking it through `bash` avoids depending on the executable bit at all, so no `chmod +x` step is needed in the workflow or the vendoring procedure.

**`scripts/release/VENDORED.md` records the pin and sync procedure instead of annotating `release.sh` itself.** Keeping `release.sh` byte-for-byte identical to upstream (confirmed via `diff` against the fetched copy) means a future deliberate sync can diff the two files directly with no noise from repo-local comments.

## Object Calisthenics note

This feature is entirely YAML workflow configuration plus one vendored external shell script — there is no application code to apply class-shape rules (indentation levels, instance variables, first-class collections, etc.) to. The `determine-mode` step keeps one level of branching depth and named, non-abbreviated shell variables where that's meaningful in a CI script.

status: ready
