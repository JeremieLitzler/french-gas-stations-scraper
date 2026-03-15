# Security Guidelines — Issue #16
## Parse Station HTML and Return Structured JSON

1. **Do not expose raw HTML in any response**
   - **Where:** `netlify/functions/fetch-page.ts`
   - **Why:** Returning raw HTML to the client widens the XSS attack surface if the client ever renders it with `v-html` or `innerHTML`. The function must only return structured JSON. The `html` field must be removed from all response shapes.

2. **Enforce the domain allowlist before any fetch occurs**
   - **Where:** `netlify/functions/fetch-page.ts`
   - **Why:** Without domain restriction, an attacker could supply any URL to the function and use it as a server-side request forgery (SSRF) proxy to reach internal services or arbitrary external hosts. The existing allowlist (`www.prix-carburants.gouv.fr`) must remain the first check applied after URL validation.

3. **Sanitise text content extracted from HTML before including it in the JSON response**
   - **Where:** `src/utils/stationHtmlParser.ts`
   - **Why:** The fetched HTML is controlled by an external server. Text nodes may contain embedded HTML entities or control characters. All extracted strings (station name, fuel type labels) must be trimmed plain-text values — not raw `innerHTML` — so that any embedded markup is never forwarded to the client as executable content.

4. **Parse prices as numbers with explicit validation; reject non-numeric values as null**
   - **Where:** `src/utils/stationHtmlParser.ts`
   - **Why:** If a price cell contains a crafted string (e.g. a script tag, an excessively long number, or a Unicode trick), treating it as a trusted number without validation could cause unexpected behaviour in the client. Always parse with `parseFloat` and verify the result passes `isFinite` before accepting it; otherwise return `null`.

5. **Use `DOMParser` (or an equivalent server-side DOM parser) with no script execution**
   - **Where:** `src/utils/stationHtmlParser.ts`
   - **Why:** Parsing untrusted HTML must not trigger script execution. When running in a Netlify Function (Node.js environment), use a DOM parser that does not execute JavaScript embedded in the HTML. No dynamic `eval`, `new Function`, or script injection paths must exist in the parsing utility.

6. **Do not forward upstream HTTP error details verbatim to the client**
   - **Where:** `netlify/functions/fetch-page.ts`
   - **Why:** Forwarding raw upstream error messages (e.g. status text from the government server) may leak internal infrastructure details. Error messages included in the JSON response must be static, enumerated strings (e.g. `"fetch_failed"`, `"selector_not_found"`) rather than dynamic upstream content.

7. **Limit response size before parsing**
   - **Where:** `netlify/functions/fetch-page.ts`
   - **Why:** A malicious or misbehaving upstream server could send an extremely large HTML body, causing excessive memory use or denial-of-service in the serverless function. The fetched HTML body must be bounded before being passed to the parser. If the response body exceeds a reasonable limit, the function must return an error rather than attempting to parse it.

8. **Never include user-supplied input in error messages returned to the client**
   - **Where:** `netlify/functions/fetch-page.ts`
   - **Why:** Reflecting the user-supplied URL or query parameters in error messages enables reflected XSS if the client ever renders these strings as HTML. Error responses must use static strings only.

9. **Keep the Content-Type response header set to `application/json`**
   - **Where:** `netlify/functions/fetch-page.ts`
   - **Why:** Without an explicit `Content-Type: application/json` header, some browsers may sniff the response type and attempt to interpret it differently, which can open MIME-sniffing attack vectors. All responses from the function must declare their content type explicitly.

status: ready
