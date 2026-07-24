# Test Cases — Issue #115: Fix the Scheduled Run's Trigger Time

## Guard Behaviour

1. **Genuine scheduled invocation always proceeds, at any hour**: a request carrying the shape of
   a genuine Netlify scheduler invocation (a valid `next_run` field) arrives, regardless of what
   the current local hour happens to be. Expected: the handler proceeds to attempt the daily
   snapshot — it is never skipped for landing on an "unexpected" hour, since no hour-based check
   exists.

2. **Invocation-shape guard still rejects non-scheduler calls**: a request without a body, or
   with a body lacking a `next_run` field, arrives. Expected: the handler rejects it as not a
   genuine scheduled invocation and performs no snapshot work.

## Obsolete Tests to Remove

`netlify/functions/scheduled-price-history/scheduled-price-history.spec.ts` (added for this
issue's earlier per-deploy random-time attempt) covered the random-time-resolution window bounds,
minute spread, CET/CEST conversion, concrete-value-at-registration, and once-per-module-load
reuse. Since that resolution logic (`pickRandomParisLocalTime`, `toUtcClockTime`,
`toCronExpression`, `resolveTriggerCronExpression`, and their supporting helpers) is deleted
entirely per business-specifications.md, this file must be deleted, not left failing or skipped.
`netlify/functions/lib/scheduleGuards.spec.ts` is unaffected by this revision and stays as-is.

## No Runtime Tests

- The fixed cron expression's literal value has no runtime-observable behaviour — Netlify never
  executes the function to read it, and the running code's own behaviour depends only on the
  guard scenarios above. Correctness is verified by code review of the literal string, and
  ultimately by Netlify's build/deploy succeeding to register the schedule.
- The `docs/decisions/ADR-014-scheduled-function-pat-auth.md` documentation amendment is a
  docs-only change with no runtime behaviour to test.

status: ready
