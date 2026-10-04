<#
.SYNOPSIS
    Automated Restore for ArcadeDB on Windows / PowerShell
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)]
    [string]$BackupZipPath,
    [string]$HostUrl = "http://localhost:2480",
    [string]$Username = "root",
    [string]$Password = "arcadepassword",
    [string]$TargetDatabase = "EnterpriseTopology_Restored"
)

if (-not (Test-Path $BackupZipPath)) {
    Write-Error "Backup file '$BackupZipPath' not found."
    exit 1
}

$AuthHeader = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${Username}:${Password}"))
$NormalizedPath = (Resolve-Path $BackupZipPath).Path.Replace("\", "/")

Write-Host "[INFO] Restoring database '$TargetDatabase' from '$NormalizedPath'..." -ForegroundColor Cyan

$Body = @{
    command = "RESTORE DATABASE $TargetDatabase FROM file://${NormalizedPath}"
} | ConvertTo-Json

try {
    $Response = Invoke-RestMethod -Uri "$HostUrl/api/v1/server" -Method Post -Headers @{ Authorization = $AuthHeader; "Content-Type" = "application/json" } -Body $Body
    Write-Host "[SUCCESS] Database restored successfully!" -ForegroundColor Green
    Write-Host ($Response | ConvertTo-Json -Depth 5) -ForegroundColor Gray
} catch {
    Write-Error "Restore failed: $_"
}
