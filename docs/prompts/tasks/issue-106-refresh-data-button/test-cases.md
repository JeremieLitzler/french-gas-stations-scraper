# Test Cases — Issue #106: Refresh Data Button

## Visibility

### TC-1: Action hidden when GitHub sync is not configured
- **Precondition:** User is unauthenticated, or repo config (`owner/repo`, file path, `revalidate-cache-days`) is incomplete.
- **Action:** Navigate to the Station Manager.
- **Expected:** No "Refresh data" action is shown.

### TC-2: Action visible when GitHub sync is configured and authenticated
- **Precondition:** User is authenticated and repo config is complete.
- **Action:** Navigate to the Station Manager.
- **Expected:** The "Refresh data" action is shown and enabled.

## Confirmation

### TC-3: Clicking the action opens a confirmation prompt without changing data
- **Precondition:** As TC-2. Local station list and default fuel type have known values.
- **Action:** Click "Refresh data".
- **Expected:** A confirmation prompt appears. Local station list, default fuel type, and the price table remain unchanged until the user confirms.

### TC-4: Cancelling the confirmation makes no request and leaves data unchanged
- **Precondition:** The confirmation prompt from TC-3 is open.
- **Action:** Cancel the prompt.
- **Expected:** No request is made to the GitHub API proxy. Local station list and default fuel type are unchanged. The prompt closes.

## Successful Refresh

### TC-5: Confirmed refresh replaces local data with the remote copy and reconciles the price table
- **Precondition:** User is authenticated, repo config is complete, local data is **not** stale (within the `revalidate-cache-days` window). The remote file's station list differs from local: it drops one station present locally, adds one station not present locally, and its default fuel type differs from the local value.
- **Action:** Click "Refresh data" and confirm.
- **Expected:** The fetch happens despite local data not being stale (the staleness cache is bypassed). The local station list becomes an exact match of the remote list: the dropped station is removed from the price table without being rescraped, the newly-added station is scraped for the first time, and any station present in both keeps its already-fetched price data. The default fuel type is updated to the remote value and reflected in the fuel-type selection.

## Failure and Rollback

### TC-6: A failed fetch rolls back local data and shows an error
- **Precondition:** Confirmation prompt confirmed; the remote fetch fails (network error, expired GitHub session, or an org-restriction response).
- **Action:** Confirm the refresh.
- **Expected:** The local station list and default fuel type are left exactly as they were before the click. The price table is unaffected. An error message describing the failure is shown.

### TC-7: A failed fetch does not advance the sync-freshness timestamp
- **Precondition:** Local data was already stale (older than `revalidate-cache-days`) before the click.
- **Action:** Confirm the refresh; the fetch fails.
- **Expected:** The next time staleness is evaluated (e.g. reloading the app), local data is still considered stale and an automatic sync is still attempted — the failed manual refresh did not mark local data as freshly synced.

### TC-8: Remote content that fails shape validation is rejected, not applied
- **Precondition:** The remote file exists but is malformed — e.g. missing a required key, `fuelTypeDefault` present but the wrong type, or one station entry invalid (bad URL origin, or a name containing markup) alongside otherwise-valid entries.
- **Action:** Confirm the refresh.
- **Expected:** The whole remote file is rejected, not just the malformed part. Local station list and default fuel type are left exactly as they were before the click. A message distinct from the generic fetch-failure/re-authentication message states the remote content is invalid.

## Concurrency and Timeout

### TC-9: A refresh in progress shows a loading state and blocks a second concurrent trigger
- **Precondition:** Confirmation confirmed; the fetch is in progress (slow response).
- **Action:** Attempt to trigger "Refresh data" again while the first refresh is still in progress.
- **Expected:** A loading indication is visible. The second attempt does not start a concurrent fetch.

### TC-10: A hung fetch does not block the UI indefinitely
- **Precondition:** Confirmation confirmed; the request to the GitHub API proxy never resolves.
- **Action:** Wait.
- **Expected:** After a bounded wait, the refresh stops waiting, shows a failure message (per TC-6's rollback behavior), and the action becomes available again.

## Read-Only Guarantee

### TC-11: A confirmed refresh never writes to the remote GitHub file
- **Precondition:** User is authenticated, repo config is complete, local data differs from remote.
- **Action:** Click "Refresh data", confirm, and observe the requests made to the GitHub API proxy during the whole flow.
- **Expected:** Only a read request is made. No write request is sent. The remote file is unchanged afterward.

## Pending Local Changes

### TC-12: The action is disabled while a local edit is pending a GitHub push
- **Precondition:** As TC-2 (authenticated, repo config complete). A local station-list edit has been made and not yet pushed (the "Enregistrer les modifications" action is showing).
- **Action:** Navigate to the Station Manager.
- **Expected:** "Refresh data" is visible but disabled. A message next to it explains that pending changes must be saved or discarded first. Clicking it opens no confirmation prompt and makes no request.

### TC-13: The action becomes enabled again once the pending change is resolved
- **Precondition:** As TC-12 (action disabled by a pending edit).
- **Action:** Push the pending change via "Enregistrer les modifications" (or otherwise clear it so that action stops showing).
- **Expected:** "Refresh data" becomes enabled. The explanatory message is no longer shown.

status: ready
