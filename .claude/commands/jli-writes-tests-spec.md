Write the plain-language test cases for a feature. Task folder: $ARGUMENTS

`$ARGUMENTS` is the task folder, given as a `@`-mention relative to the worktree root you
opened (e.g. `@docs/prompts/tasks/issue-<id>-<slug>`). If it is empty, stop and reply:

> Usage: `/jli-writes-tests-spec @<task-folder>` — open the feature worktree
> (`code <worktree>`) first, then pass the task folder relative to it.

Run from the worktree root (your current directory). All paths below are relative to it; read
and write only inside this worktree.

## What this command does

This is the **before-coding** test pass. It writes `[task-folder]/test-cases.md` — the
plain-language scenarios the implementer must satisfy. The executable `.spec.ts` files come
later, from `/jli-writes-tests` once the code exists.

Read `[task-folder]/business-specifications.md` and `[task-folder]/security-guidelines.md`.

Write `[task-folder]/test-cases.md` — plain-language scenarios only. No TypeScript, no
imports, no function names. Each scenario states: the input/precondition, the action, and
the expected observable outcome.

Cover every happy path, every edge case mentioned or implied, and every error/failure
condition. Write against observable behaviour only — never reference implementation details.

If the spec describes a structural/cleanup task with no runtime-observable behaviour
(e.g. deleting files, renaming types), do not invent test cases; add the note:
"No runtime tests — verified by `vue-tsc`."

## Output contract

Create `[task-folder]/test-cases.md`. End it with `status: ready` as the last line. Write each
prose paragraph as a single unwrapped line — no manual line breaks mid-paragraph; let the
renderer soft-wrap.

## Shell command retry limit

Do not run more than 3 failing shell commands in total. After 3 failures, stop and report
the full error output to the user.

## Next

> Test cases ready. Run `/jli-commits @<task-folder>`, then (optionally `/clear` and)
> `/jli-codes @<task-folder>` to implement.
