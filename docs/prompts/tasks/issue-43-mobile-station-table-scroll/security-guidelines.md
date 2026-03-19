# Security Guidelines — Issue #43: Mobile Station Manager Horizontal Scroll

This fix is a pure CSS layout change — no new inputs, network calls, DOM parsing, dependencies, secrets, or CORS configuration are introduced. No security rules apply beyond those already enforced project-wide.

**Relevant ADRs for context:**
- ADR-006: Netlify function acts as the CORS proxy — no browser-direct fetches. Unaffected by this change.
- ADR-007: HTML sanitisation for `v-html`. Unaffected by this change.

No additional security rules are required for this feature.

status: ready
