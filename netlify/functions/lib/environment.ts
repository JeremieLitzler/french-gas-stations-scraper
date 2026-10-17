// Reads the GitHub OAuth App credentials set as Netlify environment variables.
export interface GithubOAuthCredentials {
  clientId: string
  clientSecret: string
}

export function readGithubOAuthCredentials(): GithubOAuthCredentials | null {
  const clientId = process.env.GITHUB_CLIENT_ID
  const clientSecret = process.env.GITHUB_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return null
  }
  return { clientId, clientSecret }
}

// Reads the fixed, single-repo configuration the scheduled price-history
// function uses (ADR-014) — independent of the OAuth cookie above, since a
// cron-triggered function has no browser session to read it from.
export interface HistoryConfig {
  githubPat: string
  owner: string
  repo: string
  preferencesFilePath: string
}

export function readHistoryConfig(): HistoryConfig | null {
  // Values pasted into the Netlify UI often carry a trailing newline or
  // space; for the PAT, GitHub rejects that as bad credentials (issue #174).
  const githubPat = process.env.HISTORY_GITHUB_PAT?.trim()
  const owner = process.env.HISTORY_GITHUB_OWNER?.trim()
  const repo = process.env.HISTORY_GITHUB_REPO?.trim()
  const preferencesFilePath = process.env.HISTORY_PREFS_FILE_PATH?.trim()
  if (!githubPat || !owner || !repo || !preferencesFilePath) {
    return null
  }
  return { githubPat, owner, repo, preferencesFilePath }
}
