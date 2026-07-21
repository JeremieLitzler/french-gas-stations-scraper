# Review Results — Sub-Issue D (#86): Write Preferences to Remote Repo on Update

## Lint

Fails, but only in files this sub-issue does not touch (`src/composables/usePreferencesExport.spec.ts`,
`src/composables/usePreferencesImport.spec.ts` — pre-existing from issues #63/#69, confirmed via
`git log`/`git diff HEAD~2 --stat`: none of the 6 changed source files in this sub-issue appear in
that failure list). Included for completeness, not attributable to this sub-issue:

```
E:\Git\...\src\composables\usePreferencesExport.spec.ts
  39:5  error  'lastDownloaded' is assigned a value but never used  @typescript-eslint/no-unused-vars

E:\Git\...\src\composables\usePreferencesImport.spec.ts
   36:15  error  'PreferencesDiff' is defined but never used       @typescript-eslint/no-unused-vars
   71:33  error  '_s' is defined but never used                    @typescript-eslint/no-unused-vars
   72:36  error  '_url' is defined but never used                  @typescript-eslint/no-unused-vars
   72:50  error  '_s' is defined but never used                    @typescript-eslint/no-unused-vars
   73:42  error  '_label' is defined but never used                @typescript-eslint/no-unused-vars
  433:34  error  '_url' is defined but never used                  @typescript-eslint/no-unused-vars
  466:34  error  '_url' is defined but never used                  @typescript-eslint/no-unused-vars
  468:11  error  'externalUrl' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 9 problems (9 errors, 0 warnings)
```

## Type-check

`type-check: clean`

## Checklist findings

### `isWriting` guard silently drops a concurrent local edit instead of queuing or notifying (business-specifications.md Sub-Issue D rule 1)

- **Where:** `src/composables/useRemotePreferencesWrite.ts:279` (`pushPreferences`, the `if (isWriting.value) return` guard) and `:296` (`confirmWrite`, same guard).
- **What's wrong:** `isWriting` is a single module-level flag shared across every call site (`StationManagerTable.vue` and `StationPricesContent.vue` both call the same singleton). It is set `true` only for the duration of one `pushPreferences`/`confirmWrite` call's async work and reset `false` in that call's own `finally` block — including the case where that call's outcome was merely *opening the diff dialog and awaiting user confirmation*, at which point `isWriting` is already back to `false` even though a write is still pending user action.
- **Concrete failure scenario:** remote file already exists (diff-dialog path). User edits station A (blur) → `saveExistingRow` → `updateStation` (IndexedDB write completes) → `pushStationChange` → `pushPreferences` starts, sets `isWriting = true`, and awaits `fetchExistingFile`'s network GET. Before that GET resolves, the user edits station B (blur) → `updateStation` (IndexedDB write for B completes) → `pushStationChange` → `pushPreferences` runs again, finds `isWriting.value === true`, and returns immediately — no error, no `divergedNotice`, nothing. B's IndexedDB write already contains A's change too (since `buildPreferencesFile` reads the shared `stations` ref), but A's already-captured snapshot (built before B's edit) is what ends up in the diff dialog/eventual PUT. If the user does not trigger a further push afterward (e.g. no more edits, or the next edit lands while a write is again in flight), **B's change is permanently pushed to IndexedDB but never sent to GitHub, and the user is given no indication that anything was skipped** — no `writeError`, no `divergedNotice`, no diff dialog for B at all.
- **Why this contradicts the spec/self-review:** business-specifications.md Sub-Issue D rule 1 requires "whenever the user saves a change ... a write request is sent to the remote repo" for every save, not "for every save that doesn't overlap with another in-flight save." The technical spec's own self-review fix #2 explicitly names this exact trigger ("two blur events firing in quick succession") as the scenario the `isWriting` guard is meant to handle, but the guard only prevents the *symptom* it originally called out (duplicate PUTs against a stale `sha`) by trading it for silent request-dropping — worse, because rule 5's cancel path (`cancelWrite`) sets a persistent `divergedNotice` for the equivalent "local differs from remote, no write happened" state, while this path sets nothing at all, so the user has strictly less feedback here than in the already-covered cancel case.
- **Suggested direction (for `/jli-codes` to evaluate):** either queue the last-attempted `preferences` snapshot and re-run `pushPreferences` when the in-flight call's `finally` fires, or — simpler — have the guarded-out call set `divergedNotice` (same message already used for the cancel path) instead of silently no-op'ing, so the user is at least told their latest change hasn't reached GitHub yet.

All other checklist items ✓.

status: changes requested
