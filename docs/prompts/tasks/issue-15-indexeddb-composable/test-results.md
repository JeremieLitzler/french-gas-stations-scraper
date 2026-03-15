# Test Results — Issue #15: IndexedDB Composable

## Run Details

- **Date**: 2026-03-15
- **Vitest version**: 4.1.0
- **Worktree**: `feat_indexeddb-composable`
- **Command**: `npm test -- --reporter=verbose`
- **Duration**: ~935 ms

---

## Warnings (non-fatal)

### Duplicated imports in `src/types/`

Vitest emitted three "duplicated imports" warnings at startup:

- `FuelPrice` — duplicate between `src/types/fuel-price.ts` and `src/types/index.ts`; the barrel file (`index.ts`) version was used.
- `StationData` — duplicate between `src/types/index.ts` and `src/types/station-data.ts`; the individual file (`station-data.ts`) version was used.
- `Station` — duplicate between `src/types/index.ts` and `src/types/station.ts`; the individual file (`station.ts`) version was used.

These warnings do not affect test outcomes but indicate that the barrel re-exports in `src/types/index.ts` overlap with the individual type files. This should be cleaned up to avoid confusion.

### happy-dom `AsyncTaskManager` error

One noisy (but harmless) error was printed by `happy-dom` between test files:

```
Error: Failed to execute 'startTask()' on 'AsyncTaskManager': The asynchronous task
manager has been destroyed. This error can be thrown if scripts continue to run while
a browser frame is closed.
```

This is a known happy-dom teardown-order issue when a component navigates on mount while the virtual browser frame is already closing. It does not cause any test failure.

---

## Test Files and Results

### 1. `src/__tests__/types-issue-14.spec.ts`

Tests for the domain type definitions introduced in issue #14.

| Test case | Result |
|-----------|--------|
| TC-01 > ErrorExtended.ts does not exist on disk | PASS |
| TC-01 > ErrorNextPage.ts does not exist on disk | PASS |
| TC-01 > LinkProp.ts does not exist on disk | PASS |
| TC-01 > RouterPathEnum.ts does not exist on disk | PASS |
| TC-01 > SideBarActionsEnum.ts does not exist on disk | PASS |
| TC-01 > SideBarLinkAction.ts does not exist on disk | PASS |
| Station type > TC-02: accepts a valid Station value | PASS |
| Station type > TC-03: rejects Station with wrong name type (compile-time guard) | PASS |
| Station type > TC-04: rejects Station with missing url (compile-time guard) | PASS |
| FuelPrice type > TC-05: accepts a FuelPrice with numeric price | PASS |
| FuelPrice type > TC-06: accepts a FuelPrice with null price | PASS |
| FuelPrice type > TC-07: rejects FuelPrice with string price (compile-time guard) | PASS |
| FuelPrice type > TC-08: rejects FuelPrice with undefined price (compile-time guard) | PASS |
| StationData type > TC-09: accepts a valid StationData | PASS |
| StationData type > TC-10: accepts StationData with empty fuels array | PASS |
| StationData type > TC-11: rejects StationData with missing stationName (compile-time guard) | PASS |
| FuelType enum > TC-12: contains exactly the five expected values | PASS |
| FuelType enum > TC-13: all values are strings, not numbers | PASS |
| FuelType enum > TC-14: rejects an invalid FuelType assignment (compile-time guard) | PASS |
| TC-15 > FuelType is importable from @/types (barrel) | PASS |
| TC-15 > type-only exports compile without error | PASS |
| TC-16 > accepts a FuelType value as the type field of FuelPrice | PASS |

**Subtotal: 22 / 22 passed**

---

### 2. `src/composables/useStationStorage.spec.ts`

