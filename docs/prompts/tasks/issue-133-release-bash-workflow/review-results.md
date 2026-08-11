# Review Results: Release via `release.sh`

lint: fails, but every failing file is pre-existing and unrelated to this task's changes (`.github/workflows/release-bash.yml`, `scripts/release/release.sh`, `scripts/release/VENDORED.md` — none are JS/TS, none touch the two files below). Not caused by, or fixable within, this change.

```
E:\Git\GitHub\french-gas-stations-scraper_feat-release-bash-workflow\src\composables\usePreferencesExport.spec.ts
  39:5  error  'lastDownloaded' is assigned a value but never used  @typescript-eslint/no-unused-vars

E:\Git\GitHub\french-gas-stations-scraper_feat-release-bash-workflow\src\composables\usePreferencesImport.spec.ts
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

type-check: clean

## Checklist findings

Both prior findings are resolved: `determine-mode`'s decision step (`release-bash.yml:39-61`) now uses two early-exit guard clauses plus an `emit_outputs()` helper instead of nested `if`/`else`, and no longer has unused `release_preview`/`release_publish` step `id`s. `technical-specifications.md` was updated to match and records both fixes.

All other checklist items ✓ — every rule in `security-guidelines.md` remains verifiably addressed, the implementation still matches every business-spec requirement, naming is clear throughout, and no new dead code, unreachable branches, or abbreviations were introduced by the fix.

status: approved
