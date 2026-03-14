# Agent Model Preference

This document records the model assigned to each pipeline agent, the rationale for lower-cost model choices, and the criteria for future reassignment.

## Model Assignments

| Agent | File | Model | Reasoning demand |
|---|---|---|---|
| agent-0-orchestrator | `.claude/agents/agent-0-orchestrator.md` | sonnet | Routes between agents, checks status lines, applies retry logic — mostly procedural, but produces human-facing summaries and evaluates whether a bug implies a spec change, both of which require judgment. |
| agent-1-specs | `.claude/agents/agent-1-specs.md` | sonnet | Produces business specifications using Example Mapping, identifies ADR-worthy patterns, and must ask clarifying questions rather than guess — requires deep understanding of intent and context. |
| agent-2-coder | `.claude/agents/agent-2-coder.md` | sonnet | Implements source code only, applies all nine Object Calisthenics rules, performs a self-code review, and documents non-trivial technical decisions — requires strong reasoning about code quality and architecture. |
| agent-3-test-writer | `.claude/agents/agent-3-test-writer.md` | sonnet | Runs twice: before coding to derive test scenarios from specs and write `test-cases.md`; after coding to translate those scenarios into `.spec.ts` files using the now-known implementation structure — requires interpreting specs and reasoning about observable behaviour independently of the coder. |
| agent-3-test-runner | `.claude/agents/agent-3-test-runner.md` | haiku | Runs `npm run test` against `.spec.ts` files written by agent-3-test-writer and records structured pass/fail output — purely mechanical. |
| agent-4-git | `.claude/agents/agent-4-git.md` | haiku | Executes a fixed sequence of git and GitHub CLI commands (fetch, branch, commit, push, PR, merge, cleanup) following explicit task numbers — no creative or analytical reasoning required. |
| agent-5-security | `.claude/agents/agent-5-security.md` | sonnet | Performs threat analysis across input validation, XSS surfaces, Netlify Function boundaries, CORS, secrets handling, and dependency risks — requires domain knowledge and nuanced judgment. |
| agent-6-reviewer | `.claude/agents/agent-6-reviewer.md` | sonnet | Cross-references implementation against business specs and security guidelines, runs lint and type-check, detects Vue reactivity pitfalls and TypeScript type-safety issues, and fetches reference documentation — requires broad technical judgment. |
| agent-7-pipeline-maintainer | `.claude/agents/agent-7-pipeline-maintainer.md` | sonnet | Diagnoses pipeline issues, identifies cascading effects across multiple agent files, and applies minimal targeted edits — requires careful reasoning about agent interdependencies. |

## TDD split: agent-3-test-writer and agent-3-test-runner

The original `agent-3-tester` bundled two jobs with different reasoning demands. They are now split:

**agent-3-test-writer (Sonnet)** runs twice:

**First pass — before coding:** reads `business-specifications.md` and `security-guidelines.md` and writes `test-cases.md` — plain-language scenarios covering the happy path, edge cases, and error conditions. It does not write `.spec.ts` files at this stage because the code does not exist yet: function names, file paths, and composable APIs are all coder decisions. Scenarios are written against observable behaviour described in the spec, not against any implementation.

**Second pass — after coding:** reads `test-cases.md` and the implementation files the coder just produced, then translates each scenario into a `.spec.ts` test. File paths and function signatures are now known, so imports are valid. The test code is written by an agent that did not write the implementation — it cannot be biased toward covering only what was built.

Writing good test scenarios and translating them faithfully into test code both require interpreting specs and reasoning about observable behaviour. Haiku would produce shallow scenarios and miss edge cases the spec only implies.

**agent-3-test-runner (Haiku)** runs after the test-writer's second pass. It executes `npm run test` from the worktree root and records the output in `test-results.md` with a `status: passed` or `status: failed` line. There is no reasoning involved — just command execution and output formatting.

The coder is responsible for implementation only. The pipeline order becomes:

```
Specs → Security → Test Writer (pass 1) → Coder → Test Writer (pass 2) → Reviewer → Test Runner → Git
```

The key discipline: test scenarios are defined before coding by an agent that has not seen the implementation, and test code is written after coding by the same independent agent — never by the coder itself.

## Why agent-0-orchestrator Uses Sonnet (and when it could drop to Haiku)

On the happy path the orchestrator is almost entirely procedural: it reads a status line, branches on its value, increments a retry counter, and spawns the next subagent with a templated prompt. That is Haiku-level work.

Two tasks keep it on Sonnet:

**Human approval summaries.** Before each approval gate the orchestrator must distill a full spec or technical document into a meaningful summary for the human. A poor summary leads to a bad approval decision with no error signal — the human approves something they would have rejected if shown an accurate picture. This is silent quality degradation, the hardest failure mode to detect.

**Bug triage.** The bug feedback loop requires answering "does this bug imply a spec change?" That is not a string match — it requires reading a bug description and reasoning about whether the root cause is a requirements gap or an implementation error. Getting this wrong routes the fix through the wrong agents and wastes pipeline runs.

**Condition for dropping to Haiku:** if approval summaries are removed from the orchestrator and delegated to the specialist agents (e.g. the specs agent writes a one-paragraph summary at the end of `business-specifications.md` that the orchestrator forwards verbatim), and bug triage is similarly delegated to a dedicated step, the orchestrator becomes fully procedural and Haiku would be justified.

## Why agent-4-git Uses Haiku

**agent-4-git** executes an explicitly numbered task list of shell and GitHub CLI commands. Each task specifies exactly what to run (e.g., `git fetch origin`, `git worktree add`, `gh pr create`, `gh pr merge --rebase --delete-branch`). The agent reads a fixed set of files for commit message content and applies conventional commit formatting. There is no branching logic, no judgment call, and no creative output. The work is wholly procedural and is a natural fit for a smaller, faster model.

## Criteria for Reassigning a Model

**Reassign up (Haiku to Sonnet) when:**

- The agent begins producing incorrect or incomplete output that correlates with reasoning complexity (e.g., agent-3-test-runner misreads the output format, or agent-4-git misreads commit scope from a large technical spec).
- The agent's task scope expands — for example, if agent-3-test-runner is asked to evaluate coverage quality or write test code rather than just run and report.
- A new instruction requires the agent to make a judgment call rather than follow a fixed procedure.

**Reassign down (Sonnet to Haiku) when:**

- An agent's task is refactored to become fully procedural with explicit, unambiguous steps and no judgment required.
- Observed output quality for a Sonnet agent is consistently identical to what Haiku produces on the same prompts over multiple pipeline runs.

**Do not reassign based on cost alone.** Model selection must reflect task demand. A wrong model choice in a reasoning-heavy agent (specs, security, reviewer) will produce silent quality degradation that is harder to detect than a failed shell command.

## Available models

When updating a `model:` field in any agent frontmatter, use one of the following Anthropic model IDs. Always verify the current list at https://docs.anthropic.com/en/docs/about-claude/models/overview before changing a value — model IDs change with each release.

| Alias | Model ID | Notes |
|---|---|---|
| Opus 4.6 | `claude-opus-4-6` | Highest capability, highest cost — reserve for tasks that sonnet cannot handle reliably |
| Sonnet 4.6 | `claude-sonnet-4-6` | Default for reasoning-heavy agents |
| Haiku 4.5 | `claude-haiku-4-5-20251001` | Default for mechanical/procedural agents |

The YAML `model:` field in `.claude/agents/` files must be the full model ID (e.g. `claude-sonnet-4-6`), not a short alias.