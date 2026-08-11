# Review Results: Discontinue `release.yml`

**Issue:** #148

lint: pre-existing failures only, in `src/composables/usePreferencesExport.spec.ts` and `usePreferencesImport.spec.ts` — both untouched by this commit (confirmed via `git show --stat`); not introduced by this change.
type-check: clean

No Vue/TypeScript source files were changed by this task (it is a CI/config/docs cleanup — `.github/workflows/`, `.releaserc`, `package.json`, ADRs), so Object Calisthenics and the Vue/TS reactivity checklist items do not apply; skipped rather than force-fit.

All other checklist items ✓ — every business-spec rule (1-10) and every security-guideline rule (1-4) is verifiably satisfied in the diff: `release.yml`/`.releaserc`/`tag-release.sh` removed, the five `semantic-release` devDependencies removed with a regenerated lockfile, `npm audit signatures` preserved in `pr-build.yml`, `tibdex/github-app-token` fully gone, `release-bash.yml`'s triggers/permissions/secrets unchanged (comment-only edit), and ADR-004/ADR-015/the ADR index updated consistently.

status: approved
