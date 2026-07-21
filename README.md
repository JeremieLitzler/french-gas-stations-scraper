# Scrap Price Info From Gas Stations

Using the list of stations below, scrap the HTML using a Netlify function and presents it to a SPA with Vue.js.

The presentation should use a table.

In the table, list the all distinct available fuel types found in the provided stations only and invite user to select one of them.

Then present the table with the stations having the fuel type selected. Some stations may not have the selected fuel type so they should appear in the list.

Example of table presentation:

|Station name|Gasoil|
|Station 1|1,969|
|Station 2|2,059|
|Station 3|2,109|
|Station N|2,119|

Save the list of URL to IndexedDB and make sure the user can:

- view the list in a textarea input
- add an item to the list providing the link and a custom name
- validate the list has a name seperated with a comma from the link to the page
- save new item to IndexedDB

I saved two pages HTML in `/tests/fixtures` folder. The table's content we need is parsable at CSS selector `.details_pdv tbody tr`. Don't parse more in the page to save context space.

The HTML of each link should be parsed on load, with a loader until all links are parsed.

When parsing the HTML of the link provided, if you cannot find any element matching the CSS selector provided, detail a warning message under textarea with the link not working.

The app no longer seeds a fixed example station list. On first use, with no stations saved yet
(locally or via GitHub sync — see issue #64), the UI shows "Aucune station pour le moment" and
invites the user to add their first station through the Station Manager.

## Development

### Claude Code

After cloning, create the `develop` worktree if it doesn't exist yet:

```bash
git worktree add develop develop
```

Then always open Claude Code from it, not the bare repo root:

```bash
cd develop && claude
```

Opening from the bare repo root means project instructions and skills are not loaded.

### Running Netlify functions locally

`npm run dev:netlify` runs `netlify dev` wrapped in [Proton Pass CLI](https://proton.me/support/proton-pass-cli)
(`pass-cli`), which injects secrets from your Proton Pass vault as environment variables
for the duration of the command — no plaintext secrets on disk.

Requirements:

- [Proton Pass CLI](https://proton.me/support/proton-pass-cli) installed and logged in
  (`pass-cli login`).
- A `.env.proton-pass` file at the repo root (gitignored, not committed) declaring the
  Proton Pass references to resolve — at minimum `GITHUB_CLIENT_ID` and
  `GITHUB_CLIENT_SECRET` for the GitHub OAuth app used by `netlify/functions/`.

With both in place, `npm run dev:netlify` starts `netlify dev` with those variables
available to the functions, equivalent to `netlify dev --functions netlify/functions`.

You'll need to replace the `[vault-id]` and `[item-id]` placeholders in `.env.proton-pass`
with real IDs. `pass-cli` doesn't take a vault/item name directly on the `pass://` reference,
so resolve both IDs by name via `--output json` and `jq`:

```bash
# 1. Share id, by vault name (e.g. "Common")
SHARE_ID=$(pass-cli vault list --output json | jq -r '.vaults[] | select(.name == "Common") | .share_id')

# 2. Item id, by item name — `item list` takes the vault NAME (or --share-id), not the vault id
ITEM_ID=$(pass-cli item list "Common" --output json | jq -r '.items[] | select(.content.title == "(local) French Gas Stations Scrapper GitHub OAuth") | .id')

echo "$SHARE_ID"
echo "$ITEM_ID"
```

Then paste both values into `.env.proton-pass`:

```
GITHUB_CLIENT_ID=pass://$SHARE_ID/$ITEM_ID/Client ID
GITHUB_CLIENT_SECRET=pass://$SHARE_ID/$ITEM_ID/Client Secret
```
