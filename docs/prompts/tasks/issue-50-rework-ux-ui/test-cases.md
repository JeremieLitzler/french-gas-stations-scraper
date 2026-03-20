# Test Cases — Issue #50: Rework UX / UI

## TC-01 — Markdown parser: valid Markdown produces sanitized HTML

- **Precondition:** A Markdown string containing headings, paragraphs, and a link.
- **Action:** Call the markdown parser utility with the string.
- **Expected:** Returns an HTML string containing the expected `<h1>`/`<h2>` tags, `<p>` tags, and an `<a>` tag. No `<script>` tags or event-handler attributes (`onerror`, `onclick`, etc.) are present in the output.

## TC-02 — Markdown parser: XSS payload is stripped

- **Precondition:** A Markdown string that embeds a `<script>alert('xss')</script>` tag or an `onerror` attribute inline.
- **Action:** Call the markdown parser utility with the string.
- **Expected:** The returned HTML contains no `<script>` element and no event-handler attributes. The remaining safe content is preserved.

## TC-03 — Markdown parser: empty string input

- **Precondition:** An empty string.
- **Action:** Call the markdown parser utility.
- **Expected:** Returns an empty string or an empty HTML fragment (no error thrown).

## TC-04 — Mentions légales page: renders heading from Markdown asset

- **Precondition:** The Mentions légales page is mounted. The bundled `mentions-legales.md` asset contains an `# Mentions Légales` heading.
- **Action:** The page mounts and parses the asset.
- **Expected:** The rendered DOM contains a visible `<h1>` element with the text "Mentions Légales".

## TC-05 — Mentions légales page: external links have `rel="noopener noreferrer"`

- **Precondition:** The `mentions-legales.md` asset contains at least one external link (e.g. the CNIL link).
- **Action:** The page mounts and renders the parsed Markdown.
- **Expected:** All `<a>` elements in the rendered output carry `rel="noopener noreferrer"`.

## TC-06 — Mentions légales page: no raw Markdown text visible

- **Precondition:** The Mentions légales page is mounted.
- **Action:** Inspect the rendered DOM.
- **Expected:** No raw Markdown syntax (e.g. `##`, `**`, `[text](url)`) is present as visible text in the DOM.

## TC-07 — markdownParser utility: is a pure function with no side effects

- **Precondition:** The utility module is imported.
- **Action:** Call the parser multiple times with the same input.
- **Expected:** Each call returns the same result. No network requests, DOM mutations outside the return value, or global state changes occur.

## TC-08 — AppFooter: contains navigation link to /mentions-legales

- **Precondition:** `AppFooter.vue` is mounted.
- **Action:** Inspect the rendered DOM.
- **Expected:** A `<a>` (or `<RouterLink>`) element with `href="/mentions-legales"` (or `to="/mentions-legales"`) is present.

## TC-09 — StationManager: station table is collapsed by default

- **Precondition:** `StationManager.vue` is mounted with a non-empty station list.
- **Action:** Inspect the rendered DOM before any user interaction.
- **Expected:** A `<details>` element wrapping the station table exists and does not have the `open` attribute. The station table content is not visible by default.

## TC-10 — StationManager: station table expands on user interaction

- **Precondition:** `StationManager.vue` is mounted. The `<details>` element is closed.
- **Action:** The user clicks the `<summary>` element.
- **Expected:** The `<details>` element gains the `open` attribute and the station table becomes visible.

## TC-11 — Home page: displays an `<h1>` with the app name

- **Precondition:** The home page (`index.vue`) is mounted.
- **Action:** Inspect the rendered DOM.
- **Expected:** Exactly one `<h1>` element is present, containing the text "Coup de pompe".

## TC-12 — French labels: StationManagerTable column headers are in French

- **Precondition:** `StationManagerTable.vue` is mounted with at least one station.
- **Action:** Inspect the rendered column headers.
- **Expected:** Column headers display "Nom" and "URL" (no English equivalents such as "Name").

## TC-13 — French labels: StationPrices section heading is in French

- **Precondition:** `StationPrices.vue` is mounted.
- **Action:** Inspect the rendered heading text.
- **Expected:** The section heading does not contain the English word "Prices"; it uses the French equivalent.

status: ready
