# Business Specifications — Issue #28: Default Fuel Type

## Goal and Scope

Allow the user to designate one fuel type as their personal default. The default is persisted to IndexedDB (ADR-008) so it survives page reloads. When the price view loads, it selects the default fuel type automatically instead of the first type in the derived list. The user can update or clear the default at any time via explicit actions.

## Stories

### Story 1 — Save a default fuel type

**Rule:** "Save as default" is visible only when NO default is currently stored.

**Rule:** The action is only available after at least one fuel type is selected (i.e. the price table is visible).

**Rule:** When the user clicks "Save as default", the currently selected fuel type is stored in IndexedDB under a dedicated key. After saving, the button is hidden (a default now exists) and a visual indicator confirms the active default near the fuel selector or on the currently selected type row.

**Example:** No default is stored. User selects "SP95". "Save as default" is visible. User clicks it → "SP95" is stored as default → "Save as default" disappears → a "Default" indicator appears near "SP95".

### Story 2 — Load and apply the default on startup

**Rule:** When the price view initialises and a default is stored, the selected fuel type is set to the stored default instead of the first available type.

**Rule:** If the stored default fuel type is not present in the derived list (e.g. the station list changed), the selection falls back to the current first-available logic and the stored default is left unchanged.

**Rule:** If no default is stored, behaviour is unchanged — the first derived fuel type is selected.

### Story 3 — Update the default

**Rule:** "Update default" is visible only when a default is already stored AND the currently selected fuel type differs from the stored default.

**Rule:** When the user clicks "Update default", the stored default is replaced with the currently selected fuel type.

**Example:** Default is "SP95", user selects "Gasoil" → "Update default" appears. User clicks it → default becomes "Gasoil" → "Update default" disappears → the "Default" indicator moves to "Gasoil".

**Example:** Default is "SP95", user selects "SP95" (same as stored default) → "Update default" is hidden.

### Story 4 — Clear the default

**Rule:** "Clear default" is visible whenever a default is stored, regardless of which fuel type is currently selected.

**Rule:** When the user clicks "Clear default", the stored default is removed from IndexedDB and the default state is reset to null.

**Rule:** After clearing, the fuel type list returns to its natural (first-encountered) order — no reordering is applied.

**Rule:** After clearing, "Save as default" becomes visible again and the "Default" indicator is removed.

**Example:** Default is "SP95". User clicks "Clear default" → default removed → fuel list reverts to natural order → "Save as default" reappears → no "Default" indicator shown.

### Story 5 — Ordered fuel type list

**Rule:** The fuel type list is reordered so the default type always appears first, followed by the remaining types in their existing first-encountered order.

**Rule:** If no default exists (never set or cleared), the order is unchanged.

## Button Visibility Matrix

| Condition | "Save as default" | "Update default" | "Clear default" |
|---|---|---|---|
| No default stored | visible | hidden | hidden |
| Default stored, current selection = default | hidden | hidden | visible |
| Default stored, current selection ≠ default | hidden | visible | visible |

## Active State — "Default" Indicator

When `isCurrentDefault` is true (the currently selected fuel type matches the stored default), a visual indicator is shown near the fuel selector or on the currently selected type row. This indicator is NOT the "Save as default" button (which is hidden whenever a default exists).

## Button Styling

All three action buttons ("Save as default", "Update default", "Clear default") must use the following CSS custom properties:

```css
--accent: var(--color-stone-200);
--accent-foreground: var(--color-stone-800);
```

These variables must be applied consistently across all three buttons (e.g. as background and text colour respectively).

## Files to Create or Modify

- `src/utils/indexedDb.ts` — add a `remove` (or `delete`) helper if not already present, to support clearing the stored default key.
- `src/composables/useDefaultFuelType.ts` — **new** singleton composable; owns the default fuel type reactive state and its IndexedDB persistence. Exposes `saveDefault`, `updateDefault`, `clearDefault`, and `isCurrentDefault`. Follows ADR-002 singleton pattern and ADR-008 storage approach.
- `src/utils/fuelTypeUtils.ts` — add a pure function that, given the derived list and an optional default, returns the reordered list (default first, rest unchanged); when default is null, returns the list unchanged.
- `src/components/StationPricesContent.vue` — integrate the new composable; render save/update/clear actions per the visibility matrix; show the "Default" indicator; pass the default to the ordering function; apply the specified button styling.
- `src/utils/fuelTypeUtils.spec.ts` — extend with tests for the new ordering function (including the null/no-default case).
- `src/composables/useDefaultFuelType.spec.ts` — **new** test file covering save, update, clear, load-on-startup, and fallback behaviours.

## Constraints

- No new external dependency.
- The default is stored as a plain string (the fuel type label) under a new IndexedDB key distinct from the stations key.
- All reads/writes to IndexedDB are async; the UI must not block while persisting.
- All three action buttons must be keyboard accessible (standard `<button>` elements).
- "Clear default" must remove the key from IndexedDB entirely (not set it to an empty string or null string).

status: ready
