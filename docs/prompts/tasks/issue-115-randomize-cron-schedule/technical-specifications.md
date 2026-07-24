# Technical Specifications — Issue #115: Randomize the Scheduled Run's Trigger Time

## Files Changed

- `netlify/functions/scheduled-price-history/scheduled-price-history.ts` — replaced the fixed
  `CRON_EXPRESSION` constant with `CronExpression`, resolved once at module load by picking a
  random Paris-local time in [20:00, 22:59] and converting it to the UTC cron string `schedule()`
  registers with. Dropped the `isTargetLocalHour` guard call from `handleScheduledRun`.
- `netlify/functions/lib/scheduleGuards.ts` — removed `TARGET_LOCAL_HOUR`, `isTargetLocalHour`,
  and `parisHour`. `isScheduledInvocation` and its private helpers are untouched.
- `netlify/functions/lib/scheduleGuards.spec.ts` — removed scenarios 1–4 (the `isTargetLocalHour`
  coverage for issue #112); scenario 18 (`isScheduledInvocation`) kept as-is.

## Non-Trivial Decisions

**Trigger-time resolution logic lives inline in `scheduled-price-history.ts`, not in a new lib
file.** The business spec's "Files to Create or Modify" section lists only the three files above
— no new helper module. Since this logic has no other caller, adding a fourth file would be an
unrequested abstraction.

**The resolution is split into four small pure functions** (`pickRandomParisLocalTime`,
`toUtcClockTime`, `toCronExpression`, `resolveTriggerCronExpression`) instead of one function that
does everything. Each is independently testable against the test-cases.md scenarios: scenarios
1–4 only need `pickRandomParisLocalTime`'s output range/distribution; scenarios 5–6 need
`toUtcClockTime` given a fixed Paris local time and a fixed `now` (to control CET vs CEST) without
randomness in the way. All four are exported for that reason.

**The Paris→UTC offset is computed by reformatting `now` into Paris wall-clock digits and reading
those same digits back as if they were UTC, then diffing against `now`** (`parisUtcOffsetMinutes`),
rather than parsing a `timeZoneName: 'longOffset'` string. `longOffset` is a newer Intl option with
less consistent runtime support; the digits-diff technique only depends on `formatToParts` with
plain numeric fields, which is universally supported, and matches the technique the original
`scheduleGuards.ts` file already relied on (via `Intl.DateTimeFormat` + `Europe/Paris`) — this
function bundles a repo-write PAT (ADR-014), so minimizing what the module load path depends on
matters (security-guidelines.md rule 3).

**`toUtcClockTime` wraps the minute-of-day math with a defensive `+ MINUTES_PER_DAY) % MINUTES_PER_DAY`**
even though the current trigger window (20:00–22:59 Paris, offset always +60 or +120) never
actually goes negative. It costs nothing and makes the function correct for any `ClockTime` input,
not just the current window's numbers — cheaper to keep than to have to reason about which window
values are "safe" if the window ever changes.

**No new npm dependency was added** — the whole resolution uses only `Math.random`, `Date`, and
built-in `Intl`, per security-guidelines.md rule 2.

## Self-Review

Three things were checked deliberately before finishing, given this code runs on every deploy with
no test coverage of its own from this command:

1. **Node/V8's known `Intl.DateTimeFormat` quirk of formatting midnight as hour "24" instead of
   "00"** (historically triggered by `hour12: false`) is avoided by using `hourCycle: 'h23'`
   explicitly rather than `hour12`. Even if it did occur, `Date.UTC` normalizes an out-of-range
   hour into the next calendar day automatically, and the later `% MINUTES_PER_DAY` in
   `toUtcClockTime` absorbs the resulting whole-day offset — so the failure mode is doubly guarded.
2. **`Math.random()`'s exclusive upper bound** was verified against the window math:
   `Math.floor(Math.random() * 3)` can only yield 0, 1, or 2 (never 3), so the picked hour never
   exceeds 22; `Math.floor(Math.random() * 60)` never exceeds 59. The 22:59 upper bound from
   business-specifications.md is structurally guaranteed, not just probable.
3. **Fixed**: `handleScheduledRun`'s `let outcome = ""` declared outside the guard was a leftover
   from when the function had two guard branches (`isScheduledInvocation` and `isTargetLocalHour`)
   sharing one variable. With the second branch removed, the variable only has one assignment site
   left — changed to a `const` scoped inside the `if` block instead of a mutable outer variable.

## Manual Verification

`npm run type-check` and `npm run lint` both pass on the changed files (lint reports 9 pre-existing
errors in unrelated `usePreferencesExport.spec.ts` / `usePreferencesImport.spec.ts` files, untouched
by this change).

status: ready