Tests for the new `useStationStorage` composable (issue #15 primary target).

| Test case | Result |
|-----------|--------|
| TC-01: First load — populates the reactive list with the five defaults and persists them | PASS |
| TC-02: Subsequent load — uses the stored list and does not overwrite with defaults | PASS |
| TC-03: Adding a station — grows the list by one and writes all three stations to IndexedDB | PASS |
| TC-04: Removing a station — removes only the targeted station and updates IndexedDB | PASS |
| TC-05: Removing a non-existent URL — leaves the reactive list and IndexedDB unchanged | PASS |
| TC-06: Second load with existing data — loads six stations without overwriting | PASS |
| TC-07: Adding to a seeded list — produces six stations with the new one last | PASS |
| TC-08: Singleton behaviour — reflects an addition made via one reference in the other reference | PASS |
| TC-09: Disallowed origin — throws and leaves the list and IndexedDB unchanged | PASS |
| TC-10: Malformed URL — throws and leaves the list unchanged | PASS |
| TC-11: Name with HTML tags — throws because the name contains angle-bracket constructs | PASS |
| TC-12: Malformed IndexedDB data — filters out bad entries while loading valid ones | PASS |
| TC-13: IndexedDB read returns undefined — seeds the five defaults when the store key is absent | PASS |
| TC-14: Load called multiple times — keeps the same three stations after a second load call | PASS |

**Subtotal: 14 / 14 passed**

---

### 3. `src/utils/sanitize.test.ts`

Tests for the `sanitizeBodyHtml` utility.

| Test case | Result |
|-----------|--------|
| TC-01 > preserves div.highlight wrapper | PASS |
| TC-01 > preserves div.chroma wrapper | PASS |
| TC-01 > preserves table element | PASS |
| TC-01 > preserves tr element | PASS |
| TC-01 > preserves td elements | PASS |
| TC-01 > preserves pre elements | PASS |
| TC-01 > preserves code text content | PASS |
| TC-01 > preserves tabindex attribute on pre | PASS |
| TC-01 > preserves data-lang attribute on code | PASS |
| TC-06 > plain paragraph content is preserved unchanged | PASS |
| TC-08 > strips script element while preserving fenced code content | PASS |
| TC-09 > strips onclick attribute from pre while preserving text content | PASS |
| TC-10 > strips onclick attribute from button element | PASS |
| TC-11 > strips iframe while preserving fenced code content | PASS |
| TC-12 > strips javascript: URI from href attribute | PASS |
| TC-13 > strips style attribute while preserving class attribute | PASS |
| TC-16 > preserves HTML entities inside code block as visible text | PASS |
| TC-17 > preserves all fenced code blocks, not only the first | PASS |
| TC-18 > preserves p, ul, blockquote, and fenced code structure together | PASS |
| TC-19 > sanitizeBodyHtml is deterministic: two calls produce the same output | PASS |
| TC-22 > strips object element while preserving fenced code content | PASS |
| TC-22 > strips embed element while preserving fenced code content | PASS |
| TC-23 > strips form element while preserving fenced code content | PASS |

**Subtotal: 23 / 23 passed**

---

### 4. `src/components/layout/AppFooter.test.ts`

Tests for the `AppFooter` component.

| Test case | Result |
|-----------|--------|
| renders a `<footer>` element | PASS |
| renders exactly four external anchor elements | PASS |
| renders an AppLink to https://iamjeremie.me/ with text "Jeremie" | PASS |
| renders an AppLink to https://claude.ai/code with text "Claude" | PASS |
| renders a license AppLink pointing to the GitHub LICENSE file | PASS |
| renders an AppLink to https://www.netlify.com/ with text "Hosted on Netlify" | PASS |
| all links have target="_blank" | PASS |
| all links have rel="noopener" | PASS |
| footer text contains "Made 🛠️ by" | PASS |
| footer text contains "and" | PASS |

**Subtotal: 10 / 10 passed**

---

### 5. `src/components/layout/GuestLayout.test.ts`

Tests for the `GuestLayout` component.

| Test case | Result |
|-----------|--------|
| renders the slot content | PASS |
| renders AppFooter below the slot content | PASS |
| renders a `<footer>` element | PASS |
| footer appears after slot content in the DOM | PASS |
| renders AppFooter even when slot is empty | PASS |
| renders AppFooter with different slot content (error state) | PASS |
| renders AppFooter with different slot content (success state) | PASS |
| root element has layout-guest class | PASS |
| root element uses flex-col layout | PASS |

**Subtotal: 9 / 9 passed**

---

## Coverage Summary

All 14 test cases for `useStationStorage` passed, covering:
- First-load seeding of default stations
- Restoring a stored list on subsequent load
- Adding stations (append + persist)
- Removing stations (filter + persist)
- No-op removal of non-existent URLs
- Singleton shared-state invariant
- Input validation (disallowed origin, malformed URL, HTML in name)
- Resilience against malformed IndexedDB entries
- Idempotency of repeated load calls

### Test Summary

- Total test files: 5
- Total tests: 78
- Passed: 78
- Failed: 0
- Duration: ~935 ms

status: passed
