---
name: rotate-history-pat
description: Rotate the HISTORY_GITHUB_PAT fine-grained token used by the scheduled price-history Netlify function of french-gas-stations-scraper (ADR-014) end to end - set it in Netlify, redeploy production, and verify GitHub accepts it. Use whenever the user says they regenerated, renewed, rotated or changed the history PAT, mentions a 401 or "GitHub read failed with status 401" from scheduled-price-history, wants to update HISTORY_GITHUB_PAT, or asks what to do after the PAT expires, even if they never say "redeploy".
---

# rotate-history-pat

A regenerated PAT only reaches the scheduled function after it is saved in Netlify AND the site is redeployed. Forgetting the redeploy caused the 401s of issue #174 (2026-09-18 and 2026-10-17), so this skill does the whole sequence in one go and proves the result.

## Why PowerShell, not Git Bash

Git Bash rewrites arguments that look like paths (MSYS path conversion) and mangles quoting around JSON, which breaks `netlify api --data '{...}'`. Windows PowerShell 5.1 also strips the quotes of JSON passed to native programs, so the script escapes them first. The bundled script runs in PowerShell, where neither happens. Always run it through `powershell`, never `bash`.

## Steps

1. Check prerequisites: `netlify status` must show a logged-in user. If not, ask the user to run `! netlify login` (interactive, so Claude cannot do it). `gh` is not needed for the script, which verifies with an in-process HTTPS call so the token never lands on a command line.
2. Ask the user to run the script themselves from the repo root (any worktree) with the `!` prefix, so the hidden token prompt works in their terminal and the token never enters the conversation:

   ```
   ! powershell -NoProfile -ExecutionPolicy Bypass -File .claude/skills/rotate-history-pat/scripts/rotate.ps1
   ```

   Never ask the user to paste the token into chat, and never put it in a command Claude runs.
3. The script then: reads the PAT as a hidden SecureString and trims it; sets `HISTORY_GITHUB_PAT` for the production context on site `coup-de-pompe` (keeping the variable's existing scopes, and secret); triggers a production build through the Netlify API and polls until the deploy is `ready` (fails loudly on `error`); reads `HISTORY_GITHUB_OWNER` and `HISTORY_GITHUB_REPO` from Netlify through the API and calls the GitHub Contents API for `history.csv` with the token.
4. Interpret the result: HTTP 200 or 404 means GitHub accepts the token (404 only means `history.csv` does not exist yet). 401 means the token value itself is wrong, so regenerate it and copy it again (GitHub shows it once). 403 or a 404 on the repo with a valid token means the PAT lacks Contents read/write on that repository.
5. If the user wants proof end to end, the next scheduled run is 19:00 UTC; its log will show success or GitHub's reason (issue #174 made the error message explicit).

## Notes

- The token is briefly visible as an argument of the `netlify env:set` process on this machine. Acceptable for a personal machine; the Netlify CLI offers no stdin option.
- The script never writes the token to disk or prints it.
- Defaults (site, owner/repo source) are at the top of `scripts/rotate.ps1`; pass `-Site` to override.
- Reference: `docs/decisions/ADR-014-scheduled-function-pat-auth.md`, PAT Setup Guide steps 7-9.
