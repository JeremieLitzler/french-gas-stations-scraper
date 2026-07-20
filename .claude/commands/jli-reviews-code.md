Review the implementation. Task folder: $ARGUMENTS

`$ARGUMENTS` is the task folder, given as a `@`-mention relative to the worktree root you
opened (e.g. `@docs/prompts/tasks/issue-<id>-<slug>`). If it is empty, stop and reply:

> Usage: `/jli-reviews-code @<task-folder>` — open the feature worktree (`code <worktree>`) first,
> then pass the task folder relative to it.

Run from the worktree root (your current directory) — that is where `node_modules` lives and
where the shell commands below must run.

## Sub-issue task folders

If the task folder is a `sub-issue-<n>` subfolder, read the shared specs
(`business-specifications.md`, `security-guidelines.md`, `test-cases.md`) from its **parent**
folder and write this command's outputs into the **subfolder**; parse `[id]` from
`issue-<id>-<slug>` or `sub-issue-<id>`. Otherwise it is a flat folder holding everything
(see `AGENT-COMMAND-MIGRATION.md` for the rationale).

## What this command does

Read `[task-folder]/technical-specifications.md` (the list of changed files),
`[task-folder]/security-guidelines.md`, and `[task-folder]/business-specifications.md`. Then
read every source file listed in the technical spec.

Run exactly these two commands from the worktree (they are guaranteed to exist in
`package.json`; do not inspect `package.json` first). Include their output in your findings:

```bash
npm run lint       # eslint . --fix
npm run type-check # vue-tsc --build (no rtk equivalent)
```

Do NOT run `npm run test` — that is `/jli-runs-tests`'s job.

Before reviewing Vue/TypeScript issues, fetch these reference pages to ground the review:
- `https://vuejs.org/guide/essentials/reactivity-fundamentals`
- `https://vuejs.org/guide/reusability/composables`
- `https://vuejs.org/guide/typescript/composition-api`
- `https://developer.mozilla.org/en-US/docs/Web/API/URL`

## Review checklist

- Every rule in `security-guidelines.md` is verifiably addressed in the changed files.
- Object Calisthenics respected (one indentation level, no `else`, domain types,
  first-class collections, one dot per line, no abbreviations, small entities, ≤2 instance
  variables, no getters/setters).
- Implementation matches the business spec — no missing requirements, no scope creep.
- No dead code, unused imports, or unreachable branches.
- Naming clarity — no abbreviations (`btn`→`submitButton`, `idx`→`index`, `res`→`fetchResponse`,
  `err`→`error`); no single-letter loop variables outside trivial math.
- Vue/TS pitfalls:
  - Destructuring a reactive object loses reactivity — use `toRefs()` or `state.value`.
  - Watching a reactive property directly never triggers — use a getter `() => state.count`.
  - Mutating a prop in place instead of emitting.
  - `reactive()` on a primitive.
  - `any`/`unknown` without a narrowing guard; non-null `!` without a null check; untyped
    params; missing explicit return types on exported functions.
  - A composable not prefixed with `use`; a reactive arg not normalised via `toValue()`/
    `toRef()`; side effects without a matching `onUnmounted` cleanup.

## Output contract

Create `[task-folder]/review-results.md`. Be terse about what's fine and detailed only about
what `/jli-codes` must act on:
- Lint/type-check: if both pass cleanly, one line each (`lint: clean`, `type-check: clean`).
  If either fails, its full output in a fenced block.
- Checklist: list only the items with findings, each with the concrete file/line and what's
  wrong. Collapse every passing item into a single closing line (`All other checklist items
  ✓`) — do not restate what is correct or already compliant.
- No summary section.
- End with `status: approved` as the last line. If any finding exists, use
  `status: changes requested` instead. The status line is always last.

If you hit the 3-failing-shell-command limit, record the error output and end the file with
`status: changes requested`.

## Next

- If `status: changes requested`:
  > Review found issues (see `review-results.md` in the task folder). Run
  > `/jli-commits @<task-folder>` to record the review, then `/jli-codes @<task-folder>` to
  > address the findings, then `/jli-reviews-code @<task-folder>` again.
- If `status: approved`:
  > Review approved. Run `/jli-commits @<task-folder>`, then (optionally `/clear` and)
  > `/jli-writes-tests @<task-folder>` to write the `.spec.ts` files.
