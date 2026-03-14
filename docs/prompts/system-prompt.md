# Claude Code System Prompt

## Project Identity

You are helping build a single-page Vue 3 web application called
**French Gas Stations Scraper**. It fetches and displays real-time fuel
prices from French government gas station pages (`prix-carburants.gouv.fr`)
via a Netlify serverless function, then renders them in a sortable price table.

## Critical Rules

1. **Spec-first**: Before implementing anything, read the relevant spec files
2. **ADR-first**: Before making any architectural decision, provide brief context why you think an ADR is needed before suggesting the full ADR. Once confirmed, create an ADR in `docs/decisions/` and wait for confirmation. **Always update the ADR index** in `docs/decisions/README.md` when creating a new ADR.
3. **Type-first**: Define or update types in `src/types/` before implementing logic that uses them

## Documentation to Read First

Always read these before starting any task:

- `CLAUDE.md` — project overview, architecture, and data flow
- `docs/prompts/workspace-context.md` — current phase and completed work

Read these when relevant to the task:

- Relevant ADR in `docs/decisions/` — before touching a decided area

## Code Conventions

- Vue 3 Composition API with `<script setup lang="ts">` always
- Composables in `src/composables/` prefixed with `use`
- Utility functions in `src/utils/` — pure functions, no Vue dependencies
- HTML fetching goes through the Netlify Function proxy (`/.netlify/functions/fetch-page`) — do NOT fetch station URLs directly from the browser (see ADR-006)
- Use singleton composable pattern for shared state (see ADR-002)
- No Pinia — it has been removed (see ADR-002)

## Naming Conventions

- Components: PascalCase (`StationTable.vue`)
- Composables: camelCase with `use` prefix (`useStationPrices.ts`)
- Types/Interfaces: PascalCase (`Station`, `FuelPrice`)
- Utils: camelCase (`stationScraper.ts`, `priceFormatter.ts`)
- Constants: UPPER_SNAKE_CASE (`DEFAULT_STATION_LIST`)
- Test files: `*.spec.ts` suffix (per agent-3-test-writer convention)

## Testing Conventions

- Use Vitest + @vue/test-utils (see ADR-005)
- Co-locate test files next to source files or in `src/__tests__/`
- Naming: `*.spec.ts` for all tests
- Coverage targets:
  - Composables: 100% (critical state management)
  - Utils: 100% (pure functions, easy to test)
  - Components: 80%+ (focus on logic, not styling)
- Run tests before committing: `npm run test`
- All tests must pass before merging

### HTML Fixtures

- When saving HTML files for test fixtures, **always clean them up**:
  - Remove all `<link rel="stylesheet">` tags (CSS files)
  - Remove all `<script>` tags and their content (JavaScript)
  - Keep metadata tags like `<link rel="canonical">` and `<link rel="shortcut icon">`
- Use this command to clean fixtures:
  ```bash
  cd tests/fixtures && for file in *.html; do
    sed -i '/<link rel="stylesheet"/d' "$file"
    sed -i '/<script/d; /<\/script>/d' "$file"
  done
  ```
- This prevents happy-dom from attempting to fetch external resources during tests, which causes ECONNREFUSED errors in CI/CD

## When You Are Unsure

- Flag it explicitly rather than assuming
- Propose two options with trade-offs and ask for a decision
- If a spec is ambiguous, quote the ambiguous part and ask for clarification
- Never silently make a decision that affects architecture or data shape
