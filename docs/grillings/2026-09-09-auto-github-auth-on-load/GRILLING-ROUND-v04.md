# Grilling round v04 — Auto-trigger GitHub auth on page load (issue #158)

## Settled in v03

- **Q11b — Duplicate strip.** Hide the `ACCESS_REVOKED_MESSAGE` amber strip in the template while the reconnect notice is visible; `syncError` is still set in the composable. (Your answer, "I understand now > A", was written as a `##` heading; I read it as (a).)
- **Q15 — Component.** One `GitHubReconnectNotice.vue` with `countdown` and `fallback` states, emitting `cancel`, `reconnect`, `dismiss`.
- **Q15b — Countdown copy.** Static "Votre session GitHub a expiré. Reconnexion automatique dans 2 secondes…", "Annuler" button, `role="status"`, no focus move.
- **Q16 — Counter timing.** Incremented when the countdown starts.
- **Q17 — Dismissal.** "×" button (`aria-label="Masquer"`) in `fallback` only; in-memory for the page session; banner returns on next load.

The frontier is empty. Everything is written up in `GRILLING-SUMMARY.md` in this folder.

---

## Q18 - Does `GRILLING-SUMMARY.md` match your understanding?

Read the prose, the decision index, the paste-ready section for #158, and especially **"Not grilled, decided while writing this"** (where the logic lives, leaving the page during the countdown, the `/?auth=error` landing, counter values).

Corrections edit `GRILLING-SUMMARY.md` in place. A new round opens only if a correction reopens a real decision.

➡️ Recommendation: yes, the summary matches, including the four assumptions at the end.

### Answer to Q18

Yes
