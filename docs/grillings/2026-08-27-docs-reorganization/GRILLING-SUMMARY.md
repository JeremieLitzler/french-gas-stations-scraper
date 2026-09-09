# Grilling summary — Grill the Docs, Phase 1

Session: `docs/grillings/2026-08-27-docs-reorganization/` — rounds v01–v06, branch `docs/grill-the-docs`.

## 1. What was decided and why

### The problem

`docs/prompts/tasks/` holds 29 per-issue folders for shipped, CLOSED GitHub issues plus one `issue-[id]-[slug…]` template the pipeline still uses. The shipped folders are pipeline scratch — `business-specifications.md`, `technical-specifications.md`, `test-cases.md`, `review-results.md` and so on — and nothing in the repo reads them once an issue merges. There is no document that tells a reader what the app actually does. This work removes the stale folders and replaces them with a feature-oriented doc structure.

### The shape we landed on

**The pipeline is left alone.** `docs/prompts/tasks/` stays the working directory for new issues; no `.claude/commands/jli-*.md` file is touched. Relocating the pipeline's artifact directory would be a `/jli-tweaks-command-chain` change, not part of a docs reorganization (Q1).

**Features are reverse-engineered before the folders are deleted, in this same session.** The knowledge in the shipped `business-specifications.md` files is extracted into a new `docs/features/` tree first; the folders are deleted only afterwards, and only after the extraction has been reviewed (Q2, Q6, Q6b). Git history remains the backstop for anything not carried over.

**The feature list is the user's, not the assistant's first proposal.** A nine-feature taxonomy, challenged only against `docs/prompts/tasks/**/business-specifications.md` and no other Markdown (Q3). The assistant's original six-feature list is dropped. The gap at Feature 8 was real — it is the daily price history, which has its own spec, its own ADR (ADR-014), its own auth model (a fixed fine-grained PAT, not the browser OAuth session), and runs on a schedule whether or not anyone opens the app. It writes into the same GitHub repo Feature 2 owns, so leaving it out would document the sync story with a hole (Q5). Every `business-specifications.md` in the repo maps to one of the nine features or to the non-product bucket — nothing else is hiding in the specs (F9).

**The nine features:**

1. **GitHub Auth** — OAuth login/logout via the `github-auth-start` / `github-auth-callback` / `github-auth-logout` Netlify functions, plus the component to be extracted from `GitHubSyncSettings.vue`. Owns the repo-configuration form too: three fields — `owner/repo`, preferences file path, `revalidate-cache-days` — that must all be valid before the login button enables, and that lock once authenticated. The config is a precondition of login, so it belongs to auth, not to storage (Q8, F3).
2. **Reading and storing the preferences** — the preferences payload is the default fuel type plus the favorite stations (`{ name, url }`). Unauthenticated: IndexedDB only, one device. Authenticated: read from the configured GitHub preferences file, then mirrored into IndexedDB. Consumes an already-resolved repo config from Feature 1.
3. **Scraping the station data** — on page load, the `fetch-page` Netlify function fetches each favorite station's HTML from `prix-carburants.gouv.fr` and returns structured fuel type / price JSON.
4. **List of fuel types** — the fuel-type list is derived as stations are scraped. When scraping finishes, the user's stored default fuel type is auto-selected. No default stored: the first-encountered type is selected. Default stored but absent from the derived list: fall back to first-available, leave the stored default untouched (F7). Second rule, exercised from Feature 9's import: an imported `fuelTypeDefault` is checked against the fuel types actually offered by the merged station list; unrecognised, it is discarded, the stored value kept, and a French warning shown; `null` always passes (F10).
5. **Managing favorite stations** — add / edit / delete in an inline table. Validation, identical for add and edit: name not empty (whitespace counts as empty), URL starts with `https://www.prix-carburants.gouv.fr/station/`, no duplicate URL in another row. Edits auto-save on blur straight to IndexedDB; delete is immediate with no confirmation dialog. There is no diff screen on the edit itself — the diff dialog belongs to the push-to-GitHub step (Q7). Today a failed-validation blur discards the typed value and reverts the field; that is recorded as a known limitation and a follow-up issue is filed for the preferred behaviour — keep the typed value, show the error, do not persist until valid (Q16).
6. **Displaying the favorite station fuel prices** — once every station is scraped, the price table renders for the selected fuel type, using the same default-selection rule as Feature 4 (F7). Rows are sorted ascending by price, cheapest first; a station that does not carry the selected fuel type shows a dash and sorts to the bottom, keeping its relative order (`issue-19`).
7. **Synchronize from GitHub preference file** — a "refresh from remote" action, shown only when GitHub sync is fully configured and the user is authenticated; visible-but-disabled-with-an-explanatory-message when local station edits have not been pushed (deliberately not hidden, so the reason stays discoverable) (Q9).
8. **Daily price history** — a scheduled Netlify function, ~21:00 French local, authenticating with a fixed fine-grained PAT held as a Netlify env var (ADR-014, explicitly not the OAuth session), scraping every favorite station and appending to `history.csv` in the same repo Feature 2 writes to (Q5).
9. **Export / Import to and from JSON files** — kept for users who do not use GitHub storage. Import shares the `PreferencesDiffDialog` with Feature 7's push confirmation (F5); import logic per `issue-63`.

