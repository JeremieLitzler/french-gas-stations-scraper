# Business Specifications — Issue #15: IndexedDB Composable for Station List Persistence

## Goal and Scope

Implement a persistent storage layer for the user's list of gas stations so that the list survives page reloads and browser sessions. This is the storage composable described in ADR-008.

The composable replaces any in-memory or ephemeral station list with a reactive list backed by IndexedDB. It is the single authoritative source of the user's station collection in the application.

## Files to Create or Modify

### `src/composables/useStationStorage.ts` (create)

The primary deliverable. A singleton composable (per ADR-002) that:

- Owns the reactive, shared list of stations.
- Exposes operations for consumers to load, add, and remove stations.
- Internally uses IndexedDB (per ADR-008) via a thin Promise-based wrapper.
- On the first load when the database is empty, seeds the store with the five default stations.

### `src/composables/useStationStorage.spec.ts` (create)

Unit tests covering all four scenarios listed in the acceptance criteria.

## Rules and Constraints

### Station data shape

Each station is an object with exactly two fields: a human-readable name and a URL pointing to the station's page on `prix-carburants.gouv.fr`. The `Station` type is already defined in `src/types/` (introduced in issue #14); this composable must reuse it.

### Singleton composable pattern (ADR-002)

The reactive station list is declared at module level (outside the composable function) so all consumers share the same reference. Every call to the composable returns the same reactive state.

### IndexedDB wrapper (ADR-008)

The low-level IndexedDB interactions are encapsulated behind three Promise-based operations: read a value by key, write a value by key, and delete a value by key. The composable uses only these three primitives to interact with the database; it does not open the database directly.

### Default station list

When the database is loaded for the first time and contains no entries, the composable writes the following five stations to IndexedDB and populates the reactive list with them:

1. `{ name: "à INTERMARCHE AOSTE", url: "https://www.prix-carburants.gouv.fr/station/38490005" }`
2. `{ name: "à INTERMARCHE APPRIEU", url: "https://www.prix-carburants.gouv.fr/station/38140005" }`
3. `{ name: "à SUPER U APPRIEU", url: "https://www.prix-carburants.gouv.fr/station/38690006" }`
4. `{ name: "à INTERMARCHE TAIN L'HERMITAGE", url: "https://www.prix-carburants.gouv.fr/station/26600007" }`
5. `{ name: "à SUPER U SAINT-DONAT", url: "https://www.prix-carburants.gouv.fr/station/26260001" }`

### Load behaviour

On load, the composable reads the station list from IndexedDB. If the stored list is absent or empty, it seeds the default list (see above) and writes it to IndexedDB before updating the reactive state. If the stored list is non-empty, it loads that list into the reactive state without modifying the stored data.

### Add behaviour

Adding a station appends it to the reactive list and persists the updated list to IndexedDB. The composable does not enforce uniqueness — the caller is responsible for deduplication if needed (out of scope for this issue).

### Remove behaviour

Removing a station is identified by URL. The composable removes the matching entry from the reactive list and persists the updated list to IndexedDB. If no station with the given URL exists, the operation is a no-op.

### Persistence key

The station list is stored under a single, consistent key in IndexedDB so it can always be retrieved and overwritten atomically.

## Edge Cases

- **Empty database on first load**: seeds the five default stations and reflects them in the reactive list. Subsequent reloads load from the stored data, not the defaults.
- **Database already populated**: loads the existing list unchanged; default seed is not applied again.
- **Remove a URL that does not exist**: the reactive list and IndexedDB remain unchanged.
- **Add to an existing list**: the new station is appended; no existing station is modified.
- **Concurrent calls to loadStations**: the module-level singleton means the reactive state is shared; multiple loads are permitted but must not corrupt the stored data (last write wins is acceptable).

## Example Mapping

### Story: User's station list persists across page reloads

**Rule: On first load with empty DB, seed defaults**

- Example: Browser has never visited the app → composable loads → reactive list contains the five default stations → those five stations are stored in IndexedDB.

**Rule: On subsequent loads, restore the stored list**

- Example: User added a sixth station in a previous session → composable loads → reactive list contains all six stations exactly as stored.

**Rule: Adding a station persists it**

- Example: User submits a new station name+URL → composable adds it → reactive list grows by one → IndexedDB reflects the new entry → page reload shows the new station.

**Rule: Removing a station persists the removal**

- Example: User removes station by URL → reactive list shrinks by one → IndexedDB no longer contains that entry → page reload confirms removal.

**Rule: Removing a non-existent URL is safe**

- Example: composable is asked to remove a URL not in the list → list unchanged → no error thrown.

status: ready
