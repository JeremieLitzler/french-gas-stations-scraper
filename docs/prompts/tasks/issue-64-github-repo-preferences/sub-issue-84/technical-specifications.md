# Technical Specifications — Sub-Issue E: Settings UI for Repo Config and Cache Parameter

## Files changed

- `src/components/GitHubSyncSettings.vue` (new) — the "GitHub Sync" section: login/logout control, `owner/repo` field, file path field, `revalidate-cache-days` field, inline validation, and the log-out-to-edit message. Wires Sub-Issue A's `useGitHubAuth` and Sub-Issue B's `useRepoConfig` together at the top level of its `setup()`.
- `src/pages/settings.vue` (new) — the `/settings` route (file-based routing). Thin page shell (back-to-home link, heading) delegating to `GitHubSyncSettings`, wrapped in `<Suspense>` per the existing `StationManager`/`StationManagerTable` async-component convention.
- `src/components/layout/AppFooter.vue` — added a `Paramètres` link to `/settings`, following the existing `Mentions légales` link pattern. Without it the new page would be unreachable from the UI.

No new types were added: `RepoConfigDraft` (`src/types/repo-config.ts`, from Sub-Issue B) already covers the three-field contract this UI edits.

## Non-trivial decisions

- **Manual `@input`/`v-model` handling instead of `vee-validate`/`AppFormField`**: `AppFormField.vue` (vee-validate-based) is unused everywhere else in the codebase — the established, actively-used pattern for form fields is plain refs + computed validation (`StationManagerTable.vue`). Followed that convention instead of reviving the unused vee-validate path.
- **shadcn `Input`/`Label`/`Button` components instead of raw `<input>`**: these are already auto-imported and used elsewhere (`Button` in `PreferencesDiffDialog.vue`); using them keeps styling Tailwind-only with no new custom CSS, per the project's styling convention. `Input.vue` has no declared `type`/`disabled`/`id` props, so those pass through to the root `<input>` via Vue's automatic attribute fallthrough — the same mechanism `PreferencesDiffDialog.vue` already relies on for `Button`'s `:disabled`.
- **Explicit "Enregistrer" button rather than per-field blur-save**: the three fields form one `RepoConfigDraft` object persisted together via `saveRepoConfig`, and test cases (E-1/E-2/E-3) describe an explicit "save" action — unlike the station list, there's no natural single-field save unit here.
- **`revalidate-cache-days` inline validation is reactive (`computed`), not blur-triggered**: gives immediate feedback as the user types and is trivially re-checked at save time, so a single source of truth (`cacheDaysError`) drives both the inline message and the Save button's disabled state — no separate imperative validation call needed.
- **Empty `revalidate-cache-days` is not an inline error, but blocks login-readiness**: business-specifications.md only mandates a message for `≤ 0`; treating "not yet typed" as silently invalid-but-unblocking (rather than flashing an error on an untouched field) matches `useGitHubAuth`'s existing `hasValidCacheDays` check (`!== null`), which already treats `null` as "not ready" without needing a UI-level error string.
- **`Promise.all` for the two initial loads**: `initializeAuthState()` (auth flag) and `loadRepoConfig()` (repo config) read independent IndexedDB keys with no data dependency between them, so they run concurrently instead of sequentially.
- **Local `isSaving` guard around `saveRepoConfig`**: prevents a double-click from firing two concurrent GitHub-proxy validation calls; `useRepoConfig`'s own `latestSaveRequestId` guard already prevents a stale response from corrupting `repoConfig`/`validationError`, but does not prevent the redundant network calls themselves — the UI-level guard closes that gap without touching the already-merged (#83) composable.

## Post-review fix: draft lost on login

**Reported behavior**: filling in `owner/repo` and file path, then clicking "Se connecter avec GitHub" without first clicking "Enregistrer", left both fields empty after the OAuth round-trip — nothing was ever written to IndexedDB.

**Root cause**: `login()` (`useGitHubAuth`) performs a full-page navigation to GitHub (`window.location.href = ...`), which is required by the Authorization Code flow (ADR-011) but destroys the component instance and any draft only held in `ownerRepoDraft`/`filePathDraft`/`cacheDaysDraft`. The Settings page never got a chance to persist it.

