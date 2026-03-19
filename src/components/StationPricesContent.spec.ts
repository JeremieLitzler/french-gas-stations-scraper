/**
 * Tests for StationPricesContent component — Issue #31 reactivity scenarios
 * and Issue #28 default fuel type scenarios.
 *
 * StationPricesContent watches the `stations` ref from useStationStorage and
 * dispatches incremental price operations (removeStationPrice, addStationPrice,
 * renameStation) via useStationPrices when the list changes after initialisation.
 *
 * Both composables are mocked. The test controls `mockStations` to simulate
 * station list mutations and verifies the correct operations are called.
 *
 * The component uses a top-level await in <script async setup> and must be
 * mounted inside a <Suspense> boundary; mountComponent() wraps it automatically.
 *
 * Each test unmounts its component before the next test runs to prevent stale
 * Vue watcher callbacks from interfering when the shared `mockStations` ref is
 * reset in `beforeEach`.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, nextTick, ref } from 'vue'
import type { StationData } from '@/types/station-data'
import type { StationWarning } from '@/types/station-warning'
import type { VueWrapper } from '@vue/test-utils'
import StationPricesContent from './StationPricesContent.vue'

// ---------------------------------------------------------------------------
// Shared mock state
// ---------------------------------------------------------------------------

const mockResults = ref<StationData[]>([])
const mockWarnings = ref<StationWarning[]>([])
const mockIsLoading = ref(false)
const mockFetchCompleted = ref(false)
const mockLoadAllStationPrices = vi.fn().mockResolvedValue(undefined)
const mockRemoveStationPrice = vi.fn()
const mockAddStationPrice = vi.fn().mockResolvedValue(undefined)
const mockRenameStation = vi.fn()

vi.mock('@/composables/useStationPrices', () => ({
  useStationPrices: () => ({
    results: mockResults,
    warnings: mockWarnings,
    isLoading: mockIsLoading,
    fetchCompleted: mockFetchCompleted,
    loadAllStationPrices: mockLoadAllStationPrices,
    removeStationPrice: mockRemoveStationPrice,
    addStationPrice: mockAddStationPrice,
    renameStation: mockRenameStation,
  }),
}))

const mockStations = ref([
  { name: 'Station A', url: 'https://example.com/station/a' },
  { name: 'Station B', url: 'https://example.com/station/b' },
  { name: 'Station C', url: 'https://example.com/station/c' },
])
const mockLoadStations = vi.fn().mockResolvedValue(undefined)

vi.mock('@/composables/useStationStorage', () => ({
  useStationStorage: () => ({
    stations: mockStations,
    loadStations: mockLoadStations,
  }),
}))

const mockDefaultFuelType = ref<string | null>(null)
const mockLoadDefaultFuelType = vi.fn().mockResolvedValue(undefined)
const mockSaveDefaultFuelType = vi.fn().mockImplementation(async (label: string) => {
  mockDefaultFuelType.value = label
})
const mockUpdateDefaultFuelType = vi.fn().mockImplementation(async (label: string) => {
  mockDefaultFuelType.value = label
})
const mockClearDefaultFuelType = vi.fn().mockImplementation(async () => {
  mockDefaultFuelType.value = null
})

vi.mock('@/composables/useDefaultFuelType', () => ({
  useDefaultFuelType: () => ({
    defaultFuelType: mockDefaultFuelType,
    loadDefaultFuelType: mockLoadDefaultFuelType,
    saveDefaultFuelType: mockSaveDefaultFuelType,
    updateDefaultFuelType: mockUpdateDefaultFuelType,
    clearDefaultFuelType: mockClearDefaultFuelType,
  }),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const sharedStubs = {
  Table: { template: '<table><slot /></table>' },
  TableHeader: { template: '<thead><slot /></thead>' },
  TableBody: { template: '<tbody><slot /></tbody>' },
  TableRow: { template: '<tr><slot /></tr>' },
  TableHead: { template: '<th><slot /></th>' },
  TableCell: { template: '<td><slot /></td>' },
}

function mountComponent() {
  const Wrapper = defineComponent({
    components: { StationPricesContent },
    template: '<Suspense><StationPricesContent /></Suspense>',
  })
  return mount(Wrapper, { global: { stubs: sharedStubs } })
}

/**
 * Seed the watcher: mount, then cycle results through empty so the
 * non-immediate watch(derivedFuelTypes) fires and sets selectedFuelType.
 */
async function mountAndSeedSelection(results: StationData[]) {
  mockResults.value = results
  const wrapper = mountComponent()
  await flushPromises()

  const snapshot = [...mockResults.value]
  mockResults.value = []
  await nextTick()
  mockResults.value = snapshot
  await nextTick()
  await flushPromises()

  return wrapper
}

// ---------------------------------------------------------------------------
// Setup / teardown — unmount between tests to prevent stale watcher callbacks
// ---------------------------------------------------------------------------

let activeWrapper: VueWrapper | null = null

