# Business Specifications — Station Management UI

## Goal and Scope

Enable the user to view, edit, delete, and add stations directly within the app, without navigating away or editing any file. The interaction surface is a table where every row is live-editable.

**In scope:**
- A `StationManager.vue` component added to `src/components/`
- A table display of the current station list, with one row per station and two editable columns: name and URL
- Inline editing of any existing row — edits auto-save on blur (no explicit per-row Save button)
- Per-row deletion with immediate effect
- An empty "new station" row permanently appended at the bottom — it auto-saves when both name and URL are filled and valid
- Extending `useStationStorage` with an `updateStation` operation to support inline edits of existing stations
- Mounting `StationManager` on the home page

**Out of scope:**
- Bulk import or export of stations
- Reordering rows
- Any change to the Netlify function or the price-scraping flow

## Files to Create or Modify

| File | Role |
|------|------|
| `src/components/StationManager.vue` | New component — renders the station table with editable rows, delete actions, and the new-station empty row |
| `src/composables/useStationStorage.ts` | Modified — add an `updateStation(originalUrl, updated)` operation for editing existing entries |
| `src/pages/index.vue` | Modified — mount `StationManager` so it is visible on the home page |

No new composables, utilities, or types beyond those listed are required. All storage operations go through the existing `useStationStorage` composable.

## Rules and Constraints

### Station list display

- The station list is shown as a table with two data columns: **Name** and **URL**.
- An additional column (no header) holds a delete action for each existing row.
- The table reflects the live reactive state from `useStationStorage`; it updates automatically whenever a station is added, updated, or deleted.

### Inline editing of existing rows

- Each Name cell and each URL cell in existing rows is a text input.
- When the user changes the value of a cell and moves focus away (blur), the change is validated and, if valid, auto-saved by calling `useStationStorage.updateStation`.
- `updateStation` receives the original URL (to identify the row) and the updated station object `{ name, url }`.
- Validation rules during update are identical to those for adding (see below).
- If validation fails on blur, the input reverts to the last successfully saved value and an inline error is shown adjacent to the field.
- The duplicate-URL rule applies on update: changing a URL to one already present in another row is rejected.

### Delete action

- Each existing row has a delete button/icon.
- Clicking delete immediately calls `useStationStorage.removeStation` with the row's URL.
- The row disappears from the table without any confirmation dialog.
- If deletion fails unexpectedly, an inline error is shown near the row; the row remains visible.

### New-station empty row

- A permanently visible empty row is appended at the bottom of the table.
- It has the same two input cells (Name and URL) as the existing rows, but no delete action.
- When the user fills both inputs and moves focus away from either field, the system validates both values; if valid and not a duplicate, it calls `useStationStorage.addStation`.
- After a successful add, the empty row resets to blank and the new station appears as a regular row above it.
- If only one field is filled when focus leaves, no save attempt is made and no error is shown.
- If both fields are filled but one or both fail validation on blur, inline errors are shown and no save is attempted.

### Validation rules

1. **Name must not be empty.** Whitespace-only values count as empty. An inline error is shown adjacent to the name input.
2. **URL must match the allowed origin and path prefix.** The URL must start with `https://www.prix-carburants.gouv.fr/station/`. An inline error is shown adjacent to the URL input.
3. **Duplicate URLs are rejected.** If the submitted or edited URL already exists in another row of the current station list, an inline error is shown adjacent to the URL input and the change is not persisted.

### Error display

- All errors are shown inline, adjacent to the field they relate to.
- No toast notifications, no modal dialogs, no full-page error states.
- An error on a field is cleared as soon as the user begins typing in that field again.

### `updateStation` behaviour in `useStationStorage`

- The operation receives the original URL (used to locate the row) and the updated `{ name, url }` object.
- It validates the updated name and URL using the same rules as `addStation`.
- It replaces the matching entry in the reactive stations array and persists the updated list to IndexedDB.
- If no entry matches the original URL, the operation is a no-op (no error thrown).
- If validation fails, an error is thrown; the caller is responsible for surfacing it.

## Example Mapping

### Rule: inline edit auto-saves on blur

**Example — valid name edit**
- Given: an existing row shows name "Station A" and a valid URL
- When: the user clears the name field, types "Station B", and moves focus away
- Then: the row now shows "Station B"; the updated list is persisted to IndexedDB

**Example — invalid name edit (empty) reverts**
- Given: an existing row shows name "Station A"
- When: the user clears the name field and moves focus away
- Then: an inline error appears beside the name input; the row reverts to showing "Station A"

**Example — URL changed to a duplicate reverts**
- Given: the list has two rows with different URLs
- When: the user edits one row's URL to match the other row's URL and blurs
- Then: an inline error appears beside the URL input; the row reverts to its previous URL

### Rule: delete removes the row immediately

**Example — delete existing station**
- Given: a row exists for station "Station A"
- When: the user clicks the delete action for that row
- Then: the row is removed from the table immediately; the change is persisted

### Rule: new-station empty row auto-saves when both fields are valid

**Example — both fields filled, valid, not duplicate**
- Given: the empty row's name input has "My New Station" and the URL input has `https://www.prix-carburants.gouv.fr/station/99999`
- When: the user blurs either input
- Then: a new row appears in the table; the empty row resets to blank; the new station is persisted

**Example — only one field filled on blur**
- Given: the empty row's name input has "My New Station" and the URL input is blank
- When: the user blurs the name input
- Then: no save is attempted; no error is shown; the empty row remains as-is

**Example — both fields filled but URL invalid**
- Given: the empty row's name input has "My New Station" and the URL input has `https://example.com/station/1`
- When: the user blurs the URL input
- Then: an inline error appears beside the URL input; no station is saved

### Rule: duplicate URL rejected on add

**Example — URL already in list**
- Given: the list already contains `https://www.prix-carburants.gouv.fr/station/38490005`
- And: the empty row's name input has "Another Station" and URL input has that same URL
- When: the user blurs either input
- Then: an inline error appears beside the URL input; no station is added

### Rule: error clears on typing

**Example — correcting a field after a validation error**
- Given: an inline error is shown beside the URL input in the empty row
- When: the user starts typing in the URL input
- Then: the inline error disappears

## Observability and Quality Constraints

- No full-page reload occurs at any point during the interaction.
- The component uses the singleton `useStationStorage` composable (ADR-002); it does not create its own IndexedDB connection.
- The component follows Vue 3 Composition API with `<script setup lang="ts">`.
- All validation is performed before calling any storage operation.
- The duplicate-URL check is performed against the reactive station list exposed by `useStationStorage`, not by reading IndexedDB directly.
- `updateStation` is added to `useStationStorage` following the same singleton + IndexedDB pattern as the existing operations; no new architectural patterns are introduced.

status: ready
