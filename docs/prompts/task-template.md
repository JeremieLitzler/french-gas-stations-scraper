# Task Prompt Template

Use this template for every Claude Code task to ensure consistency
and give Claude the right context before starting.

## Template

```markdown
## Context

Read before starting:

- `docs/prompts/system-prompt.md`
- `docs/prompts/workspace-context.md`
- [add any specific spec files relevant to this task]

## Task

[One clear sentence describing what needs to be done.]

## Relevant Specs

- [Link to relevant section in specs, e.g. `docs/specs/01-requirements.md` FR-3]
- [Link to relevant ADR if touching a decided area]

## Acceptance Criteria

- [ ] [Specific, testable criterion]
- [ ] [Specific, testable criterion]
- [ ] Types defined or updated in `src/types/article.ts` if needed
- [ ] No new architectural decisions made without a new ADR

## Out of Scope

- [Anything explicitly NOT part of this task, to prevent scope creep]

## After Completion

- [ ] Run tests and verify all pass: `npm run test`
- [ ] Verify test coverage if applicable: `npm run test:coverage`
- [ ] Update `docs/prompts/workspace-context.md` (move task to Completed)
- [ ] Create ADR if any architectural decision was made
- [ ] Update relevant spec file if implementation revealed a gap or change
- [ ] Make the application builds using `source .bashrc && nb`. Fix issues, if any are returned in the build output.
```

## Example: TR-1 Codebase Cleanup

```markdown
## Context

Read before starting:

- `docs/prompts/system-prompt.md`
- `docs/prompts/workspace-context.md`
- `docs/specs/01-requirements.md` (TR-1)
- `docs/decisions/ADR-002-state-management.md`
- `docs/decisions/ADR-003-ui-layer.md`

## Task

Remove all unused boilerplate dependencies and files before
feature development begins.

## Relevant Specs

- `docs/specs/01-requirements.md` TR-1

## Acceptance Criteria

- [ ] `pinia` removed from dependencies and all store files deleted
- [ ] `@tanstack/vue-table` removed from dependencies
- [ ] `@faker-js/faker` removed from dependencies
- [ ] Supabase-related config, components, and types deleted
- [ ] Vue Router reduced to a single route (HomeView)
- [ ] App compiles and runs with no errors after cleanup
- [ ] No new features added in this task

## Out of Scope

- Any new feature implementation
- Changes to existing UI components not related to cleanup

## After Completion

- [ ] Update `docs/prompts/workspace-context.md`
- [ ] Run `npm install` to sync lockfile after dependency removals
```
