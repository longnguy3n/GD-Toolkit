# Actual installation is restricted to disposable GitHub-hosted CI runners.
$ErrorActionPreference = 'Stop'
if ($env:GITHUB_ACTIONS -ne 'true' -or $env:RUNNER_ENVIRONMENT -ne 'github-hosted') {
  throw 'Installer smoke test must only run on a disposable GitHub-hosted runner.'
}
$version = (Get-Content -LiteralPath (Join-Path $PSScriptRoot '../package.json') | ConvertFrom-Json).version
$installer = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "../releases/GD-Toolkit-Setup-$version-x64.exe")).Path
$destination = Join-Path $env:RUNNER_TEMP 'GDToolkit Update Smoke'
$appPath = Join-Path $destination 'GDToolkit.exe'
# Match the OLD updater's arguments deliberately: no /S. The new installer
# must suppress its own UI and honor --force-run after installation.
# NSIS requires /D last and unquoted, even when the path contains spaces.
$process = Start-Process -FilePath $installer -ArgumentList @('--updated', '--force-run', "/D=$destination") -PassThru -WindowStyle Hidden
$deadline = (Get-Date).AddSeconds(120)
try {
  while (-not $process.HasExited) {
    $process.Refresh()
    if ($process.MainWindowHandle -ne 0) { throw 'Update installer displayed a wizard window.' }
    if ((Get-Date) -gt $deadline) { throw 'Silent update timed out.' }
    Start-Sleep -Milliseconds 250
  }
  $process.WaitForExit()
  if ($process.ExitCode -ne 0) { throw "Installer exit code: $($process.ExitCode)" }
  if (-not (Test-Path -LiteralPath $appPath)) { throw 'Installed app executable missing.' }
  $deadline = (Get-Date).AddSeconds(30)
  do {
    $runningApp = @(Get-Process -Name GDToolkit -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq $appPath -and $_.MainWindowHandle -ne 0 })
    if ($runningApp.Count -gt 0) { break }
    Start-Sleep -Milliseconds 250
  } while ((Get-Date) -lt $deadline)
  if ($runningApp.Count -eq 0) { throw 'App did not automatically reopen after update.' }
  Write-Output 'PASS silent update: legacy updater arguments, no installer wizard, app reopened automatically.'
} finally {
  Get-Process -Name GDToolkit -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq $appPath } | Stop-Process -Force
  if (-not $process.HasExited) { Stop-Process -Id $process.Id -Force }
}
