# Test Results — Issue #108: Handle GitHub org OAuth restriction (403) with actionable message

## Test Run

Command: `npx vitest run --reporter=json` (Vitest v4.1.0) from the
`french-gas-stations-scraper_fix-github-oauth-403-handling` worktree.

## Files Run

All those mentioned in [technical specs](technical-specifications.md).

## Results

### Failures

**File:** `src/components/OrgRestrictionNotice.spec.ts`
**Test:** Scenario 17: the message is exactly the fixed sentence, "lien" rendered as a
clickable link > renders the fixed sentence verbatim, with a real `<a>` link whose text is
"lien"

```
AssertionError: expected 'Le dépôt choisi se trouve sous une or…' to be 'Le dépôt choisi se trouve sous une or…' // Object.is equality

Expected: "Le dépôt choisi se trouve sous une organisation n'autorisant pas l'authentification avec votre compte et le dépôt choisi. Veuillez visiter ce lien pour autoriser l'accès."
Received: "Le dépôt choisi se trouve sous une organisation n'autorisant pas l'authentification avec votre compte et le dépôt choisi. Veuillez visiter celienpour autoriser l'accès."

    at src/components/OrgRestrictionNotice.spec.ts:40:56
```

**Root cause:** `OrgRestrictionNotice.vue`'s template places `ce`, `<AppLink>lien</AppLink>`,
and `pour` on separate lines. Vue's default whitespace-condense compilation drops the
whitespace-only text nodes between text and an adjacent inline element when that whitespace
spans a newline, rather than collapsing them to a single space. The compiled render function
therefore emits no space character at all around the link — this reproduces identically in a
real browser, not just in this test's happy-dom environment. The rendered sentence reads
`...Veuillez visiter celienpour autoriser l'accès.` at all three call sites that reuse this
component (Settings validation error, sync error banner, write error banner), violating
business-specifications.md rule 2's "exactly the fixed sentence" requirement.

### Test Summary

409 test files, 484 tests total — 1 failed.

- Test files: 407 passed, 1 failed (`numFailedTestSuites` reported 2, but only one file
  (`OrgRestrictionNotice.spec.ts`) actually contains a failing assertion — the other count
  appears to be a Vitest JSON-reporter aggregation artifact, not a second failure)
- Tests: 483 passed, 1 failed
- Duration: ~9 seconds

status: failed
