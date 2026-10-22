# ADR-017: Pinned External `release.sh`, Single-Trunk Push-Triggered Release

**Date:** 2026-10-22
**Status:** Accepted

## Context

ADR-015 vendored `release.sh` into `scripts/release/` and ADR-016 moved the pipeline to a single-trunk, push-triggered model, keeping the script vendored with one local hunk (a widened branch check). Maintaining a copy meant every upstream fix needed a reviewed re-sync plus re-applying that hunk.

The script now lives in its own repository, [semantic-release-script](https://github.com/JeremieLitzler/semantic-release-script), tagged `v1.0.0`, and already runs in [deadlinkprobe](https://github.com/JeremieLitzler/deadlinkprobe/blob/main/.github/workflows/release.yml) from a pinned SHA without any local modification.

## Decision

`.github/workflows/release.yml` downloads `release.sh` at a pinned commit SHA (`RELEASE_SCRIPT_REF`, tag `v1.0.0`) at run time and runs that copy, never the copy on the commit being released. The SHA is pinned rather than the tag, since a tag can be moved. Moving the pin is a reviewed commit.

The single-trunk model from ADR-016 is kept unchanged in substance:

- `develop` is the only long-lived branch; changes land by rebase-merged pull request.
- A push to `develop` previews the release; a pushed `release/<date>` branch publishes it; the guard refuses any other ref.
- Publish runs on `GITHUB_TOKEN` (`contents: write`), with no GitHub App token.

Added by this decision:

- A `test` job (`npm ci`, `npm audit signatures`, `npm run test`, `npm run build`) gates `publish`.
- A `deploy-site` job calls `NETLIFY_BUILD_HOOK` after a release is cut, kept separate so a Netlify outage never turns a published release red.
- The version is left to the commits; no level is forced.

The vendored `scripts/release/` directory is removed. This supersedes ADR-015 and ADR-016.

## Consequences

### Positive

- No local copy to sync and no local hunk to re-apply: the script is unmodified upstream.
- A bug in a commit cannot break its own release, since the script is not taken from that commit.
- A release cannot be published with a failing test or build.

### Negative

- Every run depends on `raw.githubusercontent.com` and the upstream repository being reachable.
- Trust moves to the upstream repository: the pin must be moved by a deliberate, reviewed change, because the script runs unattended with `--yes`.
- A release created with `GITHUB_TOKEN` triggers no further workflow; any future `on: release` or `on: push: tags` automation must restore an App or PAT token first.

## Alternatives Considered

- **Keep the vendored copy**: rejected; it carried a maintenance cost for a script that now needs no local change.
- **Pin the tag name instead of the SHA**: rejected; a tag can be moved, a SHA cannot.

## Notes

- Implemented by issues #178 and #180. How to operate the pipeline: `docs/agents/ci.md`.
