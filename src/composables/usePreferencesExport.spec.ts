/**
 * Tests for usePreferencesExport composable — Issue #63.
 *
 * usePreferencesExport is a singleton composable (ADR-002). Each test uses
 * vi.resetModules() + dynamic import() to get fresh module-level state.
 *
 * Scenarios covered:
 *   TC-EXP-01 — Export produces the JSON shape from current state
 *   TC-EXP-02 — Export with empty state
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Station } from '@/types/station'

// ---------------------------------------------------------------------------
// Mock: useStationStorage
// ---------------------------------------------------------------------------

const mockStations = { value: [] as Station[] }

vi.mock('@/composables/useStationStorage', () => ({
  useStationStorage: () => ({ stations: mockStations }),
}))

// ---------------------------------------------------------------------------
// Mock: useDefaultFuelType
// ---------------------------------------------------------------------------

const mockDefaultFuelType = { value: null as string | null }

vi.mock('@/composables/useDefaultFuelType', () => ({
  useDefaultFuelType: () => ({ defaultFuelType: mockDefaultFuelType }),
}))

// ---------------------------------------------------------------------------
// Mock: downloadPreferencesFile — capture what would be downloaded
// ---------------------------------------------------------------------------

let lastDownloaded: unknown = undefined

vi.mock('@/utils/preferencesExport', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/utils/preferencesExport')>()
  return {
    ...original,
    downloadPreferencesFile: vi.fn((preferences) => {
      lastDownloaded = preferences
    }),
  }
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function freshComposable() {
  vi.resetModules()
  const mod = await import('./usePreferencesExport')
  return mod.usePreferencesExport()
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockStations.value = []
  mockDefaultFuelType.value = null
  lastDownloaded = undefined
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// TC-EXP-01 — Export serialises current state
// ---------------------------------------------------------------------------

describe('TC-EXP-01: exportPreferences builds a file from current stations and fuel type', () => {
  it('calls downloadPreferencesFile with the serialised preferences', async () => {
    mockStations.value = [
      { name: 'Station A', url: 'https://www.prix-carburants.gouv.fr/station/1' },
    ]
    mockDefaultFuelType.value = 'SP95'

    const { exportPreferences } = await freshComposable()
    await exportPreferences()

    const { downloadPreferencesFile } = await import('@/utils/preferencesExport')
    expect(downloadPreferencesFile).toHaveBeenCalledOnce()
    const arg = (downloadPreferencesFile as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(arg.fuelTypeDefault).toBe('SP95')
    expect(arg.favoriteStations).toHaveLength(1)
    expect(arg.favoriteStations[0].name).toBe('Station A')
  })
})

// ---------------------------------------------------------------------------
// TC-EXP-02 — Export with empty state
// ---------------------------------------------------------------------------

describe('TC-EXP-02: exportPreferences works with empty station list and null fuel type', () => {
  it('passes an empty array and null to downloadPreferencesFile', async () => {
    const { exportPreferences } = await freshComposable()
    await exportPreferences()

    const { downloadPreferencesFile } = await import('@/utils/preferencesExport')
    expect(downloadPreferencesFile).toHaveBeenCalledOnce()
    const arg = (downloadPreferencesFile as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(arg.fuelTypeDefault).toBeNull()
    expect(arg.favoriteStations).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// isExporting state
// ---------------------------------------------------------------------------

describe('usePreferencesExport: isExporting is false before and after export', () => {
  it('starts as false and is false after exportPreferences resolves', async () => {
    const { isExporting, exportPreferences } = await freshComposable()

    expect(isExporting.value).toBe(false)
    await exportPreferences()
    expect(isExporting.value).toBe(false)
  })
})
