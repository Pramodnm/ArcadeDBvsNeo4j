<#
.SYNOPSIS
    Automated Hot Backup for ArcadeDB on Windows / PowerShell
#>
[CmdletBinding()]
param(
    [string]$HostUrl = "http://localhost:2480",
    [string]$Username = "root",
    [string]$Password = "arcadepassword",
    [string]$Database = "EnterpriseTopology",
    [string]$BackupDir = ".\data\backups"
)

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFile = Join-Path (Resolve-Path -Path ".").Path "$BackupDir\${Database}_backup_${Timestamp}.zip"

if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

$AuthHeader = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${Username}:${Password}"))
$NormalizedPath = $BackupFile.Replace("\", "/")

Write-Host "[INFO] Initiating ArcadeDB Hot Backup for '$Database'..." -ForegroundColor Cyan
Write-Host "[INFO] Destination: $NormalizedPath" -ForegroundColor Cyan

$Body = @{
    language = "sql"
    command  = "BACKUP DATABASE file://${NormalizedPath}"
} | ConvertTo-Json

try {
    $Response = Invoke-RestMethod -Uri "$HostUrl/api/v1/command/$Database" -Method Post -Headers @{ Authorization = $AuthHeader; "Content-Type" = "application/json" } -Body $Body
    Write-Host "[SUCCESS] Hot Backup completed successfully!" -ForegroundColor Green
    Write-Host ($Response | ConvertTo-Json -Depth 5) -ForegroundColor Gray
} catch {
    Write-Error "Backup failed: $_"
}
