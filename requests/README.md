# Manual request collection

`.http` files for exercising the GitHub OAuth proxy functions locally with the VS Code "REST Client" extension (`humao.rest-client`).

Prerequisite for all of them: `netlify dev`
running locally with `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` set.

## Files, in the order you'd normally use them

1. `github-auth-start.http` — F-1. Hits `/github-auth-start`; inspect the `Location` header
   (GitHub's authorize URL, with `state`) and the `Set-Cookie: gh_oauth_state=...` header.
2. `github-auth-callback.http` — F-2/F-3, A-9. Simulates GitHub's redirect back with `code`
   and `state`. See "Why F-2 can't really be run from here" below.
3. `github-api-proxy.http` — F-4/F-5. Reads/writes a file through the Contents API proxy,
   authenticated with the `gh_token` cookie obtained from a successful callback.
4. `github-auth-logout.http` — F-7. Clears the `gh_token` cookie.

## Why F-2 (the real success path) can't really be run from here

The callback function's `redirect_uri` is hardcoded to
`http://localhost:8888/.netlify/functions/github-auth-callback`. When you open the `Location` URL from step 1 and authorize the app, GitHub 302-redirects the browser _directly to that URL_ — and since `netlify dev` is listening there, the browser auto-completes the real callback itself before you can copy `code` out of the address bar.

The code is single-use, so by the time you paste it into `github-auth-callback.http`, GitHub has already rejected it as consumed.

In practice, that browser-driven request **is** the real F-2 test — open DevTools → Network tab before authorizing, and check the `302` to `/settings?auth=success` plus the `Set-Cookie: gh_token=...` header on the callback request. The `.http` file can't race it.

`github-auth-callback.http` is still useful as-is for the cases that don't need a real, unconsumed code:

- F-3: GitHub-side error (`error=access_denied`) — no code involved.
- A-9: mismatched `state` — rejected before the code is ever used.

### Workaround if you want to fire F-2 through REST Client anyway

Temporarily change the GitHub OAuth App's "Authorization callback URL" (in the app's GitHub settings) to something that won't auto-execute, e.g. a dead port or `https://httpbin.org/get`. Authorizing then lands the browser on that dead end instead of the local function, so you can copy `code`/`state` out of the URL before anything consumes them. Paste both into `github-auth-callback.http` and fire the request within GitHub's ~10-minute code expiry window. Revert the callback URL setting afterward.

## Getting a `gh_token` for `github-api-proxy.http`

Either complete the real flow through the app (log in via the UI, then copy `gh_token` from DevTools → Application → Cookies), or use whatever value the browser-driven callback set for you per the note above.
