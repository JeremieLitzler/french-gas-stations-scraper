# Review Results — Sub-Issue D (#86): Write Preferences to Remote Repo on Update

## Lint

Fails, but only in files this sub-issue does not touch (`src/composables/usePreferencesExport.spec.ts`,
`src/composables/usePreferencesImport.spec.ts` — pre-existing from issues #63/#69, unchanged since
the previous review round). Included for completeness, not attributable to this sub-issue:

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

Previous finding resolved: the `isWriting` guard in `pushPreferences`
(`src/composables/useRemotePreferencesWrite.ts:283-286`) now sets `divergedNotice` instead of
silently returning when a push arrives while another is already in flight, so a concurrent
local edit that loses the race is surfaced to the user (reusing the existing "local differs
from remote" notice `cancelWrite` already relies on) instead of being dropped with no feedback.
Verified this doesn't regress the surrounding flow: `resetWriteFeedback()` still leaves
`divergedNotice` untouched, `confirmWrite`'s separate `isWriting` guard (a same-call
double-click debounce, backed by the disabled Confirm/Cancel buttons in
`PreferencesDiffDialog.vue`) is unaffected, and the notice self-clears on the next successful
write per rule 6.

All other checklist items ✓.

status: approved
