/**
 * Tests for GitHubSyncSettings.vue — Sub-Issue E, issue #64.
 *
 * `useGitHubAuth` and `useRepoConfig` are mocked (same pattern as
 * StationManagerTable.spec.ts mocking useStationStorage): the component
 * consumes both composables directly at the top level of its `setup()`, so
 * this test only exercises the component's own wiring/rendering logic, not
 * the composables themselves (already covered by useGitHubAuth.spec.ts and
 * useRepoConfig.spec.ts).
 *
 * `canInitiateLogin` is mocked with a faithful copy of the real rule
 * (non-empty ownerRepo/filePath, positive-integer revalidateCacheDays) so
 * E-7 can verify the component reacts to it, without re-testing the rule
 * itself (already covered by useGitHubAuth.spec.ts A-1/A-2).
 *
 * Scenarios covered (test-cases.md, Sub-Issue E):
 *   E-1 — revalidate-cache-days field accepts valid positive integer
 *   E-2 — revalidate-cache-days field rejects zero
 *   E-3 — revalidate-cache-days field rejects negative numbers
 *   E-4 — all GitHub Sync fields enabled when unauthenticated
 *   E-5 — owner/repo and file path fields disabled after login
 *   E-6 — owner/repo and file path fields re-enabled after logout
 *   E-7 — login button reflects the login-readiness check
 *
 * Scenarios covered (test-cases.md, issue #108 — org OAuth 403 restriction):
 *   1 (rendering) — an org-restriction validationError renders OrgRestrictionNotice, not raw text
 *
 * Scenarios covered (test-cases.md, issue #110 — settings page mobile layout):
 *   TC-01 — save/connect buttons stack vertically, full width, while unauthenticated
 *   TC-02 — save/disconnect buttons stack vertically, full width, while authenticated
 *   TC-03 — both button rows carry the `sm:` classes that put them side by side
 *           by side from the sm breakpoint up
 *
 * happy-dom does not evaluate CSS media queries, so "mobile" vs "wider
 * viewport" cannot be asserted via actual layout. Tailwind is mobile-first
 * here: unprefixed classes (`flex-col`, `w-full`) are the default/mobile
 * layout, and `sm:`-prefixed classes (`sm:flex-row`, `sm:w-auto`) are the
 * override that takes effect from the sm breakpoint up. TC-01/02 assert the
 * unprefixed classes are present (mobile: stacked, full width); TC-03
 * asserts the `sm:` classes are also present (wider viewports: side by side,
 * auto width) in both auth states.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'
import type { Ref } from 'vue'
import GitHubSyncSettings from './GitHubSyncSettings.vue'
import type { RepoConfigDraft } from '@/types/repo-config'
import type { OrgRestrictionNotice } from '@/types/org-restriction-notice'

// ---------------------------------------------------------------------------
// Mock useGitHubAuth
// ---------------------------------------------------------------------------

const mockIsAuthenticated: Ref<boolean> = ref(false)
const mockAuthError: Ref<string | null> = ref(null)
const mockInitializeAuthState = vi.fn().mockResolvedValue(undefined)
const mockLogin = vi.fn()
const mockLogout = vi.fn().mockImplementation(async () => {
  mockIsAuthenticated.value = false
})
const mockHandleUnauthorized = vi.fn().mockResolvedValue(undefined)

function canInitiateLoginImpl(config: RepoConfigDraft): boolean {
  const hasRequiredRepoConfig = config.ownerRepo.trim().length > 0 && config.filePath.trim().length > 0
  const hasValidCacheDays = config.revalidateCacheDays !== null && config.revalidateCacheDays > 0
  return hasRequiredRepoConfig && hasValidCacheDays
}
const mockCanInitiateLogin = vi.fn(canInitiateLoginImpl)

vi.mock('@/composables/useGitHubAuth', () => ({
  useGitHubAuth: () => ({
    isAuthenticated: mockIsAuthenticated,
    authError: mockAuthError,
    initializeAuthState: mockInitializeAuthState,
    canInitiateLogin: mockCanInitiateLogin,
    login: mockLogin,
    logout: mockLogout,
    handleUnauthorized: mockHandleUnauthorized,
  }),
}))

// ---------------------------------------------------------------------------
// Mock useRepoConfig
// ---------------------------------------------------------------------------

const mockRepoConfig: Ref<RepoConfigDraft> = ref({
  ownerRepo: '',
  filePath: '',
  revalidateCacheDays: 7,
})
const mockValidationError: Ref<string | OrgRestrictionNotice | null> = ref(null)
const mockLoadRepoConfig = vi.fn().mockResolvedValue(undefined)
const mockSaveRepoConfig = vi.fn().mockResolvedValue(undefined)

vi.mock('@/composables/useRepoConfig', () => ({
  useRepoConfig: () => ({
    repoConfig: mockRepoConfig,
    validationError: mockValidationError,
    loadRepoConfig: mockLoadRepoConfig,
    saveRepoConfig: mockSaveRepoConfig,
  }),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Mount GitHubSyncSettings inside a <Suspense> boundary.
 * GitHubSyncSettings uses a top-level await — Vue requires a Suspense ancestor.
 */
