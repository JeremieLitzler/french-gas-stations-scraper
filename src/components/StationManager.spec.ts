/**
 * Tests for the StationManager component.
 *
 * useStationStorage is mocked so tests control the reactive station list
 * and assert which storage operations are called.
 *
 * Since issue #110, StationManager.vue also calls useRemotePreferencesWrite,
 * useDefaultFuelType, useGitHubAuth, and useRepoConfig at the top level of
 * its setup(). useDefaultFuelType/useGitHubAuth/useRepoConfig are mocked with
 * plain refs (StationManager only reads their current value when the new
 * "Enregistrer les modifications" button is clicked, it never awaits their
 * load functions itself). useRemotePreferencesWrite is mocked with a small
 * reactive implementation of markStationChange/hasPendingChanges — not a
 * bare vi.fn() — because StationManagerTable.vue (mounted for real here,
 * unstubbed, same as before issue #110) calls the *same* mocked
 * markStationChange when a row is edited/added/deleted, and this file's new
 * button-visibility tests (TC-04 through TC-10) rely on that call flowing
 * through to hasPendingChanges the way the real composable does.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { computed, defineComponent, ref } from 'vue'
import type { Ref } from 'vue'
import StationManager from './StationManager.vue'
import type { RepoConfigDraft } from '@/types/repo-config'
import type { StationChange } from '@/types/preferences'

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
// Mock useRemotePreferencesWrite (issue #110) — a small reactive stand-in,
// not a bare vi.fn(), so markStationChange calls from the real
// (unstubbed) StationManagerTable actually drive hasPendingChanges here.
// ---------------------------------------------------------------------------

const mockPendingStationChanges: Ref<StationChange[]> = ref([])
const mockHasPendingChanges = computed(() => mockPendingStationChanges.value.length > 0)
const mockMarkStationChange = vi.fn((change: StationChange) => {
  mockPendingStationChanges.value = [...mockPendingStationChanges.value, change]
})
const mockIsWriting = ref(false)
const mockPushPreferences = vi.fn().mockResolvedValue(undefined)

vi.mock('@/composables/useRemotePreferencesWrite', () => ({
  useRemotePreferencesWrite: () => ({
    hasPendingChanges: mockHasPendingChanges,
    markStationChange: mockMarkStationChange,
    isWriting: mockIsWriting,
    pushPreferences: mockPushPreferences,
  }),
}))

// ---------------------------------------------------------------------------
// Mock useDefaultFuelType, useGitHubAuth, useRepoConfig (issue #110) — read
// by StationManager.vue's onSaveChanges handler when the new button is
// clicked.
// ---------------------------------------------------------------------------

const mockDefaultFuelType: Ref<string | null> = ref(null)
vi.mock('@/composables/useDefaultFuelType', () => ({
  useDefaultFuelType: () => ({ defaultFuelType: mockDefaultFuelType }),
}))

const mockIsAuthenticated: Ref<boolean> = ref(false)
const mockHandleUnauthorized = vi.fn().mockResolvedValue(undefined)
vi.mock('@/composables/useGitHubAuth', () => ({
  useGitHubAuth: () => ({
    isAuthenticated: mockIsAuthenticated,
    handleUnauthorized: mockHandleUnauthorized,
  }),
}))

const mockRepoConfig: Ref<RepoConfigDraft> = ref({
  ownerRepo: '',
  filePath: '',
  revalidateCacheDays: null,
})
vi.mock('@/composables/useRepoConfig', () => ({
  useRepoConfig: () => ({ repoConfig: mockRepoConfig }),
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
  mockPendingStationChanges.value = []
  mockIsWriting.value = false
  mockPushPreferences.mockResolvedValue(undefined)
  mockDefaultFuelType.value = null
  mockIsAuthenticated.value = false
  mockHandleUnauthorized.mockResolvedValue(undefined)
  mockRepoConfig.value = { ownerRepo: '', filePath: '', revalidateCacheDays: null }
  vi.clearAllMocks()
})

/**
 * Mount StationManager inside a <Suspense> boundary.
 * StationManager uses a top-level await in <script setup> — Vue requires
 * a Suspense ancestor or the component will not render its content.
 */
function mountComponent() {
  const Wrapper = defineComponent({
    components: { StationManager },
    template: '<Suspense><StationManager /></Suspense>',
  })
  return mount(Wrapper, {
    global: {
      stubs: {
        AppLink: { template: '<a><slot /></a>' },
        Table: { template: '<table><slot /></table>' },
        TableHeader: { template: '<thead><slot /></thead>' },
        TableBody: { template: '<tbody><slot /></tbody>' },
        TableRow: { template: '<tr><slot /></tr>' },
        TableHead: { template: '<th><slot /></th>' },
        TableCell: { template: '<td><slot /></td>' },
        PreferencesExport: { template: '<div />' },
        PreferencesImport: { template: '<div />' },
        PreferencesDiffDialog: { template: '<div />' },
      },
    },
  })
}

