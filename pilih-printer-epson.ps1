# Memilih printer Epson yang dipakai agen DMS di PC ini (dipaku di %APPDATA%\DMS-Agen\printer.txt).
Add-Type -AssemblyName System.Drawing
$D = Join-Path $env:APPDATA "DMS-Agen"
if (-not (Test-Path $D)) { New-Item -ItemType Directory -Path $D | Out-Null }
$pin = Join-Path $D "printer.txt"
$all = @([System.Drawing.Printing.PrinterSettings]::InstalledPrinters)
Write-Host ""
Write-Host "Printer yang terdaftar di PC ini:"
for ($i = 0; $i -lt $all.Count; $i++) { Write-Host ("  {0,2}. {1}" -f ($i + 1), $all[$i]) }
Write-Host ""
if (Test-Path $pin) { Write-Host ("Pilihan saat ini: " + (Get-Content $pin | Select-Object -First 1)) }
Write-Host "Pilih printer Epson yang BENAR-BENAR tersambung ke mesin (biasanya diawali \\NAMA-KOMPUTER-01\ bila mesin ada di komputer lain)."
Write-Host "Jangan pilih milik komputer lain (mis. ADMIN-PC) karena form akan keluar di sana."
$t = Read-Host "Ketik nomornya lalu Enter (0 = hapus pilihan, kosong = batal)"
if (-not $t) { exit 0 }
$n = 0
if (-not [int]::TryParse($t, [ref]$n)) { Write-Host "Nomor tidak valid."; exit 1 }
if ($n -eq 0) { Remove-Item $pin -ErrorAction SilentlyContinue; Write-Host "Pilihan dihapus."; exit 0 }
if ($n -lt 1 -or $n -gt $all.Count) { Write-Host "Nomor di luar daftar."; exit 1 }
$name = [string]$all[$n - 1]
[System.IO.File]::WriteAllText($pin, $name, [System.Text.Encoding]::ASCII)
Write-Host ("Tersimpan: " + $name)
$a = Join-Path $D "agen-cetak-epson.ps1"
if (-not (Test-Path $a)) { Write-Host "Agen belum terpasang. Jalankan pasang-agen-epson.bat dulu."; exit 0 }
$y = Read-Host "Cetak form tes ke printer ini sekarang? Y lalu Enter (N untuk lewati)"
if ($y -eq "Y" -or $y -eq "y") { & powershell -NoProfile -ExecutionPolicy Bypass -File $a -Test }
