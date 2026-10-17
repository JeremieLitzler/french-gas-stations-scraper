/**
 * Tests for githubContentsClient error reporting — issue #174.
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { readRemoteFile, writeRemoteFile } from './githubContentsClient'

function stubFetchResponse(status: number, body: unknown): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status })),
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('readRemoteFile', () => {
  it('returns found:false on 404', async () => {
    stubFetchResponse(404, { message: 'Not Found' })
    await expect(readRemoteFile('pat', 'o', 'r', 'history.csv')).resolves.toEqual({ found: false })
  })

  it("includes GitHub's message in the error on 401", async () => {
    stubFetchResponse(401, { message: 'Bad credentials' })
    await expect(readRemoteFile('pat', 'o', 'r', 'history.csv')).rejects.toThrow(
      'GitHub read failed with status 401: Bad credentials',
    )
  })

  it('keeps the status-only error when the body is not JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('oops', { status: 502 })))
    await expect(readRemoteFile('pat', 'o', 'r', 'history.csv')).rejects.toThrow(
      'GitHub read failed with status 502.',
    )
  })
})

describe('writeRemoteFile', () => {
  it("includes GitHub's message in the error on 403", async () => {
    stubFetchResponse(403, { message: 'Resource not accessible by personal access token' })
    await expect(
      writeRemoteFile('pat', 'o', 'r', 'history.csv', 'msg', 'Yw==', undefined),
    ).rejects.toThrow(
      'GitHub write failed with status 403: Resource not accessible by personal access token',
    )
  })
})
