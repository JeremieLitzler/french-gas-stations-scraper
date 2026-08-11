# Security Guidelines: Fix vi.mock Hoisting ReferenceError in applyRemotePreferences.spec.ts

No security-relevant scope. The change is limited to how mock functions are declared inside
`src/utils/applyRemotePreferences.spec.ts` (test-only, dev-time execution via Vitest). It
touches no user input, no rendered/output content, no Netlify Function boundary, no
dependencies, no secrets, and no HTTP/CORS surface. No guidelines apply.

status: ready
