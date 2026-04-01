<script setup lang="ts">
import { usePreferencesImport } from '@/composables/usePreferencesImport'
import { useStationStorage } from '@/composables/useStationStorage'
import { useDefaultFuelType } from '@/composables/useDefaultFuelType'
import { useStationPrices } from '@/composables/useStationPrices'
import { useKnownFuelTypes } from '@/composables/useKnownFuelTypes'
import { fetchFuelTypesForUrl } from '@/utils/stationFetcher'

const { stations } = useStationStorage()
const { defaultFuelType } = useDefaultFuelType()
const { results } = useStationPrices()
const { knownFuelTypes } = useKnownFuelTypes(results)
const { importError, importSuccess, isImporting, handleFileSelected } = usePreferencesImport()

const onFileChange = async (event: Event): Promise<void> => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const fetchedUrls = results.value.map((stationData) => stationData.url)
  await handleFileSelected(
    file,
    stations.value,
    defaultFuelType.value,
    knownFuelTypes.value,
    fetchedUrls,
    fetchFuelTypesForUrl,
  )
  // Reset input so the same file can be re-selected after an error
  input.value = ''
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <!-- Use a styled label as the visible trigger for the hidden file input.
           A plain <label> is used (not a <button> inside a <label>) to avoid
           nesting interactive elements, which is invalid HTML. -->
    <label
      for="importPreferences"
      :class="[
        'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium h-9 px-4 py-2 bg-cta-base text-cta-neutral-light shadow focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-cta-darker',
        isImporting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-cta-darker cursor-pointer',
      ]"
    >
      {{ isImporting ? 'Importation en cours...' : 'Importer des préférences' }}
    </label>
    <input
      id="importPreferences"
      type="file"
      accept=".json,application/json"
      class="sr-only"
      :disabled="isImporting"
      @change="onFileChange"
    />
    <p v-if="importError" role="alert" class="text-sm text-red-600">{{ importError }}</p>
    <!-- fuelTypeWarning is shown inside PreferencesDiffDialog when the dialog is open;
           this fallback covers the edge case where validation warns but no diff is computed. -->
    <p v-if="importSuccess" role="status" class="text-sm text-green-600">
      Préférences importées avec succès.
    </p>
  </div>
</template>
