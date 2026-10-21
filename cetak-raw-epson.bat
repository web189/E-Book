@echo off
REM === Kirim berkas .prn (ESC/P) langsung ke Epson LX-310 = huruf asli printer ===
REM Syarat sekali saja: Devices and Printers > klik kanan EPSON LX-310 > Printer properties
REM > tab Sharing > Share this printer > isi Share name sama dengan SHARE di bawah.
set "SHARE=\\localhost\EPSONLX310"
set "F=%~1"
if "%F%"=="" for /f "delims=" %%A in ('dir /b /o-d "%USERPROFILE%\Downloads\DMS-Epson-*.prn" 2^>nul') do if not defined F set "F=%USERPROFILE%\Downloads\%%A"
if not defined F (echo Berkas DMS-Epson-*.prn tidak ditemukan di Downloads. & pause & exit /b 1)
echo Mengirim: %F%
copy /b "%F%" "%SHARE%" >nul && (echo Terkirim ke printer.) || (echo GAGAL. Cek share name printer: %SHARE%)
timeout /t 3 >nul
