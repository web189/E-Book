/* DMS Manual — Bukti Keluar Barang (Distribusi) untuk printer dot-matrix Epson LX-310.
   ES5 murni (aman Chrome 109 / Windows 7). Cetak lewat teks monospasi 80 kolom @10 cpi, 6 lpi. */
(function () {
  "use strict";
  var KEY = "lp_dms_manual", W = 120, AGENT = "http://localhost:9101", LEGEND = "Keterangan : Putih Sales, Merah Adm Gudang, Kuning Checker, Hijau Security";
  var GUDANG = ["GUDANG LAYAK PARUNG", "GUDANG BS PARUNG", "GUDANG REJECT PARUNG", "GUDANG LAYAK PET PARUNG"];
  var FORMS = { "3": { name: "1/3 lembar (9,5 × 3,75 in ≈ 95 mm, hasil ukur)", h: 3.75 }, "2": { name: "1/2 lembar (9,5 × 5,5 in)", h: 5.5 }, "1": { name: "Penuh (9,5 × 11 in)", h: 11 } };
  var UNITS = ["BOX", "PACK", "PCS"];
  var st, root, tick, PK = null, PC = false, TEST = false, SAMPLE = [{ k: "124172", n: "AQ.600ML MP 1X6", s: "PACK", q: "2" }, { k: "134578", n: "AQ.220ML 1X48", s: "BOX", q: "10" }, { k: "142009", n: "AQ.1100ML LOCAL 1X12", s: "BOX", q: "25" }];

  function load() {
    var d = {}; try { d = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) {}
    st = { gudang: d.gudang || GUDANG[0], kendaraan: d.kendaraan || "", ket: d.ket || "",
      rows: (d.rows && d.rows.length) ? d.rows : [{ k: "", n: "", s: "BOX", q: "" }],
      form: d.form || "3", printer: d.printer || (/Android|iPhone/i.test(navigator.userAgent) ? "termal" : "epson"), twv: 2, tw: d.twv === 2 ? (d.tw || "58") : "58", tmethod: d.tmethod || "ble", dens: d.dens || "3", logo: d.logo == null ? true : d.logo, left: d.left == null ? 11 : d.left, pname: d.pname == null ? "EPSON LX-310 ESC/P" : d.pname, solid: d.solid == null ? true : d.solid, pengemudi: d.pengemudi || "", slot: d.slot || "1", tebal: d.tebal == null ? true : d.tebal, top: d.top == null ? 0 : d.top, nodok: d.nodok || "", dokreq: d.dokreq || "", tipe: d.tipe || "JUAL", status: d.status || "Draft", fh: d.fh || "" };
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;"); }
  function rep(n) { return n > 0 ? new Array(n + 1).join(" ") : ""; }
  function pad(s, n) { s = String(s); return s.length >= n ? s.substr(0, n) : s + rep(n - s.length); }
  function lpad(s, n) { s = String(s); return s.length >= n ? s.substr(0, n) : rep(n - s.length) + s; }
  function two(n) { return (n < 10 ? "0" : "") + n; }
  function now() { var d = new Date(); return { t: two(d.getDate()) + "-" + two(d.getMonth() + 1) + "-" + d.getFullYear(), j: two(d.getHours()) + ":" + two(d.getMinutes()) }; }
  function wrap(t, n) { var o = [], w = String(t).split(" "), l = ""; w.forEach(function (x) { if ((l + " " + x).trim().length > n) { if (l) o.push(l); l = x; } else l = (l + " " + x).trim(); }); if (l) o.push(l); return o.length ? o : [""]; }
  function ctr(t, n) { return rep(Math.max(0, Math.floor((n - t.length) / 2))) + t; }
  function thermal() {
    var C = st.tw === "58" ? 32 : 42, nw = now(), it = items(), L = [], tot = 0, rule = new Array(C + 1).join("-");
    if (TEST) L.push(("1234567890").repeat ? new Array(Math.ceil(C / 10) + 1).join("1234567890").substr(0, C) : ""); L.push(ctr("BUKTI KELUAR BARANG", C)); L.push(ctr(TEST ? "(TES CETAK)" : "(MANUAL)", C)); L.push(ctr("LP PARUNG", C)); L.push(rule);
    wrap("Gudang: " + st.gudang, C).forEach(function (x) { L.push(x); });
    L.push("Tanggal: " + nw.t + " " + nw.j);
    if (st.kendaraan) L.push("Kendaraan: " + st.kendaraan.toUpperCase());
    if (st.ket) wrap("Ket: " + st.ket.toUpperCase(), C).forEach(function (x) { L.push(x); });
    L.push(rule);
    it.forEach(function (r, i) {
      wrap((i + 1) + ". " + r.k.toUpperCase() + " " + r.n.toUpperCase(), C).forEach(function (x, j) { L.push(j ? "   " + x : x); });
      L.push(lpad(r.q + " " + r.s.toUpperCase(), C)); tot += parseFloat(r.q) || 0;
    });
    L.push(rule); L.push("Item: " + it.length + "   Total qty: " + tot); L.push(""); L.push(""); L.push(".");
    return [L.join("\n")];
  }
  function fhIn() { var m = parseFloat(st.fh); return m > 20 ? m / 25.4 : FORMS[st.form].h; }
  /* jumlah baris (6 lpi) yang muat di satu form; sisa tinggi dipakai sebagai jarak aman bawah */
  function nLines() { return Math.max(14, Math.floor(fhIn() * 6 + 1e-6)); }
    function items() { if (TEST) return SAMPLE; return st.rows.filter(function (r) { return (r.k || r.n) && String(r.q).trim() !== ""; }); }
  function dash() { return new Array(W + 1).join(st.solid ? "\u2500" : "-"); }

  /* ---------- susun teks form ---------- */
  function pages(kind) { return (kind || st.printer) === "termal" ? thermal() : epsonPages(); }
  /* Pola mengikuti cetakan asli DMS (22 baris/form):
     B1 kosong, B2 judul, B3-B7 kepala, B8 garis, B9 judul kolom, B10 garis, lalu daftar barang.
     Halaman BIASA  : garis + keterangan warna di 2 baris terakhir (10 barang/halaman).
     Halaman TERAKHIR: garis, keterangan warna, DIINPUT/DISERAHKAN/DITERIMA/DIPERIKSA, 2 baris kosong
                       untuk tanda tangan, lalu ( WAREHOUSE ADMIN ) ( CHECKER ) ( DRIVER ) ( SECURITY ) (6 barang/halaman).
     Bila barang terakhir > 6, tanda tangan dicetak di halaman tambahan tanpa barang (seperti DMS). */
  function epsonPages() {
    var it = items(), nL = nLines(), capMid = Math.max(1, nL - 12), capLast = Math.max(1, nL - 16), nw = now(), tgl = nw.t.replace(/-/g, "/"), out = [], chunks = [], i = 0, HW = 66;
    while (it.length - i > capLast) { var take = Math.min(capMid, it.length - i); chunks.push({ r: it.slice(i, i + take), last: false, o: i }); i += take; }
    chunks.push({ r: it.slice(i), last: true, o: i });
    function LB(a, b) { return pad(a, 13) + ": " + b; }   /* titik dua kolom 13, isi kolom 15 */
    function RB(a, b) { return pad(a, 14) + ": " + b; }   /* label kanan mulai kolom 66, titik dua kolom 80 */
    chunks.forEach(function (c, p) {
      var L = [], cap = c.last ? capLast : capMid, title = TEST ? "BUKTI KELUAR BARANG (TES CETAK)" : "BUKTI KELUAR BARANG (DISTRIBUSI)";
      L.push("");
      L.push(rep(45) + title);
      L.push(pad(LB("NAMA DEPO", "LP PARUNG"), HW) + RB("HALAMAN", p + 1));
      L.push(pad(LB("NAMA GUDANG", st.gudang), HW) + RB("DOKUMEN ID", String(st.nodok || "").toUpperCase()));
      L.push(pad(LB("PENGEMUDI", st.pengemudi.toUpperCase()), HW) + RB("TANGGAL", tgl));
      L.push(pad(LB("KENDARAAN", st.kendaraan.toUpperCase()), HW) + RB("NO. FB", String(st.dokreq || "").toUpperCase()));
      L.push(pad(LB("KETERANGAN", String(st.ket).replace(/\s*[\r\n]+\s*/g, " ").toUpperCase()), W));
      L.push(dash());
      L.push(pad("NO", 4) + pad("KODE", 12) + pad("NAMA PRODUK", 46) + pad("SATUAN", 14) + lpad("JUMLAH", 6) + rep(5) + "BATCH ID");
      L.push(dash());
      for (var k = 0; k < cap; k++) {
        var r = c.r[k];
        L.push(r ? pad(c.o + k + 1, 4) + pad(r.k.toUpperCase(), 12) + pad(r.n.toUpperCase(), 46) + pad(r.s.toUpperCase(), 14) + lpad(r.q, 6) + rep(5) + String(r.l || "").toUpperCase().substr(0, 28)
          : (TEST && k === c.r.length ? new Array(Math.ceil(W / 10) + 1).join("1234567890").substr(0, W) : ""));
      }
      L.push(dash());
      L.push(LEGEND);
      if (c.last) {
        L.push(pad(rep(9) + "DIINPUT OLEH,", 38) + pad("DISERAHKAN OLEH,", 31) + pad("DITERIMA OLEH,", 28) + "DIPERIKSA OLEH,");
        L.push(""); L.push("");
        L.push(pad(rep(5) + "( WAREHOUSE ADMIN )", 36) + pad("(    CHECKER    )", 29) + pad("(      DRIVER     )", 30) + "(      SECURITY    )");
      }
      out.push(L.join("\n"));
    });
    if (TEST && out.length === 1) out.push(out[0]);
    return out;
  }

  /* ---------- tampilan ---------- */
  function rowHtml(r, i) {
    return '<div class="dm-row" data-i="' + i + '">' +
      '<input class="dm-k" autocomplete="off" inputmode="text" placeholder="Kode" value="' + esc(r.k) + '" aria-label="Kode produk">' +
      '<input class="dm-n" placeholder="Nama produk" value="' + esc(r.n) + '" aria-label="Nama produk">' +
      '<select class="dm-s" aria-label="Satuan">' + UNITS.map(function (u) { return "<option" + (u === r.s ? " selected" : "") + ">" + u + "</option>"; }).join("") + '</select>' +
      '<input class="dm-q" type="number" min="0" inputmode="numeric" placeholder="Jumlah" value="' + esc(r.q) + '" aria-label="Jumlah">' +
      '<button type="button" class="dm-del" data-del aria-label="Hapus baris">×</button></div>';
  }
  function renderMobile(el) {
    PK = null; PC = false; load(); root = el; clearInterval(tick);
    var P = (window.OpeningClosing && window.OpeningClosing.api && window.OpeningClosing.api.products) || [];
    P.forEach(function (p) { if (UNITS.indexOf(p[2]) < 0) UNITS.push(p[2]); });
    st.rows.forEach(function (r) { if (r.s && UNITS.indexOf(r.s) < 0) UNITS.push(r.s); });
    el.innerHTML = '<section class="dm-page"><div class="dm-head"><h1>DMS Manual</h1><p>Isi data barang keluar saat sistem DMS tidak bisa dipakai, lalu cetak ke Epson LX-310 atau printer termal. Tanggal dan jam terisi otomatis saat dicetak.</p></div>' +
      '<div class="dm-pick" role="group" aria-label="Pilih printer"><button type="button" data-pr="epson" class="' + (st.printer === "epson" ? "on" : "") + '"><b>Epson LX-310</b><span>Form kertas 3–4 ply</span></button><button type="button" data-pr="termal" class="' + (st.printer === "termal" ? "on" : "") + '"><b>Printer termal</b><span>Struk 80 / 58 mm</span></button></div>' +
      '<div class="dm-grid"><div class="dm-card"><h2>Isi form</h2>' +
      '<label>Nama gudang<select id="dmG">' + GUDANG.map(function (g) { return "<option" + (g === st.gudang ? " selected" : "") + ">" + g + "</option>"; }).join("") + '</select></label>' +
      '<label>Kendaraan<input id="dmV" placeholder="mis. D 9193 AE" value="' + esc(st.kendaraan) + '" autocomplete="off"></label>' +
      '<label>Pengemudi (opsional)<input id="dmD" placeholder="mis. 281-R061 - ARDI" value="' + esc(st.pengemudi) + '" autocomplete="off"></label>' +
      '<label>Keterangan<input id="dmK" placeholder="mis. RIT 1 / REVINA" value="' + esc(st.ket) + '" autocomplete="off"></label>' +
      '<h3>Barang</h3><div id="dmRows">' + st.rows.map(rowHtml).join("") + '</div>' +
      '<div id="dmAc" class="dm-ac" hidden></div>' +
      '<div class="dm-actions"><button type="button" class="dm-btn" id="dmAdd">+ Tambah barang</button><button type="button" class="dm-btn dm-ghost" id="dmClear">Kosongkan</button></div>' +
      '<details class="dm-set"' + (st.set ? " open" : "") + '><summary>Pengaturan ' + (st.printer === "epson" ? "Epson LX-310" : "printer termal") + '</summary>' +
      (st.printer === "epson" ?
      '<label>Ukuran form<select id="dmF">' + Object.keys(FORMS).map(function (k) { return '<option value="' + k + '"' + (k === st.form ? " selected" : "") + ">" + FORMS[k].name + "</option>"; }).join("") + '</select></label>' +
      '<div class="dm-two"><label>Posisi form di lembar<select id="dmS">' + ["1", "2", "3"].map(function (k) { return '<option value="' + k + '"' + (k === st.slot ? " selected" : "") + ">Form ke-" + k + "</option>"; }).join("") + '</select></label><label>Garis tabel<select id="dmR"><option value="1"' + (st.solid ? " selected" : "") + '>Solid (PC437)</option><option value="0"' + (st.solid ? "" : " selected") + '>Putus-putus (-)</option></select></label><label>Nama printer Windows<input id="dmN" value="' + esc(st.pname) + '" placeholder="kosong = printer default"></label><label>Tebal huruf<select id="dmB"><option value="1"' + (st.tebal ? " selected" : "") + '>Tebal (double-strike)</option><option value="0"' + (st.tebal ? "" : " selected") + '>Normal</option></select></label></div>' +
      '<div class="dm-two"><label>Geser kanan (mm)<input id="dmL" type="number" step="0.5" value="' + st.left + '"></label><label>Geser bawah (mm)<input id="dmT" type="number" step="0.5" value="' + st.top + '"></label></div>' +
      '<p class="dm-hint">Kertas di driver Windows: <b>9,5 × 11 in</b> (Portrait). Form 1/3 dicetak di bagian atas lembar; pilih "Form ke-2/3" bila form ke-1 sudah terpakai.</p>' :
      '<label>Lebar kertas<select id="dmW"><option value="58"' + (st.tw === "58" ? " selected" : "") + '>58 mm (IWARE MP-58SB)</option><option value="80"' + (st.tw === "80" ? " selected" : "") + '>80 mm (bukan untuk MP-58SB)</option></select></label>' +
      '<div class="dm-two"><label>Cara kirim<select id="dmM">' + [["ble", "Bluetooth langsung"], ["rawbt", "Aplikasi RawBT"], ["dialog", "Dialog cetak browser"]].map(function (m) { return '<option value="' + m[0] + '"' + (m[0] === st.tmethod ? " selected" : "") + ">" + m[1] + "</option>"; }).join("") + '</select></label><label>Kegelapan cetak<select id="dmDn">' + [["1", "Terang"], ["2", "Normal"], ["3", "Gelap"], ["4", "Sangat gelap"]].map(function (m) { return '<option value="' + m[0] + '"' + (m[0] === st.dens ? " selected" : "") + ">" + m[1] + "</option>"; }).join("") + '</select></label></div>' +
      '<label>Logo di struk<select id="dmLg"><option value="1"' + (st.logo ? " selected" : "") + '>Tampilkan logo</option><option value="0"' + (st.logo ? "" : " selected") + '>Tanpa logo</option></select></label>' +
      '<p class="dm-hint">Pasangkan printer dulu di Pengaturan Bluetooth HP (PIN 0000 atau 1234). Bila "Bluetooth langsung" tidak menemukan printer, pilih <b>Aplikasi RawBT</b>. Cetak buram? Naikkan kegelapan.</p>') +
      '</details>' +
      '<button type="button" class="dm-btn dm-primary" id="dmPrint">' + (st.printer === "epson" ? "Cetak ke Epson LX-310 (huruf asli printer)" : "Cetak ke printer termal " + st.tw + " mm") + '</button><button type="button" class="dm-btn dm-test" id="' + (st.printer === "epson" ? "dmTest" : "dmSave") + '">' + (st.printer === "epson" ? "Cetak tes langsung (data contoh)" : "Simpan gambar struk") + '</button>' +
      (st.printer !== "epson" ? '<p id="dmAgent" class="dm-hint dm-pnote">Siap mencetak.</p>' : '') + (st.printer === "epson" ? '<p id="dmAgent" class="dm-hint dm-pnote">Memeriksa agen cetak…</p><button type="button" class="dm-btn dm-test" id="dmDlg">Cetak lewat dialog Chrome (gambar, kurang mirip)</button><button type="button" class="dm-btn dm-test" data-raw="1">Simpan PDF form Epson</button>' : "") +
      (st.printer === "epson" ? '<p class="dm-hint dm-pnote">Di dialog cetak pilih printer <b>EPSON LX-310</b>, <b>Margins: None</b>, <b>Scale: 100</b>. Cetak tanpa dialog: pakai pintasan dari <b>pasang-epson-win7.bat</b>.</p>' : '') + '</div>' +
      '<div class="dm-card"><h2>Pratinjau <small id="dmInfo"></small></h2><div id="dmPrev" class="dm-prev"></div></div></div></section>';
    function $(s) { return el.querySelector(s); }
    function fillCode(row) {
      var k = row.querySelector(".dm-k").value.trim(), p = null;
      for (var i = 0; i < P.length; i++) if (P[i][0].toUpperCase() === k.toUpperCase()) { p = P[i]; break; }
      if (p) { row.querySelector(".dm-n").value = p[1]; var s = row.querySelector(".dm-s"); if (UNITS.indexOf(p[2]) >= 0) s.value = p[2]; }
    }
    function read() {
      st.gudang = $("#dmG").value; st.kendaraan = $("#dmV").value; st.pengemudi = $("#dmD").value; st.ket = $("#dmK").value; if ($("#dmS")) { st.solid = $("#dmR").value === "1"; st.pname = $("#dmN").value.trim(); st.slot = $("#dmS").value; st.tebal = $("#dmB").value === "1"; }
      if ($("#dmF")) { st.form = $("#dmF").value; st.left = parseFloat($("#dmL").value) || 0; st.top = parseFloat($("#dmT").value) || 0; }
      if ($("#dmW")) { st.tw = $("#dmW").value; st.tmethod = $("#dmM").value; st.dens = $("#dmDn").value; st.logo = $("#dmLg").value === "1"; }
      st.set = !!(el.querySelector(".dm-set") && el.querySelector(".dm-set").open);
      st.rows = [].map.call(el.querySelectorAll(".dm-row"), function (r) {
        return { k: r.querySelector(".dm-k").value.trim(), n: r.querySelector(".dm-n").value, s: r.querySelector(".dm-s").value, q: r.querySelector(".dm-q").value, l: (st.rows[+r.getAttribute("data-i")] || {}).l || "" };
      });
      save(); preview();
    }
    function rebuild() { $("#dmRows").innerHTML = st.rows.map(rowHtml).join(""); save(); preview(); }
    var ac = $("#dmAc"), acRow = null;
    function showAc(inp) {
      var q = inp.value.trim().toUpperCase(), row = inp.parentNode; acRow = row;
      var m = P.filter(function (p) { return !q || p[0].indexOf(q) === 0 || p[0].indexOf(q) >= 0 || p[1].toUpperCase().indexOf(q) >= 0; });
      if (!m.length) { ac.hidden = true; return; }
      ac.innerHTML = m.map(function (p) { return '<button type="button" data-c="' + p[0] + '"><b>' + p[0] + '</b><span>' + esc(p[1]) + '</span><i>' + p[2] + '</i></button>'; }).join("");
      ac.hidden = false; var r = row.getBoundingClientRect(), pr = (ac.offsetParent || el).getBoundingClientRect();
      ac.style.top = (r.bottom - pr.top + 4) + "px"; ac.style.left = (r.left - pr.left) + "px"; ac.style.width = Math.max(r.width, 300) + "px"; ac.hidden = false;
    }
    ac.addEventListener("mousedown", function (e) {
      var b = e.target.closest("button"); if (!b || !acRow) return; e.preventDefault();
      for (var i = 0; i < P.length; i++) if (P[i][0] === b.getAttribute("data-c")) {
        acRow.querySelector(".dm-k").value = P[i][0]; acRow.querySelector(".dm-n").value = P[i][1]; acRow.querySelector(".dm-s").value = P[i][2];
      }
      ac.hidden = true; read(); acRow.querySelector(".dm-q").focus();
    });
    el.addEventListener("focusin", function (e) { if (e.target.classList.contains("dm-k") || e.target.classList.contains("dm-n")) showAc(e.target); else ac.hidden = true; });
    el.addEventListener("focusout", function () { setTimeout(function () { if (!el.contains(document.activeElement) || !/dm-(k|n)/.test(document.activeElement.className)) ac.hidden = true; }, 120); });
    el.addEventListener("keydown", function (e) { if (e.keyCode === 27) ac.hidden = true; });
    el.addEventListener("input", function (e) { if (e.target.classList.contains("dm-k") || e.target.classList.contains("dm-n")) showAc(e.target); if (e.target.classList.contains("dm-k")) fillCode(e.target.parentNode); read(); });
    el.addEventListener("change", read);
    el.addEventListener("click", function (e) {
      var t = e.target, pb = t.closest && t.closest("[data-pr]");
      if (pb) { read(); st.printer = pb.getAttribute("data-pr"); save(); render(el); return; }
      if (t.id === "dmPrint") { read(); if (st.printer === "epson") rawSend(false); else tPrint(false); return; }
      if (t.id === "dmDlg") { read(); doPrint(false); return; }
      if (t.hasAttribute && t.hasAttribute("data-raw")) { read(); rawDownload(false); return; }
      if (t.id === "dmSave") { read(); tSave(); return; }
      if (t.id === "dmTest") { read(); if (st.printer === "epson") rawSend(true); else tPrint(true); return; }
      if (t.id === "dmAdd") { read(); st.rows.push({ k: "", n: "", s: "BOX", q: "" }); rebuild(); var k = el.querySelectorAll(".dm-k"); k[k.length - 1].focus(); }
      else if (t.id === "dmClear") { if (window.confirm("Kosongkan semua isian barang?")) { st.rows = [{ k: "", n: "", s: "BOX", q: "" }]; st.kendaraan = ""; st.ket = ""; render(el); save(); } }
      else if (t.hasAttribute("data-del")) { read(); st.rows.splice(+t.parentNode.getAttribute("data-i"), 1); if (!st.rows.length) st.rows.push({ k: "", n: "", s: "BOX", q: "" }); rebuild(); }
      else if (t.id === "dmPrint") { read(); doPrint(); }
    });
    ping(); preview(); tick = setInterval(function () { if (!document.getElementById("dmPrev")) { clearInterval(tick); return; } preview(); }, 30000);
  }
  function preview() {
    var pv = document.getElementById("dmPrev"); if (!pv) return;
    var kind = PK || st.printer;
    if (kind === "termal" && window.ThermalPrint) { tPreview(pv); return; }
    var pg = pages(kind), none = !items().length;
    pv.innerHTML = pg.map(function (t, i) { return '<pre class="dm-paper' + (none ? " is-empty" : "") + '">' + esc(t) + "</pre>"; }).join("");
    document.getElementById("dmInfo").textContent = pg.length + (kind === "epson" ? " form" : " struk") + " · " + items().length + " barang";
    [].forEach.call(pv.querySelectorAll("pre"), function (pre) {
      var fs = kind === "epson" ? 12 : 13; pre.style.fontSize = fs + "px";
      while (pre.scrollWidth > pre.clientWidth + 1 && fs > 6) { fs -= 0.5; pre.style.fontSize = fs + "px"; }
    });
  }

  /* ---------- cetak: lewat bingkai tersembunyi berisi form saja ---------- */
  function printFrame(html, css) {
    var old = document.getElementById("dmFrame"); if (old && old.parentNode) old.parentNode.removeChild(old);
    var f = document.createElement("iframe"); f.id = "dmFrame"; f.setAttribute("aria-hidden", "true");
    f.style.cssText = "position:fixed;left:-10000px;top:0;width:9.5in;height:11in;border:0";
    document.body.appendChild(f);
    var d = f.contentWindow.document; d.open();
    d.write('<!doctype html><html><head><meta charset="utf-8"><title>DMS Manual</title><style>' + css + "</style></head><body>" + html + "</body></html>"); d.close();
    var go = function (again) { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { if (again) setTimeout(function () { go(false); }, 400); else alert("Gagal membuka dialog cetak. Coba tekan Ctrl+P lalu ulangi."); } };
    setTimeout(function () { go(true); }, 400);
  }
  /* ---------- ESC/P mentah: huruf draft bawaan printer (condensed 17 cpi, 6 lpi) ---------- */
  function adv(o, u) { while (u > 0) { var c = Math.min(255, u); o.push(27, 74, c); u -= c; } }
  function buildRaw(test) {
    TEST = !!test;
    var pg = epsonPages(), H = Math.round(fhIn() * 216), o = [27, 64, 27, 120, 0, 15, 27, 51, 36, 27, 67, 0, 22], k, i;
    TEST = false;
    /* ESC 3 36 = 6 lpi (36/216 in). ESC C 0 22 = halaman 22 in, jadi printer TIDAK pernah loncat form sendiri.
       Tiap form dimajukan tepat setinggi form (ESC J n/216 in) — tidak ada FF, tidak ada selisih yang menumpuk. */
    if (st.solid) o.push(27, 116, 1);
    if (st.tebal) o.push(27, 71, 27, 69);
    o.push(27, 108, Math.min(60, Math.round(st.left / 25.4 * 17)));
    var per = Math.max(1, Math.floor(11 / fhIn() + 0.01)), sl = per === 1 ? 0 : (parseInt(st.slot, 10) || 1) - 1;
    for (k = 0; k < sl; k++) adv(o, H);
    var topU = Math.max(0, Math.round(st.top / 25.4 * 216));
    pg.forEach(function (t) {
      var lines = t.split("\n"), used = topU + lines.length * 36;
      adv(o, topU);
      lines.forEach(function (ln) { for (i = 0; i < ln.length; i++) { var c = ln.charCodeAt(i); o.push(c === 9472 ? 196 : (c < 32 || c > 126 ? 63 : c)); } o.push(13, 10); });
      adv(o, Math.max(0, H - used));
    });
    return o;
  }
  /* PDF form Epson: 1 form = 1 halaman (9,5 in x tinggi form), Courier 17 cpi / 6 lpi seperti hasil printer asli.
     Dibuat langsung di browser (tanpa library) supaya bisa dibuka & dicetak dari Windows 7 / HP. */
  function pdfBuild(test) {
    TEST = !!test; var pg = epsonPages(); TEST = false;
    var Wp = 684, Hp = Math.round(fhIn() * 7200) / 100, fs = 7.0588, cw = 72 / 17, lh = 12;
    var x0 = st.left / 25.4 * 72, y0 = st.top / 25.4 * 72, objs = [], pageIds = [], i;
    function esc(t) { return t.replace(/[^\x20-\x7e]/g, "?").replace(/([\\()])/g, "\\$1"); }
    function f(v) { return (Math.round(v * 100) / 100).toString(); }
    objs[1] = "<< /Type /Catalog /Pages 2 0 R /ViewerPreferences << /PrintScaling /None >> >>";
    objs[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>";
    objs[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold /Encoding /WinAnsiEncoding >>";
    pg.forEach(function (t, k) {
      var c = "0 g 0 G\n", fn = st.tebal ? "/F2" : "/F1";
      t.split("\n").forEach(function (ln, j) {
        var base = Hp - (y0 + 9 + j * lh);
        if (/^[\u2500\-]{20,}$/.test(ln)) { c += (st.tebal ? "1 w " : "0.7 w ") + f(x0) + " " + f(base + 2.6) + " m " + f(x0 + ln.length * cw) + " " + f(base + 2.6) + " l S\n"; }
        else if (ln.replace(/\s+$/, "")) c += (st.tebal ? "0.25 w " : "") + "BT " + fn + " " + fs + " Tf " + (st.tebal ? "2 Tr " : "") + f(x0) + " " + f(base) + " Td (" + esc(ln.replace(/\s+$/, "")) + ") Tj " + (st.tebal ? "0 Tr " : "") + "ET\n";
      });
      var pid = 5 + k * 2, cid = pid + 1; pageIds.push(pid);
      objs[pid] = "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " + Wp + " " + f(Hp) + "] /Contents " + cid + " 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> >>";
      objs[cid] = "<< /Length " + c.length + " >>\nstream\n" + c + "endstream";
    });
    objs[2] = "<< /Type /Pages /Count " + pageIds.length + " /Kids [" + pageIds.map(function (x) { return x + " 0 R"; }).join(" ") + "] >>";
    var out = "%PDF-1.4\n", offs = [];
    for (i = 1; i < objs.length; i++) { offs[i] = out.length; out += i + " 0 obj\n" + objs[i] + "\nendobj\n"; }
    var xr = out.length; out += "xref\n0 " + objs.length + "\n0000000000 65535 f \n";
    for (i = 1; i < objs.length; i++) out += ("0000000000" + offs[i]).slice(-10) + " 00000 n \n";
    out += "trailer\n<< /Size " + objs.length + " /Root 1 0 R >>\nstartxref\n" + xr + "\n%%EOF";
    var u = new Uint8Array(out.length); for (i = 0; i < out.length; i++) u[i] = out.charCodeAt(i) & 255;
    return new Blob([u], { type: "application/pdf" });
  }
  function rawDownload(test) {
    if (!test && !items().length) { alert("Isi minimal satu barang dengan jumlah."); return; }
    var n = now(), name = "DMS-Epson-" + n.t.split("-").reverse().join("") + "-" + n.j.replace(":", "") + ".pdf", blob = pdfBuild(test);
    if (window.navigator.msSaveBlob) { window.navigator.msSaveBlob(blob, name); return; }
    var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { document.body.removeChild(a); }, 500);
    agentMsg("PDF form disimpan: " + esc(name) + ". Buka lalu Print ke Epson LX-310 (kertas 9,5 × " + (fhIn()).toFixed(2) + " in, skala 100%).");
  }
  /* ---------- printer termal: gambar struk (logo + huruf tajam) -> ESC/POS ---------- */
  var pseq = 0;
  function tdata(test) { return { gudang: st.gudang, kendaraan: st.kendaraan, pengemudi: st.pengemudi, ket: st.ket, items: test ? SAMPLE : items(), test: !!test, now: now() }; }
  function tPreview(pv) {
    var seq = ++pseq;
    window.ThermalPrint.render(tdata(false), { tw: st.tw, logo: st.logo }).then(function (cv) {
      if (seq !== pseq || !document.getElementById("dmPrev")) return;
      cv.className = "dm-tcanvas"; cv.style.maxWidth = st.tw === "58" ? "384px" : "576px";
      pv.innerHTML = ""; var w = document.createElement("div"); w.className = "dm-thermal"; w.appendChild(cv); pv.appendChild(w);
      document.getElementById("dmInfo").textContent = "1 struk · " + items().length + " barang";
    });
  }
  function tSave() {
    if (!items().length) { alert("Isi minimal satu barang dengan jumlah sebelum menyimpan."); return; }
    var n = now();
    window.ThermalPrint.render(tdata(false), { tw: st.tw, logo: st.logo, hi: true }).then(function (cv) {
      cv.toBlob(function (blob) {
        var name = "Struk-DMS-" + n.t.split("-").reverse().join("") + "-" + n.j.replace(":", "") + ".png";
        var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
        setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(a.href); }, 800);
        agentMsg("Gambar struk disimpan: " + esc(name));
      }, "image/png");
    });
  }
  function tPrint(test) {
    if (!test && !items().length) { alert("Isi minimal satu barang dengan jumlah sebelum mencetak."); return; }
    var TP = window.ThermalPrint, o = { tw: st.tw, method: st.tmethod, dens: st.dens, logo: st.logo };
    agentMsg("Menyiapkan struk…");
    TP.render(tdata(test), o).then(function (cv) {
      return TP.send(cv, o, agentMsg).then(function (m) { agentMsg(esc(m || "Terkirim ✓")); }, function (e) {
        var msg = e && e.message ? e.message : "gagal mengirim";
        agentMsg("Gagal: " + esc(msg));
        if (e && e.name === "NotFoundError") return;
        if (o.method === "ble" && window.confirm("Bluetooth langsung gagal (" + msg + ").\nCoba kirim lewat aplikasi RawBT?")) {
          o.method = "rawbt"; return TP.send(cv, o, agentMsg).then(function (m) { agentMsg(esc(m)); });
        }
      });
    });
  }
  function agentMsg(h) { var e = document.getElementById("dmAgent"); if (e) e.innerHTML = h; }
  function ping() {
    if ((st.printer !== "epson" && !PC) || !document.getElementById("dmAgent") || !window.fetch) return;
    fetch(AGENT + "/ping").then(function (r) { return r.text(); }).then(function () { agentMsg("Agen cetak: <b>tersambung</b> ✓ — tombol di atas langsung mencetak."); })
      .catch(function () { agentMsg("Agen cetak: <b>belum aktif</b>. Jalankan <b>pasang-agen-epson.bat</b> sekali di PC ini."); });
  }
  function rawSend(test) {
    if (!test && !items().length) { alert("Isi minimal satu barang dengan jumlah sebelum mencetak."); return; }
    var bytes = new Uint8Array(buildRaw(test));
    agentMsg("Mengirim ke printer…");
    fetch(AGENT + "/print?printer=" + encodeURIComponent(st.pname || ""), { method: "POST", headers: { "Content-Type": "application/octet-stream" }, body: bytes })
      .then(function (r) { return r.text().then(function (t) { if (!r.ok) throw new Error(t); agentMsg("Terkirim ke printer ✓"); }); })
      .catch(function () {
        /* agen belum terpasang: langsung cetak lewat browser (otomatis tanpa dialog bila Chrome dibuka dengan --kiosk-printing) */
        agentMsg("Mencetak langsung lewat browser…"); st.printer = "epson"; doPrint(test);
      });
  }
  function doPrint(test) {
    TEST = !!test;
    if (!TEST && !items().length) { alert("Isi minimal satu barang dengan jumlah sebelum mencetak."); return; }
    var pg = pages(), html, css, th = st.printer === "termal";
    TEST = false;
    if (th) {
      var fp = st.tw === "58" ? 7 : 8, lines = pg[0].split("\n").length, hmm = Math.ceil(lines * fp * 1.25 * 0.3528 + 6);
      css = "@page{size:" + st.tw + "mm " + hmm + "mm;margin:0}html,body{margin:0;padding:0}.s{box-sizing:border-box;width:" + st.tw + "mm;padding:2mm 3mm}pre{margin:0;font:" + fp + 'pt/1.25 "Courier New",monospace;color:#000;white-space:pre}';
      html = pg.map(function (t) { return '<div class="s"><pre>' + esc(t) + "</pre></div>"; }).join("");
    } else {
      var H = fhIn().toFixed(3), sl = st.form === "3" ? (parseInt(st.slot, 10) || 1) - 1 : 0, arr = [], wpt = (W * 72 / 17).toFixed(1), bold = st.tebal;
      for (var z = 0; z < sl; z++) arr.push(null);
      pg.forEach(function (t) { arr.push(t); });
      css = "@page{size:9.5in " + H + "in;margin:0}html,body{margin:0;padding:0;background:#fff}.s{box-sizing:border-box;width:9.5in;height:" + (H - 0.03).toFixed(3) + "in;overflow:hidden;page-break-after:always;padding:" + st.top + "mm 0 0 " + st.left + "mm}.s:last-child{page-break-after:auto}" +
        '.l{height:12pt;margin:0;font:' + (bold ? "bold " : "") + '7.0588pt/12pt "Courier New",Courier,monospace;color:#000;white-space:pre;letter-spacing:0;' + (bold ? "-webkit-text-stroke:.3pt #000;" : "") + '}.r{position:relative;height:12pt}.r i{position:absolute;left:0;top:5.5pt;width:' + wpt + "pt;border-top:" + (bold ? "1.3pt" : "0.8pt") + " solid #000}";
      html = arr.map(function (t) {
        return '<div class="s">' + (t ? t.split("\n").map(function (ln) { return /^[\u2500\-]{20,}$/.test(ln) ? '<div class="r"><i></i></div>' : '<div class="l">' + esc(ln) + "</div>"; }).join("") : "") + "</div>";
      }).join("");
    }
    printFrame(html, css);
  }

  /* tutup menu mobile saat DMS Manual dipilih */
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href="#/dms-manual"]'); if (!a) return;
    var d = document.getElementById("mobileDrawer"); if (d) d.classList.remove("open");
    var h = document.getElementById("hamburgerBtn"); if (h) h.setAttribute("aria-expanded", "false");
    [].forEach.call(document.querySelectorAll(".nav-dropdown.open"), function (o) { o.classList.remove("open"); });
  });

  /* =====================================================================
     TAMPILAN PC — meniru layar "BKB Distribusi" di DMS (form + grid detail).
     Tombol Cetak membuka pilihan: Epson LX-310 / Printer IWARE Thermal / Simpan gambar.
     ===================================================================== */
  var curMode = "", rzT = 0;
  function isPC() { return window.innerWidth >= 961 && !/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent); }
  function render(el) {
    root = el; curMode = isPC() ? "pc" : "m";
    if (curMode === "pc") renderPC(el); else renderMobile(el);
    if (!window.__dmRz) {
      window.__dmRz = 1;
      window.addEventListener("resize", function () {
        clearTimeout(rzT);
        rzT = setTimeout(function () {
          if (!root || !document.body.contains(root) || !(document.getElementById("dxRoot") || document.getElementById("dmPrev"))) return;
          if ((isPC() ? "pc" : "m") !== curMode) render(root);
        }, 250);
      });
    }
  }
  function dl(blob, name) {
    var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(a.href); }, 800);
  }
  /* gambar form Epson (untuk dicetak lewat gambar) */
  function epsonImage() {
    if (!items().length) { alert("Isi minimal satu barang dengan jumlah sebelum menyimpan gambar."); return; }
    var pg = epsonPages(), n = now(), base = "Form-DMS-" + n.t.split("-").reverse().join("") + "-" + n.j.replace(":", "");
    pg.forEach(function (t, i) {
      setTimeout(function () {
        var L = t.split("\n"), fs = 14, lh = fs * 1.3, cw = fs * 0.6, M = 24, S = 2, cv = document.createElement("canvas");
        cv.width = Math.ceil((W * cw + 2 * M) * S); cv.height = Math.ceil((L.length * lh + 2 * M) * S);
        var c = cv.getContext("2d"); c.scale(S, S); c.fillStyle = "#fff"; c.fillRect(0, 0, cv.width, cv.height);
        c.fillStyle = "#000"; c.textBaseline = "top"; c.font = (st.tebal ? "bold " : "") + fs + 'px "Courier New",Consolas,monospace';
        L.forEach(function (ln, j) {
          if (/^[\u2500\-]{20,}$/.test(ln)) c.fillRect(M, M + j * lh + fs * 0.55, W * cw, 1); else { c.fillText(ln, M, M + j * lh); if (st.tebal) { c.lineWidth = 0.5; c.strokeStyle = "#000"; c.strokeText(ln, M, M + j * lh); } }
        });
        cv.toBlob(function (b) { dl(b, base + (pg.length > 1 ? "-" + (i + 1) : "") + ".png"); agentMsg("Gambar form disimpan: " + esc(base) + ".png"); }, "image/png");
      }, i * 600);
    });
  }

  var ICO = {
    ref: '<svg viewBox="0 0 16 16" width="16" height="16"><path fill="none" stroke="#2f7d32" stroke-width="2" d="M13 8a5 5 0 1 1-1.6-3.7"/><path fill="#2f7d32" d="M14 1v5h-5z"/></svg>',
    prn: '<svg viewBox="0 0 16 16" width="16" height="16"><rect x="4" y="1.5" width="8" height="4" fill="#fff" stroke="#556"/><rect x="1.5" y="5.5" width="13" height="6" rx="1" fill="#6b7a90" stroke="#334"/><rect x="4" y="9.5" width="8" height="5" fill="#fff" stroke="#556"/></svg>',
    sav: '<svg viewBox="0 0 16 16" width="16" height="16"><rect x="1.5" y="2.5" width="13" height="11" rx="1.5" fill="#43a047" stroke="#1b5e20"/><path d="M4 8l3 3 5-6" fill="none" stroke="#fff" stroke-width="2"/></svg>',
    nw: '<svg viewBox="0 0 16 16" width="16" height="16"><path d="M3 1.5h7l3 3v10H3z" fill="#fff" stroke="#556"/><path d="M8 6v5M5.5 8.5h5" stroke="#1e6fd9" stroke-width="1.6"/></svg>',
    set: '<svg viewBox="0 0 16 16" width="16" height="16"><circle cx="8" cy="8" r="2.4" fill="none" stroke="#445" stroke-width="1.6"/><path d="M8 1.5v2.2M8 12.3v2.2M1.5 8h2.2M12.3 8h2.2M3.4 3.4l1.5 1.5M11.1 11.1l1.5 1.5M12.6 3.4l-1.5 1.5M4.9 11.1l-1.5 1.5" stroke="#445" stroke-width="1.6"/></svg>',
    find: '<svg viewBox="0 0 16 16" width="14" height="14"><circle cx="6.5" cy="6.5" r="4.2" fill="#fff4cf" stroke="#d98a00" stroke-width="1.8"/><path d="M9.6 9.6L14 14" stroke="#d98a00" stroke-width="2.2"/></svg>'
  };
  var GCODE = { "GUDANG LAYAK PARUNG": "281-W01", "GUDANG LAYAK PET PARUNG": "281-W13" };

  function renderPC(el) {
    load(); PC = true; PK = PK === "termal" ? "termal" : "epson"; clearInterval(tick);
    var P = (window.OpeningClosing && window.OpeningClosing.api && window.OpeningClosing.api.products) || [], act = 0, tab = "detail";
    P.forEach(function (p) { if (UNITS.indexOf(p[2]) < 0) UNITS.push(p[2]); });
    st.rows.forEach(function (r) { if (r.s && UNITS.indexOf(r.s) < 0) UNITS.push(r.s); });
    function dstr() { return now().t.replace(/-/g, "/"); }
    function rowsHtml() {
      return st.rows.map(function (r, i) {
        return '<div class="dx-r' + (i === act ? " act" : "") + '" data-i="' + i + '"><span class="dx-no">' + (i + 1) + '</span>' +
          '<button type="button" class="dx-lk" data-lk title="Cari produk">' + ICO.find + '</button>' +
          '<input class="dx-k" list="dxPL" autocomplete="off" value="' + esc(r.k) + '" aria-label="Kode produk">' +
          '<input class="dx-n" autocomplete="off" value="' + esc(r.n) + '" aria-label="Nama produk">' +
          '<input class="dx-q" type="number" min="0" value="' + esc(r.q) + '" aria-label="Qty">' +
          '<select class="dx-s" aria-label="Satuan">' + UNITS.map(function (u) { return "<option" + (u === r.s ? " selected" : "") + ">" + u + "</option>"; }).join("") + '</select>' +
          '<button type="button" class="dx-lot" data-lot title="Lot/SN (Batch ID)">' + (r.l ? "<i>" + esc(r.l) + "</i>" : "") + ICO.find + '</button></div>';
      }).join("");
    }
    function fld(label, inner, mg) { return '<div class="dx-f"><label>' + label + '</label><div class="dx-fv">' + inner + (mg ? '<button type="button" class="dx-mg" data-mg title="Cari">' + ICO.find + '</button>' : "") + '</div></div>'; }
    function sel(id, arr, cur) { return '<select id="' + id + '">' + arr.map(function (a) { return '<option value="' + a[0] + '"' + (a[0] === cur ? " selected" : "") + ">" + a[1] + "</option>"; }).join("") + "</select>"; }
    var set = '<div class="dx-set" id="dxSet" hidden><div class="dx-sg"><h4>Epson LX-310</h4>' +
      '<label>Ukuran form' + sel("dmF", Object.keys(FORMS).map(function (k) { return [k, FORMS[k].name]; }), st.form) + '</label>' +
      '<label>Tinggi form (mm) <small>kosong = standar</small><input id="dxFH" type="number" step="0.5" min="40" placeholder="' + Math.round(FORMS[st.form].h * 25.4) + '" value="' + esc(st.fh) + '"></label>' +
      '<label>Posisi form di lembar' + sel("dmS", [["1", "Form ke-1"], ["2", "Form ke-2"], ["3", "Form ke-3"]], st.slot) + '</label>' +
      '<label>Garis tabel' + sel("dmR", [["1", "Solid (PC437)"], ["0", "Putus-putus (-)"]], st.solid ? "1" : "0") + '</label>' +
      '<label>Nama printer Windows<input id="dmN" value="' + esc(st.pname) + '" placeholder="kosong = printer default"></label>' +
      '<label>Tebal huruf' + sel("dmB", [["1", "Tebal (double-strike)"], ["0", "Normal"]], st.tebal ? "1" : "0") + '</label>' +
      '<div class="dx-2"><label>Geser kanan (mm)<input id="dmL" type="number" step="0.5" value="' + st.left + '"></label><label>Geser bawah (mm)<input id="dmT" type="number" step="0.5" value="' + st.top + '"></label></div>' +
      '<div class="dx-2"><button type="button" class="dx-b" id="dxTest">Cetak tes 2 form</button><button type="button" class="dx-b" id="dxPrn2">Simpan PDF</button></div>' +
      '<p class="dx-hint">Kertas form menerus <b>9,5 × 3,75 in</b> (hasil ukur ± 24 × 9,5 cm). Sejajarkan perforasi atas form dengan kepala cetak, lalu nyalakan printer. Cetak <b>tes 2 form</b>: bila form ke-2 mulai pas di perforasi, tinggi sudah benar; bila bergeser, ubah <b>Tinggi form (mm)</b>.</p></div>' +
      '<div class="dx-sg"><h4>Printer IWARE Thermal</h4>' +
      '<label>Lebar kertas' + sel("dmW", [["58", "58 mm (IWARE MP-58SB)"], ["80", "80 mm"]], st.tw) + '</label>' +
      '<label>Cara kirim' + sel("dmM", [["ble", "Bluetooth langsung"], ["rawbt", "Aplikasi RawBT"], ["dialog", "Dialog cetak browser"]], st.tmethod) + '</label>' +
      '<label>Kegelapan cetak' + sel("dmDn", [["1", "Terang"], ["2", "Normal"], ["3", "Gelap"], ["4", "Sangat gelap"]], st.dens) + '</label>' +
      '<label>Logo di struk' + sel("dmLg", [["1", "Tampilkan logo"], ["0", "Tanpa logo"]], st.logo ? "1" : "0") + '</label></div></div>';
    el.innerHTML = '<section class="dm-page"><div class="dx" id="dxRoot">' +
      '<div class="dx-tabs"><span class="dx-tab on">BKB Distribusi <i>✕</i></span><span class="dx-ch">▾</span></div>' +
      '<div class="dx-tool"><button type="button" id="dxRef">' + ICO.ref + 'Refresh</button><button type="button" id="dxPrn">' + ICO.prn + 'Cetak</button><button type="button" id="dxSav">' + ICO.sav + 'Simpan Applied</button><button type="button" id="dxNew">' + ICO.nw + 'Baru</button><button type="button" id="dxSetB">' + ICO.set + 'Pengaturan</button>' +
      '<span class="dx-status">Status : <b id="dxSt"></b> ⓘ</span></div>' + set +
      '<div class="dx-grp"><div class="dx-gh">Dokumen Bukti Keluar Barang Distribusi<span>📌</span></div><div class="dx-gb"><div class="dx-col">' +
      fld("No. Dokumen", '<input id="dxNo" autocomplete="off" placeholder="mis. 281-0083795" value="' + esc(st.nodok) + '">', 1) +
      fld("Tanggal", '<input id="dxTgl" readonly value="' + dstr() + '"><span class="dx-dd">▾</span>') +
      fld("Dok. Permintaan Barang", '<input id="dxReq" autocomplete="off" value="' + esc(st.dokreq) + '">', 1) +
      fld("Salesman/Driver", '<input id="dxDrv" autocomplete="off" placeholder="mis. 281-R061 - ARDI" value="' + esc(st.pengemudi) + '">', 1) +
      fld("Gudang", '<select id="dxG">' + GUDANG.map(function (g) { return "<option value=\"" + g + "\"" + (g === st.gudang ? " selected" : "") + ">" + (GCODE[g] ? GCODE[g] + " - " : "") + g + "</option>"; }).join("") + '</select>') +
      fld("Tipe Stok", '<select id="dxTs"><option value="JUAL"' + (st.tipe === "JUAL" ? " selected" : "") + '>JUAL - Stok untuk penjualan</option></select>') +
      fld("Kendaraan", '<input id="dxV" autocomplete="off" placeholder="mis. D 9193 AE" value="' + esc(st.kendaraan) + '">', 1) +
      '</div><div class="dx-col2"><div class="dx-kl">Keterangan</div><textarea id="dxK" rows="3" placeholder="mis. RIT 1 / REVINA">' + esc(st.ket) + '</textarea>' +
      '<fieldset class="dx-cap"><legend>Capacity Info</legend><div>Volume : 0%</div><div>Weight : 0%</div></fieldset></div></div></div>' +
      '<div class="dx-dtabs"><button type="button" class="on" data-tab="detail">Detail Bukti Keluar Barang Distribusi</button><button type="button" data-tab="prev">Pratinjau Cetak</button>' +
      '<span class="dx-sp"></span><button type="button" class="dx-mini" id="dxAdd">+ Baris</button><button type="button" class="dx-mini" id="dxDel">− Hapus baris</button></div>' +
      '<div class="dx-pane" id="dxDetail"><div class="dx-gp">Drag a column here to group by this column.</div>' +
      '<div class="dx-hd"><span>No.</span><span>...</span><span>Kode Produk</span><span>Nama Produk</span><span>Qty</span><span>Satuan</span><span>Lot/SN</span></div>' +
      '<div class="dx-rows" id="dxRows">' + rowsHtml() + '</div></div>' +
      '<div class="dx-pane" id="dxPrevPane" hidden><div class="dx-pk"><button type="button" data-pk="epson" class="' + (PK === "epson" ? "on" : "") + '">Form Epson LX-310</button><button type="button" data-pk="termal" class="' + (PK === "termal" ? "on" : "") + '">Struk Thermal</button><small id="dmInfo"></small></div><div id="dmPrev" class="dm-prev"></div></div>' +
      '<div class="dx-foot"><span id="dmAgent" class="dx-msg">Siap.</span></div>' +
      '<datalist id="dxPL">' + P.map(function (p) { return '<option value="' + esc(p[0]) + '">' + esc(p[1]) + "</option>"; }).join("") + '</datalist></div></section>';
    var R = el.querySelector("#dxRoot");
    function $(s) { return R.querySelector(s); }
    function stat() { var b = $("#dxSt"); b.textContent = st.status; b.className = st.status === "Applied" ? "ok" : "dr"; }
    function rebuild() { $("#dxRows").innerHTML = rowsHtml(); save(); }
    function read() {
      st.nodok = $("#dxNo").value.trim(); st.dokreq = $("#dxReq").value.trim(); st.pengemudi = $("#dxDrv").value; st.gudang = $("#dxG").value; st.tipe = $("#dxTs").value;
      st.kendaraan = $("#dxV").value; st.ket = $("#dxK").value.replace(/\s*[\r\n]+\s*/g, " ");
      st.form = $("#dmF").value; st.fh = $("#dxFH").value.trim(); st.slot = $("#dmS").value; st.solid = $("#dmR").value === "1"; st.pname = $("#dmN").value.trim();
      st.tebal = $("#dmB").value === "1"; st.left = parseFloat($("#dmL").value) || 0; st.top = parseFloat($("#dmT").value) || 0;
      st.tw = $("#dmW").value; st.tmethod = $("#dmM").value; st.dens = $("#dmDn").value; st.logo = $("#dmLg").value === "1";
      st.rows = [].map.call(R.querySelectorAll(".dx-r"), function (r) {
        var i = +r.getAttribute("data-i");
        return { k: r.querySelector(".dx-k").value.trim(), n: r.querySelector(".dx-n").value, s: r.querySelector(".dx-s").value, q: r.querySelector(".dx-q").value, l: (st.rows[i] || {}).l || "" };
      });
      if (st.status === "Applied") { st.status = "Draft"; stat(); }
      save(); if (tab === "prev") preview();
    }
    function setAct(i) { act = i; [].forEach.call(R.querySelectorAll(".dx-r"), function (r) { r.classList.toggle("act", +r.getAttribute("data-i") === i); }); }
    function modal(title, body) {
      var o = document.createElement("div"); o.className = "dx-ov";
      o.innerHTML = '<div class="dx-md" role="dialog" aria-label="' + esc(title) + '"><div class="dx-mh">' + esc(title) + '<button type="button" data-x aria-label="Tutup">✕</button></div><div class="dx-mb">' + body + "</div></div>";
      o.addEventListener("click", function (e) { if (e.target === o || (e.target.hasAttribute && e.target.hasAttribute("data-x"))) o.parentNode && o.parentNode.removeChild(o); });
      o.close = function () { if (o.parentNode) o.parentNode.removeChild(o); };
      R.appendChild(o); return o;
    }
    function fillCode(row) {
      var k = row.querySelector(".dx-k").value.trim().toUpperCase();
      for (var i = 0; i < P.length; i++) if (P[i][0].toUpperCase() === k) {
        row.querySelector(".dx-n").value = P[i][1]; if (UNITS.indexOf(P[i][2]) >= 0) row.querySelector(".dx-s").value = P[i][2]; break;
      }
    }
    function lookup(i) {
      var m = modal("Cari Produk", '<input id="dxLq" class="dx-lq" placeholder="Ketik kode atau nama produk" autocomplete="off"><div id="dxLl" class="dx-ll"></div>');
      var q = m.querySelector("#dxLq"), ll = m.querySelector("#dxLl");
      function draw() {
        var s = q.value.trim().toUpperCase(), h = P.filter(function (p) { return !s || p[0].toUpperCase().indexOf(s) >= 0 || p[1].toUpperCase().indexOf(s) >= 0; }).slice(0, 200)
          .map(function (p) { return '<button type="button" data-c="' + esc(p[0]) + '"><b>' + esc(p[0]) + "</b><span>" + esc(p[1]) + "</span><i>" + esc(p[2]) + "</i></button>"; }).join("");
        ll.innerHTML = h || '<p class="dx-em">' + (P.length ? "Produk tidak ditemukan." : "Daftar produk belum tersedia. Ketik kode dan nama langsung di baris.") + "</p>";
      }
      q.addEventListener("input", draw); draw(); q.focus();
      ll.addEventListener("click", function (e) {
        var b = e.target.closest("button"); if (!b) return; read();
        for (var j = 0; j < P.length; j++) if (P[j][0] === b.getAttribute("data-c")) { st.rows[i].k = P[j][0]; st.rows[i].n = P[j][1]; st.rows[i].s = P[j][2]; }
        m.close(); rebuild(); setAct(i); var qs = R.querySelectorAll(".dx-q"); if (qs[i]) qs[i].focus();
      });
    }
    function printDialog() {
      var m = modal("Cetak Bukti Keluar Barang",
        '<div class="dx-opt"><button type="button" data-do="epson"><b>Epson LX-310</b><span>Form kertas menerus 3–4 ply, huruf asli printer</span></button>' +
        '<button type="button" data-do="termal"><b>Printer IWARE Thermal</b><span>Struk ' + st.tw + ' mm lewat ' + (st.tmethod === "ble" ? "Bluetooth" : st.tmethod === "rawbt" ? "RawBT" : "dialog cetak") + '</span></button>' +
        '<div class="dx-o3"><b>Simpan gambar / PDF</b><span>Untuk dicetak lewat gambar atau PDF (Windows 7, HP)</span><div><button type="button" data-do="img-termal">Gambar struk thermal</button><button type="button" data-do="img-epson">Gambar form Epson</button><button type="button" data-do="pdf-epson">PDF form Epson</button></div></div></div>');
      m.addEventListener("click", function (e) {
        var b = e.target.closest && e.target.closest("[data-do]"); if (!b) return;
        var a = b.getAttribute("data-do"); read(); m.close();
        if (a === "epson") { st.printer = "epson"; save(); rawSend(false); }
        else if (a === "termal") { st.printer = "termal"; save(); if (!window.ThermalPrint) { alert("Modul printer thermal belum termuat."); return; } tPrint(false); }
        else if (a === "img-termal") { if (!window.ThermalPrint) { alert("Modul printer thermal belum termuat."); return; } tSave(); }
        else if (a === "pdf-epson") rawDownload(false);
        else epsonImage();
      });
    }
    R.addEventListener("input", function (e) { if (e.target.classList.contains("dx-k")) fillCode(e.target.parentNode); if (e.target.id !== "dxLq") read(); });
    R.addEventListener("change", function (e) { if (e.target.id !== "dxLq") read(); });
    R.addEventListener("focusin", function (e) { var r = e.target.closest && e.target.closest(".dx-r"); if (r) setAct(+r.getAttribute("data-i")); });
    R.addEventListener("keydown", function (e) {
      if (e.keyCode === 27) { var o = R.querySelector(".dx-ov"); if (o) o.close(); return; }
      if (e.keyCode === 13 && e.target.classList.contains("dx-q")) {
        e.preventDefault(); var i = +e.target.parentNode.getAttribute("data-i"); read();
        if (i >= st.rows.length - 1 && (st.rows[i].k || st.rows[i].n)) st.rows.push({ k: "", n: "", s: "BOX", q: "", l: "" });
        if (i + 1 < st.rows.length) { rebuild(); setAct(i + 1); R.querySelectorAll(".dx-k")[i + 1].focus(); }
      }
    });
    R.addEventListener("click", function (e) {
      var t = e.target, b;
      if ((b = t.closest("[data-tab]"))) {
        tab = b.getAttribute("data-tab"); [].forEach.call(R.querySelectorAll("[data-tab]"), function (x) { x.classList.toggle("on", x === b); });
        $("#dxDetail").hidden = tab !== "detail"; $("#dxPrevPane").hidden = tab !== "prev"; if (tab === "prev") preview(); return;
      }
      if ((b = t.closest("[data-pk]"))) { PK = b.getAttribute("data-pk"); [].forEach.call(R.querySelectorAll("[data-pk]"), function (x) { x.classList.toggle("on", x === b); }); preview(); return; }
      if ((b = t.closest("[data-lk]"))) { read(); lookup(+b.parentNode.getAttribute("data-i")); return; }
      if ((b = t.closest("[data-lot]"))) {
        read(); var i = +b.parentNode.getAttribute("data-i"), v = window.prompt("Lot/SN (Batch ID) untuk baris " + (i + 1) + ":", st.rows[i].l || "");
        if (v !== null) { st.rows[i].l = v.trim(); rebuild(); setAct(i); if (tab === "prev") preview(); }
        return;
      }
      if ((b = t.closest("[data-mg]"))) { var inp = b.parentNode.querySelector("input"); if (inp) inp.focus(); return; }
      b = t.closest("button"); if (!b) return;
      if (b.id === "dxPrn") { read(); printDialog(); }
      else if (b.id === "dxRef") { agentMsg("Memeriksa agen cetak…"); ping(true); $("#dxTgl").value = dstr(); if (tab === "prev") preview(); }
      else if (b.id === "dxSav") {
        read(); if (!items().length) { alert("Isi minimal satu barang dengan jumlah sebelum menyimpan."); return; }
        st.status = "Applied"; save(); stat(); agentMsg("Tersimpan di komputer ini ✓");
      }
      else if (b.id === "dxNew") {
        if (!window.confirm("Mulai dokumen baru? Isian saat ini dikosongkan.")) return;
        st.rows = [{ k: "", n: "", s: "BOX", q: "", l: "" }]; st.kendaraan = ""; st.ket = ""; st.nodok = ""; st.dokreq = ""; st.pengemudi = ""; st.status = "Draft"; save(); renderPC(el);
      }
      else if (b.id === "dxSetB") { var s = $("#dxSet"); s.hidden = !s.hidden; }
      else if (b.id === "dxAdd") { read(); st.rows.push({ k: "", n: "", s: "BOX", q: "", l: "" }); act = st.rows.length - 1; rebuild(); var ks = R.querySelectorAll(".dx-k"); ks[ks.length - 1].focus(); }
      else if (b.id === "dxDel") { read(); st.rows.splice(act, 1); if (!st.rows.length) st.rows.push({ k: "", n: "", s: "BOX", q: "", l: "" }); act = Math.min(act, st.rows.length - 1); rebuild(); setAct(act); }
      else if (b.id === "dxTest") { read(); rawSend(true); }
      else if (b.id === "dxPrn2") { read(); rawDownload(false); }
    });
    stat(); ping(true);
    tick = setInterval(function () {
      if (!document.getElementById("dxRoot")) { clearInterval(tick); return; }
      var d = document.getElementById("dxTgl"); if (d) d.value = dstr(); if (tab === "prev") preview();
    }, 30000);
  }

  window.DMSManual = { render: render };
})();
