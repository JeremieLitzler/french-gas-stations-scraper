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
  const githubPat = process.env.HISTORY_GITHUB_PAT
  const owner = process.env.HISTORY_GITHUB_OWNER
  const repo = process.env.HISTORY_GITHUB_REPO
  const preferencesFilePath = process.env.HISTORY_PREFS_FILE_PATH
  if (!githubPat || !owner || !repo || !preferencesFilePath) {
    return null
  }
  return { githubPat, owner, repo, preferencesFilePath }
}
