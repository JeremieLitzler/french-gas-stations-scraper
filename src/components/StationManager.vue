<script setup lang="ts">
/**
 * Object Calisthenics exception: six composables are called at the top level
 * of setup() (beyond the two-instance-variable guideline) because this
 * component now owns the "Enregistrer les modifications" trigger (issue
 * #110) and, per the composable-caller-responsibility convention, must call
 * every composable whose data or actions it needs itself — the same
 * documented framework exception as GitHubSyncSettings.vue.
 */
import { usePreferencesImport } from '@/composables/usePreferencesImport'
import { useRemotePreferencesWrite } from '@/composables/useRemotePreferencesWrite'
import { useStationStorage } from '@/composables/useStationStorage'
import { useDefaultFuelType } from '@/composables/useDefaultFuelType'
import { useGitHubAuth } from '@/composables/useGitHubAuth'
import { useRepoConfig } from '@/composables/useRepoConfig'
import { buildPreferencesFile } from '@/utils/preferencesExport'

const { fuelTypeWarning, doOpenDialog } = usePreferencesImport()
const { hasPendingChanges, isWriting, pushPreferences } = useRemotePreferencesWrite()
const { stations } = useStationStorage()
const { defaultFuelType } = useDefaultFuelType()
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
</script>

<template>
  <div class="station-manager">
    <h2 class="text-xl font-semibold mb-1">Gérer mes stations</h2>
    <p class="mb-4">
      Gérez votre liste de stations en renseignant un nom et le lien depuis
      <AppLink href="https://www.prix-carburants.gouv.fr/" target="_blank" rel="noopener"
        >https://www.prix-carburants.gouv.fr/</AppLink
      >
    </p>
    <div class="flex gap-3 mb-4 flex-wrap">
      <PreferencesExport />
      <PreferencesImport />
      <Button v-if="hasPendingChanges" :disabled="isWriting" @click="onSaveChanges">
        {{ isWriting ? 'Enregistrement…' : 'Enregistrer les modifications' }}
      </Button>
    </div>
    <!-- fuelTypeWarning is shown here so it appears below both export/import buttons,
         outside the PreferencesImport component's own layout. -->
    <p v-if="fuelTypeWarning && !doOpenDialog" role="alert" class="text-sm text-amber-600">
      {{ fuelTypeWarning }}
    </p>
    <details>
      <summary class="cursor-pointer mb-2">Afficher / masquer la liste</summary>
      <StationManagerTable />
    </details>
    <PreferencesDiffDialog />
  </div>
</template>

<style scoped>
.station-manager {
  width: 100%;
}
</style>
