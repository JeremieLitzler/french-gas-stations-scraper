# Business Specifications: Handle GitHub org OAuth restriction (403)

## Goal

When a user's GitHub organization has "OAuth App access restrictions" enabled, every
call site that talks to the `github-api-proxy` function must recognize the resulting
HTTP 403 and tell the user specifically what is wrong (the organization blocks
third-party OAuth Apps) and how to fix it (a link to GitHub's restriction docs),
instead of falling into a generic "unreachable"/"failed" message.

## Scope

Files to modify (no new files; `netlify/functions/github-api-proxy.ts` is unchanged —
it already forwards GitHub's status/body verbatim):

- `src/composables/useRepoConfig.ts` — repo/file-path reachability check run during
  Settings save (`classifyProxyResponse`/`checkProxyReachable`).
- `src/composables/useRemotePreferencesSync.ts` — remote-file read on app load
  (`requestRemoteFile`).
- `src/composables/useRemotePreferencesWrite.ts` — remote-file read/write during a
  preferences push (`fetchExistingFile`/`handlePutResponse`).

## Rules

1. **Detecting the org-restriction case.** A 403 response is only treated as the
   org-OAuth-restriction case when its JSON body's `message` field indicates GitHub
   blocked the request for that reason (per GitHub's own wording, e.g. "OAuth App
   access restrictions"). A 403 whose body doesn't indicate this (rate limiting,
   other forbidden causes) or whose body can't be parsed falls back to that call
   site's existing generic failure message — unchanged from today.

2. **Message content.** When the org-restriction case is detected, the user-visible
   message must state that the organization restricts data access for third-party
   OAuth Apps, include GitHub's own explanatory text from the response body (so the
   organization name is visible to the user, since it's embedded in that text), and
   link to `https://docs.github.com/articles/restricting-access-to-your-organization-s-data/`.
   The GitHub-supplied text is shown as plain text, never interpreted as HTML.

3. **Message tone stays call-site-specific.** Each of the three composables keeps
   composing this message in its own existing style (language, and — for the write
   path — the "your local data is kept" reassurance already used for its other
   failure messages), the same way each composable already phrases 401/404/409
   differently today. Only the underlying GitHub-restriction information (rule 2) is
   shared.

4. **No change to unrelated statuses.** 401 (re-authentication), 404 (not found),
   409 (conflict), 200 (success), and other/unexpected statuses keep their current
   behavior exactly as-is; 403 is a new, additional branch alongside them.

5. **`useRepoConfig.ts` short-circuits like a 401.** Today, a file-path check that
   isn't 200/401/404 falls through to also check whether the repo itself is
   reachable. An org-OAuth-restriction 403 skips that fallback (it would 403 again
   for the same organization-wide reason) and resolves directly to the message from
   rule 2 — mirroring how a 401 already short-circuits.

6. **Read and write paths surface it as a distinct, non-retryable failure.** In
   `useRemotePreferencesSync.ts` and `useRemotePreferencesWrite.ts`, the
   org-restriction 403 is surfaced as its own error state (not the generic
   fetch-failed / write-failed message, and not the re-authentication message —
   re-authenticating does not fix an org-level restriction).

## Out of scope

- `netlify/functions/github-api-proxy.ts` — already forwards GitHub's status/body
  verbatim for non-401 responses.
- Any UI affordance to let the user request org-admin approval from within the app —
  the message only informs and links to GitHub's own docs.

status: ready
