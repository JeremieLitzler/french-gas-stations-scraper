# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A web app that scrapes fuel price data from French government gas station pages (`prix-carburants.gouv.fr`) via a **Netlify serverless function**, then displays prices in a **Vue.js SPA**.

## Architecture

### Data flow

1. **Netlify function** (backend) — receives a station URL, fetches its HTML page, scrapes fuel type/price data, returns JSON.
2. **Vue.js SPA** (frontend) — calls the Netlify function for each station URL stored in IndexedDB, aggregates results into a unified price table.

### Key responsibilities by layer

**Netlify function (`/netlify/functions/`)**

- Accepts a station URL as a query parameter
- Fetches and parses the HTML from `prix-carburants.gouv.fr`
- Returns structured JSON: `{ stationName, fuels: [{ type, price }] }`

**Vue.js frontend (`/src/`)**

- Reads station list from IndexedDB on load
- Calls the Netlify function for each station concurrently
- Derives the set of available fuel types from all responses
- Lets the user pick a fuel type; renders a sorted price table for that fuel
- Station management UI: textarea to view URLs, form to add a new `{ name, url }` entry saved to IndexedDB

### Persistence

IndexedDB (client-side only) stores the list of station objects `{ name, url }`. The default seed list is defined in the README.

## Development commands

```bash
# Install dependencies
npm install

# Start local dev server (Netlify Dev handles both frontend and functions)
npx netlify dev

# Build for production
npx netlify build

# Run tests (once configured)
npm test
```

## Shell commands — use `rtk` wrappers

Prefer `rtk` over raw commands for token-efficient output.

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
