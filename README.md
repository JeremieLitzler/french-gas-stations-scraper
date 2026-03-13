# Scrap Price Info From Gas Stations

Using the list of stations below, scrap the HTML using a Netlify function and present to a SPA with Vue.js the content in a table.

List the all available fuel types found in the provided stations only and invite user to select one of them.

Then present the table with the stations having the fuel type selected.

Example of table presentation:

|Station|Gasoil|
|Station 1|1,969|
|Station 2|2,059|
|Station 3|2,109|
|Station N|2,119|

Save the list of URL to IndexedDB and make sure the user can:

- view the list in a textarea input
- add an item to the list providing the link and a custom name
- save new item to IndexedDB

Starting list of stations:

- name: "à INTERMARCHE AOSTE" ; link: https://www.prix-carburants.gouv.fr/station/38490005
- name: "à INTERMARCHE APPRIEU" ; link: https://www.prix-carburants.gouv.fr/station/38140005
- name: "à SUPER U APPRIEU" ; link: https://www.prix-carburants.gouv.fr/station/38690006
- name: "à INTERMARCHE TAIN L'HERMITAGE" ; link: https://www.prix-carburants.gouv.fr/station/26600007
- name: "à SUPER U SAINT-DONAT" ; link: https://www.prix-carburants.gouv.fr/station/26260001

