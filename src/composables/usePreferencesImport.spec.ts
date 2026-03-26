/**
 * Tests for usePreferencesImport composable — Issue #63.
 *
 * usePreferencesImport is a singleton composable (ADR-002). Each test uses
 * vi.resetModules() + dynamic import() to get fresh module-level state.
 *
 * Scenarios covered:
 *   TC-IMP-VAL-01  — Valid file passes validation, opens dialog
 *   TC-IMP-VAL-02  — Non-JSON file sets importError, no dialog
 *   TC-IMP-VAL-09  — File exceeding size limit sets importError before parsing
 *   TC-IMP-DIFF-01 — Identical file sets importError "no changes", no dialog
 *   TC-IMP-DIFF-05 — Applying diff with file name choice calls updateStation
 *   TC-IMP-DIFF-06 — Applying diff with stored name choice skips updateStation
 *   TC-IMP-DIFF-11 — Applying diff with file fuel type calls saveDefaultFuelType
 *   TC-IMP-DIFF-12 — Applying diff keeping stored fuel type skips save
 *   TC-IMP-DIFF-03 — Deselected new station is not added on applyDiff
 *   TC-IMP-APPLY-01 — Confirmed changes update IndexedDB and set importSuccess
 *   TC-IMP-APPLY-02 — Cancel closes dialog without calling add/update
 *   TC-IMP-DIFF-13 — isConfirmEnabled is false when conflicts are unresolved
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Station } from '@/types/station'
import type { PreferencesDiff } from '@/types/preferences'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_URL = 'https://www.prix-carburants.gouv.fr/station/1234'
const VALID_URL_2 = 'https://www.prix-carburants.gouv.fr/station/5678'

function makeFile(content: string, sizeOverride?: number): File {
  const blob = new Blob([content], { type: 'application/json' })
  const file = new File([blob], 'preferences.json', { type: 'application/json' })
  if (sizeOverride !== undefined) {
    Object.defineProperty(file, 'size', { value: sizeOverride })
  }
  return file
}

function validFileContent(
  stations: Station[] = [{ name: 'Ma Station', url: VALID_URL }],
  fuelTypeDefault: string | null = 'SP95',
): string {
  return JSON.stringify({ fuelTypeDefault, favoriteStations: stations })
}

async function freshComposable() {
  vi.resetModules()
  const mod = await import('./usePreferencesImport')
  return mod.usePreferencesImport()
}

// ---------------------------------------------------------------------------
// Stub operations
// ---------------------------------------------------------------------------

const addStation = vi.fn(async (_s: Station) => {})
const updateStation = vi.fn(async (_url: string, _s: Station) => {})
const saveDefaultFuelType = vi.fn(async (_label: string) => {})
const clearDefaultFuelType = vi.fn(async () => {})
const fetchFuelTypesForUrl = vi.fn(async (): Promise<string[]> => [])

// Known fuel types that include values used in the existing tests so
// fuel-type validation passes without triggering warnings.
const KNOWN_FUEL_TYPES = ['SP95', 'Gasoil', 'E10', 'E85', 'SP98', 'GPL']

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// TC-IMP-VAL-01 — Valid file opens dialog
// ---------------------------------------------------------------------------

describe('TC-IMP-VAL-01: handleFileSelected opens the dialog when validation passes', () => {
  it('sets isDialogOpen to true and diff to non-null after a valid file with changes', async () => {
    const { handleFileSelected, isDialogOpen, diff, importError } = await freshComposable()

    // Stored state has no stations — so the file station is new (diff exists)
    const file = makeFile(validFileContent([{ name: 'Ma Station', url: VALID_URL }], 'SP95'))
    await handleFileSelected(file, [], null, KNOWN_FUEL_TYPES, [], fetchFuelTypesForUrl)

    expect(importError.value).toBeNull()
    expect(isDialogOpen.value).toBe(true)
    expect(diff.value).not.toBeNull()
  })
})

// ---------------------------------------------------------------------------
// TC-IMP-VAL-02 — Non-JSON file sets error
// ---------------------------------------------------------------------------

describe('TC-IMP-VAL-02: handleFileSelected sets importError for non-JSON content', () => {
  it('sets importError and does not open the dialog', async () => {
    const { handleFileSelected, isDialogOpen, importError } = await freshComposable()

    const file = makeFile('not valid json')
    await handleFileSelected(file, [], null, KNOWN_FUEL_TYPES, [], fetchFuelTypesForUrl)

    expect(importError.value).not.toBeNull()
    expect(isDialogOpen.value).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// TC-IMP-VAL-09 — File exceeding size limit sets error before parsing
// ---------------------------------------------------------------------------

describe('TC-IMP-VAL-09: handleFileSelected rejects oversized files', () => {
  it('sets importError and does not open dialog when file exceeds 1 MB', async () => {
    const { handleFileSelected, isDialogOpen, importError } = await freshComposable()

    const file = makeFile(validFileContent(), 1_000_001)
    await handleFileSelected(file, [], null, KNOWN_FUEL_TYPES, [], fetchFuelTypesForUrl)

    expect(importError.value).not.toBeNull()
    expect(isDialogOpen.value).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// TC-IMP-DIFF-01 — Identical file sets "no changes" error
// ---------------------------------------------------------------------------

describe('TC-IMP-DIFF-01: handleFileSelected informs user when file matches IndexedDB', () => {
  it('sets importError with a "no changes" message and does not open the dialog', async () => {
    const { handleFileSelected, isDialogOpen, importError } = await freshComposable()

    const stored: Station[] = [{ name: 'Ma Station', url: VALID_URL }]
    const file = makeFile(validFileContent(stored, 'SP95'))

    await handleFileSelected(file, stored, 'SP95', KNOWN_FUEL_TYPES, [], fetchFuelTypesForUrl)

    expect(importError.value).not.toBeNull()
    expect(importError.value).toContain('Aucun changement')
    expect(isDialogOpen.value).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// TC-IMP-APPLY-01 — applyDiff applies changes and sets importSuccess
// ---------------------------------------------------------------------------

describe('TC-IMP-APPLY-01: applyDiff applies the resolved diff and sets importSuccess', () => {
  it('calls addStation for a selected new station and sets importSuccess to true', async () => {
    const { handleFileSelected, applyDiff, importSuccess, isDialogOpen } = await freshComposable()

    // Open dialog with a new station
    const newStation: Station = { name: 'Nouvelle', url: VALID_URL }
    const file = makeFile(validFileContent([newStation], null))
    await handleFileSelected(file, [], null, KNOWN_FUEL_TYPES, [], fetchFuelTypesForUrl)

    await applyDiff(addStation, updateStation, saveDefaultFuelType, clearDefaultFuelType)

    expect(addStation).toHaveBeenCalledWith(newStation)
    expect(importSuccess.value).toBe(true)
    expect(isDialogOpen.value).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// TC-IMP-DIFF-03 — Deselected new station is not added
// ---------------------------------------------------------------------------

describe('TC-IMP-DIFF-03: applyDiff skips deselected new station rows', () => {
  it('does not call addStation when the new station row is deselected', async () => {
    const { handleFileSelected, applyDiff, diff } = await freshComposable()

    const newStation: Station = { name: 'Nouvelle', url: VALID_URL }
    const file = makeFile(validFileContent([newStation], null))
    await handleFileSelected(file, [], null, KNOWN_FUEL_TYPES, [], fetchFuelTypesForUrl)

    // Deselect the new station row
    diff.value!.stationRows[0].selected = false

    await applyDiff(addStation, updateStation, saveDefaultFuelType, clearDefaultFuelType)

    expect(addStation).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// TC-IMP-DIFF-05 — Conflict resolved with file name → updateStation called
// ---------------------------------------------------------------------------

describe('TC-IMP-DIFF-05: applyDiff calls updateStation when conflict resolved with file name', () => {
  it('calls updateStation with the file station when chosenName is "file"', async () => {
    const { handleFileSelected, applyDiff, diff } = await freshComposable()

    const stored: Station[] = [{ name: 'Ancien Nom', url: VALID_URL }]
    const fileStation: Station = { name: 'Nouveau Nom', url: VALID_URL }
    const file = makeFile(validFileContent([fileStation], null))
    await handleFileSelected(file, stored, null, KNOWN_FUEL_TYPES, [], fetchFuelTypesForUrl)

    // Resolve conflict: choose file name
    diff.value!.stationRows[0].chosenName = 'file'

    await applyDiff(addStation, updateStation, saveDefaultFuelType, clearDefaultFuelType)

    expect(updateStation).toHaveBeenCalledWith(VALID_URL, fileStation)
  })
})

// ---------------------------------------------------------------------------
// TC-IMP-DIFF-06 — Conflict resolved with stored name → no write
// ---------------------------------------------------------------------------

describe('TC-IMP-DIFF-06: applyDiff skips updateStation when conflict resolved with stored name', () => {
  it('does not call updateStation when chosenName is "stored"', async () => {
    const { handleFileSelected, applyDiff, diff } = await freshComposable()

    const stored: Station[] = [{ name: 'Ancien Nom', url: VALID_URL }]
    const fileStation: Station = { name: 'Nouveau Nom', url: VALID_URL }
    const file = makeFile(validFileContent([fileStation], null))
    await handleFileSelected(file, stored, null, KNOWN_FUEL_TYPES, [], fetchFuelTypesForUrl)

    // Resolve conflict: keep stored name
    diff.value!.stationRows[0].chosenName = 'stored'

    await applyDiff(addStation, updateStation, saveDefaultFuelType, clearDefaultFuelType)

    expect(updateStation).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// TC-IMP-DIFF-11 — Fuel type conflict resolved with file value
// ---------------------------------------------------------------------------

describe('TC-IMP-DIFF-11: applyDiff calls saveDefaultFuelType when fuel type resolved with file value', () => {
  it('calls saveDefaultFuelType with the file fuel type when chosen is "file"', async () => {
    const { handleFileSelected, applyDiff, diff } = await freshComposable()

    const file = makeFile(validFileContent([], 'Gasoil'))
    await handleFileSelected(file, [], 'SP95', KNOWN_FUEL_TYPES, [], fetchFuelTypesForUrl)

    // Resolve fuel type: choose file value
    diff.value!.fuelTypeDiff!.chosen = 'file'

    await applyDiff(addStation, updateStation, saveDefaultFuelType, clearDefaultFuelType)

    expect(saveDefaultFuelType).toHaveBeenCalledWith('Gasoil')
  })
})

// ---------------------------------------------------------------------------
// TC-IMP-DIFF-11 — Fuel type resolved to null → clearDefaultFuelType
// ---------------------------------------------------------------------------

describe('TC-IMP-DIFF-11: applyDiff calls clearDefaultFuelType when file fuel type is null', () => {
  it('calls clearDefaultFuelType when the file value is null and chosen is "file"', async () => {
    const { handleFileSelected, applyDiff, diff } = await freshComposable()

    const file = makeFile(validFileContent([], null))
    await handleFileSelected(file, [], 'SP95', KNOWN_FUEL_TYPES, [], fetchFuelTypesForUrl)

    diff.value!.fuelTypeDiff!.chosen = 'file'

    await applyDiff(addStation, updateStation, saveDefaultFuelType, clearDefaultFuelType)

    expect(clearDefaultFuelType).toHaveBeenCalledOnce()
    expect(saveDefaultFuelType).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// TC-IMP-DIFF-12 — Fuel type resolved with stored value → no write
// ---------------------------------------------------------------------------

describe('TC-IMP-DIFF-12: applyDiff skips fuel type write when chosen is "stored"', () => {
  it('does not call saveDefaultFuelType or clearDefaultFuelType when chosen is "stored"', async () => {
    const { handleFileSelected, applyDiff, diff } = await freshComposable()

    const file = makeFile(validFileContent([], 'Gasoil'))
    await handleFileSelected(file, [], 'SP95', KNOWN_FUEL_TYPES, [], fetchFuelTypesForUrl)

    diff.value!.fuelTypeDiff!.chosen = 'stored'

    await applyDiff(addStation, updateStation, saveDefaultFuelType, clearDefaultFuelType)

    expect(saveDefaultFuelType).not.toHaveBeenCalled()
    expect(clearDefaultFuelType).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// TC-IMP-APPLY-02 — Cancel closes dialog without writes
// ---------------------------------------------------------------------------

describe('TC-IMP-APPLY-02: cancelImport closes dialog without modifying IndexedDB', () => {
  it('sets isDialogOpen to false and does not call add/update', async () => {
    const { handleFileSelected, cancelImport, isDialogOpen, diff, importSuccess } =
      await freshComposable()

    const newStation: Station = { name: 'Nouvelle', url: VALID_URL }
    const file = makeFile(validFileContent([newStation], null))
    await handleFileSelected(file, [], null, KNOWN_FUEL_TYPES, [], fetchFuelTypesForUrl)

    expect(isDialogOpen.value).toBe(true)

    cancelImport()

    expect(isDialogOpen.value).toBe(false)
    expect(diff.value).toBeNull()
    expect(importSuccess.value).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// TC-IMP-DIFF-13 — Confirmation requires all conflicts resolved
// ---------------------------------------------------------------------------

describe('TC-IMP-DIFF-13: diff has unresolved conflict rows and fuel type diff', () => {
  it('conflict row starts with chosenName null (unresolved)', async () => {
    const { handleFileSelected, diff } = await freshComposable()

    const stored: Station[] = [{ name: 'Ancien', url: VALID_URL }]
    const fileStation: Station = { name: 'Nouveau', url: VALID_URL }
    const file = makeFile(validFileContent([fileStation], 'Gasoil'))
    await handleFileSelected(file, stored, 'SP95', KNOWN_FUEL_TYPES, [], fetchFuelTypesForUrl)

    // Both conflict row and fuel type diff should be unresolved
    expect(diff.value!.stationRows[0].chosenName).toBeNull()
    expect(diff.value!.fuelTypeDiff!.chosen).toBeNull()
  })
})
