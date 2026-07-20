Worktree: E:/Git/GitHub/french-gas-stations-scraper_fix-rtk-lint-fails-eslint

# fix(pipeline): rtk lint fails to find eslint during /jli-reviews-code

## Problem
During `/jli-reviews-code`, the mandated `rtk lint` command (per `.claude/commands/jli-reviews-code.md`) fails:

    Error: Failed to run eslint. Is it installed? Try: pip install eslint (or npm/pnpm for JS linters)
    Caused by:
        program not found

`eslint` is a local devDependency and `npm run lint` (`eslint . --fix`) runs correctly and finds real errors. This means `rtk` isn't resolving the project's local eslint binary in this worktree, so lint results reported by the review pipeline are silently missing/wrong until a manual fallback to `npm run lint` is used.

## Repro
    cd <worktree>
    rtk lint
    # -> "program not found"
    npm run lint
    # -> works, reports real lint errors

## Expected
`rtk lint` should resolve and run the project's local `eslint` (via `node_modules/.bin` or `npx`), consistent with the rest of the pipeline's reliance on it.

## Impact
`/jli-reviews-code` review-results.md can under-report lint issues if the fallback isn't performed manually.
