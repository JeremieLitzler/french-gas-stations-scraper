# Rotates HISTORY_GITHUB_PAT end to end (ADR-014): set in Netlify, redeploy
# production, verify GitHub accepts the token. Never prints or stores the token.
param(
  [string]$Site = 'coup-de-pompe',
  [int]$TimeoutMinutes = 10
)

$ErrorActionPreference = 'Stop'

function Fail([string]$Message) {
  Write-Host "ERROR: $Message" -ForegroundColor Red
  exit 1
}

function Invoke-NetlifyJson([string[]]$CliArgs) {
  $output = & netlify @CliArgs
  if ($LASTEXITCODE -ne 0) { Fail "netlify $($CliArgs[0]) failed." }
  return ($output -join "`n") | ConvertFrom-Json
}

# --- 0. Prerequisites -------------------------------------------------------
if (-not (Get-Command netlify -ErrorAction SilentlyContinue)) { Fail 'netlify CLI not found. Install it: npm i -g netlify-cli' }
& netlify status | Out-Null
if ($LASTEXITCODE -ne 0) { Fail 'Not logged in to Netlify. Run: netlify login' }

$siteInfo = Invoke-NetlifyJson @('api', 'getSite', '--data', (@{ site_id = "$Site.netlify.app" } | ConvertTo-Json -Compress))
$siteId = $siteInfo.id
if (-not $siteId) { Fail "Site '$Site' not found." }
Write-Host "Site: $($siteInfo.name) ($siteId)"

# --- 1. Read the PAT without echo -------------------------------------------
$secure = Read-Host -AsSecureString 'Paste the new HISTORY_GITHUB_PAT (hidden)'
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try { $pat = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr).Trim() }
finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
if (-not $pat) { Fail 'Empty token.' }
if ($pat -notmatch '^(github_pat_|ghp_)[A-Za-z0-9_]+$') { Fail 'Value does not look like a GitHub PAT (expected github_pat_... or ghp_...).' }

# --- 2. Set it in Netlify (production context, Functions scope) -------------
& netlify env:set HISTORY_GITHUB_PAT $pat --context production --scope functions --site $siteId --force | Out-Null
if ($LASTEXITCODE -ne 0) { Fail 'netlify env:set failed.' }
Write-Host 'HISTORY_GITHUB_PAT updated (production, functions).'

# --- 3. Redeploy production and wait -----------------------------------------
$build = Invoke-NetlifyJson @('api', 'createSiteBuild', '--data', (@{ site_id = $siteId; clear_cache = $false } | ConvertTo-Json -Compress))
$deployId = $build.deploy_id
if (-not $deployId) { Fail 'Build triggered but no deploy id returned.' }
Write-Host "Build triggered (deploy $deployId). Waiting..."

$deadline = (Get-Date).AddMinutes($TimeoutMinutes)
do {
  Start-Sleep -Seconds 10
  $deploy = Invoke-NetlifyJson @('api', 'getDeploy', '--data', (@{ deploy_id = $deployId } | ConvertTo-Json -Compress))
  Write-Host "  state: $($deploy.state)"
  if ($deploy.state -eq 'error') { Fail "Deploy failed: $($deploy.error_message)" }
} until ($deploy.state -eq 'ready' -or (Get-Date) -gt $deadline)
if ($deploy.state -ne 'ready') { Fail "Deploy not ready after $TimeoutMinutes minutes (last state: $($deploy.state))." }
Write-Host 'Deploy ready.'

# --- 4. Verify the token against the history repo ----------------------------
$owner = (& netlify env:get HISTORY_GITHUB_OWNER --context production --site $siteId | Out-String).Trim()
$repo = (& netlify env:get HISTORY_GITHUB_REPO --context production --site $siteId | Out-String).Trim()
if (-not $owner -or -not $repo) { Fail 'Could not read HISTORY_GITHUB_OWNER / HISTORY_GITHUB_REPO from Netlify.' }

$uri = "https://api.github.com/repos/$([uri]::EscapeDataString($owner))/$([uri]::EscapeDataString($repo))/contents/history.csv"
$headers = @{ Authorization = "Bearer $pat"; Accept = 'application/vnd.github+json'; 'User-Agent' = 'rotate-history-pat' }
try {
  $status = (Invoke-WebRequest -Uri $uri -Headers $headers -UseBasicParsing).StatusCode
} catch {
  if ($_.Exception.Response) { $status = [int]$_.Exception.Response.StatusCode } else { Fail "GitHub request failed: $($_.Exception.Message)" }
}
$pat = $null

switch ($status) {
  200 { Write-Host "OK: GitHub accepts the token ($owner/$repo, history.csv found)." -ForegroundColor Green }
  404 { Write-Host "OK: GitHub accepts the token ($owner/$repo; history.csv does not exist yet)." -ForegroundColor Green }
  401 { Fail 'GitHub returned 401: the token value is wrong. Regenerate it, copy it again, and re-run.' }
  403 { Fail 'GitHub returned 403: the token lacks Contents read/write on this repository.' }
  default { Fail "Unexpected GitHub status $status." }
}
