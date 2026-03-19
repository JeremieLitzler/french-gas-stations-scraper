/**
 * Tests for StationPricesContent component — Issue #31 reactivity scenarios.
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

vi.mock('@/composables/useDefaultFuelType', () => ({
  useDefaultFuelType: () => ({
    defaultFuelType: mockDefaultFuelType,
    loadDefaultFuelType: mockLoadDefaultFuelType,
    saveDefaultFuelType: mockSaveDefaultFuelType,
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

// ---------------------------------------------------------------------------
// Setup / teardown — unmount between tests to prevent stale watcher callbacks
// ---------------------------------------------------------------------------

let activeWrapper: VueWrapper | null = null

beforeEach(() => {
  mockResults.value = []
  mockWarnings.value = []
  mockIsLoading.value = false
  mockFetchCompleted.value = false
  // Reset stations synchronously before component mounts
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
// Issue-28 TC-06 — "Save as default" stores the selected fuel type; UI reflects
//                  the confirmed/active state.
// ---------------------------------------------------------------------------

describe('Issue-28 TC-06: clicking "Save as default" stores the selection and activates the button', () => {
  it('calls saveDefaultFuelType with the selected fuel type and shows "Default saved" label', async () => {
    mockResults.value = [
      { stationName: 'Station A', url: 'https://example.com/station/a', fuels: [{ type: 'SP95', price: 1.89 }] },
    ]

    activeWrapper = mountComponent()
    await flushPromises()

    // Trigger watcher so selectedFuelType is seeded
    const snapshot = [...mockResults.value]
    mockResults.value = []
    await nextTick()
    mockResults.value = snapshot
    await nextTick()
    await flushPromises()

    const saveButton = activeWrapper.find('.default-fuel-button')
    expect(saveButton.exists()).toBe(true)

    await saveButton.trigger('click')
    await flushPromises()

    expect(mockSaveDefaultFuelType).toHaveBeenCalledWith('SP95')

    // After save, mockDefaultFuelType.value === 'SP95', so isCurrentDefault should be true
    await nextTick()
    const updatedButton = activeWrapper.find('.default-fuel-button')
    expect(updatedButton.text()).toBe('Default saved')
    expect(updatedButton.classes()).toContain('default-fuel-button--saved')
  })
})

// ---------------------------------------------------------------------------
// Issue-28 TC-07 — "Save as default" is not rendered when no fuel types are available
// ---------------------------------------------------------------------------

describe('Issue-28 TC-07: "Save as default" button is not rendered when no fuel types are loaded', () => {
  it('does not render the default-fuel-actions section when availableFuelTypes is empty', async () => {
    mockResults.value = []

    activeWrapper = mountComponent()
    await flushPromises()

    const saveButton = activeWrapper.find('.default-fuel-button')
    expect(saveButton.exists()).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Issue-28 TC-08 — After saving, the fuel type list reorders with new default first
// ---------------------------------------------------------------------------

describe('Issue-28 TC-08: after saving "Gasoil" as default, it appears first in the fuel type list', () => {
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

    activeWrapper = mountComponent()
    await flushPromises()

    // Seed selectedFuelType via watcher
    const snapshot = [...mockResults.value]
    mockResults.value = []
    await nextTick()
    mockResults.value = snapshot
    await nextTick()
    await flushPromises()

    // Select Gasoil and save as default
    const buttons = activeWrapper.findAll('.fuel-type-selector button')
    const gasoilButton = buttons.find((b) => b.text() === 'Gasoil')
    expect(gasoilButton).toBeDefined()
    await gasoilButton!.trigger('click')
    await flushPromises()

    const saveButton = activeWrapper.find('.default-fuel-button')
    await saveButton.trigger('click')
    await flushPromises()

    // mockSaveDefaultFuelType sets mockDefaultFuelType.value = 'Gasoil'
    await nextTick()
    await flushPromises()

    const reorderedButtons = activeWrapper.findAll('.fuel-type-selector button')
    expect(reorderedButtons[0].text()).toBe('Gasoil')
  })
})

// ---------------------------------------------------------------------------
// Issue-28 TC-12 — "Update default" is visible when selection differs from stored default
// ---------------------------------------------------------------------------

describe('Issue-28 TC-12: "Update default" button is visible when the selected type differs from the stored default', () => {
  it('renders the "Update default" button when "Gasoil" is selected and "SP95" is the default', async () => {
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

    activeWrapper = mountComponent()
    await flushPromises()

    // Seed selection
    const snapshot = [...mockResults.value]
    mockResults.value = []
    await nextTick()
    mockResults.value = snapshot
    await nextTick()
    await flushPromises()

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
// Issue-28 TC-13 — "Update default" is not visible when selection matches stored default
// ---------------------------------------------------------------------------

describe('Issue-28 TC-13: "Update default" button is not rendered when the selected type matches the stored default', () => {
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

    activeWrapper = mountComponent()
    await flushPromises()

    // Seed selection (SP95 is the stored default, so it seeds as SP95)
    const snapshot = [...mockResults.value]
    mockResults.value = []
    await nextTick()
    mockResults.value = snapshot
    await nextTick()
    await flushPromises()

    const allDefaultButtons = activeWrapper.findAll('.default-fuel-button')
    const updateButton = allDefaultButtons.find((b) => b.text() === 'Update default')
    expect(updateButton).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Issue-28 TC-14 — "Update default" is not visible when no default is stored
// ---------------------------------------------------------------------------

describe('Issue-28 TC-14: "Update default" button is not rendered when no default is stored', () => {
  it('shows only "Save as default" when defaultFuelType is null', async () => {
    mockDefaultFuelType.value = null
    mockResults.value = [
      {
        stationName: 'Station A',
        url: 'https://example.com/station/a',
        fuels: [{ type: 'Gasoil', price: 1.75 }],
      },
    ]

    activeWrapper = mountComponent()
    await flushPromises()

    const snapshot = [...mockResults.value]
    mockResults.value = []
    await nextTick()
    mockResults.value = snapshot
    await nextTick()
    await flushPromises()

    const allDefaultButtons = activeWrapper.findAll('.default-fuel-button')
    const updateButton = allDefaultButtons.find((b) => b.text() === 'Update default')
    expect(updateButton).toBeUndefined()

    const saveButton = allDefaultButtons.find((b) => b.text() === 'Save as default')
    expect(saveButton).toBeDefined()
    expect(saveButton!.exists()).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Issue-28 TC-15 — Clicking "Update default" replaces the stored default
// ---------------------------------------------------------------------------

describe('Issue-28 TC-15: clicking "Update default" calls saveDefaultFuelType with the current selection', () => {
  it('saves "Gasoil" and hides "Update default" after clicking it', async () => {
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

    activeWrapper = mountComponent()
    await flushPromises()

    const snapshot = [...mockResults.value]
    mockResults.value = []
    await nextTick()
    mockResults.value = snapshot
    await nextTick()
    await flushPromises()

    // Select Gasoil
    const buttons = activeWrapper.findAll('.fuel-type-selector button')
    const gasoilButton = buttons.find((b) => b.text() === 'Gasoil')
    await gasoilButton!.trigger('click')
    await nextTick()

    const updateButton = activeWrapper.findAll('.default-fuel-button').find((b) => b.text() === 'Update default')
    expect(updateButton!.exists()).toBe(true)

    await updateButton!.trigger('click')
    await flushPromises()

    expect(mockSaveDefaultFuelType).toHaveBeenCalledWith('Gasoil')

    // After save, mockDefaultFuelType.value === 'Gasoil' — Update default should disappear
    await nextTick()
    const remainingDefaultButtons = activeWrapper.findAll('.default-fuel-button')
    const stillUpdateButton = remainingDefaultButtons.find((b) => b.text() === 'Update default')
    expect(stillUpdateButton).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Issue-28 TC-17 — Fuel type label is not rendered as raw HTML
// ---------------------------------------------------------------------------

describe('Issue-28 TC-17: fuel type labels containing HTML markup are displayed as plain text', () => {
  it('renders "<b>SP95</b>" as a literal string, not as bold markup', async () => {
    mockResults.value = [
      {
        stationName: 'Station A',
        url: 'https://example.com/station/a',
        fuels: [{ type: '<b>SP95</b>', price: 1.89 }],
      },
    ]

    activeWrapper = mountComponent()
    await flushPromises()

    const snapshot = [...mockResults.value]
    mockResults.value = []
    await nextTick()
    mockResults.value = snapshot
    await nextTick()
    await flushPromises()

    // The fuel-type-selector should show the literal string, not rendered HTML
    const selectorButtons = activeWrapper.findAll('.fuel-type-selector button')
    expect(selectorButtons).toHaveLength(1)
    expect(selectorButtons[0].text()).toBe('<b>SP95</b>')
    // No <b> element should be rendered inside the button
    expect(selectorButtons[0].find('b').exists()).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Issue-28 TC-19 — "Save as default" button is keyboard accessible
// ---------------------------------------------------------------------------

describe('Issue-28 TC-19: "Save as default" is a plain <button> element for keyboard accessibility', () => {
  it('renders as a <button> with type="button" so it is reachable via Tab and activatable via Enter/Space', async () => {
    mockResults.value = [
      { stationName: 'Station A', url: 'https://example.com/station/a', fuels: [{ type: 'SP95', price: 1.89 }] },
    ]

    activeWrapper = mountComponent()
    await flushPromises()

    const snapshot = [...mockResults.value]
    mockResults.value = []
    await nextTick()
    mockResults.value = snapshot
    await nextTick()
    await flushPromises()

    const saveButton = activeWrapper.find('.default-fuel-button')
    expect(saveButton.element.tagName).toBe('BUTTON')
    expect(saveButton.attributes('type')).toBe('button')
  })
})

// ---------------------------------------------------------------------------
// Issue-28 TC-20 — "Update default" button is keyboard accessible
// ---------------------------------------------------------------------------

describe('Issue-28 TC-20: "Update default" is a plain <button> element for keyboard accessibility', () => {
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

    activeWrapper = mountComponent()
    await flushPromises()

    const snapshot = [...mockResults.value]
    mockResults.value = []
    await nextTick()
    mockResults.value = snapshot
    await nextTick()
    await flushPromises()

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
