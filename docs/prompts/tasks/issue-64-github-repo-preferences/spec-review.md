# Spec Review — Issue #64: GitHub Repository Preferences

**Source PR:** [#87](https://github.com/JeremieLitzler/french-gas-stations-scraper/pull/87) (`feat/github-repo-preferences`, closes #64)

Reviewer left one top-level review comment ("all comments to be addressed before coding") plus 40 inline comments across `business-specifications.md`, `test-cases.md`, `ADR-011`, and `ADR-012`. `security-guidelines.md` received no comments.

Four points were ambiguous or contradictory across the comment thread; resolved with the user before writing this file (see each item below).

## Amendment requests

### business-specifications.md

- **Sub-Issue A, rule 4** (line 26): Logout does **not** clear the stored repo config from the Settings UI — it only disconnects OAuth (clears the `gh_token` cookie). `owner/repo`/file path/`revalidate-cache-days` stay in IndexedDB and remain visible, and per the field-editability resolution below, logout also re-enables them for editing.
- **Sub-Issue B, rule 3** (line 61): "For unauthenticated users, these fields are empty" → "For users who have **never authenticated**, these fields are empty." A previously-authenticated user who is now logged out sees the fields prefilled from IndexedDB.
- **Sub-Issue C, rule 3** (line 89): Remove the claim that `owner`, `repo`, `revalidateCacheDays` are read from the remote JSON's `settings` section and written back to IndexedDB. **Resolved:** the remote JSON file never carries a `settings` section — those three values live only in IndexedDB, set/edited via the Settings page.
- **Sub-Issue D, rule 5** (line 123): Remove the `settings` section from what gets written remotely — the remote JSON always contains only `stations` and `defaultFuel`.
- **Sub-Issue D, rules 2 and edge cases** (lines 120–127): **Resolved** — the diff-and-confirm dialog applies only to updates of an *existing* remote file. On first-time write (file doesn't exist), the file is created directly with no diff/confirmation step.
- **Sub-Issue D — new rule**: **Resolved** — when the user cancels the diff dialog (D-3 case), show a persistent notice that local (IndexedDB) data now differs from the remote file, until the next successful write.
- **Sub-Issue E, rule 3** (lines 153, 158): Remove "All fields in this section are disabled when the user is not authenticated." Replace with the field-editability model below.
- **Field-editability model** (new, replaces the above): **Resolved** — `owner/repo`, file path, and `revalidate-cache-days` are enabled while unauthenticated (empty if never authenticated, prefilled from IndexedDB if previously authenticated); `owner/repo` and file path become disabled once authenticated (change requires logout); `revalidate-cache-days` stays always editable regardless of auth state.
- **"Remote JSON File Structure" section** (lines 257–276): Remove the `settings` key from the example JSON and the two descriptive bullets referencing it, and remove the "on remote read, `settings` overrides local settings" bullet (line 278).

### test-cases.md

- **A-1** (line 8): Flip expected result — `owner/repo`, file path, `revalidate-cache-days` are **enabled** (not disabled) when unauthenticated, per the new field-editability model.
- **A-2** (line 12): Add precondition — the "Login with GitHub" button is enabled only once `owner/repo`, file path, and `revalidate-cache-days` are filled in.
- **A-3** (line 15): Tag as a manual/integration test (Netlify function callback), not a Vitest unit test.
- **A-5** (line 26): Rewrite expected result — logout clears the cookie and switches the app to unauthenticated state, which **re-enables** (not disables) the `owner/repo`/file-path fields, still prefilled from IndexedDB; station data unchanged.
- **A-6** (line 46): Tag as a manual test.
- **B-1** (line 54): Rewrite — `owner/repo` and file path are **disabled** when authenticated; a message instructs the user to log out to change them.
- **B-2/B-3** (lines 59, 64): Reword B-2/B-3 to reflect that config entry happens while unauthenticated (or after logout), not while authenticated — see open question below. B-3 should explicitly assert IndexedDB persistence.
- **B-5** (line 74): Rewrite — after logout, fields are **enabled** and **retain** their prior values (not emptied), consistent with A-1/A-5.
- **C-4** (line 98): Split into one test per action: add station, edit station, delete station, change fuel default.
- **C-5** (line 103): Remove entirely — no longer applicable now that the remote file has no `settings` section.
- **D-1/D-2** (line 122): Split into one test per action (add, edit).
- **D-3** (line 132): Update expected result to include the new persistent "local differs from remote" notice (per the new business-spec rule above).
- **D-4** (line 140): Rewrite — no diff dialog on first-time write; the file is created directly.
- **E-1/E-2/E-3** (lines 161, 167, 172): Drop the "User is authenticated" precondition — `revalidate-cache-days` is editable regardless of auth state.
- **E-4** (line 176): Rename to "All GitHub Sync fields enabled when unauthenticated"; update expected accordingly.
- **E-5** (line 181): Rename to "Owner, Repo, and file path GitHub Sync fields disabled after login"; update expected — `revalidate-cache-days` stays enabled.
- **E-6** (line 186): Update to match — `owner/repo`/file path re-enabled after logout; `revalidate-cache-days` unaffected (was never disabled).
- **New test case needed**: server-side logout Netlify function (cookie clearing) has no dedicated test case (flagged from ADR-011:34).

### ADR-011-github-oauth-app-auth.md

- Line 34: No coverage gap in the ADR itself — the gap is in `test-cases.md` (new logout-function test case, see above).

### ADR-012-github-repo-as-sync-backend.md

- Line 8 (Context): Remove "repository configuration" from the list of things that persist remotely — only stations and default fuel type do.
- Lines 26–33 (Remote JSON File Structure): Remove the `settings` key from the example; file contains only `stations` and `defaultFuel`.
- Line 41: Rewrite — remove the settings-in-remote-file framing; IndexedDB always holds the repo config regardless of remote sync state.
- Line 47 (Cache Invalidation Strategy): Add a note that unit tests for this logic must mock `Date.now()`.
- Line 94 (Alternatives Considered #3): Remove the Firebase mention entirely. Keep the Supabase mention, adding a note that it could be reconsidered if the app becomes a profitable service.

### security-guidelines.md

No inline comments. No changes requested. Confirmed coherent with the amended model — rule 4 (proxy validates requested `owner/repo` against stored config) still holds since the config remains in IndexedDB even though it's dropped from the remote JSON file.

## Coherence

- **Resolved during this review** (previously contradictory across comments, now single model): field-editability (`owner/repo`/file path lock after login, unlock on logout; `revalidate-cache-days` always editable), first-write diff removal, and the remote-JSON `settings` section removal. All read consistently now across business-specifications.md, test-cases.md, and ADR-012.
- **Open contradiction, not resolved — needs a decision (see below):** Sub-Issue B's stated dependency ("Depends on: Sub-Issue A — user must be authenticated") conflicts with the new field-editability model, under which `owner/repo`/file path/`revalidate-cache-days` are entered *before* login (A-2's login button is gated on those fields being filled in). Sub-Issue B, as currently scoped, cannot depend on Sub-Issue A if its fields must be fillable pre-auth.
- Security-guidelines.md rule 4 (proxy validates `owner/repo` against "the value stored in the user's session or IndexedDB-persisted config") remains valid post-amendment since the config still lives in IndexedDB — just no longer mirrored into the remote JSON's `settings` key.

## Open questions

1. **Sub-Issue B dependency**: given config fields must be editable pre-authentication, should Sub-Issue B's "Depends on: Sub-Issue A" be changed to "Depends on: nothing" (config can be entered any time, independent of login state)? This also affects the dependency graph already encoded in child issues #82–#86 (`#83` currently depends on `#82`) — if the dependency is dropped, that child-issue link needs updating too.
2. B-2/B-3 test preconditions currently say "User is authenticated" — should these become "User is unauthenticated (first-time setup) or has logged out to edit an existing config"?

status: review specs
