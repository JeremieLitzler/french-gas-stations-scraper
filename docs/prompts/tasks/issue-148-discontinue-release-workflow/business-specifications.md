# Business Specifications: Discontinue `release.yml`

**Issue:** #148

## Goal and scope

Retire the `semantic-release`-based automatic release pipeline (`release.yml`, ADR-004) now that `release-bash.yml` (ADR-015) is the project's sole release mechanism. This is the follow-up retirement decision ADR-015 explicitly left open. Scope covers the workflow file, its npm dependency chain, its configuration, an unrelated orphaned release script found during discovery, and the ADR trail. `release-bash.yml` and `scripts/release/release.sh` are not modified — they already work independently and are out of scope.

## Rules

1. `.github/workflows/release.yml` is removed. No workflow may trigger `semantic-release` on push to `main` (or any other event) after this change; `release-bash.yml`'s PR-merge trigger becomes the only path that creates a GitHub release.
2. `.releaserc` is removed. It has no purpose once no workflow invokes `semantic-release`.
3. The following `devDependencies` are removed from `package.json` (and the lockfile updated accordingly): `semantic-release`, `@semantic-release/changelog`, `@semantic-release/git`, `conventional-changelog-conventionalcommits`, `conventional-changelog-eslint`. No other script or workflow may reference them after removal.
4. `tag-release.sh` (repo root) is removed. It is an orphaned script — not invoked by any `package.json` script, workflow, or `scripts/release/release.sh` — left over from the project's boilerplate origin, unrelated to `release-bash.yml`'s release flow.
5. `docs/decisions/adr-004-semantic-release.md` is marked as superseded: its status changes to reflect that `semantic-release` is no longer in use, pointing to ADR-015 as the replacement decision.
6. `docs/decisions/ADR-015-bash-script-release-workflow.md` is updated to record that the retirement it flagged as an open follow-up has now happened: status moves from `Proposed` to `Accepted`, and its Context/Notes no longer describe `release.yml` as still running in parallel.
7. `docs/decisions/README.md`'s ADR index reflects the status changes to ADR-004 and ADR-015.
8. `release-bash.yml`'s header comment, which currently states `release.yml is untouched and keeps running in parallel; no retirement decision has been made for either pipeline`, no longer describes a since-decided state as open.
9. Removal must not affect `release-bash.yml`'s behavior or any of its secrets (`GH_APP_ID`, `GH_APP_KEY`) — those continue to be consumed by `release-bash.yml` alone, unchanged.
10. Out of scope: `package.json`'s `version` field. It stays a static, unmanaged value; no workflow bumps it before or after this change (`release-bash.yml` produces GitHub releases/tags, not a `package.json` version bump).

No new ADR is introduced. This spec retires a decision already documented in ADR-004 and anticipated as a follow-up in ADR-015; ADR-004 and ADR-015 are updated in place per rules 5-7 above rather than superseded by a new ADR file.

status: ready
