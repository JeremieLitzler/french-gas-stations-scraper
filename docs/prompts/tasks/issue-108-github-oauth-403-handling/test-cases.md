# Test Cases: Handle GitHub org OAuth restriction (403)

## Settings save — repo/file-path reachability check (`useRepoConfig.ts`)

1. Given a valid repo/file path, when the file-path check returns 403 with a body
   indicating GitHub's OAuth App organization restriction, then the validation
   error shown to the user is the distinct org-restriction message — and the
   repo-level fallback check that normally runs after a non-ok, non-401, non-404
   result is skipped (mirrors how a 401 already short-circuits).
2. Given the same setup, when the file-path check returns 403 with a body that
   does not indicate an org restriction (e.g. a rate-limit message), then the
   validation error is the existing generic "impossible de vérifier" message,
   unchanged from today.
3. Given the same setup, when the file-path check returns 403 with a body that
   isn't valid JSON (or has no readable `message`), then the validation error
   falls back to the existing generic message and no unhandled error is thrown.
4. Given a file-path check that returns 404 (falls through to the repo-level
   check, as today), when that repo-level check then returns 403 with an
   org-restriction body, then the validation error is the distinct
   org-restriction message.
5. Given a file-path check that returns 401, when validation runs, then the
   result is unchanged: the existing session-expired message (regression guard —
   this feature adds no new branch for 401).
6. Given a file-path check that returns 404, when validation runs, then it still
   falls through to the repo-level check exactly as before (regression guard).
7. Given a file-path check that returns 200, when validation runs, then there is
   no validation error (regression guard).

## App-load read (`useRemotePreferencesSync.ts`)

8. Given a stale local cache and a complete repo config, when the remote-file
   fetch returns 403 with an org-restriction body, then the sync error shown is
   the distinct org-restriction message — not the generic fetch-failed message
   and not the re-authentication message — and the locally stored preferences
   are left untouched.
9. Given the same setup, when the remote-file fetch returns 403 with a body that
   does not indicate an org restriction, then the sync error is the existing
   generic fetch-failed message, unchanged from today.
10. Given the same setup, when the remote-file fetch returns 401, then the sync
    error is the existing access-revoked message (regression guard).
11. Given the same setup, when the remote-file fetch returns 200 with a valid
    file, then the remote preferences are applied normally with no sync error
    (regression guard).

## Preferences push — read-before-write and final write (`useRemotePreferencesWrite.ts`)

12. Given an authenticated push with a complete repo config, when the check for
    an existing remote file returns 403 with an org-restriction body, then the
    write error shown is the distinct org-restriction message, phrased with the
    same "your local data is kept" reassurance this composable's other write
    failures already use — not the generic write-failed message and not the
    re-authentication message.
13. Given the same setup, when the existing-file check returns 403 with a body
    that does not indicate an org restriction, then the write error is the
    existing generic write-failed message, unchanged from today.
14. Given the existing-file check succeeded and the user confirmed the write,
    when the final PUT returns 403 with an org-restriction body, then the write
    error shown is the same distinct org-restriction message.
15. Given the same confirmed-write setup, when the final PUT returns 401, then
    the write error is the existing re-authentication message (regression
    guard).
16. Given the same confirmed-write setup, when the final PUT returns 409, then
    the write error is the existing conflict message (regression guard).

## Shared message content and safety (all three call sites)

17. Given a detected org-restriction 403, when the message is shown to the user,
    then it states that the organization restricts data access for third-party
    OAuth Apps, includes GitHub's own explanatory text from the response body,
    and links to `https://docs.github.com/articles/restricting-access-to-your-organization-s-data/`.
18. Given a 403 response whose body's own `documentation_url` field differs from
    the restriction-docs URL, when the org-restriction message is shown, then
    the link always points to the fixed restriction-docs URL — never to the
    value from the response body.
19. Given an org-restriction body whose message text contains characters that
    would normally be interpreted as HTML (e.g. angle brackets), when it is
    displayed, then those characters appear as literal text on the page and are
    not rendered as markup.
20. Given an org-restriction body whose message text contains invisible
    Unicode bidirectional-override or other non-printing control characters,
    when it is displayed, then those characters are absent from the rendered
    text and the visible text reads in a stable, non-reordered order.
21. Given the same org-restriction condition occurring at each of the three call
    sites, when their messages are compared, then each is worded in that call
    site's own existing style (matching how its other error messages already
    differ from one another), while each still independently satisfies scenario
    17's content requirement.

status: ready
