Write the executable test files for a feature. Task folder: $ARGUMENTS

`$ARGUMENTS` is the task folder, given as a `@`-mention relative to the worktree root you
opened (e.g. `@docs/prompts/tasks/issue-<id>-<slug>`). If it is empty, stop and reply:

> Usage: `/jli-writes-tests @<task-folder>` — open the feature worktree
> (`code <worktree>`) first, then pass the task folder relative to it.

Run from the worktree root (your current directory). All paths below are relative to it; read
and write only inside this worktree.

## What this command does

This is the **after-coding** test pass. It turns the plain-language scenarios from
`/jli-writes-tests-spec` into executable Vitest `.spec.ts` files, now that the implementation
exists.

Read `[task-folder]/test-cases.md` and `[task-folder]/technical-specifications.md` (which
lists every file the implementer created or changed). Read each listed implementation file
to learn the exported API (function/composable/component names and paths).

Translate each scenario in `test-cases.md` into a Vitest `.spec.ts` test. Place test files
alongside source files or in `src/__tests__/`, following existing conventions. Import only
from paths confirmed to exist in the implementation files.

If `[task-folder]/test-results.md` ends with `status: failed` and the failure is a wrong
assertion rather than a code bug, read it first and correct the offending `.spec.ts` (this
command is being re-run in a loop-back from `/jli-runs-tests`).

Do NOT:
- write tests for scenarios not in `test-cases.md`
- write `@ts-expect-error` tests, or tests whose only assertion is `toBeDefined()` on a
  value that cannot be undefined by construction (type correctness is `vue-tsc`'s job)
- assert presence/absence of files on disk or duplicate what `vue-tsc --build` catches
- use `node:fs`, `node:path`, or `__dirname`. The env is browser-like (happy-dom); load
  fixtures with Vite's `?raw` suffix:
  ```ts
  import fixtureHtml from '../../tests/fixtures/MY-FIXTURE.html?raw'
  ```

End your report with `status: ready`.

## Shell command retry limit

Do not run more than 3 failing shell commands in total. After 3 failures, stop and report
the full error output to the user.

## Next

> Test files written. Run `/jli-commits @<task-folder>`, then (optionally `/clear` and)
> `/jli-runs-tests @<task-folder>` to run the suite.
