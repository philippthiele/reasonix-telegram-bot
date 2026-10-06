# Stops the test bot, the Reasonix instances it started and the stand's proxies.
#
# Deliberately narrow: it only touches processes that provably belong to the
# test setup.
#   - Reasonix: the instances recorded in the stand's own
#     .tmp\e2e\home\run\reasonix-instances.json. Another bot's instances are untouched.
#   - Bot: node processes whose pid appears in a log file name inside
#     .tmp/e2e/home/logs. A production bot started from the same dist/ writes to
#     a different home, so it is not matched.
#   - Fault proxy: the node process named in .tmp/e2e/fault-proxy/proxy.pid,
#     only if its command line runs fault-proxy.mjs.
#   - Forward proxy: the node process named in .tmp/e2e/forward-proxy/proxy.pid,
#     only if its command line runs forward-proxy.mjs.
#
# Usage:
#   .\e2e\stop-test-bot.ps1

[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$testHome = Join-Path $projectRoot ".tmp\e2e\home"
$logsDir = Join-Path $testHome "logs"
$proxyPidFile = Join-Path $projectRoot ".tmp\e2e\fault-proxy\proxy.pid"
$forwardPidFile = Join-Path $projectRoot ".tmp\e2e\forward-proxy\proxy.pid"

# --- Reasonix instances ---------------------------------------------------

# Ports the stand's bot actually started, from the instance state it persisted.
# Anything else listening on 47610-47809 belongs to another bot and is untouched.
$instancesFile = Join-Path $testHome "run\reasonix-instances.json"
$ports = @()
if (Test-Path $instancesFile) {
    try {
        $state = Get-Content $instancesFile -Raw | ConvertFrom-Json
        $ports = @($state.PSObject.Properties.Value | ForEach-Object { [int]$_.port })
    } catch {
        Write-Warning "  could not read $instancesFile: $($_.Exception.Message)"
    }
}

if ($ports.Count -eq 0) {
    Write-Host "No Reasonix instances recorded in $instancesFile"
} else {
    Write-Host "Reasonix ports from instance state: $($ports -join ' ')"
}

foreach ($port in $ports) {
    $listener = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $listener) {
        Write-Host "  nothing listening on $port"
        continue
    }
    $instPid = $listener.OwningProcess
    $instProc = Get-Process -Id $instPid -ErrorAction SilentlyContinue
    Write-Host "  stopping reasonix serve on $port : PID $instPid ($($instProc.ProcessName))"
    try {
        Stop-Process -Id $instPid -Force -ErrorAction Stop
        Write-Host "  stopped"
    } catch {
        Write-Warning "  failed to stop PID ${instPid}: $($_.Exception.Message)"
    }
}

# --- Test bot -------------------------------------------------------------

$loggedPids = @()
if (Test-Path $logsDir) {
    $loggedPids = Get-ChildItem $logsDir -Filter "bot-*.log" -ErrorAction SilentlyContinue |
        ForEach-Object { if ($_.Name -match '_(\d+)\.log$') { [int]$Matches[1] } } |
        Select-Object -Unique
}

Write-Host "Test bot pids seen in $logsDir : $($loggedPids.Count)"

$stopped = 0
foreach ($botPid in $loggedPids) {
    $proc = Get-CimInstance Win32_Process -Filter "ProcessId=$botPid" -ErrorAction SilentlyContinue
    if (-not $proc) { continue }
    if ($proc.Name -ne "node.exe") { continue }
    if ($proc.CommandLine -notlike "*dist\index.js*") { continue }

    Write-Host "  stopping bot: PID $botPid"
    try {
        Stop-Process -Id $botPid -Force -ErrorAction Stop
        $stopped++
        Write-Host "  stopped"
    } catch {
        Write-Warning "  failed to stop PID ${botPid}: $($_.Exception.Message)"
    }
}

if ($stopped -eq 0) {
    Write-Host "  no running test bot found"
}

# --- Fault proxy and forward proxy ----------------------------------------

function Stop-TestProxy([string]$pidFile, [string]$scriptName, [string]$label) {
    $proxyStopped = $false
    if (Test-Path $pidFile) {
        $proxyPid = [int](Get-Content $pidFile -Raw).Trim()
        $proc = Get-CimInstance Win32_Process -Filter "ProcessId=$proxyPid" -ErrorAction SilentlyContinue
        if ($proc -and $proc.Name -eq "node.exe" -and $proc.CommandLine -like "*$scriptName*") {
            Write-Host "  stopping ${label}: PID $proxyPid"
            try {
                Stop-Process -Id $proxyPid -Force -ErrorAction Stop
                $proxyStopped = $true
                Write-Host "  stopped"
            } catch {
                Write-Warning "  failed to stop PID ${proxyPid}: $($_.Exception.Message)"
            }
        }
        Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
    }

    if (-not $proxyStopped) {
        Write-Host "  no $label running"
    }
}

Stop-TestProxy $proxyPidFile "fault-proxy.mjs" "fault proxy"
Stop-TestProxy $forwardPidFile "forward-proxy.mjs" "forward proxy"

# --- Result ---------------------------------------------------------------

Start-Sleep -Milliseconds 500
$still = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
Write-Host ""
if ($still) {
    Write-Warning "Port $port is still in use."
} else {
    Write-Host "Port $port is free."
}
