# Security Guidelines — Issue #59: Update release pipeline trigger

## Context

The change is limited to `.github/workflows/release.yml` — a GitHub Actions CI configuration file. It has no frontend, backend, or runtime code surface. The attack surface is restricted to the CI/CD layer.

## Rules

**Rule 1 — Branch-name pattern must be anchored precisely**
The glob pattern used in the `push.branches` trigger must be specific enough to prevent unintended branches from matching. Using an overly broad pattern (e.g. `release/*`) could allow branches such as `release/anything` to trigger the release pipeline. Use the glob `release/[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9].[0-9]*` as specified, which enforces the `yyyyMMdd.N` format.
Where: `.github/workflows/release.yml`
Why: A permissive pattern could let an attacker or an accidental branch name trigger an unintended production release.

**Rule 2 — Checkout step must reference the triggering ref, not a hardcoded branch**
The `actions/checkout` step must check out the ref that triggered the workflow (e.g. via `github.ref` or by leaving `ref` unset, which defaults to the triggering ref). It must not reference `github.event.pull_request.base.ref` or any other PR-scoped context variable, which is undefined on `push` events.
Where: `.github/workflows/release.yml`, `steps.checkout`
Why: Using a PR-scoped ref on a push-triggered workflow would either fail silently or check out the wrong commit, potentially releasing wrong code.

**Rule 3 — No new secrets or environment variables may be introduced**
This change must not add new secrets, tokens, or environment variables to the workflow beyond those already declared. Existing secrets (e.g. `GITHUB_TOKEN`, deployment tokens) remain subject to existing least-privilege grants.
Where: `.github/workflows/release.yml`
Why: Adding new secrets without a documented access review widens the credential exposure surface in the CI environment.

status: ready
