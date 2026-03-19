# Test Cases — Issue #28: Default Fuel Type

## Fuel Type List Ordering

### TC-01 — Default type is placed first in the list

**Precondition:** The derived fuel type list is `["SP95", "Gasoil", "E10"]`. The stored default is `"Gasoil"`.

**Action:** The ordering function is called with the list and the default value.

**Expected outcome:** The returned list is `["Gasoil", "SP95", "E10"]` — the default appears first, the remaining types follow in their original order.

---

### TC-02 — No default: list order is unchanged

**Precondition:** The derived fuel type list is `["SP95", "Gasoil", "E10"]`. No default is provided (undefined or null).

**Action:** The ordering function is called with the list and no default.

**Expected outcome:** The returned list is `["SP95", "Gasoil", "E10"]` — identical to the input order.

---

### TC-03 — Default is already first: list order is unchanged

**Precondition:** The derived fuel type list is `["SP95", "Gasoil", "E10"]`. The stored default is `"SP95"`.

**Action:** The ordering function is called with the list and the default value.

**Expected outcome:** The returned list is `["SP95", "Gasoil", "E10"]` — no change in order.

---

### TC-04 — Default not present in the list: list order is unchanged

**Precondition:** The derived fuel type list is `["SP95", "Gasoil"]`. The stored default is `"E85"` (not in the list).

**Action:** The ordering function is called with the list and the default value.

**Expected outcome:** The returned list is `["SP95", "Gasoil"]` — the unknown default is ignored, original order preserved.

---

### TC-05 — Ordering function does not mutate the input array

**Precondition:** The derived fuel type list is `["SP95", "Gasoil", "E10"]`. The stored default is `"E10"`.

**Action:** The ordering function is called with the list and the default value. The original list reference is inspected after the call.

**Expected outcome:** The original input array is still `["SP95", "Gasoil", "E10"]` — unmodified. The reordered list is returned as a new array.

---

## Button Visibility Matrix

### TC-06 — No default stored: only "Save as default" is visible

**Precondition:** No default is stored in IndexedDB. The price view is visible and the user has a fuel type selected.

**Action:** The user views the price page.

**Expected outcome:** "Save as default" is visible. "Update default" is not rendered. "Clear default" is not rendered.

---

### TC-07 — Default stored, current selection matches stored default: only "Clear default" is visible

**Precondition:** `"SP95"` is the stored default. The user currently has `"SP95"` selected.

**Action:** The user views the price page.

**Expected outcome:** "Save as default" is not rendered. "Update default" is not rendered. "Clear default" is visible.

---

### TC-08 — Default stored, current selection differs from stored default: both "Update default" and "Clear default" are visible

**Precondition:** `"SP95"` is the stored default. The user selects `"Gasoil"`.

**Action:** The user views the price page with `"Gasoil"` selected.

**Expected outcome:** "Save as default" is not rendered. "Update default" is visible. "Clear default" is visible.

---

## Saving a Default Fuel Type

### TC-09 — "Save as default" stores the selected fuel type

**Precondition:** The price view is visible. The user has selected `"SP95"`. No default is currently stored.

**Action:** The user clicks the "Save as default" button.

**Expected outcome:** `"SP95"` is persisted as the default fuel type in IndexedDB as a plain string.

---

### TC-10 — After saving, "Save as default" is hidden and the "Default" indicator appears

**Precondition:** No default is stored. The user has `"SP95"` selected and "Save as default" is visible.

**Action:** The user clicks "Save as default".

**Expected outcome:** The "Save as default" button disappears. A "Default" indicator appears near `"SP95"` in the fuel selector or price table row. "Clear default" becomes visible.

---

### TC-11 — "Save as default" is not available when no fuel type is selected

**Precondition:** The price view has not yet loaded any fuel types (the table is not visible).

**Action:** The user views the price page.

**Expected outcome:** The "Save as default" button is not rendered.

---

### TC-12 — After saving, the fuel type list reorders with the new default first

**Precondition:** The derived list is `["SP95", "Gasoil", "E10"]`. The user selects `"Gasoil"` and clicks "Save as default".

**Action:** The save completes.

**Expected outcome:** The fuel type list displayed to the user now shows `"Gasoil"` first, followed by `"SP95"` and `"E10"`.

---

## Loading and Applying the Default on Startup

### TC-13 — Stored default is pre-selected when the price view loads

