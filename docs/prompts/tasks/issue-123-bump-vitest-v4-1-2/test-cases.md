# Test Cases: Bump Vitest and Vitest UI to v4.1.2

This is a dependency-version bump with no new or changed runtime behaviour in the
application. No new `.spec.ts` files are written for this task.

Verification: running the existing full test suite (`npm run test`, `npm run test:ui`,
`npm run test:coverage`) after the bump must succeed with the same pass/fail outcome and
the same coverage results as before the bump (composables/utils at 100%, components at
80%+, per `CLAUDE.md`). No runtime tests — verified by re-running the existing suite.

status: ready
