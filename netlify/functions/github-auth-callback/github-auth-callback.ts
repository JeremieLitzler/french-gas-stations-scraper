// GET — GitHub's OAuth redirect target. Validates `state`, exchanges `code` for an
// access token server-side, and sets it as the `gh_token` session cookie. Redirects to
// /settings?auth=success|error; the token never appears in the URL or response body.
import type { Handler, HandlerEvent, HandlerResponse } from '@netlify/functions'
import {
  buildExpiredCookie,
  buildSessionCookie,
  isHttpsRequest,
  parseCookies,
} from '../lib/cookies'
import { readGithubOAuthCredentials, type GithubOAuthCredentials } from '../lib/environment'
import { jsonResponse, redirectResponse } from '../lib/http-responses'

const STATE_COOKIE_NAME = 'gh_oauth_state'
const TOKEN_COOKIE_NAME = 'gh_token'
const TOKEN_COOKIE_MAX_AGE_SECONDS = 28800
const SETTINGS_SUCCESS_PATH = '/settings?auth=success'
const SETTINGS_ERROR_PATH = '/settings?auth=error'
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token'

type CallbackValidation =
  | { ok: true; code: string; credentials: GithubOAuthCredentials }
  | { ok: false }

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'GET') {
    return jsonResponse(405, { error: 'Method not allowed' })
  }

  const isSecureRequest = isHttpsRequest(event)
  const validation = validateCallbackRequest(event)
  if (!validation.ok) {
    return redirectToSettingsError(isSecureRequest)
  }

  const accessToken = await exchangeCodeForAccessToken(validation.code, validation.credentials)
  if (!accessToken) {
    return redirectToSettingsError(isSecureRequest)
  }

  return redirectToSettingsSuccess(accessToken, isSecureRequest)
}

function validateCallbackRequest(event: HandlerEvent): CallbackValidation {
  if (event.queryStringParameters?.error) {
    return { ok: false }
  }
  if (!requestStateMatchesCookie(event)) {
    return { ok: false }
  }
  const code = event.queryStringParameters?.code
  if (!code) {
    return { ok: false }
  }
  const credentials = readGithubOAuthCredentials()
  if (!credentials) {
    return { ok: false }
  }
  return { ok: true, code, credentials }
}

function requestStateMatchesCookie(event: HandlerEvent): boolean {
  const cookieState = parseCookies(event.headers.cookie)[STATE_COOKIE_NAME]
  const queryState = event.queryStringParameters?.state
  return Boolean(cookieState) && cookieState === queryState
}

async function exchangeCodeForAccessToken(
  code: string,
  credentials: GithubOAuthCredentials,
): Promise<string | null> {
  try {
    const response = await fetch(GITHUB_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
        code,
      }),
    })
    if (!response.ok) {
      return null
    }
    // GitHub returns HTTP 200 even for a rejected code (e.g. bad_verification_code),
    // with an error body instead of access_token — the type guard below catches that.
    const payload: unknown = await response.json()
    return isAccessTokenPayload(payload) ? payload.access_token : null
  } catch {
    return null
  }
}

function isAccessTokenPayload(payload: unknown): payload is { access_token: string } {
  if (typeof payload !== 'object' || payload === null) {
    return false
  }
  return typeof (payload as Record<string, unknown>).access_token === 'string'
}

function redirectToSettingsError(isSecureRequest: boolean): HandlerResponse {
  const expiredStateCookie = buildExpiredCookie(STATE_COOKIE_NAME, isSecureRequest)
  return redirectResponse(SETTINGS_ERROR_PATH, [expiredStateCookie])
}

function redirectToSettingsSuccess(accessToken: string, isSecureRequest: boolean): HandlerResponse {
  const tokenCookie = buildSessionCookie(TOKEN_COOKIE_NAME, accessToken, {
    maxAgeSeconds: TOKEN_COOKIE_MAX_AGE_SECONDS,
    isSecureRequest,
    sameSite: 'Strict',
  })
  const expiredStateCookie = buildExpiredCookie(STATE_COOKIE_NAME, isSecureRequest)
  return redirectResponse(SETTINGS_SUCCESS_PATH, [tokenCookie, expiredStateCookie])
}
