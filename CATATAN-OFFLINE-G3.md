# Offline generasi 3 — ringkasan teknis
- sw.js (ditulis ulang): cache-first, paket versi atomik (lp-s3-<sha256>), meta (lp-meta-v3), media (lp-media-v1 dipertahankan). Auto-update berbasis sidik jari isi berkas, bukan nomor VERSION.
- pwa.js: pemicu cek, penerima pesan SW, penyimpanan permanen, Periodic/Background Sync, tombol & panel Status Offline, penjaga tautan luar saat offline.
- pwa.css: gaya tombol/panel status. manifest.json: orientation "any" (sebelumnya portrait-primary, kurang cocok untuk PC).
- Diuji (Chromium, localhost di sub-path /E-Book/): online->offline reload, tab baru + deep link offline, OCR offline, update otomatis tanpa naik versi lalu tetap offline, migrasi dari SW lama.
- Kembali ke sistem lama: kembalikan sw.js, pwa.js, pwa.css dari versi sebelumnya.
