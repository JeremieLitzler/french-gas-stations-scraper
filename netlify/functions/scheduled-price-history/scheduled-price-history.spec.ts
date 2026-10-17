/**
 * Tests for the scheduled-price-history handler — issue #174.
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import type { HandlerContext, HandlerEvent } from '@netlify/functions'
import { handler } from './scheduled-price-history'

const SCHEDULED_EVENT = { body: JSON.stringify({ next_run: '2026-10-17T19:00:00Z' }) } as HandlerEvent

function stubHistoryEnv(): void {
  vi.stubEnv('HISTORY_GITHUB_PAT', 'github_pat_abc\n')
  vi.stubEnv('HISTORY_GITHUB_OWNER', 'JeremieLitzler')
  vi.stubEnv('HISTORY_GITHUB_REPO', 'my-gas-stations')
  vi.stubEnv('HISTORY_PREFS_FILE_PATH', 'preferences.json')
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('scheduled run when GitHub rejects the PAT', () => {
  it("returns 500 and logs GitHub's reason", async () => {
    stubHistoryEnv()
    const fetchSpy = vi
      .fn()
      .mockImplementation(
        async () => new Response(JSON.stringify({ message: 'Bad credentials' }), { status: 401 }),
      )
    vi.stubGlobal('fetch', fetchSpy)
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const response = await handler(SCHEDULED_EVENT, {} as HandlerContext)

    expect(response).toMatchObject({ statusCode: 500 })
    const loggedError = errorSpy.mock.calls.flat().find((arg) => arg instanceof Error)
    expect(loggedError).toBeInstanceOf(Error)
    expect((loggedError as Error).message).toBe('GitHub read failed with status 401: Bad credentials')
    const sentHeaders = fetchSpy.mock.calls[0][1].headers as Record<string, string>
    expect(sentHeaders.Authorization).toBe('Bearer github_pat_abc')
  })
})
