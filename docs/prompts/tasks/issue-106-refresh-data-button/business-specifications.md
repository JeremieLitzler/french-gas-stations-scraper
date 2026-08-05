# Business Specifications — Refresh Data From Remote Source (Issue #106)

## Goal and Scope

Give the user a manual way to immediately pull their station list and default fuel type
from their configured GitHub sync repo, instead of waiting for the automatic
staleness-based sync (ADR-011, ADR-012) that currently only runs on page load. This is a
read-only extension of the existing sync feature — no new remote-write behavior, no new
architectural pattern.

## Files

- `src/components/StationManager.vue` — hosts the new "Refresh data" action and its
  confirmation step, alongside the existing station-management UI.
- `src/composables/useRemotePreferencesSync.ts` — gains the ability to be triggered on
  demand, bypassing the revalidate-cache-days staleness check it currently uses to decide
  whether to fetch on load.

## Rules (Example Mapping)

Rule 1: The action is only available when GitHub sync is fully configured and the user is
authenticated — the same condition `syncOnLoad` already checks.
Example: with no GitHub repo configured, the action is not shown in Station Manager at
all (consistent with how "Enregistrer les modifications" is only shown when relevant).

Rule 2: Triggering the action requires the user to confirm before anything changes, since
it discards the current local station list and default fuel type.
Example: clicking "Refresh data" opens a confirmation prompt; only confirming proceeds.

Rule 3: Once confirmed, the app fetches the latest preferences file from the configured
GitHub repo — exactly as it does automatically on load — and replaces the local station
list and default fuel type with its contents, regardless of how recently local data was
last synced.

Rule 4: If the confirmed fetch fails for any reason (network error, expired GitHub
session, invalid/missing remote file, org restriction), the local station list and
default fuel type are left exactly as they were before the click, and an error message
describing the failure is shown — reusing the same failure messages and rollback
guarantee the automatic on-load sync already provides.

Rule 5: While the refresh is in progress, the user sees a loading indication and cannot
trigger a second refresh concurrently.

Rule 6: Because the remote copy may differ from local (a station added or removed on the
remote side since the last sync), the price table must reflect exactly the resulting
station list once applied: a station no longer present is removed from the price table,
a newly-present station has its price scraped for the first time, and a station present
in both keeps its already-fetched price data — the same reconciliation the app already
performs for any other station-list change. The fuel-type selection reflects the
newly-applied default.

Rule 7: The remote GitHub file itself is never modified by this action — it is a
read-only pull. No preference change made this way is ever pushed back to GitHub.

Rule 8: The action is disabled (visible but inactive) whenever there are local
station-list edits not yet pushed to GitHub, since confirming a refresh at that point
would silently discard those edits along with the rest of the local list (Rule 3). An
explanatory message accompanies the disabled state so the reason is discoverable rather
than the action simply disappearing.
Example: with an unsaved station edit pending (the "Enregistrer les modifications"
action is showing), "Refresh data" is visible but disabled, with a message explaining
that pending changes must be saved or discarded first.

## Out of Scope

- Any write to the remote GitHub file.
- Re-scraping fuel prices independent of a station-list change.
- Any local-only "reset without GitHub" behavior — the action requires a configured
  remote to have any effect (Rule 1).

status: ready
