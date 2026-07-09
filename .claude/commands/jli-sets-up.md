Bootstrap a worktree and task folder for a GitHub issue: $ARGUMENTS

`$ARGUMENTS` must contain the GitHub issue number (and optionally a title or extra
context). If it is empty, stop and reply:

> Usage: `/jli-sets-up <issue-number> [title or notes]` — I need an issue number to
> create the branch and task folder.

## What this command does

This is the first step of the manual feature chain. It creates the isolated worktree and
the task folder that every later `jli-` command reads from. Run it from the `develop/`
worktree (the session's working directory).

### Step 1 — Identify the issue

- Parse the issue number from `$ARGUMENTS`.
- Fetch the issue with `rtk gh issue view <number>` to get its title and body.
- Build:
  - `slug` = a short (≤ 30 chars) kebab-case summary of the issue title (e.g.
    `back-button-fix`). Do NOT use the full title — long slugs cause path-length failures
    on Windows.
  - `type` = the conventional-commit type implied by the issue label or nature (`feat`,
    `fix`, `docs`, `refactor`, …).

### Step 2 — Fetch origin and create the worktree

Prefer the pipeline scripts over raw git. Run from `develop/`:

```bash
bash scripts/pipeline/fetch-origin.sh
bash scripts/pipeline/worktree-create.sh <type> <slug>
```

`worktree-create.sh` creates the worktree folder `<repo-name>_<type>-<slug>` (a sibling of
the bare repo) on branch `<type>/<slug>` from `origin/develop`, installs npm deps, and prints
`Worktree: <absolute-path>`. Capture that absolute path as `[worktree]`.

### Step 3 — Create the task folder and README

- `task-folder` = `[worktree]/docs/prompts/tasks/issue-<id>-<slug>/`
- The relative form (used by every later command) is `docs/prompts/tasks/issue-<id>-<slug>`.
- Write `[task-folder]/README.md` containing:
  - A first line: `Worktree: [worktree]` (so the path is recorded for reference).
  - The issue title and the full issue body fetched in Step 1, plus any extra notes the
    user passed in `$ARGUMENTS`. This is the feature request the spec phase will read.

Do NOT create the task folder before the worktree path is confirmed.

## Commit rules reference (used by every git step in this chain)

- Changes to `.claude/deprecated-agents`, `CLAUDE.md`, or `.claude/settings.local.json` → `ci(agent): …`
- Changes to `.claude/commands/jli-*.md` → `ci(commands): …`
- Changes under `docs/` → `docs: …` (pipeline artifacts use the scoped types below)
- Changes under `.github/workflows` → `ci: …`
- Everything else follows conventional commits: `feat`, `fix`, `docs`, `style`, `refactor`,
  `test`, `chore`, `perf`, `ci`. Subject: imperative, lowercase, no period, ≤72 chars.

This command does not commit anything itself.

## Shell command retry limit

Do not run more than 3 failing shell commands in total. After 3 failures, stop and report
the full error output to the user.

## Next

Report the absolute worktree path and the relative task-folder path, then show:

> Worktree and task folder ready.
> Worktree: `[worktree]`
> Task folder (relative): `docs/prompts/tasks/issue-<id>-<slug>`
>
> Next: open the worktree in its own editor window so the rest of the chain runs in its
> context:
>
> ```
> code [worktree]
> ```
>
> Then, from that window, run `/jli-writes-spec @docs/prompts/tasks/issue-<id>-<slug>`. Every later
> command takes the task folder as a `@`-mention relative to the worktree root — you never
> need the absolute path again. The final cleanup command is the exception: it runs back in
> this `develop` window.
