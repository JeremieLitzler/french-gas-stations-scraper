# Issue #14: feat: clean up stale types and define Station, FuelPrice, StationData

## Context

Closes part of #9.

`src/types/` contains leftover types from the social media boilerplate (`ErrorExtended.ts`, `LinkProp.ts`, `RouterPathEnum.ts`, `SideBarActionsEnum.ts`, `SideBarLinkAction.ts`). These must be removed before new domain types are added.

## Acceptance criteria

- All five stale type files removed from `src/types/`
- Any imports of those types in `src/` removed (or files that only existed to use them deleted)
- `src/types/station.ts` created — exports `Station { name: string; url: string }`
- `src/types/fuel-price.ts` created — exports `FuelPrice { type: string; price: number | null }`
- `src/enums/fuel-type.ts` created — exports `FuelType` with value "Gasoil", "SP95-E10", "SP95", "SP98", "E85" for now. Additional types may be required. decide where it is best to save this as progress is made in next issues.
- `src/types/station-data.ts` created — exports `StationData { stationName: string; fuels: FuelPrice[] }`
- All three types are re-exported from `src/types/index.ts`
- Unit tests confirm type shapes are correct (compile-time checks via `@ts-expect-error`)
