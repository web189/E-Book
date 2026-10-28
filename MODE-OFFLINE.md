# Mode offline (tanpa internet)

Semua yang dulu diambil dari internet sudah ada di folder ini:
- Font Plus Jakarta Sans & Sora -> `vendor/fonts/`
- Mesin OCR (Tesseract) + data bahasa -> `vendor/tesseract/`
- Service worker `sw.js` menyimpan seluruh berkas (halaman, gambar, font, OCR) di cache Chrome.

## Cara pakai
1. **Lewat hosting (github.io)**: buka website sekali saat ada internet, tunggu 1-2 menit sampai selesai memuat. Setelah itu website tetap terbuka walau internet mati (bahkan setelah Chrome ditutup). Bila ada versi baru, buka lagi saat online satu kali.
2. **Lewat folder lokal (paling aman)**: salin seluruh isi folder ke PC (mis. `C:\\DMS`), lalu klik dua kali `buka-offline.bat` (atau buka `index.html`). Tidak perlu internet sama sekali. Catatan: pada mode ini OCR gambar (Tesseract) tidak jalan karena dibatasi Chrome; tempel dari Excel / unggah .xlsx tetap bisa.
3. Cetak Epson tanpa dialog: jalankan `pasang-agen-epson.bat` sekali, lalu `pasang-epson-win7.bat` (otomatis memakai salinan lokal bila `index.html` ada di folder yang sama). Agen cetak berjalan di PC itu sendiri, jadi tidak butuh internet.

Link luar (benyoriki.com, Uang Ritase TUA) tetap butuh internet karena berada di situs lain.

## Cetak Epson lewat PDF (tanpa agen, cocok Windows 7)
1. Di DMS Manual klik **Cetak > Simpan gambar / PDF > PDF form Epson** (di HP: tombol "Simpan PDF form Epson").
2. Buka PDF-nya di PC (Chrome / Adobe Reader), tekan **Print**, pilih **EPSON LX-310**.
3. Ukuran kertas: buat sekali paket kertas custom **9,5 × 3,75 in** (Devices and Printers > klik printer > Print server properties > Forms). Skala **100% / Actual size**, tanpa margin.
4. 1 form = 1 halaman PDF. Jika form meleset, ubah **Tinggi form (mm)** di Pengaturan lalu simpan PDF lagi.

## Cetak langsung Epson (v19)
- Tombol **Cetak > Epson LX-310** sekarang tidak lagi mengunduh .prn. Urutannya: (1) kirim ESC/P lewat agen bila agen aktif, (2) bila agen tidak ada, otomatis cetak lewat browser dengan huruf tebal.
- Agar langsung keluar tanpa dialog: buka website lewat pintasan **DMS Manual (Epson)** dari `pasang-epson-win7.bat` (Chrome --kiosk-printing, Epson jadi printer default). Tanpa pintasan itu, dialog cetak Chrome muncul sekali; pilih kertas 9,5 x 3,75 in.
- Pola cetak mengikuti DMS: 10 barang per form; form terakhir memuat tanda tangan (maks. 6 barang). Bila barang terakhir lebih dari 6, tanda tangan dicetak di form tambahan.
