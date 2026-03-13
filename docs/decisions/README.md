# Architecture Decision Records

This directory contains ADRs (Architecture Decision Records) for the project.
Each ADR documents a significant technical decision, its context, and consequences.

## Format

Filename: `adr-XXX-short-title.md`
Status values: `Proposed` | `Accepted` | `Deprecated` | `Superseded by ADR-XXX`

## Index

| ADR                                                                | Title                                        | Status   | Date       |
| ------------------------------------------------------------------ | -------------------------------------------- | -------- | ---------- |
| [ADR-001](./adr-001-vue3-framework.md)                             | Vue 3 as Frontend Framework                  | Accepted | 2026-02-11 |
| [ADR-002](./adr-002-state-management.md)                           | Singleton Composable for Shared State        | Accepted | 2026-02-11 |
| [ADR-003](./adr-003-ui-layer.md)                                   | Tailwind CSS v4 + shadcn-vue for UI          | Accepted | 2026-02-11 |
| [ADR-004](./adr-004-semantic-release.md)                           | Semantic Release for Versioning              | Accepted | 2026-02-11 |
| [ADR-005](./adr-005-testing-strategy.md)                           | Testing Strategy with Vitest                 | Accepted | 2026-02-12 |
| [ADR-006](./ADR-006-netlify-functions-for-cors-proxy.md)           | Netlify Functions for CORS-Free HTML Fetching | Proposed | 2026-02-13 |
| [ADR-007](./ADR-007-html-sanitization-for-vhtml.md)               | HTML Sanitization Strategy for v-html Rendering | Proposed | 2026-03-03 |
| [ADR-008](./ADR-008-client-side-storage.md)                       | IndexedDB Over localStorage for Client-Side Persistence | Accepted | 2026-03-04 |

## How to Add a New ADR

1. Copy the template below
2. Number sequentially (ADR-005, ADR-006, etc.)
3. Add a row to the index above
4. Commit alongside the code change it documents

## Template

```markdown
# ADR-XXX: [Title]

**Date:** YYYY-MM-DD
**Status:** Proposed

## Context

## Decision

## Consequences

### Positive

### Negative

## Alternatives Considered

## Notes
```
