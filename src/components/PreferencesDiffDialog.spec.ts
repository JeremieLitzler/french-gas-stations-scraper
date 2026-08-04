/**
 * Tests for PreferencesDiffDialog.vue's write-confirm section — the GitHub
 * diff screen readability rules added by issue #110.
 *
 * usePreferencesImport, useStationStorage, useDefaultFuelType, and
 * useGitHubAuth are mocked with minimal stand-ins: this file only exercises
 * the write-confirm half of the dialog (`writeDiff`/`isWriteDialogOpen`,
 * driven by useRemotePreferencesWrite), not the import-diff half (already
 * covered by the pre-existing import-flow component tests), so the other
 * composables just need to not throw when called.
 *
 * useRemotePreferencesWrite is mocked with a controllable `writeDiff` ref so
 * each test can feed the exact `RemoteWritePreview` shape it wants to assert
 * the template against.
 *
 * Scenarios covered (test-cases.md, "GitHub diff screen readability"):
 *   TC-17 — only one field changed: shows just that field's old/new value,
 *           not the full station list or raw file content
 *   TC-18 — a station was added: listed as added, identified by name, not
 *           raw JSON
 *   TC-19 — a station was removed: listed as removed, identified by name
 *   TC-20 — several different kinds of changes in one batch: each is its
 *           own entry, all together in one dialog
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import type { Ref } from 'vue'
import PreferencesDiffDialog from './PreferencesDiffDialog.vue'
import type { RemoteWritePreview } from '@/types/preferences'

// ---------------------------------------------------------------------------
// Mock usePreferencesImport — the import-diff half of this dialog is out of
// scope here; diff stays null so that section never renders.
// ---------------------------------------------------------------------------

vi.mock('@/composables/usePreferencesImport', () => ({
  usePreferencesImport: () => ({
    diff: ref(null),
    doOpenDialog: ref(false),
    fuelTypeWarning: ref(null),
    applyDiff: vi.fn().mockResolvedValue(undefined),
    cancelImport: vi.fn(),
  }),
}))

// ---------------------------------------------------------------------------
// Mock useRemotePreferencesWrite — the write-confirm half under test.
// ---------------------------------------------------------------------------

const mockWriteDiff: Ref<RemoteWritePreview | null> = ref(null)
const mockIsWriteDialogOpen = ref(false)
const mockIsWriting = ref(false)
const mockConfirmWrite = vi.fn().mockResolvedValue(undefined)
const mockCancelWrite = vi.fn()

vi.mock('@/composables/useRemotePreferencesWrite', () => ({
  useRemotePreferencesWrite: () => ({
    writeDiff: mockWriteDiff,
    isWriteDialogOpen: mockIsWriteDialogOpen,
    isWriting: mockIsWriting,
    confirmWrite: mockConfirmWrite,
    cancelWrite: mockCancelWrite,
  }),
}))

// ---------------------------------------------------------------------------
// Mock useStationStorage, useDefaultFuelType, useGitHubAuth — required by
// the component's setup() but only exercised by the import-diff half.
// ---------------------------------------------------------------------------

vi.mock('@/composables/useStationStorage', () => ({
  useStationStorage: () => ({
    addStation: vi.fn().mockResolvedValue(undefined),
    updateStation: vi.fn().mockResolvedValue(undefined),
  }),
}))

vi.mock('@/composables/useDefaultFuelType', () => ({
  useDefaultFuelType: () => ({
    saveDefaultFuelType: vi.fn().mockResolvedValue(undefined),
    clearDefaultFuelType: vi.fn().mockResolvedValue(undefined),
  }),
}))

vi.mock('@/composables/useGitHubAuth', () => ({
  useGitHubAuth: () => ({
    handleUnauthorized: vi.fn().mockResolvedValue(undefined),
  }),
}))

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockWriteDiff.value = null
  mockIsWriteDialogOpen.value = false
  mockIsWriting.value = false
  vi.clearAllMocks()
})

/**
 * PreferencesDiffDialog.vue renders both dialogs via <Teleport to="body">.
 * Stubbing teleport keeps the content inside the mounted wrapper's own DOM
 * tree so `wrapper.find`/`wrapper.text()` see it directly, instead of having
 * to reach into the real `document.body`.
 */
function mountDialog() {
  return mount(PreferencesDiffDialog, { global: { stubs: { teleport: true } } })
}

// ---------------------------------------------------------------------------
// TC-17: Only one field changed — shows just that field's old/new value
// ---------------------------------------------------------------------------

