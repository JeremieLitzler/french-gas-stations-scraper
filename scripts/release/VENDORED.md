# Vendored: `release.sh`

`release.sh` in this directory is a vendored, unmodified copy of an external script. It is not an npm/git submodule dependency — it is committed directly so `.github/workflows/release-bash.yml` runs a reviewed, pinned version rather than tracking the upstream default branch.

- **Source repository**: https://github.com/JeremieLitzler/semantic-release-script-testing
- **Source file**: `release.sh`
- **Pinned commit**: `de0a43a7790f509371219087c10602a0f8c39bb9`
- **Vendored on**: 2026-08-11

## Syncing a deliberate update

1. Diff the upstream file at the new commit against this copy before touching anything: `gh api repos/JeremieLitzler/semantic-release-script-testing/contents/release.sh?ref=<new-commit> --jq '.content' | base64 -d`
2. Review the diff line by line — this script runs unattended (`--yes`) against protected
   branches in publish mode, so an unreviewed change is a direct risk (see security guideline 5 in `docs/prompts/tasks/issue-133-release-bash-workflow/security-guidelines.md`).
3. Replace `release.sh` with the new content, unmodified.
4. Update the "Pinned commit" and "Vendored on" fields above.
5. Re-run the workflow against the temporary validation branches before relying on it for `develop` -> `main`.

Do not track the upstream default branch automatically (no submodule, no fetch-at-CI-time) — every sync here is a deliberate, reviewed commit.
