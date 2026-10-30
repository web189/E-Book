@echo off
title Pilih Printer Epson untuk Agen DMS
REM Jalankan SETELAH pasang-agen-epson.bat. Memaku printer Epson yang dipakai agen di PC ini.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0pilih-printer-epson.ps1"
echo.
pause
