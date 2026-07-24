# Test Cases — Issue #115: Randomize the Scheduled Run's Trigger Time

## Random Trigger Time — Range

1. **Lower bound respected**: the trigger time is resolved many times (simulating many separate
   deploys). Expected: every resolved local hour (Europe/Paris) is 20, 21, or 22 — never 19 or
   earlier.

2. **Upper bound respected**: same repeated resolution. Expected: every resolved local time stays
   at or before 22:59 Europe/Paris — the hour is never 23, and the minute never pushes an hour-22
   pick past :59.

3. **Minute is not fixed to the hour**: the trigger time is resolved many times. Expected: the
   resolved minute varies across the full 0–59 range over enough picks, rather than always landing
   on :00.

4. **Actual randomness across picks**: the trigger time is resolved many times. Expected: the
   resolved times are not all identical — the mechanism produces a spread of times, not one
   hardcoded constant dressed up as "random."

## Local-to-Trigger Conversion — DST Correctness

5. **Resolution during standard time (CET, UTC+1)**: the trigger time is resolved while French
   local time is UTC+1. Expected: the resulting scheduled fire time, expressed in UTC, is exactly
   one hour behind the resolved Europe/Paris local time.

6. **Resolution during daylight saving time (CEST, UTC+2)**: the trigger time is resolved while
   French local time is UTC+2. Expected: the resulting scheduled fire time, expressed in UTC, is
   exactly two hours behind the resolved Europe/Paris local time.

## Resolved Before Registration

7. **Registration receives a concrete value**: the scheduled function's module is loaded.
   Expected: the schedule is registered with a complete, valid trigger-time value on that same
   load — registration never happens with a missing, pending, or placeholder value.

8. **Same resolved time reused for the module's lifetime**: the scheduled function's module is
   loaded once. Expected: every subsequent invocation of the handler during that same module's
   lifetime is governed by that one resolved trigger time — the trigger time is not recomputed
   per invocation.

## Guard Behaviour After the Fixed-Hour Guard Is Removed

9. **Genuine scheduled invocation always proceeds, at any hour**: a request carrying the shape of
   a genuine Netlify scheduler invocation (a valid `next_run` field) arrives, regardless of what
   the current local hour happens to be. Expected: the handler proceeds to attempt the daily
   snapshot — it is never skipped for landing on an "unexpected" hour, since no such check exists
   anymore.

10. **Invocation-shape guard still rejects non-scheduler calls**: a request without a body, or
    with a body lacking a `next_run` field, arrives. Expected: the handler rejects it as not a
    genuine scheduled invocation and performs no snapshot work — this existing protection is
    unchanged by removing the fixed-hour check.

## Obsolete Tests to Remove

`netlify/functions/lib/scheduleGuards.spec.ts` currently covers issue #112 scenarios 1–4
(`isTargetLocalHour` returning true/false for specific UTC times in summer and winter). Since
`isTargetLocalHour` and `TARGET_LOCAL_HOUR` are removed by this change (business-specifications.md),
those four scenarios no longer have anything to exercise and must be deleted, not merely left
failing or skipped. Scenario 18 (`isScheduledInvocation`, covering direct/non-scheduler calls)
stays unchanged and must be preserved.

status: ready
