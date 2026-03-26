Run the gitingest script to generate `digest.txt` at the worktree root.

```bash
cd [worktree] && bash scripts/pipeline/gitingest.sh [worktree]
```

`digest.txt` is excluded by `.gitignore` — do **not** stage or commit it.

Report back when done: `digest.txt written at [worktree]/digest.txt`.
