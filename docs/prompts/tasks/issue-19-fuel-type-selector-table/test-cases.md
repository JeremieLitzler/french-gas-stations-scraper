# Test Cases — Issue 19

## Fuel-Type Selector and Price Table

---

### TC-01 — Fuel type derivation: mixed results

**Precondition:** Two stations are available. Station A has fuels SP95 and Gasoil. Station B has fuels SP95 and E85.

**Action:** Derive the list of available fuel types from the two stations.

**Expected outcome:** The list contains SP95, Gasoil, E85 in first-encountered order, deduplicated. No type appears more than once.

---

### TC-02 — Fuel type derivation: empty results

**Precondition:** No stations are in the results list (empty array).

**Action:** Derive available fuel types.

**Expected outcome:** The returned list is empty.

---

### TC-03 — Fuel type derivation: all stations carry the same types

**Precondition:** Three stations each have SP95 and SP98 in their fuel list.

**Action:** Derive available fuel types.

**Expected outcome:** The list contains SP95 and SP98 exactly once each.

---

### TC-04 — Fuel type derivation: fuel type with null price is included

**Precondition:** A station has a fuel entry for E10 with a null price.

**Action:** Derive available fuel types.

**Expected outcome:** E10 appears in the derived fuel type list.

---

### TC-05 — Sort order: ascending by price for selected type

**Precondition:** Three stations all carry SP95. Station A has price 1.89, Station B has price 1.75, Station C has price 1.95.

**Action:** Build the sorted price rows for SP95.

**Expected outcome:** Rows appear in order: Station B (1.75), Station A (1.89), Station C (1.95).

---

### TC-06 — Sort order: station missing selected type sorts to bottom

**Precondition:** Three stations. Station A carries SP95 at 1.89. Station B does not carry SP95. Station C carries SP95 at 1.75.

**Action:** Build the sorted price rows for SP95.

**Expected outcome:** Rows appear in order: Station C (1.75), Station A (1.89), Station B (—). Station B is last.

---

### TC-07 — Sort order: multiple stations missing the type appear at the end

**Precondition:** Station A carries SP95 at 1.80. Station B does not carry SP95. Station C does not carry SP95.

**Action:** Build the sorted price rows for SP95.

**Expected outcome:** Station A appears first. Station B and Station C both appear after Station A, each showing —. Their relative order with respect to each other is unspecified.

---

### TC-08 — Price row: null price renders as dash

**Precondition:** Station A has SP95 with price null.

**Action:** Build the price row for Station A with SP95 selected.

**Expected outcome:** Station A's price value in the row is null (indicating it should display as —). The station remains in the list.

---

### TC-09 — Price row: station that carries the type has its price resolved

**Precondition:** Station A has SP95 at 1.85.

**Action:** Build the price row for Station A with SP95 selected.

**Expected outcome:** Station A's price value in the row is 1.85.

---

### TC-10 — Price row: station not carrying the type has null resolved price

**Precondition:** Station A has no SP95 fuel entry.

**Action:** Build the price row for Station A with SP95 selected.

**Expected outcome:** Station A's resolved price is null, placing it at the end of the sort order.

---

### TC-11 — Component: selector is not rendered during loading

**Precondition:** `isLoading` is true. `results` is empty.

**Action:** The component renders.

**Expected outcome:** The fuel-type selector is not present in the rendered output. The price table is not present. `AppLoader` is visible.

---

### TC-12 — Component: table is not rendered during loading

**Precondition:** `isLoading` is true.

**Action:** The component renders.

**Expected outcome:** No table element is present in the rendered output.

---

### TC-13 — Component: selector and table appear after loading with results

**Precondition:** Loading has completed (`isLoading` is false). `results` contains at least one station with at least one fuel type.

**Action:** The component renders.

**Expected outcome:** The fuel-type selector is visible. The price table is visible. `AppLoader` is not rendered.

---

### TC-14 — Component: no selector or table when results are empty after loading

**Precondition:** Loading has completed (`isLoading` is false). `results` is empty.

**Action:** The component renders.

**Expected outcome:** Neither the fuel-type selector nor the price table is rendered. The warnings list (if any) is shown.

---

### TC-15 — Component: selector defaults to the first available fuel type on load

**Precondition:** Loading completes. Results contain stations with fuel types SP95, Gasoil, E85 (in that first-encountered order).

**Action:** The component renders after loading completes.

**Expected outcome:** SP95 is the initially selected fuel type. The SP95 button is visually marked as active. The table shows SP95 prices.

---

### TC-16 — Component: clicking a different fuel type button updates the table

**Precondition:** Loading is complete. SP95 is the current selection. The component is rendered with a selector showing SP95 and Gasoil.

**Action:** The user clicks the Gasoil button.

**Expected outcome:** The table immediately re-renders with Gasoil prices and sort order. The Gasoil button is visually marked as active. The SP95 button is no longer marked as active.

---

### TC-17 — Component: changing fuel type does not trigger a new fetch

**Precondition:** Loading is complete. The fetch count is 1 after the initial load.

**Action:** The user clicks a different fuel type button.

**Expected outcome:** No additional network request is made. Only the table content updates.

---

### TC-18 — Component: all stations are shown in the table regardless of whether they carry the selected type

**Precondition:** Loading is complete. Results contain Station A (carries SP95) and Station B (does not carry SP95).

**Action:** SP95 is selected. The component renders.

**Expected outcome:** Both Station A and Station B appear as rows in the table. Station B's price cell shows a dash.

---

### TC-19 — Component: table has Station Name and Price columns

**Precondition:** Loading is complete with non-empty results.

**Action:** The component renders.

**Expected outcome:** The table has exactly two columns: one for the station name and one for the price.

---

### TC-20 — Component: all fuel type buttons are rendered in the selector

**Precondition:** Loading is complete. Available fuel types are SP95, Gasoil, E85.

**Action:** The component renders.

**Expected outcome:** Three `<button>` elements are present in the fuel-type selector, one for each of SP95, Gasoil, and E85.

---

### TC-21 — Component: no `<select>` element used for fuel type selector

**Precondition:** Loading is complete with non-empty results.

**Action:** The component renders.

**Expected outcome:** No `<select>` element is present in the fuel-type selector area.

---

### TC-22 — Edge case: fuel type with null price for all stations — table still renders

**Precondition:** All stations have E10 in their fuel list, all with null prices.

**Action:** E10 is selected. The price table is rendered.

**Expected outcome:** The table renders. Every station row shows a dash. No crash or empty-table failure occurs.

---

### TC-23 — Edge case: results change — selected fuel type resets to first available

**Precondition:** Loading has completed with SP95 and Gasoil available. The user has selected Gasoil. A new fetch is triggered and completes with results that only contain SP98.

**Action:** `results` is updated by the new fetch.

**Expected outcome:** The selected fuel type resets to SP98 (the first available type from the new results). The table renders SP98 prices.

---

### TC-24 — Security: station names rendered as text, not HTML

**Precondition:** A station name contains HTML-special characters or a script tag (e.g. `<b>Station</b>` or `<script>alert(1)</script>`).

**Action:** The component renders the station name in the price table.

**Expected outcome:** The raw string is displayed literally as text. No HTML is interpreted or executed. No script tag runs.

status: ready
