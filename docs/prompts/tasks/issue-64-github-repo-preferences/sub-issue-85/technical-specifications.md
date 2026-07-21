# Technical Specifications — Sub-Issue C (#85): Read Preferences from Remote Repo on Load

*(Fifth pass — addresses review-results.md's single finding: nested indentation in
`resolveRemotePreferences`'s catch block.)*

## Summary of files changed

- `src/composables/useRemotePreferencesSync.ts` — extracted `handleFetchFailure(error,
  onUnauthorized)` out of `resolveRemotePreferences`'s `catch` block. No other file changed.

## Non-trivial decisions

- **Extracted a function instead of restructuring with a lookup map/table.** The three branches
  (`RemoteUnauthorizedError` → notify + `ACCESS_REVOKED_MESSAGE`; `RemoteContentInvalidError` →
  `INVALID_REMOTE_CONTENT_MESSAGE`; anything else → `REMOTE_FETCH_FAILED_MESSAGE`) aren't a pure
  value lookup — the first branch has a side effect (`notifyUnauthorized`) the others don't, so a
  data-driven map (e.g. `Map<ErrorClass, string>`) would still need an escape hatch for that case
  and end up more indirect than three `instanceof` checks in one small function. Matches the
  fix review-results.md itself suggested.
- **`resolveRemotePreferences`'s `catch` returns `handleFetchFailure(...)` without an explicit
  `await`.** The call sits directly in a `return` inside an `async` function with nothing left to
  do after it (no surrounding `try` at that point that needs to observe a rejection), so an
  explicit `await` would be redundant — the async function already awaits whatever it returns
  before resolving. Keeps the diff to exactly the extraction review-results.md asked for.

## Self-code review

Reviewed the extraction against the rest of the file for regressions: the three failure
branches are unchanged (same `instanceof` checks, same side effects, same messages), and
`handleFetchFailure`'s `Promise<null>` return type is assignable to `resolveRemotePreferences`'s
declared `Promise<PreferencesFile | null>`. No other function was touched. This pass is a pure
mechanical extraction with no behavioral change, so no new bugs were introduced or found beyond
the one review-results.md already identified and this pass fixes.

## Known gap — unchanged from the prior pass

`src/composables/useRemotePreferencesSync.spec.ts` still imports the deleted
`@/types/remote-preferences` module and uses the old `stations`/`defaultFuel` field names —
out of scope for `/jli-codes`, owned by `/jli-writes-tests-spec`/`/jli-writes-tests`.

status: ready
