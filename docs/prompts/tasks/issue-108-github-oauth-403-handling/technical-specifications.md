# Technical Specifications: Handle GitHub org OAuth restriction (403)

## Files changed

- `src/composables/useRepoConfig.ts` — `classifyProxyResponse`/`checkProxyReachable` now read the
  403 response body to detect GitHub's org-OAuth-restriction case; `resolveValidationError` resolves
  it to a distinct message and skips the repo-level fallback, mirroring the existing 401 short-circuit.
- `src/composables/useRemotePreferencesSync.ts` — `requestRemoteFile` throws a new
  `RemoteOrgRestrictedError` on an org-restricted 403; `handleFetchFailure` maps it to a distinct
  `syncError` message.
- `src/composables/useRemotePreferencesWrite.ts` — `fetchExistingFile` and `handlePutResponse` both
  throw a new `RemoteWriteOrgRestrictedError` on an org-restricted 403; `handleWriteFailure` maps it
  to a distinct `writeError` message with the same "your local data is kept" reassurance this
  composable's other failure messages already use.

No new files were created and `netlify/functions/github-api-proxy.ts` is unchanged, per the task's
scope.

## Non-trivial decisions

- **`ProxyCheckResult` becomes a discriminated union, not a string enum.** Detecting the
  org-restriction case requires reading the 403 response body, so the org-restricted branch must
  carry the extracted message alongside its outcome. A plain string union (`'orgRestricted'`) would
  have nowhere to put that payload, so each variant became `{ kind: '...' }`, with `orgRestricted`
  adding a `message` field. This changed `classifyProxyResponse` from a sync `(status: number)`
  function into an async `(response: Response)` function, since detecting the reason now requires
  awaiting `response.json()`.

- **Detection, sanitization, and the docs-link constant are duplicated per composable, not
  extracted to a shared util.** The task's scope explicitly lists these three files with "no new
  files." The existing code in all three files already duplicates small helpers this way
  (`splitOwnerRepo`, `buildProxyUrl`, `hasCompleteRepoConfig`), so this follows the file's own
  established convention rather than introducing a new one.

- **The org-restriction 403 body is read via a small `extractOrgRestrictionMessage(response)`
  helper, wrapped in try/catch (security-guidelines.md rule 1).** Any parse failure or unexpected
  shape resolves to `null`, which every call site treats as "not the org-restriction case" and
  falls through to that call site's existing generic-failure message — never an uncaught throw.

- **The restriction-docs link and indicator string are hardcoded string constants
  (`ORG_RESTRICTION_DOCS_URL`, `ORG_RESTRICTION_INDICATOR`), never read from the response body's
  own `documentation_url` field** (security-guidelines.md rule 2) — this is what test case 18
  checks for.

- **New error classes (`RemoteOrgRestrictedError`, `RemoteWriteOrgRestrictedError`) carry the
  sanitized GitHub message via the standard `Error.message` property**, rather than a custom field.
  This mirrors the existing `RemoteUnauthorizedError`/`RemoteWriteConflictError` pattern in both
  files exactly, so `handleFetchFailure`/`handleWriteFailure` stay a flat `instanceof` chain instead
  of introducing a second way to carry error payloads.

- **Bidi/control-character stripping is built from numeric Unicode code points
  (`CONTROL_CHAR_CODE_RANGES` + `String.fromCharCode`), not typed as literal characters or `\u`
  escape sequences in the regex source.** This keeps the source file itself free of the exact
  invisible/bidi characters security-guidelines.md rule 3 defends against, which is easier to audit
  than a regex literal containing invisible bytes. The regex is built once at module load (not per
  call), so there's no repeated-compilation cost per sanitize call.

- **Each composable phrases its org-restriction message in its own style**
  (business-specifications.md rule 3 / test case 21): `useRepoConfig.ts`'s Settings-save message has
  no "local data" reassurance (saving always persists to IndexedDB regardless of auth, per that
  file's own doc comment); `useRemotePreferencesSync.ts` says "vos données locales sont
  utilisées" (matching its sibling `ACCESS_REVOKED_MESSAGE`); `useRemotePreferencesWrite.ts` says
  "vos données locales sont conservées" (matching its sibling `WRITE_FAILED_MESSAGE`/
  `INVALID_REMOTE_CONTENT_MESSAGE`). All three still independently satisfy test case 17's content
  requirement (states the org-OAuth-restriction, includes GitHub's text, links to the fixed URL).

## Self-code review

Two issues were found and fixed while reviewing the new sanitization/detection code:

1. **Missing BOM in the stripped character ranges.** U+FEFF (byte-order mark / zero-width
   no-break space) is another invisible character usable in spoofing, not covered by the initial
   range list. Added `[0xfeff, 0xfeff]` to `CONTROL_CHAR_CODE_RANGES` in all three files.
2. **No trim after stripping control characters.** If GitHub's message had leading/trailing
   invisible characters, stripping them could leave stray whitespace in the composed message.
   `sanitizeGitHubText` now trims the result after stripping.

One additional risk was checked and confirmed safe rather than changed: reusing a single
module-level global (`/g`) `RegExp` object across repeated `sanitizeGitHubText` calls could in
principle leak `lastIndex` state between calls — but `String.prototype.replace` resets `lastIndex`
to 0 itself when the regex is global, so the shared compiled pattern is safe to reuse as written.

status: ready
