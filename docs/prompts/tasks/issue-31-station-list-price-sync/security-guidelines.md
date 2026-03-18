# Security Guidelines — Issue #31: Station List → Price Table Reactivity

## Rules

**Rule 1 — Station URL validation before fetch**
What: Any station URL dispatched to the Netlify function must be validated against the domain
allowlist before the request is sent.
Where: `StationPricesContent.vue` (before calling the add/re-fetch operation) and/or
`useStationPrices.ts` (before issuing the network request).
Why: A user-supplied URL could target an arbitrary host; the domain allowlist enforced by
ADR-006 must not be bypassed by client-side logic skipping pre-validation.

**Rule 2 — No direct DOM output of user-supplied station names**
What: Station names and labels rendered in the Price Table must use text interpolation (`{{ }}`),
not `v-html`. If any label must be rendered as HTML, it must pass through `sanitizeHtml`
(ADR-007).
Where: `StationPricesContent.vue` and any child component rendering station name labels.
Why: User-supplied station names are uncontrolled strings; rendering them via `v-html` without
sanitization would open an XSS vector.

**Rule 3 — Incremental state mutations must not leave inconsistent state on error**
What: If a re-fetch triggered by a station URL change fails, the old price entry must be fully
removed and the station must appear in the warnings list — the composable must not retain a
partial or stale result for that station.
Where: `useStationPrices.ts` (error-handling path of the update/re-fetch operation).
Why: Stale price data for a URL that is no longer valid could mislead the user into acting on
outdated prices.

status: ready
