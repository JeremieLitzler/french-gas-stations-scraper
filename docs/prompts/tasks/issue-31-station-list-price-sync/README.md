# Issue #31: Making a change to the Station list should update the price table

## User Request

Run the full pipeline for issue #31.

## Issue Description

The price table must be reactive to the station list table.

- Modifying a row in station list should remove the price if the URL is invalid.
- Removing a row in station list should remove all prices for the station.
- Adding a row in station list should add the price if the URL is invalid.
- The fuel type selection doesn't change on station update, UNLESS the fuel type selected was present only in the station removed or modified.
- The fuel type list should update.

## Metadata

- Issue: #31
- Type: feat
- Slug: station-list-price-sync
- Branch: feat/station-list-price-sync
- Worktree: E:/Git/GitHub/french-gas-stations-scraper.git/feat_station-list-price-sync
- Task folder: docs/prompts/tasks/issue-31-station-list-price-sync/
