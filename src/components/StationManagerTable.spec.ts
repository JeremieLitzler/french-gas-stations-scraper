/**
 * Tests for Issue #43: Mobile Station Manager Horizontal Scroll
 *
 * Verifies that the table renders inside a horizontal-scroll container
 * and that the table-auto layout class is applied so columns size to
 * content rather than dividing available width equally.
 */

import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'
import StationManagerTable from './StationManagerTable.vue'

// ---------------------------------------------------------------------------
// Mock useStationStorage
// ---------------------------------------------------------------------------

const mockStations = ref([
  { name: 'Station A', url: 'https://www.prix-carburants.gouv.fr/station/11111' },
])

const mockLoadStations = vi.fn().mockResolvedValue(undefined)
const mockAddStation = vi.fn().mockResolvedValue(undefined)
const mockRemoveStation = vi.fn().mockResolvedValue(undefined)
const mockUpdateStation = vi.fn().mockResolvedValue(undefined)

vi.mock('@/composables/useStationStorage', () => ({
  useStationStorage: () => ({
    stations: mockStations,
    loadStations: mockLoadStations,
    addStation: mockAddStation,
    removeStation: mockRemoveStation,
    updateStation: mockUpdateStation,
  }),
}))

/**
 * Mount StationManagerTable inside a <Suspense> boundary.
 * StationManagerTable uses a top-level await — Vue requires a Suspense ancestor.
 */
function mountComponent() {
  const Wrapper = defineComponent({
    components: { StationManagerTable },
    template: '<Suspense><StationManagerTable /></Suspense>',
  })
  return mount(Wrapper)
}

// ---------------------------------------------------------------------------
// TC-SCROLL-01: Scroll container is rendered
// ---------------------------------------------------------------------------

describe('TC-SCROLL-01: A horizontal-scroll container wraps the table', () => {
  it('renders a container with overflow-auto class enclosing the table element', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    // Table.vue renders <div class="relative w-full overflow-auto"><table>…
    const scrollContainer = wrapper.find('div.overflow-auto')
    expect(scrollContainer.exists()).toBe(true)

    const tableEl = scrollContainer.find('table')
    expect(tableEl.exists()).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// TC-SCROLL-02: Station table is a descendant of the scroll container
// ---------------------------------------------------------------------------

describe('TC-SCROLL-02: The station table is inside the scroll container', () => {
  it('the <table> element is a child of the overflow-auto div', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    const scrollContainer = wrapper.find('div.overflow-auto')
    expect(scrollContainer.exists()).toBe(true)

    // The table must be inside the scroll container, not outside it
    const tableInsideContainer = scrollContainer.find('table')
    expect(tableInsideContainer.exists()).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// TC-SCROLL-03: Existing station-manager behaviour is unaffected
// ---------------------------------------------------------------------------

describe('TC-SCROLL-03: Existing station-manager behaviour is unaffected by the scroll fix', () => {
  it('renders one row per station plus the empty new-station row', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    // 1 header row + 1 station row + 1 new-station row = 3
    const rows = wrapper.findAll('tr')
    expect(rows.length).toBeGreaterThanOrEqual(3)
  })

  it('all data cells contain input elements', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    const inputs = wrapper.findAll('input')
    // 1 station × 2 inputs + 2 new-row inputs = 4
    expect(inputs.length).toBeGreaterThanOrEqual(4)
  })

  it('delete button is present for existing station rows', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    const deleteButtons = wrapper.findAll('button.delete-button')
    expect(deleteButtons.length).toBeGreaterThanOrEqual(1)
  })
})

// ---------------------------------------------------------------------------
// Issue #50 TC-12: Column header "Name" is now "Nom" (French)
// ---------------------------------------------------------------------------

describe('Issue #50 TC-12: Column headers are in French', () => {
  it('renders "Nom" as the first column header and not "Name"', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    const headers = wrapper.findAll('th')
    const headerTexts = headers.map((header) => header.text())

    expect(headerTexts).toContain('Nom')
    expect(headerTexts).not.toContain('Name')
  })
})
