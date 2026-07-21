<template>
  <p v-if="syncError" role="alert" class="text-sm text-amber-700 mb-2">{{ syncError }}</p>
  <p v-if="writeError" role="alert" class="text-sm text-red-700 mb-2">{{ writeError }}</p>
  <p v-if="divergedNotice" role="status" class="text-sm text-amber-700 mb-2">
    {{ divergedNotice }}
  </p>
  <p v-if="writeSuccess" role="status" class="text-sm text-green-700 mb-2">
    Préférences enregistrées sur GitHub.
  </p>
  <StationPrices />
  <StationManager />
</template>

<script async setup lang="ts">
/**
 * Centralizes "on application load" (business-specifications.md Sub-Issue C,
 * issue #64) in one place: auth state, repo config, the station list, the
 * default fuel type, and any remote GitHub sync all resolve here, once,
 * before StationPrices/StationManager ever mount. This closes the race
 * documented in spec-review.md (sub-issue-85) where StationManagerTable.vue
 * loaded stations independently of StationPricesContent.vue's remote sync —
 * neither child component exists in the DOM until this component's own
 * <Suspense> boundary (in index.vue) resolves, so neither can render a
 * pre-sync station list (Sub-Issue C rule 8).
 *
 * Object Calisthenics exception: the async setup body exceeds five lines
 * because Vue composable/component conventions require grouping the
 * application-load sequence in one place — documented framework exception
 * (see useGitHubAuth.ts, useRepoConfig.ts, useStationStorage.ts).
 */

// StationPrices is imported explicitly, unlike every other auto-imported
// component in this codebase (CLAUDE.md), because unplugin-vue-components
// does not reliably resolve it as a static binding when referenced from
// this file specifically — leaving it to auto-import causes Vue to fall
// back to runtime component resolution here, which real-world testing
// (HomePageContent.spec.ts, C-17) showed renders the genuine StationPrices
// subtree (with its own network-calling children) instead of the intended
// component. StationManager does not exhibit this and is left auto-imported.
import StationPrices from './StationPrices.vue'
import { useStationStorage } from '@/composables/useStationStorage'
import { useDefaultFuelType } from '@/composables/useDefaultFuelType'
import { useGitHubAuth } from '@/composables/useGitHubAuth'
import { useRepoConfig } from '@/composables/useRepoConfig'
import { useRemotePreferencesSync } from '@/composables/useRemotePreferencesSync'
import { useRemotePreferencesWrite } from '@/composables/useRemotePreferencesWrite'
import { getPreferencesSyncedAt, restorePreferencesSyncedAt } from '@/utils/preferencesSyncTimestamp'
import type { PreferencesFile } from '@/types/preferences'
import type { Station } from '@/types/station'

const { stations, loadStations, replaceStations } = useStationStorage()
const { loadDefaultFuelType, saveDefaultFuelType, clearDefaultFuelType } = useDefaultFuelType()
const { isAuthenticated, initializeAuthState, handleUnauthorized } = useGitHubAuth()
const { repoConfig, loadRepoConfig } = useRepoConfig()
const { syncError, syncOnLoad } = useRemotePreferencesSync()
// Sub-Issue D's write-related banners (writeError/divergedNotice/writeSuccess)
// render here, alongside syncError, since HomePageContent is the common
// ancestor of both StationPrices and StationManager — the two subtrees whose
// mutations trigger a remote write (Sub-Issue D rule 1).
const { writeError, writeSuccess, divergedNotice } = useRemotePreferencesWrite()

// Applies a merged remote read (Sub-Issue C, issue #64) through
// useStationStorage/useDefaultFuelType's own setters, per the
// composable-caller-responsibility convention — useRemotePreferencesSync
// never calls those composables itself.
//
// The two setters below are independent IndexedDB writes, so a failure of
// the second (default fuel) after the first (stations) already succeeded
// would otherwise leave the station list replaced from remote while the
// default fuel stays stale — contradicting useRemotePreferencesSync's
// syncError message, which implies nothing changed (review-results.md,
// sub-issue-85). Rolling the station list back to its pre-merge value on
// that failure restores the "local data unchanged" guarantee the caller
// already relies on.
async function applyRemotePreferences(data: PreferencesFile): Promise<void> {
  const previousStations = stations.value
  const previousSyncedAt = await getPreferencesSyncedAt()
  await replaceStations(data.favoriteStations)
  await applyDefaultFuelOrRollback(data.fuelTypeDefault, previousStations, previousSyncedAt)
}

// Every setter called during the merge (replaceStations, saveDefaultFuelType,
// clearDefaultFuelType) marks the sync timestamp fresh as a side effect of its
// own contract for direct user edits (Sub-Issue C rule 5). A rolled-back merge
// is neither that nor a successful remote read (rule 4), so the rollback must
// also restore the pre-merge timestamp — otherwise the failed merge leaves
// IndexedDB looking freshly synced and the next load skips retrying the fetch
// that just failed (review-results.md, sub-issue-85, second pass).
async function applyDefaultFuelOrRollback(
  fuelTypeDefault: string | null,
  previousStations: Station[],
  previousSyncedAt: number | undefined,
): Promise<void> {
  try {
    await applyDefaultFuel(fuelTypeDefault)
  } catch (error) {
    await replaceStations(previousStations)
    await restorePreferencesSyncedAt(previousSyncedAt)
    throw error
  }
}

async function applyDefaultFuel(fuelTypeDefault: string | null): Promise<void> {
  if (fuelTypeDefault === null) {
    await clearDefaultFuelType()
    return
  }
  await saveDefaultFuelType(fuelTypeDefault)
}

// The auth flag, repo config, station list, and default fuel type live under
// separate IndexedDB keys with no data dependency between them, so loading
// them in parallel is safe.
await Promise.all([
  initializeAuthState(),
  loadRepoConfig(),
  loadStations(),
  loadDefaultFuelType(),
])
// Must run after the loads above (needs isAuthenticated/repoConfig) and
// before StationPrices/StationManager render below, so every view mounts
// only once the final, synced station list is known (Sub-Issue C rule 8).
await syncOnLoad(isAuthenticated.value, repoConfig.value, applyRemotePreferences, handleUnauthorized)
</script>
