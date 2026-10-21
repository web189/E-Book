@echo off
REM === Pasang 2 pintasan DMS Manual (Windows 7 + Chrome) ===
REM Tiap pintasan menjadikan printernya DEFAULT lalu membuka Chrome dengan
REM --kiosk-printing, sehingga tombol Cetak langsung mencetak tanpa dialog.
REM Tutup jendela aplikasi lebih dulu sebelum membuka pintasan printer lain.
REM Ubah nama printer di bawah sesuai nama di Control Panel > Devices and Printers.
set "EPSON=EPSON LX-310 ESC/P"
set "TERMAL=POS-80"
set "URL=https://web189.github.io/E-Book/#/dms-manual"
set "CH=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not exist "%CH%" set "CH=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not exist "%CH%" (echo Chrome tidak ditemukan. & pause & exit /b 1)
powershell -NoProfile -Command "$w=New-Object -COM WScript.Shell; foreach($p in @(@('DMS Manual (Epson)','%EPSON%'),@('DMS Manual (Termal)','%TERMAL%'))){ $s=$w.CreateShortcut($env:USERPROFILE+'\Desktop\'+$p[0]+'.lnk'); $s.TargetPath=$env:ComSpec; $s.Arguments='/c rundll32 printui.dll,PrintUIEntry /y /n \"'+$p[1]+'\" & start \"\" \"%CH%\" --app=%URL% --kiosk-printing'; $s.WindowStyle=7; $s.IconLocation='%CH%,0'; $s.Save() }"
echo Selesai. Pintasan "DMS Manual (Epson)" dan "DMS Manual (Termal)" ada di Desktop.
pause
