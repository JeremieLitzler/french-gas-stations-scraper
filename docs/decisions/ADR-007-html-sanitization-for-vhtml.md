# ADR-007: HTML Sanitization Strategy for v-html Rendering

**Date:** 2026-03-03
**Status:** Accepted
**Implemented:** 2026-03-09

## Context

Any Vue component that renders externally-sourced or user-editable HTML via the `v-html` directive is vulnerable to XSS. Content fed to `v-html` that contains `<script>`, event handlers (`onerror`, `onclick`, …), or other active HTML is executed directly in the browser.

Vue's official documentation explicitly warns: _"Dynamically rendering arbitrary HTML on your website is very dangerous because it can easily lead to XSS vulnerabilities. Only use `v-html` on trusted content and never on user-provided content."_

Any component in this project that uses `v-html` must sanitize its input before binding.

## Decision

Use **DOMPurify** (`dompurify` npm package) to sanitize HTML before binding it to `v-html`.

DOMPurify is run inside a `computed` property. The call is centralised in a shared utility module (`src/utils/sanitize.ts`) so all components import from one source of truth:

```ts
// src/utils/sanitize.ts
import DOMPurify from 'dompurify'

export function sanitizeHtml(rawHtml: string): string {
  return DOMPurify.sanitize(rawHtml)
}
```

When a feature requires allowing additional HTML tags beyond DOMPurify's defaults, use `ADD_TAGS` and `ADD_ATTR` (not `ALLOWED_TAGS`) to extend the allowlist rather than replacing it, preserving all default active-content blocking.

**Governance rules for future allowlist changes:**

1. The allowlist may only be extended when a concrete structural requirement from observed source HTML is present, not speculatively. Each added tag or attribute must be traceable to a fixture stored under `tests/fixtures/`.
2. Any future allowlist change must be accompanied by a corresponding non-regression test that asserts the newly permitted structure is preserved and that active content is still blocked.
3. `style` attributes and `<style>` tags must never be added to the allowlist; `class` is already permitted by DOMPurify defaults and is safe as a presentation-only attribute.
4. The configuration must remain in `src/utils/sanitize.ts` (single source of truth); inline duplication is not permitted.

## Consequences

### Positive

- Eliminates XSS risk from HTML rendered via `v-html`
- DOMPurify is purpose-built, battle-tested, and actively maintained
- `ADD_TAGS`/`ADD_ATTR` extension preserves the full default active-content barrier
- Single shared configuration module prevents configuration drift
- Governance rules make future allowlist expansion auditable and test-gated

### Negative

- Adds a runtime dependency (`dompurify` + `@types/dompurify`)
- DOMPurify relies on a live DOM, so it cannot be used in SSR (not applicable here — the app is a pure client-side SPA deployed on Netlify)

## Alternatives Considered

- **No sanitization**: Acceptable only if content is guaranteed machine-generated and never user-editable. Since this cannot always be guaranteed, rejected as a blanket policy.
- **Custom allowlist regex**: Fragile and historically error-prone. DOMPurify is maintained by browser security specialists; a hand-rolled approach would not be.
- **`<iframe sandbox>`**: Isolates rendering but complicates any interaction with the rendered content. Rejected for general use.
- **Trusted Types API**: Complementary browser-level defence, not a replacement for sanitization. Could be added later as a defence-in-depth measure.

## Notes

- If `v-html` is introduced in any component, the `sanitizeHtml` utility in `src/utils/sanitize.ts` must be used without exception.
