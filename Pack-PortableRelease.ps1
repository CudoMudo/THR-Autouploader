$ErrorActionPreference = "Stop"

# Postavke
$ProjectRoot = $PSScriptRoot
$ExeSource = Join-Path $ProjectRoot "frontend\src-tauri\target\release\thr_autouploader.exe"
$BackendSource = Join-Path $ProjectRoot "backend"

# Konfiguracija
$ReleaseVersion = "1.3"
$SourceDir = "C:\Users\STRiT\Desktop\THRuploader"
$DesktopPath = [Environment]::GetFolderPath("Desktop")
$TempReleaseFolder = "$DesktopPath\THRuploader_$ReleaseVersion"
$OutZip = "$DesktopPath\THRuploader_v$($ReleaseVersion)_Portable.zip"

Write-Host "Pripremam Portable Release..." -ForegroundColor Cyan

# 1. Čišćenje starih temp datoteka ako postoje
if (Test-Path $TempReleaseFolder) { Remove-Item -Path $TempReleaseFolder -Recurse -Force }
if (Test-Path $OutZip) { Remove-Item -Path $OutZip -Force }

# 2. Kreiranje foldera THRuploader_1.2
New-Item -ItemType Directory -Path $TempReleaseFolder | Out-Null

# 3. Kopiranje izvršne datoteke (.exe)
if (Test-Path $ExeSource) {
    Write-Host "Kopiram thr_autouploader.exe..."
    Copy-Item -Path $ExeSource -Destination $TempReleaseFolder -Force
} else {
    Write-Error "GRESKA: Ne mogu pronaci $ExeSource! Moras prvo odraditi build u Tauriju."
}

# 4. Kopiranje backend foldera
Write-Host "Kopiram backend folder..."
Copy-Item -Path $BackendSource -Destination "$TempReleaseFolder\backend" -Recurse -Force

# 5. Čišćenje backenda u temp folderu od osobnih podataka i bloata
$ItemsToRemove = @(
    "$TempReleaseFolder\backend\data\config.py",
    "$TempReleaseFolder\backend\data\gui_settings.json",
    "$TempReleaseFolder\backend\__pycache__",
    "$TempReleaseFolder\backend\src\__pycache__",
    "$TempReleaseFolder\backend\data\__pycache__",
    "$TempReleaseFolder\backend\cogs\__pycache__",
    "$TempReleaseFolder\backend\dist",
    "$TempReleaseFolder\backend\build",
    "$TempReleaseFolder\backend\tmp\*",
    "$TempReleaseFolder\backend\Torrents\*"
)

foreach ($item in $ItemsToRemove) {
    if (Test-Path $item) {
        Write-Host "Brisem osjetljive/cache podatke: $item" -ForegroundColor Yellow
        Remove-Item -Path $item -Recurse -Force
    }
}

# 6. Zippanje u čisti public ZIP
Write-Host "Zippam portable aplikaciju u $OutZip..." -ForegroundColor Cyan
# Koristimo Compress-Archive. Pakiramo cijeli folder (bez \*) kako bi unutar ZIP-a postojao glavni krovni direktorij
Compress-Archive -Path $TempReleaseFolder -DestinationPath $OutZip -Force

# 7. Brisanje temp foldera
Remove-Item -Path $TempReleaseFolder -Recurse -Force

Write-Host "GOTOVO! Cisti prijenosni ZIP je spreman na tvom Desktopu: $OutZip" -ForegroundColor Green
