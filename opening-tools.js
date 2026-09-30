/* Alat bantu Opening & Closing: (1) Tempel/Unggah Excel/CSV/gambar dengan pencocokan KODE,
   (2) Bandingkan dengan file Export website asli, (3) Peringatan otomatis, (4) Cek Akhir, (5) Cadangan & Riwayat.
   ES5 murni — aman untuk Chrome 109 (Windows 7). OCR (Tesseract.js) dimuat hanya saat dipakai. */
(function () {
  "use strict";
  var A, ov = null, pend = null, src = "", mode = "fill", CHK_KEY = "lp_oc_chk", chk = {};
  var COLS = ["layak", "bs", "reject", "pet"], COLN = ["Layak", "BS", "Reject", "Layak Pet"];
  function $(s, r) { return (r || ov).querySelector(s); }
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "."); }
  function codeMap() { var m = {}; A.products.forEach(function (p, i) { m[p[0].toUpperCase()] = i; }); return m; }
  function group(i) { var n = A.products[i][1]; return /GALLON|JUG/.test(n) ? "Galon & Jug" : /^AQ/.test(n) ? "AQ" : /^VT/.test(n) ? "VT" : /^MIZONE/.test(n) ? "MIZONE" : "Lain"; }
  function loadChk() { try { chk = JSON.parse(localStorage.getItem(CHK_KEY)) || {}; } catch (e) { chk = {}; } }
  function saveChk() { try { localStorage.setItem(CHK_KEY, JSON.stringify(chk)); } catch (e) {} }

  /* ---------- modal ---------- */
  function openModal(title, html) {
    close();
    ov = document.createElement("div"); ov.className = "ot-ov";
    ov.innerHTML = '<div class="ot-box oc-page ' + (A.phase() === "open" ? "is-open" : "is-close") + '"><div class="ot-hd"><b>' + title + '</b><button class="ot-x" type="button" data-x>×</button></div><div class="ot-bd">' + html + '</div></div>';
    document.body.appendChild(ov);
    ov.addEventListener("mousedown", function (e) { if (e.target === ov) close(); });
    return ov;
  }
  function close() { if (ov && ov.parentNode) ov.parentNode.removeChild(ov); ov = null; }

  /* ---------- pembaca teks: baris dengan KODE + 4 angka ---------- */
  function toInt(t) { t = t.replace(/[Oo]/g, "0").replace(/[lI|]/g, "1"); if (/^\d{1,3}([.,]\d{3})+$/.test(t)) t = t.replace(/[.,]/g, ""); return parseInt(t, 10); }
  function parseText(text, ocr) {
    var cm = codeMap(), out = [], seen = {}, curG = null, ph = null, fmtB = false;
    text.split(/\r?\n/).forEach(function (ln) {
      var up = ln.toUpperCase().replace(/\t/g, " ").trim();
      var cells = ln.indexOf("\t") >= 0 ? ln.split("\t") : ln.trim().split(/\s+/);
      /* Format B: file Export (PRODUCT | Unit | QTY) */
      var mb = /^"?(\d{4,8}P?) \| /i.exec(ln.trim());
      if (mb) {
        fmtB = true; var c = mb[1].toUpperCase(), q = NaN;
        for (var i = cells.length - 1; i > 0; i--) { if (/^\s*\d+\s*$/.test(cells[i])) { q = parseInt(cells[i], 10); break; } }
        if (!curG || (ph && ph !== A.phase())) return;
        var e = seen[c]; if (!e) { e = seen[c] = { code: c, v: {}, n: {} }; out.push(e); }
        if (!isNaN(q)) e.v[curG] = q; return;
      }
      if (/^OPENING\b/.test(up)) { ph = "open"; return; } if (/^CLOSING\b/.test(up)) { ph = "close"; return; }
      var hg = /^(LAYAK|BS|REJECT)\s*-\s*GUDANG\s*(LAYAK PET|LAYAK|BS|REJECT)?/.exec(up);
      if (hg) { curG = /PET/.test(up) ? "pet" : /^BS/.test(up) ? "bs" : /^REJECT/.test(up) ? "reject" : "layak"; return; }
      /* Format A: tabel Excel KODE | NAMA | Satuan | Layak | BS | Reject | Layak Pet */
      var toks = cells.map(function (x) { return x.replace(/^"|"$/g, "").trim(); }).filter(function (x) { return x !== ""; });
      if (!toks.length) return;
      var ci = -1; for (var k = 0; k < Math.min(toks.length, 2); k++) if (/^\d{4,8}P?$/i.test(toks[k])) { ci = k; break; }
      if (ci < 0) return;
      var code = toks[ci].toUpperCase(), nums = [];
      toks.slice(ci + 1).forEach(function (t) { if (/^[\dOolI|][\dOolI|.,]*$/.test(t)) { var n = toInt(t); if (!isNaN(n)) nums.push(n); } });
      var e2 = { code: code, v: {}, n: {}, ocr: !!ocr };
      var t4 = nums.slice(-4);
      if (t4.length === 4) COLS.forEach(function (c2, j) { e2.v[c2] = t4[j]; });
      else e2.short = true;
      if (seen[code]) return; seen[code] = e2; out.push(e2);
    });
    return out;
  }

  /* ---------- pembaca .xlsx tanpa library (DecompressionStream) ---------- */
  function readZip(buf) {
    var dv = new DataView(buf), u8 = new Uint8Array(buf), i = u8.length - 22;
    while (i >= 0 && dv.getUint32(i, true) !== 0x06054b50) i--;
    if (i < 0) throw new Error("Bukan file xlsx");
    var n = dv.getUint16(i + 10, true), p = dv.getUint32(i + 16, true), files = {}, dec = new TextDecoder();
    for (var k = 0; k < n; k++) {
      var meth = dv.getUint16(p + 10, true), cs = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), lo = dv.getUint32(p + 42, true);
      var name = dec.decode(u8.subarray(p + 46, p + 46 + nl)), ds = lo + 30 + dv.getUint16(lo + 26, true) + dv.getUint16(lo + 28, true);
      files[name] = { meth: meth, data: u8.subarray(ds, ds + cs) }; p += 46 + nl + xl + cl;
    }
    return files;
  }
  function inflate(f) {
    if (f.meth === 0) return Promise.resolve(new TextDecoder().decode(f.data));
    var ds = new DecompressionStream("deflate-raw");
    return new Response(new Blob([f.data]).stream().pipeThrough(ds)).text();
  }
  function xlsxToText(buf) {
    var z = readZip(buf), sheetName = null;
    for (var nm in z) if (/^xl\/worksheets\/sheet\d+\.xml$/.test(nm) && (!sheetName || nm < sheetName)) sheetName = nm;
    if (!sheetName) return Promise.reject(new Error("Sheet tidak ditemukan"));
    return Promise.all([z["xl/sharedStrings.xml"] ? inflate(z["xl/sharedStrings.xml"]) : Promise.resolve(""), inflate(z[sheetName])]).then(function (r) {
      var ss = [], dp = new DOMParser();
      if (r[0]) [].forEach.call(dp.parseFromString(r[0], "text/xml").getElementsByTagName("si"), function (si) { ss.push([].map.call(si.getElementsByTagName("t"), function (t) { return t.textContent; }).join("")); });
      var lines = [];
      [].forEach.call(dp.parseFromString(r[1], "text/xml").getElementsByTagName("row"), function (row) {
        var cells = [];
        [].forEach.call(row.getElementsByTagName("c"), function (c) {
          var ref = c.getAttribute("r") || "", L = ref.replace(/\d/g, ""), ix = 0, t = c.getAttribute("t"), v = c.getElementsByTagName("v")[0], val = "";
          for (var q = 0; q < L.length; q++) ix = ix * 26 + (L.charCodeAt(q) - 64);
          if (t === "inlineStr") val = c.textContent; else if (v) val = t === "s" ? (ss[+v.textContent] || "") : v.textContent;
          cells[ix - 1] = val;
        });
        var a = []; for (var z2 = 0; z2 < cells.length; z2++) a.push(cells[z2] == null ? "" : cells[z2]);
        lines.push(a.join("\t"));
      });
      return lines.join("\n");
    });
  }

  /* ---------- OCR gambar (opsional, dimuat saat dipakai) ---------- */
  function loadScript(url) { return new Promise(function (ok, no) { var s = document.createElement("script"); s.src = url; s.onload = ok; s.onerror = function () { no(new Error("Gagal memuat OCR (perlu internet)")); }; document.head.appendChild(s); }); }
  function prep(file) {
    return new Promise(function (ok) {
      var img = new Image(), u = URL.createObjectURL(file);
      img.onload = function () {
        var sc = img.width < 1600 ? 2 : 1, c = document.createElement("canvas"); c.width = img.width * sc; c.height = img.height * sc;
        var x = c.getContext("2d"); x.drawImage(img, 0, 0, c.width, c.height);
        var d = x.getImageData(0, 0, c.width, c.height), p = d.data;
        for (var i = 0; i < p.length; i += 4) { var g = p[i] * .3 + p[i + 1] * .59 + p[i + 2] * .11; g = g > 150 ? 255 : g < 110 ? 0 : g; p[i] = p[i + 1] = p[i + 2] = g; }
        x.putImageData(d, 0, 0); URL.revokeObjectURL(u); ok(c);
      };
      img.src = u;
    });
  }
  function doOcr(file, status) {
    status("Memuat mesin OCR…");
    return (window.Tesseract ? Promise.resolve() : loadScript("https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js")).then(function () { return prep(file); }).then(function (cv) {
      return window.Tesseract.recognize(cv, "eng", { logger: function (m) { if (m.status === "recognizing text") status("Membaca gambar… " + Math.round(m.progress * 100) + "%"); } });
    }).then(function (r) { return r.data.text; });
  }

  /* ---------- IMPOR ---------- */
  function importUI() {
    openModal("Tempel / Unggah Data — " + (A.phase() === "open" ? "OPENING" : "CLOSING") + " " + A.fmtDate(A.date()),
      '<div class="ot-drop"><b>1. Tempel dari Excel</b> (paling akurat): salin kolom <b>KODE … Layak Pet</b>, klik kotak di bawah, tekan Ctrl+V.' +
      '<textarea id="otTxt" placeholder="Tempel di sini (Ctrl+V)… atau tempel gambar screenshot"></textarea>' +
      '<div class="ot-row"><button class="oc-btn main" type="button" id="otRead">Baca tempelan</button>' +
      '<label class="oc-btn ghost" style="cursor:pointer">📂 Unggah file / gambar<input type="file" id="otFile" accept=".xlsx,.csv,.txt,image/*" style="display:none"></label><span class="ot-busy" id="otBusy"></span></div>' +
      '<p class="ot-hint">Mendukung: tempel Excel · file .xlsx/.csv · gambar (JPG/PNG, OCR) · <b>file Export website asli</b> (untuk perbandingan). Pencocokan memakai <b>KODE</b>, bukan nama atau urutan.</p></div>' +
      '<div id="otPrev"></div>');
    var busy = $("#otBusy"), say = function (t) { busy.textContent = t || ""; };
    $("#otRead").onclick = function () { run($("#otTxt").value, false); };
    $("#otTxt").addEventListener("paste", function (e) {
      var it = (e.clipboardData || {}).items || [];
      for (var i = 0; i < it.length; i++) if (it[i].type.indexOf("image") === 0) { e.preventDefault(); fileIn(it[i].getAsFile()); return; }
    });
    $("#otFile").onchange = function () { if (this.files[0]) fileIn(this.files[0]); };
    function run(text, ocr) { var r = parseText(text, ocr); if (!r.length) { $("#otPrev").innerHTML = '<div class="ot-alert r">Tidak ada baris dengan KODE produk yang terbaca. Pastikan kolom KODE ikut disalin.</div>'; return; } pend = r; preview(); }
    function fileIn(f) {
      var n = f.name.toLowerCase(); say("Membaca " + f.name + "…");
      var p;
      if (/^image\//.test(f.type) || /\.(jpe?g|png|webp)$/.test(n)) p = doOcr(f, say).then(function (t) { run(t, true); });
      else if (/\.xlsx$/.test(n)) p = f.arrayBuffer().then(xlsxToText).then(function (t) { run(t, false); });
      else if (/\.xls$/.test(n)) { say(""); $("#otPrev").innerHTML = '<div class="ot-alert r">Format .xls lama belum didukung. Simpan sebagai .xlsx atau tempel langsung dari Excel.</div>'; return; }
      else p = f.text().then(function (t) { run(t.replace(/;/g, "\t").replace(/^([^\t\n]*,[^\t\n]*)$/gm, function (l) { return l.split(",").join("\t"); }), false); });
      p.then(function () { say(""); }, function (e) { say(""); $("#otPrev").innerHTML = '<div class="ot-alert r">Gagal: ' + esc(e.message) + '. Coba tempel dari Excel.</div>'; });
    }
  }

  function preview() {
    var cm = codeMap(), cur = A.rec(A.phase()), h = "", ok = 0, unk = 0, miss = 0, dif = 0, tot = { layak: 0, bs: 0, reject: 0, pet: 0 }, hit = {};
    pend.forEach(function (e, r) {
      var idx = cm[e.code], cls = "ok", st = "✔ Cocok";
      if (idx === undefined) { cls = "warn"; st = "⚠ Kode tidak ada di website — dilewati"; unk++; }
      else if (e.short) { cls = "warn"; st = "⚠ Angka kurang dari 4 kolom"; miss++; }
      else ok++;
      if (idx !== undefined) hit[idx] = 1;
      h += '<tr class="' + cls + '"><td><b>' + esc(e.code) + '</b></td><td>' + esc(idx !== undefined ? A.products[idx][1] : "—") + '</td>';
      COLS.forEach(function (c) {
        var v = e.v[c], old = idx !== undefined ? cur.g[c].q[idx] : undefined, df = mode === "compare" && v !== undefined && String(v) !== String(old === undefined ? "" : old);
        if (df) dif++;
        if (idx !== undefined && v !== undefined && !e.short) tot[c] += v;
        h += '<td class="' + (df ? "diff" : "") + (e.ocr ? " unsure" : "") + '"><input data-r="' + r + '" data-c="' + c + '" inputmode="numeric" value="' + (v === undefined ? "" : v) + '">' +
          (mode === "compare" && v !== undefined ? '<small>' + (df ? "Form: " + (old === undefined ? "kosong" : old) : "") + '</small>' : (v !== undefined && old !== undefined && String(old) !== String(v) ? '<small>sebelumnya ' + old + '</small>' : "")) + '</td>';
      });
      h += '<td class="st">' + st + '</td></tr>';
    });
    var notIn = []; A.products.forEach(function (p, i) { if (!hit[i]) notIn.push(p[0]); });
    $("#otPrev").innerHTML =
      '<h3>2. Periksa hasil baca (angka boleh dikoreksi)</h3>' +
      '<div class="ot-sum"><span class="ot-chip g">' + ok + ' baris cocok</span>' + (unk ? '<span class="ot-chip y">' + unk + ' kode tidak dikenal</span>' : "") + (miss ? '<span class="ot-chip y">' + miss + ' kurang angka</span>' : "") +
      COLS.map(function (c, j) { return '<span class="ot-chip">Total ' + COLN[j] + ': ' + fmt(tot[c]) + '</span>'; }).join("") + '</div>' +
      (src === "" ? "" : "") + (pend.some(function (e) { return e.ocr; }) ? '<div class="ot-alert">Hasil OCR: sel kuning = kurang pasti. Cocokkan total di atas dengan total Excel; OCR bisa keliru membaca 1/7 atau 0/8.</div>' : "") +
      (notIn.length ? '<div class="ot-alert">Produk website yang tidak ada di data ini (tetap kosong): ' + notIn.length + ' produk.</div>' : "") +
      '<div class="ot-row"><label><input type="radio" name="otm" value="fill"' + (mode === "fill" ? " checked" : "") + '> Isi ke form</label> <label><input type="radio" name="otm" value="compare"' + (mode === "compare" ? " checked" : "") + '> Bandingkan saja (tanda merah = beda dengan form)</label>' +
      (mode === "fill" ? ' <label><input type="checkbox" id="otOver" checked> Timpa isian yang sudah ada</label>' : "") + '</div>' +
      (mode === "compare" ? '<div class="ot-alert ' + (dif ? "r" : "g") + '">' + (dif ? dif + " angka berbeda dengan isian di form." : "Semua angka sama dengan isian di form ✔") + '</div>' : "") +
      '<div class="ot-tbl-w"><table class="ot-tbl"><thead><tr><th>Kode</th><th>Produk (website)</th>' + COLN.map(function (n) { return "<th>" + n + "</th>"; }).join("") + '<th>Status</th></tr></thead><tbody>' + h + '</tbody></table></div>' +
      (mode === "fill" ? '<div class="ot-row"><button class="oc-btn main" type="button" id="otApply">Masukkan ke form (' + ok + ' produk)</button></div>' : "");
    var box = $("#otPrev");
    [].forEach.call(box.querySelectorAll("input[type=radio]"), function (r) { r.onchange = function () { mode = this.value; preview(); }; });
    [].forEach.call(box.querySelectorAll(".ot-tbl input"), function (i) {
      i.oninput = function () { var v = this.value.replace(/\D/g, ""); this.value = v; var e = pend[+this.getAttribute("data-r")]; if (v === "") delete e.v[this.getAttribute("data-c")]; else e.v[this.getAttribute("data-c")] = parseInt(v, 10); e.ocr = false; };
      i.onchange = function () { preview(); };
    });
    if ($("#otApply")) $("#otApply").onclick = apply;
  }
  function apply() {
    var cm = codeMap(), r = A.rec(A.phase()), over = $("#otOver").checked, n = 0;
    pend.forEach(function (e) {
      var i = cm[e.code]; if (i === undefined) return;
      COLS.forEach(function (c) { var v = e.v[c]; if (v === undefined) return; if (!over && r.g[c].q[i] !== undefined) return; r.g[c].q[i] = String(v); n++; });
    });
    A.save(true); close(); A.rerender(); A.toast(n + " angka dimasukkan. Buka Cek Akhir untuk memeriksa.");
  }

  /* ---------- PERINGATAN ---------- */
  function prevDate(d) { var ks = Object.keys(A.db()).filter(function (k) { return k < d; }).sort(); return ks.length ? ks[ks.length - 1] : null; }
  function warnings() {
    var out = [], ph = A.phase(), d = A.date(), r = A.peek(ph), db = A.db();
    A.gudang.forEach(function (gd) {
      var g = r.g[gd.key], blank = 0;
      A.products.forEach(function (p, i) { if (g.q[i] === undefined || g.q[i] === "") blank++; });
      if (blank === A.products.length) out.push(["y", gd.label + ": belum diisi sama sekali."]);
      else if (blank) out.push(["y", gd.label + ": " + blank + " produk masih kosong (isi 0 bila memang nol)."]);
    });
    A.products.forEach(function (p, i) {
      var L = +(r.g.layak.q[i] || 0), B = +(r.g.bs.q[i] || 0), R = +(r.g.reject.q[i] || 0);
      if (B > L && B > 0 && L > 0) out.push(["y", p[0] + " | " + p[1] + ": BS (" + fmt(B) + ") lebih besar dari Layak (" + fmt(L) + "). Pastikan tidak tertukar."]);
      var hist = []; Object.keys(db).forEach(function (k) { var q = db[k][ph] && db[k][ph].g.layak && db[k][ph].g.layak.q[i]; if (k !== d && q !== undefined && q !== "") hist.push(+q); });
      if (hist.length >= 3 && L > 0) { hist.sort(function (a, b) { return a - b; }); var md = hist[hist.length >> 1]; if (md > 0 && (L > md * 3 || L < md / 3)) out.push(["y", p[0] + " | " + p[1] + ": Layak " + fmt(L) + " jauh beda dari biasanya (±" + fmt(md) + ")."]); }
    });
    if (ph === "open") {
      var pd = prevDate(d), pc = pd && db[pd].close;
      if (pc) { var dd = 0; A.gudang.forEach(function (gd) { A.products.forEach(function (p, i) { var a = pc.g[gd.key] && pc.g[gd.key].q[i], b = r.g[gd.key].q[i]; if (a !== undefined && b !== undefined && a !== "" && b !== "" && +a !== +b) { if (dd++ < 12) out.push(["r", "Opening ≠ Closing " + A.fmtDate(pd) + " — " + gd.key.toUpperCase() + " " + p[0] + " | " + p[1] + ": Closing " + fmt(a) + ", Opening " + fmt(b) + "."]); } }); });
        if (dd > 12) out.push(["r", "…dan " + (dd - 12) + " selisih Opening/Closing lainnya."]);
        if (!dd) out.push(["g", "Opening sama dengan Closing " + A.fmtDate(pd) + " ✔"]);
      } else out.push(["y", "Belum ada data Closing hari sebelumnya untuk dibandingkan."]);
    }
    return out;
  }

  /* ---------- CEK AKHIR ---------- */
  function checkUI() {
    loadChk();
    var ph = A.phase(), d = A.date(), r = A.peek(ph), w = warnings(), bad = w.filter(function (x) { return x[0] !== "g"; }).length, h = "";
    h += '<div class="ot-alert ' + (bad ? "r" : "g") + '"><b>' + (bad ? bad + " hal perlu diperiksa sebelum Save di website asli." : "Tidak ada peringatan ✔ Siap diketik ke website asli.") + '</b></div>';
    h += w.map(function (x) { return '<div class="ot-alert ' + (x[0] === "y" ? "" : x[0]) + '">' + esc(x[1]) + '</div>'; }).join("");
    h += '<div class="ot-row"><label><input type="checkbox" id="otHide"> Sembunyikan baris yang sudah dicentang</label><button class="oc-btn ghost" type="button" id="otClr">Reset centang</button></div>';
    A.gudang.forEach(function (gd) {
      var g = r.g[gd.key], sum = {}, tot = 0, rows = "";
      A.products.forEach(function (p, i) {
        var q = g.q[i], k = d + "|" + ph + "|" + gd.key + "|" + i, e = q === undefined || q === "";
        if (!e) { var gn = group(i); sum[gn] = (sum[gn] || 0) + (+q); tot += +q; }
        rows += '<label class="ot-big' + (chk[k] ? " done" : "") + '" data-k="' + k + '"><input type="checkbox"' + (chk[k] ? " checked" : "") + '><span class="n">' + esc(p[0]) + '<small>' + esc(p[1]) + '</small></span><span class="q' + (e ? " e" : "") + '">' + (e ? "—" : fmt(q)) + '</span><small>' + esc(p[2]) + '</small></label>';
      });
      h += '<div class="ot-gh"><span>' + esc(gd.label) + '</span><span>TBG: ' + esc(g.tbg || "-") + '</span></div><div class="ot-sum">' +
        Object.keys(sum).map(function (k) { return '<span class="ot-chip">' + k + ': ' + fmt(sum[k]) + '</span>'; }).join("") + '<span class="ot-chip g">Total: ' + fmt(tot) + '</span></div>' + rows;
    });
    openModal("Cek Akhir — " + (ph === "open" ? "OPENING" : "CLOSING") + " " + A.fmtDate(d) + " · " + esc(r.user || "tanpa nama"), h);
    $("#otClr").onclick = function () { Object.keys(chk).forEach(function (k) { if (k.indexOf(d + "|" + ph) === 0) delete chk[k]; }); saveChk(); checkUI(); };
    $("#otHide").onchange = function () { var on = this.checked; [].forEach.call(ov.querySelectorAll(".ot-big"), function (el) { el.style.display = on && el.className.indexOf("done") > -1 ? "none" : ""; }); };
    [].forEach.call(ov.querySelectorAll(".ot-big"), function (el) {
      el.querySelector("input").onchange = function () { var k = el.getAttribute("data-k"); if (this.checked) chk[k] = 1; else delete chk[k]; saveChk(); el.className = "ot-big" + (this.checked ? " done" : ""); if ($("#otHide").checked) el.style.display = this.checked ? "none" : ""; };
    });
  }

  /* ---------- CADANGAN & RIWAYAT ---------- */
  function backupUI() {
    var db = A.db(), ds = Object.keys(db).sort().reverse(), h = '';
    h += '<div class="ot-row"><button class="oc-btn main" type="button" id="otExp">⬇ Unduh cadangan (.json)</button><label class="oc-btn ghost" style="cursor:pointer">⬆ Pulihkan dari cadangan<input type="file" id="otImp" accept=".json" style="display:none"></label></div>' +
      '<p class="ot-hint">Data hanya tersimpan di browser perangkat ini. Unduh cadangan secara rutin agar tidak hilang saat browser dibersihkan. Pemulihan <b>menggabungkan</b> dengan data yang ada (tanggal sama akan ditimpa).</p><h3>Riwayat input</h3>';
    if (!ds.length) h += '<p class="ot-hint">Belum ada riwayat.</p>';
    else {
      h += '<div class="ot-tbl-w"><table class="ot-tbl"><thead><tr><th>Tanggal</th><th>Opening</th><th>Closing</th></tr></thead><tbody>';
      ds.forEach(function (d) {
        function cell(ph) { var x = db[d][ph]; if (!x) return "—"; var n = 0; A.gudang.forEach(function (g) { n += Object.keys((x.g[g.key] || { q: {} }).q).length; }); return '<a href="#" data-go="' + d + '|' + ph + '">' + (x.time || "") + " · " + esc(x.user || "-") + " · " + n + " isian</a>"; }
        h += '<tr><td><b>' + A.fmtDate(d) + '</b></td><td>' + cell("open") + '</td><td>' + cell("close") + '</td></tr>';
      });
      h += '</tbody></table></div>';
    }
    openModal("Cadangan & Riwayat", h);
    $("#otExp").onclick = function () {
      var b = new Blob([JSON.stringify({ app: "lp_openclose", v: 2, at: new Date().toISOString(), db: db })], { type: "application/json" }), a = document.createElement("a");
      a.href = URL.createObjectURL(b); a.download = "cadangan_opening_closing_" + A.date().replace(/-/g, "") + ".json"; document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.parentNode.removeChild(a); }, 800);
    };
    $("#otImp").onchange = function () {
      var f = this.files[0]; if (!f) return;
      f.text().then(function (t) {
        var j = JSON.parse(t), inc = j.db || j, cur = A.db(), n = 0;
        for (var k in inc) if (/^\d{4}-\d{2}-\d{2}$/.test(k)) { cur[k] = inc[k]; n++; }
        A.setDb(cur); A.save(true); close(); A.rerender(); A.toast(n + " tanggal dipulihkan.");
      }).catch(function () { A.toast("File cadangan tidak valid."); });
    };
    [].forEach.call(ov.querySelectorAll("[data-go]"), function (a) {
      a.onclick = function (e) { e.preventDefault(); var p = this.getAttribute("data-go").split("|"); A.setDate(p[0]); A.setPhase(p[1]); close(); A.rerender(); };
    });
  }

  window.OCTools = {
    open: function (what, api) {
      A = api; pend = null; mode = "fill";
      if (what === "import") importUI(); else if (what === "check") checkUI(); else backupUI();
      $(".ot-x").onclick = close;
    }
  };
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
})();
