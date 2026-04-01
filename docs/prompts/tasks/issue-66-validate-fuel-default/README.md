# Issue #66 — Validate fuelTypeDefault against known fuel types on import

## Context

In `src/utils/preferencesImport.ts`, `validatePreferencesShape` currently accepts any string for `fuelTypeDefault`. A TODO comment notes this should eventually be validated against the known fuel type list, but acknowledges the difficulty.

## Problem

The valid fuel type list is dynamic — it is derived from scraping each station page, not from a static enum. This makes validation at parse time non-trivial.

Additional complexity: a file may contain stations not present in IndexedDB that offer fuel types the current stations don't. So `fuelTypeDefault` in the file may be legitimate even if it doesn't match anything currently in IndexedDB.

## Decisions Made

1. **In scope**: This is a separate issue from #63.
2. **fuelType enum removal**: Remove the `fuelType` enum as part of this work (#66).
3. **Validation strategy C — Runtime validation**: After validating the file shape, scrape all station URLs (from both the file and IndexedDB) to build a complete fuel type list, then reject or warn if `fuelTypeDefault` isn't in it. Correct but requires async network calls during import.
4. **If unrecognized**: Keep `fuelTypeDefault` from IndexedDB and display a warning message: "Le type de carburant par défaut de votre fichier n'existe dans aucune station. La valeur en mémoire de l'application est conservé."
5. **fuelType enum replacement**: Replace with plain `string` validated by a new composable taking as input the result of all station fetches.

## Related

- Opened from a TODO comment added during implementation of #63
