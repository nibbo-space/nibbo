param(
  [string]$DumpPath = "$env:USERPROFILE\dump-neondb-202604120209.sql"
)

$ErrorActionPreference = "Stop"
$composeRoot = Split-Path -Parent $PSScriptRoot

if (-not (Test-Path $DumpPath)) {
  Write-Error "Dump not found: $DumpPath"
}

$resolved = (Resolve-Path $DumpPath).Path

Push-Location $composeRoot
try {
  docker compose up -d db
  $deadline = (Get-Date).AddMinutes(2)
  do {
    docker compose exec -T db pg_isready -U homecrm -d homecrm 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) { break }
    Start-Sleep -Seconds 1
  } while ((Get-Date) -lt $deadline)

  docker compose cp -- "$resolved" "db:/tmp/neon-restore.dump"

  docker compose exec -T db pg_restore `
    -U homecrm `
    -d homecrm `
    --clean --if-exists `
    --no-owner --no-acl `
    --verbose `
    /tmp/neon-restore.dump

  docker compose exec -T db rm -f /tmp/neon-restore.dump
}
finally {
  Pop-Location
}
