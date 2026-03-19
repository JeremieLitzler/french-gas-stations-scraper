# Security Guidelines — Issue #28: Default Fuel Type

## Rules

**1. Validate the stored value before use**
- **What:** When reading the default fuel type from IndexedDB, treat the retrieved value as untrusted. Accept it only if it is a non-empty string and matches one of the fuel type labels present in the currently derived list.
- **Where:** `src/composables/useDefaultFuelType.ts`, on every read from IndexedDB.
- **Why:** A corrupted or tampered IndexedDB entry could inject an unexpected value into reactive state, silently distorting UI behaviour or serving as an injection vector if the value is later embedded in a rendered context.

**2. Do not render the stored fuel type label with `v-html`**
- **What:** The default fuel type label must be rendered as plain text only (text interpolation `{{ }}` or `:value` / `:textContent` bindings). `v-html` is prohibited for this value.
- **Where:** `src/components/StationPricesContent.vue` and any component that displays the label.
- **Why:** Fuel type labels originate from scraped HTML and pass through IndexedDB; binding them with `v-html` without sanitization would expose the app to stored XSS. ADR-007 governs all `v-html` usage.

**3. Store only the fuel type label string — no structured payload**
- **What:** The IndexedDB entry for the default fuel type must be a plain string. Do not serialise an object or embed additional metadata in this value.
- **Where:** `src/composables/useDefaultFuelType.ts`, on every write to IndexedDB.
- **Why:** A plain string narrows the attack surface; a structured payload would expand what can be injected if the stored value were ever misused downstream.

**4. Guard the ordering function against prototype-pollution-style inputs**
- **What:** The pure function that reorders the fuel type list must treat both its input list and the default string as read-only; it must not mutate the input array or assign properties to its elements.
- **Where:** `src/utils/fuelTypeUtils.ts`, in the new ordering function.
- **Why:** Mutating shared reactive state from a utility function can propagate unexpected side effects across composables that hold a reference to the same array.

**5. Use a proper key deletion — never overwrite with empty or null**
- **What:** `clearDefault` must call the IndexedDB `del(key)` operation to remove the key entirely; setting the key to an empty string, `null`, or `undefined` is prohibited.
- **Where:** `src/composables/useDefaultFuelType.ts`, in the `clearDefault` action; `src/utils/indexedDb.ts`, which must expose a `del` helper.
- **Why:** A sentinel value left in storage could be read back by validation logic and treated as a valid-but-empty default, bypassing the non-empty-string guard and leaving the store in an ambiguous state.

status: ready
