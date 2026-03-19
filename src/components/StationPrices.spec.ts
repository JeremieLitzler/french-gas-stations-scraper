/**
 * Tests for the StationPrices component.
 *
 * TC-11 through TC-24 (existing) and TC-07 (Suspense: no internal loader).
 *
 * Both `useStationPrices` and `useStationStorage` are mocked so tests
 * fully control reactive state (results, warnings, fetchCompleted)
 * without network calls or IndexedDB.
 *
 * StationPrices uses a top-level await in <script setup> and must be
 * mounted inside a <Suspense> boundary. mountComponent() wraps the
 * component in a Suspense parent automatically.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, nextTick, ref } from 'vue'
import type { StationData } from '@/types/station-data'
import type { StationWarning } from '@/types/station-warning'
import StationPrices from './StationPrices.vue'

// ---------------------------------------------------------------------------
// Shared mock state — mutated per test in beforeEach
// ---------------------------------------------------------------------------

const mockResults = ref<StationData[]>([])
const mockWarnings = ref<StationWarning[]>([])
const mockFetchCompleted = ref(false)
const mockLoadAllStationPrices = vi.fn().mockResolvedValue(undefined)

vi.mock('@/composables/useStationPrices', () => ({
  useStationPrices: () => ({
    results: mockResults,
    warnings: mockWarnings,
    fetchCompleted: mockFetchCompleted,
    loadAllStationPrices: mockLoadAllStationPrices,
    removeStationPrice: vi.fn(),
    addStationPrice: vi.fn().mockResolvedValue(undefined),
    renameStation: vi.fn(),
  }),
}))

const mockStations = ref([
  { name: 'Station A', url: 'https://www.prix-carburants.gouv.fr/station/11111' },
])
const mockLoadStations = vi.fn().mockResolvedValue(undefined)

vi.mock('@/composables/useStationStorage', () => ({
  useStationStorage: () => ({
    stations: mockStations,
    loadStations: mockLoadStations,
  }),
}))

// ---------------------------------------------------------------------------
// Mock useDefaultFuelType (required by StationPricesContent — Issue #28)
// ---------------------------------------------------------------------------

vi.mock('@/composables/useDefaultFuelType', () => ({
  useDefaultFuelType: () => ({
    defaultFuelType: ref(null),
    loadDefaultFuelType: vi.fn().mockResolvedValue(undefined),
    saveDefaultFuelType: vi.fn().mockResolvedValue(undefined),
    updateDefaultFuelType: vi.fn().mockResolvedValue(undefined),
    clearDefaultFuelType: vi.fn().mockResolvedValue(undefined),
  }),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeStation(name: string, fuels: { type: string; price: number | null }[]): StationData {
  return { stationName: name, url: `https://www.prix-carburants.gouv.fr/station/${name.replace(/\s+/g, '-')}`, fuels }
}

const sharedStubs = {
  AppLink: { template: '<a><slot /></a>' },
  Table: { template: '<table><slot /></table>' },
  TableHeader: { template: '<thead><slot /></thead>' },
  TableBody: { template: '<tbody><slot /></tbody>' },
  TableRow: { template: '<tr><slot /></tr>' },
  TableHead: { template: '<th><slot /></th>' },
  TableCell: { template: '<td><slot /></td>' },
}

/**
 * Mount StationPrices inside a <Suspense> boundary.
 * StationPrices uses a top-level await — Vue requires a Suspense ancestor.
 * After mounting, flush promises so async setup resolves.
 */
function mountComponent() {
  const Wrapper = defineComponent({
    components: { StationPrices },
    template: '<Suspense><StationPrices /></Suspense>',
  })
  return mount(Wrapper, {
    global: { stubs: sharedStubs },
  })
}

/**
 * Mount the component and then set results so the non-immediate watcher fires.
 * The watcher on `availableFuelTypes` only fires when results change *after*
 * the component is mounted, so we must set results post-mount to trigger it.
 */
