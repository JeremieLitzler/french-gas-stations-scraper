# Issue #63 — Allow Export/Import of user's preference

Using what is in the indexedDb, allow user to:

- export the station list and the default fuel type to a JSON file
- import the JSON from the user's computer to save to indexedDb values following the rules below
- on import, present the user with a UI comparing the JSON file and the indexedDb if difference exist
  - if a station exists but either the name or URL different, the UI must ask the user to pick the one to keep
  - if a station doesn't exist in indexedDb, the UI must present the line "added"
  - if the fuel type default differs, the UI must ask the user to pick the value to keep

The format of the JSON should be and MUST be controlled on import:

```json
{
    "fuelTypeDefault": "",
    "favoriteStations": [
        { "name": "[station-name-1]", "url": "[encoded-url]"}
        { "name": "[station-name-2]", "url": "[encoded-url]"}
        { "name": "[station-name-N]", "url": "[encoded-url]"}
    ]
}
```
