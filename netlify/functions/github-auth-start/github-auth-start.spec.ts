/**
 * Tests for the github-auth-start Netlify function — Issue #64, Sub-Issue F.
 *
 * Scenarios covered:
 *   F-1 — github-auth-start redirects to GitHub authorization URL
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { HandlerContext, HandlerEvent, HandlerResponse } from '@netlify/functions'
import { handler } from './github-auth-start'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CONTEXT = {} as HandlerContext

function buildEvent(overrides: Partial<HandlerEvent> = {}): HandlerEvent {
  return {
    rawUrl: 'http://localhost:8888/.netlify/functions/github-auth-start',
    rawQuery: '',
    path: '/.netlify/functions/github-auth-start',
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

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const ORIGINAL_ENV = { ...process.env }

beforeEach(() => {
  process.env.GITHUB_CLIENT_ID = 'test-client-id'
  process.env.GITHUB_CLIENT_SECRET = 'test-client-secret'
  process.env.URL = 'http://localhost:8888'
})

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
})

// ---------------------------------------------------------------------------
// F-1: github-auth-start redirects to GitHub authorization URL
// ---------------------------------------------------------------------------

describe('F-1: github-auth-start redirects to GitHub authorization URL', () => {
  it('redirects with client_id, scope=repo, and a state parameter', async () => {
    const response = expectResponse(await handler(buildEvent(), CONTEXT))

    expect(response.statusCode).toBe(302)
    const location = new URL(String(response.headers?.Location))
    expect(location.origin + location.pathname).toBe('https://github.com/login/oauth/authorize')
    expect(location.searchParams.get('client_id')).toBe('test-client-id')
    expect(location.searchParams.get('scope')).toBe('repo')
    expect(location.searchParams.get('state')).toBeTruthy()
  })

  it('sets a short-lived gh_oauth_state cookie carrying the same state value', async () => {
    const response = expectResponse(await handler(buildEvent(), CONTEXT))

    const location = new URL(String(response.headers?.Location))
    const state = location.searchParams.get('state')
    const cookies = response.multiValueHeaders?.['Set-Cookie'] ?? []
    expect(cookies.some((cookie) => cookie === `gh_oauth_state=${state}; HttpOnly; SameSite=Lax; Path=/; Max-Age=300`)).toBe(true)
  })
})
