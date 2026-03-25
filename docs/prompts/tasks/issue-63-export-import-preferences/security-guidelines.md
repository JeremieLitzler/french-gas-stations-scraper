# Security Guidelines — Issue #63: Export/Import User Preferences

## Rules

1. **Validate the JSON schema strictly before any processing**
   - **Where:** `src/utils/preferencesImport.ts`
   - **Why:** A maliciously crafted JSON file with unexpected keys, prototype-polluting patterns (`__proto__`, `constructor`), or oversized payloads could corrupt application state or exhaust memory if consumed without schema validation.

2. **Enforce URL validation on every imported station URL using the existing validator from `useStationStorage`**
   - **Where:** `src/utils/preferencesImport.ts`
   - **Why:** Accepting arbitrary URLs bypasses the origin + path-prefix allowlist and could introduce stations that trigger unexpected network requests or navigation.

3. **Enforce name validation on every imported station name using the existing validator from `useStationStorage`**
   - **Where:** `src/utils/preferencesImport.ts`
   - **Why:** Unvalidated station names could contain HTML-injection payloads that reach the DOM if a component renders the name without escaping; Vue's default text interpolation (`{{ }}`) is safe, but any future use of `v-html` must follow ADR-007.

4. **Cap the size of the imported file before parsing**
   - **Where:** `src/composables/usePreferencesImport.ts` (file input handler)
   - **Why:** A large JSON file can cause the browser to hang during `JSON.parse`; rejecting files above a reasonable limit (e.g. 1 MB) prevents denial-of-service against the user's own browser tab.

5. **Do not pass imported data directly to IndexedDB without going through the existing composable write path**
   - **Where:** `src/composables/usePreferencesImport.ts`
   - **Why:** Bypassing `useStationStorage` and `useDefaultFuelType` would skip any invariant checks those composables enforce, allowing partially-validated data to reach persistent storage (ADR-008).

status: ready
