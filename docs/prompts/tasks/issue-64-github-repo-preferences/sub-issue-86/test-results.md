# Test Results — Issue #86: Write Preferences to Remote Repo on Update

## Test Run

Command: `npx vitest run --reporter=json` (Vitest v4.1.0) from the `feat/write-preferences-remote-repo` worktree.

## Files Run

All those mentioned in [technical specs](technical-specifications.md).

## Results

### Failures

**File:** `src/composables/useRemotePreferencesWrite.spec.ts`

1. **D-3: confirmed write updates the remote file — add station** — `PUTs with the sha fetched for the diff and sets writeSuccess`

   ```
   AssertionError: expected false to be true // Object.is equality
       at src/composables/useRemotePreferencesWrite.spec.ts:206:32
   ```

2. **D-4: confirmed write updates the remote file — edit station** — `PUTs the edited content with the sha fetched for the diff and sets writeSuccess`

   ```
   AssertionError: expected false to be true // Object.is equality
       at src/composables/useRemotePreferencesWrite.spec.ts:232:32
   ```

3. **D-6: first-time write creates the remote file directly, no diff dialog** — `PUTs without a sha and never opens the diff dialog`

   ```
   AssertionError: expected false to be true // Object.is equality
       at src/composables/useRemotePreferencesWrite.spec.ts:277:32
   ```

All three failures assert `writeSuccess.value` to be `true` after a successful `PUT`, and all three receive `false`.

### Test Summary

333 test files, 388 tests total - 3 failed.

- Test files: 329 passed, 4 failed
- Tests: 385 passed (3 failed)
- Duration: ~7 seconds

status: failed