function mountComponent() {
  const Wrapper = defineComponent({
    components: { GitHubSyncSettings },
    template: '<Suspense><GitHubSyncSettings /></Suspense>',
  })
  return mount(Wrapper)
}

function findButtonByText(wrapper: VueWrapper, text: string) {
  const buttons = wrapper.findAll('button')
  const match = buttons.find((button) => button.text().includes(text))
  if (!match) throw new Error(`No button found with text containing "${text}"`)
  return match
}

function inputElement(wrapper: VueWrapper, id: string): HTMLInputElement {
  return wrapper.find(`#${id}`).element as HTMLInputElement
}

/**
 * The container `<div>` wrapping the save/connect (or save/disconnect)
 * button pair — the element carrying the responsive stack/side-by-side
 * classes (GitHubSyncSettings.vue's `<div class="flex flex-col gap-3
 * sm:flex-row">`).
 */
function buttonRowContainer(wrapper: VueWrapper) {
  return findButtonByText(wrapper, 'Enregistrer').element.parentElement as HTMLElement
}

beforeEach(() => {
  vi.clearAllMocks()
  mockIsAuthenticated.value = false
  mockAuthError.value = null
  mockRepoConfig.value = { ownerRepo: '', filePath: '', revalidateCacheDays: 7 }
  mockValidationError.value = null
  mockInitializeAuthState.mockResolvedValue(undefined)
  mockLoadRepoConfig.mockResolvedValue(undefined)
  mockSaveRepoConfig.mockResolvedValue(undefined)
  mockLogin.mockReset()
  mockLogout.mockImplementation(async () => {
    mockIsAuthenticated.value = false
  })
  mockHandleUnauthorized.mockResolvedValue(undefined)
  mockCanInitiateLogin.mockImplementation(canInitiateLoginImpl)
})

// ---------------------------------------------------------------------------
// E-1: revalidate-cache-days field accepts valid positive integer
// ---------------------------------------------------------------------------

