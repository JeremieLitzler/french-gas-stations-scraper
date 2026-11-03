<template>
  <GitHubReconnectNotice
    v-if="isReconnectNoticeVisible"
    :state="reconnectNoticeState"
    @cancel="onCancelAutoReconnect"
    @reconnect="login"
    @dismiss="isReconnectNoticeDismissed = true"
  />
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
import { AUTO_RECONNECT_DELAY_MS, useGitHubAuth } from '@/composables/useGitHubAuth'
import { useRepoConfig } from '@/composables/useRepoConfig'
import {
  ACCESS_REVOKED_MESSAGE,
  useRemotePreferencesSync,
} from '@/composables/useRemotePreferencesSync'
import { useRemotePreferencesWrite } from '@/composables/useRemotePreferencesWrite'
import { applyRemotePreferences as applyRemotePreferencesData } from '@/utils/applyRemotePreferences'
import type { PreferencesFile } from '@/types/preferences'
import type { OrgRestrictionNotice } from '@/types/org-restriction-notice'
import type { ReconnectNoticeState } from '@/types/github-reconnect'

const { stations, loadStations, replaceStations } = useStationStorage()
const { loadDefaultFuelType, saveDefaultFuelType, clearDefaultFuelType } = useDefaultFuelType()
const {
  isAuthenticated,
  initializeAuthState,
  handleUnauthorized,
  needsReconnect,
  canAutoReconnect,
  recordAutoReconnectAttempt,
  login,
} = useGitHubAuth()
const { repoConfig, loadRepoConfig } = useRepoConfig()
const { syncError, syncOnLoad } = useRemotePreferencesSync()
// Sub-Issue D's write-related banners (writeError/divergedNotice/writeSuccess)
// render here, alongside syncError, since HomePageContent is the common
// ancestor of both StationPrices and StationManager — the two subtrees whose
// mutations trigger a remote write (Sub-Issue D rule 1).
const { writeError, writeSuccess, divergedNotice } = useRemotePreferencesWrite()

// Auto-reconnect for a previously-authenticated user whose GitHub session
// expired (issue #158, ADR-018). The notice is reactive on needsReconnect, so
// it also appears after a 401 later in the session — but only the load
// sequence below ever starts the automatic countdown.
const reconnectNoticeState = ref<ReconnectNoticeState>('fallback')
// In-memory on purpose: a dismissed banner comes back on the next load.
const isReconnectNoticeDismissed = ref(false)
let autoReconnectTimer: ReturnType<typeof setTimeout> | null = null

const isReconnectNoticeVisible = computed(
  () => !isReconnectNoticeDismissed.value && needsReconnect(repoConfig.value),
)

function clearAutoReconnectTimer(): void {
  if (autoReconnectTimer === null) return
  clearTimeout(autoReconnectTimer)
  autoReconnectTimer = null
}

function onCancelAutoReconnect(): void {
  clearAutoReconnectTimer()
  reconnectNoticeState.value = 'fallback'
}

// The attempt is recorded before the countdown starts, so a cancel, a
// closed tab or a reload during the countdown all use it up. If it cannot be
// recorded, no countdown starts: without a persisted attempt the next load
// could redirect again, and the fallback banner still offers the reconnect.
// Failing here must not reject this component's async setup either, or the
// whole page would stay stuck behind its Suspense boundary.
async function prepareAutoReconnectCountdown(): Promise<boolean> {
  try {
    await recordAutoReconnectAttempt()
  } catch {
    return false
  }
  reconnectNoticeState.value = 'countdown'
  return true
}

// Started in onMounted, not during async setup: a setup that resolves but
// never mounts (route left while pending) never fires onUnmounted, so a
// timer armed in setup could still navigate away from an unrelated page.
function startAutoReconnectTimer(): void {
  autoReconnectTimer = setTimeout(login, AUTO_RECONNECT_DELAY_MS)
}

// The reconnect notice already says the session lapsed, so the duplicate
// "access revoked" strip is hidden while it shows; other sync errors are not.
const syncErrorText = computed(() => {
  if (typeof syncError.value !== 'string') return null
  if (isReconnectNoticeVisible.value && syncError.value === ACCESS_REVOKED_MESSAGE) return null
  return syncError.value
})
// syncError/writeError each carry either a plain string or an org-OAuth-
// restriction notice (issue #108) — split into typed computed refs here so
// the template never needs to narrow the union itself.
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
await Promise.all([initializeAuthState(), loadRepoConfig(), loadStations(), loadDefaultFuelType()])
// Must run after the loads above (needs isAuthenticated/repoConfig) and
// before StationPrices/StationManager render below, so every view mounts
// only once the final, synced station list is known (Sub-Issue C rule 8).
await syncOnLoad(
  isAuthenticated.value,
  repoConfig.value,
  applyRemotePreferences,
  handleUnauthorized,
)
// Placed after syncOnLoad because an expired cookie is only discovered by
// its 401; syncOnLoad returns early when the flag was already cleared, so
// this one check covers both cases (issue #158).
const isCountdownReady =
  canAutoReconnect(repoConfig.value) && (await prepareAutoReconnectCountdown())
onMounted(() => {
  if (isCountdownReady) startAutoReconnectTimer()
})
onUnmounted(clearAutoReconnectTimer)
</script>
