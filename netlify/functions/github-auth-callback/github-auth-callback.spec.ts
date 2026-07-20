/**
 * Tests for the github-auth-callback Netlify function — Issue #64, Sub-Issue F.
 *
 * Scenarios covered:
 *   F-2 — github-auth-callback exchanges code for token and sets cookie
 *   F-3 — github-auth-callback with error parameter redirects to error state
 *   F-6 — Client Secret is never present in any response body or redirect URL
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { HandlerContext, HandlerEvent, HandlerResponse } from '@netlify/functions'
import { handler as authStartHandler } from '../github-auth-start/github-auth-start'
import { handler as authCallbackHandler } from './github-auth-callback'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CONTEXT = {} as HandlerContext
const STATE_VALUE = 'matching-state-value'
const ACCESS_TOKEN = 'gho_secret_access_token_value'
const CLIENT_SECRET = 'super-secret-client-secret'

function buildEvent(overrides: Partial<HandlerEvent> = {}): HandlerEvent {
  return {
    rawUrl: 'http://localhost:8888/.netlify/functions/github-auth-callback',
    rawQuery: '',
    path: '/.netlify/functions/github-auth-callback',
    httpMethod: 'GET',
    headers: {},
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

function setCookies(response: HandlerResponse): string[] {
  return (response.multiValueHeaders?.['Set-Cookie'] ?? []).map(String)
}

function stubSuccessfulTokenExchange() {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ access_token: ACCESS_TOKEN }),
    }),
  )
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const ORIGINAL_ENV = { ...process.env }

beforeEach(() => {
  vi.restoreAllMocks()
  process.env.GITHUB_CLIENT_ID = 'test-client-id'
  process.env.GITHUB_CLIENT_SECRET = CLIENT_SECRET
  process.env.URL = 'http://localhost:8888'
})

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
})

// ---------------------------------------------------------------------------
// F-2: github-auth-callback exchanges code for token and sets cookie
// ---------------------------------------------------------------------------

describe('F-2: github-auth-callback exchanges code for token and sets cookie', () => {
  it('redirects to /settings?auth=success with a gh_token cookie carrying the exchanged token', async () => {
    stubSuccessfulTokenExchange()
    const event = buildEvent({
      headers: { cookie: `gh_oauth_state=${STATE_VALUE}` },
      queryStringParameters: { code: 'valid-code', state: STATE_VALUE },
    })

    const response = expectResponse(await authCallbackHandler(event, CONTEXT))

    expect(response.statusCode).toBe(302)
    expect(response.headers?.Location).toBe('/settings?auth=success')
    const cookies = setCookies(response)
    expect(
      cookies.some(
        (cookie) =>
          cookie.startsWith(`gh_token=${ACCESS_TOKEN}; `) &&
          cookie.includes('HttpOnly') &&
          cookie.includes('SameSite=Strict') &&
          cookie.includes('Max-Age=28800'),
      ),
    ).toBe(true)
  })

  it('never places the exchanged token in the redirect URL or response body', async () => {
    stubSuccessfulTokenExchange()
    const event = buildEvent({
      headers: { cookie: `gh_oauth_state=${STATE_VALUE}` },
      queryStringParameters: { code: 'valid-code', state: STATE_VALUE },
    })

    const response = expectResponse(await authCallbackHandler(event, CONTEXT))

    expect(String(response.headers?.Location)).not.toContain(ACCESS_TOKEN)
    expect(response.body ?? '').not.toContain(ACCESS_TOKEN)
  })
})

// ---------------------------------------------------------------------------
// F-3: github-auth-callback with error parameter redirects to error state
// ---------------------------------------------------------------------------

describe('F-3: github-auth-callback with error parameter redirects to error state', () => {
  it('redirects to /settings?auth=error and sets no gh_token cookie', async () => {
    const event = buildEvent({
      queryStringParameters: { error: 'access_denied' },
    })

    const response = expectResponse(await authCallbackHandler(event, CONTEXT))

    expect(response.statusCode).toBe(302)
    expect(response.headers?.Location).toBe('/settings?auth=error')
    const cookies = setCookies(response)
    expect(cookies.some((cookie) => cookie.startsWith('gh_token='))).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// F-6: Client Secret is never present in any response body or redirect URL
// ---------------------------------------------------------------------------

describe('F-6: Client Secret is never present in any response body or redirect URL', () => {
  it('keeps the client secret out of the github-auth-start response', async () => {
    const response = expectResponse(await authStartHandler(buildEvent(), CONTEXT))

    expect(JSON.stringify(response)).not.toContain(CLIENT_SECRET)
  })

  it('keeps the client secret out of the github-auth-callback success response', async () => {
    stubSuccessfulTokenExchange()
    const event = buildEvent({
      headers: { cookie: `gh_oauth_state=${STATE_VALUE}` },
      queryStringParameters: { code: 'valid-code', state: STATE_VALUE },
    })

    const response = expectResponse(await authCallbackHandler(event, CONTEXT))

    expect(JSON.stringify(response)).not.toContain(CLIENT_SECRET)
  })

  it('keeps the client secret out of the github-auth-callback error response', async () => {
    const event = buildEvent({ queryStringParameters: { error: 'access_denied' } })

    const response = expectResponse(await authCallbackHandler(event, CONTEXT))

    expect(JSON.stringify(response)).not.toContain(CLIENT_SECRET)
  })
})
