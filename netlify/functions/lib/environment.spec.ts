/**
 * Tests for readHistoryConfig — issue #174.
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { readHistoryConfig } from './environment'

function stubHistoryEnv(overrides: Record<string, string> = {}): void {
  const env = {
    HISTORY_GITHUB_PAT: 'github_pat_abc',
    HISTORY_GITHUB_OWNER: 'JeremieLitzler',
    HISTORY_GITHUB_REPO: 'my-gas-stations',
    HISTORY_PREFS_FILE_PATH: 'preferences.json',
    ...overrides,
  }
  for (const [name, value] of Object.entries(env)) vi.stubEnv(name, value)
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('readHistoryConfig', () => {
  it('returns the configuration when every variable is set', () => {
    stubHistoryEnv()
    expect(readHistoryConfig()).toEqual({
      githubPat: 'github_pat_abc',
      owner: 'JeremieLitzler',
      repo: 'my-gas-stations',
      preferencesFilePath: 'preferences.json',
    })
  })

  it('trims whitespace and newlines around the PAT pasted into the Netlify UI', () => {
    stubHistoryEnv({ HISTORY_GITHUB_PAT: '  github_pat_abc\n' })
    expect(readHistoryConfig()?.githubPat).toBe('github_pat_abc')
  })

  it('treats a whitespace-only PAT as missing', () => {
    stubHistoryEnv({ HISTORY_GITHUB_PAT: ' \n' })
    expect(readHistoryConfig()).toBeNull()
  })

  it('returns null when a variable is empty', () => {
    stubHistoryEnv({ HISTORY_GITHUB_REPO: '' })
    expect(readHistoryConfig()).toBeNull()
  })
})
