# Business Specifications — Issue #14: Clean up stale types and define domain types

## Goal and Scope

Remove five leftover type files from the social media boilerplate (`src/types/`) that are not used by the gas station domain. Then introduce three new domain-specific type files and one enum file that model the core data structures required by subsequent features (IndexedDB persistence, price scraping, price display).

The scope is limited to `src/types/`, `src/enums/`, and `src/types/index.ts`. No UI, composables, or Netlify function changes are included in this issue.

## Files to Remove

- `src/types/ErrorExtended.ts` — boilerplate error type, not used in gas station domain
- `src/types/ErrorNextPage.ts` — boilerplate error type, not used in gas station domain
- `src/types/LinkProp.ts` — boilerplate navigation type, not used in gas station domain
- `src/types/RouterPathEnum.ts` — boilerplate routing enum, not used in gas station domain
- `src/types/SideBarActionsEnum.ts` — boilerplate sidebar enum, not used in gas station domain
- `src/types/SideBarLinkAction.ts` — boilerplate sidebar type, not used in gas station domain

No other source file in `src/` imports any of these stale types (verified), so deletion alone is sufficient.

## Files to Create

### `src/types/station.ts`

Defines the shape of a gas station as stored and referenced across the application. A station has a human-readable name and a URL pointing to its page on `prix-carburants.gouv.fr`.

### `src/types/fuel-price.ts`

Defines the shape of a single fuel price entry as returned by the scraper. A fuel price carries the fuel type label and the numeric price. The price may be absent (null) when the station does not offer that fuel type.

### `src/types/station-data.ts`

Defines the scraped result for one station: the station's display name and the list of fuel prices. This is the response shape returned by the Netlify function.

### `src/enums/fuel-type.ts`

Defines the known fuel type values as a TypeScript enum (or const object). The initial values are: Gasoil, SP95-E10, SP95, SP98, E85. This enum is placed in `src/enums/` (a new directory) rather than `src/types/` because it is a value-level construct, not a structural type.

### `src/types/index.ts`

Re-exports `Station`, `FuelPrice`, `StationData`, and `FuelType` so consumers import from a single barrel file (`@/types`).

## Rules and Constraints

- The stale files must be deleted, not merely emptied.
- `src/enums/` must be created as a new directory if it does not exist.
- The `FuelType` enum values must match exactly: `"Gasoil"`, `"SP95-E10"`, `"SP95"`, `"SP98"`, `"E85"`.
- `price` in `FuelPrice` must allow `null` to represent a fuel type the station does not carry.
- `fuels` in `StationData` is an ordered list of `FuelPrice` entries.
- No external dependencies may be introduced.

## Example Mapping

### Rule: stale type files are removed

**Example 1 — happy path**
Given the five stale files exist in `src/types/`,
when the cleanup is applied,
then none of those five files exist in `src/types/` and no TypeScript compilation error is raised.

**Example 2 — no import breakage**
Given no non-type file in `src/` imports any of the stale types,
when the stale files are deleted,
then the project compiles without errors.

### Rule: Station type is correct

**Example 3 — valid Station shape**
Given a value `{ name: "Total Lyon", url: "https://prix-carburants.gouv.fr/..." }`,
when it is used as a `Station`,
then TypeScript accepts it without error.

**Example 4 — invalid Station shape**
Given a value `{ name: 123, url: "..." }`,
when it is used as a `Station`,
then TypeScript raises a compile-time error.

### Rule: FuelPrice type is correct

**Example 5 — price present**
Given a value `{ type: "Gasoil", price: 1.799 }`,
when it is used as a `FuelPrice`,
then TypeScript accepts it.

**Example 6 — price absent**
Given a value `{ type: "SP95", price: null }`,
when it is used as a `FuelPrice`,
then TypeScript accepts it (null is a valid price).

**Example 7 — invalid FuelPrice shape**
Given a value `{ type: "Gasoil", price: "cheap" }`,
when it is used as a `FuelPrice`,
then TypeScript raises a compile-time error.

### Rule: StationData type is correct

**Example 8 — valid StationData**
Given a value `{ stationName: "Shell Paris", fuels: [{ type: "SP95", price: 1.85 }] }`,
when it is used as a `StationData`,
then TypeScript accepts it.

**Example 9 — empty fuels array**
Given a value `{ stationName: "BP Nantes", fuels: [] }`,
when it is used as a `StationData`,
then TypeScript accepts it (an empty list is valid).

### Rule: FuelType enum values are correct

**Example 10 — known fuel type**
Given the `FuelType` enum,
when its values are enumerated,
then exactly `"Gasoil"`, `"SP95-E10"`, `"SP95"`, `"SP98"`, `"E85"` are present.

**Example 11 — FuelType used as type**
Given a variable typed as `FuelType`,
when it is assigned a value not in the enum,
then TypeScript raises a compile-time error.

### Rule: barrel re-export

**Example 12 — single import point**
Given `src/types/index.ts` exists,
when a consumer imports `Station`, `FuelPrice`, `StationData`, and `FuelType` from `@/types`,
then all four are available with correct type information.

status: ready
