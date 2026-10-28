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
    if (!OpenPrinter(printer, out h, IntPtr.Zero)) return "Printer tidak ditemukan: " + printer;
    DOCINFOA di = new DOCINFOA(); di.pDocName = "DMS Manual"; di.pDataType = "RAW";
    string err = null;
    if (StartDocPrinter(h, 1, di)) {
      if (StartPagePrinter(h)) {
        IntPtr p = Marshal.AllocCoTaskMem(data.Length); Marshal.Copy(data, 0, p, data.Length); int w;
        if (!WritePrinter(h, p, data.Length, out w)) err = "WritePrinter gagal";
        Marshal.FreeCoTaskMem(p); EndPagePrinter(h);
      } else { err = "StartPage gagal"; }
      EndDocPrinter(h);
    } else { err = "StartDoc gagal"; }
    ClosePrinter(h); return err;
  }
}
'@
$LogFile = Join-Path $env:APPDATA "DMS-Agen\agen.log"
function Log($m) { try { Add-Content -Path $LogFile -Value ((Get-Date).ToString("s") + " " + $m) } catch {} }
function Resolve-Printer($name) {
  $all = [System.Drawing.Printing.PrinterSettings]::InstalledPrinters
  if (-not $name) { $name = (New-Object System.Drawing.Printing.PrinterSettings).PrinterName }
  if ($all -contains $name) { return $name }
  $m = $null
  foreach ($pn in $all) { if (-not $m -and ($pn -like ($name + "*"))) { $m = $pn } }
  foreach ($pn in $all) { if (-not $m -and ($pn -like "*LX-310*")) { $m = $pn } }
  if ($m) { return $m } else { return $name }
}
if ($Test) {
  # Cetak form tes (22 baris, 17 cpi, tebal) langsung ke printer: memeriksa jalur cetak tanpa website.
  $name = Resolve-Printer $Printer
  $enc = [System.Text.Encoding]::ASCII
  $b = New-Object System.Collections.ArrayList
  [void]$b.AddRange([byte[]](27,64,27,120,0,15,27,51,36,27,67,0,22,27,71,27,69,27,108,6))
  $dash = "-" * 120
  $ruler = ("1234567890" * 12)
  $lines = @("", ((" " * 45) + "BUKTI KELUAR BARANG (TES AGEN)"), "AGEN CETAK DMS MANUAL : TERSAMBUNG", ("PRINTER        : " + $name), "KERTAS         : FORM MENERUS 9,5 X 3 2/3 IN = 22 BARIS", ("WAKTU          : " + (Get-Date).ToString("dd/MM/yyyy HH:mm")), "", $dash, $ruler, $dash, "BARIS 11", "BARIS 12", "BARIS 13", "BARIS 14", "BARIS 15", "BARIS 16", $dash, "Keterangan : Putih Sales, Merah Adm Gudang, Kuning Checker, Hijau Security", "         DIINPUT OLEH,", "", "", "( TES SELESAI - BARIS 22 )")
  foreach ($ln in $lines) { [void]$b.AddRange($enc.GetBytes($ln)); [void]$b.AddRange([byte[]](13,10)) }
  $err = [RawPrn]::Send($name, [byte[]]$b.ToArray([byte]))
  if ($err) { Write-Host ("GAGAL: " + $err); Log ("tes gagal: " + $err); exit 1 } else { Write-Host ("Form tes dikirim ke: " + $name); Log ("tes ok: " + $name); exit 0 }
}
$allowed = @("https://web189.github.io", "http://localhost", "http://127.0.0.1", "null")
function Reply($rs, $code, $text) {
  $b = [System.Text.Encoding]::UTF8.GetBytes($text)
  $rs.StatusCode = $code; $rs.ContentType = "text/plain; charset=utf-8"
  $rs.ContentLength64 = $b.Length; $rs.OutputStream.Write($b, 0, $b.Length)
}
$l = New-Object System.Net.HttpListener
$l.Prefixes.Add("http://localhost:$Port/")
try { $l.Start() } catch { Log ("gagal start: " + $_.Exception.Message); exit 1 }
Log ("agen aktif port " + $Port)
while ($l.IsListening) {
  $c = $l.GetContext(); $rq = $c.Request; $rs = $c.Response
  try {
    $o = $rq.Headers["Origin"]
    $path = $rq.Url.AbsolutePath
    if ($o -and ($allowed -notcontains $o)) { Reply $rs 403 "Origin ditolak" }
    else {
      if ($o) { $rs.AddHeader("Access-Control-Allow-Origin", $o) }
      $rs.AddHeader("Access-Control-Allow-Headers", "Content-Type")
      $rs.AddHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
      $rs.AddHeader("Access-Control-Allow-Private-Network", "true")
      if ($rq.HttpMethod -eq "OPTIONS") { $rs.StatusCode = 204 }
      elseif ($path -eq "/ping") { Reply $rs 200 "OK" }
      elseif ($path -eq "/printers") { Reply $rs 200 ([string]::Join("`n", [System.Drawing.Printing.PrinterSettings]::InstalledPrinters)) }
      elseif ($path -eq "/print" -and $rq.HttpMethod -eq "POST") {
        $buf = New-Object byte[] 8192; $ms = New-Object System.IO.MemoryStream
        while (($n = $rq.InputStream.Read($buf, 0, $buf.Length)) -gt 0) { $ms.Write($buf, 0, $n) }
        $name = $rq.QueryString["printer"]
        if (-not $name) { $name = (New-Object System.Drawing.Printing.PrinterSettings).PrinterName }
        $name = Resolve-Printer $name
        $err = [RawPrn]::Send($name, $ms.ToArray())
        if ($err) { Reply $rs 500 $err } else { Reply $rs 200 "OK" }
      }
      else { Reply $rs 404 "Tidak ada" }
    }
  } catch { try { Reply $rs 500 $_.Exception.Message } catch {} }
  finally { try { $rs.Close() } catch {} }
}
