// POST — clears the `gh_token` cookie. Succeeds even if it was already absent; never
// touches IndexedDB-persisted repo config, only ends the GitHub session.
import type { Handler, HandlerEvent } from '@netlify/functions'
import { buildExpiredCookie, isHttpsRequest } from './lib/cookies'
import { jsonResponse } from './lib/http-responses'

const TOKEN_COOKIE_NAME = 'gh_token'

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' })
  }

  const expiredTokenCookie = buildExpiredCookie(TOKEN_COOKIE_NAME, isHttpsRequest(event))
  return jsonResponse(200, { success: true }, [expiredTokenCookie])
}
