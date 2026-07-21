# ADR-012: User-Owned GitHub Repository as Remote Sync Backend

**Date:** 2026-04-30
**Status:** Accepted

## Context

Issue #64 introduces preference sync: `favoriteStations` and `fuelTypeDefault` should persist beyond a single device and survive browser storage clearing. Repository configuration (`owner`, `repo`, `revalidateCacheDays`) is a local-only setting, not part of the synced data — it stays in IndexedDB and is never written to or read from the remote file.

The app currently stores all data client-side only (ADR-008: IndexedDB). A remote persistence tier is needed for sync.

Options evaluated:

- **Dedicated backend + database**: Requires hosting, auth infrastructure, and ongoing maintenance cost.
- **Netlify Blobs / KV store**: Netlify-specific, not user-owned, requires account linkage.
- **User-owned GitHub repository**: The user already needs a GitHub account for OAuth (ADR-011). A single JSON file in their own repo serves as a portable, free, auditable store they control entirely.

## Decision

Use a **user-owned GitHub repository** as the remote sync backend. A single JSON file (path configured by the user) is read on app load and written on preference change via the **GitHub Contents API** (`GET /repos/{owner}/{repo}/contents/{path}` and `PUT /repos/{owner}/{repo}/contents/{path}`).

All GitHub API calls are routed through a Netlify function (`github-api-proxy`) that reads the HTTP-only access token cookie (set by ADR-011) and forwards the request. The browser never holds the token.

### Remote JSON File Structure

See business-specifications.md, "Remote JSON File Structure", for the exact schema — `favoriteStations` and `fuelTypeDefault` only. Repo configuration (`owner`, `repo`, `revalidateCacheDays`) stays in IndexedDB and is never written to the remote file.

### Cache Invalidation Strategy

A timestamp stored in IndexedDB alongside the data avoids a GitHub API call on every page load — the app compares `Date.now()` against it before deciding whether to fetch. See business-specifications.md, Sub-Issue C, for the exact threshold rule and edge cases.

### Write Flow

On any preference change, the app writes optimistically to IndexedDB, then to the remote file via the proxy using the GitHub Contents API's `sha`-based optimistic concurrency (an absent `sha` creates the file; a stale `sha` returns 409). See business-specifications.md, Sub-Issue D, for the exact diff-confirmation and conflict-handling rules.

## Rationale

1. **User owns their data** — no vendor lock-in, portable JSON file, full git history of changes.
2. **Zero backend cost** — GitHub API is free for personal repos within rate limits.
3. **Auditable** — every write appears as a commit in the user's repository.
4. **Consistent auth** — reuses the OAuth token already obtained by ADR-011; no additional credential management.
5. **Cache-first** — `revalidateCacheDays` prevents hammering the GitHub API on every load while keeping data reasonably fresh.
6. **Proxy isolation** — the SPA never calls the GitHub API directly; the Netlify function validates ownership and forwards requests, consistent with ADR-006.

## Consequences

### Positive

- ✅ No dedicated backend or database to maintain
- ✅ User owns and controls their data
- ✅ Full change history via git commits in the user's repo
- ✅ Works within GitHub's free tier API rate limits for personal use
- ✅ Compatible with existing IndexedDB layer (ADR-008) — remote is a sync layer, not a replacement

### Negative

- ⚠️ GitHub API rate limit: 5 000 authenticated requests/hour — not an issue for personal use with a cache-first strategy
- ⚠️ 409 conflict on concurrent writes from multiple devices requires manual intervention (no automatic merge)
- ⚠️ User must create the GitHub repository manually before sync works — the JSON file itself is created automatically on the first write (Sub-Issue D sends a `PUT` with no SHA, which GitHub treats as a file creation)
- ⚠️ First-time setup requires the user to understand what `owner/repo` means — mitigated by UI guidance
- ⚠️ Platform dependency on GitHub's API availability — app degrades gracefully to local-only when the API is unreachable

## Alternatives Considered

1. **Netlify Blobs**: Platform-specific, not user-owned, would require tying storage to the Netlify site identity — rejected.
2. **Dedicated Express/Node backend + PostgreSQL**: Correct at scale but overkill for a single-user preferences file — rejected.
3. **Supabase**: Third-party dependency with its own auth and pricing — rejected in favour of the user's existing GitHub account. Could be reconsidered if the app becomes a profitable service.
4. **Browser sync via BroadcastChannel**: Syncs across tabs but not across devices — does not solve the persistence problem.

## Notes

- This ADR extends ADR-008 (client-side storage). IndexedDB remains the source of truth for the current session; the GitHub repo is the durable backup and cross-device sync layer.
- The GitHub Contents API has a file size limit of 100 MB (well above any realistic preferences JSON).
- If the user's repository is private, the `repo` OAuth scope is required. If public, `public_repo` suffices. Scope selection should be documented in the Settings UI setup guide.

## References

- [GitHub Contents API documentation](https://docs.github.com/en/rest/repos/contents)
- [ADR-008: IndexedDB Over localStorage for Client-Side Persistence](./ADR-008-client-side-storage.md)
- [ADR-011: GitHub OAuth App Authentication](./ADR-011-github-oauth-app-auth.md)
- [ADR-006: Netlify Functions for CORS-Free HTML Fetching](./ADR-006-netlify-functions-for-cors-proxy.md)
