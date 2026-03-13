# Agent Additions — 2026-03-05

## Request

Add two new agents to the multi-agent pipeline:

1. **Security Agent** — reads business specs and produces security guidelines for the coder.
2. **Code Reviewer Agent** — reviews coder output and loops with the coder until the review is clean.

---

## Proposed Agent Definitions

### agent-5-security.md

**Role:** Read `[task-folder]/business-specifications.md` and produce `[task-folder]/security-guidelines.md`.

**Scope of analysis:**

- Input validation and sanitisation rules relevant to the feature (URL inputs, user-supplied strings, etc.)
- Output encoding risks (XSS surface in generated HTML/content)
- Netlify Function boundary concerns: request validation, domain allowlist, response handling
- Dependency risks related to the change (new packages, CDN resources)
- Secrets and environment variable handling
- CORS and HTTP header concerns specific to the change

**Output format:** A numbered list of actionable security rules for the coder. Each rule must state:

- What must be enforced
- Where (which file or layer)
- Why (attack vector or risk mitigated)

**End marker:** `status: ready`

**Placement in pipeline:** After specs commit, before coding. Coder reads `security-guidelines.md` alongside `business-specifications.md`.

---

### agent-6-reviewer.md

**Role:** Review code produced by the coder and loop with it until the review is clean.

**Scope of review:**

- Compliance with `[task-folder]/security-guidelines.md` — every rule must be verifiably addressed
- Compliance with Object Calisthenics rules from `agent-2-coder.md`
- Adherence to the business spec (no missing requirements, no scope creep)
- Dead code, unused imports, unreachable branches
- Naming clarity (no abbreviations, intent is obvious)

  Examples of violations:
  - `btn` → `submitButton`, `idx` → `index`, `val` → `extractedValue`, `res` → `fetchResponse`, `err` → `error`, `cb` → `onSuccessCallback`, `fn` → `transformContent`
  - Single-letter loop variables outside trivial math: `for (const i of items)` → `for (const item of items)`

- Vue/TypeScript-specific issues: reactivity pitfalls, type safety, composable conventions

  Examples of reactivity pitfalls:
  - Destructuring a reactive object loses reactivity: `const { title } = useArticleState()` silently breaks; use `toRefs()` or access as `state.title`
  - Watching a reactive property directly: `watch(state.count, ...)` never triggers; use a getter `watch(() => state.count, ...)`
  - Mutating a prop in-place instead of emitting an event
  - Calling `reactive()` on a primitive value (returns the value unchanged)

  Examples of type safety violations:
  - Using `any` or `unknown` without a narrowing guard
  - Non-null assertions (`!`) applied without a preceding null check
  - Untyped function parameters that implicitly become `any`
  - Missing explicit return types on exported functions

  Examples of composable convention violations:
  - A composable not prefixed with `use` (e.g. `getArticleState`)
  - A composable accepting a reactive argument without normalising it via `toValue()` or `toRef()`
  - Side effects (event listeners, timers, subscriptions) set up in the composable body without a matching `onUnmounted` cleanup

**Loop behaviour:**

- If findings exist: write `[task-folder]/review-results.md` ending with `status: changes requested`, listing every finding with file + line reference and a suggested fix direction (not code).
- Coder reads the review, fixes, re-writes `[task-folder]/technical-specifications.md`, ends with `status: ready`.
- Reviewer re-runs. Loop continues until reviewer writes `status: approved`.
- Each loop iteration counts toward `MAX_RETRIES`.

**Output file:** `[task-folder]/review-results.md`

**End markers:** `status: approved` or `status: changes requested`

**Placement in pipeline:** After coding, before human approval and testing.

---

## Proposed Pipeline Changes

### agent-0-orchestrator.md

Insert two new steps:

**After Step 1 (specs commit), before Step 2 (coding):**

```
### Step 1.5 — Security

Read `.claude/agents/agent-5-security.md` and spawn a subagent. Pass `[task-folder]`.

The subagent reads `[task-folder]/business-specifications.md` and writes `[task-folder]/security-guidelines.md`.

Wait for `status: ready`. On failure, stop and report.
```

**After Step 2 (coding), before human approval:**

