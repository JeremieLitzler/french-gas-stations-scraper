# Feature 5 — Managing favorite stations

## Purpose

Lets the user view, add, edit, and delete favorite stations in an inline table. Every change auto-saves to IndexedDB immediately and reactively updates the price table and the fuel-type selector — no page reload, no save button.

## Implementing code

- `src/components/StationManager.vue` — hosts the table plus the Export / Import controls (Feature 9).
- `src/components/StationManagerTable.vue` — the editable table: inline name/URL inputs, per-row delete, the permanent empty "new station" row, inline error/success messages, blur handlers, and `markStationChange` to record a pending change.
- `src/composables/useStationStorage.ts` — `addStation`, `updateStation(originalUrl, updated)`, `removeStation`; the reactive list; IndexedDB persistence.
- `src/composables/useStationPrices.ts` — incremental `add` / `remove` / refetch-by-URL operations.
- `src/components/StationPricesContent.vue` — watches `useStationStorage` and calls the incremental price operations (ADR-009 imperative pattern).
- `src/types/station.ts` (`Station`).

## Behaviour & rules

**Inline table.** Two editable columns — Name and URL — per row, plus an unheaded delete column. A permanently visible empty row sits at the bottom: when both cells are filled, valid, and non-duplicate on blur it adds the station via `addStation`, then resets to blank.

**Validation (identical for add and edit).** (1) Name must not be empty — whitespace-only counts as empty. (2) URL must start with `https://www.prix-carburants.gouv.fr/station/`. (3) The URL must not already exist in another row.

**Auto-save on blur.** A changed cell that passes validation is saved at once via `updateStation`, which writes straight to IndexedDB. A brief per-row success message appears for ~2 seconds; it does not appear for a no-op blur (value unchanged) or after adding a new station.

**Failed-validation blur — known limitation.** Today, a blur that fails validation reverts the field to its last successfully saved value and shows an inline error; the typed text is discarded. The preferred behaviour — keep the typed value, show the error, and simply not persist until it is valid — is not built. It is tracked as a follow-up issue opened alongside this documentation reorganization.

**Delete is immediate.** Clicking a row's delete action calls `removeStation` right away — there is no confirmation dialog. On an unexpected failure the row stays visible with an inline error.

**No diff on a local edit.** There is no diff screen for editing a favorite station. The diff dialog belongs to the push-to-GitHub step (Feature 7) and is only ever seen by an authenticated user.

**Reactive downstream (ADR-009).** Deleting a station removes its price rows immediately. Changing a URL removes the old price row and triggers a fresh fetch for the new URL (a warning on failure). Changing only the name relabels the price row with no re-fetch. Adding a station triggers a fetch. After any change the available fuel-type list is re-derived; the selected type is kept unless it no longer appears, in which case it resets to the first available.

## Related ADRs

- [ADR-008](../../decisions/ADR-008-client-side-storage.md) — IndexedDB for client-side persistence.
- [ADR-009](../../decisions/ADR-009-cross-composable-reactivity-pattern.md) — the imperative cross-composable reactivity pattern between the station list and the price table.
- [ADR-002](../../decisions/adr-002-state-management.md) — singleton composable for shared state.

## See also

- **Feature 2** persists the list and, for an authenticated user, pushes it to GitHub.
- **Feature 3** re-fetches prices when a station changes.
- **Feature 4** and **Feature 6** re-derive the selector and table after a change.
- **Feature 7** is disabled while any local edit has not yet been pushed to GitHub.

_Source specs (in git history): `issue-17`, `issue-31`._
