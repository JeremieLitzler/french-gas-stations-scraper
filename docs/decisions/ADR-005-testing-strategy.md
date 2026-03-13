# ADR-005: Testing Strategy with Vitest

**Date:** 2026-02-12
**Status:** Accepted

## Context

The application needs a testing strategy to ensure reliability and maintainability.
No testing framework was included in the initial boilerplate cleanup.

Key requirements:
- Test Vue 3 composables (e.g., `useArticleState`)
- Test utility functions (e.g., UTM generation, HTML extraction)
- Test Vue components when implemented
- Fast test execution for rapid feedback
- TypeScript support
- Integration with Vite build system

## Decision

Use **Vitest** as the primary testing framework with **@vue/test-utils** for component testing.

**Test infrastructure:**
- `vitest` — Test runner and assertion library
- `@vue/test-utils` — Vue component testing utilities
- `happy-dom` — Lightweight DOM implementation (faster than jsdom)
- `@vitest/ui` — Optional UI for test visualization

**Test organization:**
- Co-locate test files next to source files
- Naming convention: `*.test.ts` for all tests
- Example: `useArticleState.ts` → `useArticleState.test.ts`

**Test coverage targets:**
- Composables: 100% (critical state management)
- Utils: 100% (pure functions, easy to test)
- Components: 80%+ (focus on logic, not styling)

## Consequences

### Positive

- Native Vite integration — no additional build configuration
- Fast execution with native ESM support
- Compatible with existing TypeScript setup
- Same configuration API as Jest — familiar to developers
- Built-in coverage reporting with c8
- Watch mode for TDD workflow
- happy-dom is lighter and faster than jsdom

### Negative

- Newer ecosystem than Jest — fewer community examples
- Some Vue testing patterns still reference Jest
- happy-dom may have minor DOM API incompleteness (rare edge cases)

## Alternatives Considered

- **Jest**: More mature ecosystem, but requires additional Vite/ESM configuration (babel-jest, ts-jest). Slower than Vitest.
- **No testing**: Not acceptable for production application with business logic
- **jsdom instead of happy-dom**: More complete DOM implementation but heavier and slower

## Notes

- Start with unit tests for composables and utils
- Add component tests after UI implementation
- Run tests in CI/CD pipeline before merging
- Consider adding visual regression tests later (Playwright/Cypress)
