# Feature 2 — Reading and storing the preferences

## Purpose

Owns the preferences payload — the default fuel type plus the list of favorite stations — and where it lives. IndexedDB is the primary runtime store on every device. When the user is authenticated (Feature 1), the configured GitHub preferences file is the durable source that seeds or replaces IndexedDB on load, on a staleness schedule. This feature consumes an already-resolved repo config and auth state; it does not own the login flow or the config form.

## Implementing code

- `src/composables/useStationStorage.ts` — singleton; the reactive favorite-stations list; `load` / `addStation` / `updateStation` / `removeStation`; persists the whole list under one IndexedDB key.
- `src/composables/useDefaultFuelType.ts` — singleton; the default fuel type state and its IndexedDB persistence (also Feature 4).
- `src/composables/useRepoConfig.ts` — the three repo-config fields, persisted to IndexedDB (shared with Feature 1).
- `src/composables/useRemotePreferencesSync.ts` — on-load staleness check, remote read via the proxy, merge into IndexedDB (shared with Feature 7).
- `src/utils/indexedDb.ts` — Promise-based `get` / `set` / `remove` wrapper; the only path to the database (ADR-008).
- `src/utils/preferencesSyncTimestamp.ts` — reads/writes the last-successful-sync timestamp.
- `src/utils/applyRemotePreferences.ts` — validates a remote `PreferencesFile` and replaces the IndexedDB station list and default.
- `netlify/functions/github-api-proxy/` — proxies GitHub Contents API reads/writes with the cookie token; rejects a request whose `owner/repo` does not match the stored config (SSRF guard).
- `netlify/functions/lib/githubContentsClient.ts` — GitHub Contents API client (`GET` / `PUT` with `sha`).
- `src/components/EmptyStationsMessage.vue` — the "Aucune station pour le moment" empty state.
- `src/types/preferences.ts` (`PreferencesFile`), `src/types/repo-config.ts` (`RepoConfig`), `src/types/station.ts` (`Station`).

## Behaviour & rules

**Payload shape.** `{ "fuelTypeDefault": string | null, "favoriteStations": [{ "name": string, "url": string }] }` — the "preferences file". Repo config (`owner`, `repo`, `revalidate-cache-days`) is never part of it; those live only in IndexedDB.

**Unauthenticated.** IndexedDB is the whole story — one device, no remote. The list persists across reloads and sessions under a single key, overwritten atomically.

**Authenticated, on load.** If repo config is present, the age of the IndexedDB data is compared against `revalidate-cache-days` (default 7). Younger than the threshold: IndexedDB is used as-is, the remote is not consulted. Older, or absent: the GitHub file is fetched via the Netlify proxy and its `favoriteStations` + `fuelTypeDefault` replace the IndexedDB data, then the timestamp is reset to now. Every user-triggered change (add/edit/delete station, change default) also resets the timestamp.

**Remote file validation.** Both keys must be present. `fuelTypeDefault` of `null` or `""`, and an empty `favoriteStations` array, are all valid — they mean "nothing chosen / saved yet", not an error, and do not block the merge. The whole read is rejected — IndexedDB left untouched, a distinct "remote file is invalid" message shown — if a key is entirely absent, `fuelTypeDefault` is present but neither `null` nor a string, or any station fails the same name/URL validation as Feature 5. That message is deliberately not the re-authentication prompt, since re-auth would not fix a malformed file. Accepting the valid parts of a malformed file is tracked in issue #105, out of scope here.

**Failure handling.** A network error, 404, or 401 on the remote read asks the user to re-authenticate. If access has been revoked and the user declines, the cookie is cleared and a banner states that GitHub access was revoked and IndexedDB data is in use.

**No seed list.** The app never seeds an example station list, for any user, configured or not — this replaced the former hardcoded starter list entirely. If the list is still empty once load has fully resolved (including any sync attempt), every view that shows stations displays "Aucune station pour le moment" and invites adding one via the Station Manager.

**No stale intermediate render.** A view must not render the station list before it is known whether a sync will change it, and once a sync completes no view keeps showing pre-sync data — even briefly (ADR-013).

## Related ADRs

- [ADR-008](../../decisions/ADR-008-client-side-storage.md) — IndexedDB over localStorage for client-side persistence.
- [ADR-012](../../decisions/ADR-012-github-repo-as-sync-backend.md) — user-owned GitHub repository as the remote sync backend.
- [ADR-013](../../decisions/ADR-013-page-level-load-orchestrator.md) — page-level load orchestrator for shared singleton state under async mutation.
- [ADR-002](../../decisions/adr-002-state-management.md) — singleton composable for shared state.

## See also

- **Feature 1** provides the resolved repo config and auth state this feature branches on.
- **Feature 7** reuses this feature's remote-read-and-merge path, on demand instead of on a staleness schedule.
- **Feature 9** reads and writes the same `PreferencesFile` shape, to a local file instead of GitHub.
- **Feature 5** owns the station name/URL validation this feature applies to a remote file.
- **Feature 4** owns the default fuel type value that travels in the payload.

_Source specs (in git history): `issue-64` sub-issues C, D, F; `issue-15`; `issue-108`._
