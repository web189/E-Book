/* ==========================================================================
   SERVICE WORKER GENERASI 3 — LP-MODUL / GDNG PRG 2026  ("Atomic Offline")
   --------------------------------------------------------------------------
   • Buka INSTAN & normal tanpa internet: halaman, kode, font, ikon dilayani dari
     satu "paket versi" di perangkat (cache-first). Gambar materi & mesin OCR
     disimpan terpisah.
   • Update OTOMATIS tanpa naik-versi manual: tiap kali online, SW mengunduh ulang
     semua berkas kode (pemeriksaan bersyarat 304 = hemat kuota), menghitung sidik
     jari SHA-256 gabungan, dan HANYA bila ada yang berubah membangun paket versi
     baru secara ATOMIK (semua berkas atau tidak sama sekali). Tidak ada kondisi
     setengah-lama-setengah-baru. Setelah siap, halaman diberi tahu & dimuat ulang.
   • Penemuan berkas otomatis: berkas baru yang ditautkan di index.html / CSS (mis.
     ui34.css) ikut tersimpan offline tanpa mengedit daftar di bawah. Daftar CORE &
     LATER adalah "benih" cadangan.
   • Pemulihan mandiri: bila cache terhapus/rusak, dibangun ulang saat online.
   • Pemicu cek: saat halaman dibuka, fokus kembali, online kembali, tiap 5 menit,
     Background Sync (saat sinyal kembali) & Periodic Sync (PWA terpasang).
   Tidak perlu mengubah apa pun di berkas ini saat mengunggah versi baru situs.
   ========================================================================== */
"use strict";
var GEN = 3;
var MEDIA = "lp-media-v1";          /* gambar materi + OCR (nama dipertahankan agar unduhan lama tidak hilang) */
var META = "lp-meta-v3";            /* catatan: versi aktif, waktu cek, daftar media */
var PREFIX = "lp-s3-";              /* paket versi = PREFIX + sidik jari */
var MIN_GAP = 60 * 1000;            /* jarak minimum antar-cek otomatis (pemeriksaan bersyarat 304, hemat kuota) */
var MEDIA_GAP = 12 * 3600 * 1000;   /* validasi ulang gambar maksimal tiap 12 jam */
var NET_TIMEOUT = 20000;
var CRITICAL = ["index.html", "app.js", "style.css", "pwa.js"];

var CORE = ["./",
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
  "./ui33.css",
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
  "./assets/images/hero/depo-parung-kantin.webp"];

var LATER = ["./assets/images/laporan-manual-excel/lme-01-excel-saldo-dms-air.webp",
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
  "./vendor/tesseract/worker.min.js"];

