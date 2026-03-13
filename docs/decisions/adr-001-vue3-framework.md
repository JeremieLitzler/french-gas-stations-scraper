# ADR-001: Use Vue 3 as Frontend Framework

**Date:** 2026-02-11  
**Status:** Accepted (Pre-existing)

## Context

Starting a new web application for social media sharing automation. Need a modern frontend framework to build a single-page interface with dynamic content generation and clipboard operations.

Project started from a Vue 3 template.

## Decision

Use Vue 3 as the frontend framework.

## Consequences

### Positive

- Modern reactivity system with Composition API
- Strong TypeScript support (if needed)
- Good ecosystem for utilities (clipboard, HTTP requests)
- Familiar framework for developer
- Template project provided good starting structure

### Negative

- Tied to Vue ecosystem for components/libraries
- Requires to manage dependencies update regularly

## Alternatives Considered

- Vanilla JS: Simpler but would require building more from scratch

## Notes

- Template project used: https://github.com/JeremieLitzler/VueSupabaseBoilerplate without Supabase
- Version: Vue 3.5.x
- Build tool: Vite 7.x
- Language: TypeScript 5.9.x
- Key dependencies selected with this framework choice:
  - `@vueuse/core` — composable utilities (clipboard, etc.)
  - `unplugin-vue-router` — file-based routing
  - `unplugin-auto-import` — auto-imports for Vue/VueRouter/Pinia
  - `unplugin-vue-components` — auto-imports for components
  - `vue-tsc` — TypeScript checking for Vue files
