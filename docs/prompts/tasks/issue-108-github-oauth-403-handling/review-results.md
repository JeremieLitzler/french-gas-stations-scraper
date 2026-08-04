# Review Results: Handle GitHub org OAuth restriction (403)

lint: clean (9 pre-existing errors remain in `usePreferencesExport.spec.ts` /
`usePreferencesImport.spec.ts` — confirmed via `git diff develop...HEAD`, neither file is
touched by this branch; unrelated to this task's changed files)
type-check: clean

## Checklist

All three prior-round findings are resolved and verified:

- `src/components/OrgRestrictionNotice.vue:13`'s comment now correctly says
  `rel="noopener noreferrer"`, matching `AppLink.vue:7`.
- `src/components/StationManager.vue:42`'s `AppLink` usage now passes `to="..."` instead of
  `href`/`target`/`rel`. Confirmed this takes `AppLink`'s external-link branch (`to` starts
  with `http`), so the link now genuinely renders `target="_blank" rel="noopener noreferrer"`
  with no per-call-site `rel` able to shadow it — `technical-specifications.md`'s "tightens
  every other external link" claim now holds for this call site.
- `src/components/StationManager.spec.ts:177` stubs `AppLink` as `{ template: '<a><slot /></a>' }`,
  so the prop-name change (`href`→`to`) does not break that test — confirmed by reading the stub.

The remaining known item — `src/components/layout/AppFooter.test.ts:90-96` still asserting
`rel="noopener"` — is not a new finding: it's a pre-existing test that predates this branch's
`AppLink.vue` change, is explicitly out of this task's `test-cases.md`, and is documented in
`technical-specifications.md`'s "Known follow-up" section as deferred to `/jli-writes-tests`
per prior user direction. Not blocking this review.

All other checklist items ✓ — verified against `technical-specifications.md`,
`business-specifications.md`, and `test-cases.md`: org-restriction detection is a boolean-only
check (no response text ever reaches a ref or the DOM — rule 2 confirmed); the settings-page
link is built only from the app's own configured owner and percent-encoded (rule 3); the fixed
sentence is centralized in one component (`OrgRestrictionNotice.vue`) reused at all three call
sites, satisfying test case 22's byte-identical requirement by construction; `useRepoConfig.ts`'s
short-circuit and the two remote-preferences composables' distinct non-retryable failure
(including the read-before-write GET and the final PUT) all match business-specifications.md
rules 1 and 3–5; the 403-body read is wrapped in try/catch in all three composables, falling
back to the existing generic-failure branch on parse failure or a non-matching body (rule 1);
no `v-html` anywhere; props are used via `props.owner` inside a `computed` rather than
destructured (no reactivity-loss pitfall); explicit return types and no unguarded `any`/`unknown`
in the new/changed exported functions; no dead code or unused imports.

status: approved
