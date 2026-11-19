/* ==========================================================================
   SERVICE WORKER — LP-MODUL / GDNG PRG 2026  (offline-first + auto update)
   --------------------------------------------------------------------------
   • Offline  : seluruh situs (halaman, gambar, font, OCR) disimpan di perangkat.
   • Update   : kode (html/css/js) SELALU diambil dari internet lebih dulu saat
                online (maks. tunggu 4 dtk), lalu salinan offline diperbarui
                otomatis. Tanpa internet -> memakai salinan tersimpan.
   • Gambar & font: tampil langsung dari salinan offline, lalu diam-diam diperbarui
     dari internet (stale-while-revalidate) -> gambar yang diganti ikut ter-update.
   • Halaman yang gagal dimuat server (404/5xx) memakai salinan offline, bukan halaman error.
   Naikkan VERSION setiap kali Anda mengunggah versi baru agar semua perangkat
   langsung mengganti cache lama (disarankan, tetapi bukan syarat).
   ========================================================================== */
var VERSION = "2026.11.19-b";
var SHELL = "lp-shell-" + VERSION;
var MEDIA = "lp-media-v1";

var CORE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./splash.css",
  "./splash.js",
  "./pwa.css",
  "./pwa.js",
  "./annot-data.js",
  "./annot.js",
  "./app.js",
  "./dms-manual.css",
  "./dms-manual.js",
  "./dms-products.js",
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
  "./ui26.css",
  "./ui27.css",
  "./ui30.css",
  "./ui31.css",
  "./ui32.css",
  "./assets/icons/apple-touch-icon.png",
  "./assets/icons/favicon-32.png",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/icon-maskable-192.png",
  "./assets/icons/icon-maskable-512.png",
  "./assets/icons/logo-dms-splash.webp",
  "./assets/icons/logo-dms.webp",
  "./assets/icons/logo-thermal.png",
  "./assets/icons/qr-benyoriki.png",
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
  "./assets/images/hero/depo-parung-kantin.webp"
];

var LATER = [
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
  "./assets/images/transaksi-produk-sgm/sgm-01-input-batch-btb-supplier.webp",
  "./assets/images/transaksi-produk-sgm/sgm-02-cetak-btb-supplier.webp",
  "./assets/images/transaksi-produk-sgm/sgm-03-bkb-mutasi-morphing.webp",
  "./assets/images/transaksi-produk-sgm/sgm-04-btb-mutasi-morphing.webp",
  "./assets/images/transaksi-produk-sgm/sgm-05-id-produk-box-pcs.webp",
  "./assets/images/transaksi-produk-sgm/sgm-06-surat-jalan-batch-expired.webp",
  "./assets/images/transaksi-produk-sgm/sgm-07-input-btb-supplier-no-ref-po.webp",
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
  "./vendor/tesseract/eng.traineddata.gz",
  "./vendor/tesseract/tesseract-core-lstm.wasm.js",
  "./vendor/tesseract/tesseract-core-simd-lstm.wasm.js",
  "./vendor/tesseract/tesseract.min.js",
  "./vendor/tesseract/worker.min.js"
];

/* berkas inti yang WAJIB berhasil diunduh; bila gagal, pemasangan SW dibatalkan
   dan versi lama yang sudah berjalan tetap dipakai (tidak ada cache setengah jadi) */
var CRITICAL = ["./index.html", "./app.js", "./style.css", "./pwa.js"];

function fetchPut(cache, u) {
  return fetch(u, { cache: "reload" }).then(function (res) {
    if (res && res.ok) return cache.put(u, res).then(function () { return true; });
    return false;
  }).catch(function () { return false; });
}

function addAll(cacheName, list, onStep) {
  return caches.open(cacheName).then(function (cache) {
    var done = 0, failed = [];
    function step() { done++; onStep && onStep(done, list.length); }
    return Promise.all(list.map(function (u) {
      return cache.match(u).then(function (hit) {
        if (hit && cacheName === MEDIA) { step(); return; }
        return fetchPut(cache, u).then(function (ok) { if (!ok) failed.push(u); step(); });
      });
    })).then(function () {
      if (!failed.length) return failed;
      /* coba ulang sekali untuk berkas yang gagal (sinyal HP sering putus-nyambung) */
      return Promise.all(failed.map(function (u) { return fetchPut(cache, u).then(function (ok) { return ok ? null : u; }); }))
        .then(function (r) { return r.filter(Boolean); });
    });
  });
}