Non-product work stays where it already lives (Q10): release automation (`release.sh`, ADR-004, ADR-015), CI/build config, UI/UX polish passes, and the foundational ADRs (001, 002, 003, 005, 007, 009, 010, 013). Not all ADRs are feature-agnostic — ADR-006, ADR-011, ADR-012, ADR-014 are feature-tied — which is why "index only" is the stronger choice: those would otherwise have to be split out (F2).

### The output structure

- **`docs/features/<slug>/README.md>`** per feature — slug-only folder names, no number in the path (Q11). Each README: a one-paragraph purpose, a bullet list of the implementing code (components, composables, utils, Netlify functions), links to the related ADRs, and a "Behaviour & rules" section restating the rules worth keeping in prose — validation rules, visibility matrices, fallback logic, cross-feature triggers (Q12, template (b)). No test-case tables, no file-modification lists, no `security-guidelines.md` / `technical-specifications.md` carryover — git history keeps those.
- **`CONTEXT.md` at the repo root**, a peer of `CLAUDE.md` (Q13). Contents: the nine-feature map with one-line descriptions and links into `docs/features/`; a short "non-product work" section linking `docs/decisions/` and the root scripts (Q10, Q14); and a glossary section at the foot defining the cross-feature vocabulary once — "preferences file", "pending change", "known / derived fuel types", "favorite station", "default fuel type", "diff dialog", "OAuth session vs PAT" — which feature READMEs link back to instead of redefining (Q15). It does not restate the stack, architecture or data flow; `CLAUDE.md` already carries those (Q14).
- **ADRs are not moved; `docs/specs/` is deleted.** `docs/decisions/` stays exactly as it is; feature READMEs link out to the relevant ADRs (Q4). `docs/specs/` is four empty stubs (one H1 each, no body), so PR 1 deletes it and fixes its three referrers in the same PR: drop the `docs/specs/` bullet from `CLAUDE.md`'s Documentation section, reword `CLAUDE.md`'s "Spec-first" rule to point at `docs/features/` and the per-issue `business-specifications.md` that still exist for active issues, and update `docs/prompts/task-template.md`. The `jli-*` command files do not reference it (Q18).

### Delivery

Two PRs (Q6b, F11):

- **PR 1** on `docs/grill-the-docs` — the nine `docs/features/<slug>/README.md`; `CONTEXT.md`; the `docs/specs/` deletion plus its three referrer edits (Q18); and two follow-up issues filed via `/create-gh-issue`: the Q16 one (Feature 5 keep-typed-value behaviour) and the Q19 one (whether the `jli-*` command chain should reference `docs/features/` and `CONTEXT.md` as spec inputs).
- **PR 2** on a fresh branch off `develop`, opened only after PR 1 is merged and the extraction confirmed — deletes the 29 shipped `issue-*` folders, keeps the `issue-[id]-[slug…]` template. This is the irreversible half, isolated behind review.