describe('E-1: revalidate-cache-days field accepts valid positive integer', () => {
  it('saves successfully with no validation error shown', async () => {
    mockRepoConfig.value = { ownerRepo: 'alice/repo', filePath: 'stations.json', revalidateCacheDays: null }
    const wrapper = mountComponent()
    await flushPromises()

    await wrapper.find('#revalidateCacheDays').setValue('7')
    await findButtonByText(wrapper, 'Enregistrer').trigger('click')
    await flushPromises()

    expect(mockSaveRepoConfig).toHaveBeenCalledWith(
      { ownerRepo: 'alice/repo', filePath: 'stations.json', revalidateCacheDays: 7 },
      false,
      mockHandleUnauthorized,
    )
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// E-2: revalidate-cache-days field rejects zero
// ---------------------------------------------------------------------------

describe('E-2: revalidate-cache-days field rejects zero', () => {
  it('shows an inline validation error and does not save', async () => {
    mockRepoConfig.value = { ownerRepo: 'alice/repo', filePath: 'stations.json', revalidateCacheDays: 7 }
    const wrapper = mountComponent()
    await flushPromises()

    await wrapper.find('#revalidateCacheDays').setValue('0')
    const saveButton = findButtonByText(wrapper, 'Enregistrer')
    await saveButton.trigger('click')
    await flushPromises()

    expect(saveButton.attributes('disabled')).toBeDefined()
    expect(mockSaveRepoConfig).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Le nombre de jours doit être un entier positif.')
  })
})

// ---------------------------------------------------------------------------
// E-3: revalidate-cache-days field rejects negative numbers
// ---------------------------------------------------------------------------

describe('E-3: revalidate-cache-days field rejects negative numbers', () => {
  it('shows an inline validation error and does not save', async () => {
    mockRepoConfig.value = { ownerRepo: 'alice/repo', filePath: 'stations.json', revalidateCacheDays: 7 }
    const wrapper = mountComponent()
    await flushPromises()

    await wrapper.find('#revalidateCacheDays').setValue('-3')
    const saveButton = findButtonByText(wrapper, 'Enregistrer')
    await saveButton.trigger('click')
    await flushPromises()

    expect(saveButton.attributes('disabled')).toBeDefined()
    expect(mockSaveRepoConfig).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Le nombre de jours doit être un entier positif.')
  })
})

// ---------------------------------------------------------------------------
// E-4: All GitHub Sync fields enabled when unauthenticated
// ---------------------------------------------------------------------------

describe('E-4: all GitHub Sync fields enabled when unauthenticated', () => {
  it('renders owner/repo, file path, and revalidate-cache-days without a disabled attribute', async () => {
    mockIsAuthenticated.value = false
    const wrapper = mountComponent()
    await flushPromises()

    expect(inputElement(wrapper, 'ownerRepo').disabled).toBe(false)
    expect(inputElement(wrapper, 'filePath').disabled).toBe(false)
    expect(inputElement(wrapper, 'revalidateCacheDays').disabled).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// E-5: Owner, Repo, and file path GitHub Sync fields disabled after login
// ---------------------------------------------------------------------------

describe('E-5: owner/repo and file path fields disabled after login', () => {
  it('disables owner/repo and file path but keeps revalidate-cache-days enabled', async () => {
    mockIsAuthenticated.value = true
    mockRepoConfig.value = { ownerRepo: 'alice/repo', filePath: 'stations.json', revalidateCacheDays: 7 }
    const wrapper = mountComponent()
    await flushPromises()

    expect(inputElement(wrapper, 'ownerRepo').disabled).toBe(true)
    expect(inputElement(wrapper, 'filePath').disabled).toBe(true)
    expect(inputElement(wrapper, 'revalidateCacheDays').disabled).toBe(false)
    expect(wrapper.text()).toContain('Déconnectez-vous pour modifier le dépôt et le chemin du fichier.')
  })
})

// ---------------------------------------------------------------------------
// E-6: Owner, Repo, and file path fields re-enabled after logout
// ---------------------------------------------------------------------------

describe('E-6: owner/repo and file path fields re-enabled after logout', () => {
  it('re-enables owner/repo and file path, retaining their values, after clicking logout', async () => {
    mockIsAuthenticated.value = true
    mockRepoConfig.value = { ownerRepo: 'alice/repo', filePath: 'stations.json', revalidateCacheDays: 7 }
    const wrapper = mountComponent()
    await flushPromises()

    await findButtonByText(wrapper, 'Se déconnecter').trigger('click')
    await flushPromises()

    expect(mockLogout).toHaveBeenCalled()
    expect(inputElement(wrapper, 'ownerRepo').disabled).toBe(false)
    expect(inputElement(wrapper, 'filePath').disabled).toBe(false)
    expect(inputElement(wrapper, 'ownerRepo').value).toBe('alice/repo')
    expect(inputElement(wrapper, 'filePath').value).toBe('stations.json')
    expect(inputElement(wrapper, 'revalidateCacheDays').disabled).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// E-7: Login button reflects the login-readiness check
// ---------------------------------------------------------------------------

describe('E-7: login button reflects the login-readiness check', () => {
  it('is disabled while revalidate-cache-days is empty, and enabled once it is filled in', async () => {
    mockRepoConfig.value = { ownerRepo: 'alice/repo', filePath: 'stations.json', revalidateCacheDays: null }
    const wrapper = mountComponent()
    await flushPromises()

    const loginButton = findButtonByText(wrapper, 'Se connecter avec GitHub')
    expect(loginButton.attributes('disabled')).toBeDefined()

    await wrapper.find('#revalidateCacheDays').setValue('7')

    expect(findButtonByText(wrapper, 'Se connecter avec GitHub').attributes('disabled')).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Scenario 1 (rendering): an org-restriction validationError renders OrgRestrictionNotice
// ---------------------------------------------------------------------------

describe('Scenario 1 (rendering): an org-restriction validationError renders OrgRestrictionNotice, not raw text', () => {
  it('renders the fixed sentence with a link to the configured owner\'s settings page', async () => {
    mockValidationError.value = { owner: 'acme-corp' }
    const wrapper = mountComponent()
    await flushPromises()

    const alert = wrapper.find('[role="alert"]')
    expect(alert.text()).toContain("Veuillez visiter ce")
    expect(alert.text()).not.toContain('[object Object]')
    const link = alert.find('a')
    expect(link.attributes('href')).toBe(
      'https://github.com/organizations/acme-corp/settings/oauth_application_policy',
    )
  })
})

// ---------------------------------------------------------------------------
// TC-01 (issue #110): unauthenticated mobile layout — save/connect stacked, full width
// ---------------------------------------------------------------------------

describe('TC-01: save and connect buttons stack vertically and span full width on mobile (unauthenticated)', () => {
  it('renders "Enregistrer les paramètres" and "Se connecter avec GitHub" as full-width buttons in a flex-col row', async () => {
    mockIsAuthenticated.value = false
    const wrapper = mountComponent()
    await flushPromises()

    const saveButton = findButtonByText(wrapper, 'Enregistrer les paramètres')
    const connectButton = findButtonByText(wrapper, 'Se connecter avec GitHub')

    expect(buttonRowContainer(wrapper).classList.contains('flex-col')).toBe(true)
    expect(saveButton.classes()).toContain('w-full')
    expect(connectButton.classes()).toContain('w-full')
  })
})

// ---------------------------------------------------------------------------
// TC-02 (issue #110): authenticated mobile layout — save/disconnect stacked, full width
// ---------------------------------------------------------------------------

describe('TC-02: save and disconnect buttons stack vertically and span full width on mobile (authenticated)', () => {
  it('renders "Enregistrer la fréquence" and "Se déconnecter" as full-width buttons in a flex-col row', async () => {
    mockIsAuthenticated.value = true
    mockRepoConfig.value = { ownerRepo: 'alice/repo', filePath: 'stations.json', revalidateCacheDays: 7 }
    const wrapper = mountComponent()
    await flushPromises()

    const saveButton = findButtonByText(wrapper, 'Enregistrer la fréquence')
    const disconnectButton = findButtonByText(wrapper, 'Se déconnecter')

    expect(buttonRowContainer(wrapper).classList.contains('flex-col')).toBe(true)
    expect(saveButton.classes()).toContain('w-full')
    expect(disconnectButton.classes()).toContain('w-full')
  })
})

// ---------------------------------------------------------------------------
// TC-03 (issue #110): wider viewports keep the buttons side by side, in both auth states
// ---------------------------------------------------------------------------

describe('TC-03: the button row carries the sm: classes that keep buttons side by side on wider viewports', () => {
  it('unauthenticated: the row is sm:flex-row and both buttons are sm:w-auto', async () => {
    mockIsAuthenticated.value = false
    const wrapper = mountComponent()
    await flushPromises()

    expect(buttonRowContainer(wrapper).classList.contains('sm:flex-row')).toBe(true)
    expect(findButtonByText(wrapper, 'Enregistrer les paramètres').classes()).toContain('sm:w-auto')
    expect(findButtonByText(wrapper, 'Se connecter avec GitHub').classes()).toContain('sm:w-auto')
  })

  it('authenticated: the row is sm:flex-row and both buttons are sm:w-auto', async () => {
    mockIsAuthenticated.value = true
    mockRepoConfig.value = { ownerRepo: 'alice/repo', filePath: 'stations.json', revalidateCacheDays: 7 }
    const wrapper = mountComponent()
    await flushPromises()

    expect(buttonRowContainer(wrapper).classList.contains('sm:flex-row')).toBe(true)
    expect(findButtonByText(wrapper, 'Enregistrer la fréquence').classes()).toContain('sm:w-auto')
    expect(findButtonByText(wrapper, 'Se déconnecter').classes()).toContain('sm:w-auto')
  })
})
