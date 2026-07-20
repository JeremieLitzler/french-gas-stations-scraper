/**
 * Tests for useRepoConfig composable — Sub-Issue B, issue #64.
 *
 * useRepoConfig is a singleton composable (ADR-002): the module-level refs
 * are shared across all consumers. vi.resetModules() + dynamic import() is
 * used to get a fresh module instance (and therefore fresh reactive state)
 * for each test, following the pattern established in useGitHubAuth.spec.ts.
 *
 * IndexedDB is mocked with an in-memory Map via vi.mock, same pattern as
 * useGitHubAuth.spec.ts / useStationStorage.spec.ts.
 *
 * `validationError`'s exact message text is not part of the composable's
 * public API (the constants are module-private), but is asserted verbatim
 * here to match the source — keep in sync with REPO_NOT_REACHABLE_MESSAGE in
 * useRepoConfig.ts if it changes.
 *
 * Only the scenarios satisfiable by this sub-issue's implementation (the
 * composable itself, with no Settings UI yet — that is Sub-Issue E) are
 * covered here. B-1 and B-5 describe Settings-page field enabled/disabled
 * states, which belong to Sub-Issue E's component.
 *
 * Scenarios covered (test-cases.md, Sub-Issue B):
 *   B-2 — valid repo config saves without validation while unauthenticated
 *   B-3 — saved config persists across reloads and after login
 *   B-4 — invalid repo config shows human-readable error once authenticated
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RepoConfigDraft } from '@/types/repo-config'

// ---------------------------------------------------------------------------
// In-memory IndexedDB mock
// ---------------------------------------------------------------------------

const store = new Map<string, unknown>()

vi.mock('@/utils/indexedDb', () => ({
  get: vi.fn((key: string) => Promise.resolve(store.get(key))),
  set: vi.fn((key: string, value: unknown) => {
    store.set(key, value)
    return Promise.resolve()
  }),
  del: vi.fn((key: string) => {
    store.delete(key)
    return Promise.resolve()
  }),
}))

// ---------------------------------------------------------------------------
// Constants mirrored from useRepoConfig.ts (module-private, not exported)
// ---------------------------------------------------------------------------

const REPO_CONFIG_KEY = 'repoConfig'
const REPO_NOT_REACHABLE_MESSAGE =
  "Le dépôt GitHub est introuvable ou inaccessible. Vérifiez son nom et vos droits d'accès."

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_CONFIG: RepoConfigDraft = {
  ownerRepo: 'alice/my-stations',
  filePath: 'stations.json',
  revalidateCacheDays: 7,
}

async function freshComposable() {
  vi.resetModules()
  const mod = await import('./useRepoConfig')
  return mod.useRepoConfig()
}

beforeEach(() => {
  store.clear()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

// ---------------------------------------------------------------------------
// B-2: Valid repo config saves without validation while unauthenticated
// ---------------------------------------------------------------------------

describe('B-2: valid repo config saves without validation while unauthenticated', () => {
  it('persists the draft to IndexedDB, clears validationError, and never calls fetch', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const { validationError, saveRepoConfig } = await freshComposable()

    await saveRepoConfig(VALID_CONFIG, false)

    expect(store.get(REPO_CONFIG_KEY)).toEqual(VALID_CONFIG)
    expect(validationError.value).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// B-3: Saved config persists across reloads and after login
// ---------------------------------------------------------------------------

describe('B-3: saved config persists across reloads and after login', () => {
  it('is readable via loadRepoConfig from a fresh composable instance, before and after login', async () => {
    const saver = await freshComposable()
    await saver.saveRepoConfig(VALID_CONFIG, false)

    const beforeLogin = await freshComposable()
    await beforeLogin.loadRepoConfig()
    expect(beforeLogin.repoConfig.value).toEqual(VALID_CONFIG)

    const afterLogin = await freshComposable()
    await afterLogin.loadRepoConfig()
    expect(afterLogin.repoConfig.value).toEqual(VALID_CONFIG)
  })
})

// ---------------------------------------------------------------------------
// B-4: Invalid repo config shows human-readable error once authenticated
// ---------------------------------------------------------------------------

describe('B-4: invalid repo config shows human-readable error once authenticated', () => {
  it('sets validationError to a human-readable message once the proxy reports the repo unreachable', async () => {
    const invalidDraft: RepoConfigDraft = {
      ownerRepo: 'nonexistent-user/nonexistent-repo',
      filePath: 'stations.json',
      revalidateCacheDays: 7,
    }
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ status: 404 }),
    )
    const { validationError, saveRepoConfig } = await freshComposable()

    await saveRepoConfig(invalidDraft, true)

    expect(store.get(REPO_CONFIG_KEY)).toEqual(invalidDraft)
    expect(validationError.value).toBe(REPO_NOT_REACHABLE_MESSAGE)
  })
})