var SCOPE = self.registration.scope;
function norm(p) { return String(p).replace(/^\.\//, ""); }
function abs(r) { return new URL(r, SCOPE).href; }
function rel(href) {
  try { var u = new URL(href, SCOPE); return u.href.indexOf(SCOPE) === 0 ? u.href.slice(SCOPE.length).split("#")[0].split("?")[0] : null; } catch (e) { return null; }
}
function isOcr(u) { return u.indexOf("vendor/tesseract/") === 0; }
function isImg(u) { return u.indexOf("assets/images/") === 0; }
var TYPES = { css: "text/css", js: "text/javascript", json: "application/json", html: "text/html", png: "image/png", webp: "image/webp", jpg: "image/jpeg", jpeg: "image/jpeg", svg: "image/svg+xml", gif: "image/gif", ico: "image/x-icon", woff2: "font/woff2", woff: "font/woff", gz: "application/gzip" };
function guessType(u) { var m = /\.([a-z0-9]+)$/i.exec(u); return (m && TYPES[m[1].toLowerCase()]) || "application/octet-stream"; }

/* ---------- catatan (meta) & paket aktif ---------- */
function metaKey() { return new Request(abs("__lp_meta__")); }
async function getMeta() {
  try { var c = await caches.open(META); var r = await c.match(metaKey()); return r ? await r.json() : null; } catch (e) { return null; }
}
async function setMeta(m) {
  var c = await caches.open(META);
  await c.put(metaKey(), new Response(JSON.stringify(m), { headers: { "Content-Type": "application/json" } }));
}
var curP = null;
function getCur() { if (!curP) curP = getMeta().then(function (m) { return (m && m.cache) || null; }); return curP; }

function broadcast(msg) {
  return self.clients.matchAll({ includeUncontrolled: true }).then(function (list) { list.forEach(function (c) { c.postMessage(msg); }); });
}

/* ---------- utilitas ---------- */
async function pool(items, n, fn) {
  var out = new Array(items.length), i = 0;
  var workers = [];
  for (var w = 0; w < Math.min(n, items.length); w++) {
    workers.push((async function () { while (i < items.length) { var k = i++; out[k] = await fn(items[k], k); } })());
  }
  await Promise.all(workers);
  return out;
}
function hex(buf) { var a = new Uint8Array(buf), s = ""; for (var i = 0; i < a.length; i++) s += (a[i] < 16 ? "0" : "") + a[i].toString(16); return s; }
function fnv(buf) { var a = new Uint8Array(buf), h = 2166136261; for (var i = 0; i < a.length; i++) { h ^= a[i]; h = Math.imul(h, 16777619) >>> 0; } return ("00000000" + h.toString(16)).slice(-8) + a.length.toString(16); }
async function sha(buf) {
  try { if (self.crypto && crypto.subtle) return hex(await crypto.subtle.digest("SHA-256", buf)); } catch (e) {}
  return fnv(buf);
}
function dec(buf) { return new TextDecoder("utf-8").decode(buf); }

/* unduh satu berkas, abaikan cache HTTP (pemeriksaan bersyarat -> 304 murah) */
async function grab(u) {
  var ctl = typeof AbortController !== "undefined" ? new AbortController() : null;
  var t = ctl ? setTimeout(function () { ctl.abort(); }, NET_TIMEOUT) : null;
  try {
    var res = await fetch(abs(u), { cache: "no-cache", signal: ctl ? ctl.signal : undefined });
    if (res.status === 404) return { u: u, missing: true };
    if (!res.ok) throw new Error("HTTP " + res.status + " " + u);
    var type = res.headers.get("Content-Type") || "";
    if (/text\/html/i.test(type) && !/\.html?$/i.test(u)) throw new Error("bukan berkas asli (portal/captive?): " + u);
    var buf = await res.arrayBuffer();
    return { u: u, buf: buf, type: type || guessType(u) };
  } finally { if (t) clearTimeout(t); }
}

var ASSET_RE = /(?:assets\/(?:images|icons)\/|vendor\/(?:fonts|tesseract)\/)[A-Za-z0-9_\-.\/]+\.(?:webp|png|jpe?g|svg|gif|ico|woff2?|gz)/g;
var LOCAL_EXT = /\.(?:css|js|json|png|webp|jpe?g|svg|gif|ico|woff2?)$/i;

/* ---------- bangun / perbarui paket versi (ATOMIK) ---------- */
var syncP = null;
function syncShell(opts) {
  if (syncP) return syncP;
  syncP = doSync(opts || {}).then(function (r) { syncP = null; return r; }, function (e) { syncP = null; throw e; });
  return syncP;
}

async function doSync(opts) {
  var meta = await getMeta();
  var now = Date.now();
  var haveCache = !!(meta && meta.cache && await caches.has(meta.cache));
  if (!opts.force && haveCache && meta.checkedAt && now - meta.checkedAt < MIN_GAP) return { changed: false, skipped: true };

  var files = new Map();
  var set = new Set(CORE.map(norm).filter(function (u) { return u && u !== ""; }));

  /* 1) index.html wajib; dari sini ditemukan css/js/ikon baru */
  var idx = await grab("index.html");
  if (idx.missing) throw new Error("index.html tidak ditemukan");
  files.set("index.html", idx);
  var m, re = /(?:href|src)\s*=\s*["']([^"']+)["']/gi, htmlText = dec(idx.buf);
  while ((m = re.exec(htmlText))) {
    var v = m[1];
    if (/^(?:[a-z]+:|\/\/|#)/i.test(v)) continue;
    var r0 = rel(v); if (r0 && LOCAL_EXT.test(r0)) set.add(r0);
  }

  /* 2) unduh semua; lalu css -> url() ; js -> jalur aset */
  var extraShell = new Set(), imgFound = new Set();
  async function fetchBatch(list) {
    var todo = list.filter(function (u) { return !files.has(u); });
    var res = await pool(todo, 8, grab);
    res.forEach(function (f) { files.set(f.u, f); });
    return todo;
  }
  var batch = await fetchBatch(Array.from(set));
  var rounds = 0;
  while (batch.length && rounds++ < 3) {
    var next = [];
    batch.forEach(function (u) {
      var f = files.get(u); if (!f || f.missing) return;
      if (/\.css$/i.test(u)) {
        var txt = dec(f.buf), mm, ure = /url\(\s*(['"]?)([^'")]+)\1\s*\)/g;
        while ((mm = ure.exec(txt))) {
          if (/^(?:data:|[a-z]+:|\/\/|#)/i.test(mm[2])) continue;
          var ru = rel(new URL(mm[2], abs(u)).href);
          if (ru && !files.has(ru) && LOCAL_EXT.test(ru)) next.push(ru);
        }
      } else if (/\.js$/i.test(u) && u !== "sw.js") {
        var t2 = dec(f.buf), am;
        ASSET_RE.lastIndex = 0;
        while ((am = ASSET_RE.exec(t2))) {
          var a = am[0];
          if (isImg(a)) imgFound.add(a); else if (!isOcr(a) && !files.has(a)) next.push(a);
        }
      }
    });
    batch = await fetchBatch(next.filter(function (u, i) { return next.indexOf(u) === i; }));
  }

  CRITICAL.forEach(function (c) {
    var f = files.get(c);
    if (!f || f.missing) throw new Error("berkas inti tidak ada: " + c);
  });

  /* 3) sidik jari gabungan */
  var names = Array.from(files.keys()).sort(), lines = [];
  for (var i = 0; i < names.length; i++) {
    var f2 = files.get(names[i]);
    lines.push(names[i] + ":" + (f2.missing ? "missing" : await sha(f2.buf)));
  }
  var hash = await sha(new TextEncoder().encode(lines.join("\n")));

  /* daftar media = benih LATER + gambar yang ditemukan di kode (selain yang sudah di paket) */
  var imgs = new Set(LATER.map(norm).filter(isImg)), ocr = LATER.map(norm).filter(isOcr);
  imgFound.forEach(function (a) { if (!files.has(a)) imgs.add(a); });
  var images = Array.from(imgs).sort();

  if (haveCache && meta.hash === hash) {
    meta.checkedAt = now; meta.images = images; meta.ocr = ocr;
    await setMeta(meta);
    return { changed: false };
  }

  /* 4) bangun paket baru (baru dipakai setelah SEMUA berhasil ditulis) */
  var name = PREFIX + hash.slice(0, 10);
  await caches.delete(name);
  var cache = await caches.open(name), bytes = 0, count = 0;
  for (var j = 0; j < names.length; j++) {
    var f3 = files.get(names[j]);
    if (f3.missing) continue;
    var resp = function () { return new Response(f3.buf, { status: 200, headers: { "Content-Type": f3.type || guessType(f3.u) } }); };
    await cache.put(abs(f3.u), resp());
    if (f3.u === "index.html") await cache.put(SCOPE, resp());
    bytes += f3.buf.byteLength; count++;
  }
  var first = !(meta && meta.hash);
  var nm = { gen: GEN, cache: name, hash: hash, version: hash.slice(0, 8), builtAt: now, checkedAt: now, files: count, bytes: bytes, images: images, ocr: ocr, mediaCheckedAt: meta && meta.mediaCheckedAt || 0 };
  await setMeta(nm);
  curP = Promise.resolve(name);
  var keys = await caches.keys();
  await Promise.all(keys.filter(function (k) { return k !== name && k !== MEDIA && k !== META; }).map(function (k) { return caches.delete(k); }));
  await broadcast({ type: first ? "SHELL_READY" : "UPDATE_READY", version: nm.version });
  return { changed: true, first: first };
}

/* ---------- gambar materi & OCR ---------- */
var mediaP = null;
function prefetchMedia(opts) {
  if (mediaP) return mediaP;
  mediaP = doMedia(opts || {}).then(function (r) { mediaP = null; return r; }, function (e) { mediaP = null; throw e; });
  return mediaP;
}
async function mediaState() {
  var meta = (await getMeta()) || {};
  var images = meta.images || LATER.map(norm).filter(isImg), ocr = meta.ocr || LATER.map(norm).filter(isOcr);
  var cache = await caches.open(MEDIA);
  var have = new Set((await cache.keys()).map(function (r) { return rel(r.url); }));
  return { meta: meta, images: images, ocr: ocr, cache: cache, have: have };
}
async function doMedia(opts) {
  var st = await mediaState();
  var revalidate = !st.meta.mediaCheckedAt || Date.now() - st.meta.mediaCheckedAt > MEDIA_GAP;
  var all = st.images.concat(opts.skipOcr ? [] : st.ocr);
  var missing = all.filter(function (u) { return !st.have.has(u); });
  var stale = revalidate ? st.images.filter(function (u) { return st.have.has(u); }) : [];
  var total = st.images.length + st.ocr.length, done = total - st.images.concat(st.ocr).filter(function (u) { return !st.have.has(u); }).length;
  var failed = 0, n = 0;
  await pool(missing.concat(stale), 4, async function (u) {
    var isNew = !st.have.has(u);
    try {
      var res = await fetch(abs(u), { cache: "no-cache" });
      if (res.status === 404) { if (isNew) total--; }
      else if (res.ok && res.status === 200) { await st.cache.put(abs(u), res); if (isNew) done++; }
      else if (isNew) failed++;
    } catch (e) { if (isNew) failed++; }
    n++;
    if (isNew && (done === total || n % 6 === 0)) broadcast({ type: "CACHE_PROGRESS", done: done, total: total });
  });
  var meta = (await getMeta()) || st.meta;
  if (revalidate && !failed) { meta.mediaCheckedAt = Date.now(); await setMeta(meta); }
  await broadcast({ type: "CACHE_DONE", version: meta.version || "", done: done, total: total, failed: failed });
  return { done: done, total: total, failed: failed };
}
async function status() {
  var st = await mediaState(), meta = st.meta;
  function cnt(a) { return a.filter(function (u) { return st.have.has(u); }).length; }
  return {
    type: "STATUS", gen: GEN, version: meta.version || "", builtAt: meta.builtAt || 0, checkedAt: meta.checkedAt || 0,
    files: meta.files || 0, bytes: meta.bytes || 0, shellOk: !!(meta.cache && await caches.has(meta.cache)),
    imgDone: cnt(st.images), imgTotal: st.images.length, ocrDone: cnt(st.ocr), ocrTotal: st.ocr.length
  };
}

/* ---------- siklus hidup ---------- */
self.addEventListener("install", function (event) {
  event.waitUntil(
    syncShell({ force: true }).catch(function (err) {
      /* sudah punya paket generasi 3 yang sehat? lanjut memakainya; bila belum, batalkan agar SW lama tetap jalan */
      return getMeta().then(function (m) { return (m && m.cache ? caches.has(m.cache) : false); }).then(function (ok) { if (!ok) throw err; });
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    getMeta().then(function (m) {
      var keep = [MEDIA, META, m && m.cache];
      return caches.keys().then(function (keys) { return Promise.all(keys.filter(function (k) { return keep.indexOf(k) < 0; }).map(function (k) { return caches.delete(k); })); });
    }).then(function () { return self.clients.claim(); }).then(function () { return prefetchMedia().catch(function () {}); })
  );
});

self.addEventListener("message", function (event) {
  var d = event.data || {}, src = event.source;
  if (d.type === "SKIP_WAITING") { self.skipWaiting(); return; }
  if (d.type === "CHECK") {
    event.waitUntil(syncShell({ force: !!d.force }).then(function (r) { return (r && r.changed) ? prefetchMedia({ skipOcr: !!d.saveData }) : null; }).catch(function () {}).then(function () { return status(); }).then(function (s) { if (src) src.postMessage(s); }));
  } else if (d.type === "CACHE_ALL") {
    event.waitUntil(prefetchMedia({ skipOcr: !!d.saveData }).catch(function () {}));
  } else if (d.type === "STATUS") {
    event.waitUntil(status().then(function (s) { if (src) src.postMessage(s); }));
  } else if (d.type === "RESET") {
    event.waitUntil(
      caches.keys().then(function (keys) { return Promise.all(keys.map(function (k) { return caches.delete(k); })); })
        .then(function () { curP = null; return syncShell({ force: true }); })
        .then(function () { return prefetchMedia({}); })
        .catch(function (e) { return broadcast({ type: "RESET_FAILED", message: String(e && e.message || e) }); })
    );
  }
});

self.addEventListener("sync", function (event) {
  if (event.tag === "lp-update-once") event.waitUntil(syncShell({ force: true }).then(function () { return prefetchMedia(); }));
});
self.addEventListener("periodicsync", function (event) {
  if (event.tag === "lp-update") event.waitUntil(syncShell({ force: true }).then(function () { return prefetchMedia(); }).catch(function () {}));
});

/* ---------- melayani permintaan ---------- */
function offlinePage() {
  return new Response('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline</title>' +
    '<body style="font-family:sans-serif;padding:40px 24px;text-align:center;background:#071433;color:#fff"><h2>Belum tersimpan untuk offline</h2>' +
    '<p style="color:#B6C6E8;line-height:1.6">Sambungkan internet sekali, buka situs ini, tunggu muncul tulisan “Siap dipakai offline”, lalu coba lagi.</p>' +
    '<p><button onclick="location.reload()" style="padding:12px 22px;border:0;border-radius:12px;font-weight:800;background:#1D5CFF;color:#fff">Coba lagi</button></p></body>',
    { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

async function serve(event, req, isNav) {
  var cur = await getCur(), hit = null;
  if (cur) {
    try {
      var c = await caches.open(cur);
      hit = await c.match(isNav ? abs("index.html") : req, { ignoreSearch: true });
    } catch (e) {}
  }
  if (!hit) { try { hit = await (await caches.open(MEDIA)).match(req, { ignoreSearch: true }); } catch (e) {} }
  if (isNav) {                                   /* cek pembaruan di belakang layar (tidak menahan tampilan) */
    event.waitUntil(syncShell({}).then(function (r) { return (r && r.changed) ? prefetchMedia() : null; }).catch(function () {}));
  }
  if (hit) return hit;
  try {
    var res = await fetch(req);
    if (res && res.ok && res.status === 200 && !isNav) {
      var r = rel(req.url), target = (r && (isImg(r) || isOcr(r))) ? MEDIA : cur;
      if (target) { var copy = res.clone(); event.waitUntil(caches.open(target).then(function (c2) { return c2.put(req, copy); }).catch(function () {})); }
    }
    return res;
  } catch (e) {
    return isNav ? offlinePage() : new Response("", { status: 504, statusText: "Offline" });
  }
}

self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.href.indexOf(SCOPE) !== 0) return;
  if (req.headers.has("range")) return;
  if (url.pathname.slice(-6) === "/sw.js") return;           /* biarkan browser memeriksa sw.js langsung */
  event.respondWith(serve(event, req, req.mode === "navigate"));
});
