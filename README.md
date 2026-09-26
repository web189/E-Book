# Modul Materi Pelatihan Admin GDNG PRG 2026

E-Book / modul digital untuk pelatihan admin GDNG PRG 2026. Dibangun sebagai
**static website** murni (HTML5, CSS3, JavaScript Vanilla) tanpa backend,
dengan penyimpanan data sementara di `localStorage` sehingga siap di-upload
langsung ke GitHub Pages.

## 1. Deskripsi

Website ini berfungsi sebagai perpustakaan digital modul pelatihan, mirip
perpaduan e-book reader, learning management system, dan dashboard admin
ringan. Pengunjung dapat membaca materi, mencari materi, dan berpindah
antara mode terang/gelap. Admin (tersembunyi dari tampilan utama) dapat
mengelola seluruh konten materi dan daftar isi melalui dashboard khusus.

## 2. Struktur Folder

```
/
├── index.html
├── css/
│   └── style.css
├── js/
│   └── app.js
├── assets/
│   ├── logo/     (kosong — logo dibuat via HTML/CSS, mudah diganti file nanti)
│   ├── images/   (foto hero, dokumentasi transaksi, dll.)
│   └── icons/    (favicon, ikon PWA, logo header/footer)
├── manifest.json
├── sw.js
├── firebase-config.example.js      (persiapan migrasi Firebase, lihat bagian 9)
├── firestore.rules                 (persiapan migrasi Firebase, lihat bagian 9)
├── data-service.firebase.example.js(persiapan migrasi Firebase, lihat bagian 9)
├── MIGRATION.md                    (panduan migrasi Firebase, lihat bagian 9)
└── README.md
```

Berkas database/Firebase sengaja diletakkan langsung di root (bukan di dalam
folder tersendiri) karena baru berupa contoh/template persiapan migrasi, bukan
aset biner. Folder hanya dipakai untuk gambar dan ikon (`assets/images`,
`assets/icons`, `assets/logo`).

## 3. Cara Menjalankan

Tidak dibutuhkan Node.js, PHP, atau server apa pun.

1. Unduh/salin seluruh folder proyek.
2. Buka `index.html` langsung di browser modern (Chrome, Edge, Firefox, Safari).

Untuk pengalaman terbaik (menghindari batasan `file://` pada beberapa
browser), Anda juga bisa menjalankan server statis sederhana, contoh:

```bash
python3 -m http.server 5500
# lalu buka http://localhost:5500
```

## 4. Cara Login Admin

Tombol login admin **sengaja tidak ditampilkan** di halaman utama. Untuk
membuka form login:

1. Klik/ketuk **logo** di header sebanyak **5 kali secara cepat** (dalam
   waktu ±2 detik).
2. Modal **Admin Login** akan muncul otomatis.

Kredensial demo (dikonfigurasi di `js/app.js`, cari `ADMIN_USERNAME` dan
`ADMIN_PASSWORD`):

```
Username : admin
Password : admin123
```

> ⚠️ Kredensial ini **hanya untuk prototype/demo** dan mudah diubah langsung
> di kode sumber. **Belum aman untuk produksi.**

## 5. Cara Menggunakan Dashboard Admin

Setelah login, Anda diarahkan ke `#/admin/dashboard` dengan menu:

- **Dashboard** — ringkasan jumlah materi, daftar isi, gambar, dan waktu update terakhir.
- **Daftar Isi** — tambah/edit/hapus/urutkan/aktifkan item navigasi materi.
- **Materi** — CRUD materi lengkap dengan editor teks kaya (bold, heading, list, tabel, kutipan, tautan, kode) dan status Draft/Published.
- **Gambar** — unggah gambar (maks 1.5 MB per file, disimpan sebagai Base64 di LocalStorage), edit nama/alt text, hapus.
- **Preview Website** — melihat tampilan pengunjung tanpa logout, dengan tombol kembali ke dashboard.
- **Pengaturan** — nama admin, mode gelap, dan reset data ke bawaan.
- **Logout** — mengakhiri sesi admin (data materi tidak terhapus).

Semua perubahan CRUD langsung ter-render ulang tanpa reload halaman.

## 6. Cara Reset LocalStorage

Dua cara:

- **Melalui UI:** Dashboard Admin → Pengaturan → tombol **Reset ke Data Default**.
- **Manual via console browser:**
  ```js
  localStorage.removeItem('gdngprg_contents');
  localStorage.removeItem('gdngprg_materials');
  localStorage.removeItem('gdngprg_images');
  localStorage.removeItem('gdngprg_settings');
  location.reload();
  ```

