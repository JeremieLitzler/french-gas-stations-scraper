Worktree: E:/Git/GitHub/french-gas-stations-scraper_fix-github-oauth-403-handling

# Issue #108: Handle GitHub org OAuth restriction (403) with actionable message

## Problem

A user whose GitHub organization has "OAuth App access restrictions" enabled gets an HTTP 403 from the GitHub Contents API, with a distinct message and `documentation_url` — not a 401/404/409. None of our GitHub-proxy call sites recognize this case today; it falls into a generic "unreachable"/"failed" message instead of telling the user what's actually wrong and how to fix it.

Real response body observed for a specific user (org name redacted as `Puzzlout`):

```json
{
  "message": "Although you appear to have the correct authorization credentials, the `Puzzlout` organization has enabled OAuth App access restrictions, meaning that data access to third-parties is limited. For more information on these restrictions, including how to enable this app, visit https://docs.github.com/articles/restricting-access-to-your-organization-s-data/",
  "documentation_url": "https://docs.github.com/rest/repos/contents#create-or-update-file-contents",
  "status": "403"
}
```

## Scope

- `src/composables/useRepoConfig.ts` (`classifyProxyResponse`/`checkProxyReachable`) — repo/file-path reachability check during Settings save.
- `src/composables/useRemotePreferencesSync.ts` (`requestRemoteFile`) — read on app load (Sub-Issue C).
- `src/composables/useRemotePreferencesWrite.ts` (`fetchExistingFile`/`handlePutResponse`) — write on update (Sub-Issue D).

Add a distinct branch for HTTP 403 in each composable's response handling, surfacing a message that tells the user their GitHub organization restricts OAuth Apps and links to GitHub's restriction docs (https://docs.github.com/articles/restricting-access-to-your-organization-s-data/).

## Out of scope

- `netlify/functions/github-api-proxy.ts` needs no change — it already forwards GitHub's status/body verbatim for non-401 responses; this is a client-side message-mapping gap only.
