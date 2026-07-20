# Review Results — Sub-Issue C (#85): Read Preferences from Remote Repo on Load

## `rtk lint`

`rtk` failed in this environment before reaching eslint (infra issue, not a code issue):

```
Error: Failed to run eslint. Is it installed? Try: pip install eslint (or npm/pnpm for JS linters)
Caused by:
    program not found
```

Fell back to `npm run lint` (`eslint . --fix`). Result: 9 pre-existing errors, all in
`src/composables/usePreferencesExport.spec.ts` and `usePreferencesImport.spec.ts` (unused vars) —
confirmed via `git log -1 -- <both files>` that the last commit touching either file is
`25287b6`, unrelated to issue #64. None of the files changed by this sub-issue produce any lint
error.

## `npm run type-check`

```
> vue-boilerplate-jli@0.0.0 type-check
> vue-tsc --build
```

Passed cleanly, no errors.

## Checklist

- Security guidelines (all 6 rules): ✓ — unchanged from the prior pass; this sub-issue remains
  read-only against `github-api-proxy`.
- Object Calisthenics: ✓ — `getPreferencesSyncedAt`/`restorePreferencesSyncedAt` are one guard
  clause each, no `else`, no abbreviations; `applyDefaultFuelOrRollback`'s extra parameter stays
  within the existing documented framework exception for this file's merge-application functions.
- Business spec match (Sub-Issue C rules 1–5, edge cases): ✓ — the second-pass fix closes the
  prior finding. Verified against business-specifications.md rule 4 ("after a successful remote
  read, the timestamp is updated") and rule 5 ("each user-triggered update... resets the
  timestamp"): `applyRemotePreferences` now captures `getPreferencesSyncedAt()` before the merge
  and `applyDefaultFuelOrRollback` restores it via `restorePreferencesSyncedAt()` alongside the
  station-list rollback when the default-fuel write fails, so a failed merge no longer leaves the
  timestamp marked fresh. Confirmed `restorePreferencesSyncedAt(undefined)` deletes the key rather
  than storing `undefined`, correctly reproducing the "absent timestamp is stale" semantics
  `isPreferencesStale` already relies on.
- No dead code / unused imports: ✓ — both new exports are used in `StationPricesContent.vue`.
- Naming clarity: ✓
- Vue/TS pitfalls: ✓ — grounded against the current Vue docs (reactivity fundamentals,
  composables, TypeScript with the Composition API). No reactive destructuring (`stations.value`
  and the captured `previousStations`/`previousSyncedAt` are read directly, not destructured from
  a reactive source); explicit return types on both new exported functions
  (`Promise<number | undefined>`, `Promise<void>`); no unguarded `any`/`unknown`; the new helpers
  are plain async utility functions (not composables) called directly in the component's
  `<script setup>` body, consistent with the composable-caller-responsibility convention already
  used for `replaceStations`/`saveDefaultFuelType`/`clearDefaultFuelType` in the same file.

No findings.

## Status

status: approved
