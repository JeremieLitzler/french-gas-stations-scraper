# Test Results: Release via `release.sh`

No `.spec.ts` suite exists for this feature — `manual-validation-plan.md` replaced it with a
GitHub-driven runbook, since `release-bash.yml` is CI/CD configuration with no TypeScript
surface for Vitest to exercise. Stage 1 and Stage 2 of that plan have now run for real against
`temp-source-branch`/`temp-target-branch`. Stage 3 (`develop`/`main`) remains untested — `main`
does not exist yet as a branch in this repository.

## Stage 1 — trigger scope and preview (PASSED)

PR #137 (`temp-source-branch` -> `temp-target-branch`, run `31487016044`):

- `determine-mode` -> `preview` ran; `publish` correctly skipped (test cases 1, 3, 6).
- 12 commits scanned since the last tag `v0.28.0`; bump computed as `minor`; version
  `0.28.0 -> 0.29.0` (test case 7).
- Release notes: a `### Features` section with one deduplicated bullet
  (`- Update release workflow to use \`release.sh\` (#133)`, `release.sh` collapsed every
  commit referencing issue #133 into the issue's own title) and a `### Others` section for the
  one pre-existing, non-#133 commit in range.
- Every gate auto-confirmed with `--yes`, no TTY hang, step 3/4 stayed in `[dry-run]` mode — no
  tag pushed, no release created (test case 16).

## Bugs found and fixed during Stage 2

Stage 2 (merging into `temp-target-branch` to run `publish`) failed twice before succeeding.
Both failures were real gaps in `release-bash.yml`, not issues with the validation setup, and
both are now merged into `develop`:

1. **Missing `environment: name: CI` on the `publish` job** (PR #137 merge, run `31488472012`).
   `GH_APP_ID`/`GH_APP_KEY` are scoped to the `CI` GitHub Environment (matching `release.yml`'s
   existing pattern), not repo-level secrets. Without declaring the environment, the job
   couldn't see them, so `actions/create-github-app-token` received an empty `app-id` and
   failed immediately. **Fixed in
   [PR #138](https://github.com/JeremieLitzler/french-gas-stations-scraper/pull/138)**, merged
   into `develop`.
2. **No git identity configured before `release.sh` tags** (PR #139 merge, run `31490987707`,
   i.e. the very next attempt, after the App-token step started succeeding). `release.sh`
   creates an annotated tag (`git tag -a`), which requires a committer identity; the job had
   none, so it failed with `fatal: empty ident name ... not allowed`. **Fixed in
   [PR #140](https://github.com/JeremieLitzler/french-gas-stations-scraper/pull/140)**, merged
   into `develop`, using the GitHub App's own slug/id for the identity rather than a generic
   `github-actions[bot]` one.

Both fixes were propagated to `temp-target-branch` and a fresh `temp-source-branch` commit
before re-running, so Stage 1 was implicitly re-validated twice more (still green each time) on
top of the fixes.

## Stage 2 — publish (PASSED, after the two fixes above)

PR #141 (`temp-source-branch` -> `temp-target-branch`, run `31492917555`) succeeded outright:

- Tag `v0.29.0` created and pushed, attributed to `semantic-release-app-for-jli[bot]` (the
  GitHub App identity, confirming the identity fix works as intended, not just "any" identity).
- GitHub release published at
  https://github.com/JeremieLitzler/french-gas-stations-scraper/releases/tag/v0.29.0 with
  release notes byte-identical to Stage 1's preview output (test case 4, 10).
- No `CHANGELOG.md` change in the merge (test case 15) — confirmed by inspection, `release.sh`
  was never passed `--changelog`.

Test cases not exercised live in this pass: 2 (re-push during an open PR — not attempted, but
mechanically identical to Stage 1's fresh-PR behavior since preview recomputes from scratch
every run), 5, 8, 9, 11, 12, 13, 14, 17, 18, 19, 20, 21 — covered by static/code-review
verification per `manual-validation-plan.md`'s notes, or deferred to Stage 3 (`main` doesn't
exist yet).

## Cleanup

`temp-source-branch`/`temp-target-branch` and the `v0.29.0` test tag/release are still on the
remote — not yet deleted, pending confirmation this record is sufficient before tearing them
down.

status: passed
