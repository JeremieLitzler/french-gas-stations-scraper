# Feature 7 — Synchronize from GitHub preference file

## Purpose

A manual "Refresh data" action that immediately pulls the station list and default fuel type from the configured GitHub repo and replaces local data, instead of waiting for the automatic staleness-based sync that only runs on page load. It is a read-only pull — nothing is written back.

## Implementing code

- `src/components/StationManager.vue` — hosts the "Refresh data" action and its confirmation step.
- `src/composables/useRemotePreferencesSync.ts` — gains an on-demand trigger that bypasses the `revalidate-cache-days` staleness check; otherwise reuses the on-load read-and-merge path.
- `src/utils/applyRemotePreferences.ts` — validates the fetched file and replaces the IndexedDB station list and default.
- `src/composables/useRemotePreferencesWrite.ts` — owns the push-to-GitHub side and its confirmation state (`isWriteDialogOpen` / `writeDiff` / `confirmWrite`), plus the pending-change tracking that gates this action.
- `src/components/PreferencesDiffDialog.vue` — the before/after push confirmation (shared with Feature 9's import merge).
- `netlify/functions/github-api-proxy/` — the read (and write) proxy.

## Behaviour & rules

**Visibility.** Shown only when GitHub sync is fully configured and the user is authenticated — the same condition the on-load `syncOnLoad` checks. With no repo configured the action is not rendered at all.

**Disabled with a message when edits are pending.** If there are local station-list edits not yet pushed to GitHub (the "Enregistrer les modifications" action is showing), "Refresh data" is visible but disabled, with an explanatory message. It is deliberately not hidden, so the reason stays discoverable rather than the action simply disappearing.

**Confirmation required.** Clicking it opens a confirm prompt, because confirming discards the current local list and default. Only confirming proceeds.

**On confirm.** Fetches the latest preferences file from the configured repo — exactly as the on-load sync does — and replaces the local station list and default fuel type regardless of how recently local data was synced.

**Failure means full rollback.** If the confirmed fetch fails for any reason — network error, expired session, missing or invalid remote file, org restriction — the local list and default are left exactly as they were, and the same failure message and rollback guarantee the on-load sync provides are reused.

**In progress.** A loading indication is shown and a second refresh cannot be triggered concurrently.

**Reconciliation.** The price table reflects the resulting list once applied: a station no longer present is removed, a newly-present station is scraped for the first time, a station in both keeps its already-fetched prices — the same reconciliation any station-list change performs. The fuel-type selection reflects the newly-applied default.

**Read-only.** The remote GitHub file is never modified by this action. No preference change made this way is ever pushed back.

## Related ADRs

- [ADR-012](../../decisions/ADR-012-github-repo-as-sync-backend.md) — user-owned GitHub repository as the remote sync backend.
- [ADR-011](../../decisions/ADR-011-github-oauth-app-auth.md) — the auth session this action requires.
- [ADR-013](../../decisions/ADR-013-page-level-load-orchestrator.md) — the reconciliation of a changed station list.

## See also

- **Feature 1** provides the auth and config gate.
- **Feature 2** owns the on-load remote-read-and-merge path this action reuses, and its validation and failure rules.
- **Feature 5** — a pending local edit disables this action.
- **Feature 9** shares `PreferencesDiffDialog`.

_Source specs (in git history): `issue-106`; the push side is `issue-64` sub-issue D._