```
### Step 2.5 — Code Review

Read `.claude/agents/agent-6-reviewer.md` and spawn a subagent. Pass `[task-folder]`.

The subagent reviews source files listed in `[task-folder]/technical-specifications.md` against
`[task-folder]/security-guidelines.md` and `[task-folder]/business-specifications.md`.

Wait for `[task-folder]/review-results.md` to end with `status: approved` or `status: changes requested`.

If `status: changes requested`:
- Re-run Step 2 (coder reads review-results.md and fixes). Counts toward MAX_RETRIES.
- Then re-run Step 2.5.

If `status: approved`:
- Proceed to human approval, then commit code (Task 4).
```

### CLAUDE.md

Add agents 5 and 6 to the agents table and update the pipeline flow diagram:

| Agent    | Prompt                              | Reads                                                                               | Writes                                 |
| -------- | ----------------------------------- | ----------------------------------------------------------------------------------- | -------------------------------------- |
| Security | `.claude/agents/agent-5-security.md` | `[task-folder]/business-specifications.md`                                          | `[task-folder]/security-guidelines.md` |
| Reviewer | `.claude/agents/agent-6-reviewer.md` | `[task-folder]/technical-specifications.md`, `[task-folder]/security-guidelines.md` | `[task-folder]/review-results.md`      |

Updated pipeline flow:

```plaintext
[task-folder]/README.md
       ↓
Versioning agent → branch
       ↓
  Specs agent → business-specifications.md
       ↓           ↑ ADR Required (human approves before proceeding)
Versioning agent → commit specs
       ↓ ← human approval
Security agent → security-guidelines.md
       ↓
  Coder agent → technical-specifications.md (reads security-guidelines.md)
       ↓           ↑ status: review specs (loops back to specs)
Reviewer agent → review-results.md
       ↓           ↑ status: changes requested (loops back to coder)
       ↓           ↑ ADR Required (human approves before committing)
Versioning agent → commit code
       ↓ ← human approval
 Tester agent → test-results.md
       ↓           ↑ status: failed (loops back to coder)
Versioning agent → commit tests + push
       ↓ ← human approval (PR creation)
  gh pr create
       ↓ ← human approval (merge)
  gh pr merge
```

Convert workflow to flowchart diagram with mermaid.

### Task folder structure (updated)

```
docs/prompts/tasks/
  issue-[id of issue]-[slug]/
    README.md                    ← user request (input)
    business-specifications.md   ← specs agent output
    security-guidelines.md       ← security agent output
    technical-specifications.md  ← coder agent output
    review-results.md            ← reviewer agent output
    test-results.md              ← tester agent output
```

---

## Documentation Lookup in the Reviewer Agent

### Option A — Context7 MCP (not implemented)

Context7 is an MCP server (`npx -y @upstash/context7-mcp`) that provides version-pinned, structured library documentation via a dedicated tool call. The reviewer agent would resolve library IDs (e.g. `vue`, `mdn`) and receive curated doc snippets at review time.

Not configured for this project. Would require adding a `.mcp.json` at the repository root and registering the server in Claude project settings. Chosen against for now to avoid external service dependency.

For MDN, the question is: which source is better from the top 4 sources: https://context7.com/?q=mdn
For Vue.js, a decision is needed to pick the source(s): https://context7.com/?q=vue

### Option B — WebFetch on canonical URLs (implemented)

The reviewer agent fetches specific Vue 3 and MDN reference pages directly via `WebFetch` when checking reactivity, composable, or Web API patterns. No setup required.

Pages anchored in `agent-6-reviewer.md`:

- `https://vuejs.org/guide/essentials/reactivity-fundamentals` — reactivity model
- `https://vuejs.org/guide/reusability/composables` — composable conventions
- `https://vuejs.org/guide/typescript/composition-api` — TypeScript + Vue
- `https://developer.mozilla.org/en-US/docs/Web/API/URL` — URL API (used in `utm.ts`)

---

## Open Questions (resolve before writing agent files)

1. Should the security agent also flag ADR-Required if a new security pattern is introduced? Yes.
2. Should `review-results.md` be committed separately (new versioning task), or included with the code commit (Task 4)? included with the code commit.
3. Should the reviewer have access to run `npm run lint` / `npm run type-check` directly, or is it read-only? access to run `npm run lint` / `npm run type-check` directly.
4. Should `security-guidelines.md` be committed alongside `business-specifications.md` (Task 3), or in a new Task 3.5? new Task 3.5
