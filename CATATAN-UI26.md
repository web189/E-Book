# Catatan Tampilan UI26 "Aurora Depo"

Perubahan tampilan (HP & PC) dipusatkan di satu berkas: `ui26.css` (dimuat paling akhir di index.html).
Berkas lain tidak diubah, kecuali:
- index.html  : menambah `<link ... ui26.css>`, splash dipercepat (7,5 dtk -> 3,2 dtk).
- app.js      : splash 5 dtk -> 2,4 dtk; foto hero tetap di dalam hero pada HP; "Real-Time" tidak terpotong.
- sw.js       : cache v62 + ui26.css didaftarkan (agar pengguna langsung mendapat tampilan baru).

Aman untuk Windows 7 / Chrome 109: tanpa blur/backdrop-filter, tanpa animasi berulang,
hanya transform/opacity saat hover. Untuk kembali ke tampilan lama: hapus baris `ui26.css` di index.html.

## Tambahan: Splash 4 detik, Offline + Update Otomatis, Tombol Instal
- splash.css / splash.js : splash "boot sequence" 4 detik (cincin progres, orbit, checklist). Saat reload karena update, splash singkat (0,7 dtk).
- sw.js    : OFFLINE penuh (halaman, gambar, font, OCR). Online -> kode (html/css/js) selalu diambil terbaru lebih dulu
             (maks. tunggu 4 dtk), salinan offline diperbarui otomatis. Gambar memakai cache-first.
- pwa.js / pwa.css : tombol "Pasang Aplikasi" (header & menu HP), panel petunjuk (Android, iOS, Windows, Windows 7),
             banner tawaran pasang, penanda "Mode offline", dan pembaruan otomatis:
             situs memeriksa versi tiap 5 menit / saat kembali online / saat tab dibuka lagi; bila ada versi baru,
             halaman memuat ulang sendiri (menunggu bila pengguna sedang mengetik).
- Cara merilis update: cukup upload file baru ke GitHub. Tidak perlu mengubah nomor versi.
  (Ubah VERSION di sw.js hanya bila ingin memaksa semua perangkat membuang cache lama.)
