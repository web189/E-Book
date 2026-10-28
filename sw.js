/* ==========================================================================
   SERVICE WORKER — GDNG PRG 2026
   --------------------------------------------------------------------------
   Makes the site installable (like WhatsApp Web) and lets the app shell
   load even with a flaky/offline connection. Bump CACHE_NAME whenever the
   list below changes so old caches are cleaned up automatically.
   ========================================================================== */
var CACHE_NAME = "gdng-prg-shell-v52";
var CORE_ASSETS = ["./"].concat([
 "./annot-data.js",
 "./annot.js",
 "./app.js",
 "./assets/icons/apple-touch-icon.png",
 "./assets/icons/favicon-32.png",
 "./assets/icons/icon-192.png",
 "./assets/icons/icon-512.png",
 "./assets/icons/icon-maskable-192.png",
 "./assets/icons/icon-maskable-512.png",
 "./assets/icons/logo-dms-splash.webp",
 "./assets/icons/logo-dms.webp",
 "./assets/icons/logo-thermal.png",
 "./assets/images/hero/depo-parung-kantin.webp",
 "./assets/images/laporan-manual-excel/lme-01-excel-saldo-dms-air.webp",
 "./assets/images/laporan-manual-excel/lme-02-catatan-checker-aqua.webp",
 "./assets/images/laporan-manual-excel/lme-03-catatan-checker-vit-sgm.webp",
 "./assets/images/laporan-manual-excel/lme-04-catatan-checker-galon.webp",
 "./assets/images/laporan-manual-excel/lme-05-excel-saldo-galon.webp",
 "./assets/images/laporan-manual-excel/lme-06-excel-aqua-galon.webp",
 "./assets/images/laporan-manual-excel/lme-07-excel-vit-galon.webp",
 "./assets/images/opening-closing/oc-01-halaman-aplikasi-aqua-vit.webp",
 "./assets/images/opening-closing/oc-02-login-aqua-vit.webp",
 "./assets/images/opening-closing/oc-03-menu-opening-closing-gudang.webp",
 "./assets/images/opening-closing/oc-04-tombol-opening-closing.webp",
 "./assets/images/opening-closing/oc-05-form-opening-gudang.webp",
 "./assets/images/transaksi-btb-bkb-supplier/bkb-supplier-pembatalan-surat-jalan.webp",
 "./assets/images/transaksi-btb-bkb-supplier/btb-supplier-gallon-noref3-keterangan.webp",
 "./assets/images/transaksi-btb-bkb-supplier/btb-supplier-pembatalan-surat-jalan.webp",
 "./assets/images/transaksi-btb-bkb-supplier/btb-supplier-sps-noref3-keterangan.webp",
 "./assets/images/transaksi-btb-bkb-supplier/gudang-layak-cianjur.webp",
 "./assets/images/transaksi-btb-bkb-supplier/gudang-layak-pet-sukabumi.webp",
 "./assets/images/transaksi-dms-3/cianjur-01-btb-dms-3-dari-depo-cianjur.webp",
 "./assets/images/transaksi-dms-3/cianjur-02-bkb-dms-3-dari-pol-cicurug.webp",
 "./assets/images/transaksi-dms-3/cianjur-03-btb-dms-5-port-9301-dari-depo-parung.webp",
 "./assets/images/transaksi-dms-3/cianjur-04-bkb-dms-5-port-9301.webp",
 "./assets/images/transaksi-dms-3/parung-01-bkb-dms-3-ke-pol-cicurug.webp",
 "./assets/images/transaksi-dms-3/parung-02-btb-dms-3-dari-pol-cicurug.webp",
 "./assets/images/transaksi-dms-3/parung-03-btb-dms-5-port-9301-dari-depo-parung.webp",
 "./assets/images/transaksi-dms-3/parung-04-bkb-distribus-dms-5-port-9301.webp",
 "./assets/images/transaksi-dms-3/parung-05-btb-distribus-dms-5-port-9301.webp",
 "./assets/images/transaksi-dms-3/parung-06-bkb-dms-5-port-9301-ke-depo-parung.webp",
 "./assets/images/transaksi-dms-3/sentul-01-btb-dms-3-dari-depo-sentul.webp",
 "./assets/images/transaksi-dms-3/sentul-02-bkb-dms-3-ke-pol-cicurug.webp",
 "./assets/images/transaksi-dms-3/sentul-03-btb-dms-5-port-9301-dari-depo-parung.webp",
 "./assets/images/transaksi-dms-3/sentul-04-bkb-distribusi-dms-5-port-9301.webp",
 "./assets/images/transaksi-dms-3/sentul-05-btb-distribusi-dms-5-port-9301.webp",
 "./assets/images/transaksi-dms-3/sentul-06-bkb-dms-5-por-9301-ke-depo-parung.webp",
 "./assets/images/transaksi-dms-3/sentul-07-btb-dms-3-dari-pol-cicurug.webp",
 "./assets/images/transaksi-dms-3/sentul-08-bkb-dms-3-ke-depo-sentul.webp",
 "./assets/images/transaksi-produk-sgm/sgm-06-surat-jalan-batch-expired.webp",
 "./assets/images/transaksi-produk-sgm/sgm-10-btb-supplier-parung.webp",
 "./assets/images/transaksi-produk-sgm/sgm-10b-btb-supplier-keterangan.webp",
 "./assets/images/transaksi-produk-sgm/sgm-10c-dn-customer-po.webp",
 "./assets/images/transaksi-produk-sgm/sgm-11-batch-215369.webp",
 "./assets/images/transaksi-produk-sgm/sgm-12-batch-214380.webp",
 "./assets/images/transaksi-produk-sgm/sgm-13-bkb-depot-214380.webp",
 "./assets/images/transaksi-produk-sgm/sgm-14-btb-depot-214380-pc.webp",
 "./assets/images/transaksi-produk-sgm/sgm-15-bkb-depot-215369.webp",
 "./assets/images/transaksi-produk-sgm/sgm-16-btb-depot-215369-re.webp",
 "./assets/images/transaksi-produk-sgm/sgm-17-laporan-saldo-tbg.webp",
 "./assets/images/transaksi-produk-sgm/sgm-18-laporan-saldo-dms.webp",
 "./assets/images/transaksi-produk-sgm/sgm2-01-surat-jalan-pabrik-po.webp",
 "./assets/images/transaksi-produk-sgm/sgm2-02-dn-mizone-halaman-1.webp",
 "./assets/images/transaksi-produk-sgm/sgm2-03-dn-mizone-halaman-2-security.webp",
 "./assets/images/transaksi-produk-sgm/sgm2-04-point-agreement-mizone.webp",
 "./assets/images/transaksi-produk-sgm/sgm2-05-btb-supplier-mizone.webp",
 "./assets/images/transaksi-produk-sgm/sgm2-06-bkb-supplier-pallet.webp",
 "./assets/images/transaksi-produk-sgm/sgm2-07-dn-sgm.webp",
 "./assets/images/transaksi-produk-sgm/sgm2-08-point-agreement-sgm.webp",
 "./assets/images/transaksi-produk-sgm/sgm2-09-btb-supplier-sgm.webp",
 "./dms-manual.css",
 "./dms-manual.js",
 "./index.html",
 "./manifest.json",
 "./mobilebar.js",
 "./modern.css",
 "./modern.js",
 "./opening-tools.css",
 "./opening-tools.js",
 "./opening.css",
 "./opening.js",
 "./pc.css",
 "./stock-manual.css",
 "./stock-manual.js",
 "./style.css",
 "./theme.css",
 "./thermal-print.js",
 "./vendor/fonts.css",
 "./vendor/fonts/plus-jakarta-sans-latin-400-normal.woff2",
 "./vendor/fonts/plus-jakarta-sans-latin-500-italic.woff2",
 "./vendor/fonts/plus-jakarta-sans-latin-500-normal.woff2",
 "./vendor/fonts/plus-jakarta-sans-latin-600-normal.woff2",
 "./vendor/fonts/plus-jakarta-sans-latin-700-normal.woff2",
 "./vendor/fonts/plus-jakarta-sans-latin-800-normal.woff2",
 "./vendor/fonts/sora-latin-500-normal.woff2",
 "./vendor/fonts/sora-latin-600-normal.woff2",
 "./vendor/fonts/sora-latin-700-normal.woff2",
 "./vendor/fonts/sora-latin-800-normal.woff2",
 "./vendor/tesseract/eng.traineddata.gz",
 "./vendor/tesseract/tesseract-core-lstm.wasm.js",
 "./vendor/tesseract/tesseract-core-simd-lstm.wasm.js",
 "./vendor/tesseract/tesseract.min.js",
 "./vendor/tesseract/worker.min.js"
]);

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) { return Promise.all(CORE_ASSETS.map(function (u) { return cache.add(u).catch(function () { /* satu berkas gagal tidak membatalkan pemasangan */ }); })); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE_NAME; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (req.method !== "GET") return;

  // Navigations (the SPA shell): try the network first so visitors always
  // get the latest index.html when online, falling back to the cached
  // shell when offline.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE_NAME).then(function (cache) { cache.put("./index.html", copy); });
        return res;
      }).catch(function () { return caches.match("./index.html"); })
    );
    return;
  }

  // Everything else same-origin: cache-first, refresh the cache in the
  // background when the network is available.
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then(function (cached) {
      var networkFetch = fetch(req).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(req, copy); });
        }
        return res;
      }).catch(function () { return cached; });
      return cached || networkFetch;
    })
  );
});
