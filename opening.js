/* Website Opening & Closing — meniru form "OPENING/CLOSING GUDANG" di website asli (AQUA & VIT).
   Input stok fisik per gudang + export Excel. Ringan & kompatibel Chrome 109 (Windows 7). */
(function () {
  "use strict";
  var DEPO = "281 | LP PARUNG";
  var GUDANG = [
    { key: "layak", label: "LAYAK - GUDANG LAYAK PARUNG" },
    { key: "bs", label: "BS - GUDANG BS PARUNG" },
    { key: "reject", label: "REJECT - GUDANG REJECT PARUNG" },
    { key: "pet", label: "LAYAK - GUDANG LAYAK PET PARUNG" }
  ];
  /* Urutan & kode sama persis dengan website asli: [kode, nama, unit] */
  var PRODUCTS = [
    ["124172", "AQ.600ML MP 1X6", "PACK"], ["134578", "AQ.220ML 1X48", "BOX"],
    ["142009", "AQ.1100ML LOCAL 1X12", "BOX"], ["166126", "AQ.220ML MINI BOTTLE LOCAL 1X24", "BOX"],
    ["174137", "AQ.380ML REFLECTIONS BAL SPARKLING 1X12", "BOX"], ["174139", "AQ.380ML REFLECTIONS BAL 1X12", "BOX"],
    ["186452", "AQ.380ML REFLECTIONS BAL SBUX 1X12", "BOX"], ["204579", "AQ.200ML 1X48", "BOX"],
    ["208575", "AQ.600ML 1X24 ID GOSOK", "BOX"], ["208575P", "AQ.600ML 1X1 ID GOSOK", "PCS"],
    ["74553", "AQ.1500ML 1X12", "BOX"], ["74556", "AQ.330ML 1X24", "BOX"],
    ["74557", "AQ.330ML LOCAL HOKBEN 1X24", "BOX"], ["74559", "AQ.5GALLON ISI", "BOTOL"],
    ["74561", "AQ.600ML 1X24", "BOX"], ["74589", "AQ.1500ML MP 1X6", "PACK"],
    ["81681", "AQ.750ML 1X18", "BOX"], ["145141", "MIZONE ACTIV LYCHEE LEMON 500ML 1X12", "BOX"],
    ["145143", "MIZONE MOOD UP CRANBERRY 500ML 1X12", "BOX"], ["206774", "MIZONE COCO BOST 500ML 1X12", "BOX"],
    ["112839", "VT.330ML 1X24", "BOX"], ["157095", "VT.550ML 1X24", "BOX"],
    ["164026", "VT.220ML BOTTLE LOCAL 1X24", "BOX"], ["173022", "VT.200ML 1X48", "BOX"],
    ["74560", "VT.5GALLON ISI", "BOTOL"], ["74565", "VT.1500ML 1X12", "BOX"],
    ["10169743", "JUGRACK", "UNIT"], ["10169732", "VT.5GALLON BTL", "BOTOL"],
    ["10516937", "JUG AQUA 19L PC 55 MM", "BOTOL"]
  ];
  /* Urutan lama (versi sebelumnya) — dipakai hanya untuk memindahkan data tersimpan ke urutan baru. */
  var OLD_NAMES = ["JUGRACK", "VT.5GALLON BTL", "JUG AQUA 19L PC 55 MM", "VT.330ML 1X24", "AQ.600ML MP 1X6", "AQ.220ML 1X48", "AQ.1100ML LOCAL 1X12", "MIZONE ACTIV LYCHEE LEMON 500ML 1X12", "MIZONE MOOD UP CRANBERRY 500ML 1X12", "VT.550ML 1X24", "VT.220ML BOTTLE LOCAL 1X24", "AQ.220ML MINI BOTTLE LOCAL 1X24", "VT.200ML 1X48", "AQ.380ML REFLECTIONS BAL SPARKLING 1X12", "AQ.380ML REFLECTIONS BAL 1X12", "AQ.380ML REFLECTIONS BAL SBUX 1X12", "AQ.200ML 1X48", "MIZONE COCO BOST 500ML 1X12", "AQ.600ML 1X24 ID GOSOK", "AQ.600ML 1X1 ID GOSOK", "AQ.1500ML 1X12", "AQ.330ML 1X24", "AQ.330ML LOCAL HOKBEN 1X24", "AQ.5GALLON ISI", "VT.5GALLON ISI", "AQ.600ML 1X24", "VT.1500ML 1X12", "AQ.1500ML MP 1X6", "AQ.750ML 1X18"];
  var OLD_TBG = { layak: "281-0014410", bs: "281-0014411", reject: "281-0014412", pet: "281-0014414" };
  var LS_KEY = "lp_openclose_v2", LS_OLD = "lp_openclose_v1";
  var db = {}, date = "", phase = "open", openKey = "layak", saveT = null, root = null;

  function plabel(i) { return PRODUCTS[i][0] + " | " + PRODUCTS[i][1]; }

  var loaded = false;
  function migrate(old) {
    var map = {}, out = {};
    PRODUCTS.forEach(function (p, i) { map[p[1]] = i; });
    for (var dt in old) {
      out[dt] = {};
      for (var ph in old[dt]) {
        var r = old[dt][ph], nr = { time: r.time || "", user: r.user || "", g: {} };
        for (var gk in (r.g || {})) {
          var og = r.g[gk], ng = { tbg: og.tbg === OLD_TBG[gk] ? "" : (og.tbg || ""), q: {} };
          for (var k in (og.q || {})) { var ni = map[OLD_NAMES[k]]; if (ni !== undefined && og.q[k] !== "") ng.q[ni] = og.q[k]; }
          nr.g[gk] = ng;
        }
        out[dt][ph] = nr;
      }
    }
    return out;
  }
  function load() {
    if (loaded) return; loaded = true;
    try {
      var cur = localStorage.getItem(LS_KEY);
      if (cur) { db = JSON.parse(cur) || {}; return; }
      var old = localStorage.getItem(LS_OLD);
      db = old ? migrate(JSON.parse(old) || {}) : {};
      if (old) localStorage.setItem(LS_KEY, JSON.stringify(db));
    } catch (e) { db = {}; }
  }
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
    GUDANG.forEach(function (g) { if (!r.g[g.key]) r.g[g.key] = { tbg: "", q: {} }; });
    return r;
  }
  function peek(ph) {
    var day = db[date] || {}, r = day[ph] || { time: "", user: "", g: {} };
    var out = { time: r.time || "", user: r.user || "", g: {} };
    GUDANG.forEach(function (gd) { out.g[gd.key] = r.g && r.g[gd.key] ? r.g[gd.key] : { tbg: "", q: {} }; });
    return out;
  }

  /* ------------------------------ UI ------------------------------ */
  var CHEV = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="m6 9 6 6 6-6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function rowsHtml(g) {
    var h = "";
    for (var i = 0; i < PRODUCTS.length; i++) {
      var q = g.q[i] === undefined ? "" : g.q[i], u = PRODUCTS[i][2];
      h += '<div class="oc-row" data-i="' + i + '">' +
        '<label class="oc-pname" for="oc-' + i + '">' + esc(plabel(i)) + '</label>' +
        '<div class="oc-grp"><input id="oc-' + i + '" class="oc-in" type="text" inputmode="numeric" enterkeyhint="next" autocomplete="off" value="' + esc(q) + '">' +
        '<span class="oc-u u-' + esc(u.toLowerCase()) + '">' + esc(u) + '</span></div></div>';
    }
    return h;
  }

  function listHtml() {
    var r = rec(phase), h = "";
    GUDANG.forEach(function (gd) {
      var g = r.g[gd.key], open = openKey === gd.key;
      h += '<div class="oc-acc' + (open ? " open" : "") + '" data-key="' + gd.key + '">' +
        '<button type="button" class="oc-acc-btn" data-toggle="' + gd.key + '" aria-expanded="' + open + '">' +
        '<span class="oc-acc-name">' + esc(gd.label) + '</span>' + CHEV + '</button>';
      if (open) {
        h += '<div class="oc-acc-body">' + rowsHtml(g) +
          '<div class="oc-row oc-row-tbg"><label class="oc-pname" for="oc-tbg">DOC DMS TBG</label>' +
          '<input id="oc-tbg" class="oc-tbg-in" type="text" autocomplete="off" value="' + esc(g.tbg) + '"></div></div>';
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
      '<section class="section oc-page ' + (isOpen ? "is-open" : "is-close") + '"><div class="oc-wrap">' +
      '<div class="oc-head"><h1 class="oc-title">Website Opening &amp; Closing</h1>' +
      '<p class="oc-sub">Isi stok fisik tiap gudang saat <b>Opening</b> dan <b>Closing</b>, lalu unduh hasilnya sebagai file Excel. Data tersimpan otomatis di perangkat ini.</p></div>' +
      '<div class="oc-info">' +
      '<div class="oc-seg" role="tablist"><button type="button" class="' + (isOpen ? "on" : "") + '" data-phase="open">Opening</button><button type="button" class="' + (!isOpen ? "on" : "") + '" data-phase="close">Closing</button></div>' +
      '<label class="oc-fld"><span>Tanggal</span><input type="date" id="ocDate" value="' + date + '"></label>' +
      '<label class="oc-fld"><span>Jam ' + (isOpen ? "Opening" : "Closing") + '</span><input type="time" id="ocTime" value="' + esc(r.time) + '"></label>' +
      '<label class="oc-fld oc-fld-wide"><span>Nama User ' + (isOpen ? "Opening" : "Closing") + '</span><input type="text" id="ocUser" placeholder="Nama lengkap" value="' + esc(r.user) + '"></label></div>' +
      '<div class="oc-tools"><button type="button" class="oc-btn main" data-oct="import">📥 Tempel / Unggah Data</button><button type="button" class="oc-btn ghost" data-oct="check">✅ Cek Akhir</button><button type="button" class="oc-btn ghost" data-oct="backup">💾 Cadangan &amp; Riwayat</button></div>' +
      '<div class="oc-card"><div class="oc-card-bar"><b>' + (isOpen ? "OPENING" : "CLOSING") + ' GUDANG</b><span>' + esc(fmtDate(date)) + '</span></div>' +
      '<div class="oc-card-body"><div class="oc-line"><span class="oc-lbl">Depo</span><div class="oc-depo-val">' + DEPO + '</div></div>' +
      '<div class="oc-line oc-line-top"><span class="oc-lbl">QTY Fisik</span><div class="oc-list" id="ocList">' + listHtml() + '</div></div></div>' +
      '<div class="oc-card-foot"><button type="button" class="oc-btn ghost" id="ocReset">Kosongkan</button><button type="button" class="oc-btn ghost" id="ocSave">Simpan</button><button type="button" class="oc-btn main" id="ocXls">Unduh Excel</button></div></div>' +
      '<p class="oc-note">File Excel berisi <b>Opening dan Closing</b> tanggal yang dipilih (PRODUCT · Unit · QTY).</p>' +
      '</div></section>';
    bind(app);
  }

  function toast(m) { var t = document.createElement("div"); t.className = "oc-toast"; t.textContent = m; document.body.appendChild(t); setTimeout(function () { t.parentNode && t.parentNode.removeChild(t); }, 2200); }

  function bind(app) {
    app.onclick = function (e) {
      var t = e.target;
      if (!t.closest || !t.closest(".oc-page")) return;
      var b = t.closest("[data-toggle],[data-phase],[data-oct],#ocReset,#ocSave,#ocXls");
      if (!b) return;
      if (b.hasAttribute("data-oct")) { save(true); if (window.OCTools) window.OCTools.open(b.getAttribute("data-oct"), api); else toast("Modul alat belum termuat."); return; }
      if (b.hasAttribute("data-toggle")) {
        var k = b.getAttribute("data-toggle"); openKey = openKey === k ? "" : k;
        document.getElementById("ocList").innerHTML = listHtml();
        if (openKey) { var el = app.querySelector('.oc-acc[data-key="' + openKey + '"]'); if (el && el.scrollIntoView) el.scrollIntoView({ block: "nearest" }); }
      } else if (b.hasAttribute("data-phase")) { save(true); phase = b.getAttribute("data-phase"); render(app); }
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
      var acc = t.closest(".oc-acc");
      if (!acc) return;
      var g = r.g[acc.getAttribute("data-key")];
      if (t.classList.contains("oc-tbg-in")) { g.tbg = t.value; save(); return; }
      if (t.classList.contains("oc-in")) {
        var clean = t.value.replace(/[^0-9]/g, ""); if (clean !== t.value) t.value = clean;
        var idx = t.closest(".oc-row").getAttribute("data-i");
        if (clean === "") delete g.q[idx]; else g.q[idx] = clean;
        save();
      }
    };
    /* Enter = pindah ke kolom berikutnya (praktis untuk input cepat di HP & PC) */
    app.onkeydown = function (e) {
      var t = e.target;
      if (e.key !== "Enter" || !t.classList || !t.classList.contains("oc-in")) return;
      e.preventDefault();
      var all = t.closest(".oc-acc-body").querySelectorAll(".oc-in,.oc-tbg-in"), n = -1;
      for (var i = 0; i < all.length; i++) if (all[i] === t) { n = i; break; }
      if (all[n + 1]) all[n + 1].focus();
    };
    app.onchange = function (e) {
      if (e.target.id === "ocDate" && e.target.value && e.target.closest && e.target.closest(".oc-page")) { save(true); date = e.target.value; render(app); }
    };
  }

  /* --------------------- Excel (.xlsx) tanpa library --------------------- */
  function col(n) { return "ABCDE".charAt(n); }
  function xmlEsc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function sheetXml() {
    var rows = [], merges = [], r = 0;
    function line(cells, ht) { r++; rows.push({ r: r, cells: cells, ht: ht }); return r; }
    function blank() { r++; }
    function c(ci, v, st) { return { c: ci, v: v, s: st }; }
    line([c(0, "DETAIL OPENING CLOSING GUDANG", 1)], 18); blank();
    line([c(0, "Depo", 2), c(1, ": " + DEPO, 0)]);
    line([c(0, "Tanggal", 2), c(1, ": " + fmtDate(date), 0)]); blank();
    ["open", "close"].forEach(function (ph) {
      var x = peek(ph);
      line([c(0, (ph === "open" ? "OPENING" : "CLOSING") + " | " + (x.time || ""), 1)], 18); blank();
      GUDANG.forEach(function (gd) {
        var g = x.g[gd.key], rr = line([c(0, gd.label, 3), c(1, "", 3), c(2, "", 3)]);
        merges.push("A" + rr + ":C" + rr);
        line([c(0, "PRODUCT", 3), c(1, "Unit", 3), c(2, "QTY", 3)]);
        for (var i = 0; i < PRODUCTS.length; i++) {
          var q = g.q[i];
          line([c(0, plabel(i), 4), c(1, PRODUCTS[i][2], 5), c(2, q === undefined ? null : +q, 5)], 15);
        }
        var tr = line([c(0, "DOC DMS TBG : " + (g.tbg || ""), 6), c(1, "", 6), c(2, "", 6)]);
        merges.push("A" + tr + ":C" + tr); blank();
      });
    });
    line([c(0, "VALIDASI LIST", 1)], 18); blank();
    line([c(0, "No", 3), c(1, "User", 3), c(2, "Branch", 3), c(3, "Roles", 3), c(4, "Datetime", 3)]);
    var vr = line([c(0, "Belum ada validasi", 5), c(1, "", 5), c(2, "", 5), c(3, "", 5), c(4, "", 5)]); merges.push("A" + vr + ":E" + vr); blank();
    line([c(0, "User Opening", 2), c(1, ":", 0), c(2, peek("open").user, 0)]);
    line([c(0, "User Closing", 2), c(1, ":", 0), c(2, peek("close").user, 0)]);
    var xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><sheetViews><sheetView showGridLines="0" workbookViewId="0"/></sheetViews><sheetFormatPr defaultRowHeight="15"/><cols><col min="1" max="1" width="52" customWidth="1"/><col min="2" max="2" width="14" customWidth="1"/><col min="3" max="3" width="16" customWidth="1"/><col min="4" max="4" width="12" customWidth="1"/><col min="5" max="5" width="18" customWidth="1"/></cols><sheetData>';
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

  var api = {
    products: PRODUCTS, gudang: GUDANG, depo: DEPO, rec: rec, peek: peek, save: save, toast: toast, fmtDate: fmtDate,
    phase: function () { return phase; }, setPhase: function (p) { phase = p; },
    date: function () { return date; }, setDate: function (d) { date = d; },
    db: function () { return db; }, setDb: function (d) { db = d || {}; },
    rerender: function () { if (root) render(root); }
  };
  window.OpeningClosing = { render: render, api: api };
})();
