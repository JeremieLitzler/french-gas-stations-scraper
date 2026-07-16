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
