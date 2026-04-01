# Security Guidelines — Issue #66: Validate fuelTypeDefault on import

## Rules

**1. Sanitise the `fuelTypeDefault` string before comparison**
- **What:** Strip or reject any string value for `fuelTypeDefault` that contains characters outside a safe fuel-type character set (letters, digits, hyphens, spaces) before performing the fuel-type membership check.
- **Where:** `src/composables/usePreferencesImport.ts` — in the async validation step after shape validation passes.
- **Why:** A maliciously crafted import file could supply a `fuelTypeDefault` value containing injection payloads; if that raw string is ever displayed in the UI or logged, it creates an XSS or log-injection surface.

**2. Do not render `fuelTypeDefault` from the import file via `v-html`**
- **What:** The warning message shown when the fuel-type check fails must use plain text interpolation (`{{ }}`) only — never `v-html` — even if the message includes a user-supplied value.
- **Where:** Any Vue component that renders the import warning.
- **Why:** Rendering an unsanitised string from an imported file via `v-html` bypasses Vue's built-in escaping and exposes an XSS vector (see ADR-007 for the project-wide `v-html` sanitisation rule).

**3. Validate station URLs from the import file before passing them to the Netlify function**
- **What:** Only station URLs that match the expected domain (`prix-carburants.gouv.fr`) must be forwarded to the Netlify fetch function during the fuel-type validation step. Any URL not matching the allowlist must be silently skipped.
- **Where:** `src/composables/usePreferencesImport.ts` — before initiating network calls for URLs found only in the import file.
- **Why:** An attacker-controlled import file could supply arbitrary URLs, causing the Netlify proxy to issue server-side requests to unintended hosts (SSRF via ADR-006 proxy).

**4. Treat Netlify function responses as untrusted during import-time fetches**
- **What:** When fetching fuel types for import-time validation, validate the response shape (array of strings) before using the values. Do not assume the response matches the expected structure.
- **Where:** `src/composables/usePreferencesImport.ts` — after each Netlify function call returns.
- **Why:** A malformed or unexpected response shape could cause runtime errors or allow unsanitised data to reach the comparison logic.

status: ready
