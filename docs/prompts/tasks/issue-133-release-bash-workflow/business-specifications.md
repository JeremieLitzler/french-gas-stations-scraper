# Business Specifications: Release via `release.sh`

## Goal and scope

Add a second, independent release automation path that runs `release.sh` (sourced from `JeremieLitzler/semantic-release-script-testing`) instead of the npm-based `semantic-release` used by [[release.yml]] / ADR-004. It has two observable modes against a configured source/target branch pair: a **preview** on any pull request targeting the target branch, and a **publish** once such a pull request merges. `release.yml` is untouched and keeps running in parallel — no decision is made yet about retiring it.

## Files to create or modify

- `.github/workflows/release-bash.yml` — new workflow with two triggers against the configured target branch:
  - any pull request opened/updated against it — runs a preview.
  - a pull request closed as merged into it — runs the publish.
- A vendored copy of `release.sh` (and any files it directly requires to run) committed into this repo, kept in sync with the upstream script.

## Branch configuration

- The source and target branch names are held as easily-changed workflow configuration, not hardcoded into trigger logic — so they can point at two temporary branches for validation before being switched to `develop` (source) and `main` (target).
- The workflow only acts on merges into the configured target branch; merges into any other branch are ignored.
- A pull request that is closed **without** being merged (declined, abandoned) must not trigger a release.

## Execution rules

- Both modes run fully unattended (`--yes`/`-y`): no approval gate waits on interactive input, since GitHub Actions provides no TTY — without `--yes`, the script errors out immediately at the first gate ("no terminal available to confirm ... — rerun with --yes"), so `--yes` is required in every CI run regardless of mode.
- **Preview** (any PR against the target branch): also runs with `--dry-run`/`-n`. It computes and surfaces the version bump and release notes that would be produced, without creating a tag, pushing, or publishing a release. Re-running the preview on further pushes to the same PR reflects the PR's current commits — it does not accumulate stale output from earlier pushes.
- **Publish** (PR merged into the target branch): runs without `--dry-run`. It creates a git tag and publishes a GitHub release with the generated notes.
- Version bump, commit classification, and release-notes content are determined by the script's own conventional-commit analysis of the range since the last tag — this workflow does not override the bump level, in either mode.
- No file (e.g. `CHANGELOG.md`) is committed back to the repository in either mode.
- If there are no releasable commits since the last tag on the relevant range, both modes complete without creating a tag or release (preview shows no release notes), and without failing the run.
- Publish mode: if a tag for the computed version already exists (e.g. re-run, race between overlapping merges), the workflow fails visibly rather than silently overwriting or duplicating a release.
- Publish mode: only one run is allowed to execute at a time for a given target branch; a second merge landing while a run is in progress waits rather than racing it. Preview runs for different PRs are independent of each other and of any in-progress publish run.

## Authentication

- `develop` and `main` are protected branches. The **publish** mode authenticates as a GitHub App (via `actions/create-github-app-token`, replacing the unmaintained `tibdex/github-app-token` used in `release.yml`) so the tag push and release creation succeed against branch protection, consistent with the existing `GH_APP_ID` / `GH_APP_KEY` secrets. The default `GITHUB_TOKEN` is not used for the release-creating steps.
- **Preview** mode does not push or write anything, so it does not require the GitHub App token unless reading the commit range needs more than the default `GITHUB_TOKEN` provides.

## Out of scope

- Retiring or modifying `release.yml` / ADR-004's npm-based `semantic-release` pipeline.
- Writing `CHANGELOG.md` back to the repository.
- Any UI-facing or `src/` change — this is CI/CD configuration only.

### ADR Required

This introduces a second, structurally different release automation pattern (a vendored bash script, GitHub App token via `actions/create-github-app-token`, PR-merge-triggered) running alongside the npm/semantic-release pattern documented in ADR-004. Since two release mechanisms will coexist with no retirement decision for either yet, this choice and its rationale should be captured in a new ADR.

status: ready
