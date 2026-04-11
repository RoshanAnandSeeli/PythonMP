param(
    [int]$Port = 5000
)

$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

Write-Host "Starting Flask app on port $Port..." -ForegroundColor Cyan
python -u webapp/app.py
