# Technical Specifications — Sub-Issue B (#83): Repo Configuration

## Summary of files created/changed

- `src/composables/useRepoConfig.ts` — new. Singleton composable owning the `RepoConfigDraft`
  (`owner/repo`, file path, `revalidate-cache-days`): `loadRepoConfig` reads it from IndexedDB
  (defaulting `revalidateCacheDays` to 7 per business-specifications.md Sub-Issue C rule 1),
  `saveRepoConfig` always persists to IndexedDB and, only when the caller reports the user as
  authenticated, validates the config against the `github-api-proxy` Netlify function.
- `netlify/functions/github-api-proxy/github-api-proxy.ts` — changed. The existing GET path now
  accepts a request with `owner`/`repo` but no `path`, treated as a repo-level reachability check
  (`GET /repos/{owner}/{repo}` instead of the Contents API). Existing `read`/`write` behavior for
  requests that include `path` is unchanged.

## Non-trivial decisions

- **Extending `github-api-proxy` instead of adding a new Netlify function.**
  `business-specifications.md` Sub-Issue B rule 2 names "the Netlify proxy" as the validation
  mechanism, and the rule requires confirming *either* "the file path exists" *or* "the repo is
  reachable." A single GET-with-path call can't distinguish "repo doesn't exist" from "repo
  exists but the file hasn't been created yet" — both return 404 from the Contents API — yet
  Sub-Issue D rule 2 explicitly treats a missing file as a normal, non-error first-write state.
  Resolving that required a second, repo-level check (`GET /repos/{owner}/{repo}`, no `path`),
  and reusing the existing proxy (rather than a new function) keeps the single GitHub-facing
  proxy security-guidelines.md rule 4 already governs, instead of duplicating cookie/token
  handling in a second function.
- **Validation order: file check first, repo check only as fallback.** Checking the file path
  first means the common case (file already exists) resolves in one network call; the repo-level
  check only runs when the file check comes back 404, which is exactly the ambiguous case that
  needs disambiguating.
- **`'error' vs 'notFound'` kept distinct in the repo-level check.** A definitive 404 on the repo
  itself produces "repo introuvable ou inaccessible"; any other non-2xx outcome (rate limiting,
  GitHub outage, local network failure) produces a separate "unable to verify right now" message
  instead of incorrectly blaming the repo's existence for what may be a transient failure —
  found and fixed during self-review.
- **`onUnauthorized` passed as an optional callback parameter, not called by importing
  `useGitHubAuth()` directly.** Per this command's composable-caller-responsibility rule,
  composables may not call another composable from inside a plain/async function. The owning
  component calls both `useGitHubAuth()` and `useRepoConfig()` in its own `setup()` and passes
  `handleUnauthorized` through, matching the pattern `useGitHubAuth.ts` already documents for
  its own `handleUnauthorized` export.
