# Technical Specifications — Issue #115: Fix the Scheduled Run's Trigger Time

## Files Changed

- `netlify/functions/scheduled-price-history/scheduled-price-history.ts` — reverted the earlier
  per-deploy random-time-resolution logic (`pickRandomParisLocalTime`, `numericPart`,
  `datePartsInParis`, `parisTimeReadAsUtc`, `parisUtcOffsetMinutes`, `toUtcClockTime`,
  `toCronExpression`, `resolveTriggerCronExpression`, the `ClockTime` interface, and all their
  supporting constants) back to a single static `CRON_EXPRESSION = '0 19 * * *'` literal passed
  directly to `schedule(...)`. `handleScheduledRun`'s only guard remains `isScheduledInvocation`.
- `netlify/functions/scheduled-price-history/scheduled-price-history.spec.ts` — deleted. It only
  covered the random-time-resolution logic being removed (window bounds, minute spread, CET/CEST
  conversion, concrete-value-at-registration, once-per-module-load reuse), per test-cases.md.
- `docs/decisions/ADR-014-scheduled-function-pat-auth.md` — "Scheduling Mechanism (DST handling)"
  renamed to "Scheduling Mechanism" and rewritten to describe the single fixed 19:00 UTC trigger,
  replacing the twice-daily-plus-guard mechanism it previously documented. The Consequences
  section's positive "DST-correct scheduling" bullet and negative "twice-daily no-op invocation"
  bullet were removed/replaced, since both described the mechanism this issue supersedes; a new
  negative bullet documents the accepted DST drift instead.
- `netlify/functions/lib/scheduleGuards.ts` / `scheduleGuards.spec.ts` — already in their target
  state from earlier in this issue (no `TARGET_LOCAL_HOUR`/`isTargetLocalHour`); unchanged here.

## Non-Trivial Decisions

**The cron value is a plain string literal assigned to a module-level `const`, not inlined
directly into the `schedule()` call.** Either satisfies the "static literal" requirement
equally; the named constant is kept because it is referenced from the doc comment above it and
makes the 19:00 UTC / 21:00-French-local relationship easier to find on a future edit than an
anonymous string would.

**ADR-014's Consequences bullets describing the removed twice-daily mechanism were edited, not
left as-is, even though business-specifications.md's "Files to Create or Modify" section only
named the "Scheduling Mechanism" section explicitly.** Leaving them would have made the ADR
assert, in its own Consequences list, benefits and costs of a mechanism the Decision section no
longer describes (DST-correctness, twice-daily invocation overhead) — an internal contradiction
in the same document, not a scope expansion. The Alternatives Considered section was left
untouched: it evaluates rejected paths against the design at the time and remains historically
accurate without needing a rewrite.

**No new npm dependency, no lib file added.** The reverted logic is a single literal; there is
nothing left to factor into a helper.

## Self-Review

Three things checked before finishing:

1. **Confirmed no other file references the removed exports** (`pickRandomParisLocalTime`,
   `toUtcClockTime`, `toCronExpression`, `resolveTriggerCronExpression`, `ClockTime`,
   `CronExpression`) — a repo-wide search turned up only the task-folder docs describing the
   prior attempt, none in `netlify/` or `src/`.
2. **Verified `scheduleGuards.ts` and `scheduleGuards.spec.ts` already matched this issue's target
   state** (no `TARGET_LOCAL_HOUR`/`isTargetLocalHour`, only scenario 18 for
   `isScheduledInvocation`) from earlier work in this issue — no further edit needed there.
3. **Checked `netlify.toml` for any cron/schedule configuration that might duplicate or conflict
   with the in-code `schedule(...)` call** — none found; the trigger is registered solely via the
   `schedule()` wrapper in `scheduled-price-history.ts`.

## Manual Verification

Not run in this command per `/jli-codes` scope (`npm run type-check` / `npm run lint` /
`npm run test` belong to `/jli-runs-tests` and `/jli-reviews-code`).

status: ready
