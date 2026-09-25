/* ==========================================================================
   MODUL MATERI PELATIHAN ADMIN GDNG PRG 2026
   Vanilla JS application
   Architecture: Service layer (DataService/AuthService/ThemeService) is kept
   separate from UI rendering so that DataService can later be swapped for a
   Firebase-backed implementation without touching the render functions.
   ========================================================================== */
(function () {
  "use strict";

  /* ------------------------------------------------------------------ */
  /* 0. CONFIG                                                           */
  /* ------------------------------------------------------------------ */
  var ADMIN_USERNAME = "admin";
  var ADMIN_PASSWORD = "admin123";
  var SESSION_KEY = "gdngprg_session";
  var MAX_IMAGE_MB = 1.5;

  var LS_KEYS = {
    contents: "gdngprg_contents",
    materials: "gdngprg_materials",
    images: "gdngprg_images",
    settings: "gdngprg_settings",
    theme: "gdngprg_theme"
  };
  // Bump this whenever the built-in seed content changes, so browsers that
  // already have older data in LocalStorage get refreshed automatically
  // instead of keeping stale materials forever.
  var DATA_VERSION = "2026.09.26-btb-bkb-supplier-update-v7";
  var DATA_VERSION_KEY = "gdngprg_data_version";

  /* ------------------------------------------------------------------ */
  /* 1. UTILITIES                                                        */
  /* ------------------------------------------------------------------ */
  var Utils = {
    uid: function (prefix) {
      return (prefix || "id") + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
    },
    escapeHtml: function (str) {
      if (str === undefined || str === null) return "";
      return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    },
    slugify: function (str) {
      return String(str || "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
    },
    formatDate: function (iso) {
      if (!iso) return "-";
      try {
        var d = new Date(iso);
        return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) +
          " " + d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
      } catch (e) { return iso; }
    },
    debounce: function (fn, wait) {
      var t;
      return function () {
        var args = arguments, ctx = this;
        clearTimeout(t);
        t = setTimeout(function () { fn.apply(ctx, args); }, wait);
      };
    },
    // Very small allow-list HTML sanitizer for the local prototype.
    // Removes script/style/iframe tags and inline event handlers / javascript: URLs.
    sanitizeHtml: function (html) {
      var tpl = document.createElement("template");
      tpl.innerHTML = html || "";
      var walk = function (node) {
        var toRemove = [];
        node.childNodes.forEach(function (child) {
          if (child.nodeType === 1) {
            var tag = child.tagName.toLowerCase();
            if (tag === "script" || tag === "style" || tag === "iframe" || tag === "object" || tag === "embed") {
              toRemove.push(child);
              return;
            }
            [].slice.call(child.attributes).forEach(function (attr) {
              var name = attr.name.toLowerCase();
              var val = attr.value || "";
              if (name.indexOf("on") === 0) child.removeAttribute(attr.name);
              if ((name === "href" || name === "src") && val.trim().toLowerCase().indexOf("javascript:") === 0) {
                child.removeAttribute(attr.name);
              }
            });
            walk(child);
          }
        });
        toRemove.forEach(function (n) { n.remove(); });
      };
      walk(tpl.content);
      return tpl.innerHTML;
    }
  };

  /* ------------------------------------------------------------------ */
  /* 2. THEME SERVICE                                                    */
  /* ------------------------------------------------------------------ */
  var ThemeService = {
    get: function () {
      return localStorage.getItem(LS_KEYS.theme) || "light";
    },
    apply: function (theme) {
      document.documentElement.setAttribute("data-theme", theme);
    },
    set: function (theme) {
      localStorage.setItem(LS_KEYS.theme, theme);
      this.apply(theme);
    },
    toggle: function () {
      var next = this.get() === "dark" ? "light" : "dark";
      this.set(next);
      return next;
    },
    init: function () {
      this.apply(this.get());
    }
  };

  /* ------------------------------------------------------------------ */
  /* 3. TOAST + CONFIRM                                                  */
  /* ------------------------------------------------------------------ */
  var Toast = {
    root: null,
    init: function () { this.root = document.getElementById("toastRoot"); },
    show: function (message, type, durationMs) {
      type = type || "success";
      var el = document.createElement("div");
      el.className = "toast " + type;
      var icon = type === "success" ? "&#10003;" : type === "error" ? "&#9888;" : "&#8505;";
      el.innerHTML = "<span>" + icon + "</span><span>" + Utils.escapeHtml(message) + "</span>";
      this.root.appendChild(el);
      setTimeout(function () {
        el.classList.add("toast-fade");
        setTimeout(function () { el.remove(); }, 220);
      }, durationMs || 2800);
    }
  };

  // Image lightbox: any <img> inside the routed #app content (materi reader,
  // step galleries, etc.) can be clicked to view it enlarged. Bound once via
  // delegation on document so it keeps working after every re-render.
  var Lightbox = {
    overlay: null, imgEl: null, captionEl: null,
    init: function () {
      this.overlay = document.getElementById("lightboxOverlay");
      this.imgEl = document.getElementById("lightboxImg");
      this.captionEl = document.getElementById("lightboxCaption");
      var self = this;
      document.getElementById("lightboxClose").addEventListener("click", function () { self.close(); });
      this.overlay.addEventListener("click", function (e) { if (e.target === self.overlay) self.close(); });
      document.addEventListener("keydown", function (e) { if (e.key === "Escape") self.close(); });
      document.addEventListener("click", function (e) {
        var img = e.target.closest("#app img");
        if (img && img.getAttribute("src")) self.open(img.getAttribute("src"), img.getAttribute("alt") || "");
      });
    },
    open: function (src, alt) {
      this.imgEl.src = src;
      this.imgEl.alt = alt;
      this.captionEl.textContent = alt;
      this.overlay.hidden = false;
      document.body.style.overflow = "hidden";
    },
    close: function () {
      this.overlay.hidden = true;
      this.imgEl.src = "";
      document.body.style.overflow = "";
    }
  };

  var Confirm = {
    overlay: null, titleEl: null, bodyEl: null, okBtn: null, cancelBtn: null, _resolve: null,
    init: function () {
      this.overlay = document.getElementById("confirmOverlay");
      this.titleEl = document.getElementById("confirmTitle");
      this.bodyEl = document.getElementById("confirmBody");
      this.okBtn = document.getElementById("confirmOk");
      this.cancelBtn = document.getElementById("confirmCancel");
      var self = this;
      this.okBtn.addEventListener("click", function () { self._close(true); });
      this.cancelBtn.addEventListener("click", function () { self._close(false); });
      this.overlay.addEventListener("click", function (e) { if (e.target === self.overlay) self._close(false); });
    },
    _close: function (result) {
      this.overlay.hidden = true;
      if (this._resolve) { this._resolve(result); this._resolve = null; }
    },
    ask: function (title, body, okLabel) {
      var self = this;
      this.titleEl.textContent = title;
      this.bodyEl.textContent = body;
      this.okBtn.textContent = okLabel || "Hapus";
      this.overlay.hidden = false;
      return new Promise(function (resolve) { self._resolve = resolve; });
    }
  };

  /* ------------------------------------------------------------------ */
  /* 4. DATA SERVICE (LocalStorage now, Firebase-ready later)            */
  /* ------------------------------------------------------------------ */
  var DataService = {
    _read: function (key, fallback) {
      try {
        var raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch (e) {
        console.error("DataService read error", key, e);
        return fallback;
      }
    },
    _write: function (key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (e) {
        console.error("DataService write error", key, e);
        Toast.show("Penyimpanan gagal. LocalStorage mungkin penuh.", "error");
        return false;
      }
    },
    getContents: function () { return this._read(LS_KEYS.contents, []); },
    setContents: function (arr) { return this._write(LS_KEYS.contents, arr); },
    getMaterials: function () { return this._read(LS_KEYS.materials, []); },
    setMaterials: function (arr) { return this._write(LS_KEYS.materials, arr); },
    getImages: function () { return this._read(LS_KEYS.images, []); },
    setImages: function (arr) { return this._write(LS_KEYS.images, arr); },
    getSettings: function () { return this._read(LS_KEYS.settings, { adminName: "Administrator" }); },
    setSettings: function (obj) { return this._write(LS_KEYS.settings, obj); },

    resetAll: function () {
      Object.keys(LS_KEYS).forEach(function (k) {
        if (k !== "theme") localStorage.removeItem(LS_KEYS[k]);
      });
      seedDefaults(true);
    }
  };

  /* ------------------------------------------------------------------ */
  /* 5. AUTH SERVICE (Session-only, ready to swap for Firebase Auth)     */
  /* ------------------------------------------------------------------ */
  var AuthService = {
    login: function (username, password) {
      return new Promise(function (resolve, reject) {
        setTimeout(function () {
          if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
            sessionStorage.setItem(SESSION_KEY, JSON.stringify({ username: username, loginAt: new Date().toISOString() }));
            resolve(true);
          } else {
            reject(new Error("Username atau password salah."));
          }
        }, 500); // small delay to show loading state
      });
    },
    logout: function () { sessionStorage.removeItem(SESSION_KEY); },
    isLoggedIn: function () { return !!sessionStorage.getItem(SESSION_KEY); },
    currentUser: function () {
      try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); } catch (e) { return null; }
    }
  };

  var TX_DMS3_CONTENT = `
<div class="tx-intro">
  <p><strong>Transaksi Flashout</strong> (dikenal juga sebagai <strong>Transaksi DMS 3</strong>) adalah prosedur pemindahan stok berjenjang antar-depo yang wajib dilakukan admin sebelum barang dari depo pemasok bisa "mendarat" sebagai stok siap jual di depo tujuan. Setiap perpindahan barang selalu dicatat dua kali: satu <strong>Bukti Keluar Barang (BKB)</strong> di sisi pengirim, satu <strong>Bukti Terima Barang (BTB)</strong> di sisi penerima &mdash; berpindah dari sistem lama <strong>DMS 3</strong>, transit di <strong>LP Pool Cicurug</strong>, lalu masuk ke <strong>DMS 5 (port 9301)</strong> sampai akhirnya siap dijual di depo tujuan.</p>
  <p>Di bawah ini disusun 3 skenario nyata beserta urutan dokumen dan tangkapan layarnya, supaya admin baru bisa langsung mengikuti alurnya persis seperti aslinya. Pilih skenario dari menu tab di bawah &mdash; setiap gambar juga bisa diklik untuk diperbesar.</p>
</div>

<!-- ================= TAB MENU: pilih skenario ================= -->
<div class="tx-tabs" role="tablist" aria-label="Pilih skenario flashout">
  <button type="button" class="tx-tab active" role="tab" aria-selected="true" aria-controls="txCase1" data-case-target="1">
    <span class="tx-tab-num">01</span>
    <span class="tx-tab-text"><span class="tx-tab-title">Galon dari Parung</span><span class="tx-tab-meta">6 dokumen</span></span>
    <span class="tx-tab-chevron">&rsaquo;</span>
  </button>
  <button type="button" class="tx-tab" role="tab" aria-selected="false" aria-controls="txCase2" data-case-target="2">
    <span class="tx-tab-num">02</span>
    <span class="tx-tab-text"><span class="tx-tab-title">Galon dari Sentul</span><span class="tx-tab-meta">8 dokumen</span></span>
    <span class="tx-tab-chevron">&rsaquo;</span>
  </button>
  <button type="button" class="tx-tab" role="tab" aria-selected="false" aria-controls="txCase3" data-case-target="3">
    <span class="tx-tab-num">03</span>
    <span class="tx-tab-text"><span class="tx-tab-title">SPS dari Cianjur</span><span class="tx-tab-meta">4 dokumen</span></span>
    <span class="tx-tab-chevron">&rsaquo;</span>
  </button>
</div>


<!-- ================= CASE 1: GALON DARI PARUNG ================= -->
<div class="tx-case" id="txCase1" data-case="1">
  <div class="tx-case-head">
    <div class="tx-case-badge">01</div>
    <div>
      <h2>Flashout Galon dari Parung &rarr; Penjualan Parung</h2>
      <p>Stok galon isi ulang (Jug Aqua 19L, tissue &amp; galon kosong) diputar melalui Pool Cicurug sebelum kembali menjadi stok jual di Gudang Layak Pet Parung. 528 botol bergerak di setiap tahap.</p>
    </div>
  </div>
  <div class="tx-steps">

    <div class="tx-step">
      <div class="tx-step-media"><span class="tx-step-num">Langkah 1</span><img src="assets/images/transaksi-dms-3/parung-01-bkb-dms-3-ke-pol-cicurug.webp" alt="BKB DMS 3 ke Pool Cicurug" loading="lazy"></div>
      <div class="tx-step-body">
        <span class="tx-step-tag tag-out">BKB Depo &middot; Barang Keluar</span>
        <h3 class="tx-step-title">Keluarkan Barang Menuju Pool Cicurug (DMS 3)</h3>
        <p class="tx-step-desc">Titik awal siklus: <strong>Bukti Keluar Barang Cabang</strong> diterbitkan dari Gudang Layak Pet Parung dengan Depo Tujuan 288 (LP Pool Cicurug), mengeluarkan 528 unit Jug Aqua 19L, tissue, dan galon isi sebagai titik transit sebelum masuk DMS 5.</p>
      </div>
    </div>

    <div class="tx-step">
      <div class="tx-step-media"><span class="tx-step-num">Langkah 2</span><img src="assets/images/transaksi-dms-3/parung-03-btb-dms-5-port-9301-dari-depo-parung.webp" alt="BTB DMS 5 port 9301 dari Depo Parung" loading="lazy"></div>
      <div class="tx-step-body">
        <span class="tx-step-tag">BTB Depo &middot; Barang Masuk</span>
        <h3 class="tx-step-title">Lanjutkan ke Distribution Management System 5.0</h3>
        <p class="tx-step-desc">Di sistem baru <strong>DMS 5.0 (port 9301)</strong>, menu <em>BTB Depot</em> menerima kembali barang dari Depo 281 (LP Parung) ke gudang <strong>002-W01 Gudang NGG LP</strong> &mdash; menandai barang resmi tercatat di sistem terbaru.</p>
      </div>
    </div>

    <div class="tx-step">
      <div class="tx-step-media"><span class="tx-step-num">Langkah 3</span><img src="assets/images/transaksi-dms-3/parung-04-bkb-distribus-dms-5-port-9301.webp" alt="BKB Distribusi DMS 5 port 9301" loading="lazy"></div>
      <div class="tx-step-body">
        <span class="tx-step-tag tag-out">BKB Distribusi &middot; Keluar</span>
        <h3 class="tx-step-title">Proses Bukti Keluar Barang Distribusi</h3>
        <p class="tx-step-desc">Melalui menu <em>Transaksi Distribusi</em>, dokumen BKB Distribusi diterbitkan lengkap dengan referensi Dokumen Permintaan Barang dan keterangan salesman/driver, menyiapkan barang untuk didistribusikan ke tujuan penjualan.</p>
      </div>
    </div>

    <div class="tx-step">
      <div class="tx-step-media"><span class="tx-step-num">Langkah 4</span><img src="assets/images/transaksi-dms-3/parung-05-btb-distribus-dms-5-port-9301.webp" alt="BTB Distribusi DMS 5 port 9301" loading="lazy"></div>
      <div class="tx-step-body">
        <span class="tx-step-tag">BTB Distribusi &middot; Masuk</span>
        <h3 class="tx-step-title">Konfirmasi Penerimaan Distribusi</h3>
        <p class="tx-step-desc">Sebagai pasangannya, <em>BTB Distribusi</em> mengonfirmasi barang telah diterima di gudang tujuan dengan salesman dan kendaraan yang sama, menutup siklus distribusi internal dengan rapi.</p>
      </div>
    </div>

    <div class="tx-step">
      <div class="tx-step-media"><span class="tx-step-num">Langkah 5</span><img src="assets/images/transaksi-dms-3/parung-06-bkb-dms-5-port-9301-ke-depo-parung.webp" alt="BKB DMS 5 port 9301 ke Depo Parung" loading="lazy"></div>
      <div class="tx-step-body">
        <span class="tx-step-tag tag-out">BKB Depo &middot; Barang Keluar</span>
        <h3 class="tx-step-title">Selesai &mdash; Barang Siap Jual di Parung</h3>
        <p class="tx-step-desc">Dokumen penutup <em>BKB Depot</em> di DMS 5.0 mengeluarkan barang menuju Depo Tujuan 281 (LP Parung), menandakan seluruh 528 unit Jug Aqua, tissue, dan galon isi resmi kembali menjadi stok Depo Parung.</p>
      </div>
    </div>

    <div class="tx-step">
      <div class="tx-step-media"><span class="tx-step-num">Langkah 6</span><img src="assets/images/transaksi-dms-3/parung-02-btb-dms-3-dari-pol-cicurug.webp" alt="BTB DMS 3 dari Pool Cicurug" loading="lazy"></div>
      <div class="tx-step-body">
        <span class="tx-step-tag">BTB Depo &middot; Barang Masuk</span>
        <h3 class="tx-step-title">Terima Barang di Gudang Layak Pet Parung (DMS 3)</h3>
        <p class="tx-step-desc">Menutup siklus di sistem DMS 3: dokumen <strong>Bukti Terima Barang Cabang</strong> dibuat di gudang <strong>281-W13 Gudang Layak Pet Parung</strong>, mencatat kedatangan barang dari LP Pool Cicurug: Jug Aqua 19L, tissue, dan galon isi masing-masing 528 unit dengan tipe stok Jual &mdash; barang resmi siap jual di Parung.</p>
      </div>
    </div>

  </div>
  <div class="tx-note"><b>Catatan:</b>&nbsp;Total 6 dokumen (3 pasang BKB/BTB) harus selesai berurutan pada tanggal transaksi yang sama agar posisi stok di kedua sistem (DMS 3 &amp; DMS 5) tetap sinkron.</div>
</div>

<!-- ================= CASE 2: GALON DARI SENTUL ================= -->
<div class="tx-case" id="txCase2" data-case="2" hidden>
  <div class="tx-case-head">
    <div class="tx-case-badge">02</div>
    <div>
      <h2>Flashout Galon dari Sentul &rarr; Penjualan Parung</h2>
      <p>Skenario ini lebih panjang: selain memindahkan 528 unit galon &amp; Jug Aqua dari Sentul ke Parung, ada siklus tambahan untuk mengembalikan Jug Aqua kosong dari Pool Cicurug ke Depo Sentul.</p>
    </div>
  </div>
  <div class="tx-steps">

    <div class="tx-step">
      <div class="tx-step-media"><span class="tx-step-num">Langkah 1</span><img src="assets/images/transaksi-dms-3/sentul-01-btb-dms-3-dari-depo-sentul.webp" alt="BTB DMS 3 dari Depo Sentul" loading="lazy"></div>
      <div class="tx-step-body">
        <span class="tx-step-tag">BTB Depo &middot; Barang Masuk</span>
        <h3 class="tx-step-title">Terima Kiriman dari Depo Sentul</h3>
        <p class="tx-step-desc">Gudang Layak Pet Parung menerima 528 unit Jug Aqua 19L, tissue, dan galon isi yang dikirim dari <strong>LP Sentul (Depo 283)</strong>, diangkut Angkutan Prima Jaya.</p>
      </div>
    </div>

    <div class="tx-step">
      <div class="tx-step-media"><span class="tx-step-num">Langkah 2</span><img src="assets/images/transaksi-dms-3/sentul-02-bkb-dms-3-ke-pol-cicurug.webp" alt="BKB DMS 3 ke Pool Cicurug" loading="lazy"></div>
      <div class="tx-step-body">
        <span class="tx-step-tag tag-out">BKB Depo &middot; Barang Keluar</span>
        <h3 class="tx-step-title">Teruskan ke LP Pool Cicurug</h3>
        <p class="tx-step-desc">Barang yang sama langsung diteruskan keluar menuju Depo Tujuan 288 (LP Pool Cicurug), menjaga kuantitas tetap 528 unit sebagai titik transit sebelum masuk DMS 5.</p>
      </div>
    </div>

    <div class="tx-step">
      <div class="tx-step-media"><span class="tx-step-num">Langkah 3</span><img src="assets/images/transaksi-dms-3/sentul-03-btb-dms-5-port-9301-dari-depo-parung.webp" alt="BTB DMS 5 port 9301 dari Depo Parung" loading="lazy"></div>
      <div class="tx-step-body">
        <span class="tx-step-tag">BTB Depo &middot; Barang Masuk</span>
        <h3 class="tx-step-title">Masuk Resmi ke DMS 5.0</h3>
        <p class="tx-step-desc">Di <em>Distribution Management System 5.0</em>, BTB Depot mencatat kedatangan barang dari Depo 281 ke Gudang NGG LP &mdash; melanjutkan alur ke sistem port 9301.</p>
      </div>
    </div>

    <div class="tx-step">
      <div class="tx-step-media"><span class="tx-step-num">Langkah 4</span><img src="assets/images/transaksi-dms-3/sentul-04-bkb-distribusi-dms-5-port-9301.webp" alt="BKB Distribusi DMS 5 port 9301" loading="lazy"></div>
      <div class="tx-step-body">
        <span class="tx-step-tag tag-out">BKB Distribusi &middot; Keluar</span>
        <h3 class="tx-step-title">Siapkan Distribusi ke Tujuan Jual</h3>
        <p class="tx-step-desc">Menu Transaksi Distribusi menerbitkan BKB Distribusi dengan referensi Dokumen Permintaan Barang, salesman/driver, dan kendaraan lengkap sebelum barang berangkat ke lokasi penjualan.</p>
      </div>
    </div>

    <div class="tx-step">
      <div class="tx-step-media"><span class="tx-step-num">Langkah 5</span><img src="assets/images/transaksi-dms-3/sentul-05-btb-distribusi-dms-5-port-9301.webp" alt="BTB Distribusi DMS 5 port 9301" loading="lazy"></div>
      <div class="tx-step-body">
        <span class="tx-step-tag">BTB Distribusi &middot; Masuk</span>
        <h3 class="tx-step-title">Barang Tiba di Tujuan Distribusi</h3>
        <p class="tx-step-desc">BTB Distribusi menutup pasangan dokumen sebelumnya, mengonfirmasi seluruh unit sampai dengan aman ke gudang tujuan.</p>
      </div>
    </div>

    <div class="tx-step">
      <div class="tx-step-media"><span class="tx-step-num">Langkah 6</span><img src="assets/images/transaksi-dms-3/sentul-06-bkb-dms-5-por-9301-ke-depo-parung.webp" alt="BKB DMS 5 port 9301 ke Depo Parung" loading="lazy"></div>
      <div class="tx-step-body">
        <span class="tx-step-tag tag-out">BKB Depo &middot; Barang Keluar</span>
        <h3 class="tx-step-title">Stok Resmi Jadi Milik Parung</h3>
        <p class="tx-step-desc">BKB Depot mengeluarkan barang menuju Depo Tujuan 281 (LP Parung) &mdash; babak utama flashout selesai, 528 unit siap dijual.</p>
      </div>
    </div>

    <div class="tx-step">
      <div class="tx-step-media"><span class="tx-step-num">Langkah 7</span><img src="assets/images/transaksi-dms-3/sentul-07-btb-dms-3-dari-pol-cicurug.webp" alt="BTB DMS 3 dari Pool Cicurug" loading="lazy"></div>
      <div class="tx-step-body">
        <span class="tx-step-tag">BTB Depo &middot; Barang Masuk</span>
        <h3 class="tx-step-title">Babak Tambahan: Galon Kosong Kembali</h3>
        <p class="tx-step-desc">Sebagai siklus balik, Gudang Layak Pet Parung kembali menerima 528 botol Jug Aqua 19L (galon kosong) dari LP Pool Cicurug &mdash; siap dikembalikan ke titik asalnya.</p>
      </div>
    </div>

    <div class="tx-step">
      <div class="tx-step-media"><span class="tx-step-num">Langkah 8</span><img src="assets/images/transaksi-dms-3/sentul-08-bkb-dms-3-ke-depo-sentul.webp" alt="BKB DMS 3 ke Depo Sentul" loading="lazy"></div>
      <div class="tx-step-body">
        <span class="tx-step-tag tag-out">BKB Depo &middot; Barang Keluar</span>
        <h3 class="tx-step-title">Galon Kosong Pulang ke Sentul</h3>
        <p class="tx-step-desc">Dokumen penutup BKB Depot mengirim 528 botol Jug Aqua kosong kembali ke Depo Tujuan 283 (LP Sentul), menyelesaikan siklus penuh bolak-balik galon.</p>
      </div>
    </div>

  </div>
  <div class="tx-note"><b>Catatan:</b>&nbsp;Skenario Sentul terdiri dari 8 dokumen: 6 dokumen pertama memindahkan stok isi ke Parung, 2 dokumen terakhir mengembalikan galon kosong ke Sentul &mdash; jangan sampai terlewat salah satu arah.</div>
</div>

<!-- ================= CASE 3: SPS DARI CIANJUR ================= -->
<div class="tx-case" id="txCase3" data-case="3" hidden>
  <div class="tx-case-head">
    <div class="tx-case-badge">03</div>
    <div>
      <h2>Flashout SPS dari Cianjur &rarr; Penjualan Parung</h2>
      <p>Berbeda produk: skenario ini memindahkan air mineral kemasan <strong>600ml (1x24, sablon gosok)</strong> sebanyak 1.440 box beserta 36 pallet sewa <em>double face</em> dari Depo Cianjur menuju Parung.</p>
    </div>
  </div>
  <div class="tx-steps">

    <div class="tx-step">
      <div class="tx-step-media"><span class="tx-step-num">Langkah 1</span><img src="assets/images/transaksi-dms-3/cianjur-01-btb-dms-3-dari-depo-cianjur.webp" alt="BTB DMS 3 dari Depo Cianjur" loading="lazy"></div>
      <div class="tx-step-body">
        <span class="tx-step-tag">BTB Depo &middot; Barang Masuk</span>
        <h3 class="tx-step-title">Terima Kiriman SPS dari Cianjur</h3>
        <p class="tx-step-desc">Gudang Layak Parung menerima 1.440 box Aqua 600ml (1x24, sablon gosok) dan 36 buah pallet rent double face dari <strong>LP Cianjur (Depo 285)</strong>, diangkut Tirta Utama Abadi.</p>
      </div>
    </div>

    <div class="tx-step">
      <div class="tx-step-media"><span class="tx-step-num">Langkah 2</span><img src="assets/images/transaksi-dms-3/cianjur-02-bkb-dms-3-dari-pol-cicurug.webp" alt="BKB DMS 3 ke Pool Cicurug" loading="lazy"></div>
      <div class="tx-step-body">
        <span class="tx-step-tag tag-out">BKB Depo &middot; Barang Keluar</span>
        <h3 class="tx-step-title">Lanjutkan ke LP Pool Cicurug</h3>
        <p class="tx-step-desc">1.440 box Aqua 600ml diteruskan keluar menuju Depo Tujuan 288 (LP Pool Cicurug) sebagai titik transit sebelum diproses di DMS 5.</p>
      </div>
    </div>

    <div class="tx-step">
      <div class="tx-step-media"><span class="tx-step-num">Langkah 3</span><img src="assets/images/transaksi-dms-3/cianjur-03-btb-dms-5-port-9301-dari-depo-parung.webp" alt="BTB DMS 5 port 9301 dari Depo Parung" loading="lazy"></div>
      <div class="tx-step-body">
        <span class="tx-step-tag">BTB Depo &middot; Barang Masuk</span>
        <h3 class="tx-step-title">Masuk ke Distribution Management System 5.0</h3>
        <p class="tx-step-desc">BTB Depot di DMS 5.0 mencatat kedatangan 1.440 box Aqua 600ml dari Depo 281 ke Gudang NGG LP, meneruskan alur pencatatan ke sistem terbaru.</p>
      </div>
    </div>

    <div class="tx-step">
      <div class="tx-step-media"><span class="tx-step-num">Langkah 4</span><img src="assets/images/transaksi-dms-3/cianjur-04-bkb-dms-5-port-9301.webp" alt="BKB Distribusi DMS 5 port 9301" loading="lazy"></div>
      <div class="tx-step-body">
        <span class="tx-step-tag tag-out">BKB Distribusi &middot; Keluar</span>
        <h3 class="tx-step-title">Selesai &mdash; Siap Didistribusikan untuk Dijual</h3>
        <p class="tx-step-desc">Dokumen penutup BKB Distribusi mengeluarkan 1.440 box Aqua 600ml melalui menu Transaksi Distribusi, lengkap dengan referensi Dokumen Permintaan Barang &mdash; produk resmi siap dipasarkan dari Parung.</p>
      </div>
    </div>

  </div>
  <div class="tx-note"><b>Catatan:</b>&nbsp;Karena tidak ada kemasan yang perlu dikembalikan (bukan galon guna ulang), skenario SPS cukup 4 dokumen: sepasang di DMS 3 dan sepasang lagi di DMS 5.</div>
</div>

<ul class="tx-recap">
  <li><b>3</b>Skenario flashout tercakup</li>
  <li><b>18</b>Total dokumen BTB/BKB</li>
  <li><b>2</b>Sistem yang dilalui (DMS 3 &amp; DMS 5)</li>
</ul>
`;

  var TX_SGM_CONTENT = `
<div class="tx-intro">
  <p><strong>Transaksi Produk SGM</strong> adalah prosedur penerimaan produk susu SGM dari supplier sekaligus cara mengubah satuan stok dari <strong>BOX</strong> menjadi <strong>PCS</strong> (satuan eceran) di sistem. Produk SGM memang unik: setiap kali datang dari supplier, produk tercatat per BOX &mdash; padahal sebagian dijual eceran per PCS. Untuk itu diperlukan satu langkah tambahan yang disebut <strong>morphing</strong>, yaitu memindahkan stok BOX menjadi stok PCS memakai transaksi <strong>BKB Mutasi</strong> dan <strong>BTB Mutasi</strong> ke depo sendiri.</p>
  <p>Ikuti 4 langkah di bawah secara berurutan: mulai dari menerima barang dari supplier, mencetak bukti terimanya, lalu melakukan morphing BOX &rarr; PCS.</p>
</div>

<div class="tx-case-head">
  <div class="tx-case-badge">SGM</div>
  <div>
    <h2>Penerimaan Barang &amp; Morphing BOX ke PCS</h2>
    <p>Contoh nyata: penerimaan SGM Vitagrow Choco dari supplier di Gudang Layak Bogor, dilanjutkan proses morphing di Gudang Layak Metro 2.</p>
  </div>
</div>

<div class="tx-steps">

  <div class="tx-step">
    <div class="tx-step-media"><span class="tx-step-num">Langkah 1</span><img src="assets/images/transaksi-produk-sgm/sgm-01-input-batch-btb-supplier.webp" alt="Penulisan kode batch pada BTB Supplier" loading="lazy"></div>
    <div class="tx-step-body">
      <span class="tx-step-tag">BTB Supplier &middot; Detil Lot</span>
      <h3 class="tx-step-title">Tulis Kode Batch Saat Terima Barang dari Supplier</h3>
      <p class="tx-step-desc">Pada dokumen <strong>Bukti Terima Barang Supplier</strong>, klik ikon kaca pembesar di kolom Lot/SN untuk membuka jendela <strong>UIEntryLot</strong>. Isi <strong>No. Batch</strong> dan <strong>Tanggal Expired</strong> sesuai kemasan fisik produk, lalu pastikan <strong>Kuantiti</strong> pada baris batch sama persis dengan kuantiti produk di atasnya sebelum menekan <strong>Ok</strong>. Batch yang salah tulis di sini akan ikut salah pada seluruh dokumen turunannya.</p>
    </div>
  </div>

  <div class="tx-step">
    <div class="tx-step-media"><span class="tx-step-num">Langkah 2</span><img src="assets/images/transaksi-produk-sgm/sgm-02-cetak-btb-supplier.webp" alt="Hasil cetak BTB Supplier" loading="lazy"></div>
    <div class="tx-step-body">
      <span class="tx-step-tag">BTB Supplier &middot; Cetak</span>
      <h3 class="tx-step-title">Cetak Bukti Terima Barang (Supplier)</h3>
      <p class="tx-step-desc">Setelah dokumen disimpan, cetak sebagai bukti fisik serah terima. Pastikan Nama Depo, Gudang, No. Dokumen, No. Surat Jalan, Kode &amp; Nama Produk, Satuan (BOX), Jumlah, dan Batch ID pada hasil cetak sudah sesuai dengan fisik barang &mdash; dokumen ini yang ditandatangani Warehouse Admin, Checker, Driver, dan Security.</p>
    </div>
  </div>

  <div class="tx-step">
    <div class="tx-step-media"><span class="tx-step-num">Langkah 3</span><img src="assets/images/transaksi-produk-sgm/sgm-03-bkb-mutasi-morphing.webp" alt="BKB Mutasi Morphing box ke pcs" loading="lazy"></div>
    <div class="tx-step-body">
      <span class="tx-step-tag tag-out">BKB Depo &middot; Mutasi (Keluar)</span>
      <h3 class="tx-step-title">Morphing Bagian 1 &mdash; BKB Mutasi ke Depo Sendiri</h3>
      <p class="tx-step-desc">Buka menu <strong>BKB Depo</strong>. Secara normal, BKB Depo dipakai untuk mutasi stok antar-depo yang berbeda (misalnya dari Depo Parung ke Depo Bogor). Khusus morphing SGM, <strong>Depo Tujuan diisi depo itu sendiri</strong> &mdash; barang secara fisik tidak berpindah tempat, hanya satuannya yang berubah. Isi <strong>Driver</strong> dan <strong>Kendaraan</strong> dengan "COUNTER", lalu tulis <strong>MORPHING</strong> pada kolom Keterangan agar mudah ditelusuri kembali. Setelah disimpan, catat <strong>No. Dokumen</strong> BKB ini &mdash; nomor tersebut dibutuhkan sebagai referensi di langkah berikutnya.</p>
    </div>
  </div>

  <div class="tx-step">
    <div class="tx-step-media"><span class="tx-step-num">Langkah 4</span><img src="assets/images/transaksi-produk-sgm/sgm-04-btb-mutasi-morphing.webp" alt="BTB Mutasi Morphing box ke pcs" loading="lazy"></div>
    <div class="tx-step-body">
      <span class="tx-step-tag">BTB Depo &middot; Mutasi (Masuk)</span>
      <h3 class="tx-step-title">Morphing Bagian 2 &mdash; BTB Mutasi Menutup Perubahan Satuan</h3>
      <p class="tx-step-desc">Buka menu <strong>BTB Depo</strong>, dengan <strong>Dari Depo</strong> diisi depo itu sendiri (pasangan dari langkah 3). Pada kolom Keterangan, tulis <strong>No. Dokumen BKB Mutasi tadi diikuti "/MORPHING"</strong> (contoh: <code>902-0051876/MORPHING</code>) sebagai ID referensi. Pilih produk dengan kode ber-akhiran <strong>"P"</strong> (kode satuan PCS) senilai kuantiti yang sama. Setelah tersimpan, stok BOX otomatis berkurang dan stok PCS bertambah pada produk yang sama.</p>
    </div>
  </div>

</div>

<h2>Kode Produk: BOX vs PCS</h2>
<p>Setiap produk SGM punya dua kode berbeda tergantung satuannya. Gunakan kode <strong>BOX</strong> saat penerimaan dari supplier, dan kode berakhiran <strong>"_pc" / "P"</strong> saat transaksi eceran per PCS setelah morphing:</p>
<p><img src="assets/images/transaksi-produk-sgm/sgm-05-id-produk-box-pcs.webp" alt="Perbandingan ID produk satuan BOX dan PCS" loading="lazy" style="max-width:420px; border-radius:10px; border:1px solid var(--border);"></p>
<table>
  <tr><th>Kode Produk</th><th>Satuan</th><th>Nama Produk</th></tr>
  <tr><td>214380</td><td>BOX</td><td>SGM VITAGROW CHOCO 24SG HMLY 1X6 POUCH</td></tr>
  <tr><td>214380_pc</td><td>PCS</td><td>SGM VITAGROW CHOCO 245G SAP HMLY 1X1 POUCH</td></tr>
</table>

<div class="tx-note"><b>Ingat:</b>&nbsp;Morphing susu SGM dari BOX ke PCS selalu memakai <strong>BKB/BTB Mutasi</strong>, bukan BKB/BTB Supplier maupun Distribusi. Empat hal wajib diperhatikan setiap kali menginput:
<ol style="margin:10px 0 0; padding-left:20px;">
  <li>Kolom <strong>Nopol / Sopir</strong> diisi <strong>COUNTER</strong> saja &mdash; bukan kendaraan atau driver sungguhan.</li>
  <li>Kolom <strong>Depo Tujuan</strong> (di BKB) maupun <strong>Dari Depo</strong> (di BTB) diisi <strong>depo sendiri</strong>, karena barang tidak benar-benar berpindah lokasi.</li>
  <li>Pada <strong>BKB Mutasi</strong>, kolom Keterangan cukup ditulis <strong>MORPHING</strong>.</li>
  <li>Pada <strong>BTB Mutasi</strong>, kolom Keterangan ditulis <strong>ID BKB referensi diikuti "/MORPHING"</strong>, contoh: <code>902-0051876/MORPHING</code>.</li>
</ol>
</div>
`;

  var TX_BTB_BKB_SUPPLIER_CONTENT = `
<p><strong>Transaksi BTB BKB Supplier</strong> adalah prosedur pencatatan Bukti Terima Barang (BTB) dan Bukti Keluar Barang (BKB) untuk transaksi yang melibatkan supplier/pemasok eksternal. Materi ini memuat <strong>pembaruan resmi dari Kantor Pusat</strong> mengenai cara penginputan BTB Supplier untuk produk <strong>AQUA Gallon &amp; AQUA SPS</strong> di DMS 3, sekaligus aturan wajib saat sebuah Surat Jalan/PO dibatalkan. Pelajari dengan saksama agar setiap dokumen yang disimpan sudah sesuai format terbaru.</p>

<div class="tx-note"><b>Berlaku untuk:</b>&nbsp;Seluruh penginputan BTB Supplier produk AQUA Gallon &amp; AQUA SPS, serta BTB/BKB Supplier yang mengalami pembatalan Surat Jalan, di DMS 3.</div>

<h2>Format Baru: No. Ref. 3 &amp; Keterangan pada BTB Supplier</h2>
<p>Ada dua ketentuan berbeda tergantung jenis produknya &mdash; perhatikan baik-baik sebelum mengisi, karena format <strong>AQUA Gallon</strong> dan <strong>AQUA SPS</strong> tidak sama.</p>

<div class="tx-steps">

  <div class="tx-step">
    <div class="tx-step-media"><span class="tx-step-num">AQUA Gallon</span><img src="assets/images/transaksi-btb-bkb-supplier/btb-supplier-gallon-noref3-keterangan.webp" alt="Contoh input No. Ref. 3 dan Keterangan pada BTB Supplier AQUA Gallon" loading="lazy"></div>
    <div class="tx-step-body">
      <span class="tx-step-tag">BTB Supplier &middot; AQUA Gallon</span>
      <h3 class="tx-step-title">No. Ref. 3 Diisi Berurutan, Keterangan Diisi No. GRFC</h3>
      <p class="tx-step-desc">Kolom <strong>No. Ref. 3</strong> diisi berurutan sesuai formula <strong>HPPP / Qty Retur Air / Qty Total Botol / Qty Jugrack</strong>, dan pemisah antar-angka <strong>wajib menggunakan tanda "/"</strong> &mdash; contoh pada gambar: <code>90A0260923-005/24/960/20</code>. Kolom <strong>Keterangan</strong> diisi dengan <strong>No. GRFC</strong>; jika dokumen GRFC belum tersedia, tulis <strong>"TIDAK ADA GRFC"</strong> &mdash; jangan dibiarkan kosong.</p>
    </div>
  </div>

  <div class="tx-step">
    <div class="tx-step-media"><span class="tx-step-num">AQUA SPS</span><img src="assets/images/transaksi-btb-bkb-supplier/btb-supplier-sps-noref3-keterangan.webp" alt="Contoh input No. Ref. 3 dan Keterangan pada BTB Supplier AQUA SPS" loading="lazy"></div>
    <div class="tx-step-body">
      <span class="tx-step-tag tag-out">BTB Supplier &middot; AQUA SPS</span>
      <h3 class="tx-step-title">No. Ref. 3 Dikosongkan, Keterangan Diisi GRFC &amp; Qty GRFC</h3>
      <p class="tx-step-desc">Khusus produk <strong>AQUA SPS</strong>, kolom <strong>No. Ref. 3 dikosongkan</strong> &mdash; tidak perlu diisi formula apa pun. Sebagai gantinya, kolom <strong>Keterangan</strong> diisi <strong>No. GRFC diikuti Qty GRFC</strong>, dengan tanda "/" sebagai pemisah, contoh: <code>6013068918/36</code>.</p>
    </div>
  </div>

</div>

<h2>Aturan Wajib Saat Surat Jalan / PO Dibatalkan</h2>
<p>Bila sebuah PO atau Surat Jalan dibatalkan, dokumen <strong>BTB Supplier</strong> maupun <strong>BKB Supplier</strong> yang berkaitan harus disesuaikan agar statusnya tidak membingungkan saat direkap ulang di kemudian hari.</p>

<div class="tx-steps">

  <div class="tx-step">
    <div class="tx-step-media"><span class="tx-step-num">BTB Supplier</span><img src="assets/images/transaksi-btb-bkb-supplier/btb-supplier-pembatalan-surat-jalan.webp" alt="Contoh input pembatalan Surat Jalan pada BTB Supplier" loading="lazy"></div>
    <div class="tx-step-body">
      <span class="tx-step-tag tag-out">BTB Supplier &middot; Pembatalan</span>
      <h3 class="tx-step-title">No. Surat Jalan Wajib Diisi "BATAL"</h3>
      <p class="tx-step-desc">Pada dokumen BTB Supplier yang PO-nya dibatalkan, kolom <strong>No. Surat Jalan wajib diisi "BATAL"</strong> &mdash; bukan dikosongkan atau dibiarkan memakai nomor lama. Kolom <strong>Keterangan</strong> diisi sesuai alasan pembatalan tersebut, contoh: <code>BATAL PO MOBIL RUBAH MUATAN</code>.</p>
    </div>
  </div>

  <div class="tx-step">
    <div class="tx-step-media"><span class="tx-step-num">BKB Supplier</span><img src="assets/images/transaksi-btb-bkb-supplier/bkb-supplier-pembatalan-surat-jalan.webp" alt="Contoh update No. Surat Jalan menjadi BATAL pada BKB Supplier" loading="lazy"></div>
    <div class="tx-step-body">
      <span class="tx-step-tag tag-out">BKB Supplier &middot; Pembatalan</span>
      <h3 class="tx-step-title">Samakan Melalui "Update No. Surat Jalan"</h3>
      <p class="tx-step-desc">Dokumen pasangannya, <strong>BKB Supplier</strong>, wajib disesuaikan juga lewat tautan <strong>Update No. Surat Jalan</strong> pada layar, lalu ganti nomor manual menjadi <strong>"BATAL"</strong> &mdash; memastikan data BTB dan BKB tetap konsisten satu sama lain.</p>
    </div>
  </div>

</div>

<div class="tx-note"><b>Ringkasan Cepat</b>
<ul class="tx-recap" style="margin:12px 0 0; padding:0;">
  <li><b>AQUA Gallon &middot; No. Ref. 3</b>HPPP/Qty Retur Air/Qty Botol/Qty Jugrack</li>
  <li><b>AQUA Gallon &middot; Keterangan</b>No. GRFC (atau "TIDAK ADA GRFC")</li>
  <li><b>AQUA SPS &middot; No. Ref. 3</b>Dikosongkan</li>
  <li><b>AQUA SPS &middot; Keterangan</b>No. GRFC/Qty GRFC</li>
  <li><b>Pembatalan &middot; BTB Supplier</b>No. Surat Jalan diisi "BATAL"</li>
  <li><b>Pembatalan &middot; BKB Supplier</b>Update No. Surat Jalan jadi "BATAL"</li>
</ul>
</div>
`;

  /* ------------------------------------------------------------------ */
  /* 6. SEED DEFAULT DATA                                                */
  /* ------------------------------------------------------------------ */
  function seedDefaults(force) {
    var materials = DataService.getMaterials();
    if (force || materials.length === 0) {
      var now = new Date().toISOString();
      var defs = [
        { title: "Transaksi Flashout", desc: "Prosedur flashout & pencatatan transaksi barang berjenjang (sebelumnya dikenal sebagai Transaksi DMS 3), lengkap dengan contoh dokumen dan foto langkah demi langkah.", body: TX_DMS3_CONTENT },
        { title: "Transaksi Produk SGM", desc: "Prosedur penerimaan produk SGM dari supplier dan cara mengubah stok dari satuan BOX ke PCS (morphing) memakai BKB/BTB Mutasi.", body: TX_SGM_CONTENT },
        { title: "Transaksi BTB BKB Supplier", desc: "Prosedur pencatatan Bukti Terima Barang (BTB) dan Bukti Keluar Barang (BKB) untuk transaksi dengan supplier/pemasok eksternal.", body: TX_BTB_BKB_SUPPLIER_CONTENT }
      ];
      materials = defs.map(function (d, i) {
        return {
          id: Utils.uid("materi"),
          title: d.title,
          slug: Utils.slugify(d.title),
          description: d.desc,
          content: d.body,
          image: "",
          order: i + 1,
          status: "published",
          createdAt: now,
          updatedAt: now
        };
      });
      DataService.setMaterials(materials);
    }

    var contents = DataService.getContents();
    if (force || contents.length === 0) {
      var mats = DataService.getMaterials();
      var findId = function (title) {
        var m = mats.filter(function (x) { return x.title === title; })[0];
        return m ? m.id : null;
      };
      contents = [
        { id: Utils.uid("toc"), title: "Home", order: 1, active: true, materialId: null },
        { id: Utils.uid("toc"), title: "Transaksi Flashout", order: 2, active: true, materialId: findId("Transaksi Flashout") },
        { id: Utils.uid("toc"), title: "Transaksi Produk SGM", order: 3, active: true, materialId: findId("Transaksi Produk SGM") },
        { id: Utils.uid("toc"), title: "Transaksi BTB BKB Supplier", order: 4, active: true, materialId: findId("Transaksi BTB BKB Supplier") }
      ];
      DataService.setContents(contents);
    }

    if (force || DataService.getImages().length === 0 && force) {
      DataService.setImages([]);
    }
  }

  /* ------------------------------------------------------------------ */
  /* 7. ROUTER                                                           */
  /* ------------------------------------------------------------------ */
  var appEl;
  var Router = {
    routes: [],
    add: function (pattern, handler) { this.routes.push({ pattern: pattern, handler: handler }); },
    start: function () {
      window.addEventListener("hashchange", this.resolve.bind(this));
      this.resolve();
    },
    navigate: function (path) { window.location.hash = "#" + path; },
    resolve: function () {
      var hash = window.location.hash.replace(/^#/, "") || "/";
      var path = hash.split("?")[0];
      for (var i = 0; i < this.routes.length; i++) {
        var m = matchRoute(this.routes[i].pattern, path);
        if (m) { this.routes[i].handler(m); scrollToTop(); updateActiveNav(path); return; }
      }
      renderNotFound();
      scrollToTop();
    }
  };
  function scrollToTop() { window.scrollTo({ top: 0, behavior: "auto" }); }
  function matchRoute(pattern, path) {
    var pParts = pattern.split("/").filter(Boolean);
    var uParts = path.split("/").filter(Boolean);
    if (pParts.length !== uParts.length) return null;
    var params = {};
    for (var i = 0; i < pParts.length; i++) {
      if (pParts[i].charAt(0) === ":") params[pParts[i].slice(1)] = decodeURIComponent(uParts[i]);
      else if (pParts[i] !== uParts[i]) return null;
    }
    return params;
  }
  function updateActiveNav(path) {
    document.querySelectorAll(".nav-link[data-route], .drawer-link[data-route]").forEach(function (a) {
      a.classList.toggle("active", a.getAttribute("data-route") === path);
    });
    document.body.classList.toggle("is-admin-route", path.indexOf("/admin") === 0);
    document.getElementById("siteFooter").style.display = path.indexOf("/admin") === 0 ? "none" : "";
  }

  function requireAdmin(renderFn) {
    return function (params) {
      if (!AuthService.isLoggedIn()) {
        Router.navigate("/");
        openLoginModal();
        Toast.show("Silakan login sebagai admin terlebih dahulu.", "info");
        return;
      }
      renderFn(params);
    };
  }

  /* ------------------------------------------------------------------ */
  /* 8. HOME VIEW                                                        */
  /* ------------------------------------------------------------------ */
  function renderHome() {
    var materials = DataService.getMaterials().filter(function (m) { return m.status === "published"; });
    appEl.innerHTML =
      '<section class="hero">' +
        '<span class="hero-texture" aria-hidden="true"></span>' +
        '<span class="hero-blob b1" aria-hidden="true"></span>' +
        '<span class="hero-blob b2" aria-hidden="true"></span>' +
        '<div class="hero-inner">' +
          '<div>' +
            '<span class="hero-eyebrow">Sistem Versi Update v.06</span>' +
            '<h1 class="hero-title">Modul Sistem<span class="line2">Database Centralized Real-Time</span></h1>' +
            '<p class="hero-sub">Modul digital dan sistem administrasi, dapat diakses kapan saja dari HP, tablet, maupun komputer.</p>' +
            '<div class="hero-actions">' +
              '<a href="#/materi" class="btn btn-primary">Mulai Membaca</a>' +
              '<a href="#/materi" class="btn btn-outline">Lihat Materi</a>' +
            '</div>' +
            '<div class="hero-stats">' +
              '<div class="hero-stat"><b>' + materials.length + '</b><span>Materi Tersedia</span></div>' +
              '<div class="hero-stat"><b>100%</b><span>Akses Digital</span></div>' +
              '<div class="hero-stat"><b>2026</b><span>Edisi Terbaru</span></div>' +
            '</div>' +
          '</div>' +
          '<div class="hero-visual">' +
            '<img class="hero-photo" src="assets/images/hero/depo-parung-warehouse.webp" alt="Gudang Depo Parung" loading="lazy">' +
            '<span class="hero-photo-scrim" aria-hidden="true"></span>' +
            '<div class="hero-card card-a">' +
              '<div class="hero-mini-row"><div class="hero-mini-dot">01</div><div><strong>Progres Modul</strong></div></div>' +
              '<div class="hero-progress"><i></i></div>' +
              '<p class="field-hint" style="margin-top:10px;">Materi baru ditambah secara bertahap</p>' +
            '</div>' +
            '<div class="hero-card card-b">' +
              '<div class="hero-mini-row"><div class="hero-mini-dot">&#10003;</div><div><strong>Transaksi Flashout</strong><div class="field-hint">Siap dipelajari</div></div></div>' +
            '</div>' +
            '<div class="hero-card card-c">' +
              '<div class="hero-mini-row"><div class="hero-mini-dot">&#9889;</div><div><strong>Update Berkala</strong><div class="field-hint">Materi baru tiap bulan</div></div></div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</section>' +
      '<section class="section features-section">' +
        '<button type="button" class="mobile-collapsible-toggle" aria-expanded="false" aria-controls="featuresPanel">' +
          '<span>Kenapa Pakai Modul Ini?</span>' +
          '<svg class="mobile-collapsible-chevron" viewBox="0 0 24 24" width="18" height="18"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
        '</button>' +
        '<div class="mobile-collapsible-panel" id="featuresPanel">' +
        '<div class="section-head">' +
          '<div><h2 class="section-title">Kenapa Pakai Modul Ini?</h2><p class="section-desc">Dirancang supaya admin baru bisa cepat paham alur kerja GDNG PRG tanpa perlu bertanya berulang-ulang.</p></div>' +
        '</div>' +
        '<div class="feature-grid">' +
          '<div class="feature-card">' +
            '<div class="feature-icon"><svg viewBox="0 0 24 24" width="22" height="22"><path d="M4 5.5C4 4.7 4.7 4 5.5 4H12v16H5.5A1.5 1.5 0 0 1 4 18.5v-13Z" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linejoin="round"/><path d="M20 5.5c0-.8-.7-1.5-1.5-1.5H12v16h6.5a1.5 1.5 0 0 0 1.5-1.5v-13Z" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linejoin="round"/></svg></div>' +
            '<h3 class="feature-title">Panduan Langkah demi Langkah</h3>' +
            '<p class="feature-desc">Setiap prosedur dijelaskan detail lengkap dengan contoh dokumen asli dan tangkapan layar sistem.</p>' +
          '</div>' +
          '<div class="feature-card">' +
            '<div class="feature-icon"><svg viewBox="0 0 24 24" width="22" height="22"><rect x="4" y="3" width="12" height="18" rx="2" stroke="currentColor" stroke-width="1.6" fill="none"/><path d="M9 18h2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M17 8h3v10a2 2 0 0 1-2 2h-1" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linejoin="round"/></svg></div>' +
            '<h3 class="feature-title">Bisa Diakses di Mana Saja</h3>' +
            '<p class="feature-desc">Buka langsung dari HP, tablet, atau komputer kapan pun dibutuhkan, tanpa perlu instal aplikasi tambahan.</p>' +
          '</div>' +
          '<div class="feature-card">' +
            '<div class="feature-icon"><svg viewBox="0 0 24 24" width="22" height="22"><path d="M20 11A8 8 0 1 0 6.5 17.5" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/><path d="M20 5v6h-6" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></div>' +
            '<h3 class="feature-title">Selalu Diperbarui</h3>' +
            '<p class="feature-desc">Materi ditambah dan disempurnakan secara berkala mengikuti perubahan alur kerja dan sistem.</p>' +
          '</div>' +
        '</div>' +
        '</div>' +
      '</section>' +
      '<section class="section materi-pilihan-section">' +
        '<div class="section-head">' +
          '<div><h2 class="section-title">Materi Pilihan</h2><p class="section-desc">Kumpulan modul terbaru yang perlu dipelajari admin GDNG PRG.</p></div>' +
          '<a href="#/materi" class="btn btn-ghost btn-sm">Lihat Semua</a>' +
        '</div>' +
        '<div class="materi-grid">' + renderMateriCards(materials.slice(0, 6), 3) + '</div>' +
      '</section>';

    setupCollapsibleSections();
    layoutHeroVisualForViewport();
  }

  // On phones, the hero photo/cards visual moves to sit between "Materi
  // Pilihan" and the collapsed info panel, instead of next to the hero
  // text like on desktop (see the matching order:3 rule in css/style.css).
  // Reparenting in JS keeps the desktop grid exactly as it was, since the
  // desktop CSS never has to know this element can move at all.
  var HERO_MOBILE_MQ = window.matchMedia ? window.matchMedia("(max-width:860px)") : null;
  function layoutHeroVisualForViewport() {
    var heroVisual = document.querySelector(".hero-visual");
    var heroInner = document.querySelector(".hero-inner");
    var materiSection = document.querySelector(".materi-pilihan-section");
    if (!heroVisual || !heroInner || !materiSection) return; // not on the home page
    var isMobile = HERO_MOBILE_MQ ? HERO_MOBILE_MQ.matches : window.innerWidth <= 860;
    if (isMobile) {
      if (heroVisual.previousElementSibling !== materiSection) {
        materiSection.insertAdjacentElement("afterend", heroVisual);
      }
    } else if (heroVisual.parentNode !== heroInner) {
      heroInner.appendChild(heroVisual);
    }
  }
  if (HERO_MOBILE_MQ) {
    var mqChangeHandler = function () { layoutHeroVisualForViewport(); };
    if (HERO_MOBILE_MQ.addEventListener) HERO_MOBILE_MQ.addEventListener("change", mqChangeHandler);
    else if (HERO_MOBILE_MQ.addListener) HERO_MOBILE_MQ.addListener(mqChangeHandler); // older Safari
  }

  // On phones, "Kenapa Pakai Modul Ini?" (and any future informational
  // section) is collapsed into a compact, tappable summary bar so visitors
  // land on the actual reading material faster. Desktop is untouched — the
  // toggle button only renders/behaves this way under the mobile CSS below.
  function setupCollapsibleSections() {
    document.querySelectorAll(".mobile-collapsible-toggle").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var panel = document.getElementById(btn.getAttribute("aria-controls"));
        var expanded = btn.getAttribute("aria-expanded") === "true";
        btn.setAttribute("aria-expanded", String(!expanded));
        if (panel) panel.classList.toggle("expanded", !expanded);
      });
    });
  }

  function renderMateriCards(list, padTo) {
    if (list.length === 0) {
      return '<div class="empty-state" style="grid-column:1/-1;"><b>Belum ada materi</b>Materi yang dipublikasikan akan tampil di sini.</div>';
    }
    var html = list.map(function (m, idx) {
      // The whole card is a real link (not just the "Baca Materi" text) so
      // it's easy to tap anywhere on it, especially in the compact 3-column
      // layout used on phones.
      return (
        '<a class="materi-card" href="#/materi/' + m.slug + '">' +
          '<span class="materi-num">' + String(idx + 1).padStart(2, "0") + '</span>' +
          '<h3 class="materi-title">' + Utils.escapeHtml(m.title) + '</h3>' +
          '<p class="materi-desc">' + Utils.escapeHtml(m.description) + '</p>' +
          '<div class="materi-foot">' +
            '<span class="materi-status status-' + m.status + '">' + (m.status === "published" ? "Published" : "Draft") + '</span>' +
            '<span class="materi-link">Baca Materi</span>' +
          '</div>' +
        '</a>'
      );
    }).join("");
    // When only a few materials are published, the grid stretches into a
    // large empty row on wide screens. Pad it out with clearly-labelled
    // "coming soon" placeholders so the section still feels intentional.
    if (padTo && list.length < padTo) {
      for (var i = list.length; i < padTo; i++) {
        html +=
          '<div class="materi-card-placeholder">' +
            '<span class="materi-num">' + String(i + 1).padStart(2, "0") + '</span>' +
            '<b>Segera Hadir</b>' +
            '<span>Materi baru sedang disiapkan.</span>' +
          '</div>';
      }
    }
    return html;
  }

  /* ------------------------------------------------------------------ */
  /* 9. MATERI LIST VIEW                                                 */
  /* ------------------------------------------------------------------ */
  function renderMateriList() {
    var materials = DataService.getMaterials()
      .filter(function (m) { return m.status === "published"; })
      .sort(function (a, b) { return a.order - b.order; });
    appEl.innerHTML =
      '<section class="section" style="padding-top:44px;">' +
        '<div class="section-head">' +
          '<div><h2 class="section-title">Daftar Materi</h2><p class="section-desc">Seluruh modul pelatihan admin GDNG PRG 2026 yang tersedia untuk dipelajari.</p></div>' +
        '</div>' +
        '<div class="materi-grid">' + renderMateriCards(materials, 3) + '</div>' +
      '</section>';
  }

  /* ------------------------------------------------------------------ */
  /* 10. READER VIEW                                                     */
  /* ------------------------------------------------------------------ */
  function renderReader(params) {
    var materials = DataService.getMaterials();
    var material = materials.filter(function (m) { return m.slug === params.slug && m.status === "published"; })[0];
    if (!material) {
      appEl.innerHTML = '<div class="section"><div class="error-state"><b>Materi tidak ditemukan</b>Materi ini mungkin belum dipublikasikan atau sudah dihapus.<br><br><a href="#/materi" class="btn btn-outline btn-sm">Kembali ke Daftar Materi</a></div></div>';
      return;
    }
    var contents = DataService.getContents()
      .filter(function (c) { return c.active; })
      .sort(function (a, b) { return a.order - b.order; });

    var tocHtml = contents.map(function (c, idx) {
      var isHome = !c.materialId;
      var target = isHome ? "#/" : "#/materi/" + (materials.filter(function (m) { return m.id === c.materialId; })[0] || {}).slug;
      var active = c.materialId === material.id;
      return '<a class="toc-item' + (active ? " active" : "") + '" href="' + target + '"><span class="toc-num">' + String(idx + 1).padStart(2, "0") + '</span>' + Utils.escapeHtml(c.title) + '</a>';
    }).join("");

    appEl.innerHTML =
      '<div class="toc-mobile-bar" id="tocMobileBar">&#9776; Daftar Isi</div>' +
      '<div class="reader-shell">' +
        '<aside class="reader-toc"><p class="reader-toc-title">Daftar Isi</p>' + tocHtml + '</aside>' +
        '<article class="reader-content">' +
          '<h1 class="reader-title">' + Utils.escapeHtml(material.title) + '</h1>' +
          '<p class="reader-desc">' + Utils.escapeHtml(material.description) + '</p>' +
          (material.image ? '<img class="reader-image" src="' + material.image + '" alt="' + Utils.escapeHtml(material.title) + '">' : "") +
          '<div class="reader-body">' + Utils.sanitizeHtml(material.content) + '</div>' +
        '</article>' +
      '</div>' +
      '<div class="toc-drawer-overlay" id="tocDrawerOverlay"></div>' +
      '<div class="toc-drawer" id="tocDrawer"><div class="toc-drawer-handle"></div><p class="reader-toc-title">Daftar Isi</p>' + tocHtml + '</div>';

    var bar = document.getElementById("tocMobileBar");
    var drawer = document.getElementById("tocDrawer");
    var overlay = document.getElementById("tocDrawerOverlay");
    function closeDrawer() { drawer.classList.remove("open"); overlay.classList.remove("open"); }
    if (bar) bar.addEventListener("click", function () { drawer.classList.add("open"); overlay.classList.add("open"); });
    if (overlay) overlay.addEventListener("click", closeDrawer);
    drawer.querySelectorAll(".toc-item").forEach(function (a) { a.addEventListener("click", closeDrawer); });

    initTxTabs(document.querySelector(".reader-body"));
    wrapReaderTables(document.querySelector(".reader-body"));
  }

  // Wrap every <table> inside materi content with a scrollable container so
  // wide tables scroll horizontally on phones without breaking the table's
  // own column layout (see .reader-table-scroll in css/style.css).
  function wrapReaderTables(root) {
    if (!root) return;
    root.querySelectorAll("table").forEach(function (table) {
      if (table.parentElement && table.parentElement.classList.contains("reader-table-scroll")) return;
      var wrap = document.createElement("div");
      wrap.className = "reader-table-scroll";
      table.parentNode.insertBefore(wrap, table);
      wrap.appendChild(table);
    });
  }

  // Some materials (e.g. "Transaksi DMS 3") group their content into
  // scenario tabs (.tx-tabs / .tx-case) so the reader doesn't have to scroll
  // through every case at once. No-op if the material doesn't use this pattern.
  function initTxTabs(root) {
    if (!root) return;
    var tabs = root.querySelectorAll(".tx-tab");
    var cases = root.querySelectorAll(".tx-case");
    if (!tabs.length || !cases.length) return;
    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        var target = tab.getAttribute("data-case-target");
        tabs.forEach(function (t) {
          var active = t === tab;
          t.classList.toggle("active", active);
          t.setAttribute("aria-selected", active ? "true" : "false");
        });
        cases.forEach(function (c) { c.hidden = c.getAttribute("data-case") !== target; });
        var tabsBar = root.querySelector(".tx-tabs");
        if (tabsBar) tabsBar.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* 11. NOT FOUND                                                       */
  /* ------------------------------------------------------------------ */
  function renderNotFound() {
    appEl.innerHTML = '<div class="section"><div class="error-state"><b>Halaman tidak ditemukan</b>Silakan kembali ke beranda.<br><br><a href="#/" class="btn btn-outline btn-sm">Ke Beranda</a></div></div>';
  }

  /* ------------------------------------------------------------------ */
  /* 12. SEARCH                                                          */
  /* ------------------------------------------------------------------ */
  var Search = {
    overlay: null, input: null, resultsEl: null,
    init: function () {
      this.overlay = document.getElementById("searchOverlay");
      this.input = document.getElementById("searchInput");
      this.resultsEl = document.getElementById("searchResults");
      var self = this;
      document.getElementById("openSearchBtn").addEventListener("click", function () { self.open(); });
      document.getElementById("openSearchBtnMobile").addEventListener("click", function () { closeDrawerNav(); self.open(); });
      document.getElementById("closeSearchBtn").addEventListener("click", function () { self.close(); });
      this.overlay.addEventListener("click", function (e) { if (e.target === self.overlay) self.close(); });
      document.addEventListener("keydown", function (e) {
        var active = document.activeElement;
        var isTyping = active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable);
        if (e.key === "/" && !isTyping) {
          e.preventDefault(); self.open();
        }
        if (e.key === "Escape" && !self.overlay.hidden) self.close();
      });
      this.input.addEventListener("input", Utils.debounce(function () { self.runSearch(self.input.value); }, 120));
    },
    open: function () { this.overlay.hidden = false; this.input.value = ""; this.resultsEl.innerHTML = ""; this.input.focus(); },
    close: function () { this.overlay.hidden = true; },
    runSearch: function (q) {
      q = (q || "").trim().toLowerCase();
      if (!q) { this.resultsEl.innerHTML = ""; return; }
      var materials = DataService.getMaterials().filter(function (m) { return m.status === "published"; });
      var results = materials.filter(function (m) {
        return m.title.toLowerCase().indexOf(q) !== -1 ||
               m.description.toLowerCase().indexOf(q) !== -1 ||
               m.content.toLowerCase().indexOf(q) !== -1;
      });
      if (results.length === 0) {
        this.resultsEl.innerHTML = '<div class="search-empty">Materi tidak ditemukan.</div>';
        return;
      }
      var self = this;
      this.resultsEl.innerHTML = results.map(function (m) {
        return '<a class="search-result-item" href="#/materi/' + m.slug + '"><span class="search-result-title">' + Utils.escapeHtml(m.title) + '</span><span class="search-result-desc">' + Utils.escapeHtml(m.description) + '</span></a>';
      }).join("");
      this.resultsEl.querySelectorAll(".search-result-item").forEach(function (a) { a.addEventListener("click", function () { self.close(); }); });
    }
  };

  /* ------------------------------------------------------------------ */
  /* 13. LOGO 5-CLICK ADMIN TRIGGER + LOGIN MODAL                        */
  /* ------------------------------------------------------------------ */
  var clickCount = 0, clickTimer = null;
  function setupLogoTrigger() {
    var logo = document.getElementById("logoTrigger");
    logo.addEventListener("click", function () {
      logo.classList.remove("logo-pulse"); void logo.offsetWidth; logo.classList.add("logo-pulse");
      clickCount++;
      clearTimeout(clickTimer);
      clickTimer = setTimeout(function () { clickCount = 0; }, 2000);
      if (clickCount >= 5) {
        clickCount = 0;
        clearTimeout(clickTimer);
        if (AuthService.isLoggedIn()) {
          Router.navigate("/admin/dashboard");
        } else {
          openLoginModal();
        }
      }
    });
  }

  function openLoginModal() {
    var overlay = document.getElementById("loginOverlay");
    overlay.hidden = false;
    document.getElementById("loginError").hidden = true;
    document.getElementById("loginForm").reset();
    document.getElementById("loginUsername").focus();
  }
  function closeLoginModal() { document.getElementById("loginOverlay").hidden = true; }

  function setupLoginModal() {
    var overlay = document.getElementById("loginOverlay");
    document.getElementById("loginClose").addEventListener("click", closeLoginModal);
    overlay.addEventListener("click", function (e) { if (e.target === overlay) closeLoginModal(); });
    document.getElementById("pwToggle").addEventListener("click", function () {
      var input = document.getElementById("loginPassword");
      input.type = input.type === "password" ? "text" : "password";
    });
    document.getElementById("loginForm").addEventListener("submit", function (e) {
      e.preventDefault();
      var username = document.getElementById("loginUsername").value.trim();
      var password = document.getElementById("loginPassword").value;
      var errorEl = document.getElementById("loginError");
      var submitBtn = document.getElementById("loginSubmit");
      var label = submitBtn.querySelector(".btn-label");
      var spinner = submitBtn.querySelector(".spinner");
      errorEl.hidden = true;
      submitBtn.disabled = true; label.textContent = "Memproses..."; spinner.hidden = false;
      AuthService.login(username, password).then(function () {
        submitBtn.disabled = false; label.textContent = "Masuk"; spinner.hidden = true;
        closeLoginModal();
        Toast.show("Login berhasil. Selamat datang, Admin.", "success");
        Router.navigate("/admin/dashboard");
      }).catch(function (err) {
        submitBtn.disabled = false; label.textContent = "Masuk"; spinner.hidden = true;
        errorEl.textContent = err.message || "Login gagal.";
        errorEl.hidden = false;
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* 14. HEADER / DRAWER / THEME WIRING                                  */
  /* ------------------------------------------------------------------ */
  var DEV_NOTICE_MSG = "Sabar, sedang tahap pengembangan sistem oleh tim benyoriki.com";

  function closeDrawerNav() {
    document.getElementById("mobileDrawer").classList.remove("open");
    document.getElementById("hamburgerBtn").setAttribute("aria-expanded", "false");
    // Collapse every accordion group so the drawer always reopens fresh.
    document.querySelectorAll(".drawer-acc-btn[aria-expanded='true']").forEach(function (btn) {
      btn.setAttribute("aria-expanded", "false");
      var panel = document.getElementById(btn.getAttribute("aria-controls"));
      if (panel) panel.classList.remove("open");
    });
  }

  // Fills the "Materi" dropdown (desktop) and accordion panel (mobile) with
  // the real, published materials — so the menu always reflects whatever
  // admin has published, without needing a second manual edit here.
  function renderNavMaterials() {
    var materials = DataService.getMaterials().filter(function (m) { return m.status === "published"; });
    var seeAllNav = '<a class="nav-dropdown-item nav-dropdown-item-all" href="#/materi">Lihat Semua Materi &rarr;</a>';
    var seeAllDrawer = '<a class="drawer-acc-item drawer-acc-item-all" href="#/materi">Lihat Semua Materi &rarr;</a>';
    var navPanel = document.getElementById("navMateriPanel");
    var drawerPanel = document.getElementById("drawerMateriPanel");
    if (navPanel) {
      navPanel.innerHTML = (materials.length
        ? materials.map(function (m) { return '<a class="nav-dropdown-item" href="#/materi/' + m.slug + '">' + Utils.escapeHtml(m.title) + '</a>'; }).join("")
        : '<span class="nav-dropdown-empty">Belum ada materi</span>') + seeAllNav;
    }
    if (drawerPanel) {
      drawerPanel.innerHTML = (materials.length
        ? materials.map(function (m) { return '<a class="drawer-acc-item" href="#/materi/' + m.slug + '">' + Utils.escapeHtml(m.title) + '</a>'; }).join("")
        : '<span class="drawer-acc-empty">Belum ada materi</span>') + seeAllDrawer;
    }
  }

  function setupHeader() {
    var hamburger = document.getElementById("hamburgerBtn");
    var drawer = document.getElementById("mobileDrawer");
    hamburger.addEventListener("click", function () {
      var open = drawer.classList.toggle("open");
      hamburger.setAttribute("aria-expanded", open ? "true" : "false");
    });
    // Delegated so it also covers the Materi links injected dynamically by
    // renderNavMaterials() (real anchors, no extra binding needed per item).
    drawer.addEventListener("click", function (e) {
      if (e.target.closest("a")) closeDrawerNav();
    });
    document.getElementById("themeToggle").addEventListener("click", function () { ThemeService.toggle(); });

    // Desktop dropdown menus (Materi / Mati Listrik / Stock Buku PO PRG):
    // click the title to toggle its panel; clicking elsewhere closes all.
    document.querySelectorAll(".nav-dropdown").forEach(function (dd) {
      var btn = dd.querySelector(".nav-dropdown-btn");
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        var isOpen = dd.classList.contains("open");
        document.querySelectorAll(".nav-dropdown.open").forEach(function (o) { o.classList.remove("open"); });
        if (!isOpen) dd.classList.add("open");
      });
    });
    document.addEventListener("click", function () {
      document.querySelectorAll(".nav-dropdown.open").forEach(function (o) { o.classList.remove("open"); });
    });

    // Mobile accordion groups inside the hamburger drawer.
    document.querySelectorAll(".drawer-acc-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var panel = document.getElementById(btn.getAttribute("aria-controls"));
        var expanded = btn.getAttribute("aria-expanded") === "true";
        document.querySelectorAll(".drawer-acc-btn[aria-expanded='true']").forEach(function (other) {
          if (other !== btn) {
            other.setAttribute("aria-expanded", "false");
            var p = document.getElementById(other.getAttribute("aria-controls"));
            if (p) p.classList.remove("open");
          }
        });
        btn.setAttribute("aria-expanded", String(!expanded));
        if (panel) panel.classList.toggle("open", !expanded);
      });
    });

    // Menus that aren't built yet: show a friendly "still in progress" toast
    // instead of navigating anywhere. Delegated so it also covers items
    // rendered dynamically later.
    document.addEventListener("click", function (e) {
      var trigger = e.target.closest("[data-dev-notice]");
      if (trigger) {
        Toast.show(DEV_NOTICE_MSG, "info", 3600);
        closeDrawerNav();
        document.querySelectorAll(".nav-dropdown.open").forEach(function (o) { o.classList.remove("open"); });
      }
    });

    var header = document.getElementById("siteHeader");
    var onScroll = function () { header.classList.toggle("is-scrolled", window.scrollY > 4); };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ==================================================================== */
  /* ============================ ADMIN AREA ============================ */
  /* ==================================================================== */

  var ADMIN_MENU = [
    { key: "dashboard", label: "Dashboard", route: "/admin/dashboard" },
    { key: "toc", label: "Daftar Isi", route: "/admin/toc" },
    { key: "materials", label: "Materi", route: "/admin/materials" },
    { key: "images", label: "Gambar", route: "/admin/images" },
    { key: "preview", label: "Preview Website", route: "/preview" },
    { key: "settings", label: "Pengaturan", route: "/admin/settings" }
  ];

  function adminShell(activeKey, bodyHtml) {
    var user = AuthService.currentUser();
    var menuHtml = ADMIN_MENU.map(function (item) {
      return '<a class="admin-nav-item' + (item.key === activeKey ? " active" : "") + '" href="#' + item.route + '" data-admin-link="1">' + item.label + '</a>';
    }).join("");
    return (
      '<div class="admin-sidebar-overlay" id="adminSidebarOverlay"></div>' +
      '<div class="admin-shell">' +
        '<aside class="admin-sidebar" id="adminSidebar">' +
          menuHtml +
          '<div class="admin-sidebar-divider"></div>' +
          '<button type="button" class="admin-nav-item" id="adminLogoutBtn">Logout</button>' +
        '</aside>' +
        '<div class="admin-main">' +
          '<div class="admin-topbar">' +
            '<button type="button" class="hamburger admin-hamburger" id="adminHamburger" aria-label="Buka menu admin"><span></span><span></span><span></span></button>' +
            '<div class="admin-badge"><span class="admin-avatar">' + (user ? user.username.charAt(0).toUpperCase() : "A") + '</span>' + (user ? Utils.escapeHtml(user.username) : "Admin") + '</div>' +
          '</div>' +
          bodyHtml +
        '</div>' +
      '</div>'
    );
  }

  function wireAdminShell() {
    var sidebar = document.getElementById("adminSidebar");
    var overlay = document.getElementById("adminSidebarOverlay");
    var toggle = document.getElementById("adminHamburger");
    if (toggle) toggle.addEventListener("click", function () { sidebar.classList.add("open"); overlay.classList.add("open"); });
    if (overlay) overlay.addEventListener("click", function () { sidebar.classList.remove("open"); overlay.classList.remove("open"); });
    document.querySelectorAll('[data-admin-link]').forEach(function (a) {
      a.addEventListener("click", function () { sidebar.classList.remove("open"); overlay.classList.remove("open"); });
    });
    var logoutBtn = document.getElementById("adminLogoutBtn");
    if (logoutBtn) logoutBtn.addEventListener("click", function () {
      AuthService.logout();
      Toast.show("Anda telah logout.", "info");
      Router.navigate("/");
    });
  }

  /* ---------------------- 14a. ADMIN DASHBOARD ------------------------- */
  function renderAdminDashboard() {
    var materials = DataService.getMaterials();
    var contents = DataService.getContents();
    var images = DataService.getImages();
    var lastUpdated = materials.concat().sort(function (a, b) { return new Date(b.updatedAt) - new Date(a.updatedAt); })[0];

    var body =
      '<div class="admin-topbar"><div><h1 class="admin-heading">Dashboard</h1><p class="admin-sub">Ringkasan konten Modul Materi Pelatihan Admin GDNG PRG 2026.</p></div></div>' +
      '<div class="stat-grid">' +
        statCard("Total Materi", materials.length) +
        statCard("Total Daftar Isi", contents.length) +
        statCard("Total Gambar", images.length) +
        statCard("Terakhir Diperbarui", lastUpdated ? Utils.formatDate(lastUpdated.updatedAt) : "-") +
      '</div>' +
      '<div class="admin-panel">' +
        '<p class="panel-title">Materi Terbaru</p>' +
        renderMaterialsMiniTable(materials.concat().sort(function (a, b) { return new Date(b.updatedAt) - new Date(a.updatedAt); }).slice(0, 5)) +
      '</div>';
    appEl.innerHTML = adminShell("dashboard", body);
    wireAdminShell();
  }
  function statCard(label, value) {
    return '<div class="stat-card"><div class="stat-icon">&#9679;</div><div class="stat-value">' + value + '</div><div class="stat-label">' + label.toUpperCase() + '</div></div>';
  }
  function renderMaterialsMiniTable(list) {
    if (list.length === 0) return '<div class="empty-state"><b>Belum ada materi</b>Tambahkan materi pertama Anda.</div>';
    return '<div class="table-scroll"><table class="data-table"><thead><tr><th>Judul</th><th>Status</th><th>Diperbarui</th></tr></thead><tbody>' +
      list.map(function (m) {
        return '<tr><td>' + Utils.escapeHtml(m.title) + '</td><td><span class="materi-status status-' + m.status + '">' + (m.status === "published" ? "Published" : "Draft") + '</span></td><td>' + Utils.formatDate(m.updatedAt) + '</td></tr>';
      }).join("") + '</tbody></table></div>';
  }

  /* ---------------------- 14b. ADMIN: DAFTAR ISI ----------------------- */
  function renderAdminTOC() {
    var contents = DataService.getContents().sort(function (a, b) { return a.order - b.order; });
    var materials = DataService.getMaterials();

    function materialOptions(selectedId) {
      var opts = '<option value="">(Tautkan ke Beranda)</option>';
      opts += materials.map(function (m) {
        return '<option value="' + m.id + '"' + (m.id === selectedId ? " selected" : "") + '>' + Utils.escapeHtml(m.title) + '</option>';
      }).join("");
      return opts;
    }

    var rows = contents.map(function (c, idx) {
      return (
        '<tr data-id="' + c.id + '">' +
          '<td class="row-drag">&#8942;&#8942;</td>' +
          '<td>' + (idx + 1) + '</td>' +
          '<td><strong>' + Utils.escapeHtml(c.title) + '</strong></td>' +
          '<td>' + (c.materialId ? (materials.filter(function (m) { return m.id === c.materialId; })[0] || {}).title || "-" : "Beranda") + '</td>' +
          '<td><button type="button" class="pill-toggle ' + (c.active ? "pill-on" : "pill-off") + '" data-action="toc-toggle" data-id="' + c.id + '">' + (c.active ? "Aktif" : "Nonaktif") + '</button></td>' +
          '<td><div class="table-actions">' +
            '<button type="button" class="icon-btn" data-action="toc-up" data-id="' + c.id + '" aria-label="Naikkan">&#8593;</button>' +
            '<button type="button" class="icon-btn" data-action="toc-down" data-id="' + c.id + '" aria-label="Turunkan">&#8595;</button>' +
            '<button type="button" class="icon-btn" data-action="toc-edit" data-id="' + c.id + '" aria-label="Edit">&#9998;</button>' +
            '<button type="button" class="icon-btn" data-action="toc-delete" data-id="' + c.id + '" aria-label="Hapus">&#128465;</button>' +
          '</div></td>' +
        '</tr>'
      );
    }).join("");

    var body =
      '<div class="admin-topbar"><div><h1 class="admin-heading">Daftar Isi</h1><p class="admin-sub">Atur urutan navigasi materi pada halaman baca.</p></div>' +
        '<button type="button" class="btn btn-primary btn-sm" id="tocAddBtn">+ Tambah Daftar Isi</button></div>' +
      '<div class="admin-panel">' +
        '<div class="table-scroll" id="tocTableWrap"><table class="data-table"><thead><tr><th></th><th>#</th><th>Judul</th><th>Materi Terkait</th><th>Status</th><th></th></tr></thead><tbody>' +
        (rows || '<tr><td colspan="6"><div class="empty-state"><b>Belum ada daftar isi</b>Tambahkan item pertama.</div></td></tr>') +
        '</tbody></table></div>' +
      '</div>' +
      tocFormTemplate(materialOptions);

    appEl.innerHTML = adminShell("toc", body);
    wireAdminShell();

    var formPanel = document.getElementById("tocFormPanel");
    var form = document.getElementById("tocForm");

    function openForm(item) {
      form.reset();
      document.getElementById("tocFormTitle").textContent = item ? "Edit Daftar Isi" : "Tambah Daftar Isi";
      document.getElementById("tocId").value = item ? item.id : "";
      document.getElementById("tocTitleInput").value = item ? item.title : "";
      document.getElementById("tocMaterialSelect").innerHTML = materialOptions(item ? item.materialId : "");
      document.getElementById("tocActiveInput").checked = item ? !!item.active : true;
      formPanel.hidden = false;
      document.getElementById("tocTitleInput").focus();
    }
    function closeForm() { formPanel.hidden = true; }

    document.getElementById("tocAddBtn").addEventListener("click", function () { openForm(null); });
    document.getElementById("tocFormCancel").addEventListener("click", closeForm);

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var id = document.getElementById("tocId").value;
      var title = document.getElementById("tocTitleInput").value.trim();
      if (!title) { Toast.show("Judul wajib diisi.", "error"); return; }
      var materialId = document.getElementById("tocMaterialSelect").value || null;
      var active = document.getElementById("tocActiveInput").checked;
      var list = DataService.getContents();
      if (id) {
        list = list.map(function (c) { return c.id === id ? Object.assign({}, c, { title: title, materialId: materialId, active: active }) : c; });
        Toast.show("Daftar isi berhasil diperbarui", "success");
      } else {
        var maxOrder = list.reduce(function (m, c) { return Math.max(m, c.order); }, 0);
        list.push({ id: Utils.uid("toc"), title: title, order: maxOrder + 1, active: active, materialId: materialId });
        Toast.show("Daftar isi berhasil disimpan", "success");
      }
      DataService.setContents(list);
      closeForm();
      renderAdminTOC();
    });

    document.getElementById("tocTableWrap").addEventListener("click", tocActionHandler);
    function tocActionHandler(e) {
      var btn = e.target.closest("[data-action]");
      if (!btn) return;
      var action = btn.getAttribute("data-action");
      if (action.indexOf("toc-") !== 0) return;
      var id = btn.getAttribute("data-id");
      var list = DataService.getContents();
      var item = list.filter(function (c) { return c.id === id; })[0];
      if (!item) return;

      if (action === "toc-toggle") {
        item.active = !item.active;
        DataService.setContents(list);
        renderAdminTOC();
      } else if (action === "toc-edit") {
        openForm(item);
      } else if (action === "toc-delete") {
        Confirm.ask("Hapus Daftar Isi?", 'Item "' + item.title + '" akan dihapus dari daftar isi.').then(function (ok) {
          if (!ok) return;
          DataService.setContents(list.filter(function (c) { return c.id !== id; }));
          Toast.show("Daftar isi berhasil dihapus", "success");
          renderAdminTOC();
        });
      } else if (action === "toc-up" || action === "toc-down") {
        var sorted = list.slice().sort(function (a, b) { return a.order - b.order; });
        var idx = sorted.findIndex(function (c) { return c.id === id; });
        var swapIdx = action === "toc-up" ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= sorted.length) return;
        var tmp = sorted[idx].order;
        sorted[idx].order = sorted[swapIdx].order;
        sorted[swapIdx].order = tmp;
        DataService.setContents(sorted);
        renderAdminTOC();
      }
    }
  }
  function tocFormTemplate() {
    return (
      '<div class="admin-panel" id="tocFormPanel" hidden>' +
        '<p class="panel-title" id="tocFormTitle">Tambah Daftar Isi</p>' +
        '<form id="tocForm">' +
          '<input type="hidden" id="tocId">' +
          '<div class="form-grid">' +
            '<label class="field full"><span class="field-label">Judul</span><input type="text" id="tocTitleInput" required></label>' +
            '<label class="field full"><span class="field-label">Materi Terkait</span><select id="tocMaterialSelect"></select></label>' +
            '<label class="field full" style="flex-direction:row; align-items:center; gap:10px;"><span class="switch"><input type="checkbox" id="tocActiveInput" checked><span class="switch-track"></span></span><span class="field-label" style="margin:0;">Aktifkan item ini</span></label>' +
          '</div>' +
          '<div style="display:flex; gap:10px; justify-content:flex-end;">' +
            '<button type="button" class="btn btn-ghost" id="tocFormCancel">Batal</button>' +
            '<button type="submit" class="btn btn-primary">Simpan</button>' +
          '</div>' +
        '</form>' +
      '</div>'
    );
  }

  /* ---------------------- 14c. ADMIN: MATERI --------------------------- */
  function renderAdminMaterials() {
    var materials = DataService.getMaterials().sort(function (a, b) { return a.order - b.order; });
    var rows = materials.map(function (m) {
      return (
        '<tr data-row-title="' + Utils.escapeHtml(m.title.toLowerCase()) + '">' +
          '<td>' + (m.image ? '<img class="thumb" src="' + m.image + '" alt="">' : '<div class="thumb"></div>') + '</td>' +
          '<td><strong>' + Utils.escapeHtml(m.title) + '</strong><div class="field-hint">' + m.slug + '</div></td>' +
          '<td><span class="materi-status status-' + m.status + '">' + (m.status === "published" ? "Published" : "Draft") + '</span></td>' +
          '<td>' + m.order + '</td>' +
          '<td>' + Utils.formatDate(m.updatedAt) + '</td>' +
          '<td><div class="table-actions">' +
            '<button type="button" class="icon-btn" data-action="mat-preview" data-id="' + m.id + '" aria-label="Preview">&#128065;</button>' +
            '<button type="button" class="icon-btn" data-action="mat-edit" data-id="' + m.id + '" aria-label="Edit">&#9998;</button>' +
            '<button type="button" class="icon-btn" data-action="mat-delete" data-id="' + m.id + '" aria-label="Hapus">&#128465;</button>' +
          '</div></td>' +
        '</tr>'
      );
    }).join("");

    var body =
      '<div class="admin-topbar"><div><h1 class="admin-heading">Materi</h1><p class="admin-sub">Kelola seluruh materi E-Book pelatihan &mdash; ' + materials.length + ' materi tersimpan.</p></div>' +
        '<button type="button" class="btn btn-primary btn-sm" id="matAddBtn">+ Tambah Materi</button></div>' +
      '<div class="admin-panel">' +
        '<div class="field" style="max-width:320px; margin-bottom:14px;"><input type="text" id="matSearchInput" placeholder="Cari judul materi..."></div>' +
        '<div class="table-scroll" id="matTableWrap"><table class="data-table"><thead><tr><th></th><th>Judul</th><th>Status</th><th>Urutan</th><th>Diperbarui</th><th></th></tr></thead><tbody>' +
        (rows || '<tr><td colspan="6"><div class="empty-state"><b>Belum ada materi</b>Klik "Tambah Materi" untuk membuat materi pertama.</div></td></tr>') +
        '</tbody></table></div>' +
      '</div>';

    appEl.innerHTML = adminShell("materials", body);
    wireAdminShell();

    document.getElementById("matAddBtn").addEventListener("click", function () { Router.navigate("/admin/materials/new"); });
    document.getElementById("matSearchInput").addEventListener("input", Utils.debounce(function (e) {
      var q = e.target.value.trim().toLowerCase();
      document.querySelectorAll("#matTableWrap tbody tr[data-row-title]").forEach(function (tr) {
        tr.hidden = q && tr.getAttribute("data-row-title").indexOf(q) === -1;
      });
    }, 120));
    document.getElementById("matTableWrap").addEventListener("click", function handler(e) {
      var btn = e.target.closest("[data-action]");
      if (!btn) return;
      var action = btn.getAttribute("data-action");
      var id = btn.getAttribute("data-id");
      if (action === "mat-edit") Router.navigate("/admin/materials/edit/" + id);
      else if (action === "mat-preview") {
        var m = DataService.getMaterials().filter(function (x) { return x.id === id; })[0];
        if (m) window.open("#/materi/" + m.slug, "_blank");
      } else if (action === "mat-delete") {
        var mat = DataService.getMaterials().filter(function (x) { return x.id === id; })[0];
        if (!mat) return;
        Confirm.ask("Hapus Materi?", 'Materi "' + mat.title + '" akan dihapus permanen.').then(function (ok) {
          if (!ok) return;
          DataService.setMaterials(DataService.getMaterials().filter(function (x) { return x.id !== id; }));
          Toast.show("Materi berhasil dihapus", "success");
          renderAdminMaterials();
        });
      }
    });
  }

  function renderAdminMaterialForm(params) {
    var isEdit = !!(params && params.id);
    var material = isEdit ? DataService.getMaterials().filter(function (m) { return m.id === params.id; })[0] : null;
    if (isEdit && !material) { Router.navigate("/admin/materials"); return; }
    var images = DataService.getImages();

    function imageOptions(selected) {
      var opts = '<option value="">(Tanpa Gambar Utama)</option>';
      opts += images.map(function (img) {
        return '<option value="' + img.id + '"' + (selected === img.id ? " selected" : "") + '>' + Utils.escapeHtml(img.name) + '</option>';
      }).join("");
      return opts;
    }
    var selectedImageId = "";
    if (material && material.image) {
      var found = images.filter(function (img) { return img.dataUrl === material.image; })[0];
      selectedImageId = found ? found.id : "";
    }

    var body =
      '<div class="admin-topbar"><div><h1 class="admin-heading">' + (isEdit ? "Edit Materi" : "Tambah Materi") + '</h1><p class="admin-sub">Lengkapi informasi materi di bawah ini.</p></div>' +
        '<a href="#/admin/materials" class="btn btn-ghost btn-sm">&larr; Kembali</a></div>' +
      '<form id="materialForm" class="admin-panel">' +
        '<div class="form-grid">' +
          '<label class="field full"><span class="field-label">Judul Materi</span><input type="text" id="mTitle" required value="' + (material ? Utils.escapeHtml(material.title) : "") + '"></label>' +
          '<label class="field"><span class="field-label">Slug</span><input type="text" id="mSlug" placeholder="otomatis dari judul" value="' + (material ? material.slug : "") + '"></label>' +
          '<label class="field"><span class="field-label">Urutan</span><input type="number" id="mOrder" min="1" value="' + (material ? material.order : (DataService.getMaterials().length + 1)) + '"></label>' +
          '<label class="field full"><span class="field-label">Deskripsi Singkat</span><textarea id="mDesc" rows="2">' + (material ? Utils.escapeHtml(material.description) : "") + '</textarea></label>' +
          '<label class="field"><span class="field-label">Gambar Utama</span><select id="mImage">' + imageOptions(selectedImageId) + '</select>' +
            '<span class="field-hint">Pilih dari pustaka, atau unggah baru di bawah ini.</span>' +
            '<div class="quick-upload" id="quickUploadZone">' +
              '<img id="quickUploadPreview" hidden>' +
              '<span id="quickUploadLabel"><strong>+ Unggah gambar baru</strong><br>JPG/PNG, maks ' + MAX_IMAGE_MB + ' MB &mdash; langsung tersimpan ke pustaka</span>' +
              '<input type="file" id="quickUploadInput" accept="image/*" hidden>' +
            '</div>' +
          '</label>' +
          '<label class="field"><span class="field-label">Status</span><select id="mStatus"><option value="draft"' + (material && material.status === "draft" ? " selected" : "") + '>Draft</option><option value="published"' + (!material || material.status === "published" ? " selected" : "") + '>Published</option></select></label>' +
        '</div>' +
        '<div class="field full">' +
          '<span class="field-label">Isi Materi</span>' +
          '<div class="editor-toolbar">' +
            editorBtn("bold", "<b>B</b>") + editorBtn("italic", "<i>I</i>") + editorBtn("underline", "<u>U</u>") +
            editorBtn("h2", "H2") + editorBtn("h3", "H3") + editorBtn("p", "P") +
            editorBtn("ul", "&#8226; List") + editorBtn("ol", "1. List") +
            editorBtn("quote", "&#10077;") + editorBtn("link", "&#128279;") +
            editorBtn("table", "&#9638;") + editorBtn("code", "&lt;/&gt;") +
          '</div>' +
          '<div class="editor-surface" id="mContent" contenteditable="true">' + (material ? material.content : "<p>Tulis isi materi di sini...</p>") + '</div>' +
        '</div>' +
        '<div style="display:flex; gap:10px; justify-content:flex-end; margin-top:20px;">' +
          '<a href="#/admin/materials" class="btn btn-ghost">Batal</a>' +
          '<button type="submit" class="btn btn-primary">Simpan Materi</button>' +
        '</div>' +
      '</form>';

    appEl.innerHTML = adminShell("materials", body);
    wireAdminShell();

    // Live slug preview: as the admin types the title, auto-fill the slug
    // field (unless they've already customised it manually) so a new
    // material can be added without thinking about URLs at all.
    var titleInput = document.getElementById("mTitle");
    var slugInput = document.getElementById("mSlug");
    var slugTouched = isEdit; // existing materials keep their slug untouched by default
    slugInput.addEventListener("input", function () { slugTouched = true; });
    titleInput.addEventListener("input", function () {
      if (!slugTouched) slugInput.value = Utils.slugify(titleInput.value);
    });

    // Quick image upload: lets the admin attach a brand-new photo to this
    // material without leaving the form and navigating to the Gambar menu.
    var quickZone = document.getElementById("quickUploadZone");
    var quickInput = document.getElementById("quickUploadInput");
    var quickPreview = document.getElementById("quickUploadPreview");
    var quickLabel = document.getElementById("quickUploadLabel");
    var mImageSelect = document.getElementById("mImage");
    quickZone.addEventListener("click", function () { quickInput.click(); });
    ["dragover", "dragenter"].forEach(function (evt) {
      quickZone.addEventListener(evt, function (e) { e.preventDefault(); quickZone.classList.add("drag-over"); });
    });
    ["dragleave", "dragend"].forEach(function (evt) {
      quickZone.addEventListener(evt, function () { quickZone.classList.remove("drag-over"); });
    });
    quickZone.addEventListener("drop", function (e) {
      e.preventDefault();
      quickZone.classList.remove("drag-over");
      if (e.dataTransfer.files && e.dataTransfer.files[0]) handleQuickFile(e.dataTransfer.files[0]);
    });
    quickInput.addEventListener("change", function () {
      if (quickInput.files[0]) handleQuickFile(quickInput.files[0]);
    });
    function handleQuickFile(file) {
      if (!/^image\//.test(file.type)) { Toast.show("File harus berupa gambar.", "error"); return; }
      if (file.size > MAX_IMAGE_MB * 1024 * 1024) { Toast.show("Ukuran gambar melebihi " + MAX_IMAGE_MB + " MB.", "error"); return; }
      var reader = new FileReader();
      reader.onload = function () {
        var newImg = { id: Utils.uid("img"), name: file.name.replace(/\.[^.]+$/, ""), alt: titleInput.value.trim() || file.name, dataUrl: reader.result, size: file.size, createdAt: new Date().toISOString() };
        var list = DataService.getImages();
        list.push(newImg);
        DataService.setImages(list);
        // Refresh the dropdown in place and select the freshly uploaded image.
        var opt = document.createElement("option");
        opt.value = newImg.id; opt.textContent = newImg.name; opt.selected = true;
        mImageSelect.appendChild(opt);
        images.push(newImg);
        quickPreview.src = newImg.dataUrl; quickPreview.hidden = false; quickLabel.hidden = true;
        Toast.show("Gambar diunggah & dipilih otomatis.", "success");
      };
      reader.readAsDataURL(file);
    }

    document.querySelectorAll(".editor-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        document.getElementById("mContent").focus();
        var cmd = btn.getAttribute("data-cmd");
        if (cmd === "h2") document.execCommand("formatBlock", false, "H2");
        else if (cmd === "h3") document.execCommand("formatBlock", false, "H3");
        else if (cmd === "p") document.execCommand("formatBlock", false, "P");
        else if (cmd === "quote") document.execCommand("formatBlock", false, "BLOCKQUOTE");
        else if (cmd === "ul") document.execCommand("insertUnorderedList");
        else if (cmd === "ol") document.execCommand("insertOrderedList");
        else if (cmd === "link") { var url = prompt("Masukkan URL tautan:", "https://"); if (url) document.execCommand("createLink", false, url); }
        else if (cmd === "table") document.execCommand("insertHTML", false, "<table><tr><th>Kolom 1</th><th>Kolom 2</th></tr><tr><td>Data</td><td>Data</td></tr></table><p><br></p>");
        else if (cmd === "code") document.execCommand("insertHTML", false, "<pre>kode di sini</pre><p><br></p>");
        else document.execCommand(cmd);
      });
    });

    document.getElementById("materialForm").addEventListener("submit", function (e) {
      e.preventDefault();
      var title = document.getElementById("mTitle").value.trim();
      if (!title) { Toast.show("Judul materi wajib diisi.", "error"); return; }
      var slug = Utils.slugify(document.getElementById("mSlug").value || title);
      var list = DataService.getMaterials();
      var dup = list.filter(function (m) { return m.slug === slug && (!material || m.id !== material.id); })[0];
      if (dup) { Toast.show("Slug sudah digunakan materi lain.", "error"); return; }

      var imgId = document.getElementById("mImage").value;
      var imgObj = images.filter(function (img) { return img.id === imgId; })[0];
      var now = new Date().toISOString();
      var payload = {
        title: title,
        slug: slug,
        description: document.getElementById("mDesc").value.trim(),
        content: Utils.sanitizeHtml(document.getElementById("mContent").innerHTML),
        image: imgObj ? imgObj.dataUrl : "",
        order: parseInt(document.getElementById("mOrder").value, 10) || 1,
        status: document.getElementById("mStatus").value,
        updatedAt: now
      };

      if (isEdit) {
        list = list.map(function (m) { return m.id === material.id ? Object.assign({}, m, payload) : m; });
        Toast.show("Materi berhasil diperbarui", "success");
      } else {
        payload.id = Utils.uid("materi");
        payload.createdAt = now;
        list.push(payload);
        Toast.show("Materi berhasil disimpan", "success");
      }
      DataService.setMaterials(list);
      Router.navigate("/admin/materials");
    });
  }
  function editorBtn(cmd, label) {
    return '<button type="button" class="editor-btn" data-cmd="' + cmd + '">' + label + '</button>';
  }

  /* ---------------------- 14d. ADMIN: GAMBAR ---------------------------- */
  function renderAdminImages() {
    var images = DataService.getImages();
    var grid = images.map(function (img) {
      return (
        '<div class="image-card">' +
          '<img src="' + img.dataUrl + '" alt="' + Utils.escapeHtml(img.alt) + '" loading="lazy">' +
          '<div class="image-card-body">' +
            '<div class="image-card-name" title="' + Utils.escapeHtml(img.name) + '">' + Utils.escapeHtml(img.name) + '</div>' +
            '<div class="image-card-actions">' +
              '<button type="button" class="btn btn-ghost btn-sm" data-action="img-edit" data-id="' + img.id + '">Edit</button>' +
              '<button type="button" class="btn btn-danger btn-sm" data-action="img-delete" data-id="' + img.id + '">Hapus</button>' +
            '</div>' +
          '</div>' +
        '</div>'
      );
    }).join("");

    var body =
      '<div class="admin-topbar"><div><h1 class="admin-heading">Gambar</h1><p class="admin-sub">Kelola pustaka gambar untuk digunakan pada materi. Maksimal ' + MAX_IMAGE_MB + ' MB per gambar &mdash; ukuran besar dapat membuat LocalStorage cepat penuh.</p></div></div>' +
      '<div class="admin-panel">' +
        '<div class="upload-dropzone">' +
          '<p><strong id="pickImageBtn">Pilih gambar</strong> untuk diunggah (JPG/PNG, maks ' + MAX_IMAGE_MB + ' MB).</p>' +
          '<input type="file" id="imageFileInput" accept="image/*" hidden>' +
        '</div>' +
        '<div id="imageFormWrap" hidden>' +
          '<div class="form-grid">' +
            '<label class="field"><span class="field-label">Nama Gambar</span><input type="text" id="imgNameInput"></label>' +
            '<label class="field"><span class="field-label">Alt Text</span><input type="text" id="imgAltInput"></label>' +
          '</div>' +
          '<img id="imgPreview" style="max-width:220px; border-radius:12px; border:1px solid var(--border); margin-bottom:14px;">' +
          '<div style="display:flex; gap:10px;"><button type="button" class="btn btn-primary btn-sm" id="imgSaveBtn">Simpan Gambar</button><button type="button" class="btn btn-ghost btn-sm" id="imgCancelBtn">Batal</button></div>' +
        '</div>' +
      '</div>' +
      '<div class="image-grid" id="imageGridWrap">' + (grid || '<div class="empty-state" style="grid-column:1/-1;"><b>Belum ada gambar</b>Unggah gambar pertama Anda.</div>') + '</div>';

    appEl.innerHTML = adminShell("images", body);
    wireAdminShell();

    var pendingDataUrl = null, editingId = null;
    var fileInput = document.getElementById("imageFileInput");
    var formWrap = document.getElementById("imageFormWrap");

    var dropzone = document.querySelector(".upload-dropzone");
    function acceptFile(file) {
      if (!file) return;
      if (!/^image\//.test(file.type)) { Toast.show("File harus berupa gambar (JPG/PNG).", "error"); return; }
      if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
        Toast.show("Ukuran gambar melebihi " + MAX_IMAGE_MB + " MB.", "error");
        fileInput.value = "";
        return;
      }
      editingId = null;
      var reader = new FileReader();
      reader.onload = function () {
        pendingDataUrl = reader.result;
        document.getElementById("imgPreview").src = pendingDataUrl;
        document.getElementById("imgNameInput").value = file.name.replace(/\.[^.]+$/, "");
        document.getElementById("imgAltInput").value = "";
        formWrap.hidden = false;
        formWrap.scrollIntoView({ behavior: "smooth", block: "center" });
      };
      reader.readAsDataURL(file);
    }
    document.getElementById("pickImageBtn").addEventListener("click", function () { editingId = null; fileInput.click(); });
    fileInput.addEventListener("change", function () { acceptFile(fileInput.files[0]); });
    // Real drag & drop onto the dropzone, so admins can drag a photo straight
    // from their file manager instead of always clicking "Pilih gambar".
    ["dragover", "dragenter"].forEach(function (evt) {
      dropzone.addEventListener(evt, function (e) { e.preventDefault(); dropzone.classList.add("drag-over"); });
    });
    ["dragleave", "dragend"].forEach(function (evt) {
      dropzone.addEventListener(evt, function () { dropzone.classList.remove("drag-over"); });
    });
    dropzone.addEventListener("drop", function (e) {
      e.preventDefault();
      dropzone.classList.remove("drag-over");
      if (e.dataTransfer.files && e.dataTransfer.files[0]) acceptFile(e.dataTransfer.files[0]);
    });
    document.getElementById("imgCancelBtn").addEventListener("click", function () { formWrap.hidden = true; fileInput.value = ""; pendingDataUrl = null; });
    document.getElementById("imgSaveBtn").addEventListener("click", function () {
      var name = document.getElementById("imgNameInput").value.trim() || "Gambar";
      var alt = document.getElementById("imgAltInput").value.trim();
      var list = DataService.getImages();
      if (editingId) {
        list = list.map(function (img) { return img.id === editingId ? Object.assign({}, img, { name: name, alt: alt }) : img; });
        Toast.show("Gambar berhasil diperbarui", "success");
      } else {
        if (!pendingDataUrl) { Toast.show("Pilih file gambar terlebih dahulu.", "error"); return; }
        list.push({ id: Utils.uid("img"), name: name, alt: alt, dataUrl: pendingDataUrl, size: 0, createdAt: new Date().toISOString() });
        Toast.show("Gambar berhasil ditambahkan", "success");
      }
      DataService.setImages(list);
      renderAdminImages();
    });

    document.getElementById("imageGridWrap").addEventListener("click", function handler(e) {
      var btn = e.target.closest("[data-action]");
      if (!btn) return;
      var action = btn.getAttribute("data-action");
      var id = btn.getAttribute("data-id");
      var list = DataService.getImages();
      var img = list.filter(function (x) { return x.id === id; })[0];
      if (!img) return;
      if (action === "img-edit") {
        editingId = id;
        document.getElementById("imgPreview").src = img.dataUrl;
        document.getElementById("imgNameInput").value = img.name;
        document.getElementById("imgAltInput").value = img.alt;
        formWrap.hidden = false;
        formWrap.scrollIntoView({ behavior: "smooth", block: "center" });
      } else if (action === "img-delete") {
        Confirm.ask("Hapus Gambar?", 'Gambar "' + img.name + '" akan dihapus dari pustaka.').then(function (ok) {
          if (!ok) return;
          DataService.setImages(list.filter(function (x) { return x.id !== id; }));
          Toast.show("Gambar berhasil dihapus", "success");
          renderAdminImages();
        });
      }
    });
  }

  /* ---------------------- 14e. ADMIN: SETTINGS -------------------------- */
  function renderAdminSettings() {
    var settings = DataService.getSettings();
    var body =
      '<div class="admin-topbar"><div><h1 class="admin-heading">Pengaturan</h1><p class="admin-sub">Preferensi tampilan dan data prototype.</p></div></div>' +
      '<div class="admin-panel">' +
        '<div class="settings-row"><div><div class="settings-row-label">Nama Admin</div><div class="settings-row-desc">Ditampilkan pada header dashboard.</div></div>' +
          '<input type="text" id="settingsAdminName" value="' + Utils.escapeHtml(settings.adminName || "Administrator") + '" style="max-width:220px; padding:9px 12px; border-radius:10px; border:1px solid var(--border); background:var(--bg-secondary); color:var(--text-primary);"></div>' +
        '<div class="settings-row"><div><div class="settings-row-label">Mode Gelap</div><div class="settings-row-desc">Aktifkan tampilan gelap untuk seluruh website.</div></div>' +
          '<label class="switch"><input type="checkbox" id="settingsDark" ' + (ThemeService.get() === "dark" ? "checked" : "") + '><span class="switch-track"></span></label></div>' +
      '</div>' +
      '<div class="admin-panel">' +
        '<p class="panel-title">Reset Data Prototype</p>' +
        '<p class="field-hint" style="margin-bottom:14px;">Mengembalikan seluruh Daftar Isi dan Materi ke data bawaan. Gambar yang sudah diunggah akan dihapus.</p>' +
        '<button type="button" class="btn btn-danger btn-sm" id="resetDataBtn">Reset ke Data Default</button>' +
      '</div>' +
      '<div class="admin-panel">' +
        '<p class="panel-title">Catatan Keamanan Prototype</p>' +
        '<p class="field-hint">Login admin dan seluruh data pada versi ini disimpan di LocalStorage/sessionStorage browser dan hanya untuk keperluan demo. Lihat README.md untuk detail keterbatasan keamanan dan rencana migrasi ke Firebase.</p>' +
      '</div>';
    appEl.innerHTML = adminShell("settings", body);
    wireAdminShell();

    document.getElementById("settingsAdminName").addEventListener("change", function (e) {
      var s = DataService.getSettings(); s.adminName = e.target.value.trim() || "Administrator";
      DataService.setSettings(s);
      Toast.show("Pengaturan disimpan", "success");
    });
    document.getElementById("settingsDark").addEventListener("change", function (e) {
      ThemeService.set(e.target.checked ? "dark" : "light");
    });
    document.getElementById("resetDataBtn").addEventListener("click", function () {
      Confirm.ask("Reset Data?", "Seluruh Daftar Isi, Materi, dan Gambar akan dikembalikan ke data bawaan.", "Reset").then(function (ok) {
        if (!ok) return;
        DataService.resetAll();
        Toast.show("Data berhasil direset ke default", "success");
        Router.navigate("/admin/dashboard");
      });
    });
  }

  /* ---------------------- 14f. PREVIEW MODE ------------------------------ */
  function renderPreview() {
    renderHome();
    var bar = document.createElement("div");
    bar.className = "preview-bar";
    bar.innerHTML = '<span>Mode Preview &mdash; tampilan seperti yang dilihat pengunjung</span><a href="#/admin/dashboard" class="btn btn-ghost btn-sm">&larr; Kembali ke Dashboard</a>';
    appEl.prepend(bar);
  }

  /* ------------------------------------------------------------------ */
  /* 15. ROUTES REGISTRATION                                             */
  /* ------------------------------------------------------------------ */
  function registerRoutes() {
    Router.add("/", renderHome);
    Router.add("/materi", renderMateriList);
    Router.add("/materi/:slug", renderReader);
    Router.add("/preview", requireAdmin(renderPreview));
    Router.add("/admin", requireAdmin(function () { Router.navigate("/admin/dashboard"); }));
    Router.add("/admin/dashboard", requireAdmin(renderAdminDashboard));
    Router.add("/admin/toc", requireAdmin(renderAdminTOC));
    Router.add("/admin/materials", requireAdmin(renderAdminMaterials));
    Router.add("/admin/materials/new", requireAdmin(function () { renderAdminMaterialForm(null); }));
    Router.add("/admin/materials/edit/:id", requireAdmin(function (p) { renderAdminMaterialForm(p); }));
    Router.add("/admin/images", requireAdmin(renderAdminImages));
    Router.add("/admin/settings", requireAdmin(renderAdminSettings));
  }

  /* ------------------------------------------------------------------ */
  /* 16. INIT                                                            */
  /* ------------------------------------------------------------------ */
  document.addEventListener("DOMContentLoaded", function () {
    appEl = document.getElementById("app");
    ThemeService.init();
    Toast.init();
    Confirm.init();
    Search.init();
    Lightbox.init();
    setupHeader();
    setupLogoTrigger();
    setupLoginModal();
    var storedVersion = localStorage.getItem(DATA_VERSION_KEY);
    seedDefaults(storedVersion !== DATA_VERSION);
    localStorage.setItem(DATA_VERSION_KEY, DATA_VERSION);
    renderNavMaterials();
    registerRoutes();
    Router.start();
    initLoadingScreen();
    initPWA();
  });

  // Makes the site installable (like WhatsApp Web): registers the service
  // worker for offline app-shell caching, and wires an optional "Instal
  // Aplikasi" button that surfaces the browser's native install prompt when
  // it becomes available (Chrome/Edge on Windows, Android, ChromeOS...).
  // Browsers without install support (e.g. Safari) simply never show the
  // button — the site still works perfectly as a normal page there.
  function initPWA() {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", function () {
        navigator.serviceWorker.register("sw.js").catch(function () { /* offline caching just won't be available */ });
      });
    }
    var installBtn = document.getElementById("installAppBtn");
    var deferredPrompt = null;
    window.addEventListener("beforeinstallprompt", function (e) {
      e.preventDefault();
      deferredPrompt = e;
      if (installBtn) installBtn.hidden = false;
    });
    if (installBtn) {
      installBtn.addEventListener("click", function () {
        if (!deferredPrompt) return;
        installBtn.hidden = true;
        deferredPrompt.prompt();
        deferredPrompt.userChoice.finally(function () { deferredPrompt = null; });
      });
    }
    window.addEventListener("appinstalled", function () {
      if (installBtn) installBtn.hidden = true;
      Toast.show("Aplikasi GDNG PRG berhasil dipasang di perangkat ini.", "success");
    });
  }

  // Premium splash/loading screen: shown for a fixed ~5s on first visit so
  // the brand has a moment to register, then fades out smoothly. The site
  // underneath is already fully rendered by this point (Router.start ran
  // above), so nothing is actually blocked while the splash is visible.
  function initLoadingScreen() {
    var screen = document.getElementById("loadingScreen");
    if (!screen) return;
    var MIN_DISPLAY_MS = 5000;
    setTimeout(function () {
      screen.classList.add("loading-hide");
      document.documentElement.classList.remove("is-loading");
      screen.addEventListener("transitionend", function remove() {
        screen.removeEventListener("transitionend", remove);
        if (screen.parentNode) screen.parentNode.removeChild(screen);
      });
    }, MIN_DISPLAY_MS);
  }
})();
