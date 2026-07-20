// GET/PUT — proxies GitHub Contents API reads and writes using the token from the
// `gh_token` cookie. `owner`/`repo`/`path` are forwarded exactly as supplied by the SPA;
// there is no server-side cross-check (security-guidelines.md rule 4) — GitHub's own
// OAuth token scope is the authorization boundary. A 401 from GitHub clears the cookie
// so the SPA can prompt re-authentication instead of retrying with a dead token.
import type { Handler, HandlerEvent, HandlerResponse } from '@netlify/functions'
import { buildExpiredCookie, isHttpsRequest, parseCookies } from '../lib/cookies'
import { jsonResponse } from '../lib/http-responses'

const TOKEN_COOKIE_NAME = 'gh_token'
const GITHUB_API_BASE = 'https://api.github.com'
const GITHUB_ACCEPT_HEADER = 'application/vnd.github+json'
const USER_AGENT = 'french-gas-stations-scraper/1.0'

interface ReadContentsRequest {
  kind: 'read'
  owner: string
  repo: string
  path: string
}

interface WriteContentsRequest {
  kind: 'write'
  owner: string
  repo: string
  path: string
  message: string
  content: string
  sha?: string
}

type ContentsRequest = ReadContentsRequest | WriteContentsRequest

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'GET' && event.httpMethod !== 'PUT') {
    return jsonResponse(405, { error: 'Method not allowed' })
  }

  const accessToken = parseCookies(event.headers.cookie)[TOKEN_COOKIE_NAME]
  if (!accessToken) {
    return jsonResponse(401, { error: 'Not authenticated' })
  }

  const contentsRequest = buildContentsRequest(event)
  if (!contentsRequest) {
    return jsonResponse(400, { error: 'Missing owner, repo, path, message, or content' })
  }

  return forwardToGithub(contentsRequest, accessToken, isHttpsRequest(event))
}

function buildContentsRequest(event: HandlerEvent): ContentsRequest | null {
  if (event.httpMethod === 'GET') {
    return buildReadRequest(event)
  }
  return buildWriteRequest(event)
}

function buildReadRequest(event: HandlerEvent): ReadContentsRequest | null {
  const owner = event.queryStringParameters?.owner
  const repo = event.queryStringParameters?.repo
  const path = event.queryStringParameters?.path
  if (!owner || !repo || !path) {
    return null
  }
  return { kind: 'read', owner, repo, path }
}

function buildWriteRequest(event: HandlerEvent): WriteContentsRequest | null {
  const payload = parseJsonBody(event.body)
  if (!isWriteContentsPayload(payload)) {
    return null
  }
  return { kind: 'write', ...payload }
}

function parseJsonBody(body: string | null): unknown {
  if (!body) {
    return null
  }
  try {
    return JSON.parse(body)
  } catch {
    return null
  }
}

function isWriteContentsPayload(payload: unknown): payload is Omit<WriteContentsRequest, 'kind'> {
  if (typeof payload !== 'object' || payload === null) {
    return false
  }
  const candidate = payload as Record<string, unknown>
  const hasRequiredStrings =
    typeof candidate.owner === 'string' &&
    typeof candidate.repo === 'string' &&
    typeof candidate.path === 'string' &&
    typeof candidate.message === 'string' &&
    typeof candidate.content === 'string'
  const hasValidSha = candidate.sha === undefined || typeof candidate.sha === 'string'
  return hasRequiredStrings && hasValidSha
}

async function forwardToGithub(
  contentsRequest: ContentsRequest,
  accessToken: string,
  isSecureRequest: boolean,
): Promise<HandlerResponse> {
  let response: Response
  try {
    response = await fetchGithubContents(contentsRequest, accessToken)
  } catch {
    return jsonResponse(502, { error: 'Unable to reach GitHub' })
  }
  if (response.status === 401) {
    return unauthorizedResponse(isSecureRequest)
  }
  const body = await response.json().catch(() => ({}))
  return jsonResponse(response.status, body)
}

function fetchGithubContents(contentsRequest: ContentsRequest, accessToken: string): Promise<Response> {
  const url = contentsUrl(contentsRequest)
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: GITHUB_ACCEPT_HEADER,
    'User-Agent': USER_AGENT,
  }
  if (contentsRequest.kind === 'read') {
    return fetch(url, { headers })
  }
  return fetch(url, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(writeBody(contentsRequest)),
  })
}

// Percent-encoding each segment prevents a value like `../other-repo` from escaping
// the intended /repos/{owner}/{repo}/contents/{path} shape.
function contentsUrl(contentsRequest: ContentsRequest): string {
  const { owner, repo, path } = contentsRequest
  const encodedPath = path.split('/').map(encodeURIComponent).join('/')
  return `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodedPath}`
}

// Omitting `sha` tells GitHub to create the file; including it updates the existing
// one and enforces optimistic concurrency (a stale sha is rejected with 409).
function writeBody(contentsRequest: WriteContentsRequest): Record<string, string> {
  const { message, content, sha } = contentsRequest
  if (sha) {
    return { message, content, sha }
  }
  return { message, content }
}

function unauthorizedResponse(isSecureRequest: boolean): HandlerResponse {
  const expiredTokenCookie = buildExpiredCookie(TOKEN_COOKIE_NAME, isSecureRequest)
  return jsonResponse(
    401,
    { error: 'GitHub access token is invalid or expired' },
    [expiredTokenCookie],
  )
}
