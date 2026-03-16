# Security Guidelines — Station Management UI (#17)

## 1. Validate and sanitize user-supplied name input before storing

**What:** Strip or reject any HTML tags from the station name before persisting it. Accept only strings with a non-zero length after stripping.
**Where:** `src/composables/useStationStorage.ts` — the `addStation` and `updateStation` operations (validation helpers already present: `isValidName`, `stripHtmlTags`).
**Why:** A name field that accepts `<script>` or event-handler markup could introduce stored XSS if the name value is ever rendered via `v-html`. The existing `stripHtmlTags` + `isValidName` guards must be applied consistently to every write path, including the new `updateStation` operation.

## 2. Validate station URLs against the strict allowed-origin allowlist before storing

**What:** Accept only URLs whose origin is exactly `https://www.prix-carburants.gouv.fr` and whose pathname begins with `/station/`. Reject anything else, including URLs with the correct origin but unexpected path prefixes.
**Where:** `src/composables/useStationStorage.ts` — `isValidUrl` (already present); apply it to `updateStation` identically to `addStation`.
**Why:** Without path-level validation, a malformed URL could slip into IndexedDB and later be passed to the Netlify fetch function, potentially causing server-side request forgery (SSRF) or unexpected fetches. The existing `isValidUrl` only validates origin; extend the check to also require the `/station/` path prefix.

## 3. Do not render user-supplied field values via `v-html`

**What:** Bind station name and URL values to input `value` attributes or Vue `:value` / `v-model` bindings only — never to `v-html` or `innerHTML`.
**Where:** `src/components/StationManager.vue`.
**Why:** Rendering user-editable content via `v-html` bypasses Vue's XSS escaping and would require sanitization (ADR-007). Text input bindings are safe by design because browsers treat them as text, not markup.

## 4. Perform duplicate-URL detection client-side before calling storage

**What:** Before calling `addStation` or `updateStation`, check whether the submitted URL already exists in the reactive station list. If it does, surface an inline error and abort the storage call.
**Where:** `src/components/StationManager.vue` — validation logic before invoking composable operations.
**Why:** Prevents the same station being stored multiple times, which would send redundant requests to the Netlify function and waste the user's rate-limit quota. Detection must be done against the in-memory reactive list (not by re-reading IndexedDB) to keep it synchronous and avoid toctou race conditions.

## 5. Trim whitespace from inputs before validation and storage

**What:** Strip leading and trailing whitespace from both name and URL values before running validation rules.
**Where:** `src/components/StationManager.vue` — before invoking any storage operation.
**Why:** A URL padded with spaces would pass the URL-format check in some browsers' `URL()` constructor but is not a valid station URL. Trimming prevents accidental or intentionally obfuscated bypasses of the format check.

## 6. Do not expose raw storage errors to the UI

**What:** Catch errors thrown by `addStation`, `updateStation`, and `removeStation`; display a generic user-facing message rather than the raw error message or stack trace.
**Where:** `src/components/StationManager.vue` — error handling in event handlers.
**Why:** Raw storage error messages may leak internal implementation details (key names, IndexedDB schema, composable internals) that are not useful to the user and could assist an attacker in enumerating the app's internals.

## 7. No new external dependencies

**What:** Do not add any new npm packages to implement this feature.
**Where:** Project root `package.json`.
**Why:** Every new dependency expands the supply-chain attack surface. The feature is fully implementable with existing Vue 3 reactivity primitives, the existing `useStationStorage` composable, and native browser APIs (`URL` constructor). No library is needed.

status: ready
