# Technical Specifications — Sub-Issue A (#82): GitHub OAuth Login / Logout

## Re-run context

This command previously ended with `status: review specs` because `test-cases.md` assumed a
Settings page (Sub-Issues B/E) that did not exist yet. That mismatch has since been resolved by
rescoping `business-specifications.md` and `test-cases.md` (commits `b393c8d`, `f8dc3c6`) to scope
Sub-Issue A to the login-readiness check, auth-state detection, and login/logout actions only. The
composable committed in `5c8d4d7` already satisfies every rescoped Sub-Issue A rule and test case
(A-1 through A-10) without changes. This run made one small addition (below) and re-verified the
rest.

## Summary of files created/changed

- `src/types/repo-config.ts` — new. Extracted `RepoConfigDraft` (previously declared inline in
  `useGitHubAuth.ts`) into `src/types/`, per this project's "type-first" convention (types are
  defined in `src/types/` before the logic that uses them).
- `src/composables/useGitHubAuth.ts` — changed. Removed the inline `RepoConfigDraft` interface;
  imports it from `@/types/repo-config` instead. No behavioral change.

## Non-trivial decisions

- **`RepoConfigDraft` moved to `src/types/`, not kept inline.** It's consumed by
  `canInitiateLogin` here, but its fields (`owner/repo`, file path, `revalidate-cache-days`) are
  owned by Sub-Issue B and rendered by Sub-Issue E — both will need the same shape. A single
  exported type in `src/types/` avoids each sub-issue declaring its own copy.
- **No other code changes.** The composable already implements every rescoped Sub-Issue A rule
  (business-specifications.md rules 1, 3–6; edge cases) and passes a manual trace against all ten
  rescoped test cases:
  - A-1/A-2 — `canInitiateLogin` returns `false`/`true` based on `hasRequiredRepoConfig` and
    `hasValidCacheDays`.
  - A-3 — `login()` sets `window.location.href` to the OAuth start endpoint.
  - A-4/A-9 — `initializeAuthState` reads the `auth` query param, applies success/error state via
    `applyAuthCallbackResult`, and strips the param via `stripAuthCallbackParam`.
  - A-5/A-8 — `restoreStoredAuthState` reads the persisted flag and always clears `authError`,
    so a plain reload with no callback param shows the stored state with no stale error.
  - A-6/A-7 — `logout()` only touches the `githubAuthenticated` IndexedDB key (never station data
    or repo config keys) and always clears local state even when `requestServerLogout` rejects.
  - A-10 — `handleUnauthorized()` is exported for the future proxy-calling composable (Sub-Issues
    C/D) to invoke on a 401.
- **Deviation from ADR-011's stated auth-detection method, carried over from the prior run.**
  ADR-011 says the SPA detects auth state "by calling the GitHub API proxy... checking whether it
  returns a valid response or a 401." That proxy-calling composable doesn't exist yet (Sub-Issues
  C/D), so `initializeAuthState` instead trusts a persisted non-sensitive IndexedDB boolean,
  written only in response to the trusted server-side `auth=success` redirect. This was already
  documented and accepted in the prior run; carrying it forward rather than re-litigating it here.
  It remains bounded: no real GitHub API call succeeds without the actual `HttpOnly` cookie, and
  `handleUnauthorized` corrects the flag on the first real 401 once Sub-Issues C/D wire it in.

## Self-code review

No new logic was introduced (only a type extraction), so no new bugs were introduced. Re-checked
the three fixes from the prior run's self-review are still in place and unaffected by the type
move:

1. `requestServerLogout()` still catches/discards `fetch` failures so `logout()` cannot leave the
   UI stuck authenticated on a network error (A-7).
2. `stripAuthCallbackParam` still calls `url.toString()` explicitly rather than relying on
   implicit `URL` coercion.
3. `restoreStoredAuthState` still routes through `updateAuthState(stored === true, null)`, clearing
   any stale `authError` on every re-initialization.

status: ready
