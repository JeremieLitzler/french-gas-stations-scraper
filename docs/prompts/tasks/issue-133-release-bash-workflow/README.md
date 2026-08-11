Worktree: E:/Git/GitHub/french-gas-stations-scraper_feat-release-bash-workflow

# Issue #133: Update release workflow to use `release.sh`

Using https://github.com/JeremieLitzler/semantic-release-script-testing/blob/main/release.sh, add a new `.github/workflows/release-bash.yml` workflow to use the release script and trigger it on successfull merge between a source and a target branch.

To multiple PR, let's set the source branch and target branch to be two temporary branches push to remote.

Then the source branch will become `develop` and the target branch will be `main`.

Also take into account that `develop` and `main` are protected branches.
