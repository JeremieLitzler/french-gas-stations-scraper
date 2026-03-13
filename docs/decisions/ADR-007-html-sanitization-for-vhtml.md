# ADR-007: HTML Sanitization Strategy for v-html Rendering

**Date:** 2026-03-03
**Status:** Accepted
**Implemented:** 2026-03-09
**Updated:** 2026-03-11 — Extended to document the shared configuration module and fenced-code allowlist (issue #80)

## Context

The Medium page (`PlatformMedium.vue`) renders a live preview of the generated `bodyHtml`
using Vue's `v-html` directive. The content is initially machine-generated (safe), but the
user can edit it in the textarea before copying. Any content fed to `v-html` that contains
`<script>`, event handlers (`onerror`, `onclick`, …), or other active HTML is executed
directly in the browser, creating an XSS risk.

Vue's official documentation explicitly warns: _"Dynamically rendering arbitrary HTML on
your website is very dangerous because it can easily lead to XSS vulnerabilities. Only use
`v-html` on trusted content and never on user-provided content."_

Since the textarea is user-editable, the rendered preview must be sanitized before binding
to `v-html`.

## Decision

Use **DOMPurify** (`dompurify` npm package) to sanitize HTML before binding it to `v-html`.

### Original implementation (issues #1–#79)

DOMPurify was run inside a `computed` property with the default configuration:

```ts
import DOMPurify from 'dompurify'

const sanitizedBodyHtml = computed(() => DOMPurify.sanitize(rawBodyHtml.value))
```

The default DOMPurify configuration strips all active content (`<script>`, inline event
handlers, `javascript:` URLs, `<iframe>`, `<object>`, etc.) while preserving all HTML
structure and styling used in the bodyHtml template (`<figure>`, `<img>`, `<p>`, `<ul>`,
`<li>`, `<h2>`, `<a>`, `<hr>`, `<figcaption>`, `<br>`, `<pre>`, `<blockquote>`, `<span>`).

### Extended implementation: shared configuration module (issue #80)

Issue #80 required allowing the HTML structure produced by the blog engine's fenced-code-block
renderer, which DOMPurify strips by default: `<table>`, `<tr>`, `<td>`, and `<button>`.

The DOMPurify call was moved to a single shared utility module (`src/utils/sanitize.ts`) that
both `PlatformMedium.vue` and `PlatformSubstack.vue` import. The module uses `ADD_TAGS` and
`ADD_ATTR` (not `ALLOWED_TAGS`) to extend the default allowlist rather than replacing it,
preserving all default active-content blocking:

```ts
// src/utils/sanitize.ts
import DOMPurify from 'dompurify'

const SANITIZE_CONFIG: DOMPurify.Config = {
  ADD_TAGS: ['table', 'tr', 'td', 'button'],
  ADD_ATTR: ['tabindex', 'data-lang'],
}

export function sanitizeBodyHtml(rawHtml: string): string {
  return DOMPurify.sanitize(rawHtml, SANITIZE_CONFIG)
}
```

**Governance rules for future allowlist changes:**

1. The allowlist may only be extended when a concrete structural requirement from an observed
   blog output is present, not speculatively. Each added tag or attribute must be traceable to
   a live article fixture stored under `tests/fixtures/`.
2. Any future allowlist change must be accompanied by a corresponding non-regression test that
   asserts the newly permitted structure is preserved and that active content is still blocked.
3. `style` attributes and `<style>` tags must never be added to the allowlist; `class` is
   already permitted by DOMPurify defaults and is safe as a presentation-only attribute.
4. The configuration must remain in `src/utils/sanitize.ts` (single source of truth). Both
   platform components import from that module; inline duplication is not permitted.

The Copy button for Body HTML uses the **Clipboard API** (`navigator.clipboard.write`) with
a `ClipboardItem` of type `text/html`, so that pasting into a rich-text editor (such as
Medium's) preserves the rendered structure. A `text/plain` fallback is provided for
environments where `ClipboardItem` is unavailable.

## Consequences

### Positive

- Eliminates XSS risk from user-edited HTML rendered via `v-html`
- DOMPurify is purpose-built, battle-tested, and actively maintained
- `ADD_TAGS`/`ADD_ATTR` extension preserves the full default active-content barrier while
  allowing only the minimal structural tags required by the blog's fenced-code renderer
- Single shared configuration module (`src/utils/sanitize.ts`) prevents configuration drift
  between `PlatformMedium.vue` and `PlatformSubstack.vue`
- Governance rules in this ADR make future allowlist expansion auditable and test-gated
- The `text/html` clipboard format allows pasting formatted content directly into Medium's
  visual editor without manual reformatting

### Negative

- Adds a runtime dependency (`dompurify` + `@types/dompurify`)
- DOMPurify relies on a live DOM, so it cannot be used in SSR (not applicable here — the
  app is a pure client-side SPA deployed on Netlify)
- The `ADD_TAGS` allowlist for `<table>`, `<tr>`, `<td>`, `<button>` is broader than the
  absolute minimum needed for inline code; however each tag is traceable to the blog engine's
  observed HTML output and the set is minimal relative to that output

## Alternatives Considered

- **No sanitization**: Acceptable only if the textarea were read-only. Since it is editable,
  this is rejected.
- **Custom allowlist regex**: Fragile and historically error-prone. DOMPurify is maintained
  by browser security specialists; a hand-rolled approach would not be.
- **`<iframe sandbox>`**: Isolates rendering but makes clipboard access significantly more
  complex and prevents styling inheritance. Rejected for this use case.
- **Trusted Types API**: Complementary browser-level defence, not a replacement for
  sanitization. Could be added later as a defence-in-depth measure.

## Notes

- Applies to `PlatformMedium.vue` and `PlatformSubstack.vue`, both of which render `bodyHtml`
  via `v-html` using the same DOMPurify computed property pattern.
- If `v-html` is introduced in other components in the future, the same DOMPurify pattern
  must be applied.
