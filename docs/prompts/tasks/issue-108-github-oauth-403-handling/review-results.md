# Review Results: Handle GitHub org OAuth restriction (403)

lint: clean (9 pre-existing errors remain in `usePreferencesExport.spec.ts` /
`usePreferencesImport.spec.ts` — confirmed via `git diff develop...HEAD`, neither file is
touched by this branch; unrelated to this task's changed files)
type-check: clean

## Checklist

- **security-guidelines.md rule 4 not satisfied**: `src/components/OrgRestrictionNotice.vue:4`
  renders the link via the existing `AppLink` component, which sets `rel="noopener"` only
  (`src/components/AppLink.vue:7`, confirmed unmodified by this branch via
  `git diff develop...HEAD -- src/components/AppLink.vue`). Rule 4's "What" explicitly requires
  `rel="noopener noreferrer"` alongside `target="_blank"`. `technical-specifications.md`'s
  "Non-trivial decisions" section argues `noopener` alone already closes the `window.opener`
  vector the rule's "Why" describes, and that's true — but the security doc as currently written
  is a specific, literal requirement (`noopener noreferrer`), not just "prevent
  reverse-tabnabbing," so the code doesn't verifiably satisfy the rule as stated. Two ways to
  close this: add `noreferrer` (e.g. to `AppLink.vue`, which would also tighten the app's other
  external links) or amend security-guidelines.md rule 4 to explicitly accept `noopener` alone
  and note why. Either is a legitimate call — not this review's decision to make silently.

All other checklist items ✓ — verified against `technical-specifications.md`,
`business-specifications.md`, and `test-cases.md`: org-restriction detection is a boolean-only
check (no response text ever reaches a ref or the DOM — rule 2 confirmed via `grep` for the
removed sanitization/message-carrying code, none remains); the settings-page link is built only
from the app's own configured owner and percent-encoded (rule 3); the fixed sentence is
centralized in one component (`OrgRestrictionNotice.vue`) reused at all three call sites,
satisfying test case 22's byte-identical requirement by construction; `useRepoConfig.ts`'s
short-circuit and the two remote-preferences composables' distinct non-retryable failure
(including the read-before-write GET and the final PUT) all match business-specifications.md
rules 1 and 3–5; no `v-html` anywhere; props are used via `props.owner` inside a `computed`
rather than destructured (no reactivity-loss pitfall); explicit return types and no unguarded
`any`/`unknown` in the new/changed exported functions; no dead code or unused imports from the
removed sanitization logic.

status: changes requested
