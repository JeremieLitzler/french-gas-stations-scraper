# Business Specifications: Fix vi.mock Hoisting ReferenceError in applyRemotePreferences.spec.ts

## Goal and Scope

Restore `src/utils/applyRemotePreferences.spec.ts` to a runnable state: it currently fails at
collection time with `ReferenceError: Cannot access 'mockGetPreferencesSyncedAt' before
initialization`, so none of its test cases execute. Scope is limited to this one spec file's
mock declaration; no application code and no other spec file are touched. This is a test-only
fix per ADR-005's Vitest conventions.

## Example Mapping

**Rule:** The file loads and every test case it already contains (successful-merge scenarios,
TC-6, TC-7) runs and passes with the same assertions and expected outcomes as before the
`vi.mock` factory referenced not-yet-initialized values.
- Example: running the suite reports zero collection errors for this file, and TC-6/TC-7 still
  verify the same rollback and timestamp-restore behavior documented in `test-cases.md`
  (issue #106).

**Rule:** The observable behavior of the mocked `getPreferencesSyncedAt` /
`restorePreferencesSyncedAt` functions — what each test configures them to return, how many
times they're called, their call arguments, and their call order relative to
`replaceStations` — is unchanged. Only how the mock is declared changes, not what it does.

**Rule:** No other spec file, its mocking approach, or its pass/fail status is affected.
- Edge case: `src/composables/useRemotePreferencesSync.spec.ts` also mocks
  `@/utils/preferencesSyncTimestamp`, but via a dynamic-import pattern that isn't exposed to
  this hoisting issue; it is out of scope and must keep passing unchanged.

## Files

- `src/utils/applyRemotePreferences.spec.ts` — the failing test file; its mock declaration for
  `@/utils/preferencesSyncTimestamp` is corrected so the mocked functions are available to the
  factory at the time Vitest's hoisting runs it.

## Out of Scope

- `src/utils/applyRemotePreferences.ts` and `src/utils/preferencesSyncTimestamp.ts`
  (application code) — unmodified.
- Any other `*.spec.ts` file using `vi.mock`.

status: ready
