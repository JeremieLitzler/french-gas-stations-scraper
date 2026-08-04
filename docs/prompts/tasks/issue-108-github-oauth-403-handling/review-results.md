# Review Results: Handle GitHub org OAuth restriction (403)

lint: clean (9 pre-existing errors remain in `usePreferencesExport.spec.ts` /
`usePreferencesImport.spec.ts` — confirmed via `git diff develop...HEAD`, neither file is
touched by this branch; unrelated to this task's changed files)
type-check: clean

## Checklist

- **`src/components/layout/AppFooter.test.ts:90-96` will fail against the changed
  `AppLink.vue`.** The existing test `it('all links have rel="noopener"', ...)` asserts
  `link.attributes('rel')).toBe('noopener')` for every `AppLink`-rendered anchor in
  `AppFooter.vue`. `AppLink.vue:7` was changed by this branch from `rel="noopener"` to
  `rel="noopener noreferrer"` (the rule-4 fix from the prior review round), so every footer
  link now renders `rel="noopener noreferrer"` and this assertion no longer matches. Update
  the expectation to `'noopener noreferrer'` — `src/pages/mentions-legales.spec.ts` (TC-05)
  already asserts the same value elsewhere, so this brings the two in line.
- **`src/components/OrgRestrictionNotice.vue:13` has a stale comment.** It still reads
  "Reuses `AppLink`, which already opens external links in a new tab with `rel="noopener"`"
  — but `AppLink.vue:7` now sets `rel="noopener noreferrer"`. Leaving the comment as-is
  re-states the exact claim the prior review round rejected (that `noopener` alone satisfies
  security-guidelines.md rule 4); update it to say `noopener noreferrer` so it doesn't mislead
  a future reader into thinking the weaker value is still in place.
- **`technical-specifications.md`'s claim that the `AppLink` fix "tightens every other
  external link already using `AppLink` (`AppFooter.vue`, `StationManager.vue`)" is not true
  for `StationManager.vue`.** `StationManager.vue:42` passes its own `rel="noopener"`
  attribute directly on its `<AppLink>` usage. Since `rel` isn't a declared prop of `AppLink`,
  Vue 3's fallthrough-attribute merge applies it to the component's root element *after* the
  template's own `rel="noopener noreferrer"` binding — for non-class/style attributes the
  fallthrough value wins, so this specific link is still rendered with `rel="noopener"` only,
  unchanged by this branch. `StationManager.vue` isn't in this task's file list so it's not
  this review's call to fix it, but the tech-spec claim should either be corrected or (if the
  team wants the tightening to actually apply there) the redundant `rel="noopener"` should be
  dropped from that call site so `AppLink`'s own binding takes effect.

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

status: changes requested
