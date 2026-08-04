# Security Guidelines: Handle GitHub org OAuth restriction (403)

1. **Fail closed on unparseable/unexpected 403 bodies.** What: wrap the 403 body read
   (parsing JSON, reading `message`) in a try/catch (or `.catch()`), the same defensive
   pattern already used for other proxy-response parsing in these files; any parse
   failure or unexpected shape must fall through to the call site's existing
   generic-failure message, never throw uncaught. Where: `useRepoConfig.ts`,
   `useRemotePreferencesSync.ts`, `useRemotePreferencesWrite.ts` — wherever the
   org-restriction detection (rule 1 of business-specifications.md) reads the response
   body. Why: the 403 body's exact shape is GitHub's, not a contract this project
   controls; a future GitHub change or a proxy hiccup must degrade to the existing
   message, not crash the flow.

2. **Never render any GitHub response content in the org-restriction message.** What:
   the only permitted use of the 403 body's `message` field is a boolean check for the
   org-restriction indicator string; no field from the response body (the message text,
   `documentation_url`, or anything else) may reach the DOM. Where: the three
   composables' message-building step, and whichever component renders it (must never
   use `v-html`). Why: since the displayed message is now a fixed string
   (business-specifications.md rule 2), there is no legitimate reason for GitHub-supplied
   text to reach the page at all — letting any of it back in reopens the
   injection/spoofing surface this fixed-message design exists to close.

3. **Build the settings-page link only from the app's own already-validated repo-owner
   value, percent-encoded.** What: the organization segment of the link must come from
   the owner the user configured in this app's Settings (already validated as
   non-empty and slash-free) — never from any response field — and must be
   percent-encoded before insertion into the URL. Where: the link-construction step in
   each of the three composables. Why: building a URL from unencoded external-ish input
   is a bug that only shows itself the day that owner value contains a character it
   doesn't today; deriving it from the response body instead would risk pointing the
   user at an attacker-controlled URL if the proxy or upstream response is ever
   tampered with.

4. **The new-tab link must not create a reverse-tabnabbing vector.** What: the anchor
   that opens the settings page in a new browser tab must include
   `rel="noopener noreferrer"` alongside `target="_blank"`. Where: the link element
   rendering the org-restriction message. Why: without it, the newly opened GitHub tab
   retains a `window.opener` handle back to this app, letting a compromised or
   malicious destination page redirect or manipulate the tab the user came from.

status: ready
