# Test Cases: Fix vi.mock Hoisting ReferenceError in applyRemotePreferences.spec.ts

This is a test-infrastructure fix with no new or changed runtime behaviour in the
application. No new `.spec.ts` files are written for this task; the existing
`applyRemotePreferences.spec.ts` is corrected so its already-defined scenarios (successful
merge, TC-6, TC-7 from issue #106) can run at all.

Verification: running `src/utils/applyRemotePreferences.spec.ts` must succeed with zero
collection errors (no `ReferenceError` at file load) and the same pass/fail outcome for every
existing scenario as intended before the hoisting bug:
- the successful-merge scenarios (station list replaced, default fuel type saved or cleared)
  still pass
- TC-6 (a failed default-fuel write rolls back the station list to its pre-merge value) still
  passes
- TC-7 (a failed merge restores the pre-merge sync timestamp, not the freshly-marked one,
  including the never-synced-before/undefined case) still passes

Running the full suite (`npm run test`) after the fix must show no regression in any other
spec file, in particular `useRemotePreferencesSync.spec.ts`, which mocks the same module via
an unrelated pattern.

status: ready
