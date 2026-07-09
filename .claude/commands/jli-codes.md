Implement the feature. Task folder: $ARGUMENTS

`$ARGUMENTS` is the task folder, given as a `@`-mention relative to the worktree root you
opened (e.g. `@docs/prompts/tasks/issue-<id>-<slug>`). If it is empty, stop and reply:

> Usage: `/jli-codes @<task-folder>` — open the feature worktree (`code <worktree>`) first,
> then pass the task folder relative to it.

Run from the worktree root (your current directory). All file paths are relative to it —
never read or write outside this worktree.

## What this command does

Read `[task-folder]/business-specifications.md`, `[task-folder]/security-guidelines.md`, and
`[task-folder]/test-cases.md`. Implement exactly what the business spec describes, enforce
every security rule, and make every scenario in `test-cases.md` satisfiable.

Do NOT write any test files (`.spec.ts` / `.test.ts`) — `/jli-writes-tests-spec` and
`/jli-writes-tests` own all test authoring. Follow the architecture in `CLAUDE.md`. Do not add
features beyond the spec.

If `[task-folder]/review-results.md` ends with `status: changes requested`, or
`[task-folder]/test-results.md` ends with `status: failed`, read that feedback first and fix
accordingly (this command is being re-run in a loop-back).

## Object Calisthenics (apply all nine)

1. One level of indentation per method — extract inner blocks.
2. Do not use `else` — use early returns / guard clauses.
3. Wrap primitives and strings in domain types when they carry meaning (a URL, a status code).
4. First-class collections — a class holding a collection holds nothing else.
5. One dot per line — break `a.b.c` chains.
6. No abbreviations in names — `usr`→`user`, `cnt`→`count`, `req`→`request`.
7. Keep entities small — methods ≤5 lines, classes ≤50 lines, packages ≤10 files.
8. No more than two instance variables per class.
9. No getters/setters — tell objects what to do.

Where strict compliance conflicts with framework conventions (Vue lifecycle hooks, `useXxx`
composables), document the exception in the technical-choices section.

## Composable caller responsibility

Composables must never self-trigger data fetching on init — the caller component invokes
fetch actions. Never call a composable inside a plain/async function within another
composable; composables are called only at the top level of `setup()`. If one composable
needs another's data, the component calls both in `setup()` and passes the data in.

## Output: `technical-specifications.md`

Write `[task-folder]/technical-specifications.md`:
- A summary of every file created or changed, one line each.
- For every non-trivial decision (one a reasonable engineer could make differently — choice
  of data structure, helper vs inline, error-handling strategy, splitting responsibilities),
  a one-to-two sentence explanation of WHY.

If the implementation introduces an architectural decision not yet in `docs/decisions/`, add
before the final status line:

```
### ADR Required

[Description of the architectural decision and why it was made]
```

If you find an incoherence in the specs that makes the test cases unsatisfiable, end with:

```
### Specifications Need Review

Please review current code and results.

status: review specs
```

Otherwise end the file with `status: ready` as the last line.

## Self-code review

After writing the code, identify three potential bugs or performance bottlenecks and fix
them. Do NOT run `npm run test`, `npm run lint`, or `npm run type-check` here — those belong
to `/jli-runs-tests` and `/jli-reviews-code`.

## RTK token optimization

Prefer the Read/Glob/Grep tools. For shell, prefer `rtk ls`, `rtk read <file>`,
`rtk grep <pattern>` (paths relative to the worktree root).

## Shell command retry limit

Do not run more than 3 failing shell commands in total. After 3 failures, stop and report
the full error output to the user.

## Next

- If the file ends `status: review specs`:
  > The specs need review. Run `/jli-writes-spec @<task-folder>` to revise them, re-commit, then
  > return to `/jli-codes @<task-folder>`.
- If the file contains `### ADR Required`:
  > ⚠ This implementation requires a new ADR. Approve it (add under `docs/decisions/`, update
  > the index) before committing, then run `/jli-commits @<task-folder>`.
- Otherwise:
  > Implementation ready. Review `technical-specifications.md` in the task folder, run
  > `/jli-commits @<task-folder>`, then (optionally `/clear` and) `/jli-reviews-code @<task-folder>`.
