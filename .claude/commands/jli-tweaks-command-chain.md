Tweak the manual `jli-` command chain: $ARGUMENTS

`$ARGUMENTS` is the change you want made to the chain (e.g. "add an accessibility-audit step
after review", "soften the ADR warning in jli-writes-spec", "make jli-runs-tests also print
coverage"). If it is empty, stop and ask what to change.

This command specializes in editing **only the chain itself**. It does not develop features,
run the chain, or touch the deprecated pipeline.

## Scope — what this command may read and edit

- `.claude/commands/jli-*.md` — the chain command files
- `AGENT-COMMAND-MIGRATION.md` — the chain's source-of-truth doc (mapping table, chain
  diagram, state model) at the project root

It must NOT edit: source code, test files, anything under `docs/prompts/`, the deprecated
agents under `.claude/deprecated-agents/`, `CLAUDE.md`, or `.claude/commands/fix-pipeline.md`.
Issues with the deprecated agents or `CLAUDE*.md` go through `/fix-pipeline` instead.

## Workflow

### Step 1 — Understand the change

Read `AGENT-COMMAND-MIGRATION.md` first (it defines the canonical chain order and mapping),
then read the `jli-*.md` files the change touches.

### Step 2 — Identify every file that must change (cascading effects)

Chain edits rarely touch one file. Consider:
- A change to one command's **Next** hint usually requires the matching hint in the
  *previous* command (so the chain stays linked in both directions).
- Adding, removing, or reordering a step requires updating the **chain diagram** and the
  **command ↔ agent mapping table** in `AGENT-COMMAND-MIGRATION.md`, plus the surrounding
  commands' hints.
- A change to an artifact's status-line contract (`status: ready` / `approved` / `passed` /
  `changes requested` / `failed` / `review specs`) must stay consistent between the command
  that writes it and the command whose loop-back reads it.

List every affected file before editing.

### Step 3 — Apply minimal edits, preserving the chain invariants

Apply the smallest change that satisfies the request. After editing, every `jli-*.md`
command must still hold ALL of these invariants:

1. **Self-contained** — no reference to any `agent-*.md` file and **no orchestrator
   vocabulary** ("orchestrator", "the orchestrator passes", "notify/report to the
   orchestrator"). The chain and the deprecated pipeline must share no text.
2. **Argument guard** — opens by requiring its argument and printing a usage line when empty.
   The argument is the task folder as a `@`-mention relative to the worktree
   (`@docs/prompts/tasks/issue-<id>-<slug>`) for the phase/commit/ship commands;
   `jli-sets-up` takes an issue number; `jli-cleans` takes a worktree name/path.
3. **Run location** — phase/commit/ship commands run from inside the feature worktree and
   treat the task-folder argument as relative to it (no path derivation). `jli-sets-up`
   and `jli-cleans` run from the `develop` worktree.
4. **Status-line contract** — any artifact it writes still ends with its required status line
   as the last line.
5. **Next hint** — ends with a hint block covering the happy-path successor and any
   conditional loop-back, matching the chain diagram in `AGENT-COMMAND-MIGRATION.md`.

If you find gaps beyond the requested change, list them in your report but do not fix them
without explicit instruction.

### Step 4 — Verify

- Re-read each edited command and confirm the five invariants above.
- Confirm no edited `jli-*.md` contains the string "orchestrat" (any case).
- Confirm the chain diagram and mapping table in `AGENT-COMMAND-MIGRATION.md` match the
  commands' actual hints.

### Step 5 — Report and commit guidance

Summarize every file changed (path + one-line what + one-line why), suitable as a commit
body. These are `.claude/` orchestration files plus a root doc, so use a single conventional
commit with scope `commands`:

```
ci(commands): <imperative summary of the tweak>
```

Commit only when the user asks; if you commit, do it on a `ci/<slug>` branch per Git Flow,
never directly on `develop`/`main`.

## Shell command retry limit

Do not run more than 3 failing shell commands in total. After 3 failures, stop and report
the full error output to the user.
