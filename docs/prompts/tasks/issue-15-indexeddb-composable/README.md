# Issue #15: feat: implement IndexedDB composable for station list persistence

## Context

Closes part of #9. Depends on #14.

Implements the storage layer described in ADR-008. The user's station list must survive page reloads.

## Acceptance criteria

- `src/composables/useStationStorage.ts` created using the singleton composable pattern (ADR-002)
- Wraps IndexedDB with `get(key)`, `set(key, value)`, `del(key)` Promise-based operations (ADR-008)
- Exposes: `stations` (reactive list), `addStation(station: Station)`, `removeStation(url: string)`, `loadStations()`
- On first load (empty DB), seeds IndexedDB with the five default stations from issue #9:
  - `{ name: "à INTERMARCHE AOSTE", url: "https://www.prix-carburants.gouv.fr/station/38490005" }`
  - `{ name: "à INTERMARCHE APPRIEU", url: "https://www.prix-carburants.gouv.fr/station/38140005" }`
  - `{ name: "à SUPER U APPRIEU", url: "https://www.prix-carburants.gouv.fr/station/38690006" }`
  - `{ name: "à INTERMARCHE TAIN L'HERMITAGE", url: "https://www.prix-carburants.gouv.fr/station/26600007" }`
  - `{ name: "à SUPER U SAINT-DONAT", url: "https://www.prix-carburants.gouv.fr/station/26260001" }`
- Unit tests cover: load from empty DB (seeds), load from populated DB, add, remove

## GitHub Issue URL

https://github.com/JeremieLitzler/french-gas-stations-scraper/issues/15
