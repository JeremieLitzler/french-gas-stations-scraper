# Workspace Context

## Current Phase

Issue-driven pipeline — pick next GitHub issue and run the multi-agent pipeline

## Completed

- [x] TR-1: Codebase cleanup (remove unused boilerplate dependencies)
- [x] Task-002: Implement `src/types/article.ts`
- [x] Task-003: Implement `src/composables/useArticleState.ts`
- [x] Task-004: Setup Vitest and write tests for `useArticleState.ts`
- [x] Task-005: Add test step to CI workflow
- [x] Task-006: Implement `src/utils/htmlExtractor.ts`
- [x] Task-007: Implement `src/utils/utm.ts`
- [x] Task-008: Article extraction composable + ArticleInput / ManualIntroduction UI
- [x] Task-009: Netlify Functions backend proxy for CORS-free HTML fetching
- [x] Task-010: X (Twitter) content generation
- [x] Task-011: LinkedIn content generation
- [x] Task-012: Medium content generation
- [x] Task-013: Substack content generation

## Up Next

Go find an issue in the repository's issue on GitHub using GitHub CLI. Report to human if CLI isn't logged in.

## Open Decisions

- None currently

## Recent ADRs

See [ADR Index](../decisions/README.md)

## Known Spec Gaps

- None currently

## Notes for Claude Code

- This is a bilingual app (EN/FR blogs) — always consider both languages
- Medium does NOT accept full HTML paste — image must be handled separately
- Substack DOES accept full HTML paste — image included in bodyHtml
- Backend proxy: HTML fetching goes via Netlify Function (`/.netlify/functions/fetch-article`), not direct client-side fetch — see ADR-006
