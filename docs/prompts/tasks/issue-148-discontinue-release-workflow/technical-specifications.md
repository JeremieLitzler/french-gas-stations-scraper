# Technical Specifications: Discontinue `release.yml`

**Issue:** #148

## Files changed

- `.github/workflows/release.yml` — deleted. This was the `semantic-release`-triggered workflow (ADR-004); `release-bash.yml` is now the only release pipeline.
- `.releaserc` — deleted. `semantic-release` configuration with no remaining consumer.
- `tag-release.sh` — deleted. Confirmed orphaned (not invoked by any workflow, npm script, or `scripts/release/release.sh`) before removal.
- `package.json` — removed `semantic-release`, `@semantic-release/changelog`, `@semantic-release/git`, `conventional-changelog-conventionalcommits`, `conventional-changelog-eslint` from `devDependencies`.
- `package-lock.json` — regenerated via `npm install` (452 packages removed) rather than hand-edited, so the lockfile stays an accurate, reproducible reflection of the dependency tree (security guideline #3).
- `.github/workflows/pr-build.yml` — added an `npm audit signatures` step after `npm ci`. `release.yml` was the only workflow running this package-signature check; deleting it without a replacement would have silently dropped supply-chain verification (security guideline #1). `pr-build.yml` already runs on every PR and already does `npm ci`, so this is the natural place to keep the check running rather than inventing a new workflow.
- `.github/workflows/release-bash.yml` — updated only the header comment: it no longer describes `release.yml` as running in parallel with an undecided retirement (business spec rule 8). No trigger, permission, or secret usage was touched (security guideline #4).
- `docs/decisions/adr-004-semantic-release.md` — status changed to "Superseded by ADR-015"; added a Notes entry recording the 2026-08-11 retirement under issue #148.
- `docs/decisions/ADR-015-bash-script-release-workflow.md` — status changed from `Proposed` to `Accepted`; Context/Decision/Consequences/Notes reworded from present-tense "two pipelines coexist, retirement undecided" to past-tense "coexistence has ended, retired in issue #148" — the historical rationale is kept intact, only the still-open framing is closed out.
- `docs/decisions/README.md` — ADR index rows for ADR-004 and ADR-015 updated to match their new statuses.

## Notes

- `release-bash.yml`'s `GH_APP_ID`/`GH_APP_KEY` usage, triggers, and permissions are unchanged — verified by diff, not just by intent, satisfying security guideline #4.
- The pre-existing `npm audit` output (13 vulnerabilities, unrelated to the packages removed here) is unchanged by this task and out of scope per the business spec.
- `package.json`'s `version` field remains a static `"0.0.0"`, untouched — out of scope per business spec rule 10.

## Self-review (three potential issues checked)

1. Verified `tag-release.sh` had zero references anywhere in `.github/`, `package.json`, or `scripts/release/` before deleting it, so no CI step silently breaks.
2. Verified `pr-build.yml`'s new `npm audit signatures` step runs after `npm ci` (so `node_modules` exists) and before the test/build steps, matching the ordering `release.yml` used.
3. Verified no other workflow or doc under `.github/` still references `tibdex/github-app-token`, `.releaserc`, or `semantic-release` after removal (checked via search across `.github/workflows/`).

status: ready
