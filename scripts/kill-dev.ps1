# Kill this project's next dev processes (including the start-server child),
# then wait until the port is really free.
#
# IMPORTANT: keep this file ASCII-only.
# Windows PowerShell 5.1 reads .ps1 as ANSI when there is no UTF-8 BOM, so
# non-ASCII characters (e.g. Chinese comments) can corrupt parsing and produce
# bogus "unexpected }" parser errors. Chinese output lives in the Node wrapper.
#
# Usage:
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/kill-dev.ps1 -Port 3000

param(
  [int]$Port = 3000,
  [string]$ProjectName = 'ai-guide-site'
)

$ErrorActionPreference = 'SilentlyContinue'

# 1) processes listening on the port
$portOwners = @()
$portOwners += Get-NetTCPConnection -LocalPort $Port -State Listen | Select-Object -ExpandProperty OwningProcess

# 2) node processes of this project (parent + child + preview server)
$pathMatches = @()
$pathMatches += Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" |
  Where-Object { $_.CommandLine -like "*$ProjectName*" } |
  Select-Object -ExpandProperty ProcessId

$targets = @($portOwners + $pathMatches | Where-Object { $_ -and $_ -ne $PID } | Sort-Object -Unique)

if ($targets.Count -eq 0) {
  Write-Output 'no-dev-process'
}
else {
  foreach ($t in $targets) {
    try {
      Stop-Process -Id $t -Force
      Write-Output "killed $t"
    }
    catch {
      Write-Output "failed $t"
    }
  }
}

# 3) wait until the port is free (covers IPv4 and IPv6)
for ($i = 0; $i -lt 30; $i++) {
  $still = Get-NetTCPConnection -LocalPort $Port -State Listen
  if (-not $still) {
    Write-Output 'port-free'
    exit 0
  }
  Start-Sleep -Milliseconds 500
}

Write-Output 'port-still-in-use'
exit 1