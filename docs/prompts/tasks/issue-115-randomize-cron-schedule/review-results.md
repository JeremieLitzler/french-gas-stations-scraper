# Review Results — Issue #115: Randomize the Scheduled Run's Trigger Time

lint: clean (9 pre-existing errors in unrelated `usePreferencesExport.spec.ts` /
`usePreferencesImport.spec.ts` — untouched by this change, not counted)
type-check: clean

## Findings

- **Object Calisthenics rule 7 (methods ≤5 lines)** —
  `netlify/functions/scheduled-price-history/scheduled-price-history.ts:64-85`
  (`parisUtcOffsetMinutes`). The body spans ~20 lines: an 8-key `Intl.DateTimeFormat` options
  object (static — doesn't depend on `now` or any other parameter) is rebuilt inline every call,
  followed by a 6-argument `Date.UTC(...)` call. Extract the formatter to a module-level constant
  (it has no per-call inputs) and/or pull the `formatToParts` + numeric-extraction step into a
  small `datePartsInParis(now)` helper so `parisUtcOffsetMinutes` itself reads as offset-from-diff
  in ≤5 lines.

All other checklist items ✓ (security-guidelines.md rules 1–3 all verifiably met; business spec
matched with no scope creep; no dead code or unused imports; naming has no abbreviations; no
Vue-specific concerns apply to these plain Netlify function files; no `any`/`unknown`/non-null `!`
introduced; all exported functions have explicit return types).

status: changes requested
