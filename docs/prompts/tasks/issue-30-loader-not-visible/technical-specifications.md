# Technical Specifications — Fix: Loader not visible during scraping (#30)

## Files Changed

### `src/components/StationPrices.vue`

Removed the `css-class="fetch-loader"` attribute from the `<AppLoader v-if="isLoading" />` element (line 5 of the template).

**Before:**
```html
<AppLoader v-if="isLoading" css-class="fetch-loader" />
```

**After:**
```html
<AppLoader v-if="isLoading" />
```

## Technical Choices

### Why remove the prop rather than add styles for `fetch-loader`

Adding styles for `fetch-loader` would duplicate the default Tailwind class string already defined in `AppLoader.vue`, creating a maintenance burden. The business spec (Rule 3) explicitly states that default appearance is the responsibility of `AppLoader`. Removing the prop is the minimal, correct fix: it delegates styling back to the component's own default, which is already complete and correct.

### No other files modified

`AppLoader.vue` already contains a correct default value for `cssClass`. `App.vue` already omits the prop. No other callers exist. The scope of change is the single attribute removal.

## Self-Code Review

1. **Could removing the prop cause a TypeScript error?** No — `cssClass` is declared `optional` (`?`) in `defineProps`. Omitting it is valid.
2. **Are there other callers of `AppLoader` with a similarly broken prop?** Checked via search — only `StationPrices.vue` passed `css-class`; `App.vue` already omits it.
3. **Does Vue correctly handle the prop omission?** Yes — Vue falls back to the destructuring default `cssClass = '...'` in `defineProps`, which is the full Tailwind string producing a visible full-screen overlay.

## Object Calisthenics Notes

The change is a one-line template attribute removal. No logic, no new functions, no new types. No Object Calisthenics rules apply.

status: ready
