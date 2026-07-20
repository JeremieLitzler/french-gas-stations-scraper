# Test Results — Issue #64: Sub-Issue E — Settings UI for Repo Config and Cache Parameter

## Test Run

Command: `npx vitest run --reporter=json` (Vitest v4.1.0) from the
`french-gas-stations-scraper_feat-settings-ui-repo-config-cache` worktree.

## Files Run

All those mentioned in [technical specs](technical-specifications.md), plus the full existing
suite (303 test files, 356 tests total).

## Results

### Failures

All 5 failures are in `src/components/GitHubSyncSettings.spec.ts` and share the same root
cause: `TypeError: ....trim is not a function` — the value flowing into `cacheDaysDraft` /
`parseCacheDays` is a `number`, not a `string`, once the `revalidate-cache-days` `<Input
type="number">` is edited. `cacheDaysDraft` is a `Ref<string>` and `parseCacheDays(raw: string)`
calls `raw.trim()` unconditionally, but Vue 3's native `v-model` runtime auto-casts to `Number`
for any native `<input>` whose `type` attribute is `"number"` — regardless of a `.number`
modifier being present or not. `Input.vue`'s internal `<input v-model="modelValue" ...>`
inherits `type="number"` via attribute fallthrough from `GitHubSyncSettings.vue`'s
`<Input type="number" ... v-model="cacheDaysDraft" />`, so every edit to that field, in a real
browser, delivers a `number` to `cacheDaysDraft`, not the `string` its type declares. This is a
code defect, not a wrong test assertion — the tests correctly simulate a user typing into the
field via `setValue()`, matching real `<input type="number">` behavior in the browser (and in
happy-dom).

#### E-1: revalidate-cache-days field accepts valid positive integer — saves successfully with no validation error shown

- File: `src/components/GitHubSyncSettings.spec.ts`
- Error:
```
TypeError: cacheDaysDraft.value.trim is not a function
    at ComputedRefImpl.fn (src/components/GitHubSyncSettings.vue:68:28)
```

#### E-2: revalidate-cache-days field rejects zero — shows an inline validation error and does not save

- File: `src/components/GitHubSyncSettings.spec.ts`
- Error:
```
TypeError: cacheDaysDraft.value.trim is not a function
    at ComputedRefImpl.fn (src/components/GitHubSyncSettings.vue:68:28)
```

#### E-3: revalidate-cache-days field rejects negative numbers — shows an inline validation error and does not save

- File: `src/components/GitHubSyncSettings.spec.ts`
- Error:
```
TypeError: cacheDaysDraft.value.trim is not a function
    at ComputedRefImpl.fn (src/components/GitHubSyncSettings.vue:68:28)
```

#### E-6: owner/repo and file path fields re-enabled after logout — re-enables owner/repo and file path, retaining their values, after clicking logout

- File: `src/components/GitHubSyncSettings.spec.ts`
- Error:
```
TypeError: raw.trim is not a function
    at parseCacheDays (src/components/GitHubSyncSettings.vue:51:23)
    at ComputedRefImpl.fn (src/components/GitHubSyncSettings.vue:60:24)
```

#### E-7: login button reflects the login-readiness check — is disabled while revalidate-cache-days is empty, and enabled once it is filled in

- File: `src/components/GitHubSyncSettings.spec.ts`
- Error:
```
TypeError: cacheDaysDraft.value.trim is not a function
    at ComputedRefImpl.fn (src/components/GitHubSyncSettings.vue:68:28)
```

### Test Summary

303 test files, 356 tests total — 5 failed.

- Test files: 297 passed, 1 failed
- Tests: 351 passed (5 failed)
- Duration: ~4 seconds

status: failed
