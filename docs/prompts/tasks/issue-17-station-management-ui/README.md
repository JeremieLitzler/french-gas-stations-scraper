# Issue #17: feat: implement station management UI (view list, edit, delete, add station)

## Context

Closes part of #9. Depends on #15.

The user must be able to view, edit, delete, and add stations without leaving the page, using a table-based UI.

## Acceptance criteria

- A `StationManager.vue` component (or equivalent) added to `src/components/`
- **View:** a table where each row represents one station with two columns: name and URL
- **Edit:** each cell is a live `<input>` — edits auto-save on blur/change (no explicit Save button per row)
- **Delete:** each row has a delete action that removes the station immediately
- **Add:** a blank empty row at the bottom of the table lets the user add a new station; typed values auto-save on blur/change when both name and URL are filled and valid
- **Validation rules:**
  - Name must not be empty
  - URL must match the pattern `https://www.prix-carburants.gouv.fr/station/<id>`
  - Duplicate URLs are rejected with an inline error message
- On successful save/edit, the station is written to IndexedDB via `useStationStorage` and the table updates immediately
- Inline validation errors shown per field; no full-page reload
- Unit tests cover: valid new-row submission saves to storage, edit auto-saves on blur, duplicate URL rejected, invalid URL rejected, empty name rejected, delete removes station

## Source

GitHub issue: https://github.com/JeremieLitzler/french-gas-stations-scraper/issues/17
