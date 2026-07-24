# Business Specifications — Issue #115: Fix the Scheduled Run's Trigger Time

## Goal and Scope

Supersede this issue's earlier attempt (a per-deploy, randomly-computed cron expression):
Netlify's scheduled-function build step reads the `schedule()` call's cron argument directly
from source text, without executing the file — only a literal string works, never a value
resolved by running code. Replace it with a single fixed daily trigger time, and keep this
issue's other fix: removing the `isTargetLocalHour` guard, whose original bug was that a
legitimate invocation landing outside the one accepted local hour was silently skipped.

Scope is limited to how and when `scheduled-price-history.ts` is triggered. The work the job
performs once triggered (issue #112, ADR-014) does not change.

## Files to Create or Modify

- `netlify/functions/scheduled-price-history/scheduled-price-history.ts` — reverts to a fixed,
  literal cron expression; all per-deploy trigger-time-resolution logic from the earlier attempt
  (random Paris-local pick, UTC conversion, offset computation) is removed, since nothing is
  computed anymore.
- `netlify/functions/scheduled-price-history/scheduled-price-history.spec.ts` — deleted; it only
  exercised the random-time-resolution logic being removed.
- `docs/decisions/ADR-014-scheduled-function-pat-auth.md` — "Scheduling Mechanism" section
  amended to describe the single fixed cron trigger, replacing the twice-daily-plus-guard
  mechanism it currently documents (which this issue also removes).
- `netlify/functions/lib/scheduleGuards.ts` and `scheduleGuards.spec.ts` — already dropped
  `isTargetLocalHour`/`TARGET_LOCAL_HOUR` earlier in this issue; unaffected by this revision.

## Rules

**The job fires once a day, at a single fixed time: 19:00 UTC.** That's 21:00 French local time
during CEST (summer) and 20:00 during CET (winter). This value is a literal in the cron
expression, not computed — the earlier attempt failed to deploy because Netlify's build step
cannot execute code to resolve a value at build time.

**No guard rejects a valid scheduled invocation for landing at the "wrong" hour.**
`isTargetLocalHour` and `TARGET_LOCAL_HOUR` stay removed. `isScheduledInvocation` — confirming the
call actually came from Netlify's scheduler — remains the only check before a run is attempted.

**The French local trigger time is not DST-corrected.** Because the cron expression is a fixed
UTC value, the actual local fire time drifts by an hour between CEST and CET across the year — an
accepted trade-off of using one static cron entry, not treated as a bug.

**Changing the trigger time in the future means editing the literal cron expression in source and
redeploying.** There is no runtime or automatic mechanism to vary it.

status: ready
