# Security Guidelines — Issue #110: UI and UX improvements

## Rules

1. **Compute the new field-level diff (added/removed stations, per-field old → new values) only
   from data that has already passed existing validation — the remote file content validated
   per `issue-64/security-guidelines.md` rule 8, and local station name/URL values validated by
   `preferencesImport.ts`'s validators before they ever reach IndexedDB. Never build a diff row
   from raw, not-yet-validated fetched text.**
   - Where: the diff-computation logic feeding `PreferencesDiffDialog.vue`'s write-confirm
     section, and the `RemoteWritePreview` type change in `src/types/preferences.ts`.
   - Why: this is a new code path; sourcing it from unvalidated text instead of the already-
     validated values would reopen the injection surface `issue-64` rule 8 closed.

2. **Keep every value shown in the rebuilt write-confirm template — old and new — rendered
   through Vue's default text interpolation, never `v-html` or raw DOM insertion.**
   - Where: `PreferencesDiffDialog.vue` write-confirm section (currently `<pre>` blocks, being
     replaced with per-field rows).
   - Why: `issue-64` rule 8 established this for the same component; rewriting its template is
     exactly the kind of change that regresses an established rule if not re-verified.

3. **The bundled changes the user reviews in the confirmation dialog must be the exact snapshot
   sent in the GitHub `PUT` — no recomputation of pending changes between "Confirmer l'envoi"
   and the request.**
   - Where: the pending-write state introduced for batching (extends `useRemotePreferencesWrite`'s
     existing single-snapshot `pendingWrite` pattern to cover multiple bundled edits).
   - Why: batching several edits into one push widens the window between "user reviews" and
     "request is sent" compared to the current single-edit flow; without a frozen snapshot, a
     late-arriving local change could be written to the user's repository without ever being
     shown in the dialog they approved.

status: ready