describe('TC-17: only one field changed shows just that field, not the full station list or raw content', () => {
  it('shows the single name change as an old -> new comparison, with no raw JSON', async () => {
    mockIsWriteDialogOpen.value = true
    mockWriteDiff.value = {
      stationChanges: [
        {
          kind: 'edited',
          url: 'https://www.prix-carburants.gouv.fr/station/11111',
          fieldChanges: [{ field: 'name', before: 'Ancien nom', after: 'Nouveau nom' }],
        },
      ],
      fuelTypeChange: null,
    }

    const wrapper = mountDialog()

    expect(wrapper.text()).toContain('Nom')
    expect(wrapper.text()).toContain('Ancien nom')
    expect(wrapper.text()).toContain('Nouveau nom')
    expect(wrapper.find('pre').exists()).toBe(false)

    const stationEntries = wrapper.findAll('li')
    expect(stationEntries).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// TC-18: A station was added — listed by name, not raw JSON
// ---------------------------------------------------------------------------

describe('TC-18: an added station is listed by name, not as raw JSON', () => {
  it('shows "Ajoutée" with the station name', async () => {
    mockIsWriteDialogOpen.value = true
    mockWriteDiff.value = {
      stationChanges: [
        {
          kind: 'added',
          station: { name: 'Nouvelle station', url: 'https://www.prix-carburants.gouv.fr/station/22222' },
        },
      ],
      fuelTypeChange: null,
    }

    const wrapper = mountDialog()

    expect(wrapper.text()).toContain('Ajoutée')
    expect(wrapper.text()).toContain('Nouvelle station')
    expect(wrapper.find('pre').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('{')
  })
})

// ---------------------------------------------------------------------------
// TC-19: A station was removed — listed by name
// ---------------------------------------------------------------------------

describe('TC-19: a removed station is listed by name', () => {
  it('shows "Supprimée" with the station name', async () => {
    mockIsWriteDialogOpen.value = true
    mockWriteDiff.value = {
      stationChanges: [
        {
          kind: 'removed',
          station: { name: 'Station retirée', url: 'https://www.prix-carburants.gouv.fr/station/33333' },
        },
      ],
      fuelTypeChange: null,
    }

    const wrapper = mountDialog()

    expect(wrapper.text()).toContain('Supprimée')
    expect(wrapper.text()).toContain('Station retirée')
  })
})

// ---------------------------------------------------------------------------
// TC-20: Several different kinds of changes in one batch — each its own
// entry, all together in one dialog
// ---------------------------------------------------------------------------

describe('TC-20: multiple kinds of changes in one batch each render as their own entry in a single dialog', () => {
  it('lists the added, edited, and removed stations as three separate entries', async () => {
    mockIsWriteDialogOpen.value = true
    mockWriteDiff.value = {
      stationChanges: [
        {
          kind: 'added',
          station: { name: 'Station Ajoutée', url: 'https://www.prix-carburants.gouv.fr/station/44444' },
        },
        {
          kind: 'edited',
          url: 'https://www.prix-carburants.gouv.fr/station/55555',
          fieldChanges: [{ field: 'url', before: 'https://old-url', after: 'https://new-url' }],
        },
        {
          kind: 'removed',
          station: { name: 'Station Supprimée', url: 'https://www.prix-carburants.gouv.fr/station/66666' },
        },
      ],
      fuelTypeChange: null,
    }

    const wrapper = mountDialog()

    // Exactly one dialog is open — not one per change.
    expect(wrapper.findAll('[role="dialog"]')).toHaveLength(1)

    const entries = wrapper.findAll('li')
    expect(entries).toHaveLength(3)

    expect(wrapper.text()).toContain('Ajoutée')
    expect(wrapper.text()).toContain('Station Ajoutée')
    expect(wrapper.text()).toContain('URL')
    expect(wrapper.text()).toContain('https://old-url')
    expect(wrapper.text()).toContain('https://new-url')
    expect(wrapper.text()).toContain('Supprimée')
    expect(wrapper.text()).toContain('Station Supprimée')
  })

  it('clicking "Confirmer l\'envoi" calls confirmWrite', async () => {
    mockIsWriteDialogOpen.value = true
    mockWriteDiff.value = {
      stationChanges: [
        {
          kind: 'added',
          station: { name: 'Station Ajoutée', url: 'https://www.prix-carburants.gouv.fr/station/44444' },
        },
      ],
      fuelTypeChange: null,
    }

    const wrapper = mountDialog()
    const confirmButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes("Confirmer l'envoi"))
    await confirmButton!.trigger('click')

    expect(mockConfirmWrite).toHaveBeenCalledTimes(1)
  })

  it('clicking "Annuler" calls cancelWrite', async () => {
    mockIsWriteDialogOpen.value = true
    mockWriteDiff.value = {
      stationChanges: [
        {
          kind: 'added',
          station: { name: 'Station Ajoutée', url: 'https://www.prix-carburants.gouv.fr/station/44444' },
        },
      ],
      fuelTypeChange: null,
    }

    const wrapper = mountDialog()
    const cancelButton = wrapper.findAll('button').find((button) => button.text() === 'Annuler')
    await cancelButton!.trigger('click')

    expect(mockCancelWrite).toHaveBeenCalledTimes(1)
  })
})
