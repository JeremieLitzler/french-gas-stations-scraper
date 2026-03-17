/**
 * Tests for the index page — warning display and loading indicator.
 *
 * useStationPrices is mocked so tests control reactive state directly.
 * useStationStorage is mocked to prevent IndexedDB calls from onMounted.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import type { StationData } from '../types/station-data'
import type { StationWarning } from '../types/station-warning'

// ---------------------------------------------------------------------------
// Mock useStationPrices
// ---------------------------------------------------------------------------

const mockResults = ref<StationData[]>([])
const mockWarnings = ref<StationWarning[]>([])
const mockIsLoading = ref(false)
const mockLoadAllStationPrices = vi.fn().mockResolvedValue(undefined)

vi.mock('@/composables/useStationPrices', () => ({
  useStationPrices: () => ({
    results: mockResults,
    warnings: mockWarnings,
    isLoading: mockIsLoading,
    loadAllStationPrices: mockLoadAllStationPrices,
  }),
}))

// ---------------------------------------------------------------------------
// Mock useStationStorage (required by StationManager)
// ---------------------------------------------------------------------------

vi.mock('@/composables/useStationStorage', () => ({
  useStationStorage: () => ({
    stations: ref([]),
    loadStations: vi.fn().mockResolvedValue(undefined),
    addStation: vi.fn().mockResolvedValue(undefined),
    removeStation: vi.fn().mockResolvedValue(undefined),
    updateStation: vi.fn().mockResolvedValue(undefined),
  }),
}))

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockResults.value = []
  mockWarnings.value = []
  mockIsLoading.value = false
  mockLoadAllStationPrices.mockClear()
})

// ---------------------------------------------------------------------------
// TC-12: Warning messages rendered in the UI include station name and URL
// ---------------------------------------------------------------------------

describe('TC-12: warning messages include station name and URL', () => {
  it('renders warning text containing the station name and URL', async () => {
    mockWarnings.value = [
      { stationName: 'Test Station', url: 'https://www.prix-carburants.gouv.fr/station/11111111' },
    ]

    const IndexPage = (await import('./index.vue')).default
    const wrapper = mount(IndexPage, { global: { stubs: { StationManager: true, AppLoader: true } } })
    await flushPromises()

    const warningList = wrapper.find('[aria-label="Station fetch warnings"]')
    expect(warningList.exists()).toBe(true)

    const text = warningList.text()
    expect(text).toContain('Test Station')
    expect(text).toContain('https://www.prix-carburants.gouv.fr/station/11111111')
  })
})

// ---------------------------------------------------------------------------
// TC-13: No warning messages rendered when warnings list is empty
// ---------------------------------------------------------------------------

describe('TC-13: no warning messages rendered when warnings list is empty', () => {
  it('does not render the warning list when warnings is empty', async () => {
    mockWarnings.value = []

    const IndexPage = (await import('./index.vue')).default
    const wrapper = mount(IndexPage, { global: { stubs: { StationManager: true, AppLoader: true } } })
    await flushPromises()

    const warningList = wrapper.find('[aria-label="Station fetch warnings"]')
    expect(warningList.exists()).toBe(false)
  })
})
