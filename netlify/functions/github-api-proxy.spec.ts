/**
 * Tests for the github-api-proxy Netlify function — Issue #64, Sub-Issue F.
 *
 * Scenarios covered:
 *   F-4 — github-api-proxy forwards owner/repo/path unchanged to GitHub
 *   F-5 — github-api-proxy does not expose the access token in the response
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { HandlerContext, HandlerEvent, HandlerResponse } from '@netlify/functions'
import { handler } from './github-api-proxy'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CONTEXT = {} as HandlerContext
const ACCESS_TOKEN = 'gho_session_access_token_value'

function buildEvent(overrides: Partial<HandlerEvent> = {}): HandlerEvent {
  return {
    rawUrl: 'http://localhost:8888/.netlify/functions/github-api-proxy',
    rawQuery: '',
    path: '/.netlify/functions/github-api-proxy',
    httpMethod: 'GET',
    headers: { cookie: `gh_token=${ACCESS_TOKEN}` },
    multiValueHeaders: {},
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    body: null,
    isBase64Encoded: false,
    ...overrides,
  }
}

function expectResponse(result: HandlerResponse | void): HandlerResponse {
  if (!result) {
    throw new Error('handler did not return a response')
  }
  return result
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.restoreAllMocks()
})

// ---------------------------------------------------------------------------
// F-4: github-api-proxy forwards owner/repo/path unchanged to GitHub
// ---------------------------------------------------------------------------

describe('F-4: github-api-proxy forwards owner/repo/path unchanged to GitHub', () => {
  it('issues the Contents API request against exactly the supplied owner/repo/path', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      status: 200,
      json: () => Promise.resolve({ content: 'base64content' }),
    })
    vi.stubGlobal('fetch', fetchSpy)
    const event = buildEvent({
      queryStringParameters: { owner: 'alice', repo: 'my-stations', path: 'stations.json' },
    })

    await handler(event, CONTEXT)

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.github.com/repos/alice/my-stations/contents/stations.json',
      expect.anything(),
    )
  })
})

// ---------------------------------------------------------------------------
// F-5: github-api-proxy does not expose the access token in the response
// ---------------------------------------------------------------------------

describe('F-5: github-api-proxy does not expose the access token in the response', () => {
  it('never returns the gh_token value in the proxied response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        status: 200,
        json: () => Promise.resolve({ content: 'base64content', sha: 'abc123' }),
      }),
    )
    const event = buildEvent({
      queryStringParameters: { owner: 'alice', repo: 'my-stations', path: 'stations.json' },
    })

    const response = expectResponse(await handler(event, CONTEXT))

    expect(JSON.stringify(response)).not.toContain(ACCESS_TOKEN)
  })
})
