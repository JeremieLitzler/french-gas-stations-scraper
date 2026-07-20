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
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'
import type { Ref } from 'vue'
import GitHubSyncSettings from './GitHubSyncSettings.vue'
import type { RepoConfigDraft } from '@/types/repo-config'

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
const mockValidationError: Ref<string | null> = ref(null)
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
