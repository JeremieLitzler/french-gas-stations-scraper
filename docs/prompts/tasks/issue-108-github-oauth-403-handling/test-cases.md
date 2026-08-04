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
    write error shown is the fixed org-restriction message (scenario 17) —
    not the generic write-failed message, not the re-authentication message,
    and without the "your local data is kept" reassurance this composable's
    other write failures use (this message does not vary by call site, per
    business-specifications.md rule 2).
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
    then it is exactly the fixed sentence "Le dépôt choisi se trouve sous une
    organisation n'autorisant pas l'authentification avec votre compte et le
    dépôt choisi. Veuillez visiter ce lien pour autoriser l'accès." with "lien"
    rendered as a clickable link — none of GitHub's own response text appears.
18. Given the repo owner configured in Settings is, for example, `acme-corp`,
    when the org-restriction message's link is inspected, then it points to the
    OAuth App access settings page for the `acme-corp` organization specifically
    — not any other organization, and not a generic GitHub docs page.
19. Given a 403 response whose body's own `documentation_url` field points to an
    unrelated page, when the org-restriction message's link is shown, then it
    still points to the configured owner's own settings page — never to the
    value from the response body.
20. Given an org-restriction body whose `message` field contains arbitrary text
    (including characters that would normally be interpreted as HTML, or
    invisible Unicode bidirectional-override/control characters), when the
    message is displayed, then none of that response text appears anywhere in
    the rendered message — only the fixed sentence and the owner's own link are
    shown.
21. Given the org-restriction message's link, when the user activates it, then
    GitHub's settings page opens in a new browser tab and the app's own
    page/state is left unchanged (the user is not navigated away from the app).
22. Given the same org-restriction condition occurring at each of the three call
    sites for the same configured owner, when their messages are compared, then
    all three are identical (regression guard — unlike the app's other failure
    messages, this one does not vary by call site).

status: ready
