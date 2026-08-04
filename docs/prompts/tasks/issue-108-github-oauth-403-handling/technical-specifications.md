# Technical Specifications: Handle GitHub org OAuth restriction (403)

## Files changed

- `src/types/org-restriction-notice.ts` (new) — `OrgRestrictionNotice { owner: string }`, the
  shape carried by `validationError`/`syncError`/`writeError` when the org-restriction case is
  detected.
- `src/utils/orgRestrictionNotice.ts` (new) — `buildOrgRestrictionSettingsUrl(owner)`, the pure
  function that builds the percent-encoded per-organization settings-page URL
  (security-guidelines.md rule 3).
- `src/components/OrgRestrictionNotice.vue` (new) — renders the fixed French sentence
  (business-specifications.md rule 2) with the "lien" word as a real link, reusing the existing
  `AppLink` component for the `target="_blank" rel="noopener"` new-tab behavior
  (security-guidelines.md rule 4) instead of a one-off anchor.
- `src/composables/useRepoConfig.ts` — `classifyProxyResponse`/`checkProxyReachable` detect the
  org-restriction 403 as a boolean (`isOrgRestrictedResponse`, replacing the old
  message-extracting/sanitizing `extractOrgRestrictionMessage`); `resolveValidationError`
  resolves it to `{ owner }` and skips the repo-level fallback, mirroring the 401 short-circuit.
- `src/composables/useRemotePreferencesSync.ts` — `requestRemoteFile` throws
  `RemoteOrgRestrictedError` (now carrying the owner, not GitHub's text) on an org-restricted
  403; `handleFetchFailure` maps it to `{ owner }`.
- `src/composables/useRemotePreferencesWrite.ts` — `fetchExistingFile` and `handlePutResponse`
  (now taking `owner` as a parameter) both throw `RemoteWriteOrgRestrictedError` carrying the
  owner; `handleWriteFailure` maps it to `{ owner }`.
- `src/components/GitHubSyncSettings.vue`, `src/components/HomePageContent.vue` — each error ref
  (`validationError`, `syncError`, `writeError`) is split into two local computed refs (plain
  text vs. `OrgRestrictionNotice`) so the template renders either the existing `{{ }}`
  interpolation or `<OrgRestrictionNotice :owner="..." />`, never a raw object.

## Non-trivial decisions

- **`ProxyCheckResult` reverts from a discriminated union back to a plain string union.** The
  first pass (superseded) needed to carry GitHub's message text alongside the "orgRestricted"
  outcome, which required a `{ kind: '...' }` shape. The redesign no longer displays any
  response text — detection is now a pure boolean — so the payload-carrying reason for the
  union no longer exists; the simpler `'ok' | 'notFound' | 'unauthorized' | 'orgRestricted' |
  'error'` union is restored.

- **The owner is threaded through as a plain function/error-constructor argument, not
  re-derived from the response.** `useRepoConfig.ts`'s `resolveValidationError` already has
  `ownerRepo` in scope at both the file-check and repo-check call sites, so building
  `{ owner: ownerRepo.owner }` there needs no new plumbing. In the two remote-preferences
  composables, `RemoteOrgRestrictedError`/`RemoteWriteOrgRestrictedError` carry the owner via
  the standard `Error.message` property (mirroring the existing
  `RemoteUnauthorizedError`/`RemoteWriteConflictError` pattern in both files) instead of a
  custom field — `handlePutResponse` gained an `owner: string` parameter since it previously had
  no access to `ownerRepo` (it only received the fetch `Response`).

- **A new component (`OrgRestrictionNotice.vue`) owns both the fixed sentence and the link,
  reused at all three render sites, rather than duplicating the sentence in each of the two
  view components.** business-specifications.md rule 2 now requires the text to be identical
  everywhere (unlike the old per-call-site tone), so centralizing it removes the risk of the
  three copies drifting apart and satisfies test-cases.md scenario 22 (byte-identical output)
  by construction instead of by discipline. This follows the same small,
  single-purpose-message-component precedent already in the codebase (`EmptyStationsMessage.vue`).

- **The link is rendered via the existing `AppLink` component, not a new one-off `<a>`.**
  `AppLink` already implements exactly the required external-link behavior
  (`target="_blank" rel="noopener"`, used elsewhere in `AppFooter.vue`/`StationManager.vue`), so
  reusing it satisfies security-guidelines.md rule 4 by construction and avoids a second,
  slightly different implementation of the same security-sensitive attribute pair. `AppLink`
  uses `rel="noopener"` (not `noopener noreferrer`); `noopener` alone already fully closes the
  `window.opener` reverse-tabnabbing vector security-guidelines.md rule 4 is about, so matching
  this project's one established convention was chosen over introducing a second, inconsistent
  external-link pattern for `noreferrer`'s purely-cosmetic (referrer-header) difference.

- **Each composable's error ref stays `string | OrgRestrictionNotice | null`, split into two
  typed computed refs inside the consuming component rather than in the composable.** This
  keeps every composable's public return shape a single ref per error state (no API change
  beyond the value type), and keeps the `typeof`-based narrowing (`'object'` vs `'string'`) a
  template-adjacent concern local to each `.vue` file, since only one component consumes each
  ref today.

- **`buildOrgRestrictionSettingsUrl` percent-encodes the owner even though GitHub logins are
  alphanumeric-and-hyphen only today** (security-guidelines.md rule 3) — defensive, not
  currently reachable by any input this app accepts, but building a URL by concatenating
  unencoded input is the kind of pattern that becomes a bug the day that assumption changes.

## Self-code review

Three issues were found and fixed while reviewing the new code:

1. **`typeof x === 'object'` narrowing double-checked against `null`.** Since
   `typeof null === 'object'` in JavaScript, `typeof validationError.value === 'object' ?
   validationError.value : null` needed verifying it still resolves correctly when the ref is
   `null` — it does, because the true-branch's value *is* `validationError.value`, which is
   `null` in that case, so the computed still yields `null` either way. Confirmed correct, no
   change needed, but left as a note here since it's non-obvious.
2. **`handlePutResponse` was missing `ownerRepo` in scope.** Unlike `fetchExistingFile` (which
   receives `ownerRepo` directly), `handlePutResponse` previously only received the `Response`.
   Added an explicit `owner: string` parameter (passed as `ownerRepo.owner` from its one call
   site in `putRemoteFile`) rather than threading the whole `OwnerRepo` object through, since
   only the owner is ever needed here.
3. **Redundant `ORG_RESTRICTION_INDICATOR`/`isOrgRestrictedResponse` duplication across all
   three composables was reconsidered and kept as-is.** Extracting it to a shared util would
   remove three small, identical functions, but business-specifications.md's Scope section
   still lists only these three composables with "no new files" for that specific concern, and
   the established convention in this codebase (`splitOwnerRepo`, `buildProxyUrl`,
   `hasCompleteRepoConfig`) is already to duplicate such small per-file helpers rather than
   share them across these three composables — consistent, not a new pattern.

status: ready