**Precondition:** `"Gasoil"` is stored as the default fuel type in IndexedDB. The price view initialises and the derived list includes `"Gasoil"`.

**Action:** The price view loads.

**Expected outcome:** `"Gasoil"` is automatically selected (the price table shows Gasoil prices) instead of the first item in the raw derived list.

---

### TC-14 — No stored default: first available fuel type is selected on load

**Precondition:** No default is stored in IndexedDB. The price view initialises with a derived list of `["SP95", "Gasoil"]`.

**Action:** The price view loads.

**Expected outcome:** `"SP95"` (the first derived type) is selected. Behaviour is unchanged from before this feature.

---

### TC-15 — Stored default not present in derived list: fallback to first available

**Precondition:** `"E85"` is stored as the default in IndexedDB. The price view initialises, but the derived list is `["SP95", "Gasoil"]` (E85 is not available from any current station).

**Action:** The price view loads.

**Expected outcome:** `"SP95"` (the first derived type) is selected. The stored default `"E85"` is left unchanged in IndexedDB (not cleared).

---

### TC-16 — On startup with a valid stored default, the "Default" indicator is shown and "Save as default" is hidden

**Precondition:** `"SP95"` is stored as the default in IndexedDB. The price view initialises and `"SP95"` is in the derived list.

**Action:** The price view loads.

**Expected outcome:** `"SP95"` is selected. The "Default" indicator is visible near `"SP95"`. "Save as default" is not rendered. "Clear default" is visible.

---

## Updating the Default

### TC-17 — "Update default" is visible when selection differs from stored default

**Precondition:** `"SP95"` is the stored default. The user selects `"Gasoil"` from the fuel type list.

**Action:** The user views the price page with `"Gasoil"` selected.

**Expected outcome:** The "Update default" button is visible.

---

### TC-18 — "Update default" is not visible when the selected type matches the stored default

**Precondition:** `"SP95"` is the stored default. The user has `"SP95"` selected.

**Action:** The user views the price page.

**Expected outcome:** The "Update default" button is not rendered.

---

### TC-19 — "Update default" is not visible when no default is stored

**Precondition:** No default is stored in IndexedDB. The user has `"Gasoil"` selected.

**Action:** The user views the price page.

**Expected outcome:** The "Update default" button is not rendered. Only "Save as default" is available.

---

### TC-20 — Clicking "Update default" replaces the stored default

**Precondition:** `"SP95"` is the stored default. The user selects `"Gasoil"` and "Update default" is visible.

**Action:** The user clicks "Update default".

**Expected outcome:** `"Gasoil"` is now the stored default in IndexedDB. "Update default" is no longer visible. The "Default" indicator moves from `"SP95"` to `"Gasoil"`. The fuel type list reorders with `"Gasoil"` first.

---

### TC-21 — After updating, "Clear default" remains visible

**Precondition:** `"SP95"` is the stored default. The user selects `"Gasoil"` and clicks "Update default".

**Action:** The update completes.

**Expected outcome:** "Clear default" is still visible (a default — now `"Gasoil"` — is still stored).

---

## Clearing the Default

### TC-22 — "Clear default" is visible when a default is stored and the current selection matches the stored default

**Precondition:** `"SP95"` is the stored default. The user has `"SP95"` selected.

**Action:** The user views the price page.

**Expected outcome:** "Clear default" is visible.

---

### TC-23 — "Clear default" is visible when a default is stored and the current selection differs from the stored default

**Precondition:** `"SP95"` is the stored default. The user has `"Gasoil"` selected.

**Action:** The user views the price page.

**Expected outcome:** "Clear default" is visible alongside "Update default".

---

### TC-24 — "Clear default" is not visible when no default is stored

**Precondition:** No default is stored in IndexedDB. The user has `"SP95"` selected.

**Action:** The user views the price page.

**Expected outcome:** "Clear default" is not rendered.

---

### TC-25 — Clicking "Clear default" removes the key from IndexedDB

**Precondition:** `"SP95"` is the stored default.

**Action:** The user clicks "Clear default".

**Expected outcome:** The IndexedDB key for the default fuel type is deleted entirely — it is not set to an empty string, `null`, or any sentinel value.

---

### TC-26 — After clearing, "Save as default" reappears

**Precondition:** `"SP95"` is the stored default. The price view is visible.

**Action:** The user clicks "Clear default".

**Expected outcome:** The "Save as default" button becomes visible again.

---

### TC-27 — After clearing, "Update default" and "Clear default" are hidden

