Run the test suite. Task folder: $ARGUMENTS

`$ARGUMENTS` is the task folder, given as a `@`-mention relative to the worktree root you
opened (e.g. `@docs/prompts/tasks/issue-<id>-<slug>`). If it is empty, stop and reply:

> Usage: `/jli-runs-tests @<task-folder>` — open the feature worktree (`code <worktree>`) first,
> then pass the task folder relative to it.

Run from the worktree root (your current directory) — that is where `node_modules` lives.

## Sub-issue task folders

If the task folder is a `sub-issue-<n>` subfolder, read any shared specs
(`business-specifications.md`, `security-guidelines.md`, `test-cases.md`) from its **parent**
folder and write this command's outputs into the **subfolder**; parse `[id]` from
`issue-<id>-<slug>` or `sub-issue-<id>`. Otherwise it is a flat folder holding everything
(see `AGENT-COMMAND-MIGRATION.md` for the rationale).

## What this command does

Run Vitest in non-watch mode from the worktree using the exact commands below. Do NOT use
`npm test`, `npm run test`, or `rtk vitest run` — this repo standardises on the JSON reporter
piped through `jq` so failures and the summary are token-cheap and machine-readable.

### Step 1 — Failure details (structured JSON)

```bash
npx vitest run --reporter=json 2>/dev/null | jq '{
  failedTests: [
    .testResults[]
    | .name as $file
    | .assertionResults[]
    | select(.status == "failed")
    | {
        file: $file,
        test: .fullName,
        errors: .failureMessages
      }
  ]
}'
```

### Step 2 — Summary (human-readable)

```bash
npx vitest run --reporter=json 2>/dev/null | jq -r '
  (.numTotalTestSuites) as $files |
  (.numPassedTestSuites) as $filesPassed |
  (.numFailedTestSuites) as $filesFailed |
  (.numTotalTests) as $tests |
  (.numPassedTests) as $passed |
  (.numFailedTests) as $failed |
  ((.testResults | map(.endTime - .startTime) | add) / 1000 | round) as $dur |
  if $failed == 0 then
    "\($files) test files, \($tests) tests total - all passed.\n\n- Test files: \($files) passed\n- Tests: \($tests) passed (0 failed)\n- Duration: ~\($dur) seconds"
  else
    "\($files) test files, \($tests) tests total - \($failed) failed.\n\n- Test files: \($filesPassed) passed, \($filesFailed) failed\n- Tests: \($passed) passed (\($failed) failed)\n- Duration: ~\($dur) seconds"
  end
'
```

## Output contract

Write `[task-folder]/test-results.md` using this template:

```markdown
# Test Results — Issue #[id]: [title]

## Test Run

Command: `npx vitest run --reporter=json` (Vitest vX.Y.Z) from the `[worktree name]` worktree.

## Files Run

All those mentioned in [technical specs](technical-specifications.md).

## Results

<if all pass>
All tests passed. No failures.

### Test Summary

[N] test files, [N] tests total — all passed.

- Duration: ~[N] seconds
<else>
### Failures

<each failing test with its file, test name, and error output from Step 1>
<end-if>

status: passed
```

Rules:
- If any test fails, replace the Results section with failure details and replace
  `status: passed` with `status: failed`.
- The status line is always the last line of the file.

## Shell command retry limit

Do not run more than 3 failing shell commands in total. After 3 failures, stop, record the
full error output in `test-results.md`, and end the file with `status: failed`.

## Next

- If `status: failed`:
  > Tests failed (see `test-results.md` in the task folder). Run `/jli-commits @<task-folder>`
  > to record the results, then diagnose the failure: if the code is wrong, fix it with
  > `/jli-codes @<task-folder>`; if the test itself is wrong, correct it with
  > `/jli-writes-tests @<task-folder>`. Then re-run `/jli-reviews-code @<task-folder>` and
  > `/jli-runs-tests @<task-folder>`.
- If `status: passed`:
  > All tests pass. Run `/jli-commits @<task-folder>`, then `/jli-ships @<task-folder>`
  > to push, open the PR, and merge after approval.
