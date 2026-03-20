# Security Guidelines — Issue #50: Rework UX / UI

## Rules

**1. Always pipe `marked` output through `sanitizeHtml` before binding to `v-html`**
- Where: `src/utils/markdownParser.ts` and `src/pages/mentions-legales.vue`
- Why: `marked` produces raw HTML from Markdown; without sanitization, any injected script or event-handler attribute in the source file would be executed in the browser (XSS). ADR-007 mandates DOMPurify via `sanitizeHtml` for all `v-html` bindings.

**2. Import the Markdown asset as a static bundle string, not via a runtime fetch**
- Where: `src/pages/mentions-legales.vue` (import with Vite `?raw` suffix)
- Why: A fetch to a relative or absolute URL at runtime introduces a network dependency and a potential open-redirect or content-injection vector if the URL is ever controlled by user input. A bundled `?raw` import is resolved at build time and cannot be tampered with at runtime.

**3. Do not expose the raw Markdown string to the DOM or to user-controlled input**
- Where: `src/pages/mentions-legales.vue`
- Why: Even though the asset is static and trusted, binding the raw Markdown string directly to `innerHTML` (bypassing `sanitizeHtml`) would silently break ADR-007 governance and could allow future content edits to introduce XSS payloads undetected.

**4. The `markdownParser` utility must remain a pure function with no side effects**
- Where: `src/utils/markdownParser.ts`
- Why: Side effects (network calls, DOM writes, event listeners) inside the parser would make it impossible to sandbox in tests and could open vectors for persistent XSS or SSRF in a future SSR context.

**5. External links rendered from Markdown must open with `rel="noopener noreferrer"`**
- Where: Post-parse output rendered in `src/pages/mentions-legales.vue`
- Why: `target="_blank"` links without `rel="noopener noreferrer"` allow the opened page to navigate the opener via `window.opener`, enabling tab-napping attacks. Apply this either via a DOMPurify hook (`ADD_ATTR: ['target']` + a post-sanitize DOM walk) or via a `marked` renderer override.

status: ready