beforeEach(() => {
  mockResults.value = []
  mockWarnings.value = []
  mockIsLoading.value = false
  mockFetchCompleted.value = false
  mockStations.value = [
    { name: 'Station A', url: 'https://example.com/station/a' },
    { name: 'Station B', url: 'https://example.com/station/b' },
    { name: 'Station C', url: 'https://example.com/station/c' },
  ]
  mockLoadAllStationPrices.mockResolvedValue(undefined)
  mockLoadStations.mockResolvedValue(undefined)
  mockRemoveStationPrice.mockReset()
  mockAddStationPrice.mockReset()
  mockAddStationPrice.mockResolvedValue(undefined)
  mockRenameStation.mockReset()
  mockDefaultFuelType.value = null
  mockLoadDefaultFuelType.mockResolvedValue(undefined)
  mockSaveDefaultFuelType.mockReset()
  mockSaveDefaultFuelType.mockImplementation(async (label: string) => {
    mockDefaultFuelType.value = label
  })
  mockUpdateDefaultFuelType.mockReset()
  mockUpdateDefaultFuelType.mockImplementation(async (label: string) => {
    mockDefaultFuelType.value = label
  })
  mockClearDefaultFuelType.mockReset()
  mockClearDefaultFuelType.mockImplementation(async () => {
    mockDefaultFuelType.value = null
  })
})

afterEach(() => {
  if (activeWrapper) {
    activeWrapper.unmount()
    activeWrapper = null
  }
})

// ---------------------------------------------------------------------------
// TC-01: Station removal dispatches removeStationPrice for the removed URL
// ---------------------------------------------------------------------------

