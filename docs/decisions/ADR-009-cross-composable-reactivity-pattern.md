# ADR-009: Cross-Composable Reactivity Pattern

**Date:** 2026-03-18
**Status:** Accepted

## Context

ADR-002 establishes the singleton composable pattern (module-level `ref()`) for shared state,
but does not define how one composable reacts to changes in another composable's reactive state.

Issue #31 requires the Price Table to update whenever the Station List changes. This means
`useStationPrices` must somehow respond to mutations in `useStationStorage`. Two patterns
were considered:

- **Declarative (reactive-chain)**: `useStationPrices` imports and `watch()`es `useStationStorage`'s
  reactive state internally. The price table updates automatically without the component calling
  any method. The component only reads derived state.
- **Imperative (event-driven)**: The component (`StationPricesContent.vue`) watches the station
  list itself and explicitly calls `useStationPrices` operations (add, remove, update) in response
  to changes. Composables remain decoupled from each other.

## Decision

Use the **Imperative pattern**: the component is responsible for observing station list changes
and explicitly calling the appropriate `useStationPrices` operations.

Composables must not call other composables inside functions — only at the top of `setup()`
(see CLAUDE.md Composable Caller Responsibility). The declarative pattern would require
`useStationPrices` to call `useStationStorage` internally, which violates this rule.

## Consequences

### Positive

- Composables remain fully decoupled and independently testable
- Data flow is explicit and traceable in the component
- Aligns with the Composable Caller Responsibility rule in CLAUDE.md
- Easier to reason about which component drives which side effect

### Negative

- The component bears more orchestration responsibility
- Adding a second component that also needs to react to station list changes would require
  duplicating the watch logic or extracting it into a shared utility

## Alternatives Considered

- **Declarative pattern**: `useStationPrices` internally watches `useStationStorage`. Rejected
  because it violates the composable nesting rule (composables must not call other composables
  inside functions) and creates hidden coupling between composables.

## Notes

- This pattern applies any time two singleton composables need to interact: always mediate
  through a component, never through composable-to-composable imports inside functions.