async function mountWithResults(stations: StationData[]) {
  mockResults.value = []
  const wrapper = mountComponent()
  await flushPromises()

  // Now update results — this triggers the watcher inside StationPrices
  mockResults.value = stations
  await nextTick()
  await flushPromises()

  return wrapper
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockResults.value = []
  mockWarnings.value = []
  mockFetchCompleted.value = false
  mockLoadAllStationPrices.mockResolvedValue(undefined)
  mockLoadStations.mockResolvedValue(undefined)
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// TC-07 — Suspense: StationPrices does not render an internal AppLoader
// ---------------------------------------------------------------------------

describe('TC-07: StationPrices does not render an AppLoader internally', () => {
  it('does not render any AppLoader inside StationPrices after setup resolves', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    // AppLoader is not imported or rendered inside StationPrices anymore
    const loaderStub = wrapper.findComponent({ name: 'AppLoader' })
    expect(loaderStub.exists()).toBe(false)
    const loaderDiv = wrapper.find('[data-app-loader]')
    expect(loaderDiv.exists()).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// TC-11 — Selector is not rendered when results are empty
// ---------------------------------------------------------------------------

describe('TC-11: fuel-type selector is hidden when results are empty', () => {
  it('does not render the selector when results is empty', async () => {
    mockResults.value = []
    const wrapper = mountComponent()
    await flushPromises()

    expect(wrapper.find('.fuel-type-selector').exists()).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// TC-12 — Table is not rendered when results are empty
// ---------------------------------------------------------------------------

describe('TC-12: price table is hidden when results are empty', () => {
  it('does not render a table when results is empty', async () => {
    mockResults.value = []
    const wrapper = mountComponent()
    await flushPromises()

    expect(wrapper.find('table').exists()).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// TC-13 — Selector and table appear after loading with results
// ---------------------------------------------------------------------------

describe('TC-13: selector and table appear after loading with results', () => {
  it('renders the selector and table when results are non-empty', async () => {
    mockResults.value = [
      makeStation('Station A', [{ type: 'SP95', price: 1.85 }]),
    ]
    const wrapper = mountComponent()
    await flushPromises()

    expect(wrapper.find('.fuel-type-selector').exists()).toBe(true)
    expect(wrapper.find('table').exists()).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// TC-14 — No selector or table when results are empty after loading
// ---------------------------------------------------------------------------

describe('TC-14: no selector or table when results are empty after loading', () => {
  it('renders neither selector nor table when results is empty', async () => {
    mockResults.value = []
    const wrapper = mountComponent()
    await flushPromises()

    expect(wrapper.find('.fuel-type-selector').exists()).toBe(false)
    expect(wrapper.find('table').exists()).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// TC-15 — Selector defaults to the first available fuel type on load
// ---------------------------------------------------------------------------

describe('TC-15: selector defaults to the first available fuel type', () => {
  it('marks the first fuel type button as active after results arrive', async () => {
    const wrapper = await mountWithResults([
      makeStation('Station A', [
        { type: 'SP95', price: 1.85 },
        { type: 'Gasoil', price: 1.70 },
        { type: 'E85', price: 0.99 },
      ]),
    ])

    const buttons = wrapper.findAll('button')
    expect(buttons[0].text()).toBe('SP95')
    expect(buttons[0].classes()).toContain('active')
    expect(buttons[1].classes()).not.toContain('active')
  })
})

// ---------------------------------------------------------------------------
// TC-16 — Clicking a different fuel type button updates the table
// ---------------------------------------------------------------------------

describe('TC-16: clicking a fuel type button updates the active selection', () => {
  it('marks the clicked button as active and clears the previous selection', async () => {
    const wrapper = await mountWithResults([
      makeStation('Station A', [
        { type: 'SP95', price: 1.85 },
        { type: 'Gasoil', price: 1.70 },
      ]),
    ])

    const buttons = wrapper.findAll('button')
    expect(buttons[0].classes()).toContain('active')

    await buttons[1].trigger('click')

    expect(buttons[1].classes()).toContain('active')
    expect(buttons[0].classes()).not.toContain('active')
  })
})

// ---------------------------------------------------------------------------
// TC-17 — Changing fuel type does not trigger a new fetch
// ---------------------------------------------------------------------------

describe('TC-17: changing fuel type does not trigger a new fetch', () => {
  it('does not call loadAllStationPrices when a different fuel type is clicked', async () => {
    const wrapper = await mountWithResults([
      makeStation('Station A', [
        { type: 'SP95', price: 1.85 },
        { type: 'Gasoil', price: 1.70 },
      ]),
    ])

    const callCountAfterMount = mockLoadAllStationPrices.mock.calls.length

    const buttons = wrapper.findAll('button')
    await buttons[1].trigger('click')

    expect(mockLoadAllStationPrices.mock.calls.length).toBe(callCountAfterMount)
  })
})

// ---------------------------------------------------------------------------
// TC-18 — All stations are shown regardless of whether they carry the type
// ---------------------------------------------------------------------------

describe('TC-18: all stations are shown in the table regardless of fuel type', () => {
  it('renders a row for each station, showing dash for missing type', async () => {
    const wrapper = await mountWithResults([
      makeStation('Station A', [{ type: 'SP95', price: 1.85 }]),
      makeStation('Station B', [{ type: 'Gasoil', price: 1.70 }]),
    ])

    const cells = wrapper.findAll('td')
    const cellTexts = cells.map((c) => c.text())

    expect(cellTexts).toContain('Station A')
    expect(cellTexts).toContain('Station B')
    expect(cellTexts).toContain('—')
  })
})

// ---------------------------------------------------------------------------
// TC-19 — Table has Station Name and Price columns
// ---------------------------------------------------------------------------

describe('TC-19: table has exactly two header columns', () => {
  it('renders Station Name and Price header cells', async () => {
    mockResults.value = [
      makeStation('Station A', [{ type: 'SP95', price: 1.85 }]),
    ]
    const wrapper = mountComponent()
    await flushPromises()

    const headers = wrapper.findAll('th')
    const headerTexts = headers.map((h) => h.text())

    expect(headerTexts).toContain('Station Name')
    expect(headerTexts).toContain('Price')
    expect(headers).toHaveLength(2)
  })
})

// ---------------------------------------------------------------------------
// TC-20 — All fuel type buttons are rendered in the selector
// ---------------------------------------------------------------------------

describe('TC-20: all available fuel type buttons are rendered', () => {
  it('renders one button per available fuel type', async () => {
    mockResults.value = [
      makeStation('Station A', [
        { type: 'SP95', price: 1.85 },
        { type: 'Gasoil', price: 1.70 },
        { type: 'E85', price: 0.99 },
      ]),
    ]
    const wrapper = mountComponent()
    await flushPromises()

    const buttons = wrapper.findAll('.fuel-type-selector button')
    const buttonLabels = buttons.map((b) => b.text())

    expect(buttons).toHaveLength(3)
    expect(buttonLabels).toContain('SP95')
    expect(buttonLabels).toContain('Gasoil')
    expect(buttonLabels).toContain('E85')
  })
})

// ---------------------------------------------------------------------------
// TC-21 — No <select> element used for the fuel type selector
// ---------------------------------------------------------------------------

describe('TC-21: no <select> element is used for the fuel type selector', () => {
  it('does not render a <select> element', async () => {
    mockResults.value = [
      makeStation('Station A', [{ type: 'SP95', price: 1.85 }]),
    ]
    const wrapper = mountComponent()
    await flushPromises()

    expect(wrapper.find('select').exists()).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// TC-22 — Edge case: all stations have null prices — table still renders
// ---------------------------------------------------------------------------

describe('TC-22: table renders even when all stations have null prices', () => {
  it('renders rows with dashes for all stations when prices are null', async () => {
    const wrapper = await mountWithResults([
      makeStation('Station A', [{ type: 'E10', price: null }]),
      makeStation('Station B', [{ type: 'E10', price: null }]),
    ])

    expect(wrapper.find('table').exists()).toBe(true)

    const cells = wrapper.findAll('td')
    const cellTexts = cells.map((c) => c.text())
    const dashCount = cellTexts.filter((t) => t === '—').length
    expect(dashCount).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// TC-23 — Edge case: results change — selected fuel type resets to first available
// ---------------------------------------------------------------------------

describe('TC-23: selected fuel type resets when results change', () => {
  it('resets to the first fuel type from the new results', async () => {
    mockResults.value = [
      makeStation('Station A', [
        { type: 'SP95', price: 1.85 },
        { type: 'Gasoil', price: 1.70 },
      ]),
    ]
    const wrapper = mountComponent()
    await flushPromises()

    // Select Gasoil
    const buttons = wrapper.findAll('button')
    await buttons[1].trigger('click')
    expect(buttons[1].classes()).toContain('active')

    // Results change: only SP98 available now
    mockResults.value = [
      makeStation('Station B', [{ type: 'SP98', price: 1.95 }]),
    ]
    await flushPromises()

    const newButtons = wrapper.findAll('button')
    expect(newButtons[0].text()).toBe('SP98')
    expect(newButtons[0].classes()).toContain('active')
  })
})

// ---------------------------------------------------------------------------
// TC-24 — Security: station names rendered as text, not HTML
// ---------------------------------------------------------------------------

describe('TC-24: station names are rendered as text, not parsed as HTML', () => {
  it('displays a script-tag station name as literal text without executing it', async () => {
    const dangerousName = '<script>alert(1)</script>'
    const wrapper = await mountWithResults([
      makeStation(dangerousName, [{ type: 'SP95', price: 1.85 }]),
    ])

    // The raw script string must appear as text content, not as a DOM element
    expect(wrapper.html()).not.toContain('<script>')
    const cells = wrapper.findAll('td')
    const stationCell = cells.find((c) => c.text().includes('alert'))
    expect(stationCell).toBeDefined()
    // No actual <script> child was injected
    expect(wrapper.find('script').exists()).toBe(false)
  })
})
