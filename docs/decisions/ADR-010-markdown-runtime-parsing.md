# ADR-010: Static Content Rendering Strategy for the Mentions Légales Page

**Date:** 2026-03-20
**Status:** Accepted

## Context

Issue #50 required a "Mentions légales" page displaying static legal content in the Vue SPA. Two rendering approaches were evaluated:

1. **Runtime Markdown parsing** — store content as a `.md` asset, import it via Vite's `?raw` suffix, parse it with `marked` at page load, sanitize the output with DOMPurify, and bind it to `v-html`.
2. **Inline HTML in the Vue template** — write the legal content directly as HTML inside the `<template>` block, applying Tailwind utility classes directly to each element.

The first approach was initially proposed and documented as "use `marked`". During implementation it was superseded by the second approach.

## Decision

Use **inline HTML hardcoded in the Vue template** (`src/pages/mentions-legales.vue`) with Tailwind utility classes applied directly to HTML elements. No runtime Markdown parsing. No `marked` dependency.

## Rationale

- **No runtime dependency**: `marked` would have been an additional runtime package that adds bundle weight for a page whose content virtually never changes.
- **Direct Tailwind class application**: Headings, links, and lists receive their Tailwind classes inline without workarounds (e.g. no need for `@apply` or a custom `marked` renderer override).
- **Simplicity**: The component has no async logic, no `onMounted` hook, and no reactive state — it is a pure, stateless template.
- **Acceptable maintenance cost**: Legal text rarely changes. When it does, editing HTML in a Vue file is straightforward for any engineer on the project.

## Consequences

### Positive

- Zero runtime dependency added.
- No XSS risk from `v-html` binding (content is static, not user-supplied).
- No sanitization step needed (DOMPurify is not required for this page).
- Simpler component: no script block, no imports, no async lifecycle hooks.

### Negative

- Content must be edited as HTML, not Markdown — less ergonomic for non-developers.
- No CMS or Markdown workflow is available for this page.
- Future static content pages would need a separate decision if they require a more maintainable authoring format.

## Alternatives Considered

- **`marked` + DOMPurify (original proposal)**: Adds a runtime dependency and async logic for content that is truly static. Rejected in favour of simplicity.
- **Pre-compiled HTML asset**: Would require a manual compilation step on every content update. Rejected.
- **CMS or remote fetch**: Overly complex for a small, rarely-changing legal page. Rejected.
