# ADR-002: Singleton Composable for Shared State

**Date:** 2026-02-11
**Status:** Accepted

## Context

The app needs to share extracted article data across multiple components
(X, LinkedIn, Medium, Substack sections all read from the same extraction).

Pinia was included in the boilerplate template but was used there for
Supabase auth and database and multi-page error management — neither of which apply here.

## Decision

Use a singleton composable pattern for shared article state.

A module-level `ref()` is declared **outside** the composable function,
making it shared across all consumers without needing a store.

Example pattern:

```ts
// composables/useArticleState.ts
const article = ref<Article | null>(null)

export function useArticleState() {
  return { article }
}
```

## Consequences

### Positive

- No additional dependency (Pinia removed)
- Idiomatic Vue 3 Composition API pattern
- Simple to understand and test
- Sufficient for a single-page app with no persistence needs

### Negative

- No devtools integration (Pinia gives Vue devtools visibility)
- Module-level state persists for the lifetime of the page
  (acceptable here, since that is the desired behavior)
- Does not scale well if state complexity grows significantly

## Alternatives Considered

- **Pinia**: Already installed but overkill for a single shared state object
  on a single-page app with no auth or server sync
- **Prop drilling**: Too verbose given the number of platform components
  all needing the same article data
- **Provide/Inject**: Valid but less explicit than a named composable

## Notes

- Pinia is removed from dependencies as part of TR-1 codebase cleanup
- If state complexity grows, migrating to Pinia is straightforward
