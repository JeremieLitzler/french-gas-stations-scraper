# Issue #28 — Default fuel type

## User Request

The user can save a fuel type by default after a selection in the list.
It must be persisted to IndexedDB.
If the default exists, it should be used, otherwise, the logic isn't changed.

An action should allow user to update his default, only if the default exists and if the fuel type selected is différent.

The list of fuel types should be ordered by the default fuel type, if exists, otherwise, it is ordered as the code already does.

## GitHub Issue

https://github.com/JeremieLitzler/french-gas-stations-scraper/issues/28
