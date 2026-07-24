# Security Guidelines — Issue #115: Randomize the Scheduled Run's Trigger Time

1. **Preserve `isScheduledInvocation` as the sole invocation guard.** *Where:* `scheduleGuards.ts`
   / the handler in `scheduled-price-history.ts`. *Why:* removing `isTargetLocalHour` leaves this
   check as the only thing standing between a direct HTTP call and a full run that reads
   `favoriteStations` and writes to `history.csv` with the ADR-014 PAT — it must not be weakened,
   reordered after other logic, or removed alongside the target-hour guard it's being pulled out
   next to.

2. **Do not introduce a new npm dependency to compute or hold the random trigger time.** *Where:*
   `scheduled-price-history.ts` (and any new helper under `netlify/functions/lib/`). *Why:* this
   function bundles a fine-grained GitHub PAT with repo write access (ADR-014); every added
   dependency is unreviewed code running in that same process with access to that credential at
   runtime, for a computation `Date`/`Math.random` already covers.

3. **The random time must resolve using only local computation (no network or external calls) at
   module load.** *Where:* the code path executed before `schedule(...)` is reached in
   `scheduled-price-history.ts`. *Why:* that registration is synchronous and runs once per deploy —
   an external call on this path that hangs or fails would prevent the module from finishing load,
   meaning the scheduled job fails to register at all and the daily snapshot silently stops running
   until the next deploy, with no guard left to catch it.

status: ready