## 7. Cara Upload ke GitHub Pages

1. Buat repository baru di GitHub, misalnya `gdng-prg-2026`.
2. Upload seluruh isi folder proyek ini (bukan folder induknya) ke branch `main`.
3. Masuk ke **Settings → Pages**.
4. Pada **Source**, pilih branch `main` dan folder `/ (root)`.
5. Simpan, tunggu beberapa menit, lalu akses melalui URL yang diberikan
   GitHub (`https://<username>.github.io/gdng-prg-2026/`).

Tidak ada proses build yang dibutuhkan — situs ini murni statis.

## 8. Batasan Keamanan Versi LocalStorage

Karena ini adalah prototype tanpa backend, harap dipahami batasan berikut:

- Login **belum aman** untuk produksi — hanya pemeriksaan sederhana di sisi klien.
- Username dan password admin **berada langsung di kode JavaScript** dan dapat dilihat siapa pun yang membuka source code.
- Data di `localStorage` **dapat dimodifikasi bebas** oleh pengguna melalui DevTools browser.
- Sesi admin memakai `sessionStorage` (hilang saat tab ditutup), namun tidak menyimpan password.
- Editor materi memakai HTML yang disimpan di LocalStorage; sanitasi dasar sudah diterapkan (menghapus `<script>`, atribut `on*`, dan URL `javascript:`), namun **belum setara sanitasi tingkat produksi**.
- Gambar berukuran besar akan membuat kuota LocalStorage (umumnya ±5–10MB per origin) cepat penuh — karena itu diberi batas 1.5MB per gambar.

**Jangan gunakan versi ini sebagai sistem otentikasi/keamanan sungguhan.**

## 9. Rencana Migrasi Firebase

> Berkas persiapan migrasi (template config, Security Rules, contoh kode
> `DataService` berbasis Firestore, dan panduan langkah-demi-langkah) sudah
> disiapkan langsung di root proyek: [`MIGRATION.md`](MIGRATION.md),
> `firebase-config.example.js`, `firestore.rules`, dan
> `data-service.firebase.example.js`. Situs saat ini
> **belum** terhubung ke Firebase — masih memakai LocalStorage — sehingga
> tetap bisa langsung dipakai di GitHub Pages tanpa perlu setup tambahan.


Arsitektur kode sudah dipisahkan menjadi service layer di `js/app.js`
(`DataService`, `AuthService`, `ThemeService`) agar migrasi tidak memerlukan
membangun ulang tampilan (UI). Rencana bertahap:

| Layer sekarang | Pengganti Firebase |
|---|---|
| `DataService` (localStorage) | Firebase Firestore (koleksi `materials`, `contents`, `images`) |
| `AuthService` (sessionStorage) | Firebase Authentication (Email/Password atau custom claims admin) |
| Gambar Base64 di LocalStorage | Firebase Storage (upload file, simpan URL-nya di Firestore) |

Langkah migrasi yang disarankan:

1. Ganti isi fungsi `DataService._read` / `_write` agar memanggil Firestore SDK (async), lalu sesuaikan pemanggilnya menjadi `await`/`.then()`.
2. Ganti `AuthService.login/logout/isLoggedIn` dengan `firebase/auth`.
3. Ganti proses simpan gambar (`FileReader` → Base64) dengan upload ke Firebase Storage, simpan hanya URL hasil upload di Firestore.
4. Tambahkan Firestore Security Rules agar hanya admin (custom claim) yang dapat menulis data.
5. Tampilan (HTML/CSS render functions) tidak perlu diubah karena hanya bergantung pada bentuk data (`{title, slug, content, ...}`), bukan sumber datanya.

## 10. Testing yang Sudah Diperiksa

- Navigasi Home, Daftar Materi, Reader, hamburger menu, drawer daftar isi mobile.
- Dark mode / Light mode + persistensi setelah refresh.
- Pencarian realtime + state kosong "Materi tidak ditemukan".
- 5x klik logo membuka modal login; gagal login menampilkan pesan error; berhasil login mengarah ke dashboard.
- CRUD Daftar Isi (tambah, edit, hapus, aktif/nonaktif, naik/turun urutan).
- CRUD Materi (tambah, edit, hapus, status Draft/Published, editor kaya).
- Upload, edit nama/alt, dan hapus gambar; validasi ukuran file maksimum.
- Logout mengembalikan ke Home tanpa menghapus data materi.
- Refresh browser mempertahankan seluruh data (LocalStorage persistence).
- Responsive pada lebar 320px–1920px tanpa horizontal scroll.
