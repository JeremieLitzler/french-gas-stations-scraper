# Grilling round v05 — Grill the Docs, Phase 1

## Settled in v04

- **Q15 — Glossary section at the foot of `CONTEXT.md`.** The cross-feature vocabulary is defined once there; feature READMEs use the terms and link back rather than redefining.
- **Q16 — Document the Feature 5 revert-on-error behaviour as-built**, with a one-line known-limitation note, and run `/create-gh-issue` for the preferred behaviour (keep the typed value, show the error, do not persist until valid).

The frontier is empty. `GRILLING-SUMMARY.md` is written.

---

## Q17 - Does the summary match your understanding

Read `GRILLING-SUMMARY.md`. It has three parts: a prose restatement of what was decided and why, a flat decision index (Q1–Q16), and a paste-ready block for the issue/PR. It also ends with four items that were decided-but-never-grilled — the nine folder slugs, the exact ADR-to-feature link list, the `CONTEXT.md` non-product section granularity, and where/how the Q16 follow-up issue is filed — for you to object to before anything is written.

a. **It matches** — proceed. Writing the feature docs, `CONTEXT.md` and the follow-up issue (PR 1) is a separate ask; say the word.
b. **Corrections needed** — list them. Small factual fixes edit `GRILLING-SUMMARY.md` in place with no new round; anything that reopens a real decision gets a v06.

➡️ Recommendation: (a). Every branch of the design tree was closed by an explicit answer over four rounds, the findings that corrected course (F1, F8) were folded back in, and the four never-grilled items are all downstream naming/granularity calls rather than open decisions. Object on any of those four if the planned choice is wrong — that does not need a v06 — but the decision set itself should be complete.

### Answer to Q17

Made a few comments and renamed `export-import` to `file-export-import`.
