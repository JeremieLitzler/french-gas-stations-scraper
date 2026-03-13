# ADR-006: Use Netlify Functions as Backend Proxy for CORS-Free HTML Fetching

**Date:** 2026-02-13
**Status:** Accepted
**Implemented:** 2026-02-18

**Related:** [Task-009](../prompts/tasks/task-009-backend-proxy-for-cors.md)

## Context

The Vue SPA cannot fetch HTML from blog URLs due to browser CORS restrictions. As documented in Task-009:

> "A pure client-side SPA **won't work** for fetching HTML from your blog URLs due to CORS restrictions. Browsers block cross-origin requests unless the target server (your blog) explicitly allows it with CORS headers."

We don't control CORS headers on `iamjeremie.me` or `jeremielitzler.fr`, making client-side fetching impossible.

## Decision

**Add Netlify Functions as a backend proxy** to fetch HTML server-side, bypassing CORS entirely.

### High-Level Architecture

From Task-009:

```mermaid
sequenceDiagram
    participant Browser
    participant API as Backend API<br/>(Serverless Function)
    participant BlogServer as Blog Server<br/>(iamjeremie.me)

    Browser->>API: fetch('/.netlify/functions/fetch-article?url=...')
    Note over Browser,API: ✅ Same origin - No CORS
    API->>BlogServer: Server-to-server fetch
    Note over API,BlogServer: ✅ No CORS restrictions
    BlogServer-->>API: HTML response
    API-->>Browser: HTML response (proxied)
```

**Key points:**

- Function endpoint: `/.netlify/functions/fetch-article?url=<encoded-url>`
- Domain whitelist: `['iamjeremie.me', 'jeremielitzler.fr']`
- Response format: `{ success: true, html: "..." }`

See [Task-009](../prompts/tasks/task-009-backend-proxy-for-cors.md) for complete implementation details.

## Rationale

1. **Same Repository**: Functions live alongside SPA, single deployment
2. **Same Origin**: No CORS between SPA and functions (both on `*.netlify.app`)
3. **Zero Infrastructure**: Serverless, auto-scales, free tier sufficient (125k requests/month)
4. **TypeScript End-to-End**: Functions use same TS tooling as SPA
5. **Simple Development**: `netlify dev` runs both SPA and functions locally

## Consequences

### Positive

- ✅ Solves CORS completely (server-to-server has no restrictions)
- ✅ Zero infrastructure cost on free tier
- ✅ Single deployment (push → auto-deploy both)
- ✅ Security via domain whitelist validation
- ✅ TypeScript support built-in

### Negative

- ⚠️ Platform lock-in to Netlify (but migration path exists)
- ⚠️ Cold starts ~100-500ms on first request after idle
- ⚠️ Free tier limited to 125k requests/month (acceptable for MVP)

## Alternatives Considered

From Task-009, these alternatives were evaluated and rejected:

1. **CORS Proxy Service** - Rejected: Privacy concerns, reliability, not production-ready
2. **Express Backend** - Rejected: Unnecessarily complex, requires hosting/costs
3. **Browser Extension** - Rejected: Changes product nature, limited audience
4. **Electron Desktop App** - Rejected: Complete architecture pivot

See [Task-009 § Alternatives](../prompts/tasks/task-009-backend-proxy-for-cors.md#alternative-express-backend-same-repo-monorepo) for detailed analysis.

## Implementation

Refer to [Task-009 § Implementation Tasks](../prompts/tasks/task-009-backend-proxy-for-cors.md#implementation-tasks) for:

- Complete function code example
- SPA integration changes
- Security implementation
- Testing strategy
- Deployment process

**Estimated effort:** 3-5 hours

## Acceptance Criteria

- [x] User can fetch HTML from blog URLs without CORS errors
- [x] Only whitelisted domains allowed
- [x] All existing tests pass
- [x] Works locally with `netlify dev`
- [ ] Works in production deployment (requires deployment)

## References

- [Task-009: Backend Proxy for CORS](../prompts/tasks/task-009-backend-proxy-for-cors.md)
- [Netlify Functions Documentation](https://docs.netlify.com/functions/overview/)
- [CORS on MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