// ---------------------------------------------------------------------------
// Load orchestration: StationManager no longer loads stations itself
// ---------------------------------------------------------------------------

describe('stations are loaded by HomePageContent.vue, not by StationManager', () => {
  it('does not call loadStations when the component mounts', async () => {
    mountComponent()
    await flushPromises()

    expect(mockLoadStations).not.toHaveBeenCalled()
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

    const firstRowNameInput = wrapper.findAll('input')[2]
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

    const firstRowUrlInput = wrapper.findAll('input')[3]
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

    const firstRowNameInput = wrapper.findAll('input')[2]
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

    const firstRowNameInput = wrapper.findAll('input')[2]
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

    const firstRowNameInput = wrapper.findAll('input')[2]
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

describe('TC-11: A permanent empty new-station row is rendered at the top', () => {
  it('the first data row has two empty inputs and no delete button', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    const rows = wrapper.findAll('tr')
    const newStationRow = rows[1]
    const inputs = newStationRow.findAll('input')
    const buttons = newStationRow.findAll('button.delete-button')

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
    const newRow = rows[1]
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
    const newRow = rows[1]
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
    const newRow = rows[1]
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
    const newRow = rows[1]
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
    const newRow = rows[1]
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
    const newRow = rows[1]
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
    const newRow = rows[1]
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

// ---------------------------------------------------------------------------
// TC-25: Successful name edit shows inline success message on that row
// ---------------------------------------------------------------------------

describe('TC-25: Successful name edit shows inline success message on that row', () => {
  it('shows "Saved" near the edited row after updateStation resolves', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    const firstRowNameInput = wrapper.findAll('input')[2]
    await firstRowNameInput.setValue('Station A Updated')
    await firstRowNameInput.trigger('blur')
    await flushPromises()

    expect(wrapper.text()).toContain('Saved')
  })

  it('success message is not shown on the second row', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    const firstRowNameInput = wrapper.findAll('input')[2]
    await firstRowNameInput.setValue('Station A Updated')
    await firstRowNameInput.trigger('blur')
    await flushPromises()

    const rows = wrapper.findAll('tr')
    // row 0 = header, row 1 = new-station row, row 2 = station A, row 3 = station B
    const secondDataRow = rows[3]
    expect(secondDataRow.text()).not.toContain('Saved')
  })
})

// ---------------------------------------------------------------------------
// TC-26: Successful URL edit shows inline success message on that row
// ---------------------------------------------------------------------------

describe('TC-26: Successful URL edit shows inline success message on that row', () => {
  it('shows "Saved" after a valid URL change is persisted', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    const firstRowUrlInput = wrapper.findAll('input')[3]
    await firstRowUrlInput.setValue('https://www.prix-carburants.gouv.fr/station/99999')
    await firstRowUrlInput.trigger('blur')
    await flushPromises()

    expect(wrapper.text()).toContain('Saved')
  })
})

// ---------------------------------------------------------------------------
// TC-27: Success message auto-dismisses after 2 seconds
// ---------------------------------------------------------------------------

describe('TC-27: Success message auto-dismisses after 2 seconds', () => {
  it('removes the "Saved" message after 2000ms', async () => {
    vi.useFakeTimers()

    const wrapper = mountComponent()
    await flushPromises()

    const firstRowNameInput = wrapper.findAll('input')[2]
    await firstRowNameInput.setValue('Station A Updated')
    await firstRowNameInput.trigger('blur')
    await flushPromises()

    expect(wrapper.text()).toContain('Saved')

    vi.advanceTimersByTime(2000)
    await flushPromises()

    expect(wrapper.text()).not.toContain('Saved')

    vi.useRealTimers()
  })
})

// ---------------------------------------------------------------------------
// TC-28: Blur without change shows no success message
// ---------------------------------------------------------------------------

describe('TC-28: Blur without change shows no success message', () => {
  it('does not show "Saved" when the name value is unchanged on blur', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    const firstRowNameInput = wrapper.findAll('input')[0]
    await firstRowNameInput.trigger('blur')
    await flushPromises()

    expect(wrapper.text()).not.toContain('Saved')
    expect(mockUpdateStation).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// TC-29: Validation failure shows no success message
// ---------------------------------------------------------------------------

describe('TC-29: Validation failure shows no success message', () => {
  it('shows error but no "Saved" when the name is cleared and blurred', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    const firstRowNameInput = wrapper.findAll('input')[2]
    await firstRowNameInput.setValue('')
    await firstRowNameInput.trigger('blur')
    await flushPromises()

    expect(wrapper.text()).toContain('Name must not be empty')
    expect(wrapper.text()).not.toContain('Saved')
  })
})

// ---------------------------------------------------------------------------
// TC-30: Success message does not appear when saving a new station
// ---------------------------------------------------------------------------

describe('TC-30: Success message does not appear when saving a new station via addStation', () => {
  it('does not show "Saved" anywhere after a successful addStation call', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    const rows = wrapper.findAll('tr')
    const newRow = rows[1]
    const [nameInput, urlInput] = newRow.findAll('input')

    await nameInput.setValue('New Station')
    await urlInput.setValue('https://www.prix-carburants.gouv.fr/station/77777')
    await urlInput.trigger('blur')
    await flushPromises()

    expect(mockAddStation).toHaveBeenCalledOnce()
    expect(wrapper.text()).not.toContain('Saved')
  })
})

// ---------------------------------------------------------------------------
// Issue #50 TC-09: Station table is wrapped in a <details> element, closed by default
// ---------------------------------------------------------------------------

describe('Issue #50 TC-09: Station table is collapsed by default inside a <details> element', () => {
  it('renders a <details> element that wraps the station table', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    const details = wrapper.find('details')
    expect(details.exists()).toBe(true)
  })

  it('<details> element does not have the open attribute by default', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    const details = wrapper.find('details')
    expect(details.attributes('open')).toBeUndefined()
  })

  it('<details> element contains a <summary> child element', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    const summary = wrapper.find('details > summary')
    expect(summary.exists()).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Issue #50 TC-10: Station table expands when the user clicks the summary
// ---------------------------------------------------------------------------

describe('Issue #50 TC-10: Station table expands when the <summary> is clicked', () => {
  it('adds the open attribute to <details> after clicking <summary>', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    const summary = wrapper.find('details > summary')
    await summary.trigger('click')

    const details = wrapper.find('details')
    // After a click the browser toggles `open`; in happy-dom the attribute appears
    expect(details.attributes('open')).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// TC-31: Success message is per-row — editing one row does not affect another
// ---------------------------------------------------------------------------

describe('TC-31: Success message is per-row and does not appear on other rows', () => {
  it('shows "Saved" only on the first row when the first row name is edited', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    const firstRowNameInput = wrapper.findAll('input')[2]
    await firstRowNameInput.setValue('Station A Updated')
    await firstRowNameInput.trigger('blur')
    await flushPromises()

    const rows = wrapper.findAll('tr')
    // row 0 = header, row 1 = new-station row, row 2 = station A, row 3 = station B
    const firstDataRow = rows[2]
    const secondDataRow = rows[3]

    expect(firstDataRow.text()).toContain('Saved')
    expect(secondDataRow.text()).not.toContain('Saved')
  })
})

// ---------------------------------------------------------------------------
// "Enregistrer les modifications" button visibility (issue #110, test-cases.md)
//
// StationManagerTable is mounted for real (not stubbed) inside StationManager
// here, so editing a row through it exercises the same markStationChange
// call the real app makes — driving this file's mocked hasPendingChanges the
// way the real composable would.
// ---------------------------------------------------------------------------

function findSaveChangesButton(wrapper: ReturnType<typeof mountComponent>) {
  return wrapper.findAll('button').find((button) => button.text().includes('Enregistrer les modifications'))
}

// ---------------------------------------------------------------------------
// TC-04: No local changes yet — the button is not shown
// ---------------------------------------------------------------------------

describe('TC-04: "Enregistrer les modifications" is not shown when no station-list change is pending', () => {
  it('does not render the button on initial load', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    expect(findSaveChangesButton(wrapper)).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// TC-05: Editing an existing station's name shows the button
// ---------------------------------------------------------------------------

describe('TC-05: editing an existing station name makes the button visible', () => {
  it('renders "Enregistrer les modifications" after a name is edited and blurred', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    const firstRowNameInput = wrapper.findAll('input')[2]
    await firstRowNameInput.setValue('Station A Updated')
    await firstRowNameInput.trigger('blur')
    await flushPromises()

    expect(findSaveChangesButton(wrapper)).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// TC-06: Editing an existing station's URL shows the button
// ---------------------------------------------------------------------------

describe('TC-06: editing an existing station URL makes the button visible', () => {
  it('renders "Enregistrer les modifications" after a URL is edited and blurred', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    const firstRowUrlInput = wrapper.findAll('input')[3]
    await firstRowUrlInput.setValue('https://www.prix-carburants.gouv.fr/station/99999')
    await firstRowUrlInput.trigger('blur')
    await flushPromises()

    expect(findSaveChangesButton(wrapper)).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// TC-07: Adding a new station shows the button
// ---------------------------------------------------------------------------

describe('TC-07: adding a new station makes the button visible', () => {
  it('renders "Enregistrer les modifications" after a new station is saved', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    const rows = wrapper.findAll('tr')
    const newRow = rows[1]
    const [nameInput, urlInput] = newRow.findAll('input')

    await nameInput.setValue('New Station')
    await urlInput.setValue('https://www.prix-carburants.gouv.fr/station/77777')
    await urlInput.trigger('blur')
    await flushPromises()

    expect(findSaveChangesButton(wrapper)).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// TC-08: Deleting a station shows the button
// ---------------------------------------------------------------------------

describe('TC-08: deleting a station makes the button visible', () => {
  it('renders "Enregistrer les modifications" after a station is deleted', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    const deleteButtons = wrapper.findAll('button.delete-button')
    await deleteButtons[0].trigger('click')
    await flushPromises()

    expect(findSaveChangesButton(wrapper)).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// TC-09: Editing two different stations keeps the button visible throughout
// ---------------------------------------------------------------------------

describe('TC-09: editing two different stations in a row keeps the button visible, with no flicker', () => {
  it('stays visible after the first edit and after the second edit', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    const firstRowNameInput = wrapper.findAll('input')[2]
    await firstRowNameInput.setValue('Station A Updated')
    await firstRowNameInput.trigger('blur')
    await flushPromises()

    expect(findSaveChangesButton(wrapper)).toBeDefined()

    const secondRowNameInput = wrapper.findAll('input')[4]
    await secondRowNameInput.setValue('Station B Updated')
    await secondRowNameInput.trigger('blur')
    await flushPromises()

    expect(findSaveChangesButton(wrapper)).toBeDefined()
    expect(mockMarkStationChange).toHaveBeenCalledTimes(2)
  })
})

// ---------------------------------------------------------------------------
// TC-10: The button becomes visible for a local edit even without GitHub sync configured
// ---------------------------------------------------------------------------

describe('TC-10: editing a station makes the button visible even while GitHub sync is not configured', () => {
  it('renders the button after an edit while unauthenticated with no repo config', async () => {
    mockIsAuthenticated.value = false
    mockRepoConfig.value = { ownerRepo: '', filePath: '', revalidateCacheDays: null }

    const wrapper = mountComponent()
    await flushPromises()

    const firstRowNameInput = wrapper.findAll('input')[2]
    await firstRowNameInput.setValue('Station A Updated')
    await firstRowNameInput.trigger('blur')
    await flushPromises()

    expect(findSaveChangesButton(wrapper)).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// TC-11 (dispatch half): clicking the button triggers a single bundled push
// ---------------------------------------------------------------------------

describe('TC-11: clicking "Enregistrer les modifications" triggers one bundled push', () => {
  it('calls pushPreferences once with includeStationChanges: true and the current preferences snapshot', async () => {
    mockIsAuthenticated.value = true
    mockRepoConfig.value = { ownerRepo: 'alice/repo', filePath: 'stations.json', revalidateCacheDays: 7 }

    const wrapper = mountComponent()
    await flushPromises()

    const firstRowNameInput = wrapper.findAll('input')[2]
    await firstRowNameInput.setValue('Station A Updated')
    await firstRowNameInput.trigger('blur')
    await flushPromises()

    const secondRowUrlInput = wrapper.findAll('input')[5]
    await secondRowUrlInput.setValue('https://www.prix-carburants.gouv.fr/station/88888')
    await secondRowUrlInput.trigger('blur')
    await flushPromises()

    expect(mockMarkStationChange).toHaveBeenCalledTimes(2)

    const saveChangesButton = findSaveChangesButton(wrapper)
    await saveChangesButton!.trigger('click')
    await flushPromises()

    expect(mockPushPreferences).toHaveBeenCalledTimes(1)
    expect(mockPushPreferences).toHaveBeenCalledWith(
      true,
      { ownerRepo: 'alice/repo', filePath: 'stations.json', revalidateCacheDays: 7 },
      expect.objectContaining({
        fuelTypeDefault: null,
        favoriteStations: expect.any(Array),
      }),
      true,
      mockHandleUnauthorized,
    )
  })
})