- **No inline validation of `revalidateCacheDays` (positive-integer check) in this composable.**
  `business-specifications.md` assigns that rule explicitly to Sub-Issue E ("rejected with an
  inline validation message," rule 2 under Sub-Issue E). Sub-Issue B rule 2 only requires that
  saving "always persists the configuration to IndexedDB" — adding a second validation layer
  here would duplicate a rule owned by a different sub-issue.
- **`ownerRepo`/`filePath` are trimmed only inside `resolveValidationError`, not before
  persisting.** Persistence stores exactly what the caller passed in (Sub-Issue E's form is the
  source of truth for what "saved" means); trimming is applied only where its absence would
  cause a wrong validation verdict — found and fixed during self-review after noticing
  `useGitHubAuth.ts`'s own `hasRequiredRepoConfig` already trims for the same reason.

## Self-code review fixes applied

1. `resolveValidationError` — an empty (or whitespace-only) `filePath` was silently reinterpreted
   as "no path," which made `checkProxyReachable` run the repo-level check instead of failing
   clearly. Added an explicit empty-path guard returning `MISSING_FILE_PATH_MESSAGE`.
2. `splitOwnerRepo` — did not trim the input, so a value like `"alice/my-stations "` (trailing
   whitespace) would pass the split check and then fail the GitHub call with a misleading "repo
   not reachable" error instead of being caught as a formatting issue closer to its source. Now
   trims before splitting.
3. Repo-level check treated every non-200 status (403 rate limit, 5xx, network failure) as
   equivalent to "repo not found," which blames the repo for failures that are actually transient
   or on the caller's own network. Split `'notFound'` (definitive 404 → repo/access error) from
   `'error'` (anything else → a distinct "try again later" message).

## Object Calisthenics exceptions

- `useRepoConfig()`'s returned function body groups multiple operations in one composable, same
  documented framework exception already used in `useGitHubAuth.ts` and `useStationStorage.ts`.
- `resolveValidationError`'s guard-clause chain exceeds five lines because it walks one
  coherent sequential business rule (owner/repo format, then file-path presence, then the
  file-exists-or-repo-reachable check `business-specifications.md` Sub-Issue B rule 2 names).
  Splitting it further would fragment that one rule into indirection without improving
  readability — same documented exception already given to `github-auth-callback.ts`'s
  `validateCallbackRequest` in Sub-Issue F.
- `latestSaveRequestId` is a third module-level variable in this file, beyond the two
  (`repoConfig`, `validationError`) that match the `isAuthenticated`/`authError` precedent set
  by `useGitHubAuth.ts`. It exists solely to guard against a stale, slower `saveRepoConfig`
  call overwriting `validationError` after a newer call already resolved; it is never part of
  the composable's returned reactive surface, unlike the other two.

## Review-feedback fixes applied (review-results.md, changes requested)

1. **Finding 1 (security-guidelines.md rule 5 not self-contained).** `notifyUnauthorized` used
   to always resolve to `null`, so a 401 during validation surfaced no error unless a future
   caller remembered to pass `onUnauthorized`. It now always resolves to
   `SESSION_EXPIRED_MESSAGE`, with the callback invocation wrapped in `try/catch` so a failure
   in that optional notification can't prevent the message from being set — the re-auth prompt
   no longer depends on correct call-site wiring.
2. **Finding 2 (undocumented Object Calisthenics exception).** Added the exception note above,
   matching the precedent set for `validateCallbackRequest` in Sub-Issue F.

## Additional self-review fixes (this pass)

1. `notifyUnauthorized` — the `onUnauthorized?.()` call was unguarded; if that callback throws
   (e.g. a future `handleUnauthorized` implementation that persists to IndexedDB and rejects),
   the rejection would propagate out of `resolveValidationError`/`saveRepoConfig` instead of
   still surfacing `SESSION_EXPIRED_MESSAGE`. Wrapped in `try/catch`.
2. `resolveValidationError` — a generic `fileCheck === 'error'` outcome (GitHub 5xx, rate
   limiting, or a network failure reaching the proxy) used to fall through to a second,
   redundant repo-level network call before landing on the same `VALIDATION_UNAVAILABLE_MESSAGE`
   it would have reached immediately. Added an explicit `'error'` branch so only the genuinely
   ambiguous `'notFound'` outcome triggers the fallback check, per the "file check first, repo
   check only as fallback" design already documented above.
3. `saveRepoConfig` — concurrent calls (e.g. a user editing then re-saving before the first
   validation round-trip resolves) could let an earlier, slower request's result overwrite
   `validationError` after a later request already set it, showing a stale message. Added a
   `latestSaveRequestId` counter so only the most recently started `saveRepoConfig` call is
   allowed to write `validationError`.

## Second review-feedback fix applied (review-results.md, changes requested)

1. **Finding 1 (undocumented Object Calisthenics deviation — third module-level variable).**
   Added the exception note above for `latestSaveRequestId`, plus a matching inline comment in
   `useRepoConfig.ts`, for consistency with how the file's other two deviations are documented.

## Self-review fixes applied (this pass)

1. `saveRepoConfig` — `repoConfig.value = draft` was neither guarded by `latestSaveRequestId`
   (unlike `validationError`, a few lines below it) nor copied. A slower, stale save could
   overwrite the reactive `repoConfig` with older data after a newer save already resolved,
   and the exact object reference passed by the caller was aliased into the singleton's
   state — if the caller kept mutating that same object (e.g. a form model bound with
   `v-model`) after calling `saveRepoConfig`, those mutations would silently leak into
   `repoConfig.value` without another explicit save. Guarded the assignment with the same
   `requestId` check already used for `validationError`, and assign a shallow copy (`{ ...draft
   }`), matching `persistRepoConfig`'s existing `{ ...toRaw(draft) }` copy-before-use pattern.

status: ready
