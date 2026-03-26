Run the full Vitest test suite using the exact commands below. Always `cd [worktree]` first — the bare repo root has no `node_modules`.

## Step 1 — Failure details (structured JSON)

```bash
cd [worktree] && npx vitest run --reporter=json 2>/dev/null | jq '{
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

## Step 2 — Summary (human-readable)

```bash
cd [worktree] && npx vitest run --reporter=json 2>/dev/null | jq -r '
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

Never use `npm test`, `npm run test`, `rtk vitest run`, or any other form.
