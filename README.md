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

Starting list of stations:

- name: "à INTERMARCHE AOSTE" ; link: https://www.prix-carburants.gouv.fr/station/38490005
- name: "à INTERMARCHE APPRIEU" ; link: https://www.prix-carburants.gouv.fr/station/38140005
- name: "à SUPER U APPRIEU" ; link: https://www.prix-carburants.gouv.fr/station/38690006
- name: "à INTERMARCHE TAIN L'HERMITAGE" ; link: https://www.prix-carburants.gouv.fr/station/26600007
- name: "à SUPER U SAINT-DONAT" ; link: https://www.prix-carburants.gouv.fr/station/26260001
