# Business Specifications — Issue #66: Validate fuelTypeDefault on import

## Goal

After a preferences file passes shape validation, verify that its `fuelTypeDefault` string is a fuel type actually offered by at least one station in the combined list (imported stations + stations already in IndexedDB). If the value is unrecognised, retain the current IndexedDB value and display a French warning to the user.

As part of this work, remove the `FuelType` enum (`src/enums/fuel-type.ts`) — it is no longer used as a type constraint; `string` with runtime validation replaces it everywhere.

## Scope

- `src/utils/preferencesImport.ts` — remove the TODO comment; no shape-level changes to `validatePreferencesShape`.
- `src/composables/usePreferencesImport.ts` — extend `handleFileSelected` to perform the async fuel-type check after shape validation passes.
- `src/enums/fuel-type.ts` — delete the file.
- Any files that currently import `FuelType` from `src/enums/fuel-type.ts` — update to use plain `string`.
- New composable `src/composables/useKnownFuelTypes.ts` — derives the set of known fuel types from station fetch results (delegates to `deriveFuelTypes` from `fuelTypeUtils`). Returns the live list so callers can pass it into the import flow.

## Rules

**R1 — Async fuel-type check at import time**
After the file parses successfully, the import flow fetches all unique station URLs from the merged list (file stations + IndexedDB stations) via the existing Netlify function, collects the returned fuel types, and checks whether `fuelTypeDefault` appears in that set.

*Example:* File contains `fuelTypeDefault: "GPL"`. No fetched station offers GPL → validation fails → storedFuelType is kept, warning shown.

**R2 — Null fuelTypeDefault is always accepted**
A `null` value skips the fuel-type check entirely.

**R3 — Unrecognised value: warn, keep stored**
If the check fails, `fuelTypeDefault` from the file is silently discarded. The stored IndexedDB value is preserved unchanged. A non-blocking warning message is shown:
> "Le type de carburant par défaut de votre fichier n'existe dans aucune station. La valeur en mémoire de l'application est conservé."
The rest of the diff (station rows) is still presented normally.

**R4 — Known fuel types composable**
A new composable `useKnownFuelTypes` accepts the result list from `useStationPrices` as input and exposes a reactive list of known fuel type strings (derived via `deriveFuelTypes`). It does not perform network calls itself.

**R5 — FuelType enum removal**
`src/enums/fuel-type.ts` is deleted. All existing references are replaced with plain `string`. No new enum or union type is introduced.

**R6 — No duplicate station fetches**
Station URLs already fetched by the main price-loading flow are not re-fetched during import. The known fuel types list produced by `useKnownFuelTypes` (populated from existing fetch results) is re-used directly; extra network calls are only made for URLs present in the import file but absent from IndexedDB.

**R7 — Suspense loading state during import**
The component responsible for the preferences import flow uses Vue's `<Suspense>` with a visible loading fallback. While async operations are in progress (file parsing, fuel-type validation network calls), the user sees a loader instead of a blank or stale UI. The loader is dismissed once all async work completes, whether the import succeeds, warns, or fails.

status: ready
