# Manual Validation Plan: `release-bash.yml`

This feature is CI/CD configuration (a GitHub Actions workflow plus a vendored bash script) —
there is no TypeScript export, composable, or component for Vitest to exercise, so this phase
produces a manual runbook instead of `.spec.ts` files. Each `test-cases.md` scenario below maps
to concrete steps against GitHub itself. Run this after `/jli-commits`, before `/jli-ships`.

## Stage 0 — setup

1. Confirm `.github/workflows/release-bash.yml`'s `env:` block still reads:

   ```yaml
   RELEASE_SOURCE_BRANCH: temp-source-branch
   RELEASE_TARGET_BRANCH: temp-target-branch
   ```

2. Push two temporary branches from the current tip of this feature branch (or from `develop`,
   whichever already has commits to release):

   ```bash
   rtk git push origin HEAD:temp-target-branch
   rtk git push origin HEAD:temp-source-branch
   ```

   `temp-target-branch` is unprotected, so tag/release creation on it does **not** require the
   GitHub App token to succeed — that specific guarantee is validated separately in Stage 2.

3. Confirm `GH_APP_ID` / `GH_APP_KEY` secrets already exist on the repo (reused from
   `release.yml` per ADR-015) — `gh secret list` should show both.

## Stage 1 — trigger scope and preview mode (temp branches)

| #   | Test case                                                               | Steps                                                                                                                  | Expected observation                                                                                                                                                                                        |
| --- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | PR opened against `T` runs preview                                      | Commit a `feat: …` change on `temp-source-branch`, open a PR into `temp-target-branch`                                 | Actions tab shows `determine-mode` → `preview` running; `publish` shows "Skipped"                                                                                                                           |
| 2   | New push re-runs preview with current commits                           | Push a second commit (e.g. `fix: …`) to the same PR branch                                                             | A new `preview` run starts (previous one shows cancelled, per `cancel-in-progress: true`); its log lists both commits, not just the first                                                                   |
| 3   | PR opened against a different branch triggers nothing                   | Open a PR from any branch into a third branch (not `temp-target-branch`)                                               | Neither `preview` nor `publish` appears as a run for that PR (workflow run shows both jobs skipped)                                                                                                         |
| 6   | PR closed without merge triggers nothing                                | Close the Stage 1 PR using "Close pull request" (not "Merge")                                                          | No new `publish` run appears; `is_publish` stayed `false`                                                                                                                                                   |
| 7   | Releasable commits → preview surfaces bump + notes, no tag/push/release | Re-open (or open a fresh) PR with a `feat:` commit                                                                     | `preview` job log prints "Step 1 — evaluate the new version" with a `minor` bump and a populated "Step 2 — release notes"; no tag appears under `git ls-remote --tags origin`, no GitHub release is created |
| 8   | No releasable commits → completes without failing                       | Open a PR whose only commits already exist in `temp-target-branch`'s history (empty diff) or amend to zero new commits | `preview` job finishes green, log shows "No releasable commits since the last tag; nothing to preview."                                                                                                     |
| 20  | Shell metacharacters in a commit message stay inert                     | Commit with a subject like ``feat: test `whoami` and $(id) injection`` on the PR branch                                | `preview` log prints that exact text as part of the release notes/commit listing; no command executed (no `whoami`/`id` output appears anywhere in the log)                                                 |

