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

## Saving a Default Fuel Type

### TC-06 — "Save as default" stores the selected fuel type

**Precondition:** The price view is visible. The user has selected `"SP95"`. No default is currently stored.

**Action:** The user clicks the "Save as default" button.

**Expected outcome:** `"SP95"` is persisted as the default fuel type. The UI reflects that `"SP95"` is now the active default (e.g. the save button shows a confirmed/active state).

---

### TC-07 — "Save as default" is not available when no fuel type is selected

**Precondition:** The price view has not yet loaded any fuel types (the table is not visible).

**Action:** The user views the price page.

**Expected outcome:** The "Save as default" button is not rendered or not accessible.

---

### TC-08 — After saving, the fuel type list reorders with the new default first

**Precondition:** The derived list is `["SP95", "Gasoil", "E10"]`. The user selects `"Gasoil"` and clicks "Save as default".

**Action:** The save completes.

**Expected outcome:** The fuel type list displayed to the user now shows `"Gasoil"` first, followed by `"SP95"` and `"E10"`.

---

## Loading and Applying the Default on Startup

### TC-09 — Stored default is pre-selected when the price view loads

**Precondition:** `"Gasoil"` is stored as the default fuel type in IndexedDB. The price view initialises and the derived list includes `"Gasoil"`.

**Action:** The price view loads.

**Expected outcome:** `"Gasoil"` is automatically selected (the price table shows Gasoil prices) instead of the first item in the raw derived list.

---

### TC-10 — No stored default: first available fuel type is selected on load

**Precondition:** No default is stored in IndexedDB. The price view initialises with a derived list of `["SP95", "Gasoil"]`.

**Action:** The price view loads.

**Expected outcome:** `"SP95"` (the first derived type) is selected. Behaviour is unchanged from before this feature.

---

### TC-11 — Stored default not present in derived list: fallback to first available

**Precondition:** `"E85"` is stored as the default in IndexedDB. The price view initialises, but the derived list is `["SP95", "Gasoil"]` (E85 is not available from any current station).

**Action:** The price view loads.

**Expected outcome:** `"SP95"` (the first derived type) is selected. The stored default `"E85"` is left unchanged in IndexedDB (not cleared).

---

## Updating the Default

### TC-12 — "Update default" is visible when selection differs from stored default

**Precondition:** `"SP95"` is the stored default. The user selects `"Gasoil"` from the fuel type list.

**Action:** The user views the price page with `"Gasoil"` selected.

**Expected outcome:** An "Update default" button is visible.

---

### TC-13 — "Update default" is not visible when the selected type matches the stored default

**Precondition:** `"SP95"` is the stored default. The user has `"SP95"` selected.

**Action:** The user views the price page.

**Expected outcome:** The "Update default" button is not rendered.

---

### TC-14 — "Update default" is not visible when no default is stored

**Precondition:** No default is stored in IndexedDB. The user has `"Gasoil"` selected.

**Action:** The user views the price page.

**Expected outcome:** The "Update default" button is not rendered. Only the "Save as default" button is available.

---

### TC-15 — Clicking "Update default" replaces the stored default

**Precondition:** `"SP95"` is the stored default. The user selects `"Gasoil"` and the "Update default" button is visible.

**Action:** The user clicks "Update default".

**Expected outcome:** `"Gasoil"` is now the stored default. The "Update default" button is no longer visible. The fuel type list reorders with `"Gasoil"` first.

---

## Security

### TC-16 — Corrupted IndexedDB value is rejected on load

**Precondition:** The IndexedDB entry for the default fuel type contains a value that is not in the current derived fuel type list (e.g. a numeric value, an empty string, or an arbitrary string not matching any known fuel type label).

**Action:** The price view loads and reads the stored default.

**Expected outcome:** The corrupted/invalid value is ignored. The first available fuel type is selected instead. No error is thrown to the user.

---

### TC-17 — Fuel type label is not rendered as raw HTML

**Precondition:** The stored default fuel type label contains an HTML string (e.g. `"<b>SP95</b>"`).

**Action:** The price view loads and displays the fuel type label in the UI.

**Expected outcome:** The label is displayed as literal text (`<b>SP95</b>`) — no HTML is rendered, no bold tag appears. The markup is treated as plain text.

---

### TC-18 — Saving a default stores only a plain string, not a structured object

**Precondition:** The user selects a fuel type and clicks "Save as default".

**Action:** The stored IndexedDB entry is inspected.

**Expected outcome:** The entry is a plain string (the fuel type label only), not a JSON object or an object with additional properties.

---

## Keyboard Accessibility

### TC-19 — "Save as default" button is keyboard accessible

**Precondition:** The price view is visible with a fuel type selected.

**Action:** The user navigates to the "Save as default" control using the Tab key and activates it with Enter or Space.

**Expected outcome:** The default is saved and the UI updates as if the button had been clicked with a mouse.

---

### TC-20 — "Update default" button is keyboard accessible

**Precondition:** A default is stored and the user has selected a different fuel type, making the "Update default" button visible.

**Action:** The user navigates to the "Update default" control using the Tab key and activates it with Enter or Space.

**Expected outcome:** The default is updated and the UI reflects the new default.

---

status: ready
