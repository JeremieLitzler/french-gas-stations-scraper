Review and amend a feature's spec-phase artifacts from PR feedback: $ARGUMENTS

`$ARGUMENTS` is the number of the PR that shipped the spec phase (e.g. `87`). It may also
carry extra notes. Do not hard-stop when it is empty — instead resolve the PR interactively:

- If `$ARGUMENTS` has no PR number, ask:
  > Which PR carries the spec feedback? Reply with its number
  > (usage: `/jli-reviews-specs <pr-number>`). If there is **no PR**, paste your
  > feedback / amendments here in chat and I will apply them directly.
- If the user says there is no PR, take their chat feedback as the review input and skip
  Step 1's PR read and Step 3's PR read; everything else proceeds the same.

## What this command does

The spec phase produced several artifacts: the business specification
(`business-specifications.md`), the security specification (`security-guidelines.md`), the
test specification (`test-cases.md`), and — when the feature warranted one — one or more ADRs
under `docs/decisions/`. This command gathers the human review feedback left on the spec PR
(or given in chat when there is no PR) and reviews **all four artifact kinds together**:
business specs, security specs, test specs, and ADR(s). Its job is not only to fold in the
feedback but to **ensure they stay coherent with one another** — every rule changed in the
business spec must be reflected in the test cases and security guidelines, and must not
contradict the ADR(s) (and vice-versa). It records the result as a review artifact and routes
back to `/jli-writes-spec` so the spec is amended by its single owner command.

Run this from the **feature worktree** — the sibling of the develop worktree you opened for
this feature — exactly like the other phase commands. All task-folder paths are relative to
it. If that worktree was cleaned up after the spec PR merged, Step 2 recreates it first.

### Step 1 — Resolve the PR, branch, and task folder

If you are already inside the feature worktree, the branch and task folder are the current
ones; you only need the PR for its feedback. Read the PR metadata (skip on the no-PR path):

```bash
rtk gh pr view <pr-number> --json headRefName,title,body,url,state
```

- `branch` = the PR's `headRefName` (e.g. `feat/github-repo-preferences`). It is `<type>/<slug>`.
- `slug` = the branch text after the first `/`.
- `id` = the issue number the PR closes — read it from the body (`Closes #<id>`) or from
  `closingIssuesReferences`. If it cannot be determined, ask the user for the issue number.
- `task-folder` (relative) = `docs/prompts/tasks/issue-<id>-<slug>`.

### Step 2 — Ensure the feature worktree exists

Normally you are already inside it — skip to Step 3. Only if the feature worktree was removed
after the spec PR merged do you need to recreate it. The PR gave you the branch in Step 1, so
you can recreate the sibling worktree folder directly on that existing branch.

The repo uses one bare repo with sibling worktrees under a shared parent folder:

```
<parent>/<repo-name>.git              <- bare repo
<parent>/<repo-name>-develop          <- develop worktree
<parent>/<repo-name>_<type>-<slug>    <- the feature worktree to recreate
```

Recreate it on the PR branch (derive the bare repo from `git worktree list` — its `(bare)`
entry — never assume it is the parent directory), then open it and run this command from
inside it:

```bash
git worktree list                             # the (bare) entry is the bare repo path
BARE="<path printed as (bare) above>"
WT="<parent>/<repo-name>_<type>-<slug>"       # sibling of the bare repo; '/' in slug -> '-'

git -C "$BARE" fetch origin
git -C "$BARE" worktree add "$WT" "<branch>" \
  || git -C "$BARE" worktree add "$WT" --track -b "<branch>" "origin/<branch>"
(cd "$WT" && npm install --silent)
echo "Worktree: $WT"
```

### Step 3 — Collect the feedback

For the PR path, gather all three feedback channels (skip on the no-PR path — use the chat
feedback instead):

```bash
rtk gh pr view <pr-number> --comments                                   # conversation comments
rtk gh api repos/{owner}/{repo}/pulls/<pr-number>/reviews               # review summaries (approve / request changes)
rtk gh api repos/{owner}/{repo}/pulls/<pr-number>/comments             # inline diff comments
```

Summarize the feedback into concrete, actionable amendment requests. Drop resolved/outdated
threads and pure "LGTM" noise.

### Step 4 — Review for coherence and write the review artifact

Read the four artifact kinds in the task folder / `docs/decisions/` and cross-check them
against each other and against the feedback. Then write
`[task-folder]/spec-review.md` containing:

- The PR number and URL (or "source: chat feedback" for the no-PR path).
- A bulleted list of amendment requests, each tagged with the artifact it targets
  (`business-specifications.md`, `security-guidelines.md`, `test-cases.md`, or the specific
  `ADR-xxx`).
- A short **coherence** section listing any contradictions found *between* artifacts (e.g. a
  spec rule with no matching test case, or an ADR decision the security spec contradicts).
- Any open questions the feedback raises for the user.

End the file with a status line as its last line:

- `status: review specs` — amendments are needed (the common case).
- `status: approved` — the feedback requests no changes and the artifacts are coherent.

Do NOT use horizontal rules (`---`) anywhere in the file.

## Commit rules reference

- Changes under `docs/` (the review artifact) → `docs: …`
- This command does not commit anything itself. Run `/jli-commits @<task-folder>` after.

## Shell command retry limit

Do not run more than 3 failing shell commands in total. After 3 failures, stop and report
the full error output to the user.

## Next

Show the user the amendment + coherence summary, then:

- If `spec-review.md` ends with `status: review specs`:
  > Feedback captured in `spec-review.md`. Amend the spec from this worktree by running
  > `/jli-writes-spec @docs/prompts/tasks/issue-<id>-<slug>` to fold in the amendments, then
  > `/jli-commits @docs/prompts/tasks/issue-<id>-<slug>`. (If you had to recreate the worktree
  > in Step 2, run these from inside it via `code [worktree]`.)
- If it ends with `status: approved`:
  > No spec changes requested and the artifacts are coherent. Commit the review note with
  > `/jli-commits @docs/prompts/tasks/issue-<id>-<slug>`, then continue the chain from wherever
  > the feature left off (e.g. `/jli-verifies-security @docs/prompts/tasks/issue-<id>-<slug>`).
