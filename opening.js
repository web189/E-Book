/* Website Opening & Closing — form input stok fisik per gudang + export Excel.
   Ringan & kompatibel Chrome 109 (Windows 7): tanpa library, tanpa fitur CSS/JS baru. */
(function () {
  "use strict";
  var DEPO = "281 | LP PARUNG";
  var GUDANG = [
    { key: "layak", label: "LAYAK - GUDANG LAYAK PARUNG", tbg: "281-0014410" },
    { key: "bs", label: "BS - GUDANG BS PARUNG", tbg: "281-0014411" },
    { key: "reject", label: "REJECT - GUDANG REJECT PARUNG", tbg: "281-0014412" },
    { key: "pet", label: "LAYAK - GUDANG LAYAK PET PARUNG", tbg: "281-0014414" }
  ];
  var PRODUCTS = [["JUGRACK", "UNIT"], ["VT.5GALLON BTL", "BOTOL"], ["JUG AQUA 19L PC 55 MM", "BOTOL"], ["VT.330ML 1X24", "BOX"], ["AQ.600ML MP 1X6", "PACK"], ["AQ.220ML 1X48", "BOX"], ["AQ.1100ML LOCAL 1X12", "BOX"], ["MIZONE ACTIV LYCHEE LEMON 500ML 1X12", "BOX"], ["MIZONE MOOD UP CRANBERRY 500ML 1X12", "BOX"], ["VT.550ML 1X24", "BOX"], ["VT.220ML BOTTLE LOCAL 1X24", "BOX"], ["AQ.220ML MINI BOTTLE LOCAL 1X24", "BOX"], ["VT.200ML 1X48", "BOX"], ["AQ.380ML REFLECTIONS BAL SPARKLING 1X12", "BOX"], ["AQ.380ML REFLECTIONS BAL 1X12", "BOX"], ["AQ.380ML REFLECTIONS BAL SBUX 1X12", "BOX"], ["AQ.200ML 1X48", "BOX"], ["MIZONE COCO BOST 500ML 1X12", "BOX"], ["AQ.600ML 1X24 ID GOSOK", "BOX"], ["AQ.600ML 1X1 ID GOSOK", "PCS"], ["AQ.1500ML 1X12", "BOX"], ["AQ.330ML 1X24", "BOX"], ["AQ.330ML LOCAL HOKBEN 1X24", "BOX"], ["AQ.5GALLON ISI", "BOTOL"], ["VT.5GALLON ISI", "BOTOL"], ["AQ.600ML 1X24", "BOX"], ["VT.1500ML 1X12", "BOX"], ["AQ.1500ML MP 1X6", "PACK"], ["AQ.750ML 1X18", "BOX"]];
  var LS_KEY = "lp_openclose_v1";
  var db = {}, date = "", phase = "open", openKey = "", saveT = null, root = null;

  var loaded = false;
  function load() { if (loaded) return; loaded = true; try { db = JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch (e) { db = {}; } }
  function save(now) {
    clearTimeout(saveT);
    var run = function () { try { localStorage.setItem(LS_KEY, JSON.stringify(db)); } catch (e) {} };
    if (now) run(); else saveT = setTimeout(run, 300);
  }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function today() { var d = new Date(); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function nowTime() { var d = new Date(); return pad(d.getHours()) + ":" + pad(d.getMinutes()); }
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function fmtDate(iso) { var p = iso.split("-"); return p[2] + "-" + p[1] + "-" + p[0]; }
  function rec(ph) {
    var day = db[date] || (db[date] = {});
    var r = day[ph] || (day[ph] = { time: nowTime(), user: "", g: {} });
    GUDANG.forEach(function (g) { if (!r.g[g.key]) r.g[g.key] = { tbg: g.tbg, q: {}, d: {} }; });
    return r;
  }
  function peek(ph) {
    var day = db[date] || {}, r = day[ph] || { time: "", user: "", g: {} };
    var out = { time: r.time || "", user: r.user || "", g: {} };
    GUDANG.forEach(function (gd) { out.g[gd.key] = r.g && r.g[gd.key] ? r.g[gd.key] : { tbg: gd.tbg, q: {}, d: {} }; });
    return out;
  }
  function filled(g) { var n = 0; for (var k in g.q) if (g.q[k] !== "") n++; return n; }
  function diff(q, d) {
    if (d === undefined || d === "") return null;
    return (+q || 0) - (+d);
  }
  function diffHtml(v) {
    if (v === null) return "–";
    return v > 0 ? "+" + v : String(v);
  }
  function diffCls(v) { return v === null ? "" : v === 0 ? "ok" : "bad"; }

  /* ------------------------------ UI ------------------------------ */
  var CHEV = '<svg viewBox="0 0 24 24" width="18" height="18"><path d="m6 9 6 6 6-6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function rowsHtml(g) {
    var h = '<div class="oc-thead"><span>PRODUCT</span><span>Unit</span><span>QTY</span><span>DMS</span><span>SELISIH</span></div>';
    for (var i = 0; i < PRODUCTS.length; i++) {
      var q = g.q[i] === undefined ? "" : g.q[i], d = g.d[i] === undefined ? "" : g.d[i], s = diff(q, d);
      h += '<div class="oc-row" data-i="' + i + '" data-name="' + esc(PRODUCTS[i][0].toLowerCase()) + '">' +
        '<div class="oc-pname">' + esc(PRODUCTS[i][0]) + '</div>' +
        '<div class="oc-unit">' + esc(PRODUCTS[i][1]) + '</div>' +
        '<label class="oc-f"><em>QTY</em><input class="oc-in" data-k="q" type="text" inputmode="numeric" autocomplete="off" value="' + esc(q) + '"></label>' +
        '<label class="oc-f"><em>DMS</em><input class="oc-in" data-k="d" type="text" inputmode="numeric" autocomplete="off" value="' + esc(d) + '"></label>' +
        '<div class="oc-f oc-sel"><em>SELISIH</em><b class="' + diffCls(s) + '">' + diffHtml(s) + '</b></div></div>';
    }
    return h;
  }

  function listHtml() {
    var r = rec(phase), h = "";
    GUDANG.forEach(function (gd) {
      var g = r.g[gd.key], open = openKey === gd.key, n = filled(g);
      h += '<div class="oc-acc' + (open ? " open" : "") + '" data-key="' + gd.key + '">' +
        '<button type="button" class="oc-acc-btn" data-toggle="' + gd.key + '" aria-expanded="' + open + '">' +
        '<span class="oc-acc-name">' + esc(gd.label) + '</span>' +
        '<span class="oc-badge' + (n ? " has" : "") + '" data-badge>' + n + '/' + PRODUCTS.length + '</span>' + CHEV + '</button>';
      if (open) {
        h += '<div class="oc-acc-body">' +
          '<div class="oc-tools"><label class="oc-tbg"><span>No. TBG</span><input class="oc-tbg-in" type="text" value="' + esc(g.tbg) + '"></label>' +
          '<input class="oc-search" type="search" placeholder="Cari produk…" autocomplete="off"></div>' +
          '<div class="oc-table">' + rowsHtml(g) + '</div>' +
          '<div class="oc-empty" hidden>Produk tidak ditemukan.</div></div>';
      }
      h += '</div>';
    });
    return h;
  }

  function render(app) {
    load();
    if (!date) date = today();
    root = app;
    var r = rec(phase), isOpen = phase === "open";
    app.innerHTML =
      '<section class="section oc-page"><div class="oc-wrap">' +
      '<div class="oc-head"><span class="hero-eyebrow">Stok Fisik Harian</span>' +
      '<h1 class="oc-title">Website Opening &amp; Closing</h1>' +
      '<p class="oc-sub">Isi stok fisik tiap gudang saat <b>Opening</b> dan <b>Closing</b>, lalu unduh hasilnya sebagai file Excel. Data tersimpan otomatis di perangkat ini.</p></div>' +
      '<div class="oc-info">' +
      '<div class="oc-seg" role="tablist"><button type="button" class="' + (isOpen ? "on" : "") + '" data-phase="open">Opening</button><button type="button" class="' + (!isOpen ? "on" : "") + '" data-phase="close">Closing</button></div>' +
      '<label class="oc-fld"><span>Tanggal</span><input type="date" id="ocDate" value="' + date + '"></label>' +
      '<label class="oc-fld"><span>Jam ' + (isOpen ? "Opening" : "Closing") + '</span><input type="time" id="ocTime" value="' + esc(r.time) + '"></label>' +
      '<label class="oc-fld oc-fld-wide"><span>Nama User ' + (isOpen ? "Opening" : "Closing") + '</span><input type="text" id="ocUser" placeholder="Nama lengkap" value="' + esc(r.user) + '"></label></div>' +
      '<div class="oc-card"><div class="oc-card-bar"><b>' + (isOpen ? "OPENING" : "CLOSING") + ' GUDANG</b><span>' + esc(fmtDate(date)) + '</span></div>' +
      '<div class="oc-card-body"><div class="oc-depo"><span>Depo</span><div class="oc-depo-val">' + DEPO + '</div></div>' +
      '<div class="oc-qty"><span class="oc-qty-lbl">QTY Fisik</span><div class="oc-list" id="ocList">' + listHtml() + '</div></div></div>' +
      '<div class="oc-card-foot"><button type="button" class="oc-btn ghost" id="ocReset">Kosongkan</button><button type="button" class="oc-btn ghost" id="ocSave">Simpan</button><button type="button" class="oc-btn main" id="ocXls">Unduh Excel</button></div></div>' +
      '<p class="oc-note">File Excel berisi <b>Opening dan Closing</b> tanggal yang dipilih, sesuai format laporan (PRODUCT · Unit · QTY · DMS · SELISIH).</p>' +
      '</div></section>';
    bind(app);
  }

  function toast(m) { var t = document.createElement("div"); t.className = "oc-toast"; t.textContent = m; document.body.appendChild(t); setTimeout(function () { t.parentNode && t.parentNode.removeChild(t); }, 2200); }

  function bind(app) {
    app.onclick = function (e) {
      var t = e.target;
      if (!t.closest || !t.closest(".oc-page")) return;
      var b = t.closest ? t.closest("[data-toggle],[data-phase],#ocReset,#ocSave,#ocXls") : null;
      if (!b) return;
      if (b.hasAttribute("data-toggle")) {
        var k = b.getAttribute("data-toggle"); openKey = openKey === k ? "" : k;
        document.getElementById("ocList").innerHTML = listHtml();
        if (openKey) { var el = app.querySelector('.oc-acc[data-key="' + openKey + '"]'); if (el && el.scrollIntoView) el.scrollIntoView({ block: "nearest" }); }
      } else if (b.hasAttribute("data-phase")) { save(true); phase = b.getAttribute("data-phase"); openKey = ""; render(app); }
      else if (b.id === "ocSave") { save(true); toast("Data tersimpan."); }
      else if (b.id === "ocReset") {
        if (window.confirm("Kosongkan semua isian " + (phase === "open" ? "Opening" : "Closing") + " tanggal " + fmtDate(date) + "?")) {
          delete db[date][phase]; save(true); render(app); toast("Isian dikosongkan.");
        }
      } else if (b.id === "ocXls") { save(true); downloadXlsx(); }
    };
    app.oninput = function (e) {
      var t = e.target;
      if (!t.closest || !t.closest(".oc-page")) return;
      var r = rec(phase);
      if (t.id === "ocTime") { r.time = t.value; save(); return; }
      if (t.id === "ocUser") { r.user = t.value; save(); return; }
      var acc = t.closest ? t.closest(".oc-acc") : null;
      if (!acc) return;
      var g = r.g[acc.getAttribute("data-key")];
      if (t.classList.contains("oc-tbg-in")) { g.tbg = t.value; save(); return; }
      if (t.classList.contains("oc-search")) {
        var v = t.value.toLowerCase(), rows = acc.querySelectorAll(".oc-row"), shown = 0;
        for (var i = 0; i < rows.length; i++) { var m = rows[i].getAttribute("data-name").indexOf(v) > -1; rows[i].style.display = m ? "" : "none"; if (m) shown++; }
        acc.querySelector(".oc-empty").hidden = shown > 0; return;
      }
      if (t.classList.contains("oc-in")) {
        var clean = t.value.replace(/[^0-9]/g, ""); if (clean !== t.value) t.value = clean;
        var row = t.closest(".oc-row"), idx = row.getAttribute("data-i"), kk = t.getAttribute("data-k");
        if (clean === "") delete g[kk][idx]; else g[kk][idx] = clean;
        var s = diff(g.q[idx], g.d[idx]), sb = row.querySelector(".oc-sel b");
        sb.textContent = diffHtml(s); sb.className = diffCls(s);
        var badge = acc.querySelector("[data-badge]"), n = filled(g);
        badge.textContent = n + "/" + PRODUCTS.length; badge.className = "oc-badge" + (n ? " has" : "");
        save();
      }
    };
    app.onchange = function (e) {
      if (e.target.id === "ocDate" && e.target.value && e.target.closest && e.target.closest(".oc-page")) { save(true); date = e.target.value; openKey = ""; render(app); }
    };
  }

  /* --------------------- Excel (.xlsx) tanpa library --------------------- */
  function col(n) { return "ABCDE".charAt(n); }
  function xmlEsc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function sheetXml() {
    var rows = [], merges = [], r = 0;
    function line(cells, ht) { r++; rows.push({ r: r, cells: cells, ht: ht }); return r; }
    var TALL = { 7: 1, 8: 1, 13: 1 };
    function blank() { r++; }
    function c(ci, v, st) { return { c: ci, v: v, s: st }; }
    line([c(0, "DETAIL OPENING CLOSING GUDANG", 1)], 18); blank();
    line([c(0, "Depo", 2), c(1, ": " + DEPO, 0)]);
    line([c(0, "Tanggal", 2), c(1, ": " + fmtDate(date), 0)]); blank();
    ["open", "close"].forEach(function (ph) {
      var x = peek(ph);
      line([c(0, (ph === "open" ? "OPENING" : "CLOSING") + " | " + (x.time || ""), 1)], 18); blank();
      GUDANG.forEach(function (gd) {
        var g = x.g[gd.key], rr = line([c(0, gd.label, 3), c(1, "", 3), c(2, "", 3), c(3, "", 3), c(4, "", 3)]);
        merges.push("A" + rr + ":E" + rr);
        line([c(0, "PRODUCT", 3), c(1, "Unit", 3), c(2, "QTY", 3), c(3, "DMS", 3), c(4, "SELISIH", 3)]);
        for (var i = 0; i < PRODUCTS.length; i++) {
          var q = g.q[i], d = g.d[i], s = diff(q, d);
          line([c(0, PRODUCTS[i][0], 4), c(1, PRODUCTS[i][1], 5), c(2, q === undefined ? null : +q, 5), c(3, d === undefined ? null : +d, 8), c(4, s === null ? null : s, 8)], TALL[i] ? 30 : 15);
        }
        var tr = line([c(0, "No.TBG : " + g.tbg, 6), c(1, "", 6), c(2, "", 6), c(3, "", 6), c(4, "", 6)]);
        merges.push("A" + tr + ":E" + tr); blank();
      });
    });
    line([c(0, "VALIDASI LIST", 1)], 18); blank();
    line([c(0, "No", 3), c(1, "User", 3), c(2, "Branch", 3), c(3, "Roles", 3), c(4, "Datetime", 3)]);
    var vr = line([c(0, "Belum ada validasi", 5), c(1, "", 5), c(2, "", 5), c(3, "", 5), c(4, "", 5)]); merges.push("A" + vr + ":E" + vr); blank();
    line([c(0, "User Opening", 2), c(1, ":", 0), c(2, peek("open").user, 0)]);
    line([c(0, "User Closing", 2), c(1, ":", 0), c(2, peek("close").user, 0)]);
    var xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><sheetViews><sheetView showGridLines="0" workbookViewId="0"/></sheetViews><sheetFormatPr defaultRowHeight="15"/><cols><col min="1" max="1" width="36.57" customWidth="1"/><col min="2" max="2" width="17" customWidth="1"/><col min="3" max="3" width="23.29" customWidth="1"/><col min="4" max="4" width="9.29" customWidth="1"/><col min="5" max="5" width="9.29" customWidth="1"/></cols><sheetData>';
    rows.forEach(function (row) {
      xml += '<row r="' + row.r + '"' + (row.ht ? ' ht="' + row.ht + '" customHeight="1"' : '') + '>';
      row.cells.forEach(function (cl) {
        var ref = col(cl.c) + row.r, st = ' s="' + cl.s + '"';
        if (cl.v === null || cl.v === "") xml += '<c r="' + ref + '"' + st + '/>';
        else if (typeof cl.v === "number") xml += '<c r="' + ref + '"' + st + '><v>' + cl.v + '</v></c>';
        else xml += '<c r="' + ref + '"' + st + ' t="inlineStr"><is><t xml:space="preserve">' + xmlEsc(cl.v) + '</t></is></c>';
      });
      xml += '</row>';
    });
    xml += '</sheetData><mergeCells count="' + merges.length + '">';
    merges.forEach(function (m) { xml += '<mergeCell ref="' + m + '"/>'; });
    return xml + '</mergeCells><pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/><pageSetup paperSize="9" orientation="portrait" fitToWidth="1" fitToHeight="0"/></worksheet>';
  }
  var STYLES = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<fonts count="5"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="13.5"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font><font><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><sz val="6"/><color rgb="FF666666"/><name val="Calibri"/></font></fonts>' +
    '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF5156BE"/><bgColor indexed="64"/></patternFill></fill></fills>' +
    '<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="dotted"><color auto="1"/></left><right style="dotted"><color auto="1"/></right><top style="dotted"><color auto="1"/></top><bottom style="dotted"><color auto="1"/></bottom><diagonal/></border></borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="9">' +
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
    '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
    '<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
    '<xf numFmtId="0" fontId="3" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>' +
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>' +
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' +
    '<xf numFmtId="0" fontId="4" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1"/>' +
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/>' +
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';

  var CRC = (function () { var t = [], c, n, k; for (n = 0; n < 256; n++) { c = n; for (k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(b) { var c = 0xFFFFFFFF; for (var i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function zip(files) {
    var enc = new TextEncoder(), parts = [], cd = [], off = 0;
    files.forEach(function (f) {
      var nm = enc.encode(f.name), data = enc.encode(f.text), crc = crc32(data);
      var h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(10, 0, true); h.setUint16(12, 33, true);
      h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, nm.length, true);
      parts.push(new Uint8Array(h.buffer), nm, data);
      var c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(14, 33, true);
      c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, nm.length, true); c.setUint32(42, off, true);
      cd.push(new Uint8Array(c.buffer), nm);
      off += 30 + nm.length + data.length;
    });
    var size = 0; cd.forEach(function (p) { size += p.length; });
    var e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, size, true); e.setUint32(16, off, true);
    return new Blob(parts.concat(cd, [new Uint8Array(e.buffer)]), { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  }
  function downloadXlsx() {
    var H = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
    var blob = zip([
      { name: "[Content_Types].xml", text: H + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>' },
      { name: "_rels/.rels", text: H + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' },
      { name: "xl/workbook.xml", text: H + '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="opening_closing_gudang_detail_2" sheetId="1" r:id="rId1"/></sheets></workbook>' },
      { name: "xl/_rels/workbook.xml.rels", text: H + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>' },
      { name: "xl/styles.xml", text: STYLES },
      { name: "xl/worksheets/sheet1.xml", text: sheetXml() }
    ]);
    var name = "opening_closing_" + date.replace(/-/g, "") + ".xlsx";
    if (window.navigator.msSaveBlob) { window.navigator.msSaveBlob(blob, name); return; }
    var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.parentNode.removeChild(a); }, 1000);
    toast("File Excel diunduh.");
  }

  window.OpeningClosing = { render: render };
})();
