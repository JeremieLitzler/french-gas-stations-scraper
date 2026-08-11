Write the business specifications for a feature. Task folder: $ARGUMENTS

`$ARGUMENTS` is the task folder, given as a `@`-mention relative to the worktree root you
opened (e.g. `@docs/prompts/tasks/issue-<id>-<slug>`). If it is empty, stop and reply:

> Usage: `/jli-writes-spec @<task-folder>` — open the feature worktree (`code <worktree>`) first,
> then pass the task folder relative to it.

Run from the worktree root (your current directory). All paths below are relative to it; read
and write only inside this worktree.

## Sub-issue task folders and the "review specs" loop-back

The task folder given may be a `sub-issue-<n>` subfolder. If so, the request `README.md` and
the shared `business-specifications.md` you write live in the **parent** folder, not the
subfolder.

When re-run as a `status: review specs` loop-back from `/jli-codes`, read the feedback first:
it is the `### Specifications Need Review` section of `technical-specifications.md` — a sibling
file in a flat task folder, or **inside the sub-issue subfolder** you were given. Amend the
shared `business-specifications.md` accordingly; because it is shared, keep the change minimal
and tell the user it affects every sub-issue of the parent. (Rationale in
`AGENT-COMMAND-MIGRATION.md`.)

## What this command does

Read the feature request in the task folder's `README.md` (for a sub-issue subfolder, in its
parent). On a first run this is the only input; on a `review specs` loop-back also read the
feedback described above. Using the project context in `CLAUDE.md` and the project `README.md`,
write the business spec to `business-specifications.md` — in the task folder, or its parent for
a sub-issue subfolder.

The spec describes WHAT the system does — goals, rules, constraints, observable outcomes —
never HOW. Use the Example Mapping method.

The spec must include:
- Goal and scope of the change
- Files to create or modify, and each file's role (without prescribing internal structure)
- Edge cases described as user-visible / externally observable consequences
- Concurrency or performance requirements stated as qualities of the outcome, not as
  implementation blueprints

Do NOT include: function signatures, method/parameter names, pseudocode or code snippets,
exact variable/field names, import lists, or any other implementation detail.

### Conciseness rules (strictly enforced)
- At most 1 example per rule; omit the example if the rule is self-evident.
- Integrate edge cases into the rule they qualify — no standalone Edge Cases section.
- Do not repeat CLAUDE.md, existing ADRs, or the README; reference them by name.
- Target 60 lines maximum. Cut rules that only restate decisions already in CLAUDE.md/ADRs.

Ask up to 10 clarifying questions about architecture, edge cases, and dependencies if
needed. DO NOT GUESS.

## ADR requirement

If the spec introduces a new architectural pattern not yet documented in `docs/decisions/`,
add this section before the final status line:

```
### ADR Required

[Description of the new architectural pattern and why it is needed]
```

(AWS definition of an ADR: a short structured document capturing a significant, high-impact
architectural choice with its context, rationale, and consequences. In doubt, ask the user.)

## Output contract

Create or update `business-specifications.md` in the task folder (its parent for a sub-issue
subfolder). End it with `status: ready` as the last line. Do NOT use horizontal rules (`---`)
anywhere in the file. Write each prose paragraph as a single unwrapped line — no manual line
breaks mid-paragraph; let the renderer soft-wrap. Only break lines for actual markdown
structure (headings, list items, code fences).

## Shell command retry limit

Do not run more than 3 failing shell commands in total. After 3 failures, stop and report
the full error output to the user.

## Next

Show the user a short summary of the spec, then:

- If the file contains `### ADR Required`:
  > ⚠ This spec requires a new ADR. Review and approve the ADR before continuing. Once
  > approved (add it under `docs/decisions/` and update `docs/decisions/README.md`), run
  > `/jli-commits @<task-folder>`.
- Otherwise:
  > Spec ready. Review `business-specifications.md` in the task folder, then run
  > `/jli-commits @<task-folder>`, then (optionally `/clear` and) `/jli-verifies-security @<task-folder>`.
