<script setup lang="ts">
import { usePreferencesImport } from '@/composables/usePreferencesImport'

const { fuelTypeWarning, doOpenDialog } = usePreferencesImport()
</script>

<template>
  <div class="station-manager">
    <h2 class="text-xl font-semibold mb-1">Liste des stations</h2>
    <p class="mb-4">
      Gérez votre liste de stations en renseignant un nom et le lien depuis
      <AppLink href="https://www.prix-carburants.gouv.fr/" target="_blank" rel="noopener"
        >https://www.prix-carburants.gouv.fr/</AppLink
      >
    </p>
    <div class="flex gap-3 mb-4">
      <PreferencesExport />
      <PreferencesImport />
    </div>
    <!-- fuelTypeWarning is shown here so it appears below both export/import buttons,
         outside the PreferencesImport component's own layout. -->
    <p v-if="fuelTypeWarning && !doOpenDialog" role="alert" class="text-sm text-amber-600">
      {{ fuelTypeWarning }}
    </p>
    <details>
      <summary class="cursor-pointer mb-2">Afficher / masquer la liste</summary>
      <Suspense>
        <StationManagerTable />
        <template #fallback>
          <AppLoader />
        </template>
      </Suspense>
    </details>
    <PreferencesDiffDialog />
  </div>
</template>

<style scoped>
.station-manager {
  width: 100%;
}
</style>
