// GET — starts the GitHub OAuth flow: generates a CSRF `state`, stores it in a
// short-lived cookie, and redirects the browser to GitHub's authorize page.
import type { Handler, HandlerEvent } from '@netlify/functions'
import { randomUUID } from 'node:crypto'
import { buildSessionCookie, isHttpsRequest } from '../lib/cookies'
import { readGithubOAuthCredentials } from '../lib/environment'
import { jsonResponse, redirectResponse } from '../lib/http-responses'

const OAUTH_SCOPE = 'repo'
const STATE_COOKIE_NAME = 'gh_oauth_state'
const STATE_COOKIE_MAX_AGE_SECONDS = 300
const CALLBACK_PATH = '/.netlify/functions/github-auth-callback'

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'GET') {
    return jsonResponse(405, { error: 'Method not allowed' })
  }

  const credentials = readGithubOAuthCredentials()
  if (!credentials) {
    return jsonResponse(500, { error: 'GitHub OAuth is not configured' })
  }

  const redirectUri = buildCallbackRedirectUri(event)
  if (!redirectUri) {
    return jsonResponse(500, { error: 'Unable to determine the callback URL' })
  }

  const state = randomUUID()
  const authorizeUrl = buildAuthorizeUrl(credentials.clientId, redirectUri, state)
  // `Lax`, not `Strict`: GitHub's redirect back to the callback is a cross-site
  // top-level GET navigation, and a `Strict` cookie is withheld on that hop — the
  // state round-trip check in github-auth-callback would never see it.
  const stateCookie = buildSessionCookie(STATE_COOKIE_NAME, state, {
    maxAgeSeconds: STATE_COOKIE_MAX_AGE_SECONDS,
    isSecureRequest: isHttpsRequest(event),
    sameSite: 'Lax',
  })

  return redirectResponse(authorizeUrl, [stateCookie])
}

function buildCallbackRedirectUri(event: HandlerEvent): string | null {
  const siteUrl = process.env.URL ?? deriveOriginFromEvent(event)
  if (!siteUrl) {
    return null
  }
  return `${siteUrl}${CALLBACK_PATH}`
}

// `process.env.URL` covers Netlify (dev and prod, including local http). This fallback
// only runs if that's somehow unset, and never guesses an insecure origin — an
// unconfirmed-https request is denied rather than defaulted to `http://`.
function deriveOriginFromEvent(event: HandlerEvent): string | null {
  if (!isHttpsRequest(event)) {
    return null
  }
  return `https://${event.headers.host}`
}

function buildAuthorizeUrl(clientId: string, redirectUri: string, state: string): string {
  const url = new URL('https://github.com/login/oauth/authorize')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('scope', OAUTH_SCOPE)
  url.searchParams.set('state', state)
  return url.toString()
}
