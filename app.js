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
  var DATA_VERSION = "2026.10.04-flashout-v4";
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
        if (img && img.getAttribute("src")) self.open(img.getAttribute("src"), img.getAttribute("alt") || "", img.closest(".annot-wrap"));
      });
    },
    open: function (src, alt, wrap) {
      var old = this.overlay.querySelector(".annot-wrap");
      if (old) old.parentNode.removeChild(old);
      if (wrap) {
        var c = wrap.cloneNode(true);
        this.imgEl.style.display = "none";
        this.imgEl.parentNode.insertBefore(c, this.imgEl);
      } else { this.imgEl.style.display = ""; }
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
  <p>Bayangkan sebuah mobil pengantar galon yang berangkat pagi-pagi menuju deretan toko pelanggan Depo Parung. Penjualan seperti inilah yang disebut <strong>Flashout</strong>. Barangnya dijual lewat jalur <strong>NG (Non Gudang)</strong>, yaitu <strong>Pool Cicurug</strong>, dan tujuannya adalah toko-toko penjualan Depo Parung. Nama toko bisa Anda lihat di kolom <strong>Keterangan</strong> pada dokumen <strong>BKB Distribusi DMS 5</strong>, ditandai dengan awalan <strong>FO</strong>, singkatan dari Flashout (contoh: FO TK DK TIRTA).</p>
  <p>Dalam cerita ini, NG berperan sebagai <strong>perantara</strong> yang membantu menambah kontribusi penjualan. Ada satu hal yang paling penting untuk diingat: <strong>semua BKB Distribusi hanya dibuat di sistem DMS 5 atas nama NG (Pool Cicurug)</strong>. Karena itu, ketika Anda membuka sistem, akan terlihat seolah-olah Pool Cicurug yang mengeluarkan barang ke toko. Padahal barang itu sebenarnya berasal dari gudang <strong>Parung, Sentul, atau Cianjur</strong>.</p>
  <p>Itulah sebabnya cerita Flashout selalu melibatkan lebih dari satu depo. Fisik barang diambil dari gudang Sentul atau Cianjur, tetapi yang tercatat menjual ke toko adalah NG. Dokumen BKB dan BTB lain yang menyertainya adalah jalan yang harus dilewati supaya barang tercatat sampai ke NG, dan supaya barang yang tidak jadi terjual bisa pulang ke depo asalnya.</p>
  <p>Ada tiga cerita di bawah ini: galon dari Parung, galon dari Sentul, dan Aqua kemasan dus (SPS) dari Cianjur. Pilih satu pada tab, lalu ikuti dari gambar pertama. Kotak merah bernomor pada gambar dijelaskan tepat di bawahnya, dan gambar bisa diketuk untuk memperbesar.</p>
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
      <h2>Cerita 1: Galon dari Gudang Parung ke Toko-toko Parung</h2>
      <p>Dalam cerita pertama ini, barangnya diambil dari gudang Parung sendiri, lalu dijual lewat NG ke toko-toko Parung. Ada enam dokumen yang akan kita lewati, termasuk satu dokumen penting di akhir tentang barang yang tidak jadi terjual.</p>
    </div>
  </div>
  <div class="tx-steps">

    <div class="tx-step">
      <div class="tx-step-media"><span class="tx-step-num">Langkah 1</span><img src="assets/images/transaksi-dms-3/parung-01-bkb-dms-3-ke-pol-cicurug.webp" alt="BKB DMS 3 ke Pool Cicurug" loading="lazy"></div>
      <div class="tx-step-body">
        <span class="tx-step-tag tag-out">BKB Depo &middot; DMS 3</span>
        <h3 class="tx-step-title">Pagi hari di Gudang Layak PET Parung</h3>
        <div class="tx-step-desc"><p>Pagi itu, 8 September 2026, mobil F 9073 SB milik Angkutan Prima Jaya dengan sopir Jejen sudah siap di depan gudang. Muatannya 528 galon isi air (Galon Layak), lengkap dengan 528 botol galon (Jug Aqua 19L) dan 528 lembar tissue. Semuanya akan dijual ke toko-toko Parung, tetapi tidak atas nama Parung.</p><p>Karena itu langkah pertama admin adalah membuat <strong>BKB</strong> di DMS 3. Pada kolom <strong>Depo Tujuan</strong> isi <strong>288</strong>, yaitu LP Pool Cicurug. Gudang asalnya <strong>281-W13 Gudang Layak PET Parung</strong> dengan tipe stok JUAL. Di <strong>Keterangan</strong> tulis nama sopir dan nomor kendaraan, lalu isi Qty 528 pada setiap produk.</p></div>
      </div>
    </div>

    <div class="tx-step">
      <div class="tx-step-media"><span class="tx-step-num">Langkah 2</span><img src="assets/images/transaksi-dms-3/parung-03-btb-dms-5-port-9301-dari-depo-parung.webp" alt="BTB DMS 5 port 9301 dari Depo Parung" loading="lazy"></div>
      <div class="tx-step-body">
        <span class="tx-step-tag">BTB Depo &middot; DMS 5</span>
        <h3 class="tx-step-title">Barang tercatat masuk ke Pool Cicurug</h3>
        <div class="tx-step-desc"><p>Di sisi lain sistem, Pool Cicurug harus mencatat bahwa kiriman tadi sudah diterima. Admin berpindah ke <strong>DMS 5 (port 9301)</strong>, membuka menu <em>BTB Depot</em>, lalu mencatat barang dari <strong>Depo 281</strong> masuk ke gudang <strong>002-W01 Gudang NGG LP</strong>.</p><p>Jumlahnya harus sama dengan BKB tadi, yaitu 528 untuk setiap produk, karena belum ada satu botol pun yang terjual. Di Keterangan tulis nomor BKB DMS 3 tadi (281-0001112), diikuti nama sopir dan nomor kendaraan, supaya dua dokumen ini mudah dicari pasangannya.</p></div>
      </div>
    </div>

    <div class="tx-step">
      <div class="tx-step-media"><span class="tx-step-num">Langkah 3</span><img src="assets/images/transaksi-dms-3/parung-04-bkb-distribus-dms-5-port-9301.webp" alt="BKB Distribusi DMS 5 port 9301" loading="lazy"></div>
      <div class="tx-step-body">
        <span class="tx-step-tag tag-out">BKB Distribusi &middot; ke Toko</span>
        <h3 class="tx-step-title">Inti ceritanya: BKB Distribusi berangkat ke toko</h3>
        <div class="tx-step-desc"><p>Sampai di sini barang sudah berada di NG, dan inilah saat penjualannya dicatat. Admin membuat <strong>BKB Distribusi</strong> di DMS 5. Ingat aturan pentingnya: BKB Distribusi hanya dibuat di DMS 5 atas nama NG (Pool Cicurug). Di layar terlihat seolah-olah Pool Cicurug yang mengeluarkan barang ke toko, padahal fisiknya berasal dari gudang Parung.</p><p>Lengkapi kolom bertanda bintang (*) seperti Dok. Permintaan Barang, Salesman/Driver, Gudang, Tipe Stok, dan Kendaraan. Lalu tulis <strong>nama toko tujuan</strong> di kolom <strong>Keterangan</strong>. Pada gambar tertulis <em>FO TK DK TIRTA</em>: FO adalah singkatan dari Flashout, diikuti nama toko. Setelah dokumen tersimpan, mobil berangkat menuju toko-toko Parung.</p></div>
      </div>
    </div>

    <div class="tx-step">
      <div class="tx-step-media"><span class="tx-step-num">Langkah 4</span><img src="assets/images/transaksi-dms-3/parung-05-btb-distribus-dms-5-port-9301.webp" alt="BTB Distribusi DMS 5 port 9301" loading="lazy"></div>
      <div class="tx-step-body">
        <span class="tx-step-tag">BTB Distribusi &middot; Balikan Fisik</span>
        <h3 class="tx-step-title">Sore hari: mobil pulang membawa balikan</h3>
        <div class="tx-step-desc"><p>Menjelang sore, mobil kembali. Tidak semua yang berangkat habis terjual. Dari 528 galon isi yang dibawa, ada <strong>3 galon yang isi airnya berkurang</strong>, sehingga dianggap <strong>tidak layak jual</strong>. Ada pula 3 tissue yang tidak terjual. Semuanya dibawa pulang.</p><p>Sementara itu, setiap toko menyiapkan galon kosong sebagai tukarannya, sehingga semua botol galon ikut kembali, totalnya tetap <strong>528</strong>. Maka <strong>BTB Distribusi</strong> ini mencatat apa yang <strong>benar-benar kembali secara fisik</strong>: botol galon 528, air isi 3, dan tissue 3. Inilah yang disebut <strong>balikan fisik</strong>. Angka 3 itu bukan salah ketik, jadi jangan disamakan dengan 528.</p></div>
      </div>
    </div>

    <div class="tx-step">
      <div class="tx-step-media"><span class="tx-step-num">Langkah 5</span><img src="assets/images/transaksi-dms-3/parung-06-bkb-dms-5-port-9301-ke-depo-parung.webp" alt="BKB DMS 5 port 9301 ke Depo Parung" loading="lazy"></div>
      <div class="tx-step-body">
        <span class="tx-step-tag tag-out">BKB Depo &middot; DMS 5</span>
        <h3 class="tx-step-title">Balikan dikirim pulang ke Depo Parung</h3>
        <div class="tx-step-desc"><p>Barang balikan tidak boleh tinggal di NG. Ia harus pulang ke depo asalnya. Admin membuat <strong>BKB Depot</strong> di DMS 5 dengan <strong>Depo Tujuan 281</strong> (LP Parung), dikeluarkan dari gudang NGG LP.</p><p>Qty-nya mengikuti balikan fisik tadi: air isi 3, botol galon 528, dan tissue 3. Bukan 528 untuk semuanya, karena yang kembali memang hanya sebanyak itu.</p></div>
      </div>
    </div>

    <div class="tx-step">
      <div class="tx-step-media"><span class="tx-step-num">Langkah 6</span><img src="assets/images/transaksi-dms-3/parung-02-btb-dms-3-dari-pol-cicurug.webp" alt="BTB DMS 3 dari Pool Cicurug" loading="lazy"></div>
      <div class="tx-step-body">
        <span class="tx-step-tag">BTB Depo &middot; DMS 3</span>
        <h3 class="tx-step-title">Parung menerima balikan, cerita selesai</h3>
        <div class="tx-step-desc"><p>Penutupnya ada di DMS 3. Admin membuat <strong>BTB</strong> di <strong>281-W13 Gudang Layak PET Parung</strong>, dari Depo 288 (LP Pool Cicurug), tipe stok JUAL. Qty mengikuti balikan: Jug Aqua 528, tissue 3, galon isi 3.</p><p>Dengan dokumen ini, barang yang tidak jadi terjual resmi kembali ke stok Depo Parung.</p></div>
      </div>
    </div>

  </div>
  <p class="story-end">Keenam dokumen tadi dikerjakan berurutan pada tanggal transaksi yang sama. Ingatlah bahwa angka pada dokumen 4, 5, dan 6 mengikuti hitungan fisik balikan, jadi memang tidak sama dengan dokumen 1.</p>
</div>

<!-- ================= CASE 2: GALON DARI SENTUL ================= -->
<div class="tx-case" id="txCase2" data-case="2" hidden>
  <div class="tx-case-head">
    <div class="tx-case-badge">02</div>
    <div>
      <h2>Cerita 2: Galon dari Depo Sentul ke Toko-toko Parung</h2>
      <p>Kali ini fisik barang diambil dari Depo Sentul. Tokonya tetap toko-toko Parung, dan penjualannya tetap lewat NG. Itulah sebabnya Sentul ikut muncul di dokumen, dan ceritanya lebih panjang, yaitu delapan dokumen.</p>
    </div>
  </div>
  <div class="tx-steps">

    <div class="tx-step">
      <div class="tx-step-media"><span class="tx-step-num">Langkah 1</span><img src="assets/images/transaksi-dms-3/sentul-01-btb-dms-3-dari-depo-sentul.webp" alt="BTB DMS 3 dari Depo Sentul" loading="lazy"></div>
      <div class="tx-step-body">
        <span class="tx-step-tag">BTB Depo &middot; DMS 3</span>
        <h3 class="tx-step-title">Barang diambil dari Depo Sentul</h3>
        <div class="tx-step-desc"><p>Cerita bergeser ke 12 September 2026. Kali ini fisik barang berada di <strong>Depo Sentul (283)</strong>, sehingga mobil D 9363 YA dengan sopir Desnadi mengambilnya di sana. Supaya tercatat di sistem Parung, admin membuat <strong>BTB</strong> di DMS 3 untuk gudang <strong>281-W13 Gudang Layak PET Parung</strong>.</p><p>Isi <strong>Dari Depo 283</strong> (LP Sentul) dan Qty 528 untuk setiap produk. Di Keterangan tulis nomor BKB dari Sentul (283-0001186), nama sopir, nomor kendaraan, dan tanda <em>FO BJS</em>.</p></div>
      </div>
    </div>

    <div class="tx-step">
      <div class="tx-step-media"><span class="tx-step-num">Langkah 2</span><img src="assets/images/transaksi-dms-3/sentul-02-bkb-dms-3-ke-pol-cicurug.webp" alt="BKB DMS 3 ke Pool Cicurug" loading="lazy"></div>
      <div class="tx-step-body">
        <span class="tx-step-tag tag-out">BKB Depo &middot; DMS 3</span>
        <h3 class="tx-step-title">Barang tidak menetap: langsung diteruskan ke Pool Cicurug</h3>
        <div class="tx-step-desc"><p>Barang yang baru dicatat masuk di Parung itu tidak akan dijual dari Parung. Admin langsung membuat <strong>BKB</strong> DMS 3 dengan <strong>Depo Tujuan 288</strong> (LP Pool Cicurug). Qty tetap 528 untuk tiap produk, sama seperti BTB sebelumnya.</p></div>
      </div>
    </div>

    <div class="tx-step">
      <div class="tx-step-media"><span class="tx-step-num">Langkah 3</span><img src="assets/images/transaksi-dms-3/sentul-03-btb-dms-5-port-9301-dari-depo-parung.webp" alt="BTB DMS 5 port 9301 dari Depo Parung" loading="lazy"></div>
      <div class="tx-step-body">
        <span class="tx-step-tag">BTB Depo &middot; DMS 5</span>
        <h3 class="tx-step-title">Pool Cicurug menerima di DMS 5</h3>
        <div class="tx-step-desc"><p>Seperti pada cerita pertama, admin berpindah ke DMS 5 dan membuat <strong>BTB Depot</strong>: barang dari <strong>Depo 281</strong> masuk ke gudang <strong>002-W01 Gudang NGG LP</strong>. Qty sama dengan BKB sebelumnya, yaitu 528 untuk setiap produk.</p></div>
      </div>
    </div>

    <div class="tx-step">
      <div class="tx-step-media"><span class="tx-step-num">Langkah 4</span><img src="assets/images/transaksi-dms-3/sentul-04-bkb-distribusi-dms-5-port-9301.webp" alt="BKB Distribusi DMS 5 port 9301" loading="lazy"></div>
      <div class="tx-step-body">
        <span class="tx-step-tag tag-out">BKB Distribusi &middot; ke Toko</span>
        <h3 class="tx-step-title">Di sistem terlihat Pool Cicurug yang berjualan</h3>
        <div class="tx-step-desc"><p>Inilah dokumen penjualannya: <strong>BKB Distribusi</strong> di DMS 5 atas nama NG. Layar akan menampilkan seolah-olah Pool Cicurug yang mengeluarkan barang ke toko, padahal fisiknya berasal dari Depo Sentul.</p><p>Seperti biasa, <strong>nama toko tujuan</strong> ditulis di Keterangan. Pada gambar tertulis <em>FO BJS 3</em>, dengan FO sebagai singkatan Flashout. Setelah itu mobil berangkat ke toko Parung.</p></div>
      </div>
    </div>

    <div class="tx-step">
      <div class="tx-step-media"><span class="tx-step-num">Langkah 5</span><img src="assets/images/transaksi-dms-3/sentul-05-btb-distribusi-dms-5-port-9301.webp" alt="BTB Distribusi DMS 5 port 9301" loading="lazy"></div>
      <div class="tx-step-body">
        <span class="tx-step-tag">BTB Distribusi &middot; Balikan Fisik</span>
        <h3 class="tx-step-title">Sore hari: hanya botol kosong yang pulang</h3>
        <div class="tx-step-desc"><p>Pada cerita Sentul ini, hari penjualan berjalan lancar. Air isi dan tissue habis terjual, jadi tidak ada balikan air dan tidak ada balikan tissue. Yang kembali hanya <strong>528 botol galon</strong> kosong, karena toko menyiapkan galon kosong untuk ditukar dengan galon isi.</p><p>Maka pada <strong>BTB Distribusi</strong> ini hanya ada satu baris, yaitu Jug Aqua 19L sebanyak 528. Catat hanya barang yang benar-benar dibawa pulang.</p></div>
      </div>
    </div>

    <div class="tx-step">
      <div class="tx-step-media"><span class="tx-step-num">Langkah 6</span><img src="assets/images/transaksi-dms-3/sentul-06-bkb-dms-5-por-9301-ke-depo-parung.webp" alt="BKB DMS 5 port 9301 ke Depo Parung" loading="lazy"></div>
      <div class="tx-step-body">
        <span class="tx-step-tag tag-out">BKB Depo &middot; DMS 5</span>
        <h3 class="tx-step-title">Botol kosong dikirim kembali ke Parung</h3>
        <div class="tx-step-desc"><p>Botol kosong itu tidak berhenti di NG. Admin membuat <strong>BKB Depot</strong> di DMS 5 dengan <strong>Depo Tujuan 281</strong> (LP Parung) untuk 528 botol galon.</p></div>
      </div>
    </div>

    <div class="tx-step">
      <div class="tx-step-media"><span class="tx-step-num">Langkah 7</span><img src="assets/images/transaksi-dms-3/sentul-07-btb-dms-3-dari-pol-cicurug.webp" alt="BTB DMS 3 dari Pool Cicurug" loading="lazy"></div>
      <div class="tx-step-body">
        <span class="tx-step-tag">BTB Depo &middot; DMS 3</span>
        <h3 class="tx-step-title">Botol kosong sampai di Parung</h3>
        <div class="tx-step-desc"><p>Di DMS 3, admin Parung membuat <strong>BTB</strong> untuk menerima 528 botol Jug Aqua 19L dari LP Pool Cicurug (288) ke gudang Layak PET Parung.</p></div>
      </div>
    </div>

    <div class="tx-step">
      <div class="tx-step-media"><span class="tx-step-num">Langkah 8</span><img src="assets/images/transaksi-dms-3/sentul-08-bkb-dms-3-ke-depo-sentul.webp" alt="BKB DMS 3 ke Depo Sentul" loading="lazy"></div>
      <div class="tx-step-body">
        <span class="tx-step-tag tag-out">BKB Depo &middot; DMS 3</span>
        <h3 class="tx-step-title">Botol pulang ke asalnya: Depo Sentul</h3>
        <div class="tx-step-desc"><p>Karena botol itu berasal dari Sentul, perjalanannya belum selesai. Admin membuat <strong>BKB</strong> dengan <strong>Depo Tujuan 283</strong> (LP Sentul), Qty 528, supaya botol galon itu tercatat kembali di Sentul.</p></div>
      </div>
    </div>

  </div>
  <p class="story-end">Delapan dokumen ini punya dua babak. Dokumen 1 sampai 6 membawa barang sampai ke toko dan mencatat balikannya. Dokumen 7 dan 8 mengantar botol galon kembali ke Sentul. Jangan sampai dua dokumen terakhir terlewat.</p>
</div>

<!-- ================= CASE 3: SPS DARI CIANJUR ================= -->
<div class="tx-case" id="txCase3" data-case="3" hidden>
  <div class="tx-case-head">
    <div class="tx-case-badge">03</div>
    <div>
      <h2>Cerita 3: Aqua Kemasan (SPS) dari Depo Cianjur ke Toko-toko Parung</h2>
      <p>Cerita ketiga berbeda dari dua cerita sebelumnya. Barangnya bukan galon, melainkan SPS, yaitu Aqua kemasan di dalam kardus: 1.440 box Aqua 600ml (1x24, sablon gosok) dan 36 pallet sewa, yang fisiknya diambil dari Depo Cianjur. Karena itu ceritanya lebih pendek, hanya empat dokumen.</p>
    </div>
  </div>
  <div class="tx-steps">

    <div class="tx-step">
      <div class="tx-step-media"><span class="tx-step-num">Langkah 1</span><img src="assets/images/transaksi-dms-3/cianjur-01-btb-dms-3-dari-depo-cianjur.webp" alt="BTB DMS 3 dari Depo Cianjur" loading="lazy"></div>
      <div class="tx-step-body">
        <span class="tx-step-tag">BTB Depo &middot; DMS 3</span>
        <h3 class="tx-step-title">Barang diambil dari Depo Cianjur</h3>
        <div class="tx-step-desc"><p>Pada 7 September 2026, mobil F 9012 SJ milik Tirta Utama Abadi dengan sopir Ading mengambil barang di <strong>Depo Cianjur (285)</strong>: <strong>1.440 box Aqua 600ml (1x24)</strong> dan <strong>36 pallet</strong> sewa double face. Supaya tercatat di sistem Parung, admin membuat <strong>BTB</strong> DMS 3 ke <strong>Gudang Layak Parung (281-W01)</strong>, Dari Depo 285.</p><p>Di Keterangan tulis nomor BKB dari Cianjur (285-0006208), nama sopir, dan nomor kendaraan.</p></div>
      </div>
    </div>

    <div class="tx-step">
      <div class="tx-step-media"><span class="tx-step-num">Langkah 2</span><img src="assets/images/transaksi-dms-3/cianjur-02-bkb-dms-3-dari-pol-cicurug.webp" alt="BKB DMS 3 ke Pool Cicurug" loading="lazy"></div>
      <div class="tx-step-body">
        <span class="tx-step-tag tag-out">BKB Depo &middot; DMS 3</span>
        <h3 class="tx-step-title">Diteruskan ke Pool Cicurug</h3>
        <div class="tx-step-desc"><p>Seperti pada dua cerita sebelumnya, barang tidak dijual dari Parung. Admin membuat <strong>BKB</strong> DMS 3 dengan <strong>Depo Tujuan 288</strong> (LP Pool Cicurug) untuk 1.440 box dan 36 pallet.</p></div>
      </div>
    </div>

    <div class="tx-step">
      <div class="tx-step-media"><span class="tx-step-num">Langkah 3</span><img src="assets/images/transaksi-dms-3/cianjur-03-btb-dms-5-port-9301-dari-depo-parung.webp" alt="BTB DMS 5 port 9301 dari Depo Parung" loading="lazy"></div>
      <div class="tx-step-body">
        <span class="tx-step-tag">BTB Depo &middot; DMS 5</span>
        <h3 class="tx-step-title">Pool Cicurug menerima di DMS 5</h3>
        <div class="tx-step-desc"><p>Di DMS 5, admin membuat <strong>BTB Depot</strong>: 1.440 box dari <strong>Depo 281</strong> masuk ke gudang <strong>002-W01 Gudang NGG LP</strong>. Di Keterangan tulis nomor BKB DMS 3 tadi, lalu sopir dan kendaraan.</p></div>
      </div>
    </div>

    <div class="tx-step">
      <div class="tx-step-media"><span class="tx-step-num">Langkah 4</span><img src="assets/images/transaksi-dms-3/cianjur-04-bkb-dms-5-port-9301.webp" alt="BKB Distribusi DMS 5 port 9301" loading="lazy"></div>
      <div class="tx-step-body">
        <span class="tx-step-tag tag-out">BKB Distribusi &middot; ke Toko</span>
        <h3 class="tx-step-title">Penjualan dicatat, dan ceritanya berhenti di sini</h3>
        <div class="tx-step-desc"><p>Terakhir, admin membuat <strong>BKB Distribusi</strong> di DMS 5 atas nama NG. Seperti biasa, di sistem terlihat Pool Cicurug yang mengeluarkan barang, padahal fisiknya dari Cianjur. Nama toko tujuan ditulis di Keterangan; pada gambar tertulis <em>FO MEBBY</em>, dengan FO sebagai singkatan Flashout.</p><p>Perhatikan bedanya dengan galon. Galon dijual ke toko, dan toko harus menyiapkan galon kosong untuk ditukar. SPS tidak begitu: seluruh produknya menjadi milik toko, dijual putus. Tidak ada wadah yang kembali dan tidak ada barang balikan, sehingga ceritanya berhenti di dokumen ini.</p></div>
      </div>
    </div>

  </div>
  <p class="story-end">Empat dokumen ini cukup untuk SPS, karena tidak ada barang yang kembali.</p>
</div>

<ul class="tx-recap">
  <li><b>3</b>Skenario flashout tercakup</li>
  <li><b>18</b>Total dokumen BTB/BKB</li>
  <li><b>2</b>Sistem yang dilalui (DMS 3 &amp; DMS 5)</li>
</ul>
`;

  var TX_SGM_CONTENT = `
<div class="tx-intro">
  <p><strong>Transaksi Produk SGM</strong> adalah cara mencatat susu SGM yang datang dari supplier, lalu mengubah satuannya dari <strong>BOX</strong> menjadi <strong>PCS/POUCH</strong> atau <strong>RENCENG</strong> supaya bisa dijual eceran. Materi ini punya <strong>tiga menu</strong>.</p>
  <p><strong>Cara memakai:</strong> pilih menu <strong>1</strong> bila truk hanya membawa SGM, atau menu <strong>2</strong> bila satu truk membawa SGM dan Mizone. Setelah BTB Supplier tersimpan, <strong>selalu lanjutkan ke menu 3 (morphing)</strong>. Ketuk gambar untuk memperbesar.</p>
</div>
<div class="pipe"><p class="pipe-title">Urutan kerja SGM</p><div class="pipe-row"><div class="pipe-node in"><b>1. Baca surat jalan</b>Catat PO, Doc. Number, batch</div><span class="pipe-arrow" aria-hidden="true">&rarr;</span><div class="pipe-node in"><b>2. BTB Supplier</b>Isi Ref, Keterangan, Lot/Batch, lalu Simpan Applied</div><span class="pipe-arrow" aria-hidden="true">&rarr;</span><div class="pipe-node mid"><b>3. Morphing</b>BKB Depot lalu BTB Depot ke depo sendiri</div><span class="pipe-arrow" aria-hidden="true">&rarr;</span><div class="pipe-node in"><b>4. Cek laporan</b>Saldo TBG dan Saldo DMS harus cocok</div></div></div><details class="gloss"><summary>Istilah penting di materi ini</summary><dl><dt>Morphing</dt><dd>Mengubah satuan stok (BOX jadi PCS/RENCENG). Barang tidak berpindah tempat.</dd><dt>Batch / Lot</dt><dd>Kode produksi 8 angka di surat jalan. Hasilnya sekaligus tanggal expired.</dd><dt>Customer PO</dt><dd>Nomor PO dari pelanggan di Delivery Note. Diinput 3 angka setelah SGM/.</dd><dt>Doc. Number</dt><dd>Nomor di lembar Point Agreement. Diisi di No. Ref. 2.</dd><dt>COUNTER</dt><dd>Isian Driver dan Kendaraan khusus untuk morphing.</dd><dt>BOX / PCS / RENCENG</dt><dd>BOX = satu dus. PCS = pouch satuan. RENCENG = rangkaian sachet.</dd></dl></details>
<div class="tx-tabs" role="tablist" aria-label="Pilih bagian materi SGM">
  <button type="button" class="tx-tab active" role="tab" aria-selected="true" aria-controls="txCase1" data-case-target="1">
    <span class="tx-tab-num">01</span>
    <span class="tx-tab-text"><span class="tx-tab-title">Input Supplier: 1 Produk SGM</span><span class="tx-tab-meta">Surat jalan SGM saja &middot; 5 langkah</span></span>
    <span class="tx-tab-chevron">&rsaquo;</span>
  </button>
  <button type="button" class="tx-tab" role="tab" aria-selected="false" aria-controls="txCase2" data-case-target="2">
    <span class="tx-tab-num">02</span>
    <span class="tx-tab-text"><span class="tx-tab-title">Input Supplier: SGM + Mizone</span><span class="tx-tab-meta">Satu truk, dua produk &middot; 9 langkah</span></span>
    <span class="tx-tab-chevron">&rsaquo;</span>
  </button>
  <button type="button" class="tx-tab" role="tab" aria-selected="false" aria-controls="txCase3" data-case-target="3">
    <span class="tx-tab-num">03</span>
    <span class="tx-tab-text"><span class="tx-tab-title">Morphing: BOX ke PCS</span><span class="tx-tab-meta">BKB &amp; BTB Depot &middot; 6 langkah</span></span>
    <span class="tx-tab-chevron">&rsaquo;</span>
  </button>
</div>

<!-- ===== MENU 1: INPUT SUPPLIER, SATU PRODUK SGM ===== -->
<div class="tx-case" id="txCase1" data-case="1">
  <div class="tx-case-head">
    <div class="tx-case-badge">01</div>
    <div>
      <h2>Input Supplier: Surat Jalan Satu Produk SGM</h2>
      <p>Truk hanya membawa SGM, jadi ada <strong>satu surat jalan</strong> dan <strong>satu BTB Supplier</strong>. Contoh nyata: <strong>Depo Parung (281 - LP PARUNG)</strong>, 30/09/2026, dua produk SGM Vitagrow Choco (214380 dan 215369).</p>
    </div>
  </div>
  <div class="tx-steps">
  <div class="tx-step">
    <div class="tx-step-media"><span class="tx-step-num">Langkah 1</span><img src="assets/images/transaksi-produk-sgm/sgm-06-surat-jalan-batch-expired.webp" alt="Contoh surat jalan produk SGM: nomor dokumen, qty, dan batch" loading="lazy"></div>
    <div class="tx-step-body">
      <span class="tx-step-tag">Surat Jalan &middot; Cek Data</span>
      <h3 class="tx-step-title">Baca Surat Jalan &amp; Catat Batch / Tanggal Expired</h3>
      <p class="tx-step-desc">Sebelum menginput, siapkan <strong>surat jalan</strong> dari pabrik. Catat tiga data ini: <strong>(1) Doc. Number</strong> di bagian atas (contoh: <code>S26092900080</code>); <strong>(2) Kode &amp; Nama Produk</strong> beserta <strong>Qty</strong>; <strong>(3) kolom BATCH</strong>, yaitu angka 8 digit berformat <em>Tahun-Bulan-Tanggal</em> yang menjadi <strong>tanggal expired</strong>. Contoh: <code>20280825</code> dibaca <strong>25 Agustus 2028</strong>. Pada contoh Depo Parung ini ada dua produk, masing-masing dengan batch sendiri: <strong>214380</strong> (136 BOX, batch 20280825) dan <strong>215369</strong> (41 BOX, batch 20280916). Pastikan batch tidak tertukar antarproduk.</p>
    </div>
  </div>
  <div class="tx-step">
    <div class="tx-step-media is-doc"><span class="tx-step-num">Langkah 2</span><img src="assets/images/transaksi-produk-sgm/sgm-10b-btb-supplier-keterangan.webp" alt="Formulir BTB Supplier dengan kotak merah pada kode Supplier 90A5-9000 dan kolom Keterangan berisi LP/SGM/002" loading="lazy"></div>
    <div class="tx-step-body">
      <span class="tx-step-tag">BTB Supplier &middot; Header &amp; Detil</span>
      <h3 class="tx-step-title">Input Data Utama di BTB Supplier</h3>
      <div class="tx-step-desc">
        <p>Buka menu <strong>BTB Supplier</strong>, lalu lengkapi formulir sesuai dokumen dari truk:</p>
        <ul class="tx-fields">
          <li><strong>Tanggal</strong> dan <strong>Tgl. Surat Jalan Pabrik</strong>: sesuai tanggal terima dan tanggal pada surat jalan.</li>
          <li><strong>Supplier</strong>: untuk pabrik Sentul gunakan kode <code>90A5-9000</code> (XWH SENTUL).</li>
          <li><strong>Gudang</strong>: <code>281-W01 - GUDANG LAYAK PARUNG</code>. <strong>Tipe Stok</strong>: <strong>JUAL</strong>.</li>
          <li><strong>No. Surat Jalan</strong>: nomor <strong>DN No.</strong> pada Delivery Note.</li>
          <li><strong>Jasa Pengangkut, Kendaraan, Pengemudi</strong>: sesuai truk yang datang.</li>
          <li><strong>No. Ref. 1</strong>: <strong>Nomor PO</strong> (contoh <code>31242645</code>), agar penerimaan terhubung ke PO-nya.</li>
          <li><strong>No. Ref. 2</strong>: <strong>Doc. Number</strong> surat jalan (contoh <code>S26092900080</code>).</li>
          <li><strong>Keterangan</strong>: diisi <strong>Customer PO</strong>. Caranya ada di Langkah 3.</li>
        </ul>
        <p>Pada tabel <strong>Detil</strong>, isi Kode Produk dan Qty (satuan BOX): <strong>215369</strong> sebanyak 41 dan <strong>214380</strong> sebanyak 136. Lot/SN diisi pada Langkah 4 dan 5, lalu klik <strong>Simpan Applied</strong> sampai status menjadi <strong>Applied</strong> dan nomor dokumen muncul (contoh <code>281-0019794</code>).</p>
        <p><small>Gambar contoh berasal dari depo lain. Pola pengisiannya sama.</small></p>
      </div>
    </div>
  </div>
  <div class="tx-step">
    <div class="tx-step-media is-doc"><span class="tx-step-num">Langkah 3</span><img src="assets/images/transaksi-produk-sgm/sgm-10c-dn-customer-po.webp" alt="Delivery Note SGM dengan titik merah pada baris Customer PO TUA/LP/SGM/002" loading="lazy"></div>
    <div class="tx-step-body">
      <span class="tx-step-tag">Dokumen Pabrik &middot; Customer PO</span>
      <h3 class="tx-step-title">Isi Kolom Keterangan dengan Customer PO</h3>
      <div class="tx-step-desc">
        <p>Kolom <strong>Keterangan</strong> diisi <strong>Customer PO</strong> dari Delivery Note SGM (titik merah pada gambar). Sesuai petunjuk Pembelian Pusat, tulis <strong>hanya sampai 3 angka setelah SGM/</strong>.</p>
        <ol class="tx-note-list">
          <li>Cari baris <strong>Customer PO</strong> di bagian atas Delivery Note.</li>
          <li>Hilangkan awalan <code>TUA/</code> di bagian depan.</li>
          <li>Salin sampai <strong>tiga angka setelah <code>SGM/</code></strong>.</li>
          <li>Buang semua tulisan setelahnya, lalu ketik hasilnya di kolom Keterangan.</li>
        </ol>
        <table class="tx-mini">
          <tr><th>Tertulis di Delivery Note</th><th>Diinput di Keterangan</th></tr>
          <tr><td><code>TUA/LP/SGM/002/31&hellip;</code></td><td><strong><code>LP/SGM/002</code></strong><br><small>contoh pada gambar</small></td></tr>
          <tr><td><code>TUA/TUA/SGM/004/&hellip;</code></td><td><strong><code>TUA/SGM/004</code></strong><br><small>contoh dari surat petunjuk</small></td></tr>
        </table>
        <p><strong>Catatan:</strong> bagian belakang Customer PO sering tertutup barcode. Itu tidak masalah karena bagian tersebut memang tidak diinput. Ketik persis dengan garis miring (/) dan tanpa spasi. Aturan ini berasal dari Surat Petunjuk Pelaksanaan Pembelian Pusat (No. 001/SPK/PEMBELIAN/IX/2026), agar PO SGM terhubung ke sistem pembayaran SPP (Surat Pengajuan Pembayaran).</p>
      </div>
    </div>
  </div>
  <div class="tx-step">
    <div class="tx-step-media"><span class="tx-step-num">Langkah 4</span><img src="assets/images/transaksi-produk-sgm/sgm-11-batch-215369.webp" alt="Jendela UIEntryLot produk 215369 dengan batch 20280916" loading="lazy"></div>
    <div class="tx-step-body">
      <span class="tx-step-tag">BTB Supplier &middot; Detil Lot (1)</span>
      <h3 class="tx-step-title">Tulis Batch Produk 215369 (41 BOX)</h3>
      <p class="tx-step-desc">Pada baris produk <strong>215369</strong>, klik ikon kaca pembesar di kolom <strong>Lot/SN</strong> sampai jendela <strong>UIEntryLot</strong> terbuka. Klik baris baru, lalu isi <strong>No. Batch</strong> <code>20280916</code>. <strong>Tanggal Expired</strong> terisi <strong>16/Sep/2028</strong> dan <strong>Kuantiti</strong> <strong>41</strong>. Angka kuantiti harus sama persis dengan Qty produk di dokumen. Setelah benar, klik <strong>Ok</strong>.</p>
    </div>
  </div>
  <div class="tx-step">
    <div class="tx-step-media"><span class="tx-step-num">Langkah 5</span><img src="assets/images/transaksi-produk-sgm/sgm-12-batch-214380.webp" alt="Jendela UIEntryLot produk 214380 dengan batch 20280825" loading="lazy"></div>
    <div class="tx-step-body">
      <span class="tx-step-tag">BTB Supplier &middot; Detil Lot (2)</span>
      <h3 class="tx-step-title">Tulis Batch Produk 214380 (136 BOX)</h3>
      <p class="tx-step-desc">Ulangi cara yang sama untuk baris produk <strong>214380</strong>: buka <strong>Lot/SN</strong>, isi <strong>No. Batch</strong> <code>20280825</code>, <strong>Tanggal Expired</strong> <strong>25/Agust/2028</strong>, dan <strong>Kuantiti</strong> <strong>136</strong>, lalu klik <strong>Ok</strong>. Batch yang salah tulis di sini akan ikut salah pada semua dokumen turunannya, jadi cocokkan sekali lagi dengan surat jalan (langkah 1) sebelum menyimpan.</p>
    </div>
  </div>
  </div>
  <div class="tx-note"><b>Selesai input supplier.</b>&nbsp;Batch yang salah di sini ikut salah di semua dokumen turunan, jadi cocokkan sekali lagi dengan surat jalan sebelum Simpan Applied. Setelah tersimpan, lanjutkan ke morphing.<br><button type="button" class="tx-jump" data-case-jump="3">Lanjut ke Menu 3: Morphing BOX ke PCS &rsaquo;</button></div>
</div>

<!-- ===== MENU 2: INPUT SUPPLIER, SGM + MIZONE ===== -->
<div class="tx-case" id="txCase2" data-case="2" hidden>
  <div class="tx-case-head">
    <div class="tx-case-badge">02</div>
    <div>
      <h2>Input Supplier: Satu Truk Membawa SGM dan Mizone</h2>
      <p>Supplier mengirim produk air dan SGM dalam <strong>satu armada</strong>, dengan <strong>dua kelompok surat</strong> (Delivery Note dan Point Agreement untuk masing-masing produk) dan <strong>satu Nomor PO yang sama</strong>. Hasilnya <strong>dua BTB terpisah</strong>. Contoh nyata: Depo Parung, 01/10/2026, Nomor PO <code>31242671</code>.</p>
    </div>
  </div>
<div class="tx-rules">
  <b>Empat aturan Kasus 2</b>
  <ol class="tx-note-list">
    <li><strong>Produk air (Mizone)</strong> diinput seperti biasa, memakai format BTB Supplier yang sedang berjalan.</li>
    <li><strong>SGM diinput di BTB terpisah.</strong> Nomor dokumen BTB-nya tidak boleh disatukan dengan produk air, karena No. Surat Jalan/DN SGM juga berbeda.</li>
    <li><strong>Nomor PO tetap sama.</strong> Kedua BTB memakai No. Ref. 1 yang sama, sedangkan No. Surat Jalan dan No. Ref. 2 <em>berbeda</em> untuk tiap produk.</li>
    <li><strong>No. Ref. 2 SGM</strong> diambil dari lembar <strong>Point Agreement</strong> SGM. Jangan lupa isi <strong>Lot/Batch</strong> sebelum Simpan Applied.</li>
  </ol>
</div>

  <div class="tx-steps">
<h3 class="tx-part">Bagian A &middot; Dokumen &amp; Input Produk Air (Mizone)</h3>
  <div class="tx-step">
    <div class="tx-step-media is-doc"><span class="tx-step-num">Langkah 1</span><img src="assets/images/transaksi-produk-sgm/sgm2-01-surat-jalan-pabrik-po.webp" alt="Surat Jalan pabrik berisi nomor PO di pojok kanan atas dan kolom pengembalian pallet" loading="lazy"></div>
    <div class="tx-step-body">
      <span class="tx-step-tag">Dokumen Pabrik &middot; Surat Jalan</span>
      <h3 class="tx-step-title">Ambil Nomor PO dari Surat Jalan Pabrik</h3>
      <p class="tx-step-desc">Truk membawa beberapa dokumen. Mulailah dari <strong>Surat Jalan</strong> berbentuk tabel (kolom Jenis Produk, Pengembalian, Permintaan). Catat <strong>nomor di pojok kanan atas</strong>, pada contoh <code>31242671</code>. Ini adalah <strong>Nomor PO</strong>. Nomor yang sama dipakai di <strong>No. Ref. 1</strong> pada <em>semua</em> BTB dan BKB dari truk ini, baik produk air maupun SGM. Lihat juga kotak <strong>Pengembalian ke Pabrik</strong> di bagian bawah: jumlah <strong>pallet</strong> yang tertulis di sana adalah pallet yang dikembalikan ke pabrik (diinput di Langkah 6).</p>
    </div>
  </div>
  <div class="tx-step">
    <div class="tx-step-media is-doc"><span class="tx-step-num">Langkah 2</span><img src="assets/images/transaksi-produk-sgm/sgm2-02-dn-mizone-halaman-1.webp" alt="Delivery Note PT Tirta Investama lembar 1 berisi produk Mizone dan pallet" loading="lazy"></div>
    <div class="tx-step-body">
      <span class="tx-step-tag">Produk Air &middot; Delivery Note (1/2)</span>
      <h3 class="tx-step-title">Baca Delivery Note Produk Mizone</h3>
      <p class="tx-step-desc">Delivery Note dari <strong>PT Tirta Investama</strong> terdiri dari <strong>dua lembar</strong>. Lembar 1 memuat data barang. Catat tiga hal: <strong>(1) Delv No</strong> (contoh <code>5071697018</code>), yang nanti menjadi <strong>No. Surat Jalan</strong> di BTB; <strong>(2) kolom Material</strong>, yaitu kode produk; <strong>(3) Quantity dan UOM</strong>. Di lembar ini <code>CAR</code> berarti <strong>BOX</strong> dan <code>PC</code> berarti <strong>BUAH</strong>. Pada contoh: 145141 (1.233 BOX), 145143 (672 BOX), 206774 (672 BOX), dan <strong>Pallet Rent Double Face</strong> kode 10169749 (30 BUAH). Pallet ikut diinput sebagai baris produk.</p>
    </div>
  </div>
  <div class="tx-step">
    <div class="tx-step-media is-doc"><span class="tx-step-num">Langkah 3</span><img src="assets/images/transaksi-produk-sgm/sgm2-03-dn-mizone-halaman-2-security.webp" alt="Delivery Note lembar 2 berisi stempel Security XWH Sentul dan Security Parung" loading="lazy"></div>
    <div class="tx-step-body">
      <span class="tx-step-tag">Produk Air &middot; Delivery Note (2/2)</span>
      <h3 class="tx-step-title">Periksa Lembar 2: Stempel Security</h3>
      <p class="tx-step-desc">Lembar 2 hanya berisi <strong>stempel dan tanda tangan</strong>: Security XWH Sentul (jam masuk dan jam keluar truk di pabrik) serta stempel Security Parung. Tidak ada angka yang diinput dari lembar ini. Cukup pastikan stempelnya ada sebelum Anda memproses penerimaan.</p>
    </div>
  </div>
  <div class="tx-step">
    <div class="tx-step-media is-doc"><span class="tx-step-num">Langkah 4</span><img src="assets/images/transaksi-produk-sgm/sgm2-04-point-agreement-mizone.webp" alt="Point Agreement for Finish Good produk Mizone dengan Doc. Number S26092500648" loading="lazy"></div>
    <div class="tx-step-body">
      <span class="tx-step-tag">Produk Air &middot; Point Agreement</span>
      <h3 class="tx-step-title">Catat Doc. Number untuk No. Ref. 2</h3>
      <p class="tx-step-desc">Lembar <strong>Point Agreement For Finish Good</strong> (Citoxpress) adalah pasangan Delivery Note. Catat <strong>Doc. Number</strong> (contoh <code>S26092500648</code>), karena angka ini diisi di <strong>No. Ref. 2</strong>. Cocokkan juga produk dan qty-nya dengan Delivery Note. Perhatikan penulisan angka: <strong>1,233</strong> di lembar ini dibaca <strong>seribu dua ratus tiga puluh tiga (1.233)</strong>, bukan satu koma dua.</p>
    </div>
  </div>
  <div class="tx-step">
    <div class="tx-step-media is-doc"><span class="tx-step-num">Langkah 5</span><img src="assets/images/transaksi-produk-sgm/sgm2-05-btb-supplier-mizone.webp" alt="BTB Supplier produk Mizone nomor dokumen 281-0019834 dengan empat baris detil" loading="lazy"></div>
    <div class="tx-step-body">
      <span class="tx-step-tag">BTB Supplier &middot; Produk Air</span>
      <h3 class="tx-step-title">Input BTB Supplier Produk Mizone (Format Terbaru)</h3>
      <p class="tx-step-desc">Input seperti biasa, mengikuti format BTB Supplier yang sedang berjalan (lihat materi <strong>Transaksi BTB BKB Supplier</strong>). Isian pada contoh: <strong>No. Surat Jalan</strong> <code>5071697018</code> (Delv No); <strong>No. Ref. 1</strong> <code>31242671</code> (PO); <strong>No. Ref. 2</strong> <code>S26092500648</code> (Doc. Number Point Agreement). Nomor dokumen BTB ini (<code>281-0019834</code>) dibuat oleh sistem. Tabel <strong>Detil</strong> berisi empat baris: 145141 (1.233 BOX), 145143 (672 BOX), 206774 (672 BOX), dan 10169749 Pallet Rent Double Face (30 BUAH). Kolom Keterangan diisi sesuai ketentuan terbaru (contoh: <code>GRFC TIDAK ADA</code>). Lalu klik <strong>Simpan Applied</strong>.</p>
    </div>
  </div>
  <div class="tx-step">
    <div class="tx-step-media is-doc"><span class="tx-step-num">Langkah 6</span><img src="assets/images/transaksi-produk-sgm/sgm2-06-bkb-supplier-pallet.webp" alt="BKB Supplier pengembalian pallet Pallet Rent Double Face ke pabrik" loading="lazy"></div>
    <div class="tx-step-body">
      <span class="tx-step-tag tag-out">BKB Supplier &middot; Pengembalian Pallet</span>
      <h3 class="tx-step-title">Kembalikan Pallet ke Pabrik lewat BKB Supplier</h3>
      <p class="tx-step-desc">Pallet yang dikembalikan ke pabrik dicatat lewat <strong>BKB Supplier</strong>. Pada contoh: Supplier <code>9013-9000</code> (Citeureup Plant TIV), <strong>No. Surat Jalan</strong> <code>MANUAL</code>, <strong>No. Ref. 1</strong> <code>31242671</code> (PO yang sama), dan Keterangan <code>AQ SPS 31242671</code>. Pada Detil, pilih <strong>10169749 Pallet Rent Double Face</strong> dan isi qty sesuai jumlah pallet yang benar-benar dikembalikan (kotak Pengembalian ke Pabrik di Langkah 1).</p>
    </div>
  </div>
<h3 class="tx-part">Bagian B &middot; Dokumen &amp; Input Produk SGM (BTB Terpisah)</h3>
  <div class="tx-step">
    <div class="tx-step-media is-doc"><span class="tx-step-num">Langkah 7</span><img src="assets/images/transaksi-produk-sgm/sgm2-07-dn-sgm.webp" alt="Delivery Note SGM PT Sarihusada nomor DN 5071565439 dengan dua produk Vitagrow Choco" loading="lazy"></div>
    <div class="tx-step-body">
      <span class="tx-step-tag">Produk SGM &middot; Delivery Note</span>
      <h3 class="tx-step-title">Baca Delivery Note SGM (Dokumen Sendiri)</h3>
      <p class="tx-step-desc">Produk SGM punya <strong>Delivery Note sendiri</strong> dari PT Sarihusada Generasi Mahardhika, terpisah dari dokumen produk air. Catat <strong>DN No.</strong> (kotak hijau, contoh <code>5071565439</code>) sebagai <strong>No. Surat Jalan</strong> BTB SGM. Lalu catat produk dan qty: <strong>215369</strong> (74 TR) dan <strong>214380</strong> (128 TR). <code>TR</code> sama dengan <strong>BOX</strong> di sistem. Kolom <strong>Batch No./Exp.</strong> menunjukkan batch tiap produk, dipakai nanti saat mengisi lot.</p>
    </div>
  </div>
  <div class="tx-step">
    <div class="tx-step-media is-doc"><span class="tx-step-num">Langkah 8</span><img src="assets/images/transaksi-produk-sgm/sgm2-08-point-agreement-sgm.webp" alt="Point Agreement SGM dengan Doc. Number S26092900130 dan batch kedua produk" loading="lazy"></div>
    <div class="tx-step-body">
      <span class="tx-step-tag">Produk SGM &middot; Point Agreement</span>
      <h3 class="tx-step-title">Catat Doc. Number SGM untuk No. Ref. 2</h3>
      <p class="tx-step-desc">Point Agreement SGM punya <strong>Doc. Number sendiri</strong> (kotak hijau, contoh <code>S26092900130</code>). Nomor inilah yang diisi di <strong>No. Ref. 2</strong> BTB SGM, <strong>bukan</strong> nomor Point Agreement produk air. Lembar ini juga memuat qty dan kolom <strong>BATCH</strong>: 214380 sebanyak 128 dengan batch <code>20280825</code>, dan 215369 sebanyak 74 dengan batch <code>20280914</code>. Batch dibaca <em>Tahun-Bulan-Tanggal</em>, jadi 20280914 berarti <strong>14 September 2028</strong>.</p>
    </div>
  </div>
  <div class="tx-step">
    <div class="tx-step-media is-doc"><span class="tx-step-num">Langkah 9</span><img src="assets/images/transaksi-produk-sgm/sgm2-09-btb-supplier-sgm.webp" alt="BTB Supplier SGM nomor dokumen 281-0019835 dengan produk 214380 dan 215369" loading="lazy"></div>
    <div class="tx-step-body">
      <span class="tx-step-tag">BTB Supplier &middot; Produk SGM</span>
      <h3 class="tx-step-title">Input BTB Supplier SGM Terpisah, Lalu Isi Lot/Batch</h3>
      <p class="tx-step-desc">Buat <strong>BTB Supplier baru khusus SGM</strong>. <strong>Jangan digabung</strong> dengan BTB produk air, karena Delivery Note-nya berbeda. Nomor dokumen BTB juga berbeda (contoh: SGM <code>281-0019835</code>, produk air <code>281-0019834</code>). Isian: <strong>No. Surat Jalan</strong> <code>5071565439</code>; <strong>No. Ref. 1</strong> <code>31242671</code> (<em>PO yang sama</em> dengan BTB produk air); <strong>No. Ref. 2</strong> <code>S26092900130</code>; <strong>Keterangan</strong> berisi Customer PO SGM sampai 3 angka setelah SGM/ (contoh <code>LP/SGM/002</code>, caranya di menu 1 Langkah 3). Pada gambar contoh, Keterangan masih format lama. Untuk SGM, ikuti aturan Customer PO. Detil: <strong>214380</strong> = 128 BOX dan <strong>215369</strong> = 74 BOX. <strong>Sebelum Simpan Applied</strong>, isi Lot/Batch tiap produk lewat ikon <strong>Lot/SN</strong> (caranya sama seperti Langkah 4 dan 5 pada menu 1): 214380 batch <code>20280825</code> kuantiti 128; 215369 batch <code>20280914</code> kuantiti 74. Setelah semua cocok, klik <strong>Simpan Applied</strong>.</p>
    </div>
  </div>
  </div>
<h3 class="tx-part">Ringkasan: Dua BTB dari Satu Truk</h3>
<table class="tx-mini">
  <tr><th>Isian</th><th>BTB Produk Air</th><th>BTB SGM</th></tr>
  <tr><td>No. Dokumen BTB</td><td><code>281-0019834</code></td><td><code>281-0019835</code> (berbeda)</td></tr>
  <tr><td>No. Surat Jalan</td><td><code>5071697018</code><br>(Delv No)</td><td><code>5071565439</code><br>(DN No)</td></tr>
  <tr><td>No. Ref. 1 (PO)</td><td colspan="2"><strong>31242671</strong> (sama untuk keduanya)</td></tr>
  <tr><td>No. Ref. 2</td><td><code>S26092500648</code><br>(Point Agreement air)</td><td><code>S26092900130</code><br>(Point Agreement SGM)</td></tr>
  <tr><td>Isi Detil</td><td>145141 &middot; 145143 &middot; 206774 &middot; Pallet 10169749</td><td>214380 (128 BOX)<br>215369 (74 BOX)</td></tr>
  <tr><td>Keterangan</td><td>Sesuai format yang berjalan<br><small>(contoh: GRFC TIDAK ADA)</small></td><td>Customer PO, 3 angka setelah SGM/<br><small>(contoh: LP/SGM/002)</small></td></tr>
  <tr><td>Lot/Batch</td><td>Mengikuti format yang berjalan</td><td><strong>Wajib diisi</strong> sebelum Simpan Applied</td></tr>
</table>


  <div class="tx-note"><b>Kesalahan yang sering terjadi</b>
  <ol class="tx-note-list">
    <li>Menggabung SGM dan produk air dalam satu BTB.</li>
    <li>Memakai Doc. Number Point Agreement produk air untuk BTB SGM (atau sebaliknya).</li>
    <li>Lupa mengisi Lot/Batch SGM sebelum menyimpan. Dokumen yang sudah Applied tidak bisa diubah.</li>
    <li>Salah membaca angka berformat koma, misalnya 1,233 yang artinya 1.233.</li>
  </ol>
  Produk air tidak perlu di-morphing. Hanya SGM yang dilanjutkan ke morphing: 214380 (128 BOX) menjadi <strong>768 PCS</strong> dan 215369 (74 BOX) menjadi <strong>888 RENCENG</strong>.<br><button type="button" class="tx-jump" data-case-jump="3">Lanjut ke Menu 3: Morphing BOX ke PCS &rsaquo;</button></div>
</div>

<!-- ===== MENU 3: MORPHING ===== -->
<div class="tx-case" id="txCase3" data-case="3" hidden>
  <div class="tx-case-head">
    <div class="tx-case-badge">03</div>
    <div>
      <h2>Morphing: Ubah Stok SGM dari BOX ke PCS / RENCENG</h2>
      <p>Dilakukan <strong>setelah BTB Supplier SGM tersimpan</strong>, berlaku untuk menu 1 maupun menu 2. Barang tidak benar-benar pindah: stok BOX dikeluarkan lewat <strong>BKB Depot</strong>, lalu dimasukkan lagi sebagai stok eceran lewat <strong>BTB Depot</strong> ke depo sendiri. Contoh: Depo Parung, 30/09/2026.</p>
    </div>
  </div>

  <h3 class="tx-part">Hasil yang akan didapat</h3>
  <p>Setiap produk SGM punya kode berbeda untuk tiap satuan. Gunakan kode <strong>BOX</strong> saat menerima dari supplier, lalu kode berakhiran <strong>_PC</strong> atau <strong>_RE</strong> setelah morphing:</p>
  <table class="tx-mini">
    <tr><th>Produk</th><th>Masuk</th><th>Hasil Morphing</th></tr>
    <tr><td><strong>214380</strong><br>Vitagrow Choco 245G, 1X6 POUCH</td><td>136 BOX<br><small>(contoh menu 3)</small></td><td><strong>214380_PC</strong><br>816 PCS (136 &times; 6)</td></tr>
    <tr><td><strong>215369</strong><br>Vitagrow Choco 35G, 1X12 KARTON</td><td>41 BOX<br><small>(contoh menu 3)</small></td><td><strong>215369_RE</strong><br>492 RENCENG (41 &times; 12)</td></tr>
    <tr><td><strong>214380</strong></td><td>128 BOX<br><small>(contoh menu 2)</small></td><td><strong>214380_PC</strong><br>768 PCS (128 &times; 6)</td></tr>
    <tr><td><strong>215369</strong></td><td>74 BOX<br><small>(contoh menu 2)</small></td><td><strong>215369_RE</strong><br>888 RENCENG (74 &times; 12)</td></tr>
  </table>

  <h3 class="tx-part">Langkah-langkah (contoh: 214380 dan 215369)</h3>
  <div class="tx-steps">
  <div class="tx-step">
    <div class="tx-step-media"><span class="tx-step-num">Langkah 1</span><img src="assets/images/transaksi-produk-sgm/sgm-13-bkb-depot-214380.webp" alt="BKB Depot morphing produk 214380 sebanyak 136 BOX" loading="lazy"></div>
    <div class="tx-step-body">
      <span class="tx-step-tag tag-out">BKB Depot &middot; Mutasi (Keluar)</span>
      <h3 class="tx-step-title">Morphing Produk 214380, Bagian 1: BKB Depot</h3>
      <p class="tx-step-desc">Setelah barang diterima, ubah satuannya (<strong>morphing</strong>). Buka menu <strong>BKB Depot</strong>. Isi <strong>Depo Tujuan</strong> dengan depo sendiri (<code>281</code>, LP Parung), karena barang tidak benar-benar berpindah tempat. <strong>Driver</strong> dan <strong>Kendaraan</strong> diisi <code>COUNTER</code>. Gudang <strong>281-W01 - GUDANG LAYAK PARUNG</strong>, Tipe Stok <strong>JUAL</strong>. Kolom <strong>Keterangan</strong> ditulis <code>MORPHING</code>. Pada Detil, pilih produk <strong>214380</strong> dengan qty <strong>136 BOX</strong> (sama dengan jumlah yang diterima), lalu <strong>Simpan Applied</strong>. Catat <strong>No. Dokumen</strong> yang muncul, contoh <code>281-0001169</code>, karena dipakai di langkah berikutnya.</p>
    </div>
  </div>
  <div class="tx-step">
    <div class="tx-step-media"><span class="tx-step-num">Langkah 2</span><img src="assets/images/transaksi-produk-sgm/sgm-14-btb-depot-214380-pc.webp" alt="BTB Depot morphing produk 214380_PC sebanyak 816 PCS" loading="lazy"></div>
    <div class="tx-step-body">
      <span class="tx-step-tag">BTB Depot &middot; Mutasi (Masuk)</span>
      <h3 class="tx-step-title">Morphing Produk 214380, Bagian 2: BTB Depot</h3>
      <p class="tx-step-desc">Buka menu <strong>BTB Depot</strong>. <strong>Dari Depo</strong> diisi depo sendiri (<code>281</code>), Driver dan Kendaraan tetap <code>COUNTER</code>. Pada <strong>Keterangan</strong>, tulis nomor BKB tadi diikuti kata morphing, contoh: <code>281-0001169 | MORPHING | TERIMA MORPHING DARI BOX KE POUCH</code>. Pada Detil, pilih produk berkode <strong>214380_PC</strong> (satuan <strong>PCS</strong>) dengan qty <strong>816</strong>. Angka ini berasal dari 136 BOX &times; 6 POUCH per BOX. Lalu klik <strong>Simpan Applied</strong>.</p>
    </div>
  </div>
  <div class="tx-step">
    <div class="tx-step-media"><span class="tx-step-num">Langkah 3</span><img src="assets/images/transaksi-produk-sgm/sgm-15-bkb-depot-215369.webp" alt="BKB Depot morphing produk 215369 sebanyak 41 BOX" loading="lazy"></div>
    <div class="tx-step-body">
      <span class="tx-step-tag tag-out">BKB Depot &middot; Mutasi (Keluar)</span>
      <h3 class="tx-step-title">Morphing Produk 215369, Bagian 1: BKB Depot</h3>
      <p class="tx-step-desc">Lakukan hal yang sama untuk produk kedua. Di <strong>BKB Depot</strong>, isi <strong>Depo Tujuan</strong> <code>281</code>, Driver dan Kendaraan <code>COUNTER</code>, dan <strong>Keterangan</strong> <code>MORPHING DARI BOX KE RENCENG</code>. Pada Detil, pilih produk <strong>215369</strong> dengan qty <strong>41 BOX</strong>, lalu <strong>Simpan Applied</strong>. Catat No. Dokumen yang muncul, contoh <code>281-0001170</code>.</p>
    </div>
  </div>
  <div class="tx-step">
    <div class="tx-step-media"><span class="tx-step-num">Langkah 4</span><img src="assets/images/transaksi-produk-sgm/sgm-16-btb-depot-215369-re.webp" alt="BTB Depot morphing produk 215369_RE sebanyak 492 RENCENG" loading="lazy"></div>
    <div class="tx-step-body">
      <span class="tx-step-tag">BTB Depot &middot; Mutasi (Masuk)</span>
      <h3 class="tx-step-title">Morphing Produk 215369, Bagian 2: BTB Depot</h3>
      <p class="tx-step-desc">Di <strong>BTB Depot</strong>, isi <strong>Dari Depo</strong> <code>281</code> dan Driver/Kendaraan <code>COUNTER</code>. <strong>Keterangan</strong>: nomor BKB tadi diikuti keterangan, contoh <code>281-0001170 | TERIMA MORPHING DARI BOX KE RENCENG</code>. Pada Detil, pilih produk berkode <strong>215369_RE</strong> (satuan <strong>RENCENG</strong>) dengan qty <strong>492</strong>, yaitu 41 BOX &times; 12 renceng per BOX. Klik <strong>Simpan Applied</strong>.</p>
    </div>
  </div>
  <div class="tx-step">
    <div class="tx-step-media"><span class="tx-step-num">Langkah 5</span><img src="assets/images/transaksi-produk-sgm/sgm-17-laporan-saldo-tbg.webp" alt="Laporan saldo TBG: BTB Supplier, BKB Mutasi, BTB Mutasi, dan selisih 0" loading="lazy"></div>
    <div class="tx-step-body">
      <span class="tx-step-tag">Pengecekan &middot; Saldo TBG</span>
      <h3 class="tx-step-title">Cek Hasil di Laporan Saldo TBG</h3>
      <p class="tx-step-desc">Setelah semua dokumen tersimpan, cek laporan <strong>Saldo TBG</strong>. Hasil yang benar pada contoh ini: produk BOX 214380 tercatat <strong>BTB Supplier 136</strong> lalu <strong>BKB Mutasi 136</strong>, sedangkan produk PCS-nya tercatat <strong>BTB Mutasi 816</strong>. Produk BOX 215369 tercatat <strong>BTB Supplier 41</strong> lalu <strong>BKB Mutasi 41</strong>, sedangkan produk RENCENG-nya tercatat <strong>BTB Mutasi 492</strong>. Stok akhir muncul di kolom <strong>Layak Jual</strong> (816 dan 492) dan kolom <strong>Selisih</strong> harus <strong>0</strong>.</p>
    </div>
  </div>
  <div class="tx-step">
    <div class="tx-step-media"><span class="tx-step-num">Langkah 6</span><img src="assets/images/transaksi-produk-sgm/sgm-18-laporan-saldo-dms.webp" alt="Laporan saldo DMS: saldo akhir layak sama dengan saldo DMS" loading="lazy"></div>
    <div class="tx-step-body">
      <span class="tx-step-tag">Pengecekan &middot; Saldo DMS</span>
      <h3 class="tx-step-title">Cocokkan dengan Saldo DMS</h3>
      <p class="tx-step-desc">Terakhir, buka laporan yang membandingkan <strong>Saldo Akhir</strong> dengan <strong>Saldo DMS</strong>. Angka <strong>Saldo Akhir Layak</strong> untuk 214380_PC (<strong>816</strong>) dan 215369_RE (<strong>492</strong>) harus sama dengan angka <strong>Saldo DMS Layak</strong>. Jika sama, penerimaan dan morphing sudah benar. Jika berbeda, periksa kembali qty, kode produk, dan batch pada dokumen sebelum melapor ke atasan.</p>
    </div>
  </div>
  </div>
<div class="tx-note"><b>Ingat:</b>&nbsp;Morphing susu SGM dari BOX ke satuan eceran selalu memakai <strong>BKB/BTB Depot (mutasi)</strong>, bukan BKB/BTB Supplier maupun Distribusi. Lima hal wajib diperhatikan setiap kali menginput:
<ol class="tx-note-list">
  <li>Kolom <strong>Driver</strong> dan <strong>Kendaraan</strong> diisi <strong>COUNTER</strong> saja, bukan kendaraan atau driver sungguhan.</li>
  <li>Kolom <strong>Depo Tujuan</strong> (di BKB) maupun <strong>Dari Depo</strong> (di BTB) diisi <strong>depo sendiri</strong> (281), karena barang tidak benar-benar berpindah lokasi.</li>
  <li>Pada <strong>BKB Depot</strong>, kolom Keterangan ditulis <strong>MORPHING</strong> (boleh ditambah keterangan, misalnya &quot;DARI BOX KE RENCENG&quot;).</li>
  <li>Pada <strong>BTB Depot</strong>, kolom Keterangan diawali <strong>No. Dokumen BKB</strong> yang menjadi pasangannya, contoh: <code>281-0001169 | MORPHING | TERIMA MORPHING DARI BOX KE POUCH</code>.</li>
  <li>Qty BKB harus sama dengan qty yang diterima. Hasil BTB dihitung dari isi per BOX: <strong>&times; 6</strong> untuk 214380 dan <strong>&times; 12</strong> untuk 215369.</li>
</ol>
</div>
</div>
`;

  var TX_LAPORAN_EXCEL_CONTENT = `
<div class="tx-intro">
  <p><strong>Laporan Manual Excel</strong> adalah lembar Excel yang dipakai admin untuk menyamakan <strong>saldo di Excel</strong> (yang berasal dari sistem DMS) dengan <strong>hasil hitung fisik</strong> dari tim checker. Pekerjaan ini dilakukan di <strong>akhir shift 2</strong>.</p>
  <p><strong>Alurnya:</strong> (1) saldo sistem DMS diinput ulang ke Excel; (2) di akhir shift 2, admin menerima catatan hitungan fisik dari checker; (3) admin menyamakan saldo Excel dengan catatan tersebut. Pilih menu <strong>1</strong> untuk produk air (AQ, VIT, Mizone, SGM) atau menu <strong>2</strong> untuk galon. Setiap gambar bisa diklik untuk diperbesar, dan kotak bernomor pada gambar dijelaskan tepat di bawahnya.</p>
</div>

<div class="pipe"><p class="pipe-title">Alur di akhir shift 2</p><div class="pipe-row"><div class="pipe-node in"><b>1. Input saldo DMS</b>Ketik saldo sistem ke Excel</div><span class="pipe-arrow" aria-hidden="true">&rarr;</span><div class="pipe-node mid"><b>2. Terima catatan checker</b>Hasil hitung fisik tulis tangan</div><span class="pipe-arrow" aria-hidden="true">&rarr;</span><div class="pipe-node out"><b>3. Samakan</b>Layak, BS, Reject sama dengan fisik</div><span class="pipe-arrow" aria-hidden="true">&rarr;</span><div class="pipe-node in"><b>4. Periksa</b>Layak + BS + Reject = angka akhir</div></div></div><details class="gloss"><summary>Istilah penting di materi ini</summary><dl><dt>Layak</dt><dd>Barang bagus yang boleh dijual.</dd><dt>BS</dt><dd>Barang rusak ringan (bad stock).</dd><dt>Reject</dt><dd>Barang rusak/ditolak.</dd><dt>Saldo TBG</dt><dd>Saldo menurut pencatatan sistem untuk dicocokkan dengan fisik.</dd><dt>Selisih</dt><dd>Total Fisik dikurangi Saldo TBG. Idealnya nol.</dd><dt>BTL</dt><dd>Botol/galon kosong.</dd></dl></details><p class="warn"><b>Rumus yang dipakai:</b> Layak = Angka akhir &minus; BS &minus; Reject. Catatan checker memakai titik (5.594), Excel memakai koma (5,594). Nilainya sama.</p>
<div class="tx-tabs" role="tablist" aria-label="Pilih bagian materi Laporan Manual Excel">
  <button type="button" class="tx-tab active" role="tab" aria-selected="true" aria-controls="txCase1" data-case-target="1">
    <span class="tx-tab-num">01</span>
    <span class="tx-tab-text"><span class="tx-tab-title">Produk Air: AQ, VIT, Mizone &amp; SGM</span><span class="tx-tab-meta">Samakan Layak, BS, Reject &middot; 4 langkah</span></span>
    <span class="tx-tab-chevron">&rsaquo;</span>
  </button>
  <button type="button" class="tx-tab" role="tab" aria-selected="false" aria-controls="txCase2" data-case-target="2">
    <span class="tx-tab-num">02</span>
    <span class="tx-tab-text"><span class="tx-tab-title">Produk Galon: AQ &amp; VIT</span><span class="tx-tab-meta">Samakan saldo galon &middot; 5 langkah</span></span>
    <span class="tx-tab-chevron">&rsaquo;</span>
  </button>
</div>

<!-- ===== MENU 1: PRODUK AIR ===== -->
<div class="tx-case" id="txCase1" data-case="1">
  <div class="tx-case-head">
    <div class="tx-case-badge">01</div>
    <div>
      <h2>Samakan Saldo Produk Air dengan Hitungan Checker</h2>
      <p>Ubah <strong>Saldo Layak, Saldo BS, dan Saldo Reject</strong> di Excel agar sama dengan hitungan fisik checker, berdasarkan catatan tulis tangan halaman AQ dan halaman VIT/SGM.</p>
    </div>
  </div>
  <div class="tx-steps rows">
    <div class="tx-step">
      <div class="tx-step-media is-doc"><span class="tx-step-num">Langkah 1</span><img src="assets/images/laporan-manual-excel/lme-01-excel-saldo-dms-air.webp" alt="Lembar Excel Saldo DMS produk air dengan kolom Saldo DMS dan Mutasi Internal ditandai" loading="lazy"></div>
      <div class="tx-step-body">
        <span class="tx-step-tag">Lembar Excel &middot; Produk Air</span>
        <h3 class="tx-step-title">Kenali Lembar Excel Saldo DMS</h3>
        <div class="tx-step-desc"><p>Lembar ini memuat seluruh produk air (AQ, VT, Mizone, dan lainnya) lengkap dengan kode dan namanya. Saldo yang tertulis di dalamnya adalah saldo sistem DMS yang <strong>Anda input ulang secara manual</strong> ke Excel.</p><ol class="tx-legend"><li><i class="lg c-red">1</i><span><strong>Saldo DMS</strong> (Layak, BS, Reject). Kolom inilah yang nanti <strong>disesuaikan dengan hitungan fisik</strong> checker.</span></li><li><i class="lg c-blue">2</i><span><strong>Mutasi Internal</strong> (Layak, BS, Reject, Keterangan). Mencatat perpindahan stok antarkondisi.</span></li><li><i class="lg c-orange">3</i><span>Contoh baris bermutasi: AQ.600ML 1X24 ID GOSOK tercatat <strong>Layak -4</strong> dan <strong>BS +4</strong> dengan keterangan <strong>BUFFER</strong>. Artinya 4 BOX berpindah dari kondisi Layak ke BS.</span></li></ol><p><small>Tanda &quot;-&quot; pada sel berarti nol. Angka pada gambar hanyalah contoh.</small></p></div>
      </div>
    </div>
    <div class="tx-step">
      <div class="tx-step-media is-doc"><span class="tx-step-num">Langkah 2</span><img src="assets/images/laporan-manual-excel/lme-02-catatan-checker-aqua.webp" alt="Catatan hitungan fisik tulis tangan checker untuk produk AQ dengan tanda nomor" loading="lazy"></div>
      <div class="tx-step-body">
        <span class="tx-step-tag">Hitungan Fisik &middot; AQ</span>
        <h3 class="tx-step-title">Baca Catatan Checker Produk AQ</h3>
        <div class="tx-step-desc"><p>Di akhir shift 2, tim checker menyerahkan hasil hitung fisik berupa catatan tulis tangan. Halaman ini untuk produk <strong>AQ</strong> (dan Mizone). <strong>Satu kolom sama dengan satu produk.</strong></p><ol class="tx-legend"><li><i class="lg c-red">1</i><span><strong>R.</strong> = jumlah Reject. <strong>BS.</strong> = jumlah BS.</span></li><li><i class="lg c-blue">2</i><span>Rincian hitungan. Umumnya berbentuk isi per pallet &times; jumlah pallet, ditambah sisa yang tidak penuh.</span></li><li><i class="lg c-green">3</i><span><strong>H.</strong> = hasil hitung, yaitu <strong>total fisik produk</strong> (sudah termasuk BS dan Reject). Angka dalam <strong>kurung ( )</strong> adalah angka akhir.</span></li><li><i class="lg c-purple">4</i><span>Bila <strong>H.</strong> berbeda dengan angka dalam kurung (contoh: kolom 600), <strong>pakai angka dalam kurung</strong>.</span></li><li><i class="lg c-teal">5</i><span>Baris bawah memuat produk lain, termasuk Mizone.</span></li></ol><p><strong>Pasangan tulisan checker dan produk di Excel:</strong></p><table class="tx-mini"><tr><th>Tulisan checker</th><th>Produk</th><th>Kode</th></tr><tr><td>200</td><td>AQ.200ML 1X48</td><td>204579</td></tr><tr><td>330</td><td>AQ.330ML 1X24</td><td>74556</td></tr><tr><td>600</td><td>AQ.600ML 1X24 ID GOSOK</td><td>208575</td></tr><tr><td>600 pcs</td><td>AQ.600ML 1X1 ID GOSOK</td><td>208575P</td></tr><tr><td>1500</td><td>AQ.1500ML 1X12</td><td>74553</td></tr><tr><td>220 cube</td><td>AQ.220ML MINI BOTTLE LOCAL 1X24</td><td>166126</td></tr><tr><td>330 HB</td><td>AQ.330ML LOCAL HOKBEN 1X24</td><td>74557</td></tr><tr><td>Reflexion</td><td>AQ.380ML REFLECTIONS BAL 1X12</td><td>174139</td></tr><tr><td>Tulisan mirip &quot;250&quot;</td><td>AQ.750ML 1X18</td><td>81681</td></tr><tr><td>AL, mvc, cch</td><td>Mizone Activ Lychee Lemon, Mood Up Cranberry, Coco Bost</td><td>145141, 145143, 206774</td></tr></table><p><small>Bila ragu membaca tulisan tangan, cocokkan juga dengan angka pada lembar Excel atau tanyakan langsung ke checker.</small></p></div>
      </div>
    </div>
    <div class="tx-step tx-step-text">
      <div class="tx-step-body">
        <span class="tx-step-num tx-step-num-inline">Langkah 3</span>
        <span class="tx-step-tag">Hitung &middot; Ubah Saldo</span>
        <h3 class="tx-step-title">Hitung Saldo Layak, BS, dan Reject, lalu Ubah di Excel</h3>
        <div class="tx-step-desc">
          <p>Angka akhir checker adalah <strong>total</strong>. Karena itu saldo <strong>Layak</strong> dihitung dengan rumus berikut:</p>
          <p class="tx-formula">Layak = Angka akhir &minus; BS &minus; Reject</p>
          <p>Setelah itu, ubah kolom <strong>Saldo DMS</strong> (Layak, BS, Reject) pada Excel agar <strong>persis sama</strong> dengan hasil fisik checker. Contoh hitungannya:</p>
          <table class="tx-mini">
            <tr><th>Produk</th><th>Angka akhir</th><th>BS</th><th>Reject</th><th>Layak</th></tr>
            <tr><td>AQ.200ML</td><td>5.594</td><td>2</td><td>23</td><td><strong>5.569</strong></td></tr>
            <tr><td>AQ.330ML</td><td>3.823</td><td>1</td><td>0</td><td><strong>3.822</strong></td></tr>
            <tr><td>VT.200ML</td><td>10.437</td><td>1</td><td>142</td><td><strong>10.294</strong></td></tr>
            <tr><td>VT.550ML</td><td>3.954</td><td>25</td><td>8</td><td><strong>3.921</strong></td></tr>
            <tr><td>Mizone Coco Bost</td><td>1.082</td><td>1</td><td>0</td><td><strong>1.081</strong></td></tr>
          </table>
          <p><small>Catatan checker memakai titik sebagai pemisah ribuan (5.594), sedangkan Excel memakai koma (5,594). Nilainya sama.</small></p>
        </div>
      </div>
    </div>
    <div class="tx-step">
      <div class="tx-step-media is-doc"><span class="tx-step-num">Langkah 4</span><img src="assets/images/laporan-manual-excel/lme-03-catatan-checker-vit-sgm.webp" alt="Catatan hitungan fisik tulis tangan checker untuk produk VIT dan SGM dengan tanda nomor" loading="lazy"></div>
      <div class="tx-step-body">
        <span class="tx-step-tag">Hitungan Fisik &middot; VIT &amp; SGM</span>
        <h3 class="tx-step-title">Samakan Produk VIT dan SGM</h3>
        <div class="tx-step-desc"><p>Halaman checker untuk <strong>VIT</strong> dibaca dengan cara yang sama seperti halaman AQ: <strong>R.</strong>, <strong>BS.</strong>, <strong>H.</strong>, dan angka dalam kurung. Rumus Layak juga sama.</p><ol class="tx-legend"><li><i class="lg c-red">1</i><span><strong>R.</strong> dan <strong>BS.</strong> produk VIT.</span></li><li><i class="lg c-green">2</i><span>Angka akhir (hasil hitung) yang menjadi dasar saldo.</span></li><li><i class="lg c-orange">3</i><span>Empat kotak <strong>SGM</strong>. Pouch, renceng, dan box dihitung <strong>terpisah</strong>.</span></li><li><i class="lg c-gray">4</i><span>Catatan lain di luar produk. Tanyakan ke checker bila ingin menggunakannya.</span></li></ol><table class="tx-mini"><tr><th>Tulisan checker</th><th>Produk</th><th>Kode</th></tr><tr><td>200</td><td>VT.200ML 1X48</td><td>173022</td></tr><tr><td>330</td><td>VT.330ML 1X24</td><td>112839</td></tr><tr><td>550</td><td>VT.550ML 1X24</td><td>157095</td></tr><tr><td>1500</td><td>VT.1500ML 1X12</td><td>74565</td></tr><tr><td>220</td><td>VT.220ML BOTTLE LOCAL 1X24</td><td>164026</td></tr><tr><td>SGM 245 gr / pouch</td><td>214380 satuan PCS</td><td>214380_PC</td></tr><tr><td>SGM 35 gr / renceng</td><td>215369 satuan RENCENG</td><td>215369_RE</td></tr><tr><td>SGM 245 gr box</td><td>214380 satuan BOX</td><td>214380</td></tr><tr><td>SGM 35 gr box</td><td>215369 satuan BOX</td><td>215369</td></tr></table><p><small>Tentang kode berakhiran _PC dan _RE, lihat materi <strong>Transaksi Produk SGM</strong>, menu Morphing.</small></p></div>
      </div>
    </div>
  </div>
  <div class="tx-note"><b>Periksa sebelum menyimpan</b>
    <ol class="tx-note-list">
      <li>Semua produk pada catatan checker (halaman AQ dan halaman VIT/SGM) sudah terisi di Excel.</li>
      <li>Untuk setiap produk: <strong>Layak + BS + Reject</strong> sama dengan angka akhir checker.</li>
      <li>Perpindahan antarkondisi (misalnya BUFFER) tercatat di <strong>Mutasi Internal</strong> beserta keterangannya.</li>
      <li>Angka yang diketik sudah dicek ulang terhadap catatan checker, bukan hanya diingat.</li>
    </ol>
    <button type="button" class="tx-jump" data-case-jump="2">Lanjut ke Menu 2: Produk Galon &rsaquo;</button>
  </div>
</div>

<!-- ===== MENU 2: PRODUK GALON ===== -->
<div class="tx-case" id="txCase2" data-case="2" hidden>
  <div class="tx-case-head">
    <div class="tx-case-badge">02</div>
    <div>
      <h2>Samakan Saldo Galon AQ dan VIT dengan Hitungan Checker</h2>
      <p>Urutannya: samakan <strong>lembar saldo galon</strong> dengan hitungan checker lebih dahulu. Setelah itu samakan <strong>BS dan Reject</strong> pada lembar <strong>Saldo Akhir</strong> Aqua dan Vit.</p>
    </div>
  </div>
  <div class="tx-steps rows">
    <div class="tx-step">
      <div class="tx-step-media is-doc"><span class="tx-step-num">Langkah 1</span><img src="assets/images/laporan-manual-excel/lme-05-excel-saldo-galon.webp" alt="Lembar Excel saldo galon AQ dan VT dengan kolom Layak Jual BS Reject Total Fisik Saldo TBG dan Selisih ditandai" loading="lazy"></div>
      <div class="tx-step-body">
        <span class="tx-step-tag">Lembar Excel &middot; Galon</span>
        <h3 class="tx-step-title">Kenali Lembar Saldo Galon</h3>
        <div class="tx-step-desc"><p>Lembar ini sama fungsinya dengan lembar produk air, tetapi untuk <strong>galon</strong>. Ada empat baris: AQ.5 GLN <strong>ISI</strong>, AQ.5 GLN <strong>BTL</strong> (galon kosong), VT.5 GLN <strong>ISI</strong>, dan VT.5 GLN <strong>BTL</strong>.</p><ol class="tx-legend"><li><i class="lg c-red">1</i><span><strong>Layak Jual, BS, Reject</strong>: diisi dari hitungan fisik checker (Langkah 2).</span></li><li><i class="lg c-blue">2</i><span><strong>Total Fisik</strong> = Layak Jual + BS + Reject. Khusus baris <strong>BTL</strong>, ditambah juga Total Fisik galon ISI di atasnya.</span></li><li><i class="lg c-green">3</i><span><strong>Saldo TBG</strong>: saldo menurut sistem. Angkanya sama dengan baris TOTAL di lembar Saldo Akhir (Langkah 4 dan 5).</span></li><li><i class="lg c-purple">4</i><span><strong>Selisih</strong> = Total Fisik &minus; Saldo TBG.</span></li></ol><p><small>Saldo TBG N-1 adalah saldo TBG hari sebelumnya. Kolom Keterangan dipakai untuk mencatat penjelasan selisih.</small></p><p><strong>Contoh baris BTL:</strong> AQ.5 GLN BTL = 42.854 + 13 + 0 + 84.145 (Total Fisik AQ ISI) = <strong>127.012</strong>.</p></div>
      </div>
    </div>
    <div class="tx-step">
      <div class="tx-step-media is-doc"><span class="tx-step-num">Langkah 2</span><img src="assets/images/laporan-manual-excel/lme-04-catatan-checker-galon.webp" alt="Catatan hitungan fisik galon tulis tangan checker dengan label pemetaan ke kolom Excel" loading="lazy"></div>
      <div class="tx-step-body">
        <span class="tx-step-tag">Hitungan Fisik &middot; Galon</span>
        <h3 class="tx-step-title">Terima Hitungan Fisik Galon dari Checker</h3>
        <div class="tx-step-desc"><p>Checker galon menulis hasilnya dalam satu lembar untuk AQ dan VIT. Setiap baris tulisan sudah diberi label berwarna pada gambar untuk menunjukkan <strong>kolom tujuannya</strong> di lembar Excel.</p><ol class="tx-legend"><li><i class="lg c-green">&nbsp;</i><span><strong>Hijau</strong> = kolom Layak Jual</span></li><li><i class="lg c-orange">&nbsp;</i><span><strong>Oranye</strong> = kolom BS</span></li><li><i class="lg c-red">&nbsp;</i><span><strong>Merah</strong> = kolom Reject</span></li></ol><table class="tx-mini"><tr><th>Tulisan checker</th><th>Isi (galon penuh)</th><th>Botol (galon kosong)</th></tr><tr><td>Layak Jual</td><td>&quot;isi&quot;</td><td>&quot;Botol&quot;</td></tr><tr><td>BS</td><td>&quot;RB&quot;</td><td>&quot;CG&quot;</td></tr><tr><td>Reject</td><td>&quot;RJ&quot;</td><td>&quot;RJ&quot; (baris kedua)</td></tr></table><p>Dengan catatan pada gambar, hasilnya: AQ ISI 83.925 / 219 / 1, AQ BTL 42.854 / 13 / 0, VT ISI 1.417 / 1.632 / 1, VT BTL 2.458 / 0 / 3.</p></div>
      </div>
    </div>
    <div class="tx-step tx-step-text">
      <div class="tx-step-body">
        <span class="tx-step-num tx-step-num-inline">Langkah 3</span>
        <span class="tx-step-tag">Isi &middot; Samakan dengan Fisik</span>
        <h3 class="tx-step-title">Samakan Lembar Saldo Galon dengan Hitungan Checker</h3>
        <div class="tx-step-desc">
          <p>Isi kolom <strong>Layak Jual, BS, dan Reject</strong> pada empat baris galon dengan angka checker. Hasilnya harus <strong>sama persis</strong>. Total Fisik dan Selisih mengikuti rumus pada Langkah 1.</p>
          <table class="tx-mini">
            <tr><th>Baris</th><th>Layak Jual</th><th>BS</th><th>Reject</th><th>Total Fisik</th></tr>
            <tr><td>AQ.5 GLN ISI</td><td>83.925</td><td>219</td><td>1</td><td><strong>84.145</strong></td></tr>
            <tr><td>AQ.5 GLN BTL</td><td>42.854</td><td>13</td><td>0</td><td><strong>127.012</strong><br><small>(42.867 + 84.145)</small></td></tr>
            <tr><td>VT.5 GLN ISI</td><td>1.417</td><td>1.632</td><td>1</td><td><strong>3.050</strong></td></tr>
            <tr><td>VT.5 GLN BTL</td><td>2.458</td><td>0</td><td>3</td><td><strong>5.511</strong><br><small>(2.461 + 3.050)</small></td></tr>
          </table>
          <p>Setelah itu, bandingkan <strong>Total Fisik</strong> dengan <strong>Saldo TBG</strong>. Bila kolom <strong>Selisih</strong> tidak nol (pada contoh: AQ BTL +861 dan VT BTL &minus;861; VT ISI &minus;15), telusuri penyebabnya lalu catat di kolom <strong>Keterangan</strong>.</p>
        </div>
      </div>
    </div>
    <div class="tx-step">
      <div class="tx-step-media is-doc"><span class="tx-step-num">Langkah 4</span><img src="assets/images/laporan-manual-excel/lme-06-excel-aqua-galon.webp" alt="Lembar Saldo Akhir Aqua galon dengan baris BS dan Reject serta TOTAL dan SELISIH ditandai" loading="lazy"></div>
      <div class="tx-step-body">
        <span class="tx-step-tag">Saldo Akhir &middot; Aqua Galon</span>
        <h3 class="tx-step-title">Samakan Saldo Akhir Aqua Galon (BS dan Reject)</h3>
        <div class="tx-step-desc"><p>Setelah lembar saldo galon sama dengan fisik, ubah juga lembar <strong>Saldo Akhir</strong> milik Aqua galon. Yang diubah <strong>hanya BS dan Reject</strong>. Baris Layak tidak diubah.</p><ol class="tx-legend"><li><i class="lg c-red">1</i><span>Baris <strong>BS</strong> dan <strong>REJECT</strong>. Blok kiri (galon ISI): BS <strong>219</strong>, Reject <strong>1</strong>. Blok kanan (galon kosong, GLN AQ K): BS <strong>232</strong> (219 + 13), Reject <strong>1</strong> (1 + 0).</span></li><li><i class="lg c-green">2</i><span>Baris <strong>TOTAL</strong> dan <strong>SELISIH</strong>. TOTAL (84.145 dan 126.151) sama dengan Saldo TBG di lembar galon. SELISIH menunjukkan &quot;-&quot; (nol).</span></li></ol><table class="tx-mini"><tr><th>Blok</th><th>BS</th><th>Reject</th></tr><tr><td>Kiri (galon ISI)</td><td>BS isi = <strong>219</strong></td><td>Reject isi = <strong>1</strong></td></tr><tr><td>Kanan (galon kosong)</td><td>BS isi + BS botol = 219 + 13 = <strong>232</strong></td><td>Reject isi + Reject botol = 1 + 0 = <strong>1</strong></td></tr></table></div>
      </div>
    </div>
    <div class="tx-step">
      <div class="tx-step-media is-doc"><span class="tx-step-num">Langkah 5</span><img src="assets/images/laporan-manual-excel/lme-07-excel-vit-galon.webp" alt="Lembar Saldo Akhir Vit galon dengan baris BS dan Reject serta TOTAL dan SELISIH ditandai" loading="lazy"></div>
      <div class="tx-step-body">
        <span class="tx-step-tag">Saldo Akhir &middot; Vit Galon</span>
        <h3 class="tx-step-title">Samakan Saldo Akhir Vit Galon (BS dan Reject)</h3>
        <div class="tx-step-desc"><p>Lakukan hal yang sama pada lembar <strong>Vit galon</strong>. Lagi-lagi hanya <strong>BS dan Reject</strong> yang disamakan dengan fisik.</p><ol class="tx-legend"><li><i class="lg c-red">1</i><span>Baris <strong>BS</strong> dan <strong>REJECT</strong>. Blok kiri (galon ISI): BS <strong>1.632</strong>, Reject <strong>1</strong>. Blok kanan (galon kosong, GLN VT K): BS <strong>1.632</strong> (1.632 + 0), Reject <strong>4</strong> (1 + 3).</span></li><li><i class="lg c-green">2</i><span>Baris <strong>TOTAL</strong> dan <strong>SELISIH</strong>. TOTAL (3.065 dan 6.372) sama dengan Saldo TBG di lembar galon.</span></li></ol><table class="tx-mini"><tr><th>Blok</th><th>BS</th><th>Reject</th></tr><tr><td>Kiri (galon ISI)</td><td>BS isi = <strong>1.632</strong></td><td>Reject isi = <strong>1</strong></td></tr><tr><td>Kanan (galon kosong)</td><td>1.632 + 0 = <strong>1.632</strong></td><td>1 + 3 = <strong>4</strong></td></tr></table><p><small>Baris Layak tidak diubah. Pada contoh, Layak di sistem 1.432 sedangkan hasil checker 1.417. Selisih 15 itu terlihat di kolom Selisih (&minus;15) pada lembar saldo galon.</small></p></div>
      </div>
    </div>
  </div>
  <div class="tx-note"><b>Periksa sebelum menyimpan</b>
    <ol class="tx-note-list">
      <li>Layak Jual, BS, dan Reject di lembar saldo galon sama dengan catatan checker.</li>
      <li>BS dan Reject di lembar Saldo Akhir Aqua dan Vit sama dengan fisik (blok kanan = isi + botol).</li>
      <li>TOTAL di Saldo Akhir sama dengan Saldo TBG, dan SELISIH menunjukkan &quot;-&quot;.</li>
      <li>Selisih yang masih ada pada lembar saldo galon sudah dicatat penyebabnya di kolom Keterangan.</li>
    </ol>
  </div>
</div>
`;

  var TX_OC_CONTENT = `
<div class="tx-intro">
  <p><strong>Input Opening &amp; Closing Gudang</strong> adalah pencatatan stok fisik gudang dua kali dalam sehari: <strong>Opening</strong> untuk stok di awal hari dan <strong>Closing</strong> untuk stok di akhir hari. Penginputan yang sebenarnya dilakukan di <strong>website resmi perusahaan</strong> (aplikasi AQUA &amp; VIT), bukan di website modul ini.</p>
  <p>Di website resmi, sistem sangat ketat: <strong>setelah data disimpan (Save), isinya tidak bisa diubah lagi</strong>. Karena itu, salah memasukkan angka ke produk yang keliru bisa merepotkan. Untuk mencegahnya, website modul ini menyediakan menu <strong><a href="#/opening-closing">Website Opening &amp; Closing</a></strong> sebagai tempat <strong>latihan</strong> dan tempat <strong>menyamakan data</strong> sebelum Anda menginput di website perusahaan.</p>
</div>

<div class="pipe"><p class="pipe-title">Alur menu di website perusahaan</p><div class="pipe-row"><div class="pipe-node mid"><b>Applications</b>Klik kotak Aqua Vit</div><span class="pipe-arrow" aria-hidden="true">&rarr;</span><div class="pipe-node in"><b>Login</b>Username dan password sendiri</div><span class="pipe-arrow" aria-hidden="true">&rarr;</span><div class="pipe-node mid"><b>Opening Closing</b>Lalu Opening Closing Gudang</div><span class="pipe-arrow" aria-hidden="true">&rarr;</span><div class="pipe-node out"><b>OPENING / CLOSING</b>Pilih tombol sesuai waktu</div><span class="pipe-arrow" aria-hidden="true">&rarr;</span><div class="pipe-node in"><b>Isi QTY Fisik</b>4 gudang, lalu Save changes</div></div></div><details class="gloss"><summary>Istilah penting di materi ini</summary><dl><dt>Opening</dt><dd>Stok awal hari. Hanya 1 kali per tanggal.</dd><dt>Closing</dt><dd>Stok akhir hari. Bisa dibuat setelah Opening tersimpan.</dd><dt>Layak / BS / Reject / Layak PET</dt><dd>Empat gudang yang harus diisi sesuai kondisi barang.</dd><dt>QTY Fisik</dt><dd>Jumlah hasil hitung langsung di gudang, bukan angka sistem.</dd></dl></details><p class="warn"><b>Penting:</b> setelah Save, data tidak bisa diubah. Periksa nama produk dan angka sebelum menekan Save.</p>
<div class="tx-case-head">
  <div class="tx-case-badge">OC</div>
  <div>
    <h2>Alur Input Opening &amp; Closing di Website Perusahaan</h2>
    <p>Ikuti 5 langkah berikut, mulai dari membuka aplikasi sampai mengisi qty tiap produk di gudang.</p>
  </div>
</div>

<div class="tx-steps">

  <div class="tx-step">
    <div class="tx-step-media"><span class="tx-step-num">Langkah 1</span><img src="assets/images/opening-closing/oc-01-halaman-aplikasi-aqua-vit.webp" alt="Halaman awal Applications TUA Group dengan pilihan Aqua Vit" loading="lazy"></div>
    <div class="tx-step-body">
      <span class="tx-step-tag">Halaman Awal &middot; Applications</span>
      <h3 class="tx-step-title">Buka Halaman Awal, Pilih &quot;Aqua Vit&quot;</h3>
      <p class="tx-step-desc">Buka website perusahaan. Di halaman awal (<strong>Applications &mdash; TUA Group</strong>) tersedia banyak aplikasi internal. Klik kotak <strong>Aqua Vit</strong> di baris paling atas, paling kiri. Kotak lain tidak dipakai untuk Opening &amp; Closing.</p>
    </div>
  </div>

  <div class="tx-step">
    <div class="tx-step-media"><span class="tx-step-num">Langkah 2</span><img src="assets/images/opening-closing/oc-02-login-aqua-vit.webp" alt="Halaman login AQUA &amp; VIT: kolom Username dan Password" loading="lazy"></div>
    <div class="tx-step-body">
      <span class="tx-step-tag">Login &middot; AQUA &amp; VIT</span>
      <h3 class="tx-step-title">Login dengan Username dan Password Anda</h3>
      <p class="tx-step-desc">Isi <strong>Username</strong> dan <strong>Password</strong> akun Anda sendiri, lalu klik <strong>Login</strong>. Ikon mata di kolom password dipakai untuk melihat huruf yang diketik, berguna untuk memastikan tidak salah ketik. Jangan meminjamkan akun kepada orang lain, karena data yang tersimpan akan tercatat atas nama Anda.</p>
    </div>
  </div>

  <div class="tx-step">
    <div class="tx-step-media"><span class="tx-step-num">Langkah 3</span><img src="assets/images/opening-closing/oc-03-menu-opening-closing-gudang.webp" alt="Halaman Home setelah login, menu Opening Closing di sebelah kiri" loading="lazy"></div>
    <div class="tx-step-body">
      <span class="tx-step-tag">Home &middot; Menu Samping</span>
      <h3 class="tx-step-title">Pilih Menu &quot;Opening Closing&quot; lalu &quot;Opening Closing Gudang&quot;</h3>
      <p class="tx-step-desc">Setelah login berhasil, halaman <strong>Home</strong> terbuka. Di menu biru sebelah kiri, klik <strong>Opening Closing</strong> hingga muncul submenu, lalu klik <strong>Opening Closing Gudang</strong>.</p>
    </div>
  </div>

  <div class="tx-step">
    <div class="tx-step-media"><span class="tx-step-num">Langkah 4</span><img src="assets/images/opening-closing/oc-04-tombol-opening-closing.webp" alt="Halaman Opening Closing Gudang dengan tombol OPENING dan CLOSING" loading="lazy"></div>
    <div class="tx-step-body">
      <span class="tx-step-tag">Halaman Rekap &middot; Opening / Closing</span>
      <h3 class="tx-step-title">Pilih Tombol OPENING atau CLOSING</h3>
      <p class="tx-step-desc">Di pojok kanan atas ada dua tombol. Klik <strong>OPENING</strong> (biru) untuk menginput data awal hari, atau klik <strong>CLOSING</strong> (merah) untuk menginput data akhir hari. Tabel di bawahnya adalah rekap per tanggal: qty fisik, qty DMS, selisih, nama user, dan jam penginputan. Tombol <strong>Ekspor to Excel</strong> dipakai untuk mengunduh rekap tersebut.</p>
    </div>
  </div>

  <div class="tx-step">
    <div class="tx-step-media"><span class="tx-step-num">Langkah 5</span><img src="assets/images/opening-closing/oc-05-form-opening-gudang.webp" alt="Form OPENING GUDANG berisi daftar 4 gudang untuk diisi qty fisiknya" loading="lazy"></div>
    <div class="tx-step-body">
      <span class="tx-step-tag tag-out">Form Input &middot; QTY Fisik</span>
      <h3 class="tx-step-title">Isi QTY Fisik Sesuai Nama Produk, Lalu Save</h3>
      <p class="tx-step-desc">Setelah tombol dipilih, muncul form <strong>OPENING GUDANG</strong> (atau <strong>CLOSING GUDANG</strong>). Kolom <strong>Depo</strong> sudah terisi otomatis. Pada <strong>QTY Fisik</strong> terdapat 4 gudang: <strong>Layak, BS, Reject,</strong> dan <strong>Layak PET</strong>. Klik nama gudang untuk membuka daftar produknya, lalu isi qty pada baris yang <strong>namanya sama persis</strong> dengan produk yang dihitung. Setelah semua gudang terisi dan diperiksa, klik <strong>Save changes</strong>. Tombol <strong>Close</strong> menutup form tanpa menyimpan.</p>
    </div>
  </div>

</div>

<div class="tx-note"><b>Aturan Sistem yang Ketat:</b>&nbsp;Perhatikan tiga aturan berikut sebelum menekan Save.
<ol class="tx-note-list">
  <li><strong>Opening hanya bisa satu kali per tanggal.</strong> Jika Opening tanggal itu sudah tersimpan, Anda tidak bisa membuat Opening lagi di tanggal yang sama.</li>
  <li><strong>Closing baru bisa dibuat setelah Opening tersimpan.</strong> Jika belum ada data Opening, tombol Closing tidak bisa dipakai. Pada rekap akan terlihat tulisan &quot;closing belum di input&quot;.</li>
  <li><strong>Data yang sudah di-Save tidak bisa diubah.</strong> Periksa ulang setiap qty dan nama produknya sebelum menyimpan.</li>
</ol>
</div>

<h3>Contoh Waktu Penginputan</h3>
<p>Sebagai gambaran, berikut contoh Opening dan Closing pada tanggal yang sama:</p>
<table>
  <tr><th>Jenis</th><th>Tanggal</th><th>Jam</th></tr>
  <tr><td>Opening</td><td>30/09/2026</td><td>00:10 WIB</td></tr>
  <tr><td>Closing</td><td>30/09/2026</td><td>23:00 WIB</td></tr>
</table>
<p>Satu tanggal hanya punya <strong>satu Opening</strong> dan <strong>satu Closing</strong>. Jam penginputan akan tercatat di kolom <em>Time Opening</em> dan <em>Time Closing</em> pada rekap.</p>

<h3>Latihan Dulu di Website Modul Ini</h3>
<p>Agar tidak salah produk saat menginput di website perusahaan, biasakan langkah berikut:</p>
<ol class="tx-note-list">
  <li>Buka menu <strong><a href="#/opening-closing">Website Opening &amp; Closing</a></strong> di website modul ini.</li>
  <li>Isi qty tiap produk di gudang yang sama, urutannya mengikuti hasil hitung fisik Anda.</li>
  <li>Periksa lagi: apakah angka sudah berada di baris produk yang benar? Gunakan kolom <em>Cari produk</em> jika daftar terasa panjang.</li>
  <li>Klik <strong>Unduh Excel</strong> bila ingin mencocokkan atau menunjukkan datanya kepada rekan.</li>
  <li>Setelah yakin semuanya benar, barulah input di <strong>website resmi perusahaan</strong> dan klik Save.</li>
</ol>
<p>Data latihan hanya tersimpan di perangkat Anda dan <strong>tidak terkirim</strong> ke sistem perusahaan, jadi aman dicoba berulang kali.</p>

<div class="tx-note"><b>Ringkasan Cepat</b>
<ul class="tx-recap" style="margin:12px 0 0; padding:0;">
  <li><b>Alur menu</b>Applications &rarr; Aqua Vit &rarr; Login &rarr; Opening Closing &rarr; Opening Closing Gudang</li>
  <li><b>Opening</b>Data awal hari, hanya 1 kali per tanggal</li>
  <li><b>Closing</b>Data akhir hari, hanya bisa jika Opening sudah tersimpan</li>
  <li><b>Setelah Save</b>Tidak bisa diubah, periksa dulu sebelum menyimpan</li>
  <li><b>Latihan</b>Gunakan menu Website Opening &amp; Closing di website modul ini</li>
</ul>
</div>
`;

    var TX_BTB_BKB_SUPPLIER_CONTENT = `
<p><strong>Transaksi BTB BKB Supplier</strong> adalah prosedur pencatatan Bukti Terima Barang (BTB) dan Bukti Keluar Barang (BKB) untuk transaksi yang melibatkan supplier/pemasok eksternal. Materi ini memuat <strong>pembaruan resmi dari Kantor Pusat</strong> mengenai cara penginputan BTB Supplier untuk produk <strong>AQUA Gallon &amp; AQUA SPS</strong> di DMS 3, sekaligus aturan wajib saat sebuah Surat Jalan/PO dibatalkan. Pelajari dengan saksama agar setiap dokumen yang disimpan sudah sesuai format terbaru.</p>

<div class="pipe"><p class="pipe-title">Isian yang berubah (ringkas)</p><div class="pipe-row"><div class="pipe-node in"><b>AQUA Gallon</b>No. Ref. 3 = HPPP/Retur/Botol/Jugrack. Keterangan = No. GRFC</div><span class="pipe-arrow" aria-hidden="true">&rarr;</span><div class="pipe-node mid"><b>AQUA SPS</b>No. Ref. 3 kosong. Keterangan = GRFC/Qty GRFC</div><span class="pipe-arrow" aria-hidden="true">&rarr;</span><div class="pipe-node out"><b>PO dibatalkan</b>No. Surat Jalan = BATAL di BTB dan BKB</div></div></div><details class="gloss"><summary>Istilah penting di materi ini</summary><dl><dt>HPPP</dt><dd>Nomor dokumen dari pabrik yang diawali 90A.</dd><dt>GRFC</dt><dd>Dokumen penerimaan barang dari pabrik. Bila tidak ada, tulis TIDAK ADA GRFC.</dd><dt>Jugrack</dt><dd>Rak/penyangga galon.</dd><dt>SPS</dt><dd>Produk air kemasan (bukan galon).</dd></dl></details>
<div class="tx-note"><b>Berlaku untuk:</b>&nbsp;Seluruh penginputan BTB Supplier produk AQUA Gallon &amp; AQUA SPS, serta BTB/BKB Supplier yang mengalami pembatalan Surat Jalan, di DMS 3.</div>

<h2>Format Baru: No. Ref. 3 &amp; Keterangan pada BTB Supplier</h2>
<p>Ada dua ketentuan berbeda tergantung jenis produknya &mdash; perhatikan baik-baik sebelum mengisi, karena format <strong>AQUA Gallon</strong> dan <strong>AQUA SPS</strong> tidak sama.</p>

<div class="tx-steps">

  <div class="tx-step">
    <div class="tx-step-media"><span class="tx-step-num">AQUA Gallon</span><img src="assets/images/transaksi-btb-bkb-supplier/btb-supplier-gallon-noref3-keterangan.webp" alt="Contoh input No. Ref. 3 dan Keterangan pada BTB Supplier AQUA Gallon" loading="lazy"></div>
    <div class="tx-step-body">
      <span class="tx-step-tag">BTB Supplier &middot; AQUA Gallon</span>
      <h3 class="tx-step-title">No. Ref. 3 Diisi Berurutan, Keterangan Diisi No. GRFC</h3>
      <p class="tx-step-desc">Kolom <strong>No. Ref. 3</strong> diisi berurutan sesuai formula <strong>HPPP / Qty Retur Air / Qty Total Botol / Qty Jugrack</strong>, dan pemisah antar-angka <strong>wajib menggunakan tanda "/"</strong> &mdash; contoh pada gambar: <code>90A0260923-005/24/960/20</code>.</p><table class="tx-mini"><tr><th>Bagian</th><th>Isi pada contoh</th><th>Artinya</th></tr><tr><td>1. HPPP</td><td>90A0260923-005</td><td>Nomor dokumen pabrik (awalan 90A)</td></tr><tr><td>2. Qty Retur Air</td><td>24</td><td>Galon isi air yang dikembalikan</td></tr><tr><td>3. Qty Total Botol</td><td>960</td><td>Jumlah botol galon (lihat baris Jug Aqua di Detil)</td></tr><tr><td>4. Qty Jugrack</td><td>20</td><td>Jumlah jugrack (lihat baris Jugrack di Detil)</td></tr></table><p class="tx-step-desc"> Kolom <strong>Keterangan</strong> diisi dengan <strong>No. GRFC</strong>; jika dokumen GRFC belum tersedia, tulis <strong>"TIDAK ADA GRFC"</strong> &mdash; jangan dibiarkan kosong.</p>
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
        { title: "Transaksi Flashout", desc: "Program penjualan lewat NG (Pool Cicurug) ke toko-toko Depo Parung: urutan dokumen BKB/BTB di DMS 3 dan DMS 5, termasuk balikan fisik dari toko, lengkap dengan gambar bertanda.", body: TX_DMS3_CONTENT },
        { title: "Transaksi Produk SGM", desc: "Prosedur penerimaan produk SGM dari supplier (dua kasus: truk membawa SGM saja, atau satu truk membawa produk air dan SGM) dan cara mengubah stok dari BOX ke PCS/Renceng (morphing) memakai BKB/BTB Depot, lengkap dengan contoh transaksi Depo Parung.", body: TX_SGM_CONTENT },
        { title: "Transaksi BTB BKB Supplier", desc: "Prosedur pencatatan Bukti Terima Barang (BTB) dan Bukti Keluar Barang (BKB) untuk transaksi dengan supplier/pemasok eksternal.", body: TX_BTB_BKB_SUPPLIER_CONTENT },
        { title: "Input Opening & Closing Gudang", desc: "Cara menginput stok fisik Opening dan Closing di website resmi perusahaan, lengkap dengan aturan sistem dan cara berlatih agar tidak salah produk.", body: TX_OC_CONTENT },
        { title: "Laporan Manual Excel", desc: "Cara menyamakan saldo stok di Excel dengan hasil hitung fisik tim checker di akhir shift 2, untuk produk air (AQ, VIT, Mizone, SGM) dan galon, lengkap dengan gambar bertanda.", body: TX_LAPORAN_EXCEL_CONTENT }
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
        { id: Utils.uid("toc"), title: "Transaksi BTB BKB Supplier", order: 4, active: true, materialId: findId("Transaksi BTB BKB Supplier") },
        { id: Utils.uid("toc"), title: "Input Opening & Closing Gudang", order: 5, active: true, materialId: findId("Input Opening & Closing Gudang") },
        { id: Utils.uid("toc"), title: "Laporan Manual Excel", order: 6, active: true, materialId: findId("Laporan Manual Excel") }
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
    document.querySelectorAll(".nav-link[data-route], .drawer-link[data-route], .drawer-quick-btn[data-route]").forEach(function (a) {
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
            '<a href="https://benyoriki.com/" target="_blank" rel="noopener noreferrer" class="hero-eyebrow">Sistem Developer benyoriki.com</a>' +
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
            '<img class="hero-photo" src="assets/images/hero/depo-parung-warkop.webp" alt="Warkop PRG — area Depo Parung" loading="lazy">' +
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
        '<div class="mobile-collapsible-panel-inner">' +
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

  function materialStats(m) {
    var c = m.content || "";
    var imgs = (c.match(/<img /g) || []).length;
    var tabs = (c.match(/data-case-target=/g) || []).length;
    return { imgs: imgs, tabs: tabs };
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
          (function () { var st = materialStats(m); var h = ""; if (st.tabs) h += '<span class="materi-chip">' + st.tabs + ' sub-menu</span>'; if (st.imgs) h += '<span class="materi-chip">' + st.imgs + ' gambar</span>'; return h ? '<div class="materi-chips">' + h + '</div>' : ""; })() +
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
          '<div class="materi-count"><b>' + materials.length + '</b><span>materi tersedia</span></div>' +
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
      '<div class="read-prog" id="readProg"></div>' +
      '<div class="toc-mobile-bar" id="tocMobileBar">&#9776; Daftar Isi</div>' +
      '<div class="reader-shell">' +
        '<aside class="reader-toc"><p class="reader-toc-title">Daftar Isi</p>' + tocHtml + '</aside>' +
        '<article class="reader-content">' +
          '<nav class="reader-crumb" aria-label="Breadcrumb"><a href="#/">Beranda</a><i>&rsaquo;</i><a href="#/materi">Materi</a><i>&rsaquo;</i><span>' + Utils.escapeHtml(material.title) + '</span></nav>' +
          '<header class="reader-hero">' +
            '<span class="reader-hero-num">' + String(Math.max(1, materials.filter(function (m) { return m.status === "published"; }).sort(function (a, b) { return a.order - b.order; }).map(function (m) { return m.id; }).indexOf(material.id) + 1)).padStart(2, "0") + '</span>' +
            '<div class="reader-hero-text">' +
              '<h1 class="reader-title">' + Utils.escapeHtml(material.title) + '</h1>' +
              '<p class="reader-desc">' + Utils.escapeHtml(material.description) + '</p>' +
              (function () { var st = materialStats(material); var h = '<span class="materi-chip on-dark">Panduan langkah demi langkah</span>'; if (st.tabs) h += '<span class="materi-chip on-dark">' + st.tabs + ' sub-menu</span>'; if (st.imgs) h += '<span class="materi-chip on-dark">' + st.imgs + ' gambar (klik untuk perbesar)</span>'; return '<div class="materi-chips">' + h + '</div>'; })() +
            '</div>' +
          '</header>' +
          (material.image ? '<img class="reader-image" src="' + material.image + '" alt="' + Utils.escapeHtml(material.title) + '">' : "") +
          '<div class="reader-body">' + Utils.sanitizeHtml(material.content) + '</div>' +
          (function () {
            var pub = contents.filter(function (c) { return c.materialId; });
            var i = -1; pub.forEach(function (c, k) { if (c.materialId === material.id) i = k; });
            function link(c, cls, lab) {
              var m = c && materials.filter(function (x) { return x.id === c.materialId; })[0];
              return m ? '<a class="reader-pn ' + cls + '" href="#/materi/' + m.slug + '"><small>' + lab + '</small><b>' + Utils.escapeHtml(c.title) + '</b></a>' : '<span></span>';
            }
            return '<div class="reader-pager">' + link(pub[i - 1], "prev", "&lsaquo; Materi sebelumnya") + link(pub[i + 1], "next", "Materi berikutnya &rsaquo;") + '</div>';
          })() +
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

    if (!window.__readProgBound) {
      window.__readProgBound = true;
      window.addEventListener("scroll", function () {
        var p = document.getElementById("readProg"); if (!p) return;
        var h = document.documentElement.scrollHeight - window.innerHeight;
        p.style.width = (h > 0 ? Math.min(100, Math.max(0, window.scrollY / h * 100)) : 0) + "%";
      }, { passive: true });
    }
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
    root.querySelectorAll("[data-case-jump]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var n = btn.getAttribute("data-case-jump");
        var tab = root.querySelector('.tx-tab[data-case-target="' + n + '"]');
        if (tab) tab.click();
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
      // navPanel is itself the ".nav-dropdown-panel-inner" (see index.html),
      // so it can be filled directly — no extra wrapper needed here.
      navPanel.innerHTML = (materials.length
        ? materials.map(function (m) { return '<a class="nav-dropdown-item" href="#/materi/' + m.slug + '">' + Utils.escapeHtml(m.title) + '</a>'; }).join("")
        : '<span class="nav-dropdown-empty">Belum ada materi</span>') + seeAllNav;
    }
    if (drawerPanel) {
      // drawerPanel is the ".drawer-acc-panel" itself (its id is what
      // aria-controls/open-state toggling targets), so — unlike navPanel —
      // it needs its own ".drawer-acc-panel-inner" wrapper injected here to
      // match the static markup used for the other accordion panels.
      drawerPanel.innerHTML = '<div class="drawer-acc-panel-inner">' + (materials.length
        ? materials.map(function (m) { return '<a class="drawer-acc-item" href="#/materi/' + m.slug + '">' + Utils.escapeHtml(m.title) + '</a>'; }).join("")
        : '<span class="drawer-acc-empty">Belum ada materi</span>') + seeAllDrawer + '</div>';
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
    var themeToggleMobile = document.getElementById("themeToggleMobile");
    if (themeToggleMobile) {
      themeToggleMobile.addEventListener("click", function () { ThemeService.toggle(); closeDrawerNav(); });
    }

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
    Router.add("/opening-closing", function () { if (window.OpeningClosing) window.OpeningClosing.render(appEl); else renderNotFound(); });
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
    var MIN_DISPLAY_MS = 1200;
    startLoadingStatusTyper();
    setTimeout(function () {
      screen.classList.add("loading-hide");
      document.documentElement.classList.remove("is-loading");
      screen.addEventListener("transitionend", function remove() {
        screen.removeEventListener("transitionend", remove);
        if (screen.parentNode) screen.parentNode.removeChild(screen);
      });
    }, MIN_DISPLAY_MS);
  }

  // Terminal-style status line: types out a short sequence of system-boot
  // style messages one character at a time (no external deps, ~a few lines
  // of code) so the splash reads as a live technical process rather than a
  // static caption. Stops on its own once the splash screen is removed.
  function startLoadingStatusTyper() {
    var el = document.getElementById("loadingStatus");
    if (!el) return;
    var messages = [
      "menginisialisasi sistem...",
      "menghubungkan ke server DMS...",
      "memuat modul database...",
      "sinkronisasi data real-time...",
      "menyiapkan antarmuka..."
    ];
    var mi = 0, ci = 0, typing = true, timer = null;

    function tick() {
      if (!document.body.contains(el)) return;
      var msg = messages[mi];
      if (typing) {
        ci++;
        el.textContent = msg.slice(0, ci);
        if (ci >= msg.length) {
          typing = false;
          timer = setTimeout(tick, 650);
        } else {
          timer = setTimeout(tick, 26);
        }
      } else {
        mi = (mi + 1) % messages.length;
        ci = 0;
        typing = true;
        timer = setTimeout(tick, 150);
      }
    }
    tick();
  }
})();
