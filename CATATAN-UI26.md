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

## UI27 "Papan Gudang" (5 Nov 2026)
- Berkas baru `ui27.css` (dimuat setelah ui26.css). Tidak ada JS/HTML materi yang diubah. Splash tetap 4 detik.
- Hero: judul dua ukuran, tombol utama kuning-keselamatan, kisi denah gudang, label putih melayang, angka ringkas tanpa kotak.
- Panel keunggulan jadi satu panel bersekat; kartu materi pakai garis warna + nomor besar; nav memakai garis bawah aktif.
- Tetap ringan: tanpa blur/backdrop-filter/animasi berulang. Kembali ke tampilan lama: hapus baris ui27.css di index.html.
- sw.js: VERSION 2026.11.05-a + ui27.css masuk daftar cache offline.

## UI30 "Menara Kontrol Depo" (11 Nov 2026)
- Berkas baru `ui30.css` (dimuat paling akhir di index.html). Tidak ada JS/materi yang diubah. Splash tetap 4 detik.
- Header: bersih, nav teks polos + garis aktif, tombol Pasang datar (tanpa cincin berkedip), kredit benyoriki.com satu baris rapi.
  Layar 861-1180px (termasuk "situs desktop" di HP) memakai menu laci supaya menu tidak terpotong/berdesakan.
- Hero: judul lebih besar & tegas (2 baris di PC), bingkai foto bergaris, satu animasi masuk setelah splash (transform+opacity).
- Kartu materi: isi sejajar dengan nomor modul, kartu terakhir mengisi sisa baris (tidak ada kotak kosong), mode gelap lebih kontras.
- Aman Windows 7 / Chrome 109: tanpa blur/backdrop-filter, :has, color-mix, nesting. Kembali ke tampilan lama: hapus baris ui30.css di index.html.
- sw.js: VERSION 2026.11.11-a + ui30.css masuk daftar cache offline.
