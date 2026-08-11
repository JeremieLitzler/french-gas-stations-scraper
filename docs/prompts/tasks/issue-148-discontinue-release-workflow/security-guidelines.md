# Security Guidelines: Discontinue `release.yml`

**Issue:** #148

1. **What:** Confirm `npm audit signatures` (package-signature verification, run today only in `release.yml`) is not silently lost — either keep it running somewhere in CI (e.g. `pr-build.yml`) or explicitly accept its removal in the PR description. **Where:** `.github/workflows/`. **Why:** it is the project's only check that installed npm packages carry valid registry signatures; dropping it with no replacement and no acknowledgment weakens supply-chain integrity checking silently.
2. **What:** Verify `tibdex/github-app-token` (a third-party, unmaintained GitHub Action per ADR-015's Notes) is fully removed from the workflow set, not left dormant in a disabled/unused file. **Where:** `.github/workflows/`. **Why:** an unmaintained action with access to `GH_APP_ID`/`GH_APP_KEY` is a standing supply-chain risk; removing `release.yml` should eliminate it entirely rather than leave a stale reference a future edit could reactivate.
3. **What:** After removing the `semantic-release` dependency chain, regenerate the lockfile via a full install rather than manual edits, and confirm no residual transitive dependency of the removed packages remains installed. **Where:** `package.json` / `package-lock.json`. **Why:** hand-edited lockfiles can drift from a reproducible, auditable dependency tree.
4. **What:** Confirm `release-bash.yml`'s `GH_APP_ID`/`GH_APP_KEY` usage and permissions are byte-for-byte unchanged by this removal — no incidental widening of scopes or triggers. **Where:** `.github/workflows/release-bash.yml`. **Why:** it is now the sole holder of GitHub App credentials with write access to protected branches; any unreviewed change to its trigger or permissions increases blast radius, per the risk already noted in ADR-015.

status: ready
