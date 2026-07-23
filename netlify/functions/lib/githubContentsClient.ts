// Minimal GitHub Contents API client authenticated with the fixed,
// repo-scoped PAT (issue #112, ADR-014) — a separate, simpler client than
// github-api-proxy.ts's cookie-forwarding proxy, since this function calls
// GitHub directly with its own credential rather than proxying a browser
// request. Base64 conversion uses Node's Buffer directly (available in the
// Netlify Functions runtime), unlike the browser-side composables which
// need a btoa/atob-based workaround.
const GITHUB_API_BASE = 'https://api.github.com'
const GITHUB_ACCEPT_HEADER = 'application/vnd.github+json'
const USER_AGENT = 'french-gas-stations-scraper/1.0'

export interface RemoteFile {
  content: string
  sha: string
}

type ReadOutcome = { found: true; file: RemoteFile } | { found: false }

export function encodeBase64(text: string): string {
  return Buffer.from(text, 'utf-8').toString('base64')
}

// GitHub's Contents API wraps base64 content at 60 characters with embedded
// newlines; unlike the browser's atob() (used by the composables), Node's
// Buffer base64 decoder already ignores embedded whitespace, so no
// pre-stripping is needed here.
export function decodeBase64(base64: string): string {
  return Buffer.from(base64, 'base64').toString('utf-8')
}

function authHeaders(githubPat: string): Record<string, string> {
  return {
    Authorization: `Bearer ${githubPat}`,
    Accept: GITHUB_ACCEPT_HEADER,
    'User-Agent': USER_AGENT,
  }
}

// Percent-encoding each segment prevents a value like `../other-repo` from
// escaping the intended /repos/{owner}/{repo}/contents/{path} shape.
function contentsUrl(owner: string, repo: string, path: string): string {
  const encodedPath = path.split('/').map(encodeURIComponent).join('/')
  const encodedOwner = encodeURIComponent(owner)
  const encodedRepo = encodeURIComponent(repo)
  return `${GITHUB_API_BASE}/repos/${encodedOwner}/${encodedRepo}/contents/${encodedPath}`
}

export async function readRemoteFile(
  githubPat: string,
  owner: string,
  repo: string,
  path: string,
): Promise<ReadOutcome> {
  const url = contentsUrl(owner, repo, path)
  const response = await fetch(url, { headers: authHeaders(githubPat) })
  if (response.status === 404) return { found: false }
  if (!response.ok) throw new Error(`GitHub read failed with status ${response.status}.`)
  return { found: true, file: await parseRemoteFile(response) }
}

async function parseRemoteFile(response: Response): Promise<RemoteFile> {
  const body = (await response.json()) as Record<string, unknown>
  if (typeof body.content !== 'string' || typeof body.sha !== 'string') {
    throw new Error('Missing base64 content or sha in GitHub response.')
  }
  return { content: body.content, sha: body.sha }
}

// Omitting `sha` (JSON.stringify drops undefined-valued properties) tells
// GitHub to create the file; including it updates the existing one and
// enforces optimistic concurrency, mirroring github-api-proxy.ts.
export async function writeRemoteFile(
  githubPat: string,
  owner: string,
  repo: string,
  path: string,
  message: string,
  base64Content: string,
  sha: string | undefined,
): Promise<void> {
  const url = contentsUrl(owner, repo, path)
  const response = await fetch(url, {
    method: 'PUT',
    headers: { ...authHeaders(githubPat), 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, content: base64Content, sha }),
  })
  if (!response.ok) throw new Error(`GitHub write failed with status ${response.status}.`)
}
