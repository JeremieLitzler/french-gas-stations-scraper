/**
 * Singleton composable orchestrating the import flow.
 *
 * Responsibilities:
 * 1. Read and validate the user-selected file.
 * 2. Perform async fuel-type validation against the known fuel types list.
 * 3. Compute the diff against the current IndexedDB state.
 * 4. Apply the resolved user choices to IndexedDB via the existing
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
import {
  isFileSizeAcceptable,
  parseJsonFile,
  computeDiff,
  isAllowedStationUrl,
  normalizeUrl,
} from '@/utils/preferencesImport'

const FUEL_TYPE_WARNING_MESSAGE =
  "Le type de carburant par défaut de votre fichier n'existe dans aucune station. La valeur en mémoire de l'application est conservé."

const SAFE_FUEL_TYPE_PATTERN = /^[A-Za-z0-9\- ]+$/

// Module-level state — all consumers share the same reference (ADR-002).
const diff: Ref<PreferencesDiff | null> = ref(null)
const importError: Ref<string | null> = ref(null)
const importSuccess: Ref<boolean> = ref(false)
const doOpenDialog: Ref<boolean> = ref(false)
const fuelTypeWarning: Ref<string | null> = ref(null)
const isImporting: Ref<boolean> = ref(false)

export function usePreferencesImport() {
  /**
   * Validate the file, perform async fuel-type check, and compute the diff.
   * Called by the component after the user selects a file.
   * Stations, fuelType, knownFuelTypes, fetchedUrls, and the extra fetch
   * function are passed in by the caller (composable caller responsibility).
   */
  const handleFileSelected = async (
    file: File,
    storedStations: import('@/types/station').Station[],
    storedFuelType: string | null,
    knownFuelTypes: string[],
    fetchedUrls: string[],
    fetchFuelTypesForUrl: (url: string) => Promise<string[]>,
  ): Promise<void> => {
    resetState()
    isImporting.value = true
    try {
      await runImportFlow(
        file,
        storedStations,
        storedFuelType,
        knownFuelTypes,
        fetchedUrls,
        fetchFuelTypesForUrl,
      )
    } finally {
      isImporting.value = false
    }
  }

  /**
   * Apply the resolved diff to IndexedDB.
   * addStation and updateStation/updateDefaultFuelType are passed in by the caller.
   */
  const applyDiff = async (
    addStation: (station: import('@/types/station').Station) => Promise<void>,
    updateStation: (
      originalUrl: string,
      updated: import('@/types/station').Station,
    ) => Promise<void>,
    saveDefaultFuelType: (label: string) => Promise<void>,
    clearDefaultFuelType: () => Promise<void>,
  ): Promise<void> => {
    if (diff.value === null) return
    await applyStationRows(diff.value.stationRows, addStation, updateStation)
    await applyFuelType(diff.value.fuelTypeDiff, saveDefaultFuelType, clearDefaultFuelType)
    doOpenDialog.value = false
    diff.value = null
    importSuccess.value = true
  }

  const cancelImport = (): void => {
    doOpenDialog.value = false
    diff.value = null
    importSuccess.value = false
    fuelTypeWarning.value = null
  }

  const resetState = (): void => {
    importError.value = null
    importSuccess.value = false
    diff.value = null
    doOpenDialog.value = false
    fuelTypeWarning.value = null
  }

  return {
    diff,
    importError,
    importSuccess,
    doOpenDialog,
    fuelTypeWarning,
    isImporting,
    handleFileSelected,
    applyDiff,
    cancelImport,
    resetState,
  }
}

async function runImportFlow(
  file: File,
  storedStations: import('@/types/station').Station[],
  storedFuelType: string | null,
  knownFuelTypes: string[],
  fetchedUrls: string[],
  fetchFuelTypesForUrl: (url: string) => Promise<string[]>,
): Promise<void> {
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
  const resolvedFuelType = await resolveFuelTypeDefault(
    parsed.fuelTypeDefault,
    storedFuelType,
    knownFuelTypes,
    fetchedUrls,
    parsed.favoriteStations.map((station) => station.url),
    fetchFuelTypesForUrl,
  )
  const computed = computeDiff(
    { ...parsed, fuelTypeDefault: resolvedFuelType.accepted },
    storedStations,
    storedFuelType,
  )
  if (resolvedFuelType.warned) {
    fuelTypeWarning.value = FUEL_TYPE_WARNING_MESSAGE
  }
  if (computed === null) {
    if (!resolvedFuelType.warned) {
      importError.value =
        'Aucun changement détecté — le fichier est identique à vos préférences actuelles.'
    }
    return
  }
  diff.value = computed
  doOpenDialog.value = true
}

type FuelTypeResolution = { accepted: string | null; warned: boolean }

function isSafeFuelTypeString(value: string): boolean {
  return SAFE_FUEL_TYPE_PATTERN.test(value)
}

async function collectExtraFuelTypes(
  importFileUrls: string[],
  alreadyFetchedUrls: string[],
  fetchFuelTypesForUrl: (url: string) => Promise<string[]>,
): Promise<string[]> {
  const fetchedSet = new Set(alreadyFetchedUrls.map(normalizeUrl))
  const urlsToFetch = importFileUrls.filter(
    (url) => !fetchedSet.has(normalizeUrl(url)) && isAllowedStationUrl(url),
  )
  const settledResults = await Promise.allSettled(urlsToFetch.map(fetchFuelTypesForUrl))
  return settledResults.flatMap((settled) => {
    if (settled.status === 'fulfilled' && Array.isArray(settled.value)) return settled.value
    return []
  })
}

async function resolveFuelTypeDefault(
  fileValue: string | null,
  storedValue: string | null,
  knownFuelTypes: string[],
  alreadyFetchedUrls: string[],
  importFileUrls: string[],
  fetchFuelTypesForUrl: (url: string) => Promise<string[]>,
): Promise<FuelTypeResolution> {
  if (fileValue === null) return { accepted: null, warned: false }
  if (!isSafeFuelTypeString(fileValue)) return { accepted: storedValue, warned: true }
  const allKnown = new Set(knownFuelTypes)
  if (allKnown.has(fileValue)) return { accepted: fileValue, warned: false }
  const extraFuelTypes = await collectExtraFuelTypes(
    importFileUrls,
    alreadyFetchedUrls,
    fetchFuelTypesForUrl,
  )
  const expanded = new Set([...allKnown, ...extraFuelTypes])
  if (expanded.has(fileValue)) return { accepted: fileValue, warned: false }
  return { accepted: storedValue, warned: true }
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