**Fix**: `onLogin()` now calls `saveRepoConfig(currentDraft.value, ...)` and awaits it before calling `login()`. This is gated behind the same `loginReady` check that already enables the button, so it only ever persists a draft that's already complete and valid — it doesn't silently save partial/invalid data.

## Post-test-failure fix: revalidate-cache-days type mismatch crashed on user input

**Reported behavior**: `GitHubSyncSettings.spec.ts` (5 scenarios: E-1, E-2, E-3, E-6, E-7) failed
with `TypeError: ....trim is not a function`, thrown from `parseCacheDays` and `cacheDaysError`.

**Root cause**: `cacheDaysDraft` was declared as `Ref<string>` and both `parseCacheDays(raw:
string)` and `cacheDaysError` called `.trim()` on it directly. Vue's native `v-model` runtime
auto-casts the bound value to `Number` for any `<input>` whose `type` attribute is `"number"` —
this happens whether or not a `.number` modifier is present. Since `Input.vue`'s internal
`<input v-model="modelValue">` inherits `type="number"` via attribute fallthrough from
`<Input id="revalidateCacheDays" type="number" ... v-model="cacheDaysDraft" />`
(`GitHubSyncSettings.vue`), every real edit to that field — not just the test's `setValue()` —
delivers a `number` to `cacheDaysDraft`, not the `string` its original type declared. This was a
genuine runtime defect reproducible in a real browser, not a wrong test assertion: typing a
value into "Fréquence de synchronisation (jours)" would have thrown immediately.

**Fix**: `cacheDaysDraft` is now typed `Ref<string | number>`, matching what Vue's runtime
actually delivers. `parseCacheDays` now accepts `string | number` and normalizes via
`String(raw).trim()` instead of `raw.trim()`; `cacheDaysError` does the same
(`String(cacheDaysDraft.value).trim()`). This preserves the deliberate `type="number"` input
(native numeric keypad on mobile, spinner UI, `min="1"` semantics) rather than switching to
`type="text"`, while making the two call sites tolerant of either type Vue may hand them.

**Self-review — two additional cases checked, no further defect found**:
- Garbage non-numeric text (e.g. `"7abc"`) still correctly resolves `parseCacheDays` to `null`
  and `cacheDaysError` to the inline error message — `String("7abc").trim()` is non-empty, so
  the empty-field short-circuit in `cacheDaysError` does not swallow it.
- A native `<input type="number">` returns `""` from its own `.value` getter for a
  syntactically-incomplete entry (e.g. the user has typed only `"-"`), independent of this
  component's code — a browser-level quirk of `type="number"` inputs, not fixable at this
  layer without dropping the native numeric input type; `revalidate-cache-days` is not listed
  in `test-cases.md` as needing to handle that specific incomplete-entry state, so it is
  flagged for awareness rather than changed.

## Note on a spec/implementation discrepancy inherited from Sub-Issue B (not blocking)

business-specifications.md, Sub-Issue B rule 3, states "For users who have never authenticated, all three fields are empty." However `useRepoConfig.ts`'s `emptyRepoConfig()` (merged in #83) defaults `revalidateCacheDays` to `7`, not empty — consistent with Sub-Issue C rule 1 ("default: 7 days, editable from Settings UI"). This UI reads whatever `useRepoConfig` returns, so first-time users see `revalidate-cache-days` pre-filled with `7` rather than blank. No Sub-Issue E test case (E-1 through E-7) tests the first-load value of this field, so this does not block any test case here — flagging it for awareness rather than as a blocking incoherence, since resolving it would mean changing Sub-Issue B's already-reviewed, already-tested composable.

## Also noted, not fixed (out of scope)

Each "Enregistrer" click while authenticated re-runs full server-side validation (`resolveValidationError`) of `owner/repo` and file path even when only `revalidate-cache-days` changed, costing up to two GitHub API calls per save. Fixing this would require changing `useRepoConfig.saveRepoConfig`'s signature/behavior (Sub-Issue B, already merged and tested in #83) — left untouched to avoid an undocumented cross-scope change.

status: ready
