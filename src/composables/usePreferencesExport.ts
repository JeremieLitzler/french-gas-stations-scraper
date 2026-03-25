/**
 * Singleton composable orchestrating the export flow.
 *
 * Reads the current station list and default fuel type, serialises them
 * into the preferences JSON shape, and triggers a browser file download.
 *
 * Object Calisthenics exception: the composable function body exceeds five
 * lines because Vue composable conventions require grouping all returned
 * reactive state and operations in one function — documented framework
 * exception.
 */

import { ref } from 'vue'
import type { Ref } from 'vue'
import { buildPreferencesFile, downloadPreferencesFile } from '@/utils/preferencesExport'
import { useStationStorage } from '@/composables/useStationStorage'
import { useDefaultFuelType } from '@/composables/useDefaultFuelType'

// Module-level state — all consumers share the same reference (ADR-002).
const isExporting: Ref<boolean> = ref(false)

export function usePreferencesExport() {
  const { stations } = useStationStorage()
  const { defaultFuelType } = useDefaultFuelType()

  const exportPreferences = async (): Promise<void> => {
    isExporting.value = true
    const preferences = buildPreferencesFile(stations.value, defaultFuelType.value)
    downloadPreferencesFile(preferences)
    isExporting.value = false
  }

  return {
    isExporting,
    exportPreferences,
  }
}
