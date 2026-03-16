# Technical Specifications — Station Management UI (#17)

## Files Changed

| File | Change | Description |
|------|--------|-------------|
| `src/composables/useStationStorage.ts` | Modified | Added `updateStation(originalUrl, updated)` operation; strengthened `isValidUrl` to require `/station/` path prefix; strengthened `isValidName` to reject whitespace-only strings via `trim()` |
| `src/components/StationManager.vue` | Created | New component rendering the editable station table with auto-save on blur, delete per row, and permanent empty new-station row at bottom |
| `src/pages/index.vue` | Modified | Mounts `StationManager` so it is visible on the home page |

## Technical Choices

### `RowDraft` interface for draft state

Each existing row maintains a local draft object (`{ originalUrl, name, url, nameError, urlError, rowError }`) rather than binding directly to the reactive `stations` array. This prevents partial edits from being exposed to other consumers of `useStationStorage` until a blur save succeeds. The `originalUrl` field identifies the row across stations-list rebuilds triggered by the `watch`.

A `watch` on `stations` (from the composable) rebuilds `rowDrafts` whenever the list changes. This means any successful add, update, or delete causes all drafts to be refreshed from the source of truth. The cost is negligible (small array rebuild), and the benefit is consistency — the drafts always reflect the persisted state after any storage operation.

### URL validation duplicated in the component

`isValidUrl` logic is intentionally duplicated in `StationManager.vue` to perform synchronous client-side validation before calling the composable. The composable also validates (security-in-depth). The component validates to give immediate inline feedback without an async round-trip to IndexedDB; the composable validates to enforce the invariant regardless of caller.

### `watch` rebuilds all drafts on any stations change

When `updateStation` succeeds, `stations.value` is replaced with a new array. The watch fires and rebuilds `rowDrafts` — including updating the `originalUrl` to the new URL if the URL was changed. This keeps `originalUrl` always in sync with the persisted URL, which is used for subsequent blur-save identity lookups.

### No `v-model` on existing-row inputs

Existing rows use `:value` + `@input` instead of `v-model` to avoid two-way binding that would bypass the revert-on-invalid-blur logic. The draft's `name`/`url` fields serve as the intermediate state; the final save only happens on blur after validation.

### `onNewRowBlur` shared handler

Both new-row inputs share the same `onNewRowBlur` handler (called on blur of either field). This means the save attempt is triggered whether focus leaves the name or the URL field. The guard logic ensures no save and no error when only one field is filled.

### Object Calisthenics exceptions

- `StationManager.vue` script setup block contains more than five logical lines because Vue's Composition API requires co-locating all setup logic in the script setup context. This is the same documented exception applied in `useStationStorage.ts`.
- `RowDraft` interface has six fields, exceeding the "two instance variables" rule. A `{ nameError, urlError, rowError }` errors sub-object would technically satisfy the rule but would add nesting without clarity benefit in a flat Vue reactive context. This exception is recorded here.

## Self-Review: Three Potential Issues

1. **Concurrent blur events:** If the user blurs name and URL in rapid succession on the same row, two `saveExistingRow` calls could race. The second call's `updateStation` will overwrite the first. In practice this is benign (both values will eventually reflect the most recent input), but a debounce guard could be added in a follow-up.

2. **Watch rebuilds during in-progress typing:** If an external event updates `stations` while the user is mid-keystroke in a row, the watch will rebuild `rowDrafts` and overwrite the draft. Since `buildDrafts` sources from `stations.value` (persisted state), any unblurred typed characters would be lost. This is an acceptable trade-off for a simple management UI; a more complex solution would track "dirty" rows and skip rebuilding them.

3. **`originalUrl` as row key:** Using the URL as the Vue `:key` is correct today because URLs are unique per station. If two rows temporarily had the same URL (impossible under current validation), the key would collide and Vue would reuse a DOM node incorrectly. The duplicate-URL validation prevents this at the add/update level.

status: ready