**Precondition:** `"SP95"` is the stored default. The user has `"SP95"` selected and clicks "Clear default".

**Action:** The clear completes.

**Expected outcome:** "Update default" is not rendered. "Clear default" is not rendered.

---

### TC-28 — After clearing, the "Default" indicator is removed

**Precondition:** `"SP95"` is the stored default and the "Default" indicator is shown near `"SP95"`.

**Action:** The user clicks "Clear default".

**Expected outcome:** The "Default" indicator disappears. No fuel type shows the "Default" indicator.

---

### TC-29 — After clearing, the fuel type list reverts to natural order

**Precondition:** `"Gasoil"` is the stored default. The displayed list is `["Gasoil", "SP95", "E10"]` (Gasoil ordered first).

**Action:** The user clicks "Clear default".

**Expected outcome:** The fuel type list reverts to its natural first-encountered order `["SP95", "Gasoil", "E10"]`. No reordering is applied.

---

## "Default" Indicator (Active State)

### TC-30 — "Default" indicator is shown when the selected fuel type matches the stored default

**Precondition:** `"SP95"` is the stored default. The user has `"SP95"` selected.

**Action:** The user views the price page.

**Expected outcome:** A "Default" indicator is visible near `"SP95"` in the fuel selector or price table. "Save as default" is not rendered (these are independent: the indicator is not the "Save as default" button).

---

### TC-31 — "Default" indicator is not shown when the selected fuel type differs from the stored default

**Precondition:** `"SP95"` is the stored default. The user has `"Gasoil"` selected.

**Action:** The user views the price page.

**Expected outcome:** No "Default" indicator is shown on `"Gasoil"`. (The indicator follows the active selection, not the stored value in isolation.)

---

### TC-32 — "Default" indicator is not shown when no default is stored

**Precondition:** No default is stored. The user has `"SP95"` selected.

**Action:** The user views the price page.

**Expected outcome:** No "Default" indicator is visible anywhere in the fuel selector or price table.

---

## Security

### TC-33 — Corrupted IndexedDB value is rejected on load

**Precondition:** The IndexedDB entry for the default fuel type contains a value that is not in the current derived fuel type list (e.g. a numeric value, an empty string, or an arbitrary string not matching any known fuel type label).

**Action:** The price view loads and reads the stored default.

**Expected outcome:** The corrupted/invalid value is ignored. The first available fuel type is selected instead. No error is thrown to the user.

---

### TC-34 — Fuel type label is not rendered as raw HTML

**Precondition:** The stored default fuel type label contains an HTML string (e.g. `"<b>SP95</b>"`).

**Action:** The price view loads and displays the fuel type label in the UI.

**Expected outcome:** The label is displayed as literal text (`<b>SP95</b>`) — no HTML is rendered, no bold tag appears. The markup is treated as plain text.

---

### TC-35 — Saving a default stores only a plain string, not a structured object

**Precondition:** The user selects a fuel type and clicks "Save as default".

**Action:** The stored IndexedDB entry is inspected.

**Expected outcome:** The entry is a plain string (the fuel type label only), not a JSON object or an object with additional properties.

---

### TC-36 — Clearing a default uses key deletion, not overwrite with empty value

**Precondition:** `"SP95"` is the stored default.

**Action:** The user clicks "Clear default". The IndexedDB store is inspected afterwards.

**Expected outcome:** The key is absent from IndexedDB entirely — it was deleted, not set to an empty string, `null`, or `undefined`.

---

## Keyboard Accessibility

### TC-37 — "Save as default" button is keyboard accessible

**Precondition:** The price view is visible with a fuel type selected and no default stored.

**Action:** The user navigates to the "Save as default" control using the Tab key and activates it with Enter or Space.

**Expected outcome:** The default is saved and the UI updates as if the button had been clicked with a mouse.

---

### TC-38 — "Update default" button is keyboard accessible

**Precondition:** A default is stored and the user has selected a different fuel type, making "Update default" visible.

**Action:** The user navigates to the "Update default" control using the Tab key and activates it with Enter or Space.

**Expected outcome:** The default is updated and the UI reflects the new default.

---

### TC-39 — "Clear default" button is keyboard accessible

**Precondition:** A default is stored, making "Clear default" visible.

**Action:** The user navigates to the "Clear default" control using the Tab key and activates it with Enter or Space.

**Expected outcome:** The default is cleared and the UI updates as if the button had been clicked with a mouse.

---

status: ready
