/* DMS Manual — Bukti Keluar Barang (Distribusi) untuk printer dot-matrix Epson LX-310.
   ES5 murni (aman Chrome 109 / Windows 7). Cetak lewat teks monospasi 80 kolom @10 cpi, 6 lpi. */
(function () {
  "use strict";
  var KEY = "lp_dms_manual", W = 118, LEGEND = "Keterangan : Putih Sales, Merah Ada Gudang, Kuning Checker, Hijau Security";
  var GUDANG = ["GUDANG LAYAK PARUNG", "GUDANG BS PARUNG", "GUDANG REJECT PARUNG", "GUDANG LAYAK PET PARUNG"];
  var FORMS = { "3": { name: "1/3 lembar (9,5 × 3,67 in)", h: 11 / 3, lines: 22 }, "2": { name: "1/2 lembar (9,5 × 5,5 in)", h: 5.5, lines: 33 }, "1": { name: "Penuh (9,5 × 11 in)", h: 11, lines: 66 } };
  var UNITS = ["BOX", "PACK", "PCS"];
  var st, root, tick, TEST = false, SAMPLE = [{ k: "124172", n: "AQ.600ML MP 1X6", s: "PACK", q: "2" }, { k: "134578", n: "AQ.220ML 1X48", s: "BOX", q: "10" }, { k: "142009", n: "AQ.1100ML LOCAL 1X12", s: "BOX", q: "25" }];

  function load() {
    var d = {}; try { d = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) {}
    st = { gudang: d.gudang || GUDANG[0], kendaraan: d.kendaraan || "", ket: d.ket || "",
      rows: (d.rows && d.rows.length) ? d.rows : [{ k: "", n: "", s: "BOX", q: "" }],
      form: d.form || "3", printer: d.printer || "epson", tw: d.tw || "80", left: d.left == null ? 8 : d.left, pengemudi: d.pengemudi || "", slot: d.slot || "1", tebal: d.tebal == null ? true : d.tebal, top: d.top == null ? 0 : d.top };
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
  function perPage() { return FORMS[st.form].lines - 13; }
  function items() { if (TEST) return SAMPLE; return st.rows.filter(function (r) { return (r.k || r.n) && String(r.q).trim() !== ""; }); }
  function dash() { return new Array(W + 1).join("-"); }

  /* ---------- susun teks form ---------- */
  function pages() { return st.printer === "termal" ? thermal() : epsonPages(); }
  function epsonPages() {
    var it = items(), n = perPage(), total = Math.max(1, Math.ceil(it.length / n)), nw = now(), out = [];
    for (var p = 0; p < total; p++) {
      var L = [], part = it.slice(p * n, p * n + n), HW = 62;
      var title = TEST ? "BUKTI KELUAR BARANG (TES CETAK)" : "BUKTI KELUAR BARANG (MANUAL)";
      L.push(rep(Math.floor((W - title.length) / 2)) + title);
      L.push(pad("NAMA DEPO   : LP PARUNG", HW) + "HALAMAN    : " + (p + 1) + "/" + total);
      L.push(pad("NAMA GUDANG : " + st.gudang, HW) + "DOKUMEN ID :");
      L.push(pad("PENGEMUDI   : " + st.pengemudi.toUpperCase(), HW) + "TANGGAL    : " + nw.t + " " + nw.j);
      L.push(pad("KENDARAAN   : " + st.kendaraan.toUpperCase(), HW) + "NO. FB     :");
      L.push(pad("KETERANGAN  : " + st.ket.toUpperCase(), W));
      L.push(dash());
      L.push(pad("NO", 4) + pad("KODE", 10) + pad("NAMA PRODUK", 66) + pad("SATUAN", 10) + lpad("JUMLAH", 8) + "  BATCH ID");
      L.push(dash());
      for (var i = 0; i < n; i++) {
        var r = part[i];
        L.push(!r && TEST && i === part.length ? new Array(Math.ceil(W / 10) + 1).join("1234567890").substr(0, W) : r ? pad(p * n + i + 1, 4) + pad(r.k.toUpperCase(), 10) + pad(r.n.toUpperCase(), 66) + pad(r.s.toUpperCase(), 10) + lpad(r.q, 8) : "");
      }
      L.push(dash());
      L.push(LEGEND);
      L.push(pad("DIBUAT OLEH,", 30) + pad("DISERAHKAN OLEH,", 30) + pad("DITERIMA OLEH,", 30) + "DIPERIKSA OLEH,");
      out.push(L.join("\n"));
    }
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
  function render(el) {
    load(); root = el; clearInterval(tick);
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
      '<div class="dm-two"><label>Posisi form di lembar<select id="dmS">' + ["1", "2", "3"].map(function (k) { return '<option value="' + k + '"' + (k === st.slot ? " selected" : "") + ">Form ke-" + k + "</option>"; }).join("") + '</select></label><label>Tebal huruf<select id="dmB"><option value="1"' + (st.tebal ? " selected" : "") + '>Tebal (double-strike)</option><option value="0"' + (st.tebal ? "" : " selected") + '>Normal</option></select></label></div>' +
      '<div class="dm-two"><label>Geser kanan (mm)<input id="dmL" type="number" step="0.5" value="' + st.left + '"></label><label>Geser bawah (mm)<input id="dmT" type="number" step="0.5" value="' + st.top + '"></label></div>' +
      '<p class="dm-hint">Kertas di driver Windows: <b>9,5 × 11 in</b> (Portrait). Form 1/3 dicetak di bagian atas lembar; pilih "Form ke-2/3" bila form ke-1 sudah terpakai.</p>' :
      '<label>Lebar kertas<select id="dmW"><option value="80"' + (st.tw === "80" ? " selected" : "") + '>80 mm</option><option value="58"' + (st.tw === "58" ? " selected" : "") + '>58 mm</option></select></label>' +
      '<p class="dm-hint">Pilih printer termal Anda di dialog cetak, atau jadikan printer default bila memakai pintasan cetak langsung.</p>') +
      '</details>' +
      '<button type="button" class="dm-btn dm-primary" id="dmPrint">' + (st.printer === "epson" ? "Cetak ke Epson LX-310" : "Cetak ke printer termal " + st.tw + " mm") + '</button><button type="button" class="dm-btn dm-test" id="dmTest">Cetak tes (data contoh)</button>' +
      (st.printer === "epson" ? '<button type="button" class="dm-btn dm-test" data-raw="1">Unduh teks ESC/P (.prn) — huruf asli printer</button><button type="button" class="dm-btn dm-test" data-raw="t">Unduh tes ESC/P (.prn)</button>' : "") +
      '<p class="dm-hint dm-pnote">Di dialog cetak pilih printer <b>' + (st.printer === "epson" ? "EPSON LX-310" : "termal") + '</b>, <b>Margins: None</b>, <b>Scale: 100</b>. Cetak tanpa dialog: pakai pintasan dari <b>pasang-epson-win7.bat</b>.</p></div>' +
      '<div class="dm-card"><h2>Pratinjau <small id="dmInfo"></small></h2><div id="dmPrev" class="dm-prev"></div></div></div></section>';
    function $(s) { return el.querySelector(s); }
    function fillCode(row) {
      var k = row.querySelector(".dm-k").value.trim(), p = null;
      for (var i = 0; i < P.length; i++) if (P[i][0].toUpperCase() === k.toUpperCase()) { p = P[i]; break; }
      if (p) { row.querySelector(".dm-n").value = p[1]; var s = row.querySelector(".dm-s"); if (UNITS.indexOf(p[2]) >= 0) s.value = p[2]; }
    }
    function read() {
      st.gudang = $("#dmG").value; st.kendaraan = $("#dmV").value; st.pengemudi = $("#dmD").value; st.ket = $("#dmK").value; if ($("#dmS")) { st.slot = $("#dmS").value; st.tebal = $("#dmB").value === "1"; }
      if ($("#dmF")) { st.form = $("#dmF").value; st.left = parseFloat($("#dmL").value) || 0; st.top = parseFloat($("#dmT").value) || 0; }
      if ($("#dmW")) st.tw = $("#dmW").value;
      st.set = !!(el.querySelector(".dm-set") && el.querySelector(".dm-set").open);
      st.rows = [].map.call(el.querySelectorAll(".dm-row"), function (r) {
        return { k: r.querySelector(".dm-k").value.trim(), n: r.querySelector(".dm-n").value, s: r.querySelector(".dm-s").value, q: r.querySelector(".dm-q").value };
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
      if (t.id === "dmPrint") { read(); doPrint(false); return; }
      if (t.hasAttribute && t.hasAttribute("data-raw")) { read(); rawDownload(t.getAttribute("data-raw") === "t"); return; }
      if (t.id === "dmTest") { read(); doPrint(true); return; }
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
    document.getElementById("dmInfo").textContent = pg.length + (st.printer === "epson" ? " lembar" : " struk") + " · " + items().length + " barang";
    [].forEach.call(pv.querySelectorAll("pre"), function (pre) {
      var fs = st.printer === "epson" ? 12 : 13; pre.style.fontSize = fs + "px";
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
  function rawDownload(test) {
    TEST = !!test;
    if (!TEST && !items().length) { alert("Isi minimal satu barang dengan jumlah."); return; }
    var pg = epsonPages(), f = FORMS[st.form], o = [27, 64, 27, 120, 0, 15, 27, 50, 27, 67, f.lines], k, i;
    TEST = false;
    if (st.tebal) o.push(27, 71);
    o.push(27, 108, Math.min(60, Math.round(st.left / 25.4 * 17)));
    var per = Math.max(1, Math.round(11 / f.h)), sl = per === 1 ? 0 : (parseInt(st.slot, 10) || 1) - 1;
    for (k = 0; k < sl; k++) o.push(12);
    pg.forEach(function (t) {
      for (k = 0; k < Math.round(st.top / 4.233); k++) o.push(13, 10);
      t.split("\n").forEach(function (ln) { for (i = 0; i < ln.length; i++) { var c = ln.charCodeAt(i); o.push(c < 32 || c > 126 ? 63 : c); } o.push(13, 10); });
      o.push(12);
    });
    var n = now(), name = "DMS-Epson-" + n.t.split("-").reverse().join("") + "-" + n.j.replace(":", "") + ".prn", blob = new Blob([new Uint8Array(o)], { type: "application/octet-stream" });
    if (window.navigator.msSaveBlob) { window.navigator.msSaveBlob(blob, name); return; }
    var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { document.body.removeChild(a); }, 500);
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
      var f = FORMS[st.form], H = f.h.toFixed(3), per = Math.max(1, Math.round(11 / f.h)), sl = per === 1 ? 0 : (parseInt(st.slot, 10) || 1) - 1, arr = [], sheets = [];
      for (var z = 0; z < sl; z++) arr.push(null);
      pg.forEach(function (t) { arr.push(t); });
      for (var y = 0; y < arr.length; y += per) sheets.push(arr.slice(y, y + per));
      css = "@page{size:9.5in 11in;margin:0}html,body{margin:0;padding:0}.s{box-sizing:border-box;width:9.5in;height:calc(11in - .04in);overflow:hidden;page-break-after:always}.s:last-child{page-break-after:auto}.f{box-sizing:border-box;height:" + H + "in;overflow:hidden;padding:" + st.top + "mm 0 0 " + st.left + "mm}pre{margin:0;font:" + (st.tebal ? "bold " : "") + '7.06pt/12pt "Courier New",monospace;color:#000;white-space:pre}';
      html = sheets.map(function (sh) { return '<div class="s">' + sh.map(function (t) { return '<div class="f">' + (t ? "<pre>" + esc(t) + "</pre>" : "") + "</div>"; }).join("") + "</div>"; }).join("");
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
  window.DMSManual = { render: render };
})();
