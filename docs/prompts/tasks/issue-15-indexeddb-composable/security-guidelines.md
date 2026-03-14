# Security Guidelines — Issue #15: useStationStorage Composable

## Scope

These guidelines apply to `src/composables/useStationStorage.ts` and any IndexedDB wrapper it depends on. They are derived from the business specifications and the project's existing security decisions (ADR-007, ADR-008).

---

## Rules

### 1. Validate URL format before storing a station

**What:** Every station URL accepted by the add operation must be validated against the expected origin (`https://www.prix-carburants.gouv.fr`) before it is written to IndexedDB or appended to the reactive list. Reject any value that does not parse as a valid URL or does not match the expected origin.

**Where:** `src/composables/useStationStorage.ts` — inside the add operation, before any write.

**Why:** Storing an attacker-supplied URL and later passing it to the Netlify fetch function (ADR-006) would allow server-side request forgery (SSRF): an injected URL could cause the backend to fetch arbitrary external resources. Enforcing an origin allowlist at the storage layer prevents that vector regardless of how the add form validates input.

---

### 2. Validate station name length and character set before storing

**What:** The station name field must be checked for a reasonable maximum length (e.g. 200 characters) and must not contain raw HTML tags. Reject or sanitise values that exceed the limit or contain angle-bracket constructs.

**Where:** `src/composables/useStationStorage.ts` — inside the add operation, before any write.

**Why:** Station names may be displayed in the UI. If a name containing `<script>` or event-handler attributes is stored and later bound to a Vue template without encoding, it creates a stored XSS vector. Preventing malformed names at the storage boundary is defence-in-depth alongside Vue's default text interpolation escaping.

---

### 3. Do not render stored station names via `v-html`

**What:** Components that display station names retrieved from IndexedDB must use Vue text interpolation (`{{ name }}`) or `:textContent`, never `v-html`. If `v-html` is ever required for station data, DOMPurify (`src/utils/sanitize.ts`) must be applied first, per ADR-007.

**Where:** Any Vue component that consumes the composable's reactive station list.

**Why:** IndexedDB is client-writable storage; its contents are not server-generated trusted HTML. Binding raw stored strings to `v-html` would turn the storage layer into a persistent XSS sink.

---

### 4. Treat IndexedDB read results as untrusted before use

**What:** Data read back from IndexedDB must be validated to conform to the `Station` type (`{ name: string, url: string }`) before it is assigned to the reactive list. At minimum verify that both fields are strings and that the array structure is present. Discard or ignore entries that do not match.

**Where:** `src/composables/useStationStorage.ts` — in the load operation, after reading from the IndexedDB wrapper.

**Why:** A user with access to browser DevTools can write arbitrary data directly to IndexedDB. Without a type guard on read, malformed or missing fields would propagate into the reactive state and cause runtime errors or unexpected rendering behaviour downstream.

---

### 5. Do not expose the IndexedDB database handle or raw wrapper outside the composable

**What:** The IndexedDB wrapper and any open database connection must remain internal to the module. The composable's public surface must expose only the reactive station list and the three named operations (load, add, remove). No internal handle, promise, or low-level API reference may be returned or exported.

**Where:** `src/composables/useStationStorage.ts` — module exports.

**Why:** Exposing the raw wrapper would allow callers to bypass the validation rules above and write arbitrary data directly to the store, breaking the security boundary.

---

### 6. Apply no URL-encoding transformations that could mask an injected payload

**What:** The composable must store and retrieve URLs verbatim — no normalisation, percent-encoding, or decoding transformations that could obscure a validation bypass. Validation (rule 1) must operate on the raw, user-supplied string before any storage write.

**Where:** `src/composables/useStationStorage.ts` — add operation, validation step.

**Why:** Some validation bypasses work by supplying an encoded form of a disallowed URL that passes a naive check but is later decoded into the actual target. Validating the raw input first and then storing it verbatim prevents this class of bypass.

---

### 7. No secrets or environment variables are accessed by this composable

**What:** The composable must not read `import.meta.env.*` or any other environment variable. All configuration (DB name, store name, station list key, default seed) must be declared as module-level constants in the source file.

**Where:** `src/composables/useStationStorage.ts`.

**Why:** There are no secrets involved in client-side IndexedDB access; keeping configuration as plain constants avoids accidental reliance on build-time values that could differ between environments and makes the security surface trivially auditable.

---

### 8. No CORS or network requests are initiated by this composable

**What:** The composable and the IndexedDB wrapper it uses must make no network requests (no `fetch`, no `XMLHttpRequest`, no dynamic `import()`). All I/O is limited to the browser's IndexedDB API.

**Where:** `src/composables/useStationStorage.ts` and the IndexedDB wrapper.

**Why:** The composable operates entirely client-side. Any accidental network call would bypass the Netlify function CORS proxy (ADR-006) and could exfiltrate stored URLs to a third party.

---

status: ready
