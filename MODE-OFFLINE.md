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
