# Security Guidelines — Issue #14: Clean up stale types and define domain types

## Scope

This change is limited to compile-time TypeScript type definitions and a value-level enum. No runtime behaviour, no network calls, no user input handling, no DOM interaction, and no external dependencies are introduced. The attack surface introduced by this change is effectively zero.

The guidelines below are recorded for completeness and to prevent future drift as these types are consumed by higher layers.

## Rules

1. **No `any` in type definitions**
   - What: All fields in `Station`, `FuelPrice`, `StationData`, and `FuelType` must carry explicit, concrete types. `any` or `unknown` without a narrowing guard must not appear.
   - Where: `src/types/station.ts`, `src/types/fuel-price.ts`, `src/types/station-data.ts`, `src/enums/fuel-type.ts`
   - Why: Leaving `any` in foundational types silently disables TypeScript's type-checking for every consumer of those types, creating an invisible attack surface for runtime type confusion bugs.

2. **`null` must be explicit in `FuelPrice.price`**
   - What: The `price` field must be typed as `number | null`, not `number | undefined` or `number?`. Consumers must explicitly handle the null case.
   - Where: `src/types/fuel-price.ts`
   - Why: `undefined` can arise from missing object keys (a programming error); `null` is an intentional domain value meaning "fuel not available". Conflating the two hides logic errors in consumers.

3. **`FuelType` values must be string literals, not numeric indices**
   - What: The enum (or const object) must use string values matching the exact label used on the government data source (`"Gasoil"`, `"SP95-E10"`, `"SP95"`, `"SP98"`, `"E85"`). Numeric enums must not be used.
   - Where: `src/enums/fuel-type.ts`
   - Why: TypeScript numeric enums allow reverse-mapping and accept any `number` as a valid enum value at runtime, undermining type safety. String-literal enums or const objects are closed sets that fail loudly on invalid values.

4. **No runtime value construction from user input in type files**
   - What: Type files and the enum file must contain only static declarations. No functions that accept user-supplied strings or network responses and coerce them into domain types may appear in these files.
   - Where: `src/types/`, `src/enums/`
   - Why: Parsing and validation logic belongs in utility or composable layers where it can be tested and audited. Mixing it into type files makes it invisible to reviewers.

5. **Barrel re-export must not widen types**
   - What: `src/types/index.ts` must re-export types using `export type { ... }` (type-only re-exports) for interfaces/types, and normal `export { ... }` for the enum value. It must not re-export as `export * from` without inspection, which can accidentally expose internal helpers if files grow.
   - Where: `src/types/index.ts`
   - Why: Uncontrolled `export *` from a barrel can expose symbols that were not intended to be part of the public API, increasing the implicit coupling surface.

6. **Stale files must be fully deleted, not emptied**
   - What: The six boilerplate files must be removed from the repository, not left as empty files or stubs.
   - Where: `src/types/ErrorExtended.ts`, `src/types/ErrorNextPage.ts`, `src/types/LinkProp.ts`, `src/types/RouterPathEnum.ts`, `src/types/SideBarActionsEnum.ts`, `src/types/SideBarLinkAction.ts`
   - Why: Empty stubs with the same filename can still be imported by mistake in future code, creating a false sense that the symbol exists. Full deletion forces an immediate compiler error if someone attempts to import a deleted type.

status: ready
