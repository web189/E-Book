/* DMS Manual — Bukti Keluar Barang (Distribusi) untuk printer dot-matrix Epson LX-310.
   ES5 murni (aman Chrome 109 / Windows 7). Cetak lewat teks monospasi 80 kolom @10 cpi, 6 lpi. */
(function () {
  "use strict";
  var KEY = "lp_dms_manual", W = 80, LEGEND = "Keterangan : Putih Sales, Merah Ada Gudang, Kuning Checker, Hijau Security";
  var GUDANG = ["GUDANG LAYAK PARUNG", "GUDANG BS PARUNG", "GUDANG REJECT PARUNG", "GUDANG LAYAK PET PARUNG"];
  var FORMS = { "3": { name: "1/3 lembar (9,5 × 3,67 in)", h: 11 / 3, lines: 22 }, "2": { name: "1/2 lembar (9,5 × 5,5 in)", h: 5.5, lines: 33 }, "1": { name: "Penuh (9,5 × 11 in)", h: 11, lines: 66 } };
  var UNITS = ["BOX", "PACK", "PCS", "PLT", "BTL", "JUG"];
  var st, root, tick;

  function load() {
    var d = {}; try { d = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) {}
    st = { gudang: d.gudang || GUDANG[0], kendaraan: d.kendaraan || "", ket: d.ket || "",
      rows: (d.rows && d.rows.length) ? d.rows : [{ k: "", n: "", s: "BOX", q: "" }],
      form: d.form || "3", left: d.left == null ? 8 : d.left, top: d.top == null ? 0 : d.top };
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;"); }
  function rep(n) { return n > 0 ? new Array(n + 1).join(" ") : ""; }
  function pad(s, n) { s = String(s); return s.length >= n ? s.substr(0, n) : s + rep(n - s.length); }
  function lpad(s, n) { s = String(s); return s.length >= n ? s.substr(0, n) : rep(n - s.length) + s; }
  function two(n) { return (n < 10 ? "0" : "") + n; }
  function now() { var d = new Date(); return { t: two(d.getDate()) + "-" + two(d.getMonth() + 1) + "-" + d.getFullYear(), j: two(d.getHours()) + ":" + two(d.getMinutes()) }; }
  function perPage() { return FORMS[st.form].lines - 12; }
  function items() { return st.rows.filter(function (r) { return (r.k || r.n) && String(r.q).trim() !== ""; }); }
  function dash() { return new Array(W + 1).join("-"); }

  /* ---------- susun teks form ---------- */
  function pages() {
    var it = items(), n = perPage(), total = Math.max(1, Math.ceil(it.length / n)), nw = now(), out = [];
    for (var p = 0; p < total; p++) {
      var L = [], part = it.slice(p * n, p * n + n);
      var title = "BUKTI KELUAR BARANG (MANUAL)";
      L.push(rep(Math.floor((W - title.length) / 2)) + title);
      L.push(pad("NAMA DEPO   : LP PARUNG", 44) + "HALAMAN : " + (p + 1) + "/" + total);
      L.push(pad("NAMA GUDANG : " + st.gudang, 44) + "TANGGAL : " + nw.t);
      L.push(pad("KENDARAAN   : " + st.kendaraan.toUpperCase(), 44) + "JAM     : " + nw.j);
      L.push(pad("KETERANGAN  : " + st.ket.toUpperCase(), W));
      L.push(dash());
      L.push(pad("NO", 3) + pad("KODE", 9) + pad("NAMA PRODUK", 38) + pad("SATUAN", 8) + lpad("JUMLAH", 7) + "  BATCH ID");
      L.push(dash());
      for (var i = 0; i < n; i++) {
        var r = part[i];
        L.push(r ? pad(p * n + i + 1, 3) + pad(r.k.toUpperCase(), 9) + pad(r.n.toUpperCase(), 38) + pad(r.s.toUpperCase(), 8) + lpad(r.q, 7) : "");
      }
      L.push(dash());
      L.push(LEGEND);
      out.push(L.join("\n"));
    }
    return out;
  }

  /* ---------- tampilan ---------- */
  function rowHtml(r, i) {
    return '<div class="dm-row" data-i="' + i + '">' +
      '<input class="dm-k" list="dmCodes" inputmode="numeric" placeholder="Kode" value="' + esc(r.k) + '" aria-label="Kode produk">' +
      '<input class="dm-n" placeholder="Nama produk" value="' + esc(r.n) + '" aria-label="Nama produk">' +
      '<select class="dm-s" aria-label="Satuan">' + UNITS.map(function (u) { return "<option" + (u === r.s ? " selected" : "") + ">" + u + "</option>"; }).join("") + '</select>' +
      '<input class="dm-q" type="number" min="0" inputmode="numeric" placeholder="Jumlah" value="' + esc(r.q) + '" aria-label="Jumlah">' +
      '<button type="button" class="dm-del" data-del aria-label="Hapus baris">×</button></div>';
  }
  function render(el) {
    load(); root = el; clearInterval(tick);
    var P = (window.OpeningClosing && window.OpeningClosing.api && window.OpeningClosing.api.products) || [];
    el.innerHTML = '<section class="dm-page"><div class="dm-head"><h1>DMS Manual</h1><p>Isi data barang keluar saat sistem DMS tidak bisa dipakai, lalu cetak ke printer Epson LX-310. Tanggal dan jam terisi otomatis saat dicetak.</p></div>' +
      '<div class="dm-grid"><div class="dm-card"><h2>Isi form</h2>' +
      '<label>Nama gudang<select id="dmG">' + GUDANG.map(function (g) { return "<option" + (g === st.gudang ? " selected" : "") + ">" + g + "</option>"; }).join("") + '</select></label>' +
      '<label>Kendaraan<input id="dmV" placeholder="mis. D 9193 AE" value="' + esc(st.kendaraan) + '" autocomplete="off"></label>' +
      '<label>Keterangan<input id="dmK" placeholder="mis. RIT 1 / REVINA" value="' + esc(st.ket) + '" autocomplete="off"></label>' +
      '<h3>Barang</h3><div id="dmRows">' + st.rows.map(rowHtml).join("") + '</div>' +
      '<datalist id="dmCodes">' + P.map(function (p) { return '<option value="' + p[0] + '">' + esc(p[1]) + "</option>"; }).join("") + '</datalist>' +
      '<div class="dm-actions"><button type="button" class="dm-btn" id="dmAdd">+ Tambah barang</button><button type="button" class="dm-btn dm-ghost" id="dmClear">Kosongkan</button></div>' +
      '<details class="dm-set"><summary>Pengaturan Epson LX-310</summary>' +
      '<label>Ukuran form<select id="dmF">' + Object.keys(FORMS).map(function (k) { return '<option value="' + k + '"' + (k === st.form ? " selected" : "") + ">" + FORMS[k].name + "</option>"; }).join("") + '</select></label>' +
      '<div class="dm-two"><label>Geser kanan (mm)<input id="dmL" type="number" step="0.5" value="' + st.left + '"></label><label>Geser bawah (mm)<input id="dmT" type="number" step="0.5" value="' + st.top + '"></label></div>' +
      '<p class="dm-hint">Di Windows: Printer Preferences → Paper Size sama dengan ukuran form di atas. Untuk cetak langsung tanpa dialog, buka lewat pintasan dari <b>pasang-epson-win7.bat</b>.</p></details>' +
      '<button type="button" class="dm-btn dm-primary" id="dmPrint">Cetak ke Epson</button></div>' +
      '<div class="dm-card"><h2>Pratinjau <small id="dmInfo"></small></h2><div id="dmPrev" class="dm-prev"></div></div></div></section>';
    function $(s) { return el.querySelector(s); }
    function fillCode(row) {
      var k = row.querySelector(".dm-k").value.trim(), p = null;
      for (var i = 0; i < P.length; i++) if (P[i][0].toUpperCase() === k.toUpperCase()) { p = P[i]; break; }
      if (p) { row.querySelector(".dm-n").value = p[1]; var s = row.querySelector(".dm-s"); if (UNITS.indexOf(p[2]) >= 0) s.value = p[2]; }
    }
    function read() {
      st.gudang = $("#dmG").value; st.kendaraan = $("#dmV").value; st.ket = $("#dmK").value; st.form = $("#dmF").value;
      st.left = parseFloat($("#dmL").value) || 0; st.top = parseFloat($("#dmT").value) || 0;
      st.rows = [].map.call(el.querySelectorAll(".dm-row"), function (r) {
        return { k: r.querySelector(".dm-k").value.trim(), n: r.querySelector(".dm-n").value, s: r.querySelector(".dm-s").value, q: r.querySelector(".dm-q").value };
      });
      save(); preview();
    }
    function rebuild() { $("#dmRows").innerHTML = st.rows.map(rowHtml).join(""); save(); preview(); }
    el.addEventListener("input", function (e) { if (e.target.classList.contains("dm-k")) fillCode(e.target.parentNode); read(); });
    el.addEventListener("change", read);
    el.addEventListener("click", function (e) {
      var t = e.target;
      if (t.id === "dmAdd") { read(); st.rows.push({ k: "", n: "", s: "BOX", q: "" }); rebuild(); var k = el.querySelectorAll(".dm-k"); k[k.length - 1].focus(); }
      else if (t.id === "dmClear") { if (window.confirm("Kosongkan semua isian barang?")) { st.rows = [{ k: "", n: "", s: "BOX", q: "" }]; st.kendaraan = ""; st.ket = ""; render(el); save(); } }
      else if (t.hasAttribute("data-del")) { read(); st.rows.splice(+t.parentNode.getAttribute("data-i"), 1); if (!st.rows.length) st.rows.push({ k: "", n: "", s: "BOX", q: "" }); rebuild(); }
      else if (t.id === "dmPrint") { read(); doPrint(); }
    });
    preview(); tick = setInterval(function () { if (!document.getElementById("dmPrev")) { clearInterval(tick); return; } preview(); }, 30000);
  }
  function preview() {
    var pv = document.getElementById("dmPrev"); if (!pv) return;
    var pg = pages(), none = !items().length;
    pv.innerHTML = pg.map(function (t, i) { return '<pre class="dm-paper' + (none ? " is-empty" : "") + '">' + esc(t) + "</pre>"; }).join("");
    document.getElementById("dmInfo").textContent = pg.length + " lembar · " + items().length + " barang";
  }

  /* ---------- cetak ---------- */
  function doPrint() {
    if (!items().length) { alert("Isi minimal satu barang dengan jumlah sebelum mencetak."); return; }
    var f = FORMS[st.form], pg = pages(), box = document.getElementById("dmPrint"), css = document.getElementById("dmPageCss");
    if (!box) { box = document.createElement("div"); box.id = "dmPrint"; document.body.appendChild(box); }
    if (!css) { css = document.createElement("style"); css.id = "dmPageCss"; document.head.appendChild(css); }
    css.textContent = "@page{size:9.5in " + f.h.toFixed(3) + "in;margin:0}@media print{.dm-sheet{height:" + f.h.toFixed(3) + "in;padding:" + st.top + "mm 0 0 " + st.left + "mm}}";
    box.innerHTML = pg.map(function (t) { return '<div class="dm-sheet"><pre>' + esc(t) + "</pre></div>"; }).join("");
    document.body.classList.add("dms-printing");
    var done = function () { document.body.classList.remove("dms-printing"); window.removeEventListener("afterprint", done); };
    window.addEventListener("afterprint", done);
    setTimeout(function () { window.print(); setTimeout(done, 1500); }, 50);
  }

  /* tutup menu mobile saat DMS Manual dipilih */
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href="#/dms-manual"]'); if (!a) return;
    var d = document.getElementById("mobileDrawer"); if (d) d.classList.remove("open");
    var h = document.getElementById("hamburgerBtn"); if (h) h.setAttribute("aria-expanded", "false");
    [].forEach.call(document.querySelectorAll(".nav-dropdown.open"), function (o) { o.classList.remove("open"); });
  });
  window.DMSManual = { render: render };
})();
