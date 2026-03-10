# GigShield — PostgreSQL Setup & Schema Initialization Script
# Run this in PowerShell (as Administrator if winget install needed)
# Usage: cd d:\devtrails\guidewiredevhackathon && .\scripts\setup-postgres.ps1

param(
    [string]$PgUser     = "postgres",
    [string]$PgPassword = "Niggapls",
    [string]$DbName     = "gigshield",
    [string]$PgHost     = "localhost",
    [int]   $PgPort     = 5432
)

$ErrorActionPreference = "Continue"
$RepoRoot = Split-Path $PSScriptRoot -Parent

Write-Host "`n GigShield — PostgreSQL Setup" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

# ─── Helper ───────────────────────────────────────────────────────────────────
function Run-Psql {
    param([string]$SQL, [string]$Database = "postgres")
    $env:PGPASSWORD = $PgPassword
    $result = echo $SQL | & psql -U $PgUser -h $PgHost -p $PgPort -d $Database 2>&1
    return $result
}

function Run-PsqlFile {
    param([string]$FilePath, [string]$Database)
    $env:PGPASSWORD = $PgPassword
    return & psql -U $PgUser -h $PgHost -p $PgPort -d $Database -f $FilePath 2>&1
}

# ─── Step 1: Find PostgreSQL ───────────────────────────────────────────────────
Write-Host " Looking for PostgreSQL installation..." -ForegroundColor Yellow

$searchPaths = @(
    "C:\Program Files\PostgreSQL\17\bin",
    "C:\Program Files\PostgreSQL\16\bin",
    "C:\Program Files\PostgreSQL\15\bin",
    "C:\Program Files\PostgreSQL\14\bin"
)

$pgBinPath = $searchPaths | Where-Object { Test-Path "$_\psql.exe" } | Select-Object -First 1

if (-not $pgBinPath) {
    Write-Host " psql not found in standard locations." -ForegroundColor Red
    Write-Host "`nPlease install PostgreSQL:" -ForegroundColor Yellow
    Write-Host "  Option A: Download from https://www.enterprisedb.com/downloads/postgres-postgresql-downloads" -ForegroundColor White
    Write-Host "  Option B: Run as admin: winget install PostgreSQL.PostgreSQL" -ForegroundColor White
    Write-Host "`nAfter installing, re-run this script." -ForegroundColor Yellow
    Write-Host "`nAlso set the postgres password during install to: $PgPassword" -ForegroundColor Cyan
    exit 1
}

Write-Host " Found PostgreSQL at: $pgBinPath" -ForegroundColor Green
$env:PATH = "$pgBinPath;$env:PATH"

# ─── Step 2: Test connection ───────────────────────────────────────────────────
Write-Host "`n🔌 Testing PostgreSQL connection..." -ForegroundColor Yellow
$env:PGPASSWORD = $PgPassword

$testResult = & psql -U $PgUser -h $PgHost -p $PgPort -c "SELECT version()" postgres 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host " Cannot connect to PostgreSQL." -ForegroundColor Red
    Write-Host "   Error: $testResult" -ForegroundColor Red
    Write-Host "`nTroubleshooting:" -ForegroundColor Yellow
    Write-Host "  1. Start PostgreSQL service: Start-Service postgresql*" -ForegroundColor White
    Write-Host "  2. Check password: ALTER USER postgres WITH PASSWORD '$PgPassword';" -ForegroundColor White
    Write-Host "  3. Verify port 5432 is listening: netstat -an | findstr 5432" -ForegroundColor White
    exit 1
}
Write-Host " Connected to PostgreSQL" -ForegroundColor Green

# ─── Step 3: Start service if needed ──────────────────────────────────────────
$pgSvc = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($pgSvc -and $pgSvc.Status -ne "Running") {
    Write-Host " Starting PostgreSQL service..." -ForegroundColor Yellow
    Start-Service $pgSvc.Name
    Start-Sleep -Seconds 2
    Write-Host " Service started" -ForegroundColor Green
}

# ─── Step 4: Create database ───────────────────────────────────────────────────
Write-Host "`n  Setting up database '$DbName'..." -ForegroundColor Yellow
$env:PGPASSWORD = $PgPassword

$dbExists = & psql -U $PgUser -h $PgHost -p $PgPort -tAc "SELECT 1 FROM pg_database WHERE datname='$DbName'" postgres 2>&1
if ($dbExists -match "1") {
    Write-Host " Database '$DbName' already exists" -ForegroundColor Green
} else {
    & psql -U $PgUser -h $PgHost -p $PgPort -c "CREATE DATABASE $DbName" postgres
    if ($LASTEXITCODE -eq 0) {
        Write-Host " Database '$DbName' created" -ForegroundColor Green
    } else {
        Write-Host " Failed to create database" -ForegroundColor Red
        exit 1
    }
}

# ─── Step 5: Apply schema ─────────────────────────────────────────────────────
$schemaFile = Join-Path $RepoRoot "db\schema.sql"
if (Test-Path $schemaFile) {
    Write-Host "`n Applying base schema..." -ForegroundColor Yellow
    $out = & psql -U $PgUser -h $PgHost -p $PgPort -d $DbName -f $schemaFile 2>&1
    Write-Host $out
    Write-Host " Base schema applied" -ForegroundColor Green
} else {
    Write-Host "  schema.sql not found at: $schemaFile" -ForegroundColor Yellow
}

# ─── Step 6: Apply auth migration ─────────────────────────────────────────────
$migrateFile = Join-Path $RepoRoot "db\migrate.sql"
if (Test-Path $migrateFile) {
    Write-Host "`n Applying auth migration..." -ForegroundColor Yellow
    $out = & psql -U $PgUser -h $PgHost -p $PgPort -d $DbName -f $migrateFile 2>&1
    Write-Host $out
    Write-Host " Auth migration applied" -ForegroundColor Green
} else {
    Write-Host "  migrate.sql not found at: $migrateFile" -ForegroundColor Yellow
}

# ─── Step 7: Add psql to PATH permanently ────────────────────────────────────
$machinePath = [Environment]::GetEnvironmentVariable("PATH", "Machine")
if ($machinePath -notlike "*$pgBinPath*") {
    [Environment]::SetEnvironmentVariable("PATH", "$machinePath;$pgBinPath", "Machine")
    Write-Host "`n Added PostgreSQL to system PATH" -ForegroundColor Green
    Write-Host "   Restart your terminal for this to take effect." -ForegroundColor Yellow
}

# ─── Done ─────────────────────────────────────────────────────────────────────
Write-Host "`n PostgreSQL setup complete!`n" -ForegroundColor Green
Write-Host "Connection string:" -ForegroundColor White
Write-Host "  postgres://${PgUser}:${PgPassword}@${PgHost}:${PgPort}/${DbName}" -ForegroundColor Cyan
Write-Host "`nAdmin credentials:" -ForegroundColor White
Write-Host "  Email   : admin@gigshield.com" -ForegroundColor Cyan
Write-Host "  Password: admin123" -ForegroundColor Cyan
Write-Host "`nNext steps:" -ForegroundColor White
Write-Host "  cd backend && npm run dev" -ForegroundColor Cyan
