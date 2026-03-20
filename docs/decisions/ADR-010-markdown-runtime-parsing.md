# ADR-010: Runtime Markdown Parsing for Static Content Pages

> **Status: Superseded.** Inline HTML was chosen instead to avoid a runtime dependency and to allow direct Tailwind class application.

**Date:** 2026-03-20
**Status:** Superseded

## Context

Issue #50 requires a "Mentions légales" page whose content is maintained as a Markdown file (`src/assets/mentions-légales.md`). The content must be rendered as HTML in the Vue SPA.

Three approaches were considered: ship pre-compiled HTML, use a CMS/remote fetch, or parse the Markdown at runtime in the browser from a bundled static asset.

This is the first time the project renders Markdown content, so a decision is needed to capture the chosen approach, the library selection, and how it integrates with the existing sanitization strategy (ADR-007).

## Decision

Use **`marked`** to parse the `.md` asset at runtime in the browser, and pipe the resulting HTML through the existing `sanitizeHtml` utility from `src/utils/sanitize.ts` (DOMPurify, per ADR-007) before binding it to `v-html`.

A pure utility function `src/utils/markdownParser.ts` wraps the full parse-then-sanitize pipeline:

```ts
// src/utils/markdownParser.ts
import { marked } from 'marked'
import { sanitizeHtml } from './sanitize'

export async function parseMarkdown(markdown: string): Promise<string> {
  const rawHtml = await marked(markdown)
  return sanitizeHtml(rawHtml)
}
```

The Markdown source is imported as a raw string via Vite's `?raw` suffix and passed to `parseMarkdown` inside the component's `onMounted` hook (or a `computed`/`watchEffect` equivalent). No server-side rendering is involved.

## Consequences

### Positive

- Content stays in a human-readable `.md` file — easy to update without touching Vue components.
- `marked` is lightweight, well-maintained, and produces standard HTML.
- Piping through `sanitizeHtml` (DOMPurify) keeps the XSS protection established in ADR-007; no new security surface is introduced.
- No network request at runtime — the asset is bundled with the SPA.
- Straightforward testability: `parseMarkdown` is a pure async function with no Vue dependencies.

### Negative

- Adds `marked` as a new runtime dependency.
- Runtime parsing adds a negligible CPU cost at page load (acceptable for a small static document).
- Vite's `?raw` import is a build-tool convention; future bundler changes may require updating import syntax.

## Alternatives Considered

- **Pre-compiled HTML (`.html` asset):** Content would need manual re-compilation whenever the Markdown changes, increasing maintenance friction and risk of desync. Rejected.
- **CMS or remote fetch:** Adds a network dependency and latency for a static, infrequently-changing legal page. Overly complex. Rejected.
- **`markdown-it` instead of `marked`:** Also a valid choice. `marked` was selected because it is more widely used in the Vue ecosystem, has a simpler async API, and has no harder dependencies.
- **Inline HTML in the Vue component:** Mixes content and presentation, making future legal text updates harder for non-developers. Rejected.

## Notes

- Any future Markdown-rendered page must use the same `parseMarkdown` utility and must not bind raw `marked` output directly to `v-html`.
- If the Markdown content requires additional HTML tags beyond DOMPurify's defaults, follow the governance rules in ADR-007 (add to `ADD_TAGS`/`ADD_ATTR`, backed by a test fixture).
