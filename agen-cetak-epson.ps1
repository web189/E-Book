# Agen cetak lokal DMS Manual: menerima data ESC/P dari website lalu mengirimnya MENTAH ke printer Windows.
# Berjalan di http://localhost:9101 (hanya bisa diakses dari PC ini). Windows 7 / PowerShell 2 kompatibel.
param([int]$Port = 9101, [switch]$Test, [string]$Printer = "EPSON LX-310 ESC/P (Copy 1)")
Add-Type -AssemblyName System.Drawing
Add-Type -TypeDefinition @'
using System; using System.Runtime.InteropServices;
public class RawPrn {
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Ansi)]
  public class DOCINFOA { [MarshalAs(UnmanagedType.LPStr)] public string pDocName; [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile; [MarshalAs(UnmanagedType.LPStr)] public string pDataType; }
  [DllImport("winspool.Drv", EntryPoint="OpenPrinterA", SetLastError=true, CharSet=CharSet.Ansi, ExactSpelling=true)]
  public static extern bool OpenPrinter([MarshalAs(UnmanagedType.LPStr)] string szPrinter, out IntPtr hPrinter, IntPtr pd);
  [DllImport("winspool.Drv", EntryPoint="ClosePrinter", SetLastError=true, ExactSpelling=true)]
  public static extern bool ClosePrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", EntryPoint="StartDocPrinterA", SetLastError=true, CharSet=CharSet.Ansi, ExactSpelling=true)]
  public static extern bool StartDocPrinter(IntPtr hPrinter, Int32 level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);
  [DllImport("winspool.Drv", EntryPoint="EndDocPrinter", SetLastError=true, ExactSpelling=true)]
  public static extern bool EndDocPrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", EntryPoint="StartPagePrinter", SetLastError=true, ExactSpelling=true)]
  public static extern bool StartPagePrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", EntryPoint="EndPagePrinter", SetLastError=true, ExactSpelling=true)]
  public static extern bool EndPagePrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", EntryPoint="WritePrinter", SetLastError=true, ExactSpelling=true)]
  public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, Int32 dwCount, out Int32 dwWritten);
  public static string Send(string printer, byte[] data) {
    IntPtr h;
    if (!OpenPrinter(printer, out h, IntPtr.Zero)) return "Printer tidak ditemukan: " + printer + " (kode Windows " + Marshal.GetLastWin32Error() + ")";
    DOCINFOA di = new DOCINFOA(); di.pDocName = "DMS Manual"; di.pDataType = "RAW";
    string err = null;
    if (StartDocPrinter(h, 1, di)) {
      if (StartPagePrinter(h)) {
        IntPtr p = Marshal.AllocCoTaskMem(data.Length); Marshal.Copy(data, 0, p, data.Length); int w;
        if (!WritePrinter(h, p, data.Length, out w)) err = "WritePrinter gagal (kode Windows " + Marshal.GetLastWin32Error() + ")";
        Marshal.FreeCoTaskMem(p); EndPagePrinter(h);
      } else { err = "StartPage gagal (kode Windows " + Marshal.GetLastWin32Error() + ")"; }
      EndDocPrinter(h);
    } else { err = "StartDoc gagal (kode Windows " + Marshal.GetLastWin32Error() + ")"; }
    ClosePrinter(h); return err;
  }
}
'@
$LogFile = Join-Path $env:APPDATA "DMS-Agen\agen.log"
function Log($m) { try { Add-Content -Path $LogFile -Value ((Get-Date).ToString("s") + " " + $m) } catch {} }
$script:PCache = @{}
# Printer "dipaku": bila %APPDATA%\DMS-Agen\printer.txt ada, SEMUA cetakan dikirim ke printer itu (diabaikan nama dari website) dan agen TIDAK menebak printer LX-310 lain.
# Dibuat oleh pilih-printer-epson.bat. Penting bila di daftar ada beberapa Epson milik PC lain.
$script:Pin = $null
function Get-Pinned() {
  $f = Join-Path $env:APPDATA "DMS-Agen\printer.txt"
  $script:Pin = $null
  try { if (Test-Path $f) { $t = (Get-Content -Path $f | Select-Object -First 1); if ($t -and $t.Trim()) { $script:Pin = $t.Trim() } } } catch {}
  return $script:Pin
}
$script:PList = $null; $script:PListT = [DateTime]::MinValue
function Get-Printers() {
  # Daftar printer dicache 60 detik: mengenumerasi printer jaringan (mis. Brother di PC lain) bisa lambat.
  if (($script:PList -eq $null) -or (((Get-Date) - $script:PListT).TotalSeconds -gt 60)) {
    $script:PList = [System.Drawing.Printing.PrinterSettings]::InstalledPrinters; $script:PListT = Get-Date
  }
  return $script:PList
}
function Resolve-Printer($name) {
  if ($name -and $script:PCache.ContainsKey($name)) { return $script:PCache[$name] }
  $key = $name
  $all = Get-Printers
  if (-not $name) { $name = (New-Object System.Drawing.Printing.PrinterSettings).PrinterName }
  if ($all -contains $name) { $script:PCache[$key] = $name; return $name }
  $m = $null
  foreach ($pn in $all) { if (-not $m -and ($pn -like ($name + "*"))) { $m = $pn } }
  if (-not $script:Pin) { foreach ($pn in $all) { if (-not $m -and ($pn -like "*LX-310*")) { $m = $pn } } }
  if ($m) { if ($key) { $script:PCache[$key] = $m }; return $m } else { return $name }
}
# Kirim ke printer; bila GAGAL (mis. printer lokal rusak/offline) dan tidak ada printer "dipaku", coba SATU-SATUNYA sambungan jaringan
# yang berakhiran nama yang sama persis (mis. \\PC-01\EPSON LX-310 ESC/P (Copy 1)). Bila ada 0 atau lebih dari 1 kandidat, tidak menebak.
function Send-Smart($name, $data) {
  $err = [RawPrn]::Send($name, $data)
  if (-not $err) { return $null }
  if ($script:Pin) { return $err }
  $cand = @()
  foreach ($pn in (Get-Printers)) { if ($pn.StartsWith("\\") -and $pn.EndsWith("\" + $name) -and ($pn -ne $name)) { $cand += $pn } }
  if ($cand.Count -eq 1) {
    $e2 = [RawPrn]::Send($cand[0], $data)
    if (-not $e2) { $script:PCache[$name] = $cand[0]; Log ("dialihkan dari '" + $name + "' ke '" + $cand[0] + "'"); return $null }
    return ($err + " | cadangan " + $cand[0] + ": " + $e2)
  }
  return $err
}
if ($Test) {
  # Cetak form tes (22 baris, 17 cpi, tebal) langsung ke printer: memeriksa jalur cetak tanpa website.
  $pin = Get-Pinned; if ($pin) { $Printer = $pin }
  $name = Resolve-Printer $Printer
  $enc = [System.Text.Encoding]::ASCII
  $b = New-Object System.Collections.ArrayList
  [void]$b.AddRange([byte[]](27,64,27,120,0,15,27,51,36,27,67,0,22,27,69,27,108,6))
  $dash = "-" * 120
  $ruler = ("1234567890" * 12)
  $lines = @("", ((" " * 45) + "BUKTI KELUAR BARANG (TES AGEN)"), "AGEN CETAK DMS MANUAL : TERSAMBUNG", ("PRINTER        : " + $name), "KERTAS         : FORM MENERUS 9,5 X 3 2/3 IN = 22 BARIS", ("WAKTU          : " + (Get-Date).ToString("dd/MM/yyyy HH:mm")), "", $dash, $ruler, $dash, "BARIS 11", "BARIS 12", "BARIS 13", "BARIS 14", "BARIS 15", "BARIS 16", $dash, "Keterangan : Putih Sales, Merah Adm Gudang, Kuning Checker, Hijau Security", "         DIINPUT OLEH,", "", "", "( TES SELESAI - BARIS 22 )")
  foreach ($ln in $lines) { [void]$b.AddRange($enc.GetBytes($ln)); [void]$b.AddRange([byte[]](13,10)) }
  [void]$b.AddRange([byte[]](27,64))   # reset printer ke keadaan normal agar cetakan DMS tidak terpengaruh
  $err = (Send-Smart $name ([byte[]]$b.ToArray([byte])))
  if ($err) { Write-Host ("GAGAL: " + $err); Log ("tes gagal: " + $err); exit 1 } else { Write-Host ("Form tes dikirim ke: " + $name); Log ("tes ok: " + $name); exit 0 }
}
$allowed = @("https://web189.github.io", "http://localhost", "http://127.0.0.1", "null")
# Origin yang boleh memanggil agen: website resmi, localhost (port apa pun), file lokal ("null"), dan alamat jaringan LAN
# (IP 10.x / 192.168.x / 172.16-31.x atau nama komputer tanpa titik, mis. http://SERVER-DB). Situs internet lain tetap ditolak.
function Test-Origin($o) {
  if (-not $o) { return $true }
  if ($allowed -contains $o) { return $true }
  if ($o -match '^https?://([^/:]+)(:[0-9]+)?$') {
    $h = $Matches[1].ToLower()
    if ($h -eq "localhost" -or $h -eq "127.0.0.1") { return $true }
    if ($h -match '^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)') { return $true }
    if ($h -notmatch '\.') { return $true }
  }
  return $false
}
function Reply($rs, $code, $text) {
  $b = [System.Text.Encoding]::UTF8.GetBytes($text)
  $rs.StatusCode = $code; $rs.ContentType = "text/plain; charset=utf-8"
  $rs.ContentLength64 = $b.Length; $rs.OutputStream.Write($b, 0, $b.Length)
}
$l = New-Object System.Net.HttpListener
$l.Prefixes.Add("http://localhost:$Port/")
try { $l.Start() } catch { Log ("gagal start: " + $_.Exception.Message); exit 1 }
Log ("agen aktif port " + $Port + " pin=" + (Get-Pinned))
while ($l.IsListening) {
  $c = $l.GetContext(); $rq = $c.Request; $rs = $c.Response
  try {
    $o = $rq.Headers["Origin"]
    $path = $rq.Url.AbsolutePath
    if (-not (Test-Origin $o)) { Log ("DITOLAK origin: " + $o + " path: " + $path); Reply $rs 403 ("Origin ditolak: " + $o) }
    else {
      if ($o) { $rs.AddHeader("Access-Control-Allow-Origin", $o) }
      $rs.AddHeader("Access-Control-Allow-Headers", "Content-Type")
      $rs.AddHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
      $rs.AddHeader("Access-Control-Allow-Private-Network", "true")
      if ($rq.HttpMethod -eq "OPTIONS") { $rs.StatusCode = 204 }
      elseif ($path -eq "/ping") { Reply $rs 200 "OK" }
      elseif ($path -eq "/printers") { Reply $rs 200 ([string]::Join("`n", (Get-Printers))) }
      elseif ($path -eq "/print" -and $rq.HttpMethod -eq "POST") {
        Log ("terima /print dari origin: " + $o)
        $buf = New-Object byte[] 8192; $ms = New-Object System.IO.MemoryStream
        while (($n = $rq.InputStream.Read($buf, 0, $buf.Length)) -gt 0) { $ms.Write($buf, 0, $n) }
        $sw = [System.Diagnostics.Stopwatch]::StartNew()
        $name = $rq.QueryString["printer"]
        $pin = Get-Pinned; if ($pin) { $name = $pin }
        if (-not $name) { $name = (New-Object System.Drawing.Printing.PrinterSettings).PrinterName }
        $data = $ms.ToArray()
        # Pengaman: setiap pekerjaan DIAKHIRI reset printer (ESC @) bila belum, supaya mode tebal/condensed/panjang halaman tidak tertinggal.
        if (($data.Length -lt 2) -or ($data[$data.Length - 2] -ne 27) -or ($data[$data.Length - 1] -ne 64)) { $data = $data + [byte[]](27,64) }
        if ($script:PCache.ContainsKey($name)) { $name = $script:PCache[$name] }
        $err = (Send-Smart $name $data)
        if ($err -and ($err -like "Printer tidak ditemukan*")) { $name = Resolve-Printer $name; $err = (Send-Smart $name $data) }
        if ($script:PCache.ContainsKey($name)) { $name = $script:PCache[$name] }
        Log ("print " + $data.Length + " byte ke '" + $name + "' = " + $sw.ElapsedMilliseconds + " ms" + $(if ($err) { " GAGAL: " + $err } else { "" }))
        if ($err) { Reply $rs 500 $err } else { Reply $rs 200 ("OK " + $sw.ElapsedMilliseconds + " ms") }
      }
      else { Reply $rs 404 "Tidak ada" }
    }
  } catch { try { Reply $rs 500 $_.Exception.Message } catch {} }
  finally { try { $rs.Close() } catch {} }
}
