/**
 * Tests for the index page — warning display, Suspense wiring, and loading indicator.
 *
 * useStationPrices is mocked so tests control reactive state directly.
 * useStationStorage is mocked to prevent IndexedDB calls from async setup.
 *
 * TC-08: AppLoader fallback is shown during Suspense suspension.
 * TC-09: Content is visible after async initialisation completes.
 * TC-10: StationManager does not render an AppLoader internally.
 * TC-12: Warning messages rendered in the UI include station name and URL.
 * TC-13: No warning messages rendered when warnings list is empty.
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
const mockFetchCompleted = ref(false)
const mockLoadAllStationPrices = vi.fn().mockResolvedValue(undefined)

vi.mock('@/composables/useStationPrices', () => ({
  useStationPrices: () => ({
    results: mockResults,
    warnings: mockWarnings,
    isLoading: mockIsLoading,
    fetchCompleted: mockFetchCompleted,
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
  mockFetchCompleted.value = false
  mockLoadAllStationPrices.mockClear()
})

// ---------------------------------------------------------------------------
// TC-08: AppLoader fallback is shown when children are suspended
// ---------------------------------------------------------------------------

describe('TC-08: AppLoader fallback is rendered inside <Suspense> when children suspend', () => {
  it('renders the AppLoader stub before async setup resolves (synchronous check before flushPromises)', async () => {
    const IndexPage = (await import('./index.vue')).default
    const wrapper = mount(IndexPage, {
      global: { stubs: { StationManager: true, AppLoader: { template: '<div class="app-loader-stub" />' } } },
    })

    // Before promises settle, the Suspense fallback (AppLoader) should be present
    expect(wrapper.find('.app-loader-stub').exists()).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// TC-09: Content visible after async initialisation completes
// ---------------------------------------------------------------------------

describe('TC-09: StationPrices content is visible after Suspense resolves', () => {
  it('renders the prices section after async setup resolves', async () => {
    const IndexPage = (await import('./index.vue')).default
    const wrapper = mount(IndexPage, {
      global: { stubs: { StationManager: true, AppLoader: { template: '<div class="app-loader-stub" />' } } },
    })
    await flushPromises()

    // After setup resolves, the Suspense fallback is gone and content is shown
    expect(wrapper.find('.station-prices').exists()).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// TC-10: StationManager does not render an AppLoader internally
// ---------------------------------------------------------------------------

describe('TC-10: StationManager does not render an AppLoader inside itself', () => {
  it('does not find an AppLoader component inside StationManager', async () => {
    const IndexPage = (await import('./index.vue')).default
    const wrapper = mount(IndexPage, {
      global: {
        stubs: {
          AppLoader: { template: '<div class="app-loader-stub" />' },
          // Do not stub StationManager so we can inspect its internals
          AppLink: { template: '<a><slot /></a>' },
          Table: { template: '<table><slot /></table>' },
          TableHeader: { template: '<thead><slot /></thead>' },
          TableBody: { template: '<tbody><slot /></tbody>' },
          TableRow: { template: '<tr><slot /></tr>' },
          TableHead: { template: '<th><slot /></th>' },
          TableCell: { template: '<td><slot /></td>' },
        },
      },
    })
    await flushPromises()

    const stationManager = wrapper.findComponent({ name: 'StationManager' })
    expect(stationManager.exists()).toBe(true)
    // AppLoader is not rendered inside StationManager — it has no loading indicator
    const loaderInsideManager = stationManager.findComponent({ name: 'AppLoader' })
    expect(loaderInsideManager.exists()).toBe(false)
  })
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
