# ADR-013: Page-Level Load Orchestrator for Shared Singleton State Under Async Mutation

**Date:** 2026-07-21
**Status:** Accepted

## Context

ADR-009 establishes that singleton composables must not call each other internally — a
component orchestrates them, imperatively, at the top of its own `setup()`. That ADR's
"Negative" section already anticipated a gap: *"Adding a second component that also needs
to react to station list changes would require duplicating the watch logic or extracting
it into a shared utility."*

Issue #64/#85 hit exactly that gap. `index.vue` renders two sibling components —
`StationPricesContent.vue` and `StationManagerTable.vue` — that both read the same
`useStationStorage` singleton (`stations`, ADR-002). Only one of them also triggered
`useRemotePreferencesSync().syncOnLoad()`, a network call that can replace `stations` after
mount. The other sibling's local-only load resolved first and rendered, so it could show
stale/local data indefinitely if the sync was slow, failed, or ran after render — a race
condition, not a rendering bug (`spec-review.md`, sub-issue-85, Finding 2).

Three options were weighed:

1. **Centralize** the whole load sequence (auth, repo config, stations, default fuel type,
   remote sync) into one new top-level component, and gate a page-level `<Suspense>` around
   it so sibling feature components don't mount until the sequence resolves.
2. **Duplicate** the sync call into the second sibling — smaller diff, but both siblings
   could independently fetch and attempt to replace the shared state concurrently.
3. **Shared "sync settled" flag** — a new synchronization primitive that the second sibling
   awaits, while the first stays the sole trigger.

At the time of writing, `index.vue` is the only page in this codebase where two or more
sibling components share a singleton that an async operation can mutate after mount;
`settings.vue` and `mentions-legales.vue` don't have this shape. The rule below is stated
generally because the failure mode is structural (any page with this shape will reproduce
the race), not because a second instance already exists.

## Decision

Whenever two or more sibling components under the same page read the same singleton
composable state (ADR-002) that an async operation can replace after mount, centralize the
entire load sequence into one top-level component and gate the page's sibling feature
components behind a page-level `<Suspense>` boundary keyed to that component, rather than
having each sibling trigger its own loaders (option 2) or coordinating through a new shared
flag (option 3).

This is an extension of ADR-009, not a replacement: the orchestrating component still calls
composables imperatively at the top of its own `setup()`, per ADR-009's rule. What's new is
*where* that orchestration lives when multiple siblings depend on the same mutable singleton
— above them, gating their mount, instead of duplicated or flag-coordinated at each leaf.

In this feature, `HomePageContent.vue` is that orchestrator: it resolves auth state, repo
config, the station list, the default fuel type, and the remote sync once, and
`index.vue` wraps it in `<Suspense>` (fallback: `AppLoader`) instead of mounting
`StationPrices`/`StationManager` directly.

## Consequences

### Positive

- The race is structurally impossible, not merely handled: sibling components don't exist
  in the DOM until the orchestrator's `<Suspense>` boundary resolves, so neither can render
  pre-sync data.
- Exactly one network call per page load instead of a possible duplicate (option 2's risk).
- One failure point for the load sequence instead of N independent ones, which simplifies
  reasoning about error states.
- No new synchronization primitive is introduced (avoids option 3's added complexity).

### Negative

- The orchestrating component takes on more responsibility than any single sibling had
  before — it must call every composable's loaders/setters that the siblings collectively
  need, including ones a sibling only used to trigger a merge/rollback it no longer owns.
- Every sibling feature component under that page is now blocked from rendering until the
  entire shared load sequence resolves, even the parts of the sequence a given sibling
  doesn't itself depend on.
- Currently validated against a single page (`index.vue`) with exactly two affected
  siblings; applying this rule to a page with more siblings or a longer load sequence has
  not been exercised yet.

## Alternatives Considered

1. **Duplicate the sync call into the second sibling.** Rejected: both siblings would
   independently fetch from the remote and could both attempt a rollback/replace of the
   shared singleton concurrently.
2. **Shared "sync settled" flag in the sync composable.** Rejected: adds a new
   synchronization primitive, and the second sibling would still depend on the first
   sibling mounting and succeeding at all — the flag doesn't remove the coupling, it just
   relocates it.

## Notes

- Applies whenever a page has two or more sibling components reading the same ADR-002
  singleton that an async operation (not limited to remote sync — any post-mount mutation)
  can change. It does not apply to a single component with its own async load, nor to
  siblings that don't share mutable singleton state.
- Extends [ADR-009](./ADR-009-cross-composable-reactivity-pattern.md); read together, not as
  a replacement.

## References

- [ADR-002: Singleton Composable for Shared State](./adr-002-state-management.md)
- [ADR-009: Cross-Composable Reactivity Pattern](./ADR-009-cross-composable-reactivity-pattern.md)
- [ADR-012: User-Owned GitHub Repository as Remote Sync Backend](./ADR-012-github-repo-as-sync-backend.md)
