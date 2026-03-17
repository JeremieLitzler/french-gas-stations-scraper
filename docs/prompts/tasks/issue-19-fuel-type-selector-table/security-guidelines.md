# Security Guidelines — Issue 19

## Fuel-Type Selector and Price Table

### Analysis

This feature is a pure frontend rendering change. It reads data already held in reactive state from `useStationPrices` — data that was fetched and parsed by the existing Netlify function pipeline. No new network requests, no new user-supplied URL inputs, no new HTML parsing, and no new dependencies are introduced.

The security surface is therefore limited to:

1. **DOM output encoding** — station names and fuel type labels derived from scraped HTML are rendered into the DOM.
2. **Active content in rendered values** — ensuring no raw HTML is injected via `v-html`.
3. **Prototype pollution and type coercion** — utility functions operate on structured `StationData` objects; any unexpected shapes must not cause runtime errors or silent data corruption.

---

### Rules

**1. No `v-html` for station names, fuel type labels, or price values**

- **What:** Station names, fuel type strings, and price values must be rendered exclusively with Vue's text interpolation (`{{ }}`) or `:text-content` binding — never with `v-html`.
- **Where:** `src/components/StationPrices.vue` — all new template additions for the fuel-type selector and price table.
- **Why:** These values originate from scraped external HTML. Even after `DOMPurify` sanitization during parsing, injecting them as raw HTML in new rendering contexts creates a new XSS surface. Text interpolation automatically HTML-encodes output (ADR-007 governs `v-html` use; this feature must not introduce any new `v-html` usage).

**2. Treat fuel type labels as opaque strings — no dynamic evaluation**

- **What:** Fuel type strings (e.g. `"SP95"`, `"Gasoil"`) must be used as display text and map keys only. They must not be passed to `eval`, `Function()`, `innerHTML`, `v-html`, or any DOM API that interprets content as code or markup.
- **Where:** `src/utils/fuelTypeUtils.ts` and `src/components/StationPrices.vue`.
- **Why:** If a malicious or malformed station page injects a crafted fuel type label, treating it as safe display text limits the damage. Any evaluative use would escalate a data-integrity issue into a code execution risk.

**3. Guard against null and non-numeric price values in sort logic**

- **What:** The price sort in `fuelTypeUtils.ts` must treat `null`, `undefined`, and non-finite numbers as sort-last values without throwing. The table must render a dash (`—`) for any station where the resolved price is not a positive finite number.
- **Where:** `src/utils/fuelTypeUtils.ts` — sort comparator and row-mapping functions.
- **Why:** Scraped data is externally sourced and structurally untrustworthy. A thrown exception or NaN propagation in the sort comparator could corrupt the rendered table order or cause a component crash, which is a denial-of-service for the user.

**4. No new external dependencies**

- **What:** The implementation must not add any new npm packages.
- **Where:** `package.json` — must remain unchanged by this feature.
- **Why:** Every new dependency expands the supply-chain attack surface. The feature requires only standard TypeScript/Vue primitives; no third-party library is needed.

**5. Selector state is local — no cross-component exposure**

- **What:** The selected fuel type `ref` must remain local to `StationPrices.vue`. It must not be exported, stored in a module-level singleton, written to IndexedDB, or otherwise shared outside the component.
- **Where:** `src/components/StationPrices.vue`.
- **Why:** Exposing UI state through a shared singleton or persistent store widens the state mutation surface unnecessarily and contradicts the spec (Rule 10 in business-specifications.md).

status: ready
