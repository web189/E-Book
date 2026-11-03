/* pwa.js — mode offline, update otomatis, dan tombol instal (HP & Windows).
   Aman untuk Chrome 109 / Windows 7. Semua opsional: bila gagal, situs tetap normal. */
(function () {
  "use strict";
  var win = window, doc = document, nav = navigator;
  function noop() {}
  function ls(k, v) {
    try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {}
    return null;
  }
  function el(tag, cls, html) { var e = doc.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; return e; }
  function standalone() {
    return (win.matchMedia && win.matchMedia("(display-mode: standalone)").matches) || nav.standalone === true;
  }
  var ICON_INSTALL = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="12" rx="2.6"/><path d="M8.5 20h7M12 16v4"/><path d="M12 6.6v5M12 11.8 9.9 9.7M12 11.8l2.1-2.1"/></svg>';

  /* ---------- toast kecil ---------- */
  var toastEl = null, toastTimer = null;
  function toast(msg, kind, ms) {
    if (!toastEl) { toastEl = el("div", "pw-toast"); toastEl.setAttribute("role", "status"); doc.body.appendChild(toastEl); }
    toastEl.className = "pw-toast " + (kind || "");
    toastEl.textContent = msg;
    void toastEl.offsetWidth;
    toastEl.className += " show";
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.className = toastEl.className.replace(" show", ""); }, ms || 3600);
  }

  /* ========================================================================
     1) UPDATE OTOMATIS
     ======================================================================== */
  var reg = null, baseline = null, updating = false;
  var hadController = !!(nav.serviceWorker && nav.serviceWorker.controller);
  var WATCH = ["index.html", "app.js", "ui26.css", "style.css", "pwa.js", "sw.js"];
  var updEl = null, updTimer = null;

  function fingerprint() {
    return Promise.all(WATCH.map(function (u) {
      return fetch(u, { method: "HEAD", cache: "no-store" }).then(function (r) {
        return r.ok ? (r.headers.get("etag") || r.headers.get("last-modified") || r.headers.get("content-length") || "") : "?";
      });
    })).then(function (a) { return a.join("|"); }).catch(function () { return null; });
  }
  function typing() {
    var a = doc.activeElement;
    return !!a && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable);
  }
  function reloadNow() {
    try { sessionStorage.setItem("lp_skip_splash", "1"); } catch (e) {}
    win.location.reload();
  }
  function showUpdate() {
    if (updating) return; updating = true;
    updEl = el("div", "pw-upd");
    updEl.setAttribute("role", "status");
    updEl.innerHTML = '<span class="pw-spin"></span><div class="t">Versi terbaru ditemukan<small>Memperbarui otomatis…</small></div><button type="button">Perbarui</button>';
    doc.body.appendChild(updEl);
    void updEl.offsetWidth; updEl.className += " show";
    updEl.querySelector("button").addEventListener("click", reloadNow);
    var wait = 2800;
    (function tick() {
      if (typing()) {
        updEl.querySelector("small").textContent = "Anda sedang mengisi data — tekan Perbarui jika sudah selesai.";
        updTimer = setTimeout(tick, 1500); return;
      }
      updTimer = setTimeout(reloadNow, wait);
    })();
  }
  function checkUpdate() {
    if (nav.onLine === false || updating) return;
    if (reg) { try { reg.update().catch(noop); } catch (e) {} }
    fingerprint().then(function (v) {
      if (!v) return;
      if (baseline === null) { baseline = v; return; }
      if (v !== baseline) showUpdate();
    });
  }

  /* ========================================================================
     2) REGISTRASI SERVICE WORKER + SIMPAN UNTUK OFFLINE
     ======================================================================== */
  function setupSW() {
    if (!("serviceWorker" in nav)) return;
    nav.serviceWorker.addEventListener("controllerchange", function () { if (hadController) showUpdate(); hadController = true; });
    nav.serviceWorker.addEventListener("message", function (e) {
      var d = e.data || {};
      if (d.type === "CACHE_DONE" && ls("lp_offline_ready") !== d.version) {
        ls("lp_offline_ready", d.version);
        toast("Siap dipakai offline ✓", "ok", 4200);
      }
    });
    nav.serviceWorker.register("sw.js").then(function (r) {
      reg = r;
      r.addEventListener("updatefound", function () {
        var w = r.installing; if (!w) return;
        w.addEventListener("statechange", function () { if (w.state === "installed" && nav.serviceWorker.controller) { /* skipWaiting di sw.js */ } });
      });
      return nav.serviceWorker.ready;
    }).then(function (r) {
      if (nav.onLine !== false && r.active) r.active.postMessage({ type: "CACHE_ALL" });
    }).catch(noop);
  }

  /* ========================================================================
     3) STATUS ONLINE / OFFLINE
     ======================================================================== */
  var chip = null, chipTimer = null, wasOffline = false;
  function chipShow(text, cls, ms) {
    if (!chip) { chip = el("div", "pw-net"); chip.setAttribute("role", "status"); doc.body.appendChild(chip); }
    chip.textContent = text; chip.className = "pw-net " + cls; void chip.offsetWidth; chip.className += " show";
    clearTimeout(chipTimer);
    if (ms) chipTimer = setTimeout(function () { chip.className = chip.className.replace(" show", ""); }, ms);
  }
  function netChange() {
    if (nav.onLine === false) { wasOffline = true; chipShow("Mode offline — memakai versi tersimpan", "off", 5000); }
    else if (wasOffline) { wasOffline = false; chipShow("Kembali online — memeriksa pembaruan…", "on", 3200); setTimeout(checkUpdate, 600); }
  }

  /* ========================================================================
     4) TOMBOL & PANEL INSTAL
     ======================================================================== */
  var deferred = null, installed = false, sheet = null, banner = null;
  var ua = nav.userAgent || "";
  var IOS = /iPad|iPhone|iPod/.test(ua) || (nav.platform === "MacIntel" && nav.maxTouchPoints > 1);
  var ANDROID = /Android/.test(ua), FIREFOX = /Firefox/.test(ua), WIN7 = /Windows NT 6\.1/.test(ua);

  function btns() { return doc.querySelectorAll("#installAppBtn,#installAppBtnMobile"); }
  function refreshBtns() {
    var hide = installed || standalone();
    var list = btns();
    for (var i = 0; i < list.length; i++) list[i].hidden = hide;
  }
  function stepsHtml() {
    var s;
    if (IOS) s = ["Ketuk tombol <b>Bagikan</b> (kotak dengan panah ke atas) di Safari.", "Pilih <b>Tambah ke Layar Utama</b>.", "Ketuk <b>Tambah</b> — ikon aplikasi muncul di layar HP."];
    else if (ANDROID) s = ["Ketuk menu <b>⋮</b> di pojok kanan atas Chrome.", "Pilih <b>Instal aplikasi</b> atau <b>Tambahkan ke layar utama</b>.", "Ketuk <b>Instal</b>."];
    else if (FIREFOX) s = ["Firefox di komputer belum mendukung pemasangan aplikasi.", "Buka situs ini lewat <b>Chrome</b> atau <b>Edge</b>, lalu pasang dari sana."];
    else s = ["Klik ikon <b>Instal</b> (monitor dengan panah) di sisi kanan kolom alamat.", "Atau buka menu <b>⋮</b> → <b>Instal LP-MODUL</b> / <b>Simpan dan bagikan → Instal sebagai aplikasi</b>.", "Klik <b>Instal</b> — ikon muncul di Desktop &amp; Start Menu."];
    return '<ol class="pw-steps"><li>' + s.join("</li><li>") + "</li></ol>" +
      (WIN7 ? '<p class="pw-note">Windows 7: gunakan Chrome versi 109 (versi terakhir yang mendukung Windows 7).</p>' : '<p class="pw-note">Sudah terpasang? Buka dari layar utama / Start Menu.</p>');
  }
  function buildSheet() {
    if (sheet) return;
    sheet = el("div", "pw-ov");
    sheet.innerHTML =
      '<div class="pw-sheet" role="dialog" aria-modal="true" aria-labelledby="pwTitle">' +
      '<button type="button" class="pw-x" aria-label="Tutup">✕</button>' +
      '<div class="pw-app"><img src="assets/icons/logo-dms.webp" alt=""></div>' +
      '<h2 id="pwTitle">Pasang LP-MODUL</h2>' +
      '<p class="pw-sub">Jadikan aplikasi di HP atau komputer Windows. Buka sekali tekan, tanpa mengetik alamat.</p>' +
      '<ul class="pw-perks"><li>\u2713 Buka cepat</li><li>\u2713 Bisa offline</li><li>\u2713 Update otomatis</li></ul>' +
      '<div id="pwBody"></div></div>';
    doc.body.appendChild(sheet);
    sheet.addEventListener("click", function (e) { if (e.target === sheet) closeSheet(); });
    sheet.querySelector(".pw-x").addEventListener("click", closeSheet);
    doc.addEventListener("keydown", function (e) { if (e.key === "Escape" || e.keyCode === 27) closeSheet(); });
  }
  function openSheet() {
    buildSheet();
    var body = sheet.querySelector("#pwBody");
    if (deferred) {
      body.innerHTML = '<button type="button" class="pw-go">' + ICON_INSTALL + 'Pasang Sekarang</button>';
      body.querySelector("button").addEventListener("click", function () { closeSheet(); nativeInstall(); });
    } else body.innerHTML = stepsHtml();
    void sheet.offsetWidth; sheet.className = "pw-ov show";
  }
  function closeSheet() { if (sheet) sheet.className = "pw-ov"; }
  function nativeInstall() {
    if (!deferred) { openSheet(); return; }
    var d = deferred; deferred = null;
    try {
      d.prompt();
      d.userChoice.then(function (c) { if (c && c.outcome === "accepted") { installed = true; refreshBtns(); } }).catch(noop);
    } catch (e) { openSheet(); }
  }
  function onInstallClick() { hideBanner(true); if (deferred) nativeInstall(); else openSheet(); }

  function hideBanner(remember) {
    if (banner) banner.className = "pw-banner";
    if (remember) ls("lp_ib_dismiss", String(Date.now()));
  }
  function maybeBanner() {
    if (installed || standalone() || banner) return;
    if (!(deferred || IOS)) return;
    var t = parseInt(ls("lp_ib_dismiss") || "0", 10);
    if (t && Date.now() - t < 7 * 86400000) return;
    banner = el("div", "pw-banner");
    banner.setAttribute("role", "dialog");
    banner.innerHTML = '<div class="pw-app"><img src="assets/icons/logo-dms.webp" alt=""></div>' +
      '<div class="tx"><b>Pasang aplikasi LP-MODUL</b><span class="t">Buka cepat &amp; bisa offline</span></div>' +
      '<div class="ac"><button type="button" class="ok">Pasang</button><button type="button" class="no">Nanti</button></div>';
    doc.body.appendChild(banner);
    banner.querySelector(".ok").addEventListener("click", onInstallClick);
    banner.querySelector(".no").addEventListener("click", function () { hideBanner(true); });
    setTimeout(function () { if (banner && !installed) { void banner.offsetWidth; banner.className = "pw-banner show"; } }, 600);
  }

  function setupInstall() {
    win.addEventListener("beforeinstallprompt", function (e) {
      e.preventDefault(); deferred = e; refreshBtns();
      setTimeout(maybeBanner, 5200);          // setelah splash selesai
    });
    win.addEventListener("appinstalled", function () {
      installed = true; deferred = null; refreshBtns(); hideBanner(false); closeSheet();
      toast("Aplikasi berhasil dipasang ✓", "ok", 4200);
    });
    var list = btns();
    for (var i = 0; i < list.length; i++) list[i].addEventListener("click", onInstallClick);
    refreshBtns();
    if (IOS) setTimeout(maybeBanner, 6500);
  }

  /* ========================================================================
     MULAI
     ======================================================================== */
  function start() {
    setupInstall();
    setupSW();
    win.addEventListener("online", netChange);
    win.addEventListener("offline", netChange);
    if (nav.onLine === false) netChange();
    win.addEventListener("load", function () { setTimeout(checkUpdate, 1500); });
    doc.addEventListener("visibilitychange", function () { if (!doc.hidden) checkUpdate(); });
    win.addEventListener("focus", checkUpdate);
    setInterval(function () { if (!doc.hidden) checkUpdate(); }, 5 * 60 * 1000);
  }
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", start); else start();
})();
