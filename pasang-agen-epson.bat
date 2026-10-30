@echo off
title Pasang Agen Cetak DMS
REM Pasang agen cetak DMS (sekali saja). Agen mengirim cetakan MENTAH ke printer Windows, sama seperti DMS.
set "D=%APPDATA%\DMS-Agen"
mkdir "%D%" 2>nul
if not exist "%~dp0agen-cetak-epson.ps1" goto NOFILE
copy /y "%~dp0agen-cetak-epson.ps1" "%D%\" >nul
echo [1/4] Menghentikan agen lama (bila ada)...
wmic process where "name='powershell.exe' and commandline like '%%agen-cetak-epson%%'" call terminate >nul 2>&1
echo [2/4] Membuat auto-start saat Windows menyala...
powershell -NoProfile -Command "$s=(New-Object -COM WScript.Shell).CreateShortcut($env:APPDATA+'\Microsoft\Windows\Start Menu\Programs\Startup\DMS Agen Cetak.lnk'); $s.TargetPath='powershell.exe'; $s.Arguments='-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File \"%D%\agen-cetak-epson.ps1\"'; $s.WindowStyle=7; $s.Save()"
echo [3/4] Menjalankan agen...
start "" powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%D%\agen-cetak-epson.ps1"
ping -n 5 127.0.0.1 >nul
echo [4/4] Memeriksa agen...
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $w=New-Object Net.WebClient; $null=$w.DownloadString('http://localhost:9101/ping'); $p=$w.DownloadString('http://localhost:9101/printers'); Write-Host 'BERHASIL: agen aktif.'; Write-Host 'Printer terdaftar di PC ini:'; foreach ($x in $p.Split([char]10)) { if ($x) { Write-Host ('   - ' + $x) } }; exit 0 } catch { Write-Host ('GAGAL: ' + $_.Exception.Message); exit 1 }"
if errorlevel 1 goto FAIL
echo.
echo Pastikan di daftar di atas ada: EPSON LX-310 ESC/P (Copy 1)
echo.
set /p T=Cetak form tes ke Epson sekarang? Ketik Y lalu Enter (N untuk lewati): 
if /i "%T%"=="Y" powershell -NoProfile -ExecutionPolicy Bypass -File "%D%\agen-cetak-epson.ps1" -Test
echo.
echo Bila tes GAGAL (mis. "StartDoc gagal") atau form keluar di printer yang salah: jalankan pilih-printer-epson.bat di folder ini.
echo.
echo Selesai. Buka website DMS Manual: status harus "Agen cetak: tersambung".
pause
exit /b 0
:NOFILE
echo GAGAL: berkas agen-cetak-epson.ps1 harus berada di folder yang sama dengan berkas ini.
pause
exit /b 1
:FAIL
echo.
echo Agen tidak bisa dijalankan. Kemungkinan: antivirus/firewall memblokir PowerShell, atau port 9101 dipakai program lain.
echo Catatan kesalahan ada di: %D%\agen.log
pause
exit /b 1
