# Security Guidelines — Issue #115: Fix the Scheduled Run's Trigger Time

1. **Preserve `isScheduledInvocation` as the sole invocation guard, untouched.** *Where:*
   `handleScheduledRun` in `scheduled-price-history.ts`. *Why:* this check is the only thing
   standing between a direct HTTP call and a full run that reads `favoriteStations` and writes to
   `history.csv` with the ADR-014 PAT — while stripping out the trigger-time-resolution code added
   in this issue's earlier attempt, take care not to also touch, reorder, or remove this call.

2. **The reverted cron expression must be a plain, static string literal — no runtime
   computation, environment lookup, or network call feeding it.** *Where:* the `schedule(...)`
   argument in `scheduled-price-history.ts`. *Why:* this function bundles a repo-write PAT
   (ADR-014); any code reintroduced on the module-load path before `schedule()` runs executes with
   access to that credential, so keeping this value a literal (as business-specifications.md
   requires for deployability) also keeps that path free of any new dependency or external call.

status: ready
