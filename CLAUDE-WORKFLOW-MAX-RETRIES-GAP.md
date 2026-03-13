# MAX_RETRIES Gap Analysis

## Problem

`MAX_RETRIES = 3` is defined in `agent-0-orchestrator.md` and controls **step-level retries** — how many times the orchestrator re-spawns a failing agent (e.g. coder → reviewer → tester loop).

It does **not** control what happens inside a single agent session when a shell command fails or hangs. No retry limit was defined at the command level, so agents running `npm run lint`, `npm run type-check`, or `npm run test` could loop indefinitely retrying the same failing command.

## Affected Agents

All agents. The rule is applied universally as a safety guard — even agents that do not currently run shell commands could do so in future tasks.

| Agent                            | Known shell commands                                                                             |
| -------------------------------- | ------------------------------------------------------------------------------------------------ |
| `agent-0-orchestrator.md`        | none (delegates all shell commands to sub agents)                                                |
| `agent-1-specs.md`               | none currently                                                                                   |
| `agent-2-coder.md`               | none currently                                                                                   |
| `agent-3-tester.md`              | `npm run test`                                                                                   |
| `agent-4-git.md`                 | `git fetch`, `git push`, `git worktree`, `git branch`, `git pull`, `gh pr create`, `gh pr merge` |
| `agent-5-security.md`            | none currently                                                                                   |
| `agent-6-reviewer.md`            | `npm run lint`, `npm run type-check`                                                             |
| `agent-7-pipeline-maintainer.md` | none currently, but might in the future                                                          |

## Fix

A **Shell Command Retry Limit** section was added to each affected agent:

> Do not execute more than **3 failing shell commands in total** — whether retrying the same command or trying a different one. After 3 failed executions, record the full error output, write the appropriate failure status to your output file, and stop immediately.

This rule is independent of the orchestrator's `MAX_RETRIES`, which remains in effect at the step level.
