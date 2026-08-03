$ErrorActionPreference = "Stop"

# Postavke
$ProjectRoot = $PSScriptRoot
$ExeSource = Join-Path $ProjectRoot "frontend\src-tauri\target\release\thr_autouploader.exe"
$BackendSource = Join-Path $ProjectRoot "backend"

# Konfiguracija
$TauriConfPath = Join-Path $ProjectRoot "frontend\src-tauri\tauri.conf.json"
$TauriConf = Get-Content -Raw -Path $TauriConfPath | ConvertFrom-Json
$ReleaseVersion = "1.4.0"
$DesktopPath = [Environment]::GetFolderPath("Desktop")
$TempReleaseFolder = Join-Path $DesktopPath "THRuploader_$ReleaseVersion"
$OutZip = Join-Path $DesktopPath "THRuploader_v$($ReleaseVersion)_Portable.zip"

Write-Host "Pripremam Portable Release (v$ReleaseVersion)..." -ForegroundColor Cyan

# 1. Čišćenje starih temp datoteka ako postoje
if (Test-Path $TempReleaseFolder) { Remove-Item -Path $TempReleaseFolder -Recurse -Force }
if (Test-Path $OutZip) { Remove-Item -Path $OutZip -Force }

# 2. Kreiranje privremenog foldera za izdanje
New-Item -ItemType Directory -Path $TempReleaseFolder | Out-Null

# 3. Kopiranje izvršne datoteke (.exe)
if (Test-Path $ExeSource) {
    Write-Host "Kopiram thr_autouploader.exe..." -ForegroundColor Green
    Copy-Item -Path $ExeSource -Destination $TempReleaseFolder -Force
} else {
    Write-Error "GRESKA: Ne mogu pronaci $ExeSource! Moras prvo odraditi build u Tauriju."
}

# 4. Kopiranje backend foldera
Write-Host "Kopiram backend folder..." -ForegroundColor Green
Copy-Item -Path $BackendSource -Destination "$TempReleaseFolder\backend" -Recurse -Force

# 5. Čišćenje backenda u temp folderu od osobnih podataka, cachea i tajni
$ItemsToRemove = @(
    "$TempReleaseFolder\backend\data\config.py",
    "$TempReleaseFolder\backend\data\gui_settings.json",
    "$TempReleaseFolder\backend\__pycache__",
    "$TempReleaseFolder\backend\src\__pycache__",
    "$TempReleaseFolder\backend\data\__pycache__",
    "$TempReleaseFolder\backend\cogs\__pycache__",
    "$TempReleaseFolder\backend\build",
    "$TempReleaseFolder\backend\tmp\*",
    "$TempReleaseFolder\backend\Torrents\*",
    "$TempReleaseFolder\backend\.env",
    "$TempReleaseFolder\backend\*.log",
    "$TempReleaseFolder\backend\data\*.db",
    "$TempReleaseFolder\backend\data\*.sqlite"
)

foreach ($item in $ItemsToRemove) {
    if (Test-Path $item) {
        Write-Host "Brisem osjetljive/cache podatke: $item" -ForegroundColor Yellow
        Remove-Item -Path $item -Recurse -Force
    }
}

# 6. Zippanje u čisti public ZIP
Write-Host "Zippam portable aplikaciju u $OutZip..." -ForegroundColor Cyan
Set-Location $DesktopPath
tar.exe -a -c -f $OutZip "THRuploader_$ReleaseVersion"

# 7. Brisanje temp foldera
Remove-Item -Path $TempReleaseFolder -Recurse -Force

Write-Host "GOTOVO! Cisti prijenosni ZIP je spreman na tvom Desktopu: $OutZip" -ForegroundColor Green
