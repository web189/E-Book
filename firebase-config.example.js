/* ==========================================================================
   FIREBASE CONFIG (TEMPLATE)
   1. Buat project di https://console.firebase.google.com
   2. Aktifkan: Firestore Database, Storage, Authentication (Email/Password)
   3. Buka Project Settings > General > "Your apps" > Web app > copy config
   4. Salin file ini menjadi "firebase-config.js" (tanpa ".example") lalu
      isi nilai di bawah dengan milik project Anda sendiri.
   5. JANGAN commit firebase-config.js berisi kunci asli ke repo publik jika
      project bersifat sensitif — untuk Firebase Web, apiKey memang publik
      dan aman selama Firestore/Storage Security Rules diatur dengan benar
      (lihat firestore.rules di folder ini).
   ========================================================================== */
export const firebaseConfig = {
  apiKey: "GANTI_DENGAN_API_KEY",
  authDomain: "GANTI_DENGAN_PROJECT.firebaseapp.com",
  projectId: "GANTI_DENGAN_PROJECT_ID",
  storageBucket: "GANTI_DENGAN_PROJECT.appspot.com",
  messagingSenderId: "GANTI_DENGAN_SENDER_ID",
  appId: "GANTI_DENGAN_APP_ID"
};
