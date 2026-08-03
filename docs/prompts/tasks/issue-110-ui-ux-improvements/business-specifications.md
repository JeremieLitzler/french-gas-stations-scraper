# Business Specifications — Issue #110: UI and UX improvements

## Goal and Scope

Two independent UI/UX fixes:

1. **Settings page (mobile):** the "Enregistrer" button and the connect/disconnect GitHub button
   must stack vertically on mobile viewports instead of sitting awkwardly in a row; they keep
   sitting side-by-side on wider (tablet/desktop) viewports.
2. **Station list saves (StationManager):** GitHub sync currently pushes on every single field
   edit and shows a raw JSON before/after diff. This introduces an explicit
   "Enregistrer les modifications" button that batches pending station-list changes into one
   GitHub push, with a diff screen that shows only what changed.

Out of scope: the default fuel type save flow (`StationPricesContent.vue`) keeps pushing to
GitHub immediately on change — it is a separate component/flow from `StationManager` and the
issue only scopes the new button to `StationManager`.

## Files to Create or Modify

- `src/components/GitHubSyncSettings.vue` — settings-page button row becomes responsive
  (stacked on mobile, side-by-side on wider viewports).
- `src/components/StationManager.vue` — hosts the new "Enregistrer les modifications" button
  and its visible/hidden state.
- `src/components/StationManagerTable.vue` — station add/edit/delete keep saving to IndexedDB
  immediately, but stop triggering an immediate GitHub push; they instead mark the change as
  pending.
- State tracking for "pending station-list changes since the last successful GitHub push"
  (new or extended composable — left to the technical spec) — exposes whether a push is
  pending and bundles all pending changes into a single push when triggered.
- `src/components/PreferencesDiffDialog.vue` — the GitHub write-confirmation section changes
  from raw before/after JSON blocks to a per-field old → new comparison.
- `src/types/preferences.ts` — `RemoteWritePreview` shape changes from full JSON text
  (`beforeJson`/`afterJson`) to a field-level diff representation.

## Rules

### Settings page mobile layout

- On mobile viewports, the "Enregistrer" button and the connect/disconnect button stack
  vertically, each full-width, in their current order. On wider viewports they remain
  side-by-side as today.
  _Example: on a phone-width screen, "Enregistrer les paramètres" appears above
  "Se connecter avec GitHub", each spanning the section's full width._

### "Enregistrer les modifications" button

- The button is added to `StationManager`, near the existing export/import buttons.
- It is hidden while no station-list change is pending a GitHub push (on load, and right after
  a successful push).
- It becomes visible as soon as the user edits an existing station's name or URL, adds a new
  station, or deletes a station — before that change has been pushed to GitHub.
- Local persistence timing is unchanged: each edit still saves to IndexedDB immediately, as it
  does today. Only the GitHub push is deferred until the button is clicked.
- Clicking the button bundles every station-list change made since the last successful push (or
  since load) into a single GitHub diff/push, instead of one push per edited field.
  _Example: the user renames one station and adds another before clicking "Enregistrer les
  modifications" — both changes appear together in one confirmation dialog and are pushed in a
  single write._
- If the user cancels the confirmation dialog, or the push fails, the pending changes are kept
  and the button stays visible so the user can retry. If the push succeeds, the button becomes
  hidden again.

### GitHub diff screen readability

- The write-confirmation dialog shows only what changed, as an old → new comparison per field
  (e.g. "Nom : Ancien nom → Nouveau nom", "URL : ancienne-url → nouvelle-url"), plus stations
  added or removed, listed by name — not the full JSON content of the file.
  _Example: only the "Nom" field was edited on one station — the dialog shows that single
  name change, not the entire station list._

## ADR Required

This spec changes the "Write Flow" documented in `ADR-012-github-repo-as-sync-backend.md`
("On any preference change, the app writes optimistically to IndexedDB, then to the remote
file...") from an always-immediate GitHub push to a batched, explicitly user-triggered push for
station-list changes made in `StationManager`. This is a change to a previously accepted
architectural decision, not just an implementation detail, so it needs an ADR update/addendum
before implementation.

status: ready
