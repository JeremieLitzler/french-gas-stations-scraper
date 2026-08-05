<template>
  <p v-if="syncErrorText" role="alert" class="text-sm text-amber-700 mb-2">{{ syncErrorText }}</p>
  <p v-else-if="syncErrorOrgRestriction" role="alert" class="text-sm text-amber-700 mb-2">
    <OrgRestrictionNotice :owner="syncErrorOrgRestriction.owner" />
  </p>
  <p v-if="writeErrorText" role="alert" class="text-sm text-red-700 mb-2">{{ writeErrorText }}</p>
  <p v-else-if="writeErrorOrgRestriction" role="alert" class="text-sm text-red-700 mb-2">
    <OrgRestrictionNotice :owner="writeErrorOrgRestriction.owner" />
  </p>
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
import { computed } from 'vue'
import StationPrices from './StationPrices.vue'
import { useStationStorage } from '@/composables/useStationStorage'
import { useDefaultFuelType } from '@/composables/useDefaultFuelType'
import { useGitHubAuth } from '@/composables/useGitHubAuth'
import { useRepoConfig } from '@/composables/useRepoConfig'
import { useRemotePreferencesSync } from '@/composables/useRemotePreferencesSync'
import { useRemotePreferencesWrite } from '@/composables/useRemotePreferencesWrite'
import { applyRemotePreferences as applyRemotePreferencesData } from '@/utils/applyRemotePreferences'
import type { PreferencesFile } from '@/types/preferences'
import type { OrgRestrictionNotice } from '@/types/org-restriction-notice'

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

// syncError/writeError each carry either a plain string or an org-OAuth-
// restriction notice (issue #108) — split into typed computed refs here so
// the template never needs to narrow the union itself.
const syncErrorText = computed(() => (typeof syncError.value === 'string' ? syncError.value : null))
const syncErrorOrgRestriction = computed<OrgRestrictionNotice | null>(() =>
  typeof syncError.value === 'object' ? syncError.value : null,
)
const writeErrorText = computed(() =>
  typeof writeError.value === 'string' ? writeError.value : null,
)
const writeErrorOrgRestriction = computed<OrgRestrictionNotice | null>(() =>
  typeof writeError.value === 'object' ? writeError.value : null,
)

// Applies a merged remote read (Sub-Issue C, issue #64) through
// useStationStorage/useDefaultFuelType's own setters, per the
// composable-caller-responsibility convention — useRemotePreferencesSync
// never calls those composables itself. The rollback-on-failure logic is
// shared with StationManager.vue's on-demand refresh (issue #106) via
// @/utils/applyRemotePreferences, rather than duplicated here.
async function applyRemotePreferences(data: PreferencesFile): Promise<void> {
  await applyRemotePreferencesData(
    data,
    stations.value,
    replaceStations,
    saveDefaultFuelType,
    clearDefaultFuelType,
  )
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
