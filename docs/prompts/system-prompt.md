# Claude Code System Prompt

## Project Identity

You are helping build a single-page Vue 3 web application called
"Social Media Sharing Assistant". It extracts content from blog articles
and generates platform-specific formatted content for X, LinkedIn,
Medium, and Substack.

## Critical Rules

1. **Spec-first**: Before implementing anything, read the relevant spec files
2. **ADR-first**: Before making any architectural decision, provide brief context why you thing an ADR is needed before suggesting the full ADR. Once confirmed, create an ADR in `docs/decisions/` and wait for confirmation. **Always update the ADR index** in `docs/decisions/README.md` when creating a new ADR.
3. **Type-first**: Define or update types in `src/types/` before implementing logic that uses them
4. **Cleanup before building**: Follow TR-1 in `01-requirements.md` before adding new code

## Documentation to Read First

Always read these before starting any task:

- `docs/specs/00-overview.md`
- `docs/specs/02-architecture.md`
- `docs/prompts/workspace-context.md`

Read these when relevant to the task:

- `docs/specs/01-requirements.md` — for feature behaviour and rules
- `docs/specs/03-data-models.md` — before touching types or data flow
- Relevant ADR in `docs/decisions/` — before touching a decided area

## Code Conventions

- Vue 3 Composition API with `<script setup lang="ts">` always
- Composables in `src/composables/` prefixed with `use`
- One component per platform in `src/components/platforms/`
- Utility functions in `src/utils/` — pure functions, no Vue dependencies
- Configurable text snippets in `src/config/snippets.ts`
- Use `useClipboard` from `@vueuse/core` for all clipboard operations
- HTML fetching goes through the Netlify Function proxy (`/.netlify/functions/fetch-article`) — do NOT fetch blog URLs directly from the browser (see ADR-006)
- Configurable text snippets (Medium "why" text, Substack share block) live in `src/config/snippets.ts` — never hardcode them in generators
- Use singleton composable pattern for shared state (see ADR-002)
- No Pinia — it has been removed (see ADR-002)

## Naming Conventions

- Components: PascalCase (`PlatformMedium.vue`)
- Composables: camelCase with `use` prefix (`useArticleState.ts`)
- Types/Interfaces: PascalCase (`Article`, `ExtractionState`)
- Utils: camelCase (`utm.ts`, `xFormatter.ts`)
- Constants: UPPER_SNAKE_CASE (`MEDIUM_NO_FULL_ARTICLE`)
- Test files: `*.test.ts` suffix (`useArticleState.test.ts`)

## Testing Conventions

- Use Vitest + @vue/test-utils (see ADR-005)
- Co-locate test files next to source files
- Naming: `*.test.ts` for all tests
- Coverage targets:
  - Composables: 100% (critical state management)
  - Utils: 100% (pure functions, easy to test)
  - Components: 80%+ (focus on logic, not styling)
- Run tests before committing: `npm run test`
- Check coverage: `npm run test:coverage`
- All tests must pass before merging

### HTML Fixtures
- When downloading HTML files for test fixtures, **always clean them up**:
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