# Security Guidelines — Fix: Loader not visible during scraping (#30)

## Analysis

This fix has two parts:

1. **CSS bug fix**: Removes an unstyled `css-class` prop from a single template line in `StationPrices.vue`. No new inputs, no new network calls, no new dependencies, no secrets or environment variables are introduced. The change is purely presentational.

2. **Suspense wiring**: Moves async initialisation from `onMounted` to top-level `await` in `<script setup>` for `StationPrices.vue` and `StationManager.vue`, and adds a `<Suspense>` wrapper with `<AppLoader />` fallback in `index.vue`. No new network endpoints, no new inputs, no new dependencies, no environment variables are introduced. The change is purely structural.

## Rules

1. **No user-controlled class injection**
   - **What**: The `cssClass` prop of `AppLoader` must not be bound to any user-supplied or external value.
   - **Where**: `src/components/StationPrices.vue` and `src/components/AppLoader.vue`.
   - **Why**: A class string bound to untrusted input could be used to obscure UI elements or inject unexpected layout, undermining the integrity of the loading state.

2. **Default styling must remain self-contained**
   - **What**: The default Tailwind class string in `AppLoader.vue` must stay hardcoded as a prop default, not imported from an external config or derived at runtime.
   - **Where**: `src/components/AppLoader.vue`.
   - **Why**: Externalising the default would create an indirect injection surface where a misconfigured or tampered config value silently renders the loader invisible.

3. **Suspense fallback must not expose sensitive state**
   - **What**: The `<AppLoader />` fallback rendered inside `<Suspense>` must not display any partial data, error messages, or internal state while the component tree is suspended.
   - **Where**: `src/pages/index.vue` (the `<Suspense>` fallback slot).
   - **Why**: Partial state visible during suspension could leak information about the data loading process or expose unvalidated content to the user.

status: ready
