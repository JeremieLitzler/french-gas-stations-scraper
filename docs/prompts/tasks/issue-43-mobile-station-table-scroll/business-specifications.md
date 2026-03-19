# Business Specifications — Issue #43: Mobile Station Manager Horizontal Scroll

## Goal and Scope

On small-viewport devices (smartphones), the station manager table partially clips column content because the table has no horizontal overflow mechanism. The fix introduces a horizontal scroll wrapper around the table so all columns remain accessible on any screen width.

## Rules

**Rule 1 — Horizontal scroll wrapper**
The station manager table must be enclosed in a container that enables horizontal scrolling when the table width exceeds the viewport width. The table itself must not shrink below its natural content width.

Example: on a 375 px wide screen, swiping left on the table reveals the URL column and the delete-button column without any content being clipped.

**Rule 2 — No layout change on desktop**
On wide viewports where the table fits within the available space, no horizontal scroll bar appears and the layout is visually unchanged.

**Rule 3 — Preferred approach (wrapper div)**
The fix is applied by adding a scroll container around the `<Table>` component in `src/components/StationManager.vue` (or `StationManagerTable.vue`), not by adding per-cell overflow rules.

**Rule 4 — Tailwind-first styling**
The scroll container must be styled using Tailwind CSS utility classes. Custom CSS is permitted only if no Tailwind utility covers the need.

## Files to Modify

- `src/components/StationManager.vue` — add a horizontal-scroll wrapper around `<StationManagerTable />`.

No new files need to be created. No type changes are required.

status: ready
