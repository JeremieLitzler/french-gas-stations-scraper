# Security Guidelines — Fix: Loader not visible during scraping (#30)

## Analysis

This fix removes an unstyled `css-class` prop from a single template line in `StationPrices.vue`. No new inputs, no new network calls, no new dependencies, no secrets or environment variables are introduced. The change is purely presentational.

## Rules

1. **No user-controlled class injection**
   - **What**: The `cssClass` prop of `AppLoader` must not be bound to any user-supplied or external value.
   - **Where**: `src/components/StationPrices.vue` and `src/components/AppLoader.vue`.
   - **Why**: A class string bound to untrusted input could be used to obscure UI elements or inject unexpected layout, undermining the integrity of the loading state.

2. **Default styling must remain self-contained**
   - **What**: The default Tailwind class string in `AppLoader.vue` must stay hardcoded as a prop default, not imported from an external config or derived at runtime.
   - **Where**: `src/components/AppLoader.vue`.
   - **Why**: Externalising the default would create an indirect injection surface where a misconfigured or tampered config value silently renders the loader invisible.

status: ready
