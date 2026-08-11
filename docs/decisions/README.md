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
| [ADR-004](./adr-004-semantic-release.md)                           | Semantic Release for Versioning              | Superseded by ADR-015 | 2026-02-11 |
| [ADR-005](./adr-005-testing-strategy.md)                           | Testing Strategy with Vitest                 | Accepted | 2026-02-12 |
| [ADR-006](./ADR-006-netlify-functions-for-cors-proxy.md)           | Netlify Functions for CORS-Free HTML Fetching | Accepted | 2026-02-13 |
| [ADR-007](./ADR-007-html-sanitization-for-vhtml.md)               | HTML Sanitization Strategy for v-html Rendering | Accepted | 2026-03-03 |
| [ADR-008](./ADR-008-client-side-storage.md)                       | IndexedDB Over localStorage for Client-Side Persistence | Accepted | 2026-03-04 |
| [ADR-009](./ADR-009-cross-composable-reactivity-pattern.md)       | Cross-Composable Reactivity Pattern                     | Accepted | 2026-03-18 |
| [ADR-010](./ADR-010-markdown-runtime-parsing.md)                  | Static Content Rendering Strategy for the Mentions Légales Page | Accepted | 2026-03-20 |
| [ADR-011](./ADR-011-github-oauth-app-auth.md)                     | GitHub OAuth App Authentication via Netlify Functions with HTTP-Only Cookie | Accepted | 2026-04-30 |
| [ADR-012](./ADR-012-github-repo-as-sync-backend.md)               | User-Owned GitHub Repository as Remote Sync Backend             | Accepted | 2026-04-30 |
| [ADR-013](./ADR-013-page-level-load-orchestrator.md)              | Page-Level Load Orchestrator for Shared Singleton State Under Async Mutation | Accepted | 2026-07-21 |
| [ADR-014](./ADR-014-scheduled-function-pat-auth.md)               | Scheduled Netlify Function with Fine-Grained PAT for Daily Price History     | Proposed | 2026-07-23 |
| [ADR-015](./ADR-015-bash-script-release-workflow.md)              | Bash Script (`release.sh`) as a Second Release Workflow                     | Accepted | 2026-08-11 |

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