describe('TC-01: removing a station dispatches removeStationPrice for its URL', () => {
  it('calls removeStationPrice with the removed station URL', async () => {
    activeWrapper = mountComponent()
    await flushPromises()

    mockRemoveStationPrice.mockReset()
    mockAddStationPrice.mockReset()
    mockRenameStation.mockReset()

    // Remove Station B from the list
    mockStations.value = [
      { name: 'Station A', url: 'https://example.com/station/a' },
      { name: 'Station C', url: 'https://example.com/station/c' },
    ]
    await nextTick()
    await flushPromises()

    expect(mockRemoveStationPrice).toHaveBeenCalledWith('https://example.com/station/b')
    expect(mockRemoveStationPrice).toHaveBeenCalledTimes(1)
    expect(mockAddStationPrice).not.toHaveBeenCalled()
    expect(mockRenameStation).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// TC-02: Station URL change removes old price and triggers addStationPrice
// ---------------------------------------------------------------------------

describe('TC-02: changing a station URL dispatches remove for the old URL and add for the new station', () => {
  it('calls removeStationPrice for the old URL and addStationPrice for the updated station', async () => {
    activeWrapper = mountComponent()
    await flushPromises()

    mockRemoveStationPrice.mockReset()
    mockAddStationPrice.mockReset()
    mockAddStationPrice.mockResolvedValue(undefined)
    mockRenameStation.mockReset()

    // Change Station A's URL
    mockStations.value = [
      { name: 'Station A', url: 'https://example.com/station/a-new' },
      { name: 'Station B', url: 'https://example.com/station/b' },
      { name: 'Station C', url: 'https://example.com/station/c' },
    ]
    await nextTick()
    await flushPromises()

    expect(mockRemoveStationPrice).toHaveBeenCalledWith('https://example.com/station/a')
    expect(mockAddStationPrice).toHaveBeenCalledWith({
      name: 'Station A',
      url: 'https://example.com/station/a-new',
    })
    expect(mockRenameStation).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// TC-04: Station name change dispatches renameStation without re-fetch
// ---------------------------------------------------------------------------

describe('TC-04: changing only a station name dispatches renameStation, not addStationPrice', () => {
  it('calls renameStation with the URL and new name', async () => {
    activeWrapper = mountComponent()
    await flushPromises()

    mockRemoveStationPrice.mockReset()
    mockAddStationPrice.mockReset()
    mockRenameStation.mockReset()

    // Change Station B's name only — URL unchanged
    mockStations.value = [
      { name: 'Station A', url: 'https://example.com/station/a' },
      { name: 'Station B Renamed', url: 'https://example.com/station/b' },
      { name: 'Station C', url: 'https://example.com/station/c' },
    ]
    await nextTick()
    await flushPromises()

    expect(mockRenameStation).toHaveBeenCalledWith(
      'https://example.com/station/b',
      'Station B Renamed',
    )
    expect(mockAddStationPrice).not.toHaveBeenCalled()
    expect(mockRemoveStationPrice).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// TC-05: Adding a station dispatches addStationPrice for the new station
// ---------------------------------------------------------------------------

describe('TC-05: adding a new station dispatches addStationPrice', () => {
  it('calls addStationPrice with the new station object', async () => {
    activeWrapper = mountComponent()
    await flushPromises()

    mockRemoveStationPrice.mockReset()
    mockAddStationPrice.mockReset()
    mockAddStationPrice.mockResolvedValue(undefined)
    mockRenameStation.mockReset()

    mockStations.value = [
      { name: 'Station A', url: 'https://example.com/station/a' },
      { name: 'Station B', url: 'https://example.com/station/b' },
      { name: 'Station C', url: 'https://example.com/station/c' },
      { name: 'Station Z', url: 'https://example.com/station/z' },
    ]
    await nextTick()
    await flushPromises()

    expect(mockAddStationPrice).toHaveBeenCalledWith({
      name: 'Station Z',
      url: 'https://example.com/station/z',
    })
    expect(mockRemoveStationPrice).not.toHaveBeenCalled()
    expect(mockRenameStation).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// TC-06 — No default stored: only "Save as default" is visible
// ---------------------------------------------------------------------------

describe('Issue-28 TC-06: no default stored — only "Save as default" is visible', () => {
  it('shows "Save as default", hides "Update default" and "Clear default"', async () => {
    mockDefaultFuelType.value = null
    mockResults.value = [
      { stationName: 'Station A', url: 'https://example.com/station/a', fuels: [{ type: 'SP95', price: 1.89 }] },
    ]

    activeWrapper = await mountAndSeedSelection(mockResults.value)

    const allButtons = activeWrapper.findAll('.default-fuel-button')
    const labels = allButtons.map((b) => b.text())

    expect(labels).toContain('Save as default')
    expect(labels).not.toContain('Update default')
    expect(labels).not.toContain('Clear default')
  })
})

// ---------------------------------------------------------------------------
// TC-07: Fuel type selector reflects available fuel types after station removal
// ---------------------------------------------------------------------------

describe('TC-07: fuel type selector reflects only fuel types present in current results', () => {
  it('removes GPL from the selector when the only station offering GPL is removed from results', async () => {
    mockResults.value = [
      { stationName: 'Station A', url: 'https://example.com/station/a', fuels: [{ type: 'GPL', price: 0.85 }, { type: 'SP95', price: 1.75 }] },
      { stationName: 'Station B', url: 'https://example.com/station/b', fuels: [{ type: 'SP95', price: 1.80 }] },
    ]

    activeWrapper = mountComponent()
    await flushPromises()

    const buttonsBefore = activeWrapper.findAll('.fuel-type-selector button')
    const labelsBefore = buttonsBefore.map((b) => b.text())
    expect(labelsBefore).toContain('GPL')
    expect(labelsBefore).toContain('SP95')

    // Simulate results update: Station A gone, only Station B remains with SP95
    mockResults.value = [
      { stationName: 'Station B', url: 'https://example.com/station/b', fuels: [{ type: 'SP95', price: 1.80 }] },
    ]
    await nextTick()
    await flushPromises()

    const buttonsAfter = activeWrapper.findAll('.fuel-type-selector button')
    const labelsAfter = buttonsAfter.map((b) => b.text())
    expect(labelsAfter).not.toContain('GPL')
    expect(labelsAfter).toContain('SP95')
  })
})

// ---------------------------------------------------------------------------
// TC-07 (Issue-28) — Default stored, selection = stored default: only "Clear default" visible
// ---------------------------------------------------------------------------

describe('Issue-28 TC-07: default stored and selection matches — only "Clear default" is visible', () => {
  it('shows "Clear default", hides "Save as default" and "Update default"', async () => {
    mockDefaultFuelType.value = 'SP95'
    mockResults.value = [
      {
        stationName: 'Station A',
        url: 'https://example.com/station/a',
        fuels: [
          { type: 'SP95', price: 1.89 },
          { type: 'Gasoil', price: 1.75 },
        ],
      },
    ]

    activeWrapper = await mountAndSeedSelection(mockResults.value)

    // The watch seeds selection to SP95 (the stored default is first in the ordered list)
    const allButtons = activeWrapper.findAll('.default-fuel-button')
    const labels = allButtons.map((b) => b.text())

    expect(labels).not.toContain('Save as default')
    expect(labels).not.toContain('Update default')
    expect(labels).toContain('Clear default')
  })
})

// ---------------------------------------------------------------------------
// TC-08: Selected fuel type is preserved if it still exists after station change
// ---------------------------------------------------------------------------

describe('TC-08: selected fuel type is preserved after a station change when it still exists', () => {
  it('keeps SP95 selected after results update when SP95 still available', async () => {
    // Set results before mounting so the watcher sees them on first change
    mockResults.value = [
      { stationName: 'Station A', url: 'https://example.com/station/a', fuels: [{ type: 'SP95', price: 1.75 }] },
      { stationName: 'Station B', url: 'https://example.com/station/b', fuels: [{ type: 'SP95', price: 1.80 }] },
    ]

    activeWrapper = mountComponent()
    await flushPromises()

    // SP95 is available — first button should be active via the availableFuelTypes watcher
    // Trigger the watcher by making a no-op results update so selectedFuelType is set
    const resultsSnapshot = [...mockResults.value]
    mockResults.value = []
    await nextTick()
    mockResults.value = resultsSnapshot
    await nextTick()
    await flushPromises()

    const buttons = activeWrapper.findAll('.fuel-type-selector button')
    expect(buttons[0].text()).toBe('SP95')
    expect(buttons[0].classes()).toContain('active')

    // Simulate: Station A removed from results — SP95 still offered by Station B
    mockResults.value = [
      { stationName: 'Station B', url: 'https://example.com/station/b', fuels: [{ type: 'SP95', price: 1.80 }] },
    ]
    await nextTick()
    await flushPromises()

    const remainingButtons = activeWrapper.findAll('.fuel-type-selector button')
    expect(remainingButtons).toHaveLength(1)
    expect(remainingButtons[0].text()).toBe('SP95')
    expect(remainingButtons[0].classes()).toContain('active')
  })
})

// ---------------------------------------------------------------------------
// TC-08 (Issue-28) — Default stored, selection ≠ stored default: "Update default" + "Clear default" visible
// ---------------------------------------------------------------------------

describe('Issue-28 TC-08: default stored, selection differs — "Update default" and "Clear default" are visible', () => {
  it('shows "Update default" and "Clear default", hides "Save as default"', async () => {
    mockDefaultFuelType.value = 'SP95'
    mockResults.value = [
      {
        stationName: 'Station A',
        url: 'https://example.com/station/a',
        fuels: [
          { type: 'SP95', price: 1.89 },
          { type: 'Gasoil', price: 1.75 },
        ],
      },
    ]

    activeWrapper = await mountAndSeedSelection(mockResults.value)

    // Select Gasoil (differs from stored default SP95)
    const fuelButtons = activeWrapper.findAll('.fuel-type-selector button')
    const gasoilButton = fuelButtons.find((b) => b.text() === 'Gasoil')
    await gasoilButton!.trigger('click')
    await nextTick()

    const allButtons = activeWrapper.findAll('.default-fuel-button')
    const labels = allButtons.map((b) => b.text())

    expect(labels).not.toContain('Save as default')
    expect(labels).toContain('Update default')
    expect(labels).toContain('Clear default')
  })
})

// ---------------------------------------------------------------------------
// TC-09: Selected fuel type resets when it disappears from results
// ---------------------------------------------------------------------------

describe('TC-09: selected fuel type resets to first available when it disappears', () => {
  it('resets selection to SP95 after GPL (initially selected) disappears from results', async () => {
    mockResults.value = [
      { stationName: 'Station A', url: 'https://example.com/station/a', fuels: [{ type: 'GPL', price: 0.85 }, { type: 'SP95', price: 1.75 }] },
    ]

    activeWrapper = mountComponent()
    await flushPromises()

    // Trigger watcher to initialise selectedFuelType
    const resultsSnapshot = [...mockResults.value]
    mockResults.value = []
    await nextTick()
    mockResults.value = resultsSnapshot
    await nextTick()
    await flushPromises()

    // Select GPL (first button)
    const buttons = activeWrapper.findAll('.fuel-type-selector button')
    expect(buttons[0].text()).toBe('GPL')
    await buttons[0].trigger('click')
    expect(buttons[0].classes()).toContain('active')

    // Remove GPL from results — only SP95 remains
    mockResults.value = [
      { stationName: 'Station A', url: 'https://example.com/station/a', fuels: [{ type: 'SP95', price: 1.75 }] },
    ]
    await nextTick()
    await flushPromises()

    const newButtons = activeWrapper.findAll('.fuel-type-selector button')
    expect(newButtons).toHaveLength(1)
    expect(newButtons[0].text()).toBe('SP95')
    expect(newButtons[0].classes()).toContain('active')
  })
})

// ---------------------------------------------------------------------------
// Issue-28 TC-09 — "Save as default" stores the selected fuel type
// ---------------------------------------------------------------------------

describe('Issue-28 TC-09: clicking "Save as default" calls saveDefaultFuelType with the selection', () => {
  it('calls saveDefaultFuelType with "SP95" when SP95 is selected', async () => {
    mockResults.value = [
      { stationName: 'Station A', url: 'https://example.com/station/a', fuels: [{ type: 'SP95', price: 1.89 }] },
    ]

    activeWrapper = await mountAndSeedSelection(mockResults.value)

    const saveButton = activeWrapper.findAll('.default-fuel-button').find((b) => b.text() === 'Save as default')
    expect(saveButton).toBeDefined()

    await saveButton!.trigger('click')
    await flushPromises()

    expect(mockSaveDefaultFuelType).toHaveBeenCalledWith('SP95')
  })
})

// ---------------------------------------------------------------------------
// Issue-28 TC-10 — After saving, "Save as default" is hidden and "Default" indicator appears
// ---------------------------------------------------------------------------

describe('Issue-28 TC-10: after saving, "Save as default" disappears and the "Default" indicator appears', () => {
  it('hides "Save as default" and shows ".default-indicator" after clicking save', async () => {
    mockResults.value = [
      { stationName: 'Station A', url: 'https://example.com/station/a', fuels: [{ type: 'SP95', price: 1.89 }] },
    ]

    activeWrapper = await mountAndSeedSelection(mockResults.value)

    const saveButton = activeWrapper.findAll('.default-fuel-button').find((b) => b.text() === 'Save as default')
    await saveButton!.trigger('click')
    await flushPromises()
    await nextTick()

    const allButtons = activeWrapper.findAll('.default-fuel-button')
    const labels = allButtons.map((b) => b.text())
    expect(labels).not.toContain('Save as default')

    const indicator = activeWrapper.find('.default-indicator')
    expect(indicator.exists()).toBe(true)
    expect(indicator.text()).toBe('Default')
  })
})

// ---------------------------------------------------------------------------
// Issue-28 TC-11 — "Save as default" is not rendered when no fuel types are loaded
// ---------------------------------------------------------------------------

describe('Issue-28 TC-11: "Save as default" is not rendered when no fuel types are loaded', () => {
  it('does not render any .default-fuel-button when availableFuelTypes is empty', async () => {
    mockResults.value = []

    activeWrapper = mountComponent()
    await flushPromises()

    const buttons = activeWrapper.findAll('.default-fuel-button')
    expect(buttons).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// Issue-28 TC-12 — After saving, the fuel type list reorders with new default first
// ---------------------------------------------------------------------------

describe('Issue-28 TC-12: after saving "Gasoil" as default, it appears first in the fuel type list', () => {
  it('places "Gasoil" at index 0 in the fuel type selector after saving', async () => {
    mockResults.value = [
      {
        stationName: 'Station A',
        url: 'https://example.com/station/a',
        fuels: [
          { type: 'SP95', price: 1.89 },
          { type: 'Gasoil', price: 1.75 },
          { type: 'E10', price: 1.79 },
        ],
      },
    ]

    activeWrapper = await mountAndSeedSelection(mockResults.value)

    // Select Gasoil and save as default
    const buttons = activeWrapper.findAll('.fuel-type-selector button')
    const gasoilButton = buttons.find((b) => b.text() === 'Gasoil')
    await gasoilButton!.trigger('click')
    await flushPromises()

    const saveButton = activeWrapper.findAll('.default-fuel-button').find((b) => b.text() === 'Save as default')
    await saveButton!.trigger('click')
    await flushPromises()
    await nextTick()
    await flushPromises()

    const reorderedButtons = activeWrapper.findAll('.fuel-type-selector button')
    expect(reorderedButtons[0].text()).toBe('Gasoil')
  })
})

// ---------------------------------------------------------------------------
// Issue-28 TC-16 — On startup with a valid stored default, "Default" indicator shown and "Save as default" hidden
// ---------------------------------------------------------------------------

describe('Issue-28 TC-16: on startup with a valid stored default, "Default" indicator is shown and "Save as default" is hidden', () => {
  it('shows the default indicator and hides "Save as default" when the stored default is the selected type', async () => {
    mockDefaultFuelType.value = 'SP95'
    mockResults.value = [
      { stationName: 'Station A', url: 'https://example.com/station/a', fuels: [{ type: 'SP95', price: 1.89 }] },
    ]

    activeWrapper = await mountAndSeedSelection(mockResults.value)

    const indicator = activeWrapper.find('.default-indicator')
    expect(indicator.exists()).toBe(true)
    expect(indicator.text()).toBe('Default')

    const allButtons = activeWrapper.findAll('.default-fuel-button')
    const labels = allButtons.map((b) => b.text())
    expect(labels).not.toContain('Save as default')
    expect(labels).toContain('Clear default')
  })
})

// ---------------------------------------------------------------------------
// Issue-28 TC-17 — "Update default" is visible when selection differs from stored default
// ---------------------------------------------------------------------------

describe('Issue-28 TC-17: "Update default" is visible when selection differs from stored default', () => {
  it('renders "Update default" when "Gasoil" is selected and "SP95" is the default', async () => {
    mockDefaultFuelType.value = 'SP95'
    mockResults.value = [
      {
        stationName: 'Station A',
        url: 'https://example.com/station/a',
        fuels: [
          { type: 'SP95', price: 1.89 },
          { type: 'Gasoil', price: 1.75 },
        ],
      },
    ]

    activeWrapper = await mountAndSeedSelection(mockResults.value)

    // Select Gasoil (which differs from the stored default SP95)
    const buttons = activeWrapper.findAll('.fuel-type-selector button')
    const gasoilButton = buttons.find((b) => b.text() === 'Gasoil')
    await gasoilButton!.trigger('click')
    await nextTick()

    const updateButton = activeWrapper.findAll('.default-fuel-button').find((b) => b.text() === 'Update default')
    expect(updateButton).toBeDefined()
    expect(updateButton!.exists()).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Issue-28 TC-18 — "Update default" is not visible when selection matches stored default
// ---------------------------------------------------------------------------

describe('Issue-28 TC-18: "Update default" is not rendered when the selected type matches the stored default', () => {
  it('hides "Update default" when "SP95" is selected and "SP95" is the stored default', async () => {
    mockDefaultFuelType.value = 'SP95'
    mockResults.value = [
      {
        stationName: 'Station A',
        url: 'https://example.com/station/a',
        fuels: [
          { type: 'SP95', price: 1.89 },
          { type: 'Gasoil', price: 1.75 },
        ],
      },
    ]

    activeWrapper = await mountAndSeedSelection(mockResults.value)

    // SP95 is seeded as selected (matches stored default)
    const allDefaultButtons = activeWrapper.findAll('.default-fuel-button')
    const updateButton = allDefaultButtons.find((b) => b.text() === 'Update default')
    expect(updateButton).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Issue-28 TC-19 — "Update default" is not visible when no default is stored
// ---------------------------------------------------------------------------

describe('Issue-28 TC-19: "Update default" is not rendered when no default is stored', () => {
  it('shows only "Save as default" when defaultFuelType is null', async () => {
    mockDefaultFuelType.value = null
    mockResults.value = [
      {
        stationName: 'Station A',
        url: 'https://example.com/station/a',
        fuels: [{ type: 'Gasoil', price: 1.75 }],
      },
    ]

    activeWrapper = await mountAndSeedSelection(mockResults.value)

    const allDefaultButtons = activeWrapper.findAll('.default-fuel-button')
    const updateButton = allDefaultButtons.find((b) => b.text() === 'Update default')
    expect(updateButton).toBeUndefined()

    const saveButton = allDefaultButtons.find((b) => b.text() === 'Save as default')
    expect(saveButton).toBeDefined()
    expect(saveButton!.exists()).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Issue-28 TC-20 — Clicking "Update default" replaces the stored default
// ---------------------------------------------------------------------------

describe('Issue-28 TC-20: clicking "Update default" calls updateDefaultFuelType with the current selection', () => {
  it('calls updateDefaultFuelType with "Gasoil" and hides "Update default" after clicking', async () => {
    mockDefaultFuelType.value = 'SP95'
    mockResults.value = [
      {
        stationName: 'Station A',
        url: 'https://example.com/station/a',
        fuels: [
          { type: 'SP95', price: 1.89 },
          { type: 'Gasoil', price: 1.75 },
        ],
      },
    ]

    activeWrapper = await mountAndSeedSelection(mockResults.value)

    // Select Gasoil
    const buttons = activeWrapper.findAll('.fuel-type-selector button')
    const gasoilButton = buttons.find((b) => b.text() === 'Gasoil')
    await gasoilButton!.trigger('click')
    await nextTick()

    const updateButton = activeWrapper.findAll('.default-fuel-button').find((b) => b.text() === 'Update default')
    expect(updateButton!.exists()).toBe(true)

    await updateButton!.trigger('click')
    await flushPromises()

    expect(mockUpdateDefaultFuelType).toHaveBeenCalledWith('Gasoil')

    // After update, mockDefaultFuelType.value === 'Gasoil' — selectedFuelType matches default,
    // so "Update default" should disappear
    await nextTick()
    const remainingButtons = activeWrapper.findAll('.default-fuel-button')
    const stillUpdate = remainingButtons.find((b) => b.text() === 'Update default')
    expect(stillUpdate).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Issue-28 TC-21 — After updating, "Clear default" remains visible
// ---------------------------------------------------------------------------

describe('Issue-28 TC-21: after updating, "Clear default" remains visible', () => {
  it('keeps "Clear default" visible after "Update default" is clicked', async () => {
    mockDefaultFuelType.value = 'SP95'
    mockResults.value = [
      {
        stationName: 'Station A',
        url: 'https://example.com/station/a',
        fuels: [
          { type: 'SP95', price: 1.89 },
          { type: 'Gasoil', price: 1.75 },
        ],
      },
    ]

    activeWrapper = await mountAndSeedSelection(mockResults.value)

    // Select Gasoil and click "Update default"
    const fuelButtons = activeWrapper.findAll('.fuel-type-selector button')
    const gasoilButton = fuelButtons.find((b) => b.text() === 'Gasoil')
    await gasoilButton!.trigger('click')
    await nextTick()

    const updateButton = activeWrapper.findAll('.default-fuel-button').find((b) => b.text() === 'Update default')
    await updateButton!.trigger('click')
    await flushPromises()
    await nextTick()

    const allButtons = activeWrapper.findAll('.default-fuel-button')
    const clearButton = allButtons.find((b) => b.text() === 'Clear default')
    expect(clearButton).toBeDefined()
    expect(clearButton!.exists()).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Issue-28 TC-22 — "Clear default" is visible when default stored and selection = default
// ---------------------------------------------------------------------------

describe('Issue-28 TC-22: "Clear default" is visible when a default is stored and selection matches', () => {
  it('shows "Clear default" when "SP95" is selected and is the stored default', async () => {
    mockDefaultFuelType.value = 'SP95'
    mockResults.value = [
      { stationName: 'Station A', url: 'https://example.com/station/a', fuels: [{ type: 'SP95', price: 1.89 }] },
    ]

    activeWrapper = await mountAndSeedSelection(mockResults.value)

    const clearButton = activeWrapper.findAll('.default-fuel-button').find((b) => b.text() === 'Clear default')
    expect(clearButton).toBeDefined()
    expect(clearButton!.exists()).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Issue-28 TC-23 — "Clear default" is visible when default stored and selection ≠ default
// ---------------------------------------------------------------------------

describe('Issue-28 TC-23: "Clear default" is visible when a default is stored and selection differs', () => {
  it('shows "Clear default" alongside "Update default" when "Gasoil" is selected and "SP95" is stored', async () => {
    mockDefaultFuelType.value = 'SP95'
    mockResults.value = [
      {
        stationName: 'Station A',
        url: 'https://example.com/station/a',
        fuels: [
          { type: 'SP95', price: 1.89 },
          { type: 'Gasoil', price: 1.75 },
        ],
      },
    ]

    activeWrapper = await mountAndSeedSelection(mockResults.value)

    const fuelButtons = activeWrapper.findAll('.fuel-type-selector button')
    const gasoilButton = fuelButtons.find((b) => b.text() === 'Gasoil')
    await gasoilButton!.trigger('click')
    await nextTick()

    const allButtons = activeWrapper.findAll('.default-fuel-button')
    const labels = allButtons.map((b) => b.text())
    expect(labels).toContain('Clear default')
    expect(labels).toContain('Update default')
  })
})

// ---------------------------------------------------------------------------
// Issue-28 TC-24 — "Clear default" is not visible when no default is stored
// ---------------------------------------------------------------------------

describe('Issue-28 TC-24: "Clear default" is not rendered when no default is stored', () => {
  it('does not render "Clear default" when defaultFuelType is null', async () => {
    mockDefaultFuelType.value = null
    mockResults.value = [
      { stationName: 'Station A', url: 'https://example.com/station/a', fuels: [{ type: 'SP95', price: 1.89 }] },
    ]

    activeWrapper = await mountAndSeedSelection(mockResults.value)

    const allButtons = activeWrapper.findAll('.default-fuel-button')
    const clearButton = allButtons.find((b) => b.text() === 'Clear default')
    expect(clearButton).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Issue-28 TC-25 — Clicking "Clear default" calls clearDefaultFuelType
// ---------------------------------------------------------------------------

describe('Issue-28 TC-25: clicking "Clear default" calls clearDefaultFuelType', () => {
  it('calls clearDefaultFuelType when the "Clear default" button is clicked', async () => {
    mockDefaultFuelType.value = 'SP95'
    mockResults.value = [
      { stationName: 'Station A', url: 'https://example.com/station/a', fuels: [{ type: 'SP95', price: 1.89 }] },
    ]

    activeWrapper = await mountAndSeedSelection(mockResults.value)

    const clearButton = activeWrapper.findAll('.default-fuel-button').find((b) => b.text() === 'Clear default')
    await clearButton!.trigger('click')
    await flushPromises()

    expect(mockClearDefaultFuelType).toHaveBeenCalledTimes(1)
  })
})

// ---------------------------------------------------------------------------
// Issue-28 TC-26 — After clearing, "Save as default" reappears
// ---------------------------------------------------------------------------

describe('Issue-28 TC-26: after clearing, "Save as default" reappears', () => {
  it('shows "Save as default" after "Clear default" is clicked', async () => {
    mockDefaultFuelType.value = 'SP95'
    mockResults.value = [
      { stationName: 'Station A', url: 'https://example.com/station/a', fuels: [{ type: 'SP95', price: 1.89 }] },
    ]

    activeWrapper = await mountAndSeedSelection(mockResults.value)

    const clearButton = activeWrapper.findAll('.default-fuel-button').find((b) => b.text() === 'Clear default')
    await clearButton!.trigger('click')
    await flushPromises()
    await nextTick()

    const allButtons = activeWrapper.findAll('.default-fuel-button')
    const saveButton = allButtons.find((b) => b.text() === 'Save as default')
    expect(saveButton).toBeDefined()
    expect(saveButton!.exists()).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Issue-28 TC-27 — After clearing, "Update default" and "Clear default" are hidden
// ---------------------------------------------------------------------------

describe('Issue-28 TC-27: after clearing, "Update default" and "Clear default" are hidden', () => {
  it('hides "Update default" and "Clear default" after "Clear default" is clicked', async () => {
    mockDefaultFuelType.value = 'SP95'
    mockResults.value = [
      { stationName: 'Station A', url: 'https://example.com/station/a', fuels: [{ type: 'SP95', price: 1.89 }] },
    ]

    activeWrapper = await mountAndSeedSelection(mockResults.value)

    const clearButton = activeWrapper.findAll('.default-fuel-button').find((b) => b.text() === 'Clear default')
    await clearButton!.trigger('click')
    await flushPromises()
    await nextTick()

    const allButtons = activeWrapper.findAll('.default-fuel-button')
    const labels = allButtons.map((b) => b.text())
    expect(labels).not.toContain('Update default')
    expect(labels).not.toContain('Clear default')
  })
})

// ---------------------------------------------------------------------------
// Issue-28 TC-28 — After clearing, the "Default" indicator is removed
// ---------------------------------------------------------------------------

describe('Issue-28 TC-28: after clearing, the "Default" indicator disappears', () => {
  it('removes .default-indicator after "Clear default" is clicked', async () => {
    mockDefaultFuelType.value = 'SP95'
    mockResults.value = [
      { stationName: 'Station A', url: 'https://example.com/station/a', fuels: [{ type: 'SP95', price: 1.89 }] },
    ]

    activeWrapper = await mountAndSeedSelection(mockResults.value)

    // Indicator should be present initially
    expect(activeWrapper.find('.default-indicator').exists()).toBe(true)

    const clearButton = activeWrapper.findAll('.default-fuel-button').find((b) => b.text() === 'Clear default')
    await clearButton!.trigger('click')
    await flushPromises()
    await nextTick()

    expect(activeWrapper.find('.default-indicator').exists()).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Issue-28 TC-29 — After clearing, the fuel type list reverts to natural order
// ---------------------------------------------------------------------------

describe('Issue-28 TC-29: after clearing, the fuel type list reverts to natural order', () => {
  it('shows ["SP95", "Gasoil", "E10"] after clearing a "Gasoil" default', async () => {
    mockDefaultFuelType.value = 'Gasoil'
    mockResults.value = [
      {
        stationName: 'Station A',
        url: 'https://example.com/station/a',
        fuels: [
          { type: 'SP95', price: 1.89 },
          { type: 'Gasoil', price: 1.75 },
          { type: 'E10', price: 1.79 },
        ],
      },
    ]

    activeWrapper = await mountAndSeedSelection(mockResults.value)

    // Before clearing: Gasoil is first (ordered by default)
    const buttonsBefore = activeWrapper.findAll('.fuel-type-selector button')
    expect(buttonsBefore[0].text()).toBe('Gasoil')

    const clearButton = activeWrapper.findAll('.default-fuel-button').find((b) => b.text() === 'Clear default')
    await clearButton!.trigger('click')
    await flushPromises()
    await nextTick()

    // After clearing: natural order restored
    const buttonsAfter = activeWrapper.findAll('.fuel-type-selector button')
    expect(buttonsAfter[0].text()).toBe('SP95')
    expect(buttonsAfter[1].text()).toBe('Gasoil')
    expect(buttonsAfter[2].text()).toBe('E10')
  })
})

// ---------------------------------------------------------------------------
// Issue-28 TC-30 — "Default" indicator is shown when selected type matches stored default
// ---------------------------------------------------------------------------

describe('Issue-28 TC-30: "Default" indicator is shown when selected type matches stored default', () => {
  it('renders .default-indicator when "SP95" is selected and is the stored default', async () => {
    mockDefaultFuelType.value = 'SP95'
    mockResults.value = [
      { stationName: 'Station A', url: 'https://example.com/station/a', fuels: [{ type: 'SP95', price: 1.89 }] },
    ]

    activeWrapper = await mountAndSeedSelection(mockResults.value)

    const indicator = activeWrapper.find('.default-indicator')
    expect(indicator.exists()).toBe(true)
    expect(indicator.text()).toBe('Default')
  })
})

// ---------------------------------------------------------------------------
// Issue-28 TC-31 — "Default" indicator is not shown when selected type differs from stored default
// ---------------------------------------------------------------------------

describe('Issue-28 TC-31: "Default" indicator is not shown when selected type differs from stored default', () => {
  it('does not render .default-indicator when "Gasoil" is selected and "SP95" is the stored default', async () => {
    mockDefaultFuelType.value = 'SP95'
    mockResults.value = [
      {
        stationName: 'Station A',
        url: 'https://example.com/station/a',
        fuels: [
          { type: 'SP95', price: 1.89 },
          { type: 'Gasoil', price: 1.75 },
        ],
      },
    ]

    activeWrapper = await mountAndSeedSelection(mockResults.value)

    // Select Gasoil
    const fuelButtons = activeWrapper.findAll('.fuel-type-selector button')
    const gasoilButton = fuelButtons.find((b) => b.text() === 'Gasoil')
    await gasoilButton!.trigger('click')
    await nextTick()

    expect(activeWrapper.find('.default-indicator').exists()).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Issue-28 TC-32 — "Default" indicator is not shown when no default is stored
// ---------------------------------------------------------------------------

describe('Issue-28 TC-32: "Default" indicator is not shown when no default is stored', () => {
  it('does not render .default-indicator when defaultFuelType is null', async () => {
    mockDefaultFuelType.value = null
    mockResults.value = [
      { stationName: 'Station A', url: 'https://example.com/station/a', fuels: [{ type: 'SP95', price: 1.89 }] },
    ]

    activeWrapper = await mountAndSeedSelection(mockResults.value)

    expect(activeWrapper.find('.default-indicator').exists()).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Issue-28 TC-34 — Fuel type label is not rendered as raw HTML
// ---------------------------------------------------------------------------

describe('Issue-28 TC-34: fuel type labels containing HTML markup are displayed as plain text', () => {
  it('renders "<b>SP95</b>" as a literal string, not as bold markup', async () => {
    mockResults.value = [
      {
        stationName: 'Station A',
        url: 'https://example.com/station/a',
        fuels: [{ type: '<b>SP95</b>', price: 1.89 }],
      },
    ]

    activeWrapper = await mountAndSeedSelection(mockResults.value)

    // The fuel-type-selector should show the literal string, not rendered HTML
    const selectorButtons = activeWrapper.findAll('.fuel-type-selector button')
    expect(selectorButtons).toHaveLength(1)
    expect(selectorButtons[0].text()).toBe('<b>SP95</b>')
    // No <b> element should be rendered inside the button
    expect(selectorButtons[0].find('b').exists()).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Issue-28 TC-37 — "Save as default" button is keyboard accessible
// ---------------------------------------------------------------------------

describe('Issue-28 TC-37: "Save as default" is a plain <button> element for keyboard accessibility', () => {
  it('renders as a <button> with type="button" so it is reachable via Tab and activatable via Enter/Space', async () => {
    mockResults.value = [
      { stationName: 'Station A', url: 'https://example.com/station/a', fuels: [{ type: 'SP95', price: 1.89 }] },
    ]

    activeWrapper = await mountAndSeedSelection(mockResults.value)

    const saveButton = activeWrapper.findAll('.default-fuel-button').find((b) => b.text() === 'Save as default')
    expect(saveButton).toBeDefined()
    expect(saveButton!.element.tagName).toBe('BUTTON')
    expect(saveButton!.attributes('type')).toBe('button')
  })
})

// ---------------------------------------------------------------------------
// Issue-28 TC-38 — "Update default" button is keyboard accessible
// ---------------------------------------------------------------------------

describe('Issue-28 TC-38: "Update default" is a plain <button> element for keyboard accessibility', () => {
  it('renders as a <button> with type="button" so it is reachable via Tab and activatable via Enter/Space', async () => {
    mockDefaultFuelType.value = 'SP95'
    mockResults.value = [
      {
        stationName: 'Station A',
        url: 'https://example.com/station/a',
        fuels: [
          { type: 'SP95', price: 1.89 },
          { type: 'Gasoil', price: 1.75 },
        ],
      },
    ]

    activeWrapper = await mountAndSeedSelection(mockResults.value)

    // Select Gasoil to make "Update default" visible
    const fuelButtons = activeWrapper.findAll('.fuel-type-selector button')
    const gasoilButton = fuelButtons.find((b) => b.text() === 'Gasoil')
    await gasoilButton!.trigger('click')
    await nextTick()

    const updateButton = activeWrapper.findAll('.default-fuel-button').find((b) => b.text() === 'Update default')
    expect(updateButton).toBeDefined()
    expect(updateButton!.element.tagName).toBe('BUTTON')
    expect(updateButton!.attributes('type')).toBe('button')
  })
})

// ---------------------------------------------------------------------------
// Issue-28 TC-39 — "Clear default" button is keyboard accessible
// ---------------------------------------------------------------------------

describe('Issue-28 TC-39: "Clear default" is a plain <button> element for keyboard accessibility', () => {
  it('renders as a <button> with type="button" so it is reachable via Tab and activatable via Enter/Space', async () => {
    mockDefaultFuelType.value = 'SP95'
    mockResults.value = [
      { stationName: 'Station A', url: 'https://example.com/station/a', fuels: [{ type: 'SP95', price: 1.89 }] },
    ]

    activeWrapper = await mountAndSeedSelection(mockResults.value)

    const clearButton = activeWrapper.findAll('.default-fuel-button').find((b) => b.text() === 'Clear default')
    expect(clearButton).toBeDefined()
    expect(clearButton!.element.tagName).toBe('BUTTON')
    expect(clearButton!.attributes('type')).toBe('button')
  })
})
