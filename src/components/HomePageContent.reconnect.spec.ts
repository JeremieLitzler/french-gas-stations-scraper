/**
 * Tests for HomePageContent's GitHub auto-reconnect wiring — issue #158.
 *
 * Kept apart from HomePageContent.spec.ts because that file drives
 * syncOnLoad as a manually-resolved promise to observe pre/post-sync DOM;
 * here syncOnLoad resolves immediately and the auth composable is a
 * controllable mock, so each test only sets up the reconnect situation.
 *
 * Only setTimeout/clearTimeout are faked, so promise-based Suspense
 * resolution (flushPromises) keeps working.
 *
 * GitHubReconnectNotice is rendered for real (not stubbed), so these tests
 * click the same buttons a user would.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'
import type { OrgRestrictionNotice } from '@/types/org-restriction-notice'
import HomePageContent from './HomePageContent.vue'

const SESSION_EXPIRED_MESSAGE = 'Votre session GitHub a expiré. Merci de vous reconnecter.'
const COUNTDOWN_MESSAGE = 'Votre session GitHub a expiré. Reconnexion automatique dans 2 secondes…'
const ACCESS_REVOKED_MESSAGE = "L'accès à GitHub a été révoqué. Vos données locales sont utilisées."
const AUTO_RECONNECT_DELAY_MS = 2000

// ---------------------------------------------------------------------------
// Controllable auth mock
// ---------------------------------------------------------------------------

const mockIsAuthenticated = ref(false)
let wasAuthenticated = true
let attemptAvailable = true
const mockLogin = vi.fn()
const mockRecordAutoReconnectAttempt = vi.fn(async () => {
  attemptAvailable = false
})

vi.mock('@/composables/useGitHubAuth', () => ({
  AUTO_RECONNECT_DELAY_MS: 2000,
  SESSION_EXPIRED_MESSAGE: 'Votre session GitHub a expiré. Merci de vous reconnecter.',
  useGitHubAuth: () => {
    const needsReconnect = () => !mockIsAuthenticated.value && wasAuthenticated
    return {
      isAuthenticated: mockIsAuthenticated,
      initializeAuthState: vi.fn().mockResolvedValue(undefined),
      handleUnauthorized: vi.fn().mockResolvedValue(undefined),
      needsReconnect,
      canAutoReconnect: () => needsReconnect() && attemptAvailable,
      recordAutoReconnectAttempt: mockRecordAutoReconnectAttempt,
      login: mockLogin,
    }
  },
}))

vi.mock('@/composables/useRepoConfig', () => ({
  useRepoConfig: () => ({
    repoConfig: ref({
      ownerRepo: 'alice/my-stations',
      filePath: 'stations.json',
      revalidateCacheDays: 7,
    }),
    loadRepoConfig: vi.fn().mockResolvedValue(undefined),
  }),
}))

vi.mock('@/composables/useStationStorage', () => ({
  useStationStorage: () => ({
    stations: ref([]),
    loadStations: vi.fn().mockResolvedValue(undefined),
    replaceStations: vi.fn().mockResolvedValue(undefined),
  }),
}))

vi.mock('@/composables/useDefaultFuelType', () => ({
  useDefaultFuelType: () => ({
    loadDefaultFuelType: vi.fn().mockResolvedValue(undefined),
    saveDefaultFuelType: vi.fn().mockResolvedValue(undefined),
    clearDefaultFuelType: vi.fn().mockResolvedValue(undefined),
  }),
}))

const mockSyncError = ref<string | OrgRestrictionNotice | null>(null)

vi.mock('@/composables/useRemotePreferencesSync', () => ({
  ACCESS_REVOKED_MESSAGE: "L'accès à GitHub a été révoqué. Vos données locales sont utilisées.",
  useRemotePreferencesSync: () => ({
    syncError: mockSyncError,
    syncOnLoad: vi.fn().mockResolvedValue(undefined),
  }),
}))

vi.mock('@/composables/useRemotePreferencesWrite', () => ({
  useRemotePreferencesWrite: () => ({
    writeError: ref(null),
    writeSuccess: ref(false),
    divergedNotice: ref(null),
  }),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function mountHomePage() {
  const Wrapper = defineComponent({
    components: { HomePageContent },
    template: '<Suspense><HomePageContent /></Suspense>',
  })
  const wrapper = mount(Wrapper, {
    global: { stubs: { StationPrices: true, StationManager: true } },
  })
  await flushPromises()
  return wrapper
}

function findButton(wrapper: Awaited<ReturnType<typeof mountHomePage>>, label: string) {
  return wrapper.findAll('button').find((button) => {
    return button.text() === label || button.attributes('aria-label') === label
  })
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  mockIsAuthenticated.value = false
  wasAuthenticated = true
  attemptAvailable = true
  mockSyncError.value = null
  vi.clearAllMocks()
})

afterEach(() => {
  vi.useRealTimers()
})

// ---------------------------------------------------------------------------
// Automatic reconnect on load
// ---------------------------------------------------------------------------

describe('automatic reconnect on load', () => {
  it('shows the countdown and redirects to GitHub after 2 seconds', async () => {
    const wrapper = await mountHomePage()

    expect(wrapper.text()).toContain(COUNTDOWN_MESSAGE)
    expect(mockRecordAutoReconnectAttempt).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(AUTO_RECONNECT_DELAY_MS - 1)
    expect(mockLogin).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(mockLogin).toHaveBeenCalledTimes(1)
  })

  it('cancelling stops the redirect and shows the reconnect banner', async () => {
    const wrapper = await mountHomePage()

    await findButton(wrapper, 'Annuler')!.trigger('click')
    vi.advanceTimersByTime(AUTO_RECONNECT_DELAY_MS)

    expect(mockLogin).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain(SESSION_EXPIRED_MESSAGE)
    expect(findButton(wrapper, 'Se reconnecter à GitHub')).toBeDefined()
  })

  it('leaving the page during the countdown stops the redirect', async () => {
    const wrapper = await mountHomePage()

    wrapper.unmount()
    vi.advanceTimersByTime(AUTO_RECONNECT_DELAY_MS)

    expect(mockLogin).not.toHaveBeenCalled()
  })

  it('shows the banner without a countdown once the automatic attempt is used', async () => {
    attemptAvailable = false

    const wrapper = await mountHomePage()
    vi.advanceTimersByTime(AUTO_RECONNECT_DELAY_MS)

    expect(wrapper.text()).toContain(SESSION_EXPIRED_MESSAGE)
    expect(wrapper.text()).not.toContain(COUNTDOWN_MESSAGE)
    expect(mockRecordAutoReconnectAttempt).not.toHaveBeenCalled()
    expect(mockLogin).not.toHaveBeenCalled()
  })

  it('starts no countdown and still renders the page when the attempt cannot be recorded', async () => {
    mockRecordAutoReconnectAttempt.mockRejectedValueOnce(new Error('QuotaExceededError'))

    const wrapper = await mountHomePage()
    vi.advanceTimersByTime(AUTO_RECONNECT_DELAY_MS)

    expect(wrapper.text()).not.toContain(COUNTDOWN_MESSAGE)
    expect(findButton(wrapper, 'Se reconnecter à GitHub')).toBeDefined()
    expect(mockLogin).not.toHaveBeenCalled()
  })

  it('shows nothing when no reconnect is needed', async () => {
    wasAuthenticated = false

    const wrapper = await mountHomePage()
    vi.advanceTimersByTime(AUTO_RECONNECT_DELAY_MS)

    expect(wrapper.text()).not.toContain(SESSION_EXPIRED_MESSAGE)
    expect(wrapper.text()).not.toContain(COUNTDOWN_MESSAGE)
    expect(mockLogin).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// Fallback banner
// ---------------------------------------------------------------------------

describe('fallback reconnect banner', () => {
  beforeEach(() => {
    attemptAvailable = false
  })

  it('the reconnect button starts the GitHub login', async () => {
    const wrapper = await mountHomePage()

    await findButton(wrapper, 'Se reconnecter à GitHub')!.trigger('click')

    expect(mockLogin).toHaveBeenCalledTimes(1)
    expect(mockRecordAutoReconnectAttempt).not.toHaveBeenCalled()
  })

  it('dismissing hides the banner for the rest of the session', async () => {
    const wrapper = await mountHomePage()

    await findButton(wrapper, 'Masquer')!.trigger('click')
    expect(wrapper.text()).not.toContain(SESSION_EXPIRED_MESSAGE)

    mockIsAuthenticated.value = true
    await flushPromises()
    mockIsAuthenticated.value = false
    await flushPromises()
    expect(wrapper.text()).not.toContain(SESSION_EXPIRED_MESSAGE)
  })

  it('appears after a 401 later in the session, without redirecting', async () => {
    mockIsAuthenticated.value = true
    attemptAvailable = true
    const wrapper = await mountHomePage()
    expect(wrapper.text()).not.toContain(SESSION_EXPIRED_MESSAGE)

    mockIsAuthenticated.value = false
    await flushPromises()
    vi.advanceTimersByTime(AUTO_RECONNECT_DELAY_MS)

    expect(wrapper.text()).toContain(SESSION_EXPIRED_MESSAGE)
    expect(mockLogin).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// Duplicate "access revoked" strip
// ---------------------------------------------------------------------------

describe('access-revoked strip while the reconnect notice is visible', () => {
  it('is hidden while the notice is visible', async () => {
    mockSyncError.value = ACCESS_REVOKED_MESSAGE

    const wrapper = await mountHomePage()

    expect(wrapper.text()).not.toContain(ACCESS_REVOKED_MESSAGE)
  })

  it('is shown when no reconnect notice is visible', async () => {
    wasAuthenticated = false
    mockSyncError.value = ACCESS_REVOKED_MESSAGE

    const wrapper = await mountHomePage()

    expect(wrapper.text()).toContain(ACCESS_REVOKED_MESSAGE)
  })

  it('does not hide other sync errors', async () => {
    mockSyncError.value = 'Autre erreur de synchronisation.'

    const wrapper = await mountHomePage()

    expect(wrapper.text()).toContain('Autre erreur de synchronisation.')
  })
})
