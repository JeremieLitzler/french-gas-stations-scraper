# Business Specifications: Bump Vitest and Vitest UI to v4.1.2

## Goal and Scope

Align the test-tooling dependencies `vitest` and `@vitest/ui` on version `4.1.2`, matching
the already-bumped `@vitest/coverage-v8` (see recent commit history). Scope is limited to
dependency version alignment and verifying the existing test suite still passes under the
new versions — no test behavior, test conventions (ADR-005), or application code changes.

## Example Mapping

**Rule:** `vitest` and `@vitest/ui` are declared at `4.1.2` in `package.json`, consistent
with `@vitest/coverage-v8`, and the lockfile (`package-lock.json`) reflects the resolved
install.
- Example: after the bump, `npm run test`, `npm run test:ui`, and `npm run test:coverage`
  all resolve to matching `4.1.2`-family packages with no version-mismatch warning.

**Rule:** The full existing test suite (unit tests under `src/` and `netlify/functions/`)
passes unchanged after the bump, with no drop in coverage against the targets already
defined in `CLAUDE.md` (Composables/Utils 100%, Components 80%+).
- Edge case: if `4.1.2` introduces a breaking change affecting any existing test or
  coverage threshold, the bump must not be merged silently — the breaking behavior and the
  affected test(s) must be reported for a decision before proceeding.

**Rule:** No other dependency, script, or configuration (`vite.config.ts`, `vitest`
workspace/config blocks) is modified beyond what the version bump itself requires.
- Edge case: if `4.1.2` requires a configuration change to keep the suite passing (e.g. a
  renamed option), that change is the minimum needed to restore parity — not an opportunity
  to adopt new `4.1.2` features.

## Files

- `package.json` — declares the target versions for `vitest` and `@vitest/ui`.
- `package-lock.json` — records the resolved dependency tree after install.

## Out of Scope

- Adopting any new Vitest 4.1.2 feature or API.
- Changing test file structure, naming, or coverage targets.

status: ready
