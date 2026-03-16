/**
 * Tests for the StationManager component.
 *
 * useStationStorage is mocked so tests control the reactive station list
 * and assert which storage operations are called.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import StationManager from './StationManager.vue'

// ---------------------------------------------------------------------------
// Mock useStationStorage
// ---------------------------------------------------------------------------

const mockStations = ref([
  { name: 'Station A', url: 'https://www.prix-carburants.gouv.fr/station/11111' },
  { name: 'Station B', url: 'https://www.prix-carburants.gouv.fr/station/22222' },
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

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockStations.value = [
    { name: 'Station A', url: 'https://www.prix-carburants.gouv.fr/station/11111' },
    { name: 'Station B', url: 'https://www.prix-carburants.gouv.fr/station/22222' },
  ]
  mockLoadStations.mockResolvedValue(undefined)
  mockAddStation.mockResolvedValue(undefined)
  mockRemoveStation.mockResolvedValue(undefined)
  mockUpdateStation.mockResolvedValue(undefined)
  vi.clearAllMocks()
})

function mountComponent() {
  return mount(StationManager, {
    global: {
      stubs: {
        Table: { template: '<table><slot /></table>' },
        TableHeader: { template: '<thead><slot /></thead>' },
        TableBody: { template: '<tbody><slot /></tbody>' },
        TableRow: { template: '<tr><slot /></tr>' },
        TableHead: { template: '<th><slot /></th>' },
        TableCell: { template: '<td><slot /></td>' },
      },
    },
  })
}

// ---------------------------------------------------------------------------
// Bug fix: loadStations is called on mount
// ---------------------------------------------------------------------------

describe('loadStations is called on mount to seed defaults from IndexedDB', () => {
  it('calls loadStations once when the component mounts', async () => {
    mountComponent()
    await flushPromises()

    expect(mockLoadStations).toHaveBeenCalledOnce()
  })
})

// ---------------------------------------------------------------------------
// TC-01: Station list renders all existing stations
// ---------------------------------------------------------------------------

describe('TC-01: Station list renders all existing stations as rows', () => {
  it('renders one row per station plus the empty new-station row', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    const rows = wrapper.findAll('tr')
    // 1 header row + 2 station rows + 1 new-station row = 4
    expect(rows).toHaveLength(4)
  })
})

// ---------------------------------------------------------------------------
// TC-02: Each existing row cell is an editable input
// ---------------------------------------------------------------------------

describe('TC-02: Each existing row cell renders an input element', () => {
  it('all data cells contain input elements', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    const inputs = wrapper.findAll('input')
    // 2 stations × 2 inputs + 2 new-row inputs = 6
    expect(inputs.length).toBeGreaterThanOrEqual(6)
  })
})

// ---------------------------------------------------------------------------
// TC-03: Editing a name auto-saves on blur with valid value
// ---------------------------------------------------------------------------

describe('TC-03: Editing an existing station name auto-saves on blur', () => {
  it('calls updateStation with the original URL and the new name', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    const firstRowNameInput = wrapper.findAll('input')[0]
    await firstRowNameInput.setValue('Station A Updated')
    await firstRowNameInput.trigger('blur')
    await flushPromises()

    expect(mockUpdateStation).toHaveBeenCalledWith(
      'https://www.prix-carburants.gouv.fr/station/11111',
      expect.objectContaining({ name: 'Station A Updated' }),
    )
  })
})

// ---------------------------------------------------------------------------
// TC-04: Editing a URL auto-saves on blur with valid value
// ---------------------------------------------------------------------------

describe('TC-04: Editing an existing station URL auto-saves on blur', () => {
  it('calls updateStation with the original URL and the new URL', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    const firstRowUrlInput = wrapper.findAll('input')[1]
    await firstRowUrlInput.setValue('https://www.prix-carburants.gouv.fr/station/99999')
    await firstRowUrlInput.trigger('blur')
    await flushPromises()

    expect(mockUpdateStation).toHaveBeenCalledWith(
      'https://www.prix-carburants.gouv.fr/station/11111',
      expect.objectContaining({ url: 'https://www.prix-carburants.gouv.fr/station/99999' }),
    )
  })
})

// ---------------------------------------------------------------------------
// TC-05: Editing a name to empty reverts and shows inline error
// ---------------------------------------------------------------------------

describe('TC-05: Clearing an existing station name shows inline error and reverts', () => {
  it('shows a name error and does not call updateStation', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    const firstRowNameInput = wrapper.findAll('input')[0]
    await firstRowNameInput.setValue('')
    await firstRowNameInput.trigger('blur')
    await flushPromises()

    expect(mockUpdateStation).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Name must not be empty')
  })
})

// ---------------------------------------------------------------------------
// TC-06: Editing a name to whitespace-only reverts and shows inline error
// ---------------------------------------------------------------------------

describe('TC-06: Whitespace-only name shows inline error and does not save', () => {
  it('shows a name error and does not call updateStation', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    const firstRowNameInput = wrapper.findAll('input')[0]
    await firstRowNameInput.setValue('   ')
    await firstRowNameInput.trigger('blur')
    await flushPromises()

    expect(mockUpdateStation).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Name must not be empty')
  })
})

// ---------------------------------------------------------------------------
// TC-07: Editing a URL to invalid format reverts and shows inline error
// ---------------------------------------------------------------------------

describe('TC-07: Invalid URL on blur shows inline error and reverts', () => {
  it('shows a URL error and does not call updateStation', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    const firstRowUrlInput = wrapper.findAll('input')[1]
    await firstRowUrlInput.setValue('https://example.com/station/1')
    await firstRowUrlInput.trigger('blur')
    await flushPromises()

    expect(mockUpdateStation).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('URL must be a valid')
  })
})

// ---------------------------------------------------------------------------
// TC-08: Editing URL to a duplicate of another row shows inline error
// ---------------------------------------------------------------------------

describe('TC-08: Duplicate URL on blur shows inline error and does not save', () => {
  it('shows a duplicate-URL error and does not call updateStation', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    // Change first row's URL to match second row's URL
    const firstRowUrlInput = wrapper.findAll('input')[1]
    await firstRowUrlInput.setValue('https://www.prix-carburants.gouv.fr/station/22222')
    await firstRowUrlInput.trigger('blur')
    await flushPromises()

    expect(mockUpdateStation).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('already exists')
  })
})

// ---------------------------------------------------------------------------
// TC-09: Inline error clears when user starts typing
// ---------------------------------------------------------------------------

describe('TC-09: Inline error clears when user starts typing in the errored field', () => {
  it('error disappears on input event after a failed blur', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    const firstRowNameInput = wrapper.findAll('input')[0]
    await firstRowNameInput.setValue('')
    await firstRowNameInput.trigger('blur')
    await flushPromises()

    expect(wrapper.text()).toContain('Name must not be empty')

    await firstRowNameInput.setValue('S')
    await firstRowNameInput.trigger('input')
    await flushPromises()

    expect(wrapper.text()).not.toContain('Name must not be empty')
  })
})

// ---------------------------------------------------------------------------
// TC-10: Delete action removes the row immediately
// ---------------------------------------------------------------------------

describe('TC-10: Clicking the delete button calls removeStation', () => {
  it('calls removeStation with the station URL', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    const deleteButtons = wrapper.findAll('button.delete-button')
    expect(deleteButtons.length).toBeGreaterThanOrEqual(1)

    await deleteButtons[0].trigger('click')
    await flushPromises()

    expect(mockRemoveStation).toHaveBeenCalledWith(
      'https://www.prix-carburants.gouv.fr/station/11111',
    )
  })
})

// ---------------------------------------------------------------------------
// TC-11: Empty new-station row is always present at the bottom
// ---------------------------------------------------------------------------

describe('TC-11: A permanent empty new-station row is rendered at the bottom', () => {
  it('the last row has two empty inputs and no delete button', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    const rows = wrapper.findAll('tr')
    const lastRow = rows[rows.length - 1]
    const inputs = lastRow.findAll('input')
    const buttons = lastRow.findAll('button.delete-button')

    expect(inputs).toHaveLength(2)
    expect(inputs[0].element.value).toBe('')
    expect(inputs[1].element.value).toBe('')
    expect(buttons).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// TC-12: New-station row auto-saves when both fields are valid on blur
// ---------------------------------------------------------------------------

describe('TC-12: New-station row auto-saves when both fields are valid on blur', () => {
  it('calls addStation with trimmed name and URL, then clears the inputs', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    const rows = wrapper.findAll('tr')
    const newRow = rows[rows.length - 1]
    const [nameInput, urlInput] = newRow.findAll('input')

    await nameInput.setValue('New Station')
    await urlInput.setValue('https://www.prix-carburants.gouv.fr/station/77777')
    await urlInput.trigger('blur')
    await flushPromises()

    expect(mockAddStation).toHaveBeenCalledWith({
      name: 'New Station',
      url: 'https://www.prix-carburants.gouv.fr/station/77777',
    })
  })
})

// ---------------------------------------------------------------------------
// TC-13: New-station row does not save when only one field is filled on blur
// ---------------------------------------------------------------------------

describe('TC-13: New-station row does not save when only the name field is filled', () => {
  it('does not call addStation and shows no error', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    const rows = wrapper.findAll('tr')
    const newRow = rows[rows.length - 1]
    const [nameInput] = newRow.findAll('input')

    await nameInput.setValue('New Station')
    await nameInput.trigger('blur')
    await flushPromises()

    expect(mockAddStation).not.toHaveBeenCalled()
    expect(wrapper.text()).not.toContain('must not be empty')
    expect(wrapper.text()).not.toContain('valid')
  })
})

// ---------------------------------------------------------------------------
// TC-14: New-station row shows inline error when URL is invalid on blur
// ---------------------------------------------------------------------------

describe('TC-14: New-station row shows URL inline error when URL is invalid', () => {
  it('shows URL error and does not call addStation', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    const rows = wrapper.findAll('tr')
    const newRow = rows[rows.length - 1]
    const [nameInput, urlInput] = newRow.findAll('input')

    await nameInput.setValue('New Station')
    await urlInput.setValue('https://example.com/1')
    await urlInput.trigger('blur')
    await flushPromises()

    expect(mockAddStation).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('URL must be a valid')
  })
})

// ---------------------------------------------------------------------------
// TC-15: New-station row shows name error when URL filled but name is empty
// ---------------------------------------------------------------------------

describe('TC-15: New-station row shows name error when URL is filled but name is empty', () => {
  it('shows name error and does not call addStation', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    const rows = wrapper.findAll('tr')
    const newRow = rows[rows.length - 1]
    const [, urlInput] = newRow.findAll('input')

    await urlInput.setValue('https://www.prix-carburants.gouv.fr/station/88888')
    await urlInput.trigger('blur')
    await flushPromises()

    expect(mockAddStation).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Name must not be empty')
  })
})

// ---------------------------------------------------------------------------
// TC-16: New-station row rejects duplicate URL
// ---------------------------------------------------------------------------

describe('TC-16: New-station row rejects a URL already in the list', () => {
  it('shows duplicate-URL error and does not call addStation', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    const rows = wrapper.findAll('tr')
    const newRow = rows[rows.length - 1]
    const [nameInput, urlInput] = newRow.findAll('input')

    await nameInput.setValue('Another')
    await urlInput.setValue('https://www.prix-carburants.gouv.fr/station/11111')
    await urlInput.trigger('blur')
    await flushPromises()

    expect(mockAddStation).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('already exists')
  })
})

// ---------------------------------------------------------------------------
// TC-17: Input values are trimmed before validation and storage
// ---------------------------------------------------------------------------

describe('TC-17: Input values are trimmed before validation and storage', () => {
  it('calls addStation with trimmed values when inputs have leading/trailing spaces', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    const rows = wrapper.findAll('tr')
    const newRow = rows[rows.length - 1]
    const [nameInput, urlInput] = newRow.findAll('input')

    await nameInput.setValue('  New Station  ')
    await urlInput.setValue('  https://www.prix-carburants.gouv.fr/station/55555  ')
    await urlInput.trigger('blur')
    await flushPromises()

    expect(mockAddStation).toHaveBeenCalledWith({
      name: 'New Station',
      url: 'https://www.prix-carburants.gouv.fr/station/55555',
    })
  })
})

// ---------------------------------------------------------------------------
// TC-23: Blurring a name cell without changing the value does NOT call updateStation
// ---------------------------------------------------------------------------

describe('TC-23: Blurring a name input without editing does not call updateStation', () => {
  it('does not call updateStation when the name value is unchanged on blur', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    // Trigger blur on the first name input without changing its value
    const firstRowNameInput = wrapper.findAll('input')[0]
    await firstRowNameInput.trigger('blur')
    await flushPromises()

    expect(mockUpdateStation).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// TC-24: Blurring a URL cell without changing the value does NOT call updateStation
// ---------------------------------------------------------------------------

describe('TC-24: Blurring a URL input without editing does not call updateStation', () => {
  it('does not call updateStation when the URL value is unchanged on blur', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    // Trigger blur on the first URL input without changing its value
    const firstRowUrlInput = wrapper.findAll('input')[1]
    await firstRowUrlInput.trigger('blur')
    await flushPromises()

    expect(mockUpdateStation).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// TC-22: Raw storage errors are not exposed verbatim in the UI
// ---------------------------------------------------------------------------

describe('TC-22: Storage errors surface as generic messages, not raw error text', () => {
  it('shows a generic error message when addStation throws', async () => {
    mockAddStation.mockRejectedValueOnce(new Error('IDBTransaction failed: quota exceeded'))

    const wrapper = mountComponent()
    await flushPromises()

    const rows = wrapper.findAll('tr')
    const newRow = rows[rows.length - 1]
    const [nameInput, urlInput] = newRow.findAll('input')

    await nameInput.setValue('New Station')
    await urlInput.setValue('https://www.prix-carburants.gouv.fr/station/77777')
    await urlInput.trigger('blur')
    await flushPromises()

    expect(wrapper.text()).not.toContain('IDBTransaction')
    expect(wrapper.text()).not.toContain('quota exceeded')
    expect(wrapper.text()).toContain('Could not save station')
  })
})
