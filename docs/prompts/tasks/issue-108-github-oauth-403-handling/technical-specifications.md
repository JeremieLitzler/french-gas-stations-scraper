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
  `AppLink` component for the `target="_blank" rel="noopener noreferrer"` new-tab behavior
  (security-guidelines.md rule 4) instead of a one-off anchor.
- `src/components/AppLink.vue` — `rel="noopener"` changed to `rel="noopener noreferrer"` on its
  external-link branch (review-results.md finding), to literally satisfy security-guidelines.md
  rule 4's stated requirement; this also tightens every other external link already using
  `AppLink` (`AppFooter.vue`, `StationManager.vue`).
- `src/components/StationManager.vue` — its `AppLink` usage changed from
  `href="..." target="_blank" rel="noopener"` to `to="..."` (review-results.md second-pass
  finding). See "Non-trivial decisions" below.
- `src/components/OrgRestrictionNotice.vue` — doc comment corrected from `rel="noopener"` to
  `rel="noopener noreferrer"` (review-results.md second-pass finding), matching the `AppLink.vue`
  fix above so the comment doesn't restate the claim the first review round rejected.
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

- **The link is rendered via the existing `AppLink` component, not a new one-off `<a>`, and
  `AppLink` itself was updated to add `noreferrer`.** review-results.md's first pass flagged
  that `AppLink` only set `rel="noopener"`, while security-guidelines.md rule 4 explicitly
  requires `rel="noopener noreferrer"` — `noopener` alone does close the `window.opener`
  reverse-tabnabbing vector the rule's "Why" describes, but the rule's "What" is a literal,
  specific requirement, not just "prevent reverse-tabnabbing by some means." Fixing `AppLink`
  itself (rather than adding a one-off anchor just for this feature) satisfies the rule and
  tightens every other external link already using it, instead of leaving the codebase with two
  different external-link `rel` conventions.

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

- **`StationManager.vue`'s `AppLink` usage was switched from `href`/`target`/`rel` attributes to
  the `to` prop, instead of just dropping the redundant `rel`.** review-results.md's second-pass
  finding was that this call site's own `rel="noopener"` attribute overrides `AppLink`'s internal
  `rel="noopener noreferrer"` via Vue's fallthrough-attribute merge, so the `AppLink.vue` fix
  above wasn't actually reaching this link. Investigating why revealed a deeper pre-existing
  issue: `AppLink`'s `isExternal` check (`typeof to === 'string' && to.startsWith('http')`) only
  fires off the `to` prop, not `href` — this call site passed `href`, so it was never taking the
  external-link branch at all, and was falling through to `AppLink`'s `router-link` branch (only
  still working as an external link by accident, because Vue Router skips its click-interception
  for anchors carrying `target="_blank"`). Passing `to` instead of `href`/`target`/`rel` fixes
  both problems at once: it takes the intended external-link branch, which supplies
  `target="_blank" rel="noopener noreferrer"` itself, so no per-call-site `rel` can shadow it
  again.

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

Additionally, after the review's `rel` finding, checked whether `AppLink.vue`'s change to
`noopener noreferrer` could regress anything: no `.spec.ts` file exists for `AppLink.vue`
itself, and `src/pages/mentions-legales.spec.ts` (TC-05) already asserts external links
elsewhere in this app carry `rel="noopener noreferrer"` — confirming `AppLink`'s prior
`noopener`-only was the inconsistent outlier, not an established convention this change breaks.
That check missed `src/components/layout/AppFooter.test.ts:90-96`, which does assert the old
`rel="noopener"` value for `AppFooter.vue`'s `AppLink`-rendered links and will now fail — this
is a `.test.ts` file, so per this command's rules it is not edited here; per user direction it
is left for `/jli-writes-tests` to update (expected new value: `'noopener noreferrer'`, matching
the `mentions-legales.spec.ts` TC-05 precedent).

### Known follow-up: pre-existing test needs updating

`src/components/layout/AppFooter.test.ts:90-96` (`it('all links have rel="noopener"', ...)`)
was already failing against this branch's `AppLink.vue` change before this pass and is
unaffected by today's fixes — it is not part of this task's `test-cases.md` and this command
does not touch test files, so it is called out here rather than silently left for
`/jli-runs-tests` to discover cold. (Resolved by `/jli-writes-tests` in a later pass, which
updated the assertion to `'noopener noreferrer'`.)

## Loop-back fix: `test-results.md` Scenario 17 failure

### Files changed

- `src/components/OrgRestrictionNotice.vue` — the `ce`/`<AppLink>lien</AppLink>`/`pour` text
  and link, previously each on their own template line, are joined onto one line
  (`ce <AppLink ...>lien</AppLink> pour`).

### Root cause

Vue's compiler (default `whitespace: 'condense'`) fully removes a text node's boundary
whitespace when that whitespace run contains a newline and sits directly against an element
tag — it does not condense it to a single space the way it does for whitespace runs that
stay within plain text. With `ce` and `pour` each on their own line around `<AppLink>`, the
newline-adjacent-to-tag boundaries on both sides were stripped entirely, rendering
`...visiter celienpour autoriser...` with no separating spaces — the bug
`OrgRestrictionNotice.spec.ts`'s Scenario 17 (test-results.md) caught, since it asserts the
exact fixed sentence from business-specifications.md rule 2.

### Fix and why it's correct

Putting `ce <AppLink ...>lien</AppLink> pour` on a single line means the whitespace on each
side of the tag is a single space with no newline in it — condense mode preserves that as-is
(only newline-containing boundary whitespace is dropped; a same-line space next to a tag is
kept). The surrounding prose (`avec votre\n  compte`, `pour\n  autoriser`) is left wrapped
across lines exactly as before, since interior newlines *within* a text run (not touching a
tag boundary) already condensed correctly to a single space — that part of the rendering was
never broken, and test-results.md's diff confirms the sentence up to `ce` and after `pour`
was already correct.

### Self-code review

1. **Checked for a resulting double space.** `AppLink.vue` renders its slot content
   (`<slot></slot>`) with no surrounding whitespace of its own, so joining `ce <AppLink>` and
   `</AppLink> pour` on one line contributes exactly one space on each side of the link text
   — not two. No change needed.
2. **Checked the fix doesn't reintroduce the newline-adjacent-to-tag bug elsewhere in the
   same file.** The template now has exactly one inline element (`AppLink`); both of its
   surrounding boundaries were moved onto its own line, and no other tag boundary exists to
   re-check.
3. **Checked whether this fix could regress the "no GitHub response text" and "no `v-html`"
   security guarantees (security-guidelines.md rule 2).** The change is purely whitespace
   placement in static template text — no interpolation, binding, or `v-html` was touched. No
   change needed.

Same-pattern multi-line-around-inline-element templates elsewhere in the codebase (if any)
are out of this task's scope (business-specifications.md lists no other files) and are not
touched here.

status: ready
