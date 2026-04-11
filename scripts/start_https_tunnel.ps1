param(
    [int]$Port = 5000
)

$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

Write-Host "Starting HTTPS tunnel for localhost:$Port ..." -ForegroundColor Cyan
Write-Host "If prompted by npx, approve installing localtunnel." -ForegroundColor Yellow
npx localtunnel --port $Port
