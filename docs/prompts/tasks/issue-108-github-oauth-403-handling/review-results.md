# Review Results: Handle GitHub org OAuth restriction (403)

lint: clean (9 pre-existing errors remain in `usePreferencesExport.spec.ts` /
`usePreferencesImport.spec.ts` — confirmed via `git diff develop...HEAD --stat`, neither file
is touched by this branch; unrelated to this task's changed files)
type-check: clean

## Checklist

All checklist items ✓ — verified against `technical-specifications.md`, `security-guidelines.md`,
`business-specifications.md`, and `test-cases.md`:

- Security guidelines: rule 1 (try/catch around `response.json()`/body-shape read, falls to
  `null` → generic message) confirmed in all three `extractOrgRestrictionMessage` functions;
  rule 2 (hardcoded `ORG_RESTRICTION_DOCS_URL`, never read from the response body) confirmed;
  rule 3 (control/bidi-char stripping via `CONTROL_CHAR_CODE_RANGES` + `sanitizeGitHubText`,
  covering ranges 0x200b–0x200f, 0x202a–0x202e, 0x2060–0x2069, 0xfeff) confirmed, plus all three
  refs (`validationError`, `syncError`, `writeError`) are rendered with `{{ }}` text
  interpolation only — no `v-html` anywhere in the codebase.
- Business spec rules 1–6 traced line-by-line against test cases 1–21: detection
  (`.includes('OAuth App access restrictions')`), message content/tone per call site, the
  401-style short-circuit in `useRepoConfig.ts` skipping the repo-level fallback, and the
  distinct non-retryable failure surfaced in both the read and write composables (including the
  read-before-write GET and the final PUT in `useRemotePreferencesWrite.ts`) all match.
- No response body is read twice on any path (checked each `response.json()` call site against
  the branches that precede/follow it).
- No dead code, unused imports, `any`/unguarded `unknown`, or missing return types introduced.
- Object Calisthenics exceptions (guard-clause chains, >2 module-level state vars) are all
  pre-existing, documented in the file's own comments, and untouched by this diff (confirmed via
  `git diff develop...HEAD -- src/composables/useRepoConfig.ts`).

All other checklist items ✓.

status: approved
