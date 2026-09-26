/* ==========================================================================
   CONTOH DataService BERBASIS FIRESTORE + STORAGE
   --------------------------------------------------------------------------
   Ini BUKAN file aktif — hanya contoh/kerangka. js/app.js saat ini memakai
   DataService versi LocalStorage (sinkron). Ketika siap pindah ke Firebase:

   1. Tambahkan di index.html, sebelum <script src="js/app.js">, sebagai
      <script type="module">:
        import { initializeApp } from "https://www.gstatic.com/firebasejs/10.x.x/firebase-app.js";
        import { getFirestore } from "https://www.gstatic.com/firebasejs/10.x.x/firebase-firestore.js";
        import { getStorage } from "https://www.gstatic.com/firebasejs/10.x.x/firebase-storage.js";
        import { getAuth } from "https://www.gstatic.com/firebasejs/10.x.x/firebase-auth.js";
        import { firebaseConfig } from "./firebase-config.js";
        const app = initializeApp(firebaseConfig);
        window.__firestore = getFirestore(app);
        window.__storage = getStorage(app);
        window.__auth = getAuth(app);

   2. Ganti isi object DataService di js/app.js dengan versi async seperti di
      bawah ini (nama & bentuk data method TETAP SAMA agar semua fungsi
      render* tidak perlu ditulis ulang — cukup tambahkan "await" pada setiap
      pemanggilnya, karena versi ini mengembalikan Promise, bukan array
      langsung).
   3. Jalankan js/app.js sebagai <script type="module"> juga (karena pakai
      import), lalu ubah setiap renderX() yang memanggil DataService menjadi
      "async function" + "await DataService.getMaterials()" dst.
   ========================================================================== */

import {
  collection, doc, getDocs, getDoc, setDoc, addDoc, deleteDoc, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.x.x/firebase-firestore.js";
import {
  ref, uploadBytes, getDownloadURL, deleteObject
} from "https://www.gstatic.com/firebasejs/10.x.x/firebase-storage.js";

export function createFirebaseDataService(db, storage) {
  return {
    // ---- Materi ----
    async getMaterials() {
      var snap = await getDocs(query(collection(db, "materials"), orderBy("order")));
      return snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
    },
    async setMaterials(arr) {
      // Firestore tidak punya "replace seluruh koleksi" sekali panggil.
      // Simpan satu-per-satu memakai id yang sudah ada (atau addDoc jika baru).
      for (var i = 0; i < arr.length; i++) {
        var m = arr[i];
        var id = m.id || undefined;
        var data = Object.assign({}, m); delete data.id;
        if (id) await setDoc(doc(db, "materials", id), data, { merge: true });
        else await addDoc(collection(db, "materials"), data);
      }
      return true;
    },
    async deleteMaterial(id) { await deleteDoc(doc(db, "materials", id)); return true; },

    // ---- Daftar Isi (contents) ----
    async getContents() {
      var snap = await getDocs(query(collection(db, "contents"), orderBy("order")));
      return snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
    },
    async setContents(arr) {
      for (var i = 0; i < arr.length; i++) {
        var c = arr[i]; var id = c.id || undefined;
        var data = Object.assign({}, c); delete data.id;
        if (id) await setDoc(doc(db, "contents", id), data, { merge: true });
        else await addDoc(collection(db, "contents"), data);
      }
      return true;
    },

    // ---- Gambar: file asli naik ke Storage, hanya URL disimpan di Firestore ----
    async getImages() {
      var snap = await getDocs(collection(db, "images"));
      return snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
    },
    async uploadImage(file, name, alt) {
      var path = "materi-images/" + Date.now() + "-" + file.name;
      var storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
      var url = await getDownloadURL(storageRef);
      var docRef = await addDoc(collection(db, "images"), {
        name: name, alt: alt, url: url, path: path, createdAt: new Date().toISOString()
      });
      return { id: docRef.id, name: name, alt: alt, url: url, path: path };
    },
    async deleteImage(id, storagePath) {
      await deleteDoc(doc(db, "images", id));
      if (storagePath) await deleteObject(ref(storage, storagePath));
      return true;
    },

    // ---- Pengaturan ----
    async getSettings() {
      var snap = await getDoc(doc(db, "settings", "app"));
      return snap.exists() ? snap.data() : { adminName: "Administrator" };
    },
    async setSettings(obj) { await setDoc(doc(db, "settings", "app"), obj, { merge: true }); return true; }
  };
}

/* Catatan penting migrasi gambar:
   - Di versi LocalStorage sekarang, field material.image dan img.dataUrl
     berisi string Base64 raksasa. Di Firestore, field "image"/"url" cukup
     berisi URL hasil getDownloadURL() dari Firebase Storage — jauh lebih
     ringan dan tidak kena batas ukuran LocalStorage.
   - Saat migrasi, jalankan skrip satu kali untuk membaca semua gambar Base64
     dari LocalStorage lama, upload ke Storage, lalu simpan URL-nya ke
     Firestore (lihat MIGRATION.md langkah 5). */
