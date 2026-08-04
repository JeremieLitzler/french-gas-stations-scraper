# Test Cases — Issue #110: UI and UX improvements

## Settings page mobile layout

1. On a mobile-width viewport, while unauthenticated: the "Enregistrer les paramètres" button
   and the "Se connecter avec GitHub" button are stacked one above the other, each spanning the
   full width of the section.
2. On a mobile-width viewport, while authenticated: the "Enregistrer la fréquence" button and
   the "Se déconnecter" button are stacked one above the other, each full width.
3. On a wider (tablet/desktop) viewport, in both the authenticated and unauthenticated states:
   the two buttons remain side by side, as before this change.

## "Enregistrer les modifications" button visibility

4. On loading the station list with no local changes made yet: the "Enregistrer les
   modifications" button is not shown.
5. After editing an existing station's name and moving focus away: the button becomes visible.
6. After editing an existing station's URL and moving focus away: the button becomes visible.
7. After adding a new station (name and URL filled in and confirmed): the button becomes
   visible.
8. After deleting a station from the list: the button becomes visible.
9. After editing two different stations one after another, without clicking the button in
   between: the button is (and stays) visible after each edit — it does not disappear or
   flicker between the two edits.
10. Editing a station while GitHub sync is not configured or the user is not authenticated: the
    button still becomes visible for the local change, consistent with the existing
    unauthenticated no-op behaviour of the GitHub push itself.

## Saving via the button (batching and outcomes)

11. With two pending edits (e.g. one renamed station and one newly added station), clicking
    "Enregistrer les modifications": a single confirmation dialog opens showing both changes
    together — not two separate dialogs and not one push per edit.
12. Confirming the dialog and the GitHub write succeeds: the confirmation dialog closes, the
    "Enregistrer les modifications" button becomes hidden again, and a success indication is
    shown.
13. Cancelling the confirmation dialog instead of confirming: the pending changes are kept
    locally, and the "Enregistrer les modifications" button remains visible so the user can
    retry later.
14. The GitHub write fails (e.g. network error or API failure) after confirming: an error
    message is shown, the pending changes are kept, and the "Enregistrer les modifications"
    button remains visible.
15. No remote preferences file exists yet in the configured repository: clicking "Enregistrer
    les modifications" creates the file directly with the pending changes (no confirmation
    dialog, matching the existing create-on-first-write behaviour) and the button becomes
    hidden again once it succeeds.
16. After a successful save, editing another station afterwards: the "Enregistrer les
    modifications" button becomes visible again for the new, separate pending change.

## GitHub diff screen readability

17. Only one field (e.g. a station's name) was changed since the last save: the confirmation
    dialog shows just that field's old value and new value — it does not show the full station
    list or raw file content.
18. A station was added since the last save: the confirmation dialog lists it as an added
    station, identified by name — not as raw JSON.
19. A station was removed since the last save: the confirmation dialog lists it as a removed
    station, identified by name.
20. Several different kinds of changes happened in the same batch (one station added, one
    renamed, one removed): the confirmation dialog lists each change as its own entry, all
    together in one dialog.

## Regression: unaffected flows

21. Changing the default fuel type (from the price table page, not the station list) still
    pushes to GitHub immediately on change, without needing or being affected by the
    "Enregistrer les modifications" button.

status: ready
