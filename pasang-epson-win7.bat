@echo off
REM === Pasang pintasan DMS Manual untuk Epson LX-310 (Windows 7 + Chrome) ===
REM Pintasan ini membuka situs sebagai jendela aplikasi dan mencetak langsung
REM ke printer DEFAULT Windows tanpa dialog (--kiosk-printing).
set "PRINTER=EPSON LX-310 ESC/P"
set "URL=https://web189.github.io/E-Book/#/dms-manual"
set "CH=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not exist "%CH%" set "CH=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not exist "%CH%" (echo Chrome tidak ditemukan. & pause & exit /b 1)
rundll32 printui.dll,PrintUIEntry /y /n "%PRINTER%"
powershell -NoProfile -Command "$s=(New-Object -COM WScript.Shell).CreateShortcut($env:USERPROFILE+'\Desktop\DMS Manual (Epson).lnk'); $s.TargetPath='%CH%'; $s.Arguments='--app=%URL% --kiosk-printing'; $s.IconLocation='%CH%,0'; $s.Save()"
echo Selesai. Pintasan "DMS Manual (Epson)" ada di Desktop.
echo Jika nama printer berbeda, ubah baris PRINTER di berkas ini lalu jalankan lagi.
pause
