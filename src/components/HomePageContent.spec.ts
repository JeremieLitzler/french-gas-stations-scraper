/**
 * Tests for HomePageContent — the page-level load orchestrator (ADR-013,
 * business-specifications.md Sub-Issue C rule 8, issue #64/#85).
 *
 * HomePageContent centralizes "on application load" so that StationPrices
 * and StationManager — both singleton consumers of useStationStorage's
 * `stations` ref — never exist in the DOM until the shared load sequence
 * (including any remote GitHub sync) has fully resolved.
 *
 * StationPrices/StationManager are stubbed with tiny components that read
 * the mocked useStationStorage() singleton themselves, so both stubs
 * observe the exact same reactive `stations` ref HomePageContent itself
 * writes through via `replaceStations` — this lets the tests below assert
 * cross-view consistency without depending on either component's real,
 * unrelated internals (fuel prices, table rendering, etc.).
 *
 * syncOnLoad is mocked as a controllable, manually-resolved promise so the
 * pre-sync and post-sync DOM states can both be observed within one test.
 *
 * Scenarios covered (test-cases.md, Sub-Issue C):
 *   C-17 — every view reflects the same station list once a sync completes
 *   C-18 — no view shows a stale list before the sync outcome is known
 *
 * Scenarios covered (test-cases.md, issue #108 — org OAuth 403 restriction):
 *   8 (rendering)  — an org-restriction syncError renders OrgRestrictionNotice, not raw text
 *   12 (rendering) — an org-restriction writeError renders OrgRestrictionNotice, not raw text
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'
import type { Station } from '@/types/station'
import type { OrgRestrictionNotice } from '@/types/org-restriction-notice'
import HomePageContent from './HomePageContent.vue'

// ---------------------------------------------------------------------------
// Mock useStationStorage — shared singleton ref, read by HomePageContent
// and by the StationPrices/StationManager stubs below.
// ---------------------------------------------------------------------------

const mockStations = ref<Station[]>([])
const mockLoadStations = vi.fn().mockResolvedValue(undefined)
const mockReplaceStations = vi.fn(async (list: Station[]) => {
  mockStations.value = list
})

vi.mock('@/composables/useStationStorage', () => ({
  useStationStorage: () => ({
    stations: mockStations,
    loadStations: mockLoadStations,
    replaceStations: mockReplaceStations,
  }),
}))

// ---------------------------------------------------------------------------
// Mock useDefaultFuelType
// ---------------------------------------------------------------------------

const mockDefaultFuelType = ref<string | null>(null)
const mockLoadDefaultFuelType = vi.fn().mockResolvedValue(undefined)
const mockSaveDefaultFuelType = vi.fn(async (label: string) => {
  mockDefaultFuelType.value = label
})
const mockClearDefaultFuelType = vi.fn(async () => {
  mockDefaultFuelType.value = null
})

vi.mock('@/composables/useDefaultFuelType', () => ({
  useDefaultFuelType: () => ({
    defaultFuelType: mockDefaultFuelType,
    loadDefaultFuelType: mockLoadDefaultFuelType,
    saveDefaultFuelType: mockSaveDefaultFuelType,
    clearDefaultFuelType: mockClearDefaultFuelType,
  }),
}))

// ---------------------------------------------------------------------------
// Mock useGitHubAuth, useRepoConfig
// ---------------------------------------------------------------------------

vi.mock('@/composables/useGitHubAuth', () => ({
  useGitHubAuth: () => ({
    isAuthenticated: ref(true),
    initializeAuthState: vi.fn().mockResolvedValue(undefined),
    handleUnauthorized: vi.fn().mockResolvedValue(undefined),
  }),
}))

vi.mock('@/composables/useRepoConfig', () => ({
  useRepoConfig: () => ({
    repoConfig: ref({ ownerRepo: 'alice/my-stations', filePath: 'stations.json', revalidateCacheDays: 7 }),
    loadRepoConfig: vi.fn().mockResolvedValue(undefined),
  }),
}))

// ---------------------------------------------------------------------------
// Mock @/utils/preferencesSyncTimestamp — HomePageContent's
// applyRemotePreferences reads/restores the sync timestamp directly via
// this module. Left unmocked, it calls the real (unmocked) @/utils/indexedDb,
// which throws in this happy-dom test environment (no global indexedDB).
// ---------------------------------------------------------------------------

vi.mock('@/utils/preferencesSyncTimestamp', () => ({
  getPreferencesSyncedAt: vi.fn().mockResolvedValue(undefined),
  restorePreferencesSyncedAt: vi.fn().mockResolvedValue(undefined),
}))

// ---------------------------------------------------------------------------
// Mock useRemotePreferencesSync — syncOnLoad is a controllable promise so
// tests can observe the DOM both before and after it settles. When resolved,
// it invokes the real `applyRemotePreferences` callback HomePageContent
// passed in, mirroring what useRemotePreferencesSync.ts's refreshFromRemote
// does in production.
// ---------------------------------------------------------------------------

type ApplyRemotePreferences = (data: { fuelTypeDefault: string | null; favoriteStations: Station[] }) => Promise<void>

let resolveSync: (() => void) | null = null

const mockSyncOnLoad = vi.fn((_isAuthenticated: boolean, _repoConfig: unknown, applyRemotePreferences: ApplyRemotePreferences) => {
  return new Promise<void>((resolve) => {
    resolveSync = () => {
      applyRemotePreferences({
        fuelTypeDefault: 'SP95',
        favoriteStations: [
          { name: 'Remote Station', url: 'https://www.prix-carburants.gouv.fr/station/99999999' },
        ],
      }).then(resolve)
    }
  })
})

const mockSyncError = ref<string | OrgRestrictionNotice | null>(null)

vi.mock('@/composables/useRemotePreferencesSync', () => ({
  useRemotePreferencesSync: () => ({
    syncError: mockSyncError,
    syncOnLoad: mockSyncOnLoad,
  }),
}))

// ---------------------------------------------------------------------------
// Mock useRemotePreferencesWrite — HomePageContent reads only writeError,
// writeSuccess, and divergedNotice; pushPreferences/confirmWrite/etc. are not
// called from this component, so the mock exposes only what it consumes.
// ---------------------------------------------------------------------------

const mockWriteError = ref<string | OrgRestrictionNotice | null>(null)

vi.mock('@/composables/useRemotePreferencesWrite', () => ({
  useRemotePreferencesWrite: () => ({
    writeError: mockWriteError,
    writeSuccess: ref(false),
    divergedNotice: ref(null),
  }),
}))

// ---------------------------------------------------------------------------
// Stubs — read the same mocked useStationStorage() singleton so both
// "views" can be checked for identical content.
// ---------------------------------------------------------------------------

const StationPricesStub = defineComponent({
  name: 'StationPrices',
  setup() {
    return { stations: mockStations }
  },
  template: '<div class="station-prices-stub">{{ stations.map((s) => s.name).join(",") }}</div>',
})

const StationManagerStub = defineComponent({
  name: 'StationManager',
  setup() {
    return { stations: mockStations }
  },
  template: '<div class="station-manager-stub">{{ stations.map((s) => s.name).join(",") }}</div>',
})

function mountHomePage() {
  const Wrapper = defineComponent({
    components: { HomePageContent },
    template:
      '<Suspense><HomePageContent /><template #fallback><div class="fallback-stub" /></template></Suspense>',
  })
  return mount(Wrapper, {
    global: {
      stubs: {
        StationPrices: StationPricesStub,
        StationManager: StationManagerStub,
      },
    },
  })
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockStations.value = []
  mockDefaultFuelType.value = null
  mockLoadStations.mockClear()
  mockReplaceStations.mockClear()
  mockSaveDefaultFuelType.mockClear()
  mockClearDefaultFuelType.mockClear()
  mockSyncOnLoad.mockClear()
  resolveSync = null
  mockSyncError.value = null
  mockWriteError.value = null
})

// ---------------------------------------------------------------------------
// C-18: No view shows a stale list before the sync outcome is known
// ---------------------------------------------------------------------------

describe('C-18: no view shows a stale list before the sync outcome is known', () => {
  it('renders only the fallback while syncOnLoad is pending, never the stale local list', async () => {
    mockStations.value = [
      { name: 'Stale Local Station', url: 'https://www.prix-carburants.gouv.fr/station/00000000' },
    ]

    const wrapper = mountHomePage()
    await flushPromises()

    expect(wrapper.find('.fallback-stub').exists()).toBe(true)
    expect(wrapper.find('.station-prices-stub').exists()).toBe(false)
    expect(wrapper.find('.station-manager-stub').exists()).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// C-17: Every view reflects the same station list once a sync completes
// ---------------------------------------------------------------------------

describe('C-17: every view reflects the same station list once a sync completes', () => {
  it('shows the same remote-sourced list in every view, replacing the stale local one', async () => {
    mockStations.value = [
      { name: 'Stale Local Station', url: 'https://www.prix-carburants.gouv.fr/station/00000000' },
    ]

    const wrapper = mountHomePage()
    await flushPromises()

    resolveSync?.()
    await flushPromises()

    expect(wrapper.find('.fallback-stub').exists()).toBe(false)

    const pricesView = wrapper.find('.station-prices-stub')
    const managerView = wrapper.find('.station-manager-stub')
    expect(pricesView.exists()).toBe(true)
    expect(managerView.exists()).toBe(true)
    expect(pricesView.text()).toBe('Remote Station')
    expect(managerView.text()).toBe('Remote Station')
    expect(pricesView.text()).not.toContain('Stale Local Station')
    expect(mockReplaceStations).toHaveBeenCalledWith([
      { name: 'Remote Station', url: 'https://www.prix-carburants.gouv.fr/station/99999999' },
    ])
  })
})

// ---------------------------------------------------------------------------
// Scenario 8 (rendering): an org-restriction syncError renders OrgRestrictionNotice
// ---------------------------------------------------------------------------

describe('Scenario 8 (rendering): an org-restriction syncError renders OrgRestrictionNotice, not raw text', () => {
  it('renders the fixed sentence with a link to the configured owner\'s settings page', async () => {
    const wrapper = mountHomePage()
    await flushPromises()
    resolveSync?.()
    await flushPromises()

    mockSyncError.value = { owner: 'acme-corp' }
    await flushPromises()

    const alert = wrapper.find('.text-amber-700[role="alert"]')
    expect(alert.text()).not.toContain('[object Object]')
    const link = alert.find('a')
    expect(link.attributes('href')).toBe(
      'https://github.com/organizations/acme-corp/settings/oauth_application_policy',
    )
  })
})

// ---------------------------------------------------------------------------
// Scenario 12 (rendering): an org-restriction writeError renders OrgRestrictionNotice
// ---------------------------------------------------------------------------

describe('Scenario 12 (rendering): an org-restriction writeError renders OrgRestrictionNotice, not raw text', () => {
  it('renders the fixed sentence with a link to the configured owner\'s settings page', async () => {
    const wrapper = mountHomePage()
    await flushPromises()
    resolveSync?.()
    await flushPromises()

    mockWriteError.value = { owner: 'acme-corp' }
    await flushPromises()

    const alert = wrapper.find('.text-red-700[role="alert"]')
    expect(alert.text()).not.toContain('[object Object]')
    const link = alert.find('a')
    expect(link.attributes('href')).toBe(
      'https://github.com/organizations/acme-corp/settings/oauth_application_policy',
    )
  })
})
