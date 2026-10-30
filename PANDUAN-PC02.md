# Pasang Agen Cetak di Komputer 02 (printer Epson LX-310 ada di Komputer 01)

Cara paling aman: **Komputer 01 membagikan (share) printer lewat LAN, Komputer 02 membuat printer lokal yang
"menunjuk" ke printer itu, lalu agen dipasang di Komputer 02 seperti biasa.** Agen tetap hanya aktif di
`localhost` Komputer 02, jadi website tidak perlu diubah.

## A. Di Komputer 01 (yang tersambung ke printer)

1. **Control Panel > Devices and Printers**, klik kanan `EPSON LX-310 ESC/P (Copy 1)` > **Printer properties** > tab **Sharing**.
2. Centang **Share this printer**, isi *Share name* tanpa spasi: `EPSONLX310`. Klik OK.
3. **Control Panel > Network and Sharing Center > Change advanced sharing settings**:
   - **Turn on file and printer sharing**.
   - **Password protected sharing: Turn off** (paling mudah). Bila tetap dinyalakan, Komputer 02 akan diminta
     user + password milik Komputer 01.
4. Catat nama komputer (klik kanan Computer > Properties) atau alamat IP (`ipconfig` di CMD, baris *IPv4 Address*).
   Lebih stabil memakai IP; atur IP Komputer 01 menjadi tetap (static) bila bisa.
5. Printer menyala dan Komputer 01 harus hidup selama Komputer 02 mencetak.

## B. Di Komputer 02

1. Cek jaringan: tekan **Win + R**, ketik `\\NAMA-PC01` (atau `\\192.168.1.10`), Enter.
   Printer `EPSONLX310` harus terlihat. Bila tidak: `ping NAMA-PC01`, periksa kabel LAN, dan pastikan
   kedua komputer satu *Workgroup*.
2. **Devices and Printers > Add a printer > Add a local printer**.
3. Pilih **Create a new port > Local Port > Next**, *Port name*: `\\NAMA-PC01\EPSONLX310` (atau `\\192.168.1.10\EPSONLX310`).
4. Driver: pilih **EPSON > EPSON LX-310 ESC/P**. Bila tidak ada, pilih **Generic > Generic / Text Only**
   (cetakan DMS dikirim mentah/RAW, driver hanya formalitas).
5. Nama printer: **`EPSON LX-310 ESC/P (Copy 1)`** (harus persis sama, supaya pengaturan website tidak perlu diubah).
   Pilih **Do not share this printer**. Jangan jadikan default bila tidak perlu.
6. Salin folder website (isi zip) ke Komputer 02, pastikan `agen-cetak-epson.ps1` dan
   `pasang-agen-epson.bat` satu folder, lalu klik dua kali **pasang-agen-epson.bat**.
7. Tunggu **BERHASIL: agen aktif** dan pastikan `EPSON LX-310 ESC/P (Copy 1)` ada di daftar. Ketik **Y**:
   form tes harus keluar dari printer di Komputer 01.
8. Buka website DMS Manual di Komputer 02: status harus **Agen cetak: tersambung**.
   Bila nama printer Anda berbeda, isi di Pengaturan > **Nama printer Windows**.

## Bila gagal

| Gejala | Penyebab / solusi |
|---|---|
| `\\PC01` tidak terbuka | Firewall PC 01 (aktifkan *File and Printer Sharing*), beda Workgroup, atau kabel LAN. Coba pakai IP. |
| Diminta user/password | Matikan *Password protected sharing* di PC 01, atau pakai akun Windows PC 01 yang punya password. |
| Tes sukses tetapi tidak keluar | Di PC 02 buka antrean printer: status *Error* atau *Offline*. Cek port harus `\\PC01\EPSONLX310`, dan printer di PC 01 tidak *Paused*. |
| Agen "belum aktif" | Antivirus/firewall memblokir PowerShell, atau port 9101 dipakai program lain. Lihat `%APPDATA%\DMS-Agen\agen.log`. |
| Printer tidak ada di daftar agen | Printer lokal di langkah B belum dibuat atau namanya berbeda. |

## Kenapa agen tidak dibuka lewat LAN dari PC 01?

Website berjalan di `https://web189.github.io`. Browser memblokir halaman HTTPS memanggil alamat HTTP di jaringan
(`http://192.168.x.x:9101`), tetapi mengizinkan `http://localhost`. Karena itu tiap komputer memakai agennya
sendiri di `localhost`, dan yang dibagikan lewat LAN adalah **printernya**, bukan agennya.
