# Security Guidelines: Handle GitHub org OAuth restriction (403)

1. **Fail closed on unparseable/unexpected 403 bodies.** What: wrap the 403 body read
   (parsing JSON, reading `message`) in a try/catch (or `.catch()`), the same
   defensive pattern already used for other proxy-response parsing in these files;
   any parse failure or unexpected shape must fall through to the call site's
   existing generic-failure message, never throw uncaught. Where:
   `useRepoConfig.ts`, `useRemotePreferencesSync.ts`,
   `useRemotePreferencesWrite.ts` — wherever the org-restriction detection (rule 1
   of business-specifications.md) reads the response body. Why: the 403 body's
   exact shape is GitHub's, not a contract this project controls; a future GitHub
   change or a proxy hiccup must degrade to the existing message, not crash the
   flow.

2. **The restriction-docs link is a hardcoded literal, never response-derived.**
   What: the `https://docs.github.com/articles/restricting-access-to-your-organization-s-data/`
   link shown to the user must be a fixed string in the code — never built from, or
   substituted by, any URL found in the response body (e.g. its own
   `documentation_url` field). Where: the three composables' 403 message
   construction. Why: treating server response data as a link target risks
   pointing the user at an attacker-controlled URL if the proxy or the upstream
   response is ever tampered with (open-redirect / phishing vector).

3. **Neutralize invisible/bidi control characters in the echoed GitHub text.**
   What: before assigning GitHub's `message` text to the ref shown in the UI, strip
   Unicode bidirectional-override and other non-printing control characters. This
   is in addition to relying on Vue's default text-interpolation escaping (never
   `v-html`) which business-specifications.md rule 2 already requires. Where: the
   point in each composable where the extracted message text is stored for
   display. Why: verbatim external text can visually reorder or hide what the user
   reads (a "Trojan Source"-style spoofing attack) even when script injection is
   already blocked by escaping.

status: ready
