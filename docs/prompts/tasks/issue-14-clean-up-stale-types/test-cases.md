# Test Cases — Issue #14: Clean up stale types and define domain types

## TC-01: Stale type files are absent after cleanup

**Precondition:** The codebase has been updated per the spec.
**Action:** Attempt to import any of the six deleted files (`ErrorExtended`, `ErrorNextPage`, `LinkProp`, `RouterPathEnum`, `SideBarActionsEnum`, `SideBarLinkAction`) from `src/types/`.
**Expected outcome:** TypeScript raises a compile-time error (module not found). The files do not exist on disk.

## TC-02: Valid Station value is accepted by TypeScript

**Precondition:** `Station` type is defined and exported from `src/types/index.ts`.
**Action:** Assign a value `{ name: "Total Lyon", url: "https://prix-carburants.gouv.fr/station/123" }` to a variable typed as `Station`.
**Expected outcome:** No TypeScript error.

## TC-03: Station with wrong name type is rejected

**Precondition:** `Station` type is defined.
**Action:** Assign a value `{ name: 123, url: "https://prix-carburants.gouv.fr/station/123" }` to a variable typed as `Station` (wrapped in `@ts-expect-error`).
**Expected outcome:** TypeScript raises a type error on that line, confirming the `@ts-expect-error` is necessary.

## TC-04: Station with missing url is rejected

**Precondition:** `Station` type is defined.
**Action:** Assign a value `{ name: "Shell Paris" }` (no `url`) to a variable typed as `Station` (wrapped in `@ts-expect-error`).
**Expected outcome:** TypeScript raises a type error on that line.

## TC-05: FuelPrice with numeric price is accepted

**Precondition:** `FuelPrice` type is defined and exported from `src/types/index.ts`.
**Action:** Assign `{ type: "Gasoil", price: 1.799 }` to a variable typed as `FuelPrice`.
**Expected outcome:** No TypeScript error.

## TC-06: FuelPrice with null price is accepted

**Precondition:** `FuelPrice` type is defined.
**Action:** Assign `{ type: "SP95", price: null }` to a variable typed as `FuelPrice`.
**Expected outcome:** No TypeScript error.

## TC-07: FuelPrice with string price is rejected

**Precondition:** `FuelPrice` type is defined.
**Action:** Assign `{ type: "Gasoil", price: "cheap" }` to a variable typed as `FuelPrice` (wrapped in `@ts-expect-error`).
**Expected outcome:** TypeScript raises a type error on that line.

## TC-08: FuelPrice with undefined price is rejected

**Precondition:** `FuelPrice` type is defined.
**Action:** Assign `{ type: "SP98", price: undefined }` to a variable typed as `FuelPrice` (wrapped in `@ts-expect-error`).
**Expected outcome:** TypeScript raises a type error, confirming that `undefined` is not a valid price (only `null` is).

## TC-09: Valid StationData is accepted

**Precondition:** `StationData` type is defined and exported from `src/types/index.ts`.
**Action:** Assign `{ stationName: "Shell Paris", fuels: [{ type: "SP95", price: 1.85 }] }` to a variable typed as `StationData`.
**Expected outcome:** No TypeScript error.

## TC-10: StationData with empty fuels array is accepted

**Precondition:** `StationData` type is defined.
**Action:** Assign `{ stationName: "BP Nantes", fuels: [] }` to a variable typed as `StationData`.
**Expected outcome:** No TypeScript error.

## TC-11: StationData with missing stationName is rejected

**Precondition:** `StationData` type is defined.
**Action:** Assign `{ fuels: [] }` to a variable typed as `StationData` (wrapped in `@ts-expect-error`).
**Expected outcome:** TypeScript raises a type error on that line.

## TC-12: FuelType enum contains exactly the five expected values

**Precondition:** `FuelType` is defined and exported from `src/types/index.ts` (or `src/enums/fuel-type.ts`).
**Action:** Enumerate all values of `FuelType` at runtime (e.g. via `Object.values`).
**Expected outcome:** The result is exactly `["Gasoil", "SP95-E10", "SP95", "SP98", "E85"]` with no additional entries.

## TC-13: FuelType values are strings, not numbers

**Precondition:** `FuelType` is defined.
**Action:** Check the type of each value in `FuelType`.
**Expected outcome:** Every value is a `string`, not a `number`.

## TC-14: Invalid FuelType assignment is rejected by TypeScript

**Precondition:** `FuelType` is defined.
**Action:** Assign the string `"Diesel"` to a variable typed as `FuelType` (wrapped in `@ts-expect-error`).
**Expected outcome:** TypeScript raises a type error on that line.

## TC-15: All four types are importable from the barrel file

**Precondition:** `src/types/index.ts` exists.
**Action:** Import `Station`, `FuelPrice`, `StationData`, and `FuelType` from `@/types` in a single import statement.
**Expected outcome:** All four names resolve without error; they carry the correct type information.

## TC-16: FuelType can be used as the type of FuelPrice.type field

**Precondition:** Both `FuelType` and `FuelPrice` are defined.
**Action:** Assign a value `{ type: FuelType.Gasoil, price: 1.5 }` to a variable typed as `FuelPrice`.
**Expected outcome:** No TypeScript error (a `FuelType` value satisfies the `type` field, which accepts `string`).

status: ready
