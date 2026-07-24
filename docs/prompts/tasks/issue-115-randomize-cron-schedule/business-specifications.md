# Business Specifications — Issue #115: Randomize the Scheduled Run's Trigger Time

## Goal and Scope

Replace the daily price-history job's current trigger logic — a cron fired at two fixed UTC
hours (to compensate for daylight saving) plus a guard that only allows the run through if the
invocation lands on an exact target local hour — with a single trigger time, randomly chosen
within a broader French-local-time window. This removes the class of bug where a legitimate
invocation lands outside the one hour the guard accepts and is silently skipped, without
reintroducing the DST-offset bug the original fixed-hour design tried to work around.

Scope is limited to how and when `netlify/functions/scheduled-price-history/scheduled-price-history.ts`
is triggered. The work the job performs once triggered (issue #112, ADR-014) does not change.

## Files to Create or Modify

- `netlify/functions/scheduled-price-history/scheduled-price-history.ts` — no longer registers
  a fixed cron expression; registers a cron expression whose time was randomly chosen within the
  target window, fully resolved before the schedule registration happens.
- `netlify/functions/lib/scheduleGuards.ts` — drops the fixed-target-hour concept
  (`TARGET_LOCAL_HOUR`, `isTargetLocalHour`) entirely, since there is no longer one fixed hour to
  compare an invocation against. `isScheduledInvocation` (the defense-in-depth check that the
  call actually came from Netlify's scheduler) is unaffected and stays as-is.
- `netlify/functions/lib/scheduleGuards.spec.ts` — test coverage follows the guard changes: the
  target-hour tests are removed; `isScheduledInvocation` tests are unaffected.

## Rules

**The job fires exactly once per day, at a single random time between 20:00 and 22:59 French
local time (Europe/Paris), inclusive of the minute.** Example: on a given deploy, the resolved
time might be 21:37 Paris local time; every day until the next deploy, the job fires at 21:37
Paris local time (adjusted for whichever of CET/CEST is in effect that day).

**The random time is chosen once, when the function's code is loaded (i.e., once per deploy), not
recomputed per invocation or per day.** The same resolved time is reused for every daily firing
until the next deploy triggers a new pick. This is a deliberate trade-off: true day-to-day
randomization is not achievable with a single static cron registration, so redeploy frequency is
what varies the trigger time over the long run.

**The random time must be fully resolved to a concrete value before the schedule registration is
reached.** The function's registration with Netlify's scheduler happens once, synchronously, as
the module loads — if the random time were still being computed asynchronously at that point, the
registration would not have a usable value to register with, and the job would not be scheduled
correctly for that deploy.

**No guard rejects a valid scheduled invocation for landing at the "wrong" hour anymore.** Because
the registered trigger time is itself already the target, there is nothing left to double-check
against a fixed target hour. `isScheduledInvocation` still rejects any call that doesn't carry the
shape of a genuine Netlify scheduler invocation, but a genuine invocation is never skipped for
timing reasons.

**A deploy that happens close to a DST transition (late March / late October) may leave the
resolved trigger time offset by up to an hour in French local time until the next deploy**, since
the local-to-UTC conversion is fixed at pick time and the cron registration itself cannot shift
automatically when the clocks change. This is an accepted consequence of resolving the time once
per deploy rather than once per day, and is not treated as a bug to guard against in this change.

status: ready
