# Technical Specifications — Issue #43: Mobile Station Manager Column Sizing (Retry 3)

## Root Cause

`Table.vue` applies `w-full` to the `<table>` element:

```html
<table :class="cn('w-full caption-bottom text-sm', props.class)">
```

`w-full` stretches the table to the container width and the browser distributes that width equally among columns (default table layout). Name and URL columns each receive one-third of the available width. The inputs inside those cells have `width: 100%` in scoped CSS, so they fill whatever the cell gives them — resulting in truncated display when content is longer than the cell.

## Fix

### `src/components/StationManagerTable.vue`

Added `class="table-auto"` to the `<Table>` component:

```html
<Table class="table-auto">
```

`Table.vue` merges `props.class` via `cn(...)`, so `table-auto` is appended to the class list and takes effect. Tailwind's `table-auto` sets `table-layout: auto`, which instructs the browser to size each column based on its content rather than dividing available width equally. The delete column (already constrained with `w-px whitespace-nowrap`) shrinks to content width; Name and URL columns expand to show their content, and if the total exceeds the viewport the existing `overflow-auto` wrapper on `Table.vue`'s outer `<div>` provides horizontal scroll.

No other files were changed.

## Technical Choices

**`class="table-auto"` on `<Table>` vs. modifying `Table.vue` directly:**
`Table.vue` is a shared primitive used by `StationPricesContent` and potentially other future consumers. Modifying its default class would affect all usages. Passing `table-auto` as a `class` prop from the consumer (`StationManagerTable.vue`) scopes the change to exactly this component without side effects.

**`table-auto` vs. removing `w-full`:**
`w-full` cannot be removed from the consumer side — it is hardcoded inside `Table.vue`. `table-auto` overrides the layout algorithm independently of `w-full`; with `table-layout: auto`, the browser ignores the declared width when sizing columns and instead uses content width. This achieves the goal without modifying the shared primitive.

**Retaining `w-auto` on Name/URL `<TableHead>` and `w-px whitespace-nowrap` on delete column:**
These classes remain correct and complementary. `w-auto` makes intent explicit (these columns size to content); `w-px whitespace-nowrap` ensures the delete column shrinks to button width. With `table-auto` now active, these hints are honoured by the browser layout engine.

## Self-Code Review

1. **Interaction with `StationPricesContent`:** `StationPricesContent` also uses `<Table>` but does not pass `class="table-auto"`. Its layout is unchanged — `w-full` with default table layout remains active for that component. No regression.

2. **Responsiveness:** With `table-auto`, if the combined content width of all columns exceeds the viewport, the table overflows its container. `Table.vue`'s wrapper `<div class="relative w-full overflow-auto">` already handles this with horizontal scroll. The fix is therefore safe at any viewport width.

3. **Input `width: 100%`:** The scoped `.station-input { width: 100%; }` rule makes inputs fill the cell. With `table-auto`, the cell grows to the input's natural/minimum size, so the input is never clipped. Long URLs will cause the URL column to widen accordingly.

status: ready
