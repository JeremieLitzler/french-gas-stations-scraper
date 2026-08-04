# Technical Specifications: Handle GitHub org OAuth restriction (403)

## Why this file stops at "review specs" instead of code

Mid-implementation, the user redirected the message design (see conversation): instead of
echoing GitHub's own 403 message text with a fixed generic docs link, the app should show one
fixed French sentence with a link built from the user's own configured repo owner, opening in a
new tab. This contradicts several rules already written into `business-specifications.md` and
`security-guidelines.md`, and several scenarios in `test-cases.md` no longer describe the
intended behavior. Rather than have `/jli-codes` silently rewrite those three files (owned by
`/jli-writes-spec`, `/jli-verifies-security`, `/jli-writes-tests-spec`), this file records the
fully-resolved design below so the spec-revision commands can transcribe it directly without
re-asking the user anything.

## Resolved design (confirmed with the user)

1. **Message text is fixed and identical at all three call sites** (no more per-composable tone
   variation, no more "your local data is kept" reassurance tied to this message):

   > Le dépôt choisi se trouve sous une organisation n'autorisant pas l'authentification avec
   > votre compte et le dépôt choisi. Veuillez visiter ce **lien** pour autoriser l'accès.

   (Typo fixed from the user's literal wording: "choisit" → "choisi" — the earlier occurrence
   is the past participle modifying "dépôt", matching the second, already-correct occurrence in
   the same sentence. Flagging this fix explicitly rather than silently carrying a typo into
   product copy; revert in `/jli-writes-spec` if the exact literal string is wanted instead.)

2. **GitHub's own 403 `message` body text is no longer displayed anywhere.** It is still read,
   but only to *detect* the org-restriction case (does it contain `"OAuth App access
   restrictions"`) — the extracted text itself is discarded, never interpolated into the
   user-visible message. Consequence: the bidi/control-character stripping
   (`sanitizeGitHubText`, `CONTROL_CHAR_CODE_RANGES`) built for the previous design has no
   remaining purpose (there is no longer any GitHub-supplied text reaching the DOM) and should
   be removed, not carried forward — dead code otherwise. The `ProxyCheckResult`-style
   discriminated union (`{ kind: 'orgRestricted'; message: string }`) also reverts to needing no
   payload: detection becomes a plain boolean check, so `useRepoConfig.ts`'s `ProxyCheckResult`
   can revert to a plain string union (`'ok' | 'notFound' | 'unauthorized' | 'orgRestricted' |
   'error'`) rather than the discriminated union added in the first pass — simpler, and the
   original one-off need for a payload (carrying the message) no longer exists.

3. **The link is built from the user's own configured repo owner, never from the response
   body**, as:

   ```
   https://github.com/organizations/${encodeURIComponent(owner)}/settings/oauth_application_policy
   ```

   `owner` is the same value already extracted by each composable's existing `splitOwnerRepo`
   (the user's own Settings input, already validated as non-empty and free of `/`) — not
   anything read from GitHub's response. `encodeURIComponent` is applied defensively even though
   GitHub org/user logins are alphanumeric-and-hyphen only, because building a URL by
   concatenating any external-ish string without encoding is the kind of pattern that becomes a
   bug the day that assumption changes.

   This is a *narrower*, not weaker, version of the original security rule ("never
   response-derived"): the org-restriction feature can only ever fire for the org the user
   themselves is already configured against, so linking to that org's own OAuth policy page is
   exactly the actionable page. It must still never read `documentation_url` or any other
   response field.

4. **The link renders as a real `<a>` element**, `target="_blank" rel="noopener noreferrer"` —
   not markdown brackets, and not plain interpolated text. `rel="noopener noreferrer"` is
   required alongside `target="_blank"` to prevent the opened GitHub tab from getting a `window
   .opener` reference back to this app (reverse-tabnabbing) — this becomes a new
   security-guidelines.md rule, replacing the now-moot bidi-stripping rule.

5. **New shared type + component needed** (type-first per CLAUDE.md): a `UserMessage` type
   (`string | { textBefore: string; linkLabel: string; linkUrl: string; textAfter: string }`) in
   `src/types/`, and a small presentational component (e.g. `MessageWithLink.vue`) that renders
   either the plain string or the three-part text+link+text, so the link-rendering logic isn't
   tripled across `GitHubSyncSettings.vue` (`validationError`) and `HomePageContent.vue`
   (`syncError`, `writeError`). This is a new file, which the original business spec's "no new
   files" scope note no longer holds against — that note was about the three composables, not
   about needing zero new files ever; a shared render helper for a genuinely new UI need (a
   real link, not plain text) is a reasonable, minimal addition rather than tripled duplication.

## What needs to change in the other spec files (for `/jli-writes-spec` etc.)

- `business-specifications.md` rule 2: replace "include GitHub's own explanatory text" with the
  fixed sentence above; replace the generic docs URL with the per-owner
  `oauth_application_policy` URL.
- `business-specifications.md` rule 3: delete or rewrite — message is now identical at all three
  call sites, so "each keeps its own style" no longer applies to this specific message.
- `security-guidelines.md` rule 2: rewrite from "hardcoded literal" to "built only from the
  user's own configured owner, `encodeURIComponent`-escaped, never from the response body."
- `security-guidelines.md` rule 3: replace bidi/control-char stripping with the
  `rel="noopener noreferrer"` requirement for the new `target="_blank"` link.
- `test-cases.md` 17–21: rewrite to match — fixed sentence + owner-derived link (17), link never
  derived from `documentation_url` even when present (18), real anchor with
  `target="_blank" rel="noopener noreferrer"` (19), no GitHub response text of any kind reaches
  the rendered output even if it contains HTML/bidi/control characters (20, strengthened from
  "stripped" to "never included"), identical message byte-for-byte at all three call sites (21,
  reversed from "distinct tone" to "consistency guard").

### Specifications Need Review

Please review current code and results.

status: review specs
