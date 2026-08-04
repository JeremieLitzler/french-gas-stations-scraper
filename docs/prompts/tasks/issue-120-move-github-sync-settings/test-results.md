# Test Results — Issue #120: Move GitHub Sync Settings

## Test Run

Command: `npx vitest run --reporter=json` (Vitest v4.1.0) from the
`refactor-move-github-sync-settings` worktree.

## Files Run

All those mentioned in [technical specs](technical-specifications.md), plus the full existing
Vitest suite (`npx vitest run` runs every `*.spec.ts`/`*.test.ts` file in the repo, not only the
ones this issue touched).

## Results

An initial run found one failure in a test written for this issue:
`StationManager.spec.ts`'s "test-cases.md (issue #120) scenario 2" asserted
`wrapper.findComponent({ name: 'PreferencesExport' }).exists()`, but the `PreferencesExport`/
`PreferencesImport` stubs in `mountComponent()` are anonymous objects (`{ template: '<div />' }`)
with no `name`, so component-name matching couldn't resolve them — unlike the `AppLoader` stub,
which is matched by a `.app-loader-stub` CSS class elsewhere in the same file. This was a wrong
assertion in the new test, not a code bug: fixed by giving both stubs their own marker classes
(`.preferences-export-stub` / `.preferences-import-stub`) and asserting on those instead of
`findComponent({ name })`. Re-ran the suite after the fix.

All tests passed. No failures.

### Test Summary

382 test files, 457 tests total — all passed.

- Duration: ~10 seconds

status: passed
