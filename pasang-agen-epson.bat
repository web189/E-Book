@echo off
REM === Pasang agen cetak DMS (sekali saja) — agar tombol "Cetak ke Epson" langsung memakai huruf asli printer ===
set "D=%APPDATA%\DMS-Agen"
mkdir "%D%" 2>nul
copy /y "%~dp0agen-cetak-epson.ps1" "%D%\" >nul
powershell -NoProfile -Command "$s=(New-Object -COM WScript.Shell).CreateShortcut($env:APPDATA+'\Microsoft\Windows\Start Menu\Programs\Startup\DMS Agen Cetak.lnk'); $s.TargetPath='powershell.exe'; $s.Arguments='-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File \"%D%\agen-cetak-epson.ps1\"'; $s.WindowStyle=7; $s.Save()"
start "" powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%D%\agen-cetak-epson.ps1"
echo Agen cetak terpasang dan akan jalan otomatis tiap Windows menyala.
echo Buka website, halaman DMS Manual: status harus "Agen cetak: tersambung".
pause
