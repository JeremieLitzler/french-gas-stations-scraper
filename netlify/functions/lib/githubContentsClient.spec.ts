/**
 * Tests for githubContentsClient error reporting — issue #174.
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { readRemoteFile, writeRemoteFile } from './githubContentsClient'

// A string body is sent as-is (e.g. a non-JSON error page); anything else is JSON-encoded.
function stubFetchResponse(status: number, body: unknown): void {
  const payload = typeof body === 'string' ? body : JSON.stringify(body)
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(payload, { status })))
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
    stubFetchResponse(502, 'oops')
    await expect(readRemoteFile('pat', 'o', 'r', 'history.csv')).rejects.toThrow(
      'GitHub read failed with status 502.',
    )
  })
})

describe('readRemoteFile with a JSON body lacking a message', () => {
  it('keeps the status-only error', async () => {
    stubFetchResponse(500, { error: 'boom' })
    await expect(readRemoteFile('pat', 'o', 'r', 'history.csv')).rejects.toThrow(
      'GitHub read failed with status 500.',
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

  it('keeps the status-only error when the body is not JSON', async () => {
    stubFetchResponse(502, 'oops')
    await expect(
      writeRemoteFile('pat', 'o', 'r', 'history.csv', 'msg', 'Yw==', undefined),
    ).rejects.toThrow('GitHub write failed with status 502.')
  })
})
