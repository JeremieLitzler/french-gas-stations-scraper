# Security Guidelines: Bump Vitest and Vitest UI to v4.1.2

1. **What:** Install `vitest@4.1.2` and `@vitest/ui@4.1.2` only via the resolved
   `package-lock.json` (`npm ci`/`npm install` from the lockfile), not by hand-editing
   version ranges without regenerating the lock. **Where:** `package.json`,
   `package-lock.json`. **Why:** an unlocked or manually-typed version range can silently
   resolve to a tampered or unintended package on next install (supply-chain risk).

2. **What:** Confirm the resolved `vitest`/`@vitest/ui` tarballs originate from the official
   npm registry and match the published `4.1.2` release (no unexpected transitive package
   additions/removals beyond what the bump requires). **Where:** `package-lock.json` diff.
   **Why:** a compromised or typosquatted transitive dependency introduced during the bump
   could execute arbitrary code at install or test-run time.

3. **What:** `@vitest/ui` remains a devDependency only, never bundled into or exposed by the
   production build/Netlify function output. **Where:** `package.json` (`devDependencies`),
   build output. **Why:** the Vitest UI dev server has no authentication and must never be
   reachable outside local development.

status: ready
