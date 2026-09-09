# Grilling round v04 — Grill the Docs, Phase 1

## Settled in v03

- **Q11 — Slug-only folders.** `docs/features/<slug>/README.md`, no number in the path. The feature number lives in `CONTEXT.md`'s ordered list and in each README's H1.
- **Q12 — Template (b): index + captured rules.** Each feature README carries: a one-paragraph purpose, a bullet list of the implementing code (components, composables, utils, Netlify functions), links to related ADRs, and a "Behaviour & rules" section restating in prose the rules worth keeping (validation rules, visibility matrices, fallback logic, cross-feature triggers). Test-case tables, file lists and `security-guidelines.md` / `technical-specifications.md` are not carried over.
- **Q13 — `CONTEXT.md` at the repo root**, a peer of `CLAUDE.md`.
- **Q14 — `CONTEXT.md` = feature map + pointers only.** The nine features with one-line descriptions and links to their `docs/features/` folders, plus the short "non-product work" section from Q10. It does not restate the stack, architecture or data flow — `CLAUDE.md` already carries those. The one open sub-part, whether it also carries a glossary, is Q15.
- **F6, F7, F9, F10, F11 — accepted.** In particular F11: PR 1 (feature docs + `CONTEXT.md`) is committed on `docs/grill-the-docs`; PR 2 (deletion of the 29 `issue-*` folders, keeping the `issue-[id]-[slug…]` template) is a fresh branch off `develop`, opened only after PR 1 merges and you confirm the extraction.

## Reopened

- **F8 — station edit error handling.** Your v03 note: _"If any validation error occurs, it is better to leave the typed value and inform user."_ F8 as written is accurate to what is built — I re-checked the code (`StationManagerTable.vue:180-227`): a failed name or URL blur calls `revertDraftName` / `revertDraftUrl`, which overwrite the field with the original value; the typed text is discarded and the inline error is shown. So the finding stands as a description of today's behaviour, but you are describing a behaviour you would prefer. Q16 settles what the doc records and whether the preference becomes an issue.

---

## Q15 - Does `CONTEXT.md` carry a glossary

Your Q14 answer picked (a) but asked: _"+ app's glossary unless it exists in the feature's Markdown?"_ The project does have a cross-feature vocabulary — "preferences file", "pending change", "known / derived fuel types", "favorite station", "default fuel type", "diff dialog", "OAuth session vs PAT" each span two or more features. `CLAUDE.md` defines the _type_ names (`Station`, `FuelPrice`, `StationData`) but not these behavioural terms.

a. **No standalone glossary.** Each term is defined inline in the first feature README that uses it (the Q12 (b) "Behaviour & rules" prose already does this naturally). `CONTEXT.md` stays exactly as Q14 (a) describes.
b. **Glossary section at the foot of `CONTEXT.md`.** A short "Terms" list defining the cross-feature vocabulary once. Feature READMEs use the terms freely and link back to it instead of redefining.
c. **Dedicated `docs/glossary.md`.** Same content as (b), its own file, linked from both `CONTEXT.md` and `CLAUDE.md`.

➡️ Recommendation: (b). The terms that need pinning are precisely the ones that span features, so defining them inline (a) means the same term explained three slightly different ways — the drift Q14 exists to prevent. A separate file (c) is one more place to look for a list short enough to sit at the bottom of the one orientation doc every contributor already opens. Feature READMEs still define anything _local_ to that feature inline.

### Answer to Q15

(b)

---

## Q16 - What the Feature 5 doc records about edit-error handling, and the gap

F8 (reopened above) is what the code does today: typed value discarded, field reverted, inline error shown. You would prefer the typed value to stay so the user can fix it. This grilling documents the app as it is; changing the behaviour is separate work.

a. **Document as-built, open an issue for the change.** The Feature 5 README's "Behaviour & rules" section records the revert-on-error behaviour as it exists, with a one-line "Known limitation" note, and this session runs `/create-gh-issue` for the preferred behaviour (keep the typed value, show the error, do not persist until valid).
b. **Document as-built only.** Record the revert-on-error behaviour with no note and no issue; you will raise the change yourself later if you still want it.
c. **Treat it as a defect to fix in this branch.** Out of scope for a docs reorganization, but stated for completeness.

➡️ Recommendation: (a). The feature doc has to match the running app or it misleads the next reader, so the revert behaviour gets written down regardless. But a "seems off" reaction from you is exactly the signal an issue exists to capture, and filing it now while the context is loaded costs almost nothing. (c) mixes a behaviour change into a reorganization whose PR 2 is already an irreversible deletion — two kinds of risk in one review.

### Answer to Q16

(a)
