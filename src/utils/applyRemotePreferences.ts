import type { PreferencesFile } from '@/types/preferences'
import type { Station } from '@/types/station'
import { getPreferencesSyncedAt, restorePreferencesSyncedAt } from '@/utils/preferencesSyncTimestamp'

/**
 * Applies an already-fetched, already-shape-validated remote preferences
 * file through the existing `useStationStorage`/`useDefaultFuelType` setters
 * (security-guidelines.md, issue #106 rule 2) — never writes the remote
 * array/value directly into IndexedDB, so the setters' own origin allowlist
 * and HTML-tag stripping are always enforced.
 *
 * Shared by every caller of `useRemotePreferencesSync` (the on-load sync in
 * `HomePageContent.vue` and the on-demand refresh in `StationManager.vue`,
 * issue #106) so the rollback behaviour below has one implementation instead
 * of drifting between two call sites — a plain, stateless function taking
 * the caller's own setters as parameters, per Vue's composables guide:
 * reusable *pure logic* is a plain function, not a composable, when it needs
 * no lifecycle/reactive state of its own.
 *
 * The two setters below are independent IndexedDB writes, so a failure of
 * the second (default fuel) after the first (stations) already succeeded
 * would otherwise leave the station list replaced from remote while the
 * default fuel stays stale — contradicting the caller's error message, which
 * implies nothing changed. Rolling the station list back to its pre-merge
 * value on that failure restores the "local data unchanged" guarantee every
 * caller relies on.
 */
export async function applyRemotePreferences(
  data: PreferencesFile,
  previousStations: Station[],
  replaceStations: (stations: Station[]) => Promise<void>,
  saveDefaultFuelType: (label: string) => Promise<void>,
  clearDefaultFuelType: () => Promise<void>,
): Promise<void> {
  const previousSyncedAt = await getPreferencesSyncedAt()
  await replaceStations(data.favoriteStations)
  await applyDefaultFuelOrRollback(
    data.fuelTypeDefault,
    previousStations,
    previousSyncedAt,
    replaceStations,
    saveDefaultFuelType,
    clearDefaultFuelType,
  )
}

// Every setter called during the merge (replaceStations, saveDefaultFuelType,
// clearDefaultFuelType) marks the sync timestamp fresh as a side effect of
// its own contract for direct user edits. A rolled-back merge is neither
// that nor a successful remote read, so the rollback must also restore the
// pre-merge timestamp — otherwise a failed merge leaves IndexedDB looking
// freshly synced and the next staleness check skips retrying the fetch that
// just failed (security-guidelines.md, issue #106 rule 4).
async function applyDefaultFuelOrRollback(
  fuelTypeDefault: string | null,
  previousStations: Station[],
  previousSyncedAt: number | undefined,
  replaceStations: (stations: Station[]) => Promise<void>,
  saveDefaultFuelType: (label: string) => Promise<void>,
  clearDefaultFuelType: () => Promise<void>,
): Promise<void> {
  try {
    await applyDefaultFuel(fuelTypeDefault, saveDefaultFuelType, clearDefaultFuelType)
  } catch (error) {
    await replaceStations(previousStations)
    await restorePreferencesSyncedAt(previousSyncedAt)
    throw error
  }
}

async function applyDefaultFuel(
  fuelTypeDefault: string | null,
  saveDefaultFuelType: (label: string) => Promise<void>,
  clearDefaultFuelType: () => Promise<void>,
): Promise<void> {
  if (fuelTypeDefault === null) {
    await clearDefaultFuelType()
    return
  }
  await saveDefaultFuelType(fuelTypeDefault)
}
