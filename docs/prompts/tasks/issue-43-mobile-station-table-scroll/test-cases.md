# Test Cases — Issue #43: Mobile Station Manager Horizontal Scroll

## TC-SCROLL-01: Scroll container is rendered

**Precondition:** The StationManager component is mounted inside a Suspense boundary and the station list has loaded.

**Action:** Inspect the rendered DOM.

**Expected:** A wrapper element with horizontal scroll enabled (`overflow-x-auto` or equivalent) is present in the output, wrapping the station table.

## TC-SCROLL-02: Station table is a descendant of the scroll container

**Precondition:** The StationManager component is mounted and has loaded.

**Action:** Inspect the DOM hierarchy.

**Expected:** The station table (or StationManagerTable stub) is rendered as a child of the scroll container element, not outside it.

## TC-SCROLL-03: Existing station-manager behaviour is unaffected

**Precondition:** The StationManager component is mounted with stations present.

**Action:** Render the component and inspect rows and inputs.

**Expected:** All existing tests (station rows, add/remove/edit operations) continue to pass exactly as before — the wrapper div does not break any existing DOM structure or event handling.

status: ready
