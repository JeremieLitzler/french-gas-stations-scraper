# Technical Specifications — Success Notification for Station Edits (#17)

## Files Changed

| File | Change |
|------|--------|
| `src/components/StationManager.vue` | Added per-row inline success message shown after a successful `updateStation` call; auto-dismisses after 2 seconds |
| `docs/prompts/tasks/issue-17-station-management-ui/business-specifications.md` | Added "Success feedback on save" rules section and example mapping entries |
| `docs/prompts/tasks/issue-17-station-management-ui/test-cases.md` | Added TC-25 through TC-31 covering success message behaviour |

## Implementation Details

### `src/components/StationManager.vue`

**New state: `rowSuccessMap`**

A `reactive<Record<string, boolean>>` keyed by station URL (the new/saved URL). This is kept separate from `RowDraft` deliberately: the `watch(stations, ...)` callback rebuilds the entire `rowDrafts` array on every `stations.value` change (including after `updateStation`). If `rowSuccess` were a field on `RowDraft`, it would be wiped by the rebuild before the user saw it. Storing success state outside `RowDraft` lets it survive the rebuild.

**`scheduleSuccessDismiss(savedUrl)`**

A small helper that calls `setTimeout` with `SUCCESS_DISMISS_DELAY_MS = 2000` and deletes the entry from `rowSuccessMap` when the timer fires. Extracted to keep `saveExistingRow` under five lines (Object Calisthenics rule 7).

**`saveExistingRow` update**

After `await updateStation(...)` resolves, sets `rowSuccessMap[url] = true` and calls `scheduleSuccessDismiss(url)`. On error, sets `draft.rowError` as before.

**Template**

Added `<span v-if="rowSuccessMap[draft.originalUrl]" class="field-success">Saved</span>` in the delete column, below the delete button and `rowError` span. Uses `draft.originalUrl` as the key — after `buildDrafts` rebuilds following `updateStation`, `draft.originalUrl` equals the saved URL (the new URL after a URL edit), matching the key set in `rowSuccessMap`.

**CSS**

Added `.field-success` rule: `color: #22c55e` (green-500), same layout as `.field-error`.

## Technical Choices

**Separate `rowSuccessMap` instead of `RowDraft.rowSuccess` field**: `RowDraft` is rebuilt wholesale by the `watch(stations)` callback. Any transient state stored on a draft is destroyed when `stations.value` changes. A separate `reactive` map survives this rebuild because Vue tracks it independently. Alternative considered: `flush: 'sync'` on the watch to run synchronously before `saveExistingRow` returns — rejected because sync watchers have broader reactivity implications and make the timing harder to reason about.

**`rowSuccessMap` keyed by `originalUrl`, not index or new URL**: Index-based keying would break after the list is rebuilt (indexes shift on delete). Keying by the new URL would mismatch when `stations.value` does not update (e.g. in tests with a mock), because `draft.originalUrl` stays as the old URL until `buildDrafts` runs. Using `originalUrl` as the key ensures `rowSuccessMap[originalUrl]` always matches `draft.originalUrl` in the template.

**`SUCCESS_DISMISS_DELAY_MS` constant**: Named constant at the top of the script block makes the 2-second delay obvious and easy to adjust in tests (via `vi.useFakeTimers`).

**Known limitation**: `setTimeout` callbacks are not cleared on component unmount. For a page-level component that remains mounted for the lifetime of the app session, this is acceptable. An `onUnmounted` cleanup would require tracking timer IDs per row, adding complexity not justified by the use case.

## Object Calisthenics Notes

- `scheduleSuccessDismiss` was extracted to keep `saveExistingRow` under five lines.
- Vue composable and component conventions require grouping reactive state and handlers in one `<script setup>` block; the five-line rule is relaxed per the documented framework exception.

status: ready
