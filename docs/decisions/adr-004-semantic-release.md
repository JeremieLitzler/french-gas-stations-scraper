# ADR-004: Semantic Release for Versioning

**Date:** 2026-02-11
**Status:** Accepted (Pre-existing)

## Context

The project needs a versioning strategy to track changes over time.
The boilerplate template came with semantic-release pre-configured
with conventional commits.

## Decision

Use semantic-release with conventional commits for automated versioning
and changelog generation.

Installed packages:

- `semantic-release` — core release automation
- `@semantic-release/changelog` — generates CHANGELOG.md
- `@semantic-release/git` — commits version bump back to repo
- `conventional-changelog-conventionalcommits` — commit convention parser
- `conventional-changelog-eslint` — ESLint-style commit support

## Consequences

### Positive

- Automated version bumps based on commit messages
- Auto-generated CHANGELOG.md
- No manual versioning decisions needed
- Encourages disciplined commit messages

### Negative

- Requires consistent use of conventional commit format
- Adds CI/CD dependency to work fully (manual release possible but awkward)

## Alternatives Considered

- **Manual versioning**: Simple but error-prone and easy to forget
- **standard-version**: Deprecated in favor of semantic-release

## Notes

- Commit format: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:` etc.
- Breaking changes: `feat!:` or `BREAKING CHANGE:` in commit footer
- Changelog lives at `CHANGELOG.md` in project root
