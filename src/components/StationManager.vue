<script setup lang="ts">
/**
 * Object Calisthenics exception: seven composables are called at the top
 * level of setup() (beyond the two-instance-variable guideline) because this
 * component now also owns the "Actualiser les données" on-demand refresh
 * trigger and its confirmation step (issue #106) alongside the existing
 * "Enregistrer les modifications" trigger (issue #110) and, per the
 * composable-caller-responsibility convention, must call every composable
 * whose data or actions it needs itself — the same documented framework
 * exception as GitHubSyncSettings.vue.
 */
import { computed, ref } from 'vue'
import { usePreferencesImport } from '@/composables/usePreferencesImport'
import { useRemotePreferencesWrite } from '@/composables/useRemotePreferencesWrite'
import { useRemotePreferencesSync } from '@/composables/useRemotePreferencesSync'
import { useStationStorage } from '@/composables/useStationStorage'
import { useDefaultFuelType } from '@/composables/useDefaultFuelType'
import { useGitHubAuth } from '@/composables/useGitHubAuth'
import { useRepoConfig } from '@/composables/useRepoConfig'
import { buildPreferencesFile } from '@/utils/preferencesExport'
import { applyRemotePreferences as applyRemotePreferencesData } from '@/utils/applyRemotePreferences'
import type { PreferencesFile } from '@/types/preferences'

const { fuelTypeWarning, doOpenDialog } = usePreferencesImport()
const { hasPendingChanges, isWriting, pushPreferences } = useRemotePreferencesWrite()
const { isRefreshing, refreshNow, canRefreshNow } = useRemotePreferencesSync()
const { stations, replaceStations } = useStationStorage()
const { defaultFuelType, saveDefaultFuelType, clearDefaultFuelType } = useDefaultFuelType()
const { isAuthenticated, handleUnauthorized } = useGitHubAuth()
const { repoConfig } = useRepoConfig()

async function onSaveChanges(): Promise<void> {
  const preferences = buildPreferencesFile(stations.value, defaultFuelType.value)
  await pushPreferences(
    isAuthenticated.value,
    repoConfig.value,
    preferences,
    true,
    handleUnauthorized,
  )
}

// Rule 1: shown only when GitHub sync is fully configured and the user is
// authenticated — the exact condition syncOnLoad already checks, exposed by
// useRemotePreferencesSync so it is never re-derived here.
const canRefresh = computed(() => canRefreshNow(isAuthenticated.value, repoConfig.value))

// Rule 2: clicking "Actualiser les données" opens a confirmation prompt;
// nothing changes and no request is made until the user confirms.
const isRefreshDialogOpen = ref(false)

// Belt-and-braces guard mirroring the template's :disabled="hasPendingChanges"
// on the trigger button: a refresh discards the entire local station list
// (business-specifications.md rule 3), which would silently drop any edit
// not yet pushed to GitHub — the same edit "Enregistrer les modifications"
// exists to let the user push first.
function onOpenRefreshDialog(): void {
  if (hasPendingChanges.value) return
  isRefreshDialogOpen.value = true
}

function onCancelRefresh(): void {
  isRefreshDialogOpen.value = false
}

// The same applyRemotePreferences-style callback HomePageContent.vue passes
// to syncOnLoad (security-guidelines.md rule 2), built from this
// component's own already-in-scope setters — the rollback-on-failure logic
// itself lives once in @/utils/applyRemotePreferences, not duplicated here.
async function applyRemotePreferences(data: PreferencesFile): Promise<void> {
  await applyRemotePreferencesData(
    data,
    stations.value,
    replaceStations,
    saveDefaultFuelType,
    clearDefaultFuelType,
  )
}

async function onConfirmRefresh(): Promise<void> {
  isRefreshDialogOpen.value = false
  await refreshNow(
    isAuthenticated.value,
    repoConfig.value,
    applyRemotePreferences,
    handleUnauthorized,
  )
}
</script>

<template>
  <div class="station-manager">
    <h2 class="text-xl font-semibold mb-1">Gérer mes stations</h2>
    <p class="mb-4">
      Gérez votre liste de stations en renseignant un nom et le lien depuis
      <AppLink to="https://www.prix-carburants.gouv.fr/"
        >https://www.prix-carburants.gouv.fr/</AppLink
      >
    </p>
    <div class="flex gap-3 mb-4 flex-wrap">
      <PreferencesExport />
      <PreferencesImport />
      <Button v-if="hasPendingChanges" :disabled="isWriting" @click="onSaveChanges">
        {{ isWriting ? 'Enregistrement…' : 'Enregistrer les modifications' }}
      </Button>
      <Button
        v-if="canRefresh"
        variant="outline"
        :disabled="isRefreshing || hasPendingChanges"
        @click="onOpenRefreshDialog"
      >
        {{ isRefreshing ? 'Actualisation…' : 'Actualiser les données' }}
      </Button>
    </div>
    <!-- Explains why "Actualiser les données" is disabled: a refresh discards
         the local station list wholesale (business-specifications.md rule 3),
         which would silently drop these not-yet-pushed edits. -->
    <p v-if="canRefresh && hasPendingChanges" class="text-sm text-muted-foreground mb-4">
      Enregistrez ou annulez vos modifications en attente avant d'actualiser les données.
    </p>
    <!-- fuelTypeWarning is shown here so it appears below both export/import buttons,
         outside the PreferencesImport component's own layout. -->
    <p v-if="fuelTypeWarning && !doOpenDialog" role="alert" class="text-sm text-amber-600">
      {{ fuelTypeWarning }}
    </p>
    <details>
      <summary class="cursor-pointer mb-2">Afficher / masquer la liste</summary>
      <StationManagerTable />
    </details>
    <div class="mt-4">
      <Suspense>
        <GitHubSyncSettings />
        <template #fallback>
          <AppLoader />
        </template>
      </Suspense>
    </div>
    <PreferencesDiffDialog />

    <!-- Refresh confirmation (issue #106 rule 2): nothing changes and no
         request is made until the user confirms. Every value below renders
         through Vue's default text interpolation, never v-html. -->
    <Teleport to="body">
      <div
        v-if="isRefreshDialogOpen"
        role="dialog"
        aria-modal="true"
        aria-labelledby="refresh-dialog-title"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      >
        <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6 flex flex-col gap-4">
          <h2 id="refresh-dialog-title" class="text-lg font-semibold">Actualiser les données</h2>
          <p class="text-sm">
            Votre liste de stations et votre carburant par défaut vont être remplacés par la
            dernière version enregistrée sur GitHub.
          </p>
          <div class="flex justify-end gap-3 pt-2">
            <Button variant="outline" :disabled="isRefreshing" @click="onCancelRefresh"
              >Annuler</Button
            >
            <Button :disabled="isRefreshing" @click="onConfirmRefresh">
              {{ isRefreshing ? 'Actualisation…' : 'Confirmer' }}
            </Button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.station-manager {
  width: 100%;
}
</style>