Note on #9 / #21 (fork PR, no write credentials): reproducing a real fork PR isn't practical from
this repo alone. This is instead verified statically — already confirmed in code review — by
reading `release-bash.yml`'s `preview` job: `permissions: contents: read, issues: read,
pull-requests: read` (no `contents: write`), and no step references `secrets.GH_APP_ID` /
`secrets.GH_APP_KEY`. If a real external-contributor PR appears later, confirm its `preview` run
still completes (this is the observable proof the token scope was sufficient).

## Stage 2 — publish mode (temp branches)

| #   | Test case                                                 | Steps                                                                                                                                                                          | Expected observation                                                                                                                                                           |
| --- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 4   | PR from `S` merged into `T` runs publish                  | Merge the Stage 1 PR (with releasable commits) via GitHub's "Merge pull request"                                                                                               | `publish` job runs; `determine-mode` shows `is_publish=true`                                                                                                                   |
| 10  | Releasable commits → tag + release created                | (same merge as above)                                                                                                                                                          | A new `vX.Y.Z` tag appears (`git ls-remote --tags origin`) and a GitHub release exists at `/releases/tag/vX.Y.Z` with the generated notes                                      |
| 5   | Merge into a branch other than `T` doesn't publish        | Merge an unrelated PR into a third branch                                                                                                                                      | No `publish` run appears for that merge                                                                                                                                        |
| 11  | No releasable commits → completes without failing, no tag | Merge a PR whose commits are already covered by the last tag                                                                                                                   | `publish` job finishes green, log shows "No releasable commits since the last tag; nothing to publish."; no new tag created                                                    |
| 12  | Existing tag → fails visibly                              | Immediately re-run the `publish` job for the same merge (Actions → re-run job), or manually push a tag matching the next computed version before merging another releasable PR | `publish` job fails (red X); log shows `release.sh`'s own `die`: `tag vX.Y.Z already exists locally` — no duplicate tag/release is created                                     |
| 13  | Overlapping publish runs on `T` queue, not race           | Merge two releasable PRs into `temp-target-branch` in quick succession                                                                                                         | Actions tab shows the second `publish` run in "Queued" state until the first completes, not running concurrently (concurrency group `release-bash-publish-temp-target-branch`) |
| 14  | In-progress publish doesn't block an unrelated preview    | While a `publish` run from step 13 is still in progress, open a third PR against `temp-target-branch`                                                                          | Its `preview` job starts and completes immediately, not waiting on the `publish` run                                                                                           |
| 15  | No `CHANGELOG.md` committed                               | After any successful publish above                                                                                                                                             | `git log --stat -1 temp-target-branch` (or the merge commit itself) shows no `CHANGELOG.md` change; `publish` job never ran `git add`/`git commit`                             |
| 16  | Unattended execution, no TTY hang                         | Observe any `preview` or `publish` run above                                                                                                                                   | Job completes (green or a clear failure) — never stays "in progress" waiting on input; log shows `-> ... (auto-confirmed with --yes)` at each gate                             |
| 17  | Publish runs against temp branches only                   | After Stage 2, inspect `develop` and `main`                                                                                                                                    | Neither has a new commit, tag, or release — only `temp-target-branch` changed                                                                                                  |

## Stage 3 — switch to `develop`/`main` (protected branches)

1. Edit `.github/workflows/release-bash.yml`'s `env:` block:

   ```yaml
   RELEASE_SOURCE_BRANCH: develop
   RELEASE_TARGET_BRANCH: main
   ```

2. Commit this change on its own (`ci: point release-bash.yml at develop/main (#133)`) and get it
   merged into `develop` through the normal PR flow so the updated trigger config is live on
   `main`'s side too (the workflow file itself must exist on the base branch GitHub evaluates
   triggers against).
3. Open a real PR from `develop` into `main` with at least one releasable commit.

| #   | Test case                                                   | Steps                   | Expected observation                                                                                                                                                                                                                                                                               |
| --- | ----------------------------------------------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 18  | Same behaviour validated on `develop`/`main`                | Open the PR from step 3 | `preview` job runs identically to Stage 1's #7                                                                                                                                                                                                                                                     |
| 19  | Protected-branch push/release succeeds via GitHub App token | Merge the PR            | `publish` job's "Generate GitHub App token" step succeeds, the tag push and `gh release create` succeed despite `main`'s branch protection — confirm by checking the App token step's log shows a token was minted, and that the tag/release appear the same as Stage 2's #10, this time on `main` |

## Cleanup

Once Stage 1/2 are validated, delete the temporary branches and any test tags/releases they
produced:

```bash
rtk git push origin --delete temp-source-branch temp-target-branch
gh release delete vX.Y.Z --yes   # for each test tag/release created in Stage 1/2
git push origin --delete vX.Y.Z  # matching tag
```

status: ready
