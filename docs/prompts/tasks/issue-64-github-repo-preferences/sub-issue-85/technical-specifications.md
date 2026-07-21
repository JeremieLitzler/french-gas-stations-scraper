# Technical Specifications — Sub-Issue C (#85): Read Preferences from Remote Repo on Load

*(Third pass — field-name fix + error-signaling rework, per updated business-specifications.md
and the human direction on `console.error` usage in `useRemotePreferencesSync.ts`.)*

## What changed and why

business-specifications.md (commit `48503b0`) fixed the remote JSON field names from
`stations`/`defaultFuel` to `favoriteStations`/`fuelTypeDefault` — the shape the static
export/import feature (issue #63) already uses — and made the "malformed remote content gets a
distinct message, not the re-authentication prompt" edge case explicit and intentional, resolving
the ambiguity previously flagged under "Specifications Need Review" in this file. Separately, the
working tree carried an uncommitted debug pass on `useRemotePreferencesSync.ts` (extra
`console.log`/`console.error` calls) with the direction that every `console.error` there signals
a condition that should instead throw an `Error`. This pass addresses both.

## Summary of files created/changed

- `src/types/preferences.ts` — unchanged. Already declares `PreferencesFile { fuelTypeDefault:
  string | null; favoriteStations: Station[] }`, the shape business-specifications.md now points
  to directly for the remote file.
- `src/types/remote-preferences.ts` — **deleted**. `RemotePreferencesFile` duplicated
  `PreferencesFile` under the old, incorrect field names. business-specifications.md is explicit
  that the remote file "is the same `PreferencesFile` shape" issue #63 already uses, so the
  duplicate type is removed in favor of importing `PreferencesFile` directly.
- `src/composables/useRemotePreferencesSync.ts` — rewritten. Field names fixed
  (`favoriteStations`/`fuelTypeDefault`); shape validation now reuses
  `@/utils/preferencesImport`'s `parseJsonFile` instead of a duplicated
  `parseStations`/`parseDefaultFuel`/`parseRemoteJson` trio; all `console.log`/`console.error`
  calls removed in favor of thrown, typed errors caught once at the `refreshFromRemote` boundary;
  a new `RemoteContentInvalidError` path produces a message distinct from the re-authentication
  one, per the now-explicit spec edge case.
- `src/components/StationPricesContent.vue` — changed. Imports `PreferencesFile` instead of the
  deleted `RemotePreferencesFile`; `applyRemotePreferences`/`applyDefaultFuelOrRollback`/
  `applyDefaultFuel` read `data.favoriteStations`/`data.fuelTypeDefault` (and the local parameter
  is renamed `fuelTypeDefault` to match) instead of `data.stations`/`data.defaultFuel`. No
  behavioral change to the rollback/timestamp logic itself (fixes #4/#5 from the prior pass) —
  only the field names it reads.

## Non-trivial decisions

- **Reuse `parseJsonFile` (issue #63's validator) instead of re-fixing the duplicated
  `parseStations`/`parseDefaultFuel` functions in place.** business-specifications.md's edge case
  now says explicitly: "any entry in `favoriteStations` failing **the same station validation the
  static import feature (issue #63) already enforces**". A literal reuse of `parseJsonFile`
  guarantees that by construction — a renamed-in-place duplicate would only guarantee it today,
  with no mechanism to keep the two validators in sync if either changes later. The precedent this
  codebase set for duplicating *small* validators (`isValidUrl`/`isValidName`) across
  `useStationStorage.ts`/`preferencesImport.ts` doesn't extend well to duplicating an entire
  shape-validation function the spec now explicitly ties to a single other implementation.
- **Deleted `RemotePreferencesFile` rather than renaming its fields in place.**
  business-specifications.md's "Remote JSON File Structure" section states the remote file "is the
  same `PreferencesFile` shape" — keeping a second, structurally identical interface around after
  that statement would be a maintenance trap (the two could silently drift again, which is exactly
  how the original `stations`/`defaultFuel` mistake happened: the spec always claimed the same
  shape as #63 but the implementation never actually matched it).
- **`console.error`/`console.log` replaced with two typed errors caught once, not just deleted.**
  The human direction was literal: every `console.error` in this file marks a condition that
  should throw. Rather than threading a discriminated-union outcome type through every helper (the
  prior design) with a `console.error` at each failure site, each helper now throws
  (`RemoteUnauthorizedError`, `RemoteContentInvalidError`, or a plain `Error` for everything else)
  and `resolveRemotePreferences` is the single place that catches and maps to a `syncError`
  message. This keeps the existing safety guarantee from the prior pass's self-review (no
  exception may escape into `StationPricesContent.vue`'s top-level `<Suspense>` await) while
  removing the parallel "return null/an outcome kind" bookkeeping the `console.error` calls were
  compensating for.
- **`RemoteContentInvalidError` is reserved for the decoded file's content, not the proxy
  response wrapper.** A missing/malformed `content` field in the `github-api-proxy` JSON body
  means the proxy call itself misbehaved (bad body, unexpected shape) — that is a fetch-layer
  problem, not a statement about the user's remote preferences file, so it throws a plain `Error`
  and falls into the generic re-authentication-style message instead of the "your file is
  invalid" one. Only a failure to base64-decode or shape-validate the *decoded* text throws
  `RemoteContentInvalidError`. Caught and fixed during self-review — see below.

## Object Calisthenics exceptions

- `useRemotePreferencesSync()`'s returned function body groups reactive state and one operation in
  one composable — same documented framework exception used throughout this codebase.
- `splitOwnerRepo` remains duplicated with `useRepoConfig.ts`, unchanged from the prior pass.

## Self-code review

1. **`extractResponseContent` mis-attributed a broken proxy response wrapper to "the remote file
   is invalid."** Initially thrown as `RemoteContentInvalidError` when the GitHub proxy's JSON
   body was missing/malformed `content`. That message would tell the user their *preferences
   file* is broken when the actual fault is the proxy call itself (bad body, wrong shape) —
   misleading, since re-checking their file wouldn't help. Fixed by throwing a plain `Error`
   there instead, so it falls into the same re-authentication-style message as a network error or
   unexpected HTTP status; `RemoteContentInvalidError` is now reserved for base64-decode and
   shape-validation failures on the already-successfully-fetched content.
2. **Uncaught-exception crash risk preserved from the prior pass, re-verified under the new
   control flow.** `decodeBase64Utf8` can throw a `DOMException` on invalid base64, and
   `applyRemotePreferences` can reject on an IndexedDB failure. Both remain wrapped in `try/catch`
   (`decodeAndParseRemoteFile`, and the dedicated `try/catch` around `applyRemotePreferences` in
   `refreshFromRemote`) so neither can propagate into `StationPricesContent.vue`'s top-level
   `<Suspense>` await — the guarantee the prior pass's self-review established still holds after
   the rewrite to thrown errors.
3. **Reusing `parseJsonFile` closes a prototype-pollution gap the duplicated validator didn't
   have.** The old `parseStations`/`parseDefaultFuel` pair (now removed) never checked for
   `__proto__`/`constructor`/`prototype` keys in the parsed JSON before consuming it.
   `parseJsonFile` already guards against this (`hasDangerousKey`) for the local-import path;
   reusing it means the remote-sync path inherits the same protection instead of carrying a
   second, weaker validator.

## Known gap — not fixed here (out of scope for this command)

`src/composables/useRemotePreferencesSync.spec.ts` still constructs `RemotePreferencesFile`
literals with the old `stations`/`defaultFuel` field names and imports the now-deleted
`@/types/remote-preferences` module. Per this command's scope, test files are owned by
`/jli-writes-tests-spec`/`/jli-writes-tests`, not `/jli-codes` — this spec file needs updating to
`favoriteStations`/`fuelTypeDefault` and `PreferencesFile`, plus new cases for C-10 through C-15
(null/empty-valid content, and the three "invalid content" rejection scenarios with their distinct
message), before the suite will build/pass again. `npm run type-check` confirms this is the only
remaining error in the tree — every non-test file type-checks cleanly.

status: ready