self.addEventListener("install", function (event) {
  event.waitUntil(addAll(SHELL, CORE).then(function (failed) {
    var bad = failed.filter(function (u) { return CRITICAL.indexOf(u) >= 0; });
    if (bad.length) throw new Error("Gagal mengunduh berkas inti: " + bad.join(", "));
    return self.skipWaiting();
  }));   /* gagal -> SW baru dibatalkan, SW lama tetap jalan; browser mencoba lagi otomatis nanti */
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== SHELL && k !== MEDIA; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

function broadcast(msg) {
  return self.clients.matchAll({ includeUncontrolled: true }).then(function (list) {
    list.forEach(function (c) { c.postMessage(msg); });
  });
}

self.addEventListener("message", function (event) {
  var d = event.data || {};
  if (d.type === "SKIP_WAITING") { self.skipWaiting(); return; }
  if (d.type === "CACHE_ALL") {
    event.waitUntil(
      addAll(MEDIA, LATER, function (n, total) {
        if (n === total || n % 8 === 0) broadcast({ type: "CACHE_PROGRESS", done: n, total: total });
      }).then(function () { return broadcast({ type: "CACHE_DONE", version: VERSION }); })
    );
  }
});

function isCode(url) { return /\.(?:html|css|js|json|md)$/i.test(url.pathname) || /\/$/.test(url.pathname); }

function offlinePage() {
  return new Response('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline</title>' +
    '<body style="font-family:sans-serif;padding:32px;text-align:center"><h2>Belum tersimpan untuk offline</h2>' +
    '<p>Sambungkan internet sekali, buka situs ini, tunggu sampai muncul tulisan “Siap dipakai offline”, lalu coba lagi.</p></body>',
    { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

/* Kode (html/css/js): internet dulu (maks. timeoutMs), salinan offline sebagai cadangan.
   Respons gagal dari server (404/5xx/captive portal) TIDAK dipakai bila salinan offline ada. */
function networkFirst(event, cacheKey, timeoutMs, isNav) {
  return caches.open(SHELL).then(function (cache) {
    return new Promise(function (resolve) {
      var settled = false, timer;
      function done(r) { if (!settled) { settled = true; clearTimeout(timer); resolve(r); } }
      function useCache(last) {
        return cache.match(cacheKey, { ignoreSearch: true }).then(function (hit) {
          if (hit) done(hit); else if (last) done(last);
        });
      }
      timer = setTimeout(function () { useCache(null); }, timeoutMs);   /* jaringan lambat -> pakai salinan, jaringan tetap menyegarkan cache */
      var net = fetch(cacheKey, { cache: "no-cache" }).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          var put = cache.put(cacheKey, copy).catch(function () {});
          event.waitUntil(put);
          done(res);
        } else {
          useCache(res || null).then(function () { if (!settled) done(res || (isNav ? offlinePage() : new Response("", { status: 504 }))); });
        }
      }).catch(function () {
        useCache(null).then(function () { if (!settled) done(isNav ? offlinePage() : new Response("Offline", { status: 503, statusText: "Offline" })); });
      });
      event.waitUntil(net);
    });
  });
}

/* Gambar, font, wasm: tampil dari salinan offline dulu, lalu diam-diam disegarkan bila online */
function staleWhileRevalidate(event, req) {
  return caches.match(req, { ignoreSearch: true }).then(function (hit) {
    var refresh = fetch(req).then(function (res) {
      if (res && res.ok && res.status === 200) {
        var copy = res.clone();
        return caches.open(MEDIA).then(function (c) { return c.put(req, copy); }).then(function () { return res; });
      }
      return res;
    }).catch(function () { return null; });
    if (hit) { event.waitUntil(refresh); return hit; }
    return refresh.then(function (res) { return res || new Response("", { status: 504, statusText: "Offline" }); });
  });
}

self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.headers.has("range")) return;               /* biarkan browser menangani video/audio parsial */

  if (req.mode === "navigate") {
    event.respondWith(networkFirst(event, "./index.html", 4000, true));
    return;
  }

  if (isCode(url)) {
    var scope = new URL(self.registration.scope).pathname;
    var rel = "./" + url.pathname.substring(scope.length);
    event.respondWith(networkFirst(event, rel, 4000, false));
    return;
  }

  event.respondWith(staleWhileRevalidate(event, req));
});