There is no PR 3 — the `jli-*` question is one of the two follow-up issues above, not a PR in this stream (Q19).

## 2. Decision index

- Q1 — v01 — Cleanup only; the pipeline keeps `docs/prompts/tasks/` and no `.claude/` file changes.
- Q2 — v01 — Reverse-engineer features into `docs/features/`, then delete the shipped folders.
- Q3 — v01 — Adopt the user's nine-feature list, challenged only against `**/business-specifications.md`; it lands in `CONTEXT.md`.
- Q4 — v01 — Index only: ADRs and specs stay put; feature folders link out. (Spec half amended by Q18.)
- Q5 — v02 — Feature 8 = Daily price history; numbering gap closed.
- Q6 — v02 — Grill, then write in this same session (feature docs, `CONTEXT.md`, folder deletion).
- Q6b — v02 — Two PRs: docs first, deletion second after review.
- Q7 — v02 — Feature 5 edits/deletes are immediate and local; the diff dialog is the push-to-GitHub step, shared with Feature 9.
- Q8 — v02 — Feature 1 owns auth and the repo-config form; Feature 2 consumes a resolved config.
- Q9 — v02 — Feature 7 trigger as spec'd: hidden when unconfigured/unauthenticated, visible-but-disabled-with-message when edits are pending.
- Q10 — v02 — `docs/features/` is user-facing features only; non-product work stays put, `CONTEXT.md` links to it.
- Q11 — v03 — Slug-only feature folders; the number lives in `CONTEXT.md` and the README H1.
- Q12 — v03 — Feature README template (b): purpose + implementing code + ADR links + "Behaviour & rules" prose.
- Q13 — v03 — `CONTEXT.md` at the repo root.
- Q14 — v03 — `CONTEXT.md` = feature map + pointers only; no stack/architecture restatement.
- Q15 — v04 — A glossary section at the foot of `CONTEXT.md` for the cross-feature vocabulary.
- Q16 — v04 — Document the Feature 5 revert-on-error behaviour as-built with a known-limitation note; file a GH issue for the preferred behaviour.
- Q17 — v05 — Summary confirmed with corrections: Feature 9 slug > `file-export-import`, Feature 6 sort rule added, plus the two reopens below.
- Q18 — v06 — Delete `docs/specs/` (four empty stubs) in PR 1 and fix its three referrers in the same PR.
- Q19 — v06 — The `jli-*` / `docs/features/` question is a GitHub issue filed during PR 1, not a third PR.

Findings accepted as stated: F1–F7, F9–F11. F8 was reopened in v04 over the revert-on-error behaviour and resolved by Q16 — the finding's description of today's behaviour stands.

Superseded: Q4's spec-handling half — "specs stay put" is replaced by Q18 (`docs/specs/` is deleted). Q4's ADR half stands. Every other decision above is live.

## Decided but never grilled — object before it is written

- **The nine folder slugs.** Working set: `github-auth`, `preferences-storage`, `station-scraping`, `fuel-types`, `station-management`, `price-display`, `sync-from-github`, `daily-price-history`, `file-export-import`. Say if any should read differently.
- **The exact ADR-to-feature link list.** F2 pinned ADR-006 to scraping, ADR-011 to auth, ADR-012 to preferences/sync, ADR-014 to price history. The rest (ADR-007, 008, 009, 013 and any others) will be assigned per feature during writing, each verified against the ADR's own text. Flag if you want that list agreed up front instead.
- **`CONTEXT.md` non-product section granularity.** Planned as a short list of links to `docs/decisions/README.md` and the root release scripts — not a per-item description.
- **The two follow-up issues' exact title/body.** Filed via `/create-gh-issue` during PR 1. Q16: around "Feature 5: keep typed value on failed station-edit validation instead of reverting". Q19: around "Decide whether the `jli-*` command chain should reference `docs/features/` and `CONTEXT.md` as spec inputs".
- **`CLAUDE.md` "Spec-first" rewording (Q18).** The rule keeps its intent — read the relevant spec material before implementing — but the pointer changes from `docs/specs/` to `docs/features/` plus the active issues' `business-specifications.md`. Exact wording decided during PR 1.
