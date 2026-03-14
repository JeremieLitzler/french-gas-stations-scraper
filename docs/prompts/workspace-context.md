# Workspace Context

## Current Phase

Issue-driven pipeline — pick next GitHub issue and run the multi-agent pipeline

## Completed

- [x] TR-1: Codebase cleanup (remove unused boilerplate dependencies)

## Up Next

Go find an issue in the repository's issues on GitHub using GitHub CLI. Report to human if CLI isn't logged in.

## Open Decisions

- None currently

## Recent ADRs

See [ADR Index](../decisions/README.md)

## Known Spec Gaps

- None currently

## Notes for Claude Code

- Backend proxy: HTML fetching goes via Netlify Function (`/.netlify/functions/fetch-page`), not direct client-side fetch — see ADR-006
- Allowed domain: `www.prix-carburants.gouv.fr` only
- Station data returned as JSON: `{ stationName, fuels: [{ type, price }] }`
- Station list persisted in IndexedDB as `{ name, url }` objects — see ADR-008
