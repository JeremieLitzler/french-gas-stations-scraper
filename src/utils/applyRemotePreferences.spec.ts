/**
 * Tests for applyRemotePreferences — the shared rollback-on-failure logic
 * extracted from HomePageContent.vue's on-load sync (Sub-Issue C, issue #64)
 * and reused by StationManager.vue's on-demand refresh (issue #106).
 *
 * getPreferencesSyncedAt/restorePreferencesSyncedAt are mocked so tests can
 * assert the rollback restores the exact pre-merge timestamp without going
 * through real IndexedDB.
 *
 * Scenarios covered (test-cases.md, issue #106):
 *   TC-6 — a failed fetch rolls back both the station list and the default
 *          fuel type to their pre-click values
 *   TC-7 — a failed fetch does not advance the sync-freshness timestamp
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PreferencesFile } from '@/types/preferences'
import type { Station } from '@/types/station'

const mockGetPreferencesSyncedAt = vi.fn()
const mockRestorePreferencesSyncedAt = vi.fn().mockResolvedValue(undefined)

vi.mock('@/utils/preferencesSyncTimestamp', () => ({
  getPreferencesSyncedAt: mockGetPreferencesSyncedAt,
  restorePreferencesSyncedAt: mockRestorePreferencesSyncedAt,
}))

import { applyRemotePreferences } from './applyRemotePreferences'

const PREVIOUS_STATIONS: Station[] = [
  { name: 'Station A', url: 'https://www.prix-carburants.gouv.fr/station/11111' },
]

beforeEach(() => {
  vi.clearAllMocks()
  mockGetPreferencesSyncedAt.mockResolvedValue(1_000)
  mockRestorePreferencesSyncedAt.mockResolvedValue(undefined)
})

describe('successful merge', () => {
  it('replaces the station list, then saves the remote default fuel type', async () => {
    const remoteData: PreferencesFile = {
      favoriteStations: [
        { name: 'Remote Station', url: 'https://www.prix-carburants.gouv.fr/station/22222' },
      ],
      fuelTypeDefault: 'SP95',
    }
    const replaceStations = vi.fn().mockResolvedValue(undefined)
    const saveDefaultFuelType = vi.fn().mockResolvedValue(undefined)
    const clearDefaultFuelType = vi.fn().mockResolvedValue(undefined)

    await applyRemotePreferences(
      remoteData,
      PREVIOUS_STATIONS,
      replaceStations,
      saveDefaultFuelType,
      clearDefaultFuelType,
    )

    expect(replaceStations).toHaveBeenCalledTimes(1)
    expect(replaceStations).toHaveBeenCalledWith(remoteData.favoriteStations)
    expect(saveDefaultFuelType).toHaveBeenCalledWith('SP95')
    expect(clearDefaultFuelType).not.toHaveBeenCalled()
    expect(mockRestorePreferencesSyncedAt).not.toHaveBeenCalled()
  })

  it('clears the default fuel type when the remote value is null', async () => {
    const remoteData: PreferencesFile = { favoriteStations: [], fuelTypeDefault: null }
    const replaceStations = vi.fn().mockResolvedValue(undefined)
    const saveDefaultFuelType = vi.fn().mockResolvedValue(undefined)
    const clearDefaultFuelType = vi.fn().mockResolvedValue(undefined)

    await applyRemotePreferences(
      remoteData,
      PREVIOUS_STATIONS,
      replaceStations,
      saveDefaultFuelType,
      clearDefaultFuelType,
    )

    expect(clearDefaultFuelType).toHaveBeenCalledTimes(1)
    expect(saveDefaultFuelType).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// TC-6: A failed fetch rolls back local data and shows an error
// ---------------------------------------------------------------------------

describe('TC-6: a failed default-fuel write rolls back the station list to its pre-merge value', () => {
  it('replaces the station list back to previousStations when saveDefaultFuelType rejects', async () => {
    const remoteData: PreferencesFile = {
      favoriteStations: [
        { name: 'Remote Station', url: 'https://www.prix-carburants.gouv.fr/station/22222' },
      ],
      fuelTypeDefault: 'SP95',
    }
    const replaceStations = vi.fn().mockResolvedValue(undefined)
    const saveDefaultFuelType = vi.fn().mockRejectedValue(new Error('IndexedDB write failed'))
    const clearDefaultFuelType = vi.fn().mockResolvedValue(undefined)

    await expect(
      applyRemotePreferences(
        remoteData,
        PREVIOUS_STATIONS,
        replaceStations,
        saveDefaultFuelType,
        clearDefaultFuelType,
      ),
    ).rejects.toThrow('IndexedDB write failed')

    expect(replaceStations).toHaveBeenNthCalledWith(1, remoteData.favoriteStations)
    expect(replaceStations).toHaveBeenNthCalledWith(2, PREVIOUS_STATIONS)
    expect(replaceStations).toHaveBeenCalledTimes(2)
  })

  it('replaces the station list back to previousStations when clearDefaultFuelType rejects', async () => {
    const remoteData: PreferencesFile = { favoriteStations: [], fuelTypeDefault: null }
    const replaceStations = vi.fn().mockResolvedValue(undefined)
    const saveDefaultFuelType = vi.fn().mockResolvedValue(undefined)
    const clearDefaultFuelType = vi.fn().mockRejectedValue(new Error('IndexedDB write failed'))

    await expect(
      applyRemotePreferences(
        remoteData,
        PREVIOUS_STATIONS,
        replaceStations,
        saveDefaultFuelType,
        clearDefaultFuelType,
      ),
    ).rejects.toThrow('IndexedDB write failed')

    expect(replaceStations).toHaveBeenNthCalledWith(2, PREVIOUS_STATIONS)
  })
})

// ---------------------------------------------------------------------------
// TC-7: A failed fetch does not advance the sync-freshness timestamp
// ---------------------------------------------------------------------------

describe('TC-7: a failed merge restores the pre-merge sync timestamp, not the freshly-marked one', () => {
  it('restores the timestamp captured before the merge started, after the station rollback', async () => {
    mockGetPreferencesSyncedAt.mockResolvedValue(5_000)
    const remoteData: PreferencesFile = { favoriteStations: [], fuelTypeDefault: 'SP95' }
    const replaceStations = vi.fn().mockResolvedValue(undefined)
    const saveDefaultFuelType = vi.fn().mockRejectedValue(new Error('write failed'))
    const clearDefaultFuelType = vi.fn().mockResolvedValue(undefined)

    await expect(
      applyRemotePreferences(
        remoteData,
        PREVIOUS_STATIONS,
        replaceStations,
        saveDefaultFuelType,
        clearDefaultFuelType,
      ),
    ).rejects.toThrow()

    expect(mockRestorePreferencesSyncedAt).toHaveBeenCalledTimes(1)
    expect(mockRestorePreferencesSyncedAt).toHaveBeenCalledWith(5_000)
    // The station-list rollback (which itself would mark a fresh timestamp
    // as a side effect of replaceStations' own contract) must happen before
    // the timestamp restore, so the restore is the last write and wins.
    const rollbackOrder = replaceStations.mock.invocationCallOrder[1]
    const restoreOrder = mockRestorePreferencesSyncedAt.mock.invocationCallOrder[0]
    expect(rollbackOrder).toBeLessThan(restoreOrder)
  })

  it('restores an undefined pre-merge timestamp (never-synced-before) via a delete, not a stale value', async () => {
    mockGetPreferencesSyncedAt.mockResolvedValue(undefined)
    const remoteData: PreferencesFile = { favoriteStations: [], fuelTypeDefault: 'SP95' }
    const replaceStations = vi.fn().mockResolvedValue(undefined)
    const saveDefaultFuelType = vi.fn().mockRejectedValue(new Error('write failed'))
    const clearDefaultFuelType = vi.fn().mockResolvedValue(undefined)

    await expect(
      applyRemotePreferences(
        remoteData,
        PREVIOUS_STATIONS,
        replaceStations,
        saveDefaultFuelType,
        clearDefaultFuelType,
      ),
    ).rejects.toThrow()

    expect(mockRestorePreferencesSyncedAt).toHaveBeenCalledWith(undefined)
  })
})
