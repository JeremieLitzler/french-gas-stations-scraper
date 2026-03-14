# Technical Specifications — Issue #14: Clean up stale types and define domain types

## Files Changed

### Deleted

- `src/types/ErrorExtended.ts` — boilerplate error type removed; no consumers in codebase
- `src/types/ErrorNextPage.ts` — boilerplate error type removed; no consumers in codebase
- `src/types/LinkProp.ts` — boilerplate navigation type removed; no consumers in codebase
- `src/types/RouterPathEnum.ts` — boilerplate routing enum removed; no consumers in codebase
- `src/types/SideBarActionsEnum.ts` — boilerplate sidebar enum removed; no consumers in codebase
- `src/types/SideBarLinkAction.ts` — boilerplate sidebar type removed; no consumers in codebase

### Created

- `src/types/station.ts` — defines `Station` interface: `{ name: string; url: string }`
- `src/types/fuel-price.ts` — defines `FuelPrice` interface: `{ type: string; price: number | null }`
- `src/types/station-data.ts` — defines `StationData` interface: `{ stationName: string; fuels: FuelPrice[] }`; imports `FuelPrice` from sibling file
- `src/enums/fuel-type.ts` — defines `FuelType` string enum with values `Gasoil`, `SP95-E10`, `SP95`, `SP98`, `E85`; placed in `src/enums/` (new directory) as a value-level construct separate from structural types
- `src/types/index.ts` — barrel file; re-exports `Station`, `FuelPrice`, `StationData` as type-only exports and `FuelType` as a value export

## Technical Choices

### String enum vs const object

A TypeScript `enum` with explicit string values was chosen over a `const` object (`{ Gasoil: 'Gasoil', ... } as const`). Both are closed sets at the type level. The `enum` form is preferred here because it produces a named type (`FuelType`) that can be used directly as a parameter type in function signatures without a `typeof` indirection (`typeof FuelType[keyof typeof FuelType]`). The named type integrates more cleanly with Vue template props and composable signatures in subsequent issues.

### `src/enums/` as a separate directory

The `FuelType` construct is a runtime value (it emits JavaScript), not a structural type alias. Keeping it in `src/enums/` rather than `src/types/` signals to future contributors that files in `src/types/` are erased at compile time while files in `src/enums/` produce runtime artifacts.

### `price: number | null` not `price?: number`

An optional field (`price?: number`) would mean the field may be absent from the object entirely, which would cause silent runtime errors when consumers destructure or access `price` without checking. An explicit `null` forces consumers to handle the "no price" case as a first-class branch.

### Barrel re-export uses `export type` for interfaces

Interfaces (`Station`, `FuelPrice`, `StationData`) are re-exported with `export type` to signal they are erased constructs and to enable `isolatedModules`-compatible builds. `FuelType` is re-exported with a plain `export` because it is a runtime value.

## Self-Code Review

1. **Potential issue — `station-data.ts` imports from relative path `'./fuel-price'`**: If the barrel `index.ts` is the intended public entry point, this cross-file relative import is an internal dependency. This is intentional and correct — internal files may reference siblings directly without going through the barrel.

2. **Potential issue — `FuelType` member name `SP95E10` vs value `'SP95-E10'`**: The enum key cannot contain a hyphen, so the key is `SP95E10` while the string value is `'SP95-E10'`. This asymmetry is expected and documented. Consumers must use `FuelType.SP95E10` to get the string `'SP95-E10'`. This is a TypeScript constraint, not a bug.

3. **Potential issue — `StationData.stationName` vs `Station.name`**: The two types use different field names for the human-readable label (`stationName` vs `name`). This is intentional: `Station` is what the user stores (input), `StationData` is what the scraper returns (output). Keeping them distinct avoids conflating storage shape with response shape. If a future issue merges these, an ADR should document the decision.

status: ready
