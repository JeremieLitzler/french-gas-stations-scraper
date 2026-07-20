/**
 * Tests for the github-auth-logout Netlify function — Issue #64, Sub-Issue F.
 *
 * Scenarios covered:
 *   F-7 — Logout Netlify function clears the gh_token cookie
 */

import { describe, expect, it } from 'vitest'
import type { HandlerContext, HandlerEvent, HandlerResponse } from '@netlify/functions'
import { handler } from './github-auth-logout'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CONTEXT = {} as HandlerContext

function buildEvent(overrides: Partial<HandlerEvent> = {}): HandlerEvent {
  return {
    rawUrl: 'http://localhost:8888/.netlify/functions/github-auth-logout',
    rawQuery: '',
    path: '/.netlify/functions/github-auth-logout',
    httpMethod: 'POST',
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

// ---------------------------------------------------------------------------
// F-7: Logout Netlify function clears the gh_token cookie
// ---------------------------------------------------------------------------

describe('F-7: Logout Netlify function clears the gh_token cookie', () => {
  it('clears the gh_token cookie when one is present', async () => {
    const event = buildEvent({ headers: { cookie: 'gh_token=gho_existing_token' } })

    const response = expectResponse(await handler(event, CONTEXT))

    expect(response.statusCode).toBe(200)
    const cookies = setCookies(response)
    expect(cookies.some((cookie) => cookie.startsWith('gh_token=; ') && cookie.includes('Max-Age=0'))).toBe(true)
  })

  it('succeeds without error when the gh_token cookie was already absent', async () => {
    const event = buildEvent()

    const response = expectResponse(await handler(event, CONTEXT))

    expect(response.statusCode).toBe(200)
    expect(JSON.parse(response.body ?? '{}')).toEqual({ success: true })
  })
})
