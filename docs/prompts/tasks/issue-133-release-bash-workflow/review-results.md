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

**Object Calisthenics — nested `if`/`else` in the `determine-mode` step, contradicting the technical-spec's own claim.** `.github/workflows/release-bash.yml:42-48` nests two `if` blocks and uses `else` to compute `is_preview`/`is_publish`, but `technical-specifications.md` describes this step as keeping "one level of branching depth." Flatten with guard clauses instead, e.g. emit the all-false outputs and `exit 0` immediately when `$BASE_REF != $RELEASE_TARGET_BRANCH`, then a second guard for the `closed`-without-merge case, leaving only a single top-level check for the publish/preview split. Update the technical-specifications.md line to match once fixed (or drop the claim).

**Dead code — unused step `id`s.** `.github/workflows/release-bash.yml:74` (`id: release_preview`) and `:116` (`id: release_publish`) are never referenced by any downstream step or output; no other step reads `steps.release_preview.*` or `steps.release_publish.*`. Either wire them to a job `outputs:` (if a future consumer is intended) or drop the `id:` keys.

All other checklist items ✓ — every rule in `security-guidelines.md` is verifiably addressed (preview: no GH App secrets, read-only `permissions:`, `pull_request` not `pull_request_target`; PR/branch data passed through `env:` not interpolated into `run:` strings; App-token scoping is external GitHub App configuration outside this file's reach, documented in ADR-015; `release.sh` is a pinned, diff-verified vendor copy with a documented sync procedure in `scripts/release/VENDORED.md`), the implementation matches every business-spec requirement (trigger scope, `--yes`/`--dry-run` modes, no bump override, no `CHANGELOG.md` write, no-releasable-commits handled without failing, existing-tag failure left to `release.sh`'s own `die()`, publish concurrency queues per target branch while preview concurrency is independent per PR, GitHub App token replaces `tibdex/github-app-token`, `release.yml` untouched, no `src/` changes), and naming is clear throughout with no abbreviations.

status: changes requested
