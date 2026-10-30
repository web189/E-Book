@echo off
title Cek Agen Cetak DMS
echo === Agen ===
powershell -NoProfile -Command "try { (New-Object Net.WebClient).DownloadString('http://localhost:9101/ping') } catch { 'TIDAK AKTIF: ' + $_.Exception.Message }"
echo.
echo === Printer yang dipaku (printer.txt) ===
type "%APPDATA%\DMS-Agen\printer.txt" 2>nul || echo (belum ada - jalankan pilih-printer-epson.bat)
echo.
echo.
echo === 25 baris terakhir agen.log ===
powershell -NoProfile -Command "Get-Content (Join-Path $env:APPDATA 'DMS-Agen\agen.log') | Select-Object -Last 25"
echo.
echo Setelah ini tekan Cetak di website, lalu jalankan berkas ini lagi dan lihat baris paling bawah.
pause
