# Issue #16: feat: enhance fetch-page Netlify function to parse station HTML and return structured JSON

## Context

Closes part of #9. Depends on #14.

`netlify/functions/fetch-page.ts` currently fetches raw HTML and returns it as-is.

A composable should take the fetched raw HTML and parse the fuel prices from it and return a structured `StationData` object instead. Storing the station name is needed.

So the object would look like this:

```json
{
  "name": "Station X",
  "fuels": [
    { "type": "Gasoil", "price": 1.969 },
    { "type": "SP95-E10", "price": 1.819 },
    { "type": "SP95", "price": 1.859 },
    { "type": "SP98", "price": 2.039 },
    { "type": "E85", "price": 0.769 }
  ]
}
```

Two HTML fixtures are already saved in `tests/fixtures/` for examples:
- `INTERMARCHE-AOSTE.html`
- `INTERMARCHE-APPRIEU.html`

## Parsing rule

CSS selector: `.details_pdv tbody tr`

Each `<tr>` contains a fuel type name and its price. Do not parse anything else on the page.

## Acceptance criteria

- Function response shape changes from `{ success, html }` to `{ success, data: StationData }` — `StationData { stationName, fuels: FuelPrice[] }`
- `stationName` extracted from the page (identify the right selector from the fixtures)
- `fuels` array contains one entry per `<tr>` in `.details_pdv tbody`; `price` is `null` if the cell is empty or unparseable
- If no element matches `.details_pdv tbody tr`, return `{ success: false, error: "selector_not_found" }` — the SPA uses this to display a warning
- Unit tests use the two existing HTML fixtures to assert correct parsing output
- Existing domain-allowlist and HTTP-method guard remain unchanged
