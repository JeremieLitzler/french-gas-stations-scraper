# Test Cases — Issue #59: Update release pipeline trigger

## Scope

The change is limited to `.github/workflows/release.yml` — a GitHub Actions YAML configuration file. There is no TypeScript source, Vue component, composable, or runtime logic to exercise with Vitest.

No runtime tests — verified by manual review of the workflow YAML and confirmed by integration testing on GitHub Actions.

## Observable Behaviour Scenarios (CI/integration level)

These scenarios describe what must be true after the change. They are not Vitest test cases; they are acceptance criteria for manual or CI-environment verification.

**Scenario 1 — Release branch push triggers the pipeline**
- Precondition: `.github/workflows/release.yml` has been updated with the new trigger.
- Action: Push a branch named `release/20260320.1` to `origin`.
- Expected outcome: The release GitHub Actions workflow run is started.

**Scenario 2 — Push to `main` does NOT trigger the pipeline**
- Precondition: `.github/workflows/release.yml` has been updated with the new trigger.
- Action: Push a commit to the `main` branch.
- Expected outcome: No release workflow run is started.

**Scenario 3 — Push to an unrelated branch does NOT trigger the pipeline**
- Precondition: `.github/workflows/release.yml` has been updated with the new trigger.
- Action: Push a commit to a branch named `develop` or `feat/foo`.
- Expected outcome: No release workflow run is started.

**Scenario 4 — Branch created on GitHub website triggers the pipeline**
- Precondition: `.github/workflows/release.yml` has been updated with the new trigger.
- Action: Create a branch named `release/20260320.1` directly via the GitHub UI (which fires a push event on first commit).
- Expected outcome: The release workflow run is started.

**Scenario 5 — Branch name not matching the date pattern does NOT trigger the pipeline**
- Precondition: `.github/workflows/release.yml` has been updated with the new trigger.
- Action: Push a branch named `release/anything` or `release/v1.0`.
- Expected outcome: No release workflow run is started.

status: ready
