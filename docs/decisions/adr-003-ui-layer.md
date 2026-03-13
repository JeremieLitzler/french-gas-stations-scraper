# ADR-003: Tailwind CSS v4 + shadcn-vue (Radix Vue) for UI

**Date:** 2026-02-11
**Status:** Accepted (Pre-existing, refined)

## Context

The app needs a UI layer for building a clean, functional single-page
interface with copy-to-clipboard buttons, tabs per platform, text areas,
and general layout components.

The boilerplate template came with Tailwind CSS v4 and radix-vue already
configured. shadcn-vue provides pre-built accessible components built on
top of Radix Vue primitives, styled with Tailwind.

## Decision

Use Tailwind CSS v4 for styling and shadcn-vue (via radix-vue) for
pre-built UI components.

Key supporting libraries:

- `tailwindcss-animate` — for component transitions
- `class-variance-authority` — for component variant definitions
- `clsx` + `tailwind-merge` — for conditional class merging
- `unplugin-vue-components` — for auto-importing components

## Consequences

### Positive

- Pre-built accessible components (buttons, tabs, dialogs, etc.)
- No need to build UI primitives from scratch
- Consistent design system out of the box
- Tailwind v4 has zero-config CSS-first setup
- Components are copy-owned (not a black-box dependency)

### Negative

- Boilerplate includes components we won't use (cleanup needed per TR-1)
- Tailwind v4 is relatively new; some ecosystem tooling still catching up
- shadcn-vue components need to be individually audited for actual use

## Alternatives Considered

- **Vuetify**: Full component library but heavier, opinionated layout system
- **PrimeVue**: Good components but adds a full dependency vs copy-owned shadcn
- **Vanilla Tailwind only**: More work to build accessible components

## Notes

- Unused shadcn/radix components to be removed as part of TR-1 cleanup
- `@tanstack/vue-table` confirmed unused — remove in cleanup
- Components we expect to use: Button, Tabs, Textarea, Badge, Separator, Toast
