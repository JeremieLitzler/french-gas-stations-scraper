# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A web app that scrapes fuel price data from French government gas station pages (`prix-carburants.gouv.fr`) via a **Netlify serverless function**, then displays prices in a **Vue.js SPA**.

## Critical Rules

1. **Pipeline-first**: When asked to tackle/work on/implement/fix a GitHub issue, always invoke `agent-0-orchestrator`. Never do git operations (branch, checkout, worktree) directly from the main conversation. All code changes go through the pipeline in a worktree.
2. **No hardcoded paths**: Never hardcode absolute paths or worktree-specific paths (e.g. `develop/`, `feat_foo/`) in any `.md` file under `.claude/`. Absolute paths break portability across machines; worktree paths are runtime values passed by the orchestrator, not constants. Always use placeholders (`[worktree]`, `[task-folder]`) or derive paths at runtime.
3. **Spec-first**: Before implementing anything, read the relevant spec files.
4. **ADR-first**: Before making any architectural decision, provide brief context why an ADR is needed before suggesting the full ADR. Once confirmed, create it in `docs/decisions/` and always update the index at `docs/decisions/README.md`.
5. **Type-first**: Define or update types in `src/types/` before implementing logic that uses them.

## Setup

Claude Code must be opened from the `develop/` worktree, not the bare repo root. If you detect the working directory is the bare repo root (i.e. no `src/`, `package.json`, or `.claude/commands/` at the root), warn the user:

> You appear to have opened Claude Code from the bare repo root. Skills and agents may not be discovered correctly. Please restart from the `develop/` directory:
> ```
> cd develop && claude
> ```

## Context to Read

Always read before starting any task:

- `docs/prompts/workspace-context.md` — current phase, completed work, open decisions

Read when relevant:

- ADR in `docs/decisions/` — before touching a decided area

## Architecture

### Data flow

1. **Netlify function** (backend) — receives a station URL, fetches its HTML page, scrapes fuel type/price data, returns JSON.
2. **Vue.js SPA** (frontend) — calls the Netlify function for each station URL stored in IndexedDB, aggregates results into a unified price table.

### Key responsibilities by layer

**Netlify function (`/netlify/functions/`)**

- Accepts a station URL as a query parameter
- Fetches and parses the HTML from `prix-carburants.gouv.fr`
- Returns structured JSON: `{ stationName, fuels: [{ type, price }] }`
- HTML fetching goes through `/.netlify/functions/fetch-page` — do NOT fetch station URLs directly from the browser (see ADR-006)

**Vue.js frontend (`/src/`)**

- Reads station list from IndexedDB on load
- Calls the Netlify function for each station concurrently
- Derives the set of available fuel types from all responses
- Lets the user pick a fuel type; renders a sorted price table for that fuel
- Station management UI: textarea to view URLs, form to add a new `{ name, url }` entry saved to IndexedDB
- Use singleton composable pattern for shared state (see ADR-002)
- No Pinia — it has been removed (see ADR-002)

### Persistence

IndexedDB (client-side only) stores the list of station objects `{ name, url }`. The default seed list is defined in the README.

## Code Conventions

- Vue 3 Composition API with `<script setup lang="ts">` always
- Composables in `src/composables/` prefixed with `use`
- Utility functions in `src/utils/` — pure functions, no Vue dependencies
- **Styling** *(coder agent: write; reviewer agent: enforce)*: always use Tailwind CSS utility classes. Write custom CSS (inline `style` attributes, `<style>` blocks, or `.css` files) only when no Tailwind utility class covers the need — and add a comment explaining why

## Naming Conventions

- Components: PascalCase (`StationTable.vue`)
- Composables: camelCase with `use` prefix (`useStationPrices.ts`)
- Types/Interfaces: PascalCase (`Station`, `FuelPrice`)
- Utils: camelCase (`stationScraper.ts`, `priceFormatter.ts`)
- Constants: UPPER_SNAKE_CASE (`DEFAULT_STATION_LIST`)
- Test files: `*.spec.ts` suffix

## Testing Conventions

- Use Vitest + @vue/test-utils (see ADR-005)
- Co-locate test files next to source files or in `src/__tests__/`
- Naming: `*.spec.ts` for all tests
- Coverage targets:
  - Composables: 100% (critical state management)
  - Utils: 100% (pure functions, easy to test)
  - Components: 80%+ (focus on logic, not styling)
- All tests must pass before merging

### HTML Fixtures

When saving HTML files for test fixtures, always clean them up:
- Remove all `<link rel="stylesheet">` tags
- Remove all `<script>` tags and their content
- Keep metadata tags like `<link rel="canonical">` and `<link rel="shortcut icon">`

```bash
cd tests/fixtures && for file in *.html; do
  sed -i '/<link rel="stylesheet"/d' "$file"
  sed -i '/<script/d; /<\/script>/d' "$file"
done
```

This prevents happy-dom from fetching external resources during tests (ECONNREFUSED in CI).

## When You Are Unsure

- Flag it explicitly rather than assuming
- Propose two options with trade-offs and ask for a decision
- If a spec is ambiguous, quote the ambiguous part and ask for clarification
- Never silently make a decision that affects architecture or data shape

## Development commands

```bash
# Install dependencies
npm install

# Start local dev server (Netlify Dev handles both frontend and functions)
npx netlify dev

# Build for production
npx netlify build

# Run tests
npm test
```

## Shell commands — use `rtk` wrappers

**Always** use `rtk` for the commands listed below — never the bare equivalent. These are the commands auto-approved in `.claude/settings.local.json`; running them without `rtk` will trigger a permission prompt on every call.

### Git

```bash
rtk git status          # compact status
rtk git log -n 10       # one-line commits
rtk git diff            # condensed diff
rtk git add             # -> "ok"
rtk git commit -m "msg" # -> "ok abc1234"
rtk git push            # -> "ok main"
rtk git pull            # -> "ok 3 files +10 -2"
```

### GitHub CLI

```bash
rtk gh pr list          # compact PR listing
rtk gh pr view 42       # PR details + checks
rtk gh issue list       # compact issue listing
rtk gh run list         # workflow run status
```

### Build & lint

```bash
rtk tsc                 # TypeScript errors grouped by file
rtk lint                # ESLint grouped by rule/file
rtk err npm run build   # errors/warnings only
rtk vitest run          # failures only
rtk playwright test     # E2E failures only
```

### Files & search

```bash
rtk ls .                # token-optimized directory tree
rtk read file.ts        # smart file reading
rtk find "*.ts" .       # compact find results
rtk grep "pattern" .    # grouped search results
rtk diff file1 file2    # condensed diff
```

### Package managers

```bash
rtk pnpm list           # compact dependency tree
```

### Token savings

```bash
rtk gain                # summary stats
rtk discover            # find missed savings opportunities
```
