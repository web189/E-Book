# Panduan Migrasi: GitHub Pages (LocalStorage) → Firebase

Situs ini tetap **statis** di GitHub Pages — Firebase hanya menggantikan
LocalStorage sebagai tempat penyimpanan data (materi, daftar isi, gambar),
supaya perubahan yang dibuat admin **tersimpan di server** dan **muncul
untuk semua pengunjung**, bukan hanya di browser admin itu sendiri.

Status saat ini: situs **belum** terhubung ke Firebase. Berkas-berkas
persiapan (template config, security rules, contoh kode) di root proyek ini
(`firebase-config.example.js`, `firestore.rules`,
`data-service.firebase.example.js`) bisa dipakai kapan saja tim siap
melakukan migrasi.

## Kenapa perlu Firebase?

Versi sekarang menyimpan data di `localStorage` browser masing-masing
admin. Artinya materi yang ditambahkan admin di HP-nya **tidak otomatis
muncul** di komputer admin lain atau di HP pengunjung. Firebase (Firestore +
Storage) membuat data tersimpan terpusat.

## Langkah-langkah

1. **Buat project Firebase**
   - Buka https://console.firebase.google.com → "Add project".
   - Aktifkan **Firestore Database** (mode production).
   - Aktifkan **Storage** (untuk menyimpan file gambar).
   - Aktifkan **Authentication → Email/Password** (untuk login admin).

2. **Isi kredensial**
   - Salin `firebase-config.example.js` menjadi
     `firebase-config.js`, isi dengan config dari Firebase Console
     (Project Settings → Your apps → Web app).

3. **Pasang Security Rules**
   - Salin isi `firestore.rules` ke tab **Rules** di Firestore
     Console.
   - Salin bagian Storage rules (dikomentari di bagian bawah file yang sama)
     ke tab **Rules** di Storage Console.
   - Buat 1 akun admin di Authentication, lalu set custom claim
     `admin: true` pada akun tersebut (lewat Cloud Function kecil atau
     Firebase Admin SDK — lihat dokumentasi resmi "Custom Claims").

4. **Ganti DataService di `js/app.js`**
   - Gunakan kerangka di `data-service.firebase.example.js` sebagai
     acuan. Nama method (`getMaterials`, `setMaterials`, `getContents`, dst.)
     sengaja dibuat **sama persis** dengan `DataService` versi LocalStorage
     supaya fungsi `renderHome`, `renderAdminMaterials`, dll. di `js/app.js`
     tidak perlu ditulis ulang dari nol — cukup ubah setiap pemanggilan
     menjadi `await DataService.getMaterials()` dan jadikan fungsi
     pembungkusnya `async function`.
   - Ganti `js/app.js` menjadi `<script type="module" src="js/app.js">` di
     `index.html` karena akan memakai `import`.
   - Ganti `AuthService.login/logout/isLoggedIn` dengan
     `signInWithEmailAndPassword` / `signOut` / `onAuthStateChanged` dari
     `firebase/auth`.

5. **Migrasi gambar lama (Base64 → Storage)**
   - Jika sudah ada gambar tersimpan di LocalStorage sebelum migrasi, tulis
     skrip sekali-jalan: baca `gdngprg_images` dari LocalStorage, convert
     tiap `dataUrl` (Base64) menjadi `Blob`, `uploadBytes()` ke Storage,
     simpan `getDownloadURL()`-nya sebagai field `url` di dokumen Firestore
     koleksi `images`. Setelah itu field `material.image` bisa diarahkan ke
     URL baru tersebut.

6. **Uji coba di branch terpisah**
   - Lakukan migrasi di branch Git terpisah (misalnya `firebase-migration`)
     dan uji penuh (login, tambah/edit/hapus materi, upload gambar) sebelum
     digabung ke `main` yang di-deploy ke GitHub Pages.

## Struktur data Firestore yang disarankan

```
materials/{id}        → { title, slug, description, content, image, order, status, createdAt, updatedAt }
contents/{id}         → { title, order, active, materialId }
images/{id}           → { name, alt, url, path, createdAt }
settings/app          → { adminName }
```

## Yang TIDAK perlu diubah

Seluruh fungsi `render*()` (tampilan pengunjung & tampilan admin) hanya
bergantung pada **bentuk data** (`{title, slug, content, ...}`), bukan dari
mana data itu berasal. Jadi HTML/CSS dan hampir seluruh UI tidak perlu
ditulis ulang saat migrasi — cukup lapisan `DataService` dan `AuthService`
yang diganti.
