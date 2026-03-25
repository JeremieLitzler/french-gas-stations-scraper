/**
 * Singleton composable orchestrating the import flow.
 *
 * Responsibilities:
 * 1. Read and validate the user-selected file.
 * 2. Compute the diff against the current IndexedDB state.
 * 3. Apply the resolved user choices to IndexedDB via the existing
 *    useStationStorage and useDefaultFuelType composables.
 *
 * Object Calisthenics exception: the composable function body exceeds five
 * lines because Vue composable conventions require grouping all returned
 * reactive state and operations in one function — documented framework
 * exception.
 */

import { ref } from 'vue'
import type { Ref } from 'vue'
import type { PreferencesDiff, StationDiffRow } from '@/types/preferences'
import { isFileSizeAcceptable, parseJsonFile, computeDiff } from '@/utils/preferencesImport'

// Module-level state — all consumers share the same reference (ADR-002).
const diff: Ref<PreferencesDiff | null> = ref(null)
const importError: Ref<string | null> = ref(null)
const importSuccess: Ref<boolean> = ref(false)
const isDialogOpen: Ref<boolean> = ref(false)

export function usePreferencesImport() {
  /**
   * Validate the file and compute the diff.
   * Called by the component after the user selects a file.
   * Stations and fuelType are passed in by the caller (ADR — composable caller responsibility).
   */
  const handleFileSelected = async (
    file: File,
    storedStations: import('@/types/station').Station[],
    storedFuelType: string | null,
  ): Promise<void> => {
    resetState()
    if (!isFileSizeAcceptable(file)) {
      importError.value = 'Le fichier est trop volumineux (limite : 1 Mo).'
      return
    }
    const text = await file.text()
    const parsed = parseJsonFile(text)
    if (parsed === null) {
      importError.value = 'Le fichier est invalide ou ne correspond pas au format attendu.'
      return
    }
    const computed = computeDiff(parsed, storedStations, storedFuelType)
    if (computed === null) {
      importError.value = 'Aucun changement détecté — le fichier est identique à vos préférences actuelles.'
      return
    }
    diff.value = computed
    isDialogOpen.value = true
  }

  /**
   * Apply the resolved diff to IndexedDB.
   * addStation and updateStation/updateDefaultFuelType are passed in by the caller.
   */
  const applyDiff = async (
    addStation: (station: import('@/types/station').Station) => Promise<void>,
    updateStation: (originalUrl: string, updated: import('@/types/station').Station) => Promise<void>,
    saveDefaultFuelType: (label: string) => Promise<void>,
    clearDefaultFuelType: () => Promise<void>,
  ): Promise<void> => {
    if (diff.value === null) return
    await applyStationRows(diff.value.stationRows, addStation, updateStation)
    await applyFuelType(diff.value.fuelTypeDiff, saveDefaultFuelType, clearDefaultFuelType)
    isDialogOpen.value = false
    diff.value = null
    importSuccess.value = true
  }

  const cancelImport = (): void => {
    isDialogOpen.value = false
    diff.value = null
    importSuccess.value = false
  }

  const resetState = (): void => {
    importError.value = null
    importSuccess.value = false
    diff.value = null
    isDialogOpen.value = false
  }

  return {
    diff,
    importError,
    importSuccess,
    isDialogOpen,
    handleFileSelected,
    applyDiff,
    cancelImport,
    resetState,
  }
}

async function applyStationRows(
  rows: StationDiffRow[],
  addStation: (station: import('@/types/station').Station) => Promise<void>,
  updateStation: (originalUrl: string, updated: import('@/types/station').Station) => Promise<void>,
): Promise<void> {
  for (const row of rows) {
    await applyStationRow(row, addStation, updateStation)
  }
}

async function applyStationRow(
  row: StationDiffRow,
  addStation: (station: import('@/types/station').Station) => Promise<void>,
  updateStation: (originalUrl: string, updated: import('@/types/station').Station) => Promise<void>,
): Promise<void> {
  if (row.kind === 'new') {
    if (!row.selected) return
    await addStation(row.fileStation)
    return
  }
  if (row.chosenName === 'file') {
    await updateStation(row.url, row.fileStation)
    return
  }
  // chosenName === 'stored': no write needed — keep existing IndexedDB value
}

async function applyFuelType(
  fuelTypeDiff: import('@/types/preferences').FuelTypeDiff | null,
  saveDefaultFuelType: (label: string) => Promise<void>,
  clearDefaultFuelType: () => Promise<void>,
): Promise<void> {
  if (fuelTypeDiff === null) return
  if (fuelTypeDiff.chosen === 'stored') return
  if (fuelTypeDiff.chosen === 'file') {
    await applyChosenFuelType(fuelTypeDiff.fileValue, saveDefaultFuelType, clearDefaultFuelType)
  }
}

async function applyChosenFuelType(
  fileValue: string | null,
  saveDefaultFuelType: (label: string) => Promise<void>,
  clearDefaultFuelType: () => Promise<void>,
): Promise<void> {
  if (fileValue === null) {
    await clearDefaultFuelType()
    return
  }
  await saveDefaultFuelType(fileValue)
}
