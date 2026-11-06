/* Cetak struk printer termal portabel (IWARE MP-58SB / RPP02N dan sejenisnya, 58 mm & 80 mm).
   Struk digambar di canvas (huruf tajam + logo), diubah ke bitmap 1-bit, lalu dikirim sebagai ESC/POS raster.
   Tiga cara kirim: Bluetooth langsung (Web Bluetooth/BLE), aplikasi RawBT (Bluetooth Classic), dialog cetak browser. */
(function () {
  "use strict";
  var DOTS = { "58": 384, "80": 576 };               /* titik cetak (203 dpi, 8 titik/mm) */
  var HEAT = { "1": 60, "2": 80, "3": 110, "4": 140 }; /* ESC 7: waktu pemanasan, makin besar makin hitam */
  var SERV = ["000018f0-0000-1000-8000-00805f9b34fb", "0000ffe0-0000-1000-8000-00805f9b34fb", "0000fff0-0000-1000-8000-00805f9b34fb",
    "e7810a71-73ae-499d-8c15-faa9aef0c3f2", "49535343-fe7d-4ae5-8fa9-9fafd205e455", "0000ae30-0000-1000-8000-00805f9b34fb", "0000fee7-0000-1000-8000-00805f9b34fb"];
  var FONT = '"Roboto","Helvetica Neue",Arial,sans-serif';
  var logoWait = null, ble = { dev: null, ch: null };

  function loadLogo() {
    if (logoWait) return logoWait;
    logoWait = new Promise(function (res) {
      var im = new Image(); im.onload = function () { res(im); }; im.onerror = function () { res(null); };
      im.src = "assets/icons/qr-benyoriki.png";
    });
    return logoWait;
  }
  function delay(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  /* ---------- susun & gambar struk ----------
     Gaya struk minimarket (Indomaret/Alfamart): kepala ringkas, info dokumen rapat dua kolom,
     tiap barang hanya 2 baris (nama / kode + jumlah), total tebal, tanda tangan, lalu QR kecil di kaki. */
  function layout(c, d, W, img, dry) {
    var wide = W > 400, z = wide ? 1.18 : 1, M = wide ? 12 : 8, IW = W - 2 * M, y = 8, Q = window.DMS_QRM, mod = wide ? 6 : 5;
    function s(n) { return Math.round(n * z); }
    function f(sz, b) { c.font = (b ? "bold " : "") + s(sz) + "px " + FONT; }
    function put(t, x, yy, al) { if (dry) return; c.textAlign = al || "left"; c.fillText(t, x, yy); }
    function tw(t) { return c.measureText(t).width; }
    function wrap(t, maxW) {
      var words = String(t).split(/\s+/), out = [], cur = "";
      words.forEach(function (w) {
        var tst = cur ? cur + " " + w : w;
        if (c.measureText(tst).width <= maxW) { cur = tst; return; }
        if (cur) { out.push(cur); cur = ""; }
        while (w.length > 1 && c.measureText(w).width > maxW) {
          var k = w.length; while (k > 1 && c.measureText(w.substr(0, k)).width > maxW) k--;
          out.push(w.substr(0, k)); w = w.substr(k);
        }
        cur = w;
      });
      if (cur) out.push(cur);
      return out.length ? out : [""];
    }
    function center(t, sz, b, gap) { f(sz, b); put(t, W / 2, y, "center"); y += Math.round(s(sz) * 1.28) + (gap || 0); }
    function rule(dash, th, gap) {
      if (!dry) { c.save(); c.lineWidth = th; c.setLineDash(dash); c.beginPath(); c.moveTo(M, y + th / 2); c.lineTo(W - M, y + th / 2); c.stroke(); c.restore(); }
      y += th + (gap == null ? 6 : gap);
    }
    function rr(x, yy, w, h, r) { c.beginPath(); if (c.roundRect) c.roundRect(x, yy, w, h, r); else c.rect(x, yy, w, h); c.fill(); }
    function pill(l, r, sz) {
      var h = Math.round(s(sz) * 1.8), ty = y + Math.round((h - s(sz)) / 2) - 1;
      if (!dry) {
        c.fillStyle = "#000"; rr(M, y, IW, h, Math.round(h / 3)); c.fillStyle = "#fff"; f(sz, true);
        if (r == null) put(l, W / 2, ty, "center"); else { put(l, M + 12, ty); put(r, W - M - 12, ty, "right"); }
        c.fillStyle = "#000";
      }
      y += h + 8;
    }

    /* kepala */
    center("DEPO PARUNG", 27, true, 4);
    pill(d.title || "BUKTI KELUAR BARANG", null, 20);
    center(d.test ? "( TES CETAK )" : String(d.sub || "( MANUAL )").toUpperCase(), 15, false, 2);
    rule([7, 4], 2, 8);

    /* baris atas: nomor dokumen kiri, tanggal + jam kanan */
    var nd = d.nodok ? "No. " + String(d.nodok).toUpperCase() : "", dt = d.now.t + "  " + d.now.j, wn, wd;
    f(21, true); wn = nd ? tw(nd) : 0; f(16, true); wd = tw(dt);
    if (nd && wn + wd + 14 > IW) { f(21, true); put(nd, M, y); y += s(28); f(16, true); put(dt, M, y); y += s(24); }
    else if (nd) { f(21, true); put(nd, M, y); f(16, true); put(dt, W - M, y + s(4), "right"); y += s(28); }
    else { f(19, true); put(dt, M, y); y += s(26); }
    y += 8;

    /* info dokumen: label kecil di atas, isi tebal di bawah; isian pendek disandingkan dua kolom */
    var cells = [], half = Math.floor((IW - 10) / 2), ci = 0;
    function add(k, v, full) { if (v != null && String(v).trim() !== "") cells.push({ k: k, v: String(v).toUpperCase(), full: full }); }
    add("Gudang", d.gudang, 1);
    if (d.party) add(d.partyLabel || "Pihak", d.party, 1);
    add("Kendaraan", d.kendaraan); add("Pengemudi", d.pengemudi);
    (d.extra || []).forEach(function (e) { add(e[0], e[1]); });
    add("Keterangan", d.ket, 1);
    function cell(cl, x, w) {
      var lines, h;
      if ("letterSpacing" in c) c.letterSpacing = "1px";
      f(12, true); put(cl.k.toUpperCase(), x, y);
      if ("letterSpacing" in c) c.letterSpacing = "0px";
      f(19, true); lines = wrap(cl.v, w);
      lines.forEach(function (ln, i) { put(ln, x, y + s(15) + i * s(23)); });
      return s(15) + lines.length * s(23);
    }
    while (ci < cells.length) {
      var ca = cells[ci], cb = cells[ci + 1], pair = false, ha;
      if (!ca.full && cb && !cb.full) { f(19, true); pair = tw(ca.v) <= half && tw(cb.v) <= half; }
      if (pair) { ha = cell(ca, M, half); y += Math.max(ha, cell(cb, M + half + 10, half)) + s(7); ci += 2; }
      else { y += cell(ca, M, IW) + s(7); ci++; }
    }
    y += 2;

    /* daftar barang */
    if ("letterSpacing" in c) c.letterSpacing = "1px";
    f(12, true); put("BARANG", M, y); put("JUMLAH", W - M, y, "right"); y += s(17);
    if ("letterSpacing" in c) c.letterSpacing = "0px";
    rule([], 2, 8);
    var ix = M + s(32), nameW = W - M - ix, cr = s(11);
    d.items.forEach(function (r, i) {
      var lines, unit = String(r.s || "").toUpperCase(), q = String(r.q), uw, code = "Kode " + String(r.k || "").toUpperCase() + (r.l ? "  Lot " + String(r.l).toUpperCase() : "");
      if (!dry) {
        c.fillStyle = "#000"; c.beginPath(); c.arc(M + cr, y + cr + 1, cr, 0, Math.PI * 2); c.fill();
        c.fillStyle = "#fff"; f(i > 8 ? 11 : 13, true); c.textAlign = "center"; c.fillText(String(i + 1), M + cr, y + cr + 1 - Math.round(s(i > 8 ? 11 : 13) * 0.5)); c.fillStyle = "#000";
      }
      f(20, true); lines = wrap(String(r.n || r.k || "").toUpperCase(), nameW);
      lines.forEach(function (ln) { put(ln, ix, y); y += s(25); });
      f(16, true); uw = tw(unit);
      f(15, false); put(code, ix, y + s(5));
      f(16, true); put(unit, W - M, y + s(6), "right");
      f(24, true); put(q, W - M - uw - s(7), y, "right");
      y += s(30);
      if (i < d.items.length - 1) rule([2, 4], 1, 8);
    });
    if (!d.items.length) { f(18, false); put("(belum ada barang)", W / 2, y, "center"); y += s(30); }
    y += 4; rule([], 2, 6);

    if (d.test) {
      y += 4; if (!dry) c.fillRect(0, y, W, 14); y += 22;
      f(16, false); put("Teks kecil 16px: ABCDEFGHIJ 012345", M, y); y += 22;
      f(20, true); put("Tebal 20px: ABCDEFGH 01234", M, y); y += 28;
      if (!dry) { c.fillRect(0, y, 3, 24); c.fillRect(W - 3, y, 3, 24); } y += 32;
    }

    /* tanda tangan */
    var sg = d.sig || ["Dibuat", "Diterima"];
    y += s(8); f(16, false); put(sg[0], W * 0.25, y, "center"); put(sg[1], W * 0.75, y, "center"); y += s(52);
    if (!dry) { c.fillRect(M + 8, y, W / 2 - M - 30, 2); c.fillRect(W / 2 + 22, y, W / 2 - M - 30, 2); }
    y += s(16);
    rule([7, 4], 2, 12);

    /* kaki: QR kecil di kiri, kredit pengembang di kanan */
    var fy = y, qrS = (d.qr !== false && ((Q && Q.length) || img)) ? ((Q && Q.length) || 25) * mod : 0, qx = M + 6, x0 = qrS ? qx + qrS + 14 : M, cx = (x0 + W - M) / 2, bh = s(36), th = s(40) + 6 + bh, ty = fy + Math.max(0, Math.round((qrS - th) / 2)), bw, avail = W - M - x0;
    if (qrS && !dry) {
      c.fillStyle = "#000";
      if (Q && Q.length) {
        Q.forEach(function (row, r) {
          var col = 0, n = row.length, st;
          while (col < n) { if (row.charAt(col) === "1") { st = col; while (col < n && row.charAt(col) === "1") col++; c.fillRect(qx + st * mod, fy + r * mod, (col - st) * mod, mod); } else col++; }
        });
      } else { c.imageSmoothingEnabled = false; c.drawImage(img, qx, fy, qrS, qrS); }
    }
    if ("letterSpacing" in c) c.letterSpacing = "1px";
    f(15, false); put("Sistem & Website", cx, ty, "center"); put("Developer", cx, ty + s(20), "center");
    f(20, true);
    bw = Math.min(avail, Math.ceil(tw("benyoriki.com")) + 26);
    if (!dry) { c.save(); c.lineWidth = 2.5; c.strokeRect(Math.round(cx - bw / 2), ty + s(44), bw, bh); c.restore(); }
    put("benyoriki.com", cx + 1, ty + s(44) + Math.round((bh - s(20)) / 2) - 1, "center");
    if ("letterSpacing" in c) c.letterSpacing = "0px";
    y = fy + Math.max(qrS, th + s(44) - s(40) + 2) + 20;
    return { h: y + 16 };
  }

  function draw(d, o, img) {
    var W = DOTS[o.tw] || 384, S = 2, big = document.createElement("canvas"), c, L, H, i, id, p, g, sm, sc;
    d.qr = o.logo !== false;
    big.width = W * S; big.height = 200; c = big.getContext("2d");
    c.setTransform(S, 0, 0, S, 0, 0); c.textBaseline = "top";
    L = layout(c, d, W, img, true); H = Math.ceil(L.h);
    big.width = W * S; big.height = H * S; c = big.getContext("2d");
    c.fillStyle = "#fff"; c.fillRect(0, 0, W * S, H * S);
    c.setTransform(S, 0, 0, S, 0, 0); c.textBaseline = "top"; c.fillStyle = "#000"; c.strokeStyle = "#000";
    layout(c, d, W, img, false);
    if (o.hi) return big;
    /* turunkan 2x -> 1x lalu hitam-putihkan: tepi huruf mulus tapi tidak abu-abu */
    sm = document.createElement("canvas"); sm.width = W; sm.height = H; sc = sm.getContext("2d");
    sc.fillStyle = "#fff"; sc.fillRect(0, 0, W, H);
    sc.imageSmoothingEnabled = true; if (sc.imageSmoothingQuality) sc.imageSmoothingQuality = "high";
    sc.drawImage(big, 0, 0, W, H);
    id = sc.getImageData(0, 0, W, H); p = id.data;
    for (i = 0; i < p.length; i += 4) { g = p[i] * 0.299 + p[i + 1] * 0.587 + p[i + 2] * 0.114; p[i] = p[i + 1] = p[i + 2] = g < 175 ? 0 : 255; p[i + 3] = 255; }
    sc.putImageData(id, 0, 0);
    return sm;
  }
  function render(d, o) {
    o = o || {};
    return ((o.logo === false || (window.DMS_QRM && window.DMS_QRM.length)) ? Promise.resolve(null) : loadLogo()).then(function (img) {
      return (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(function () { return draw(d, o, img); });
    });
  }

  /* ---------- ESC/POS ---------- */
  function toBytes(cv, o) {
    var W = cv.width, H = cv.height, bpr = W >> 3, px = cv.getContext("2d").getImageData(0, 0, W, H).data,
      out = [27, 64, 27, 55, 7, HEAT[o.dens] || 110, 2], BAND = 64, y0, bh, y, bx, k, b;
    for (y0 = 0; y0 < H; y0 += BAND) {
      bh = Math.min(BAND, H - y0);
      out.push(29, 118, 48, 0, bpr & 255, bpr >> 8, bh & 255, bh >> 8);
      for (y = 0; y < bh; y++) for (bx = 0; bx < bpr; bx++) {
        b = 0; for (k = 0; k < 8; k++) if (px[((y0 + y) * W + bx * 8 + k) * 4] < 128) b |= 0x80 >> k;
        out.push(b);
      }
    }
    out.push(10, 10, 10, 10);
    return new Uint8Array(out);
  }

  /* ---------- cara kirim ---------- */
  function b64(bytes) { var s = "", i; for (i = 0; i < bytes.length; i += 8192) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192)); return btoa(s); }
  function viaRawBT(bytes) {
    var a = document.createElement("a"); a.href = "rawbt:base64," + b64(bytes); a.style.display = "none";
    document.body.appendChild(a); a.click(); setTimeout(function () { if (a.parentNode) a.parentNode.removeChild(a); }, 800);
    return Promise.resolve("Dikirim ke RawBT ✓ — bila tidak terbuka, pasang aplikasi RawBT dan pilih printernya.");
  }
  function findChar(list, i) {
    if (i >= list.length) return Promise.reject(new Error("Printer tidak punya jalur BLE yang dikenal (kemungkinan Bluetooth Classic). Pakai metode RawBT."));
    return list[i].getCharacteristics().then(function (cs) {
      for (var k = 0; k < cs.length; k++) if (cs[k].properties.writeWithoutResponse || cs[k].properties.write) return cs[k];
      return findChar(list, i + 1);
    });
  }
  function bleConnect(say) {
    if (!navigator.bluetooth) return Promise.reject(new Error("Browser ini tidak mendukung Bluetooth langsung. Pakai Chrome Android atau metode RawBT."));
    if (ble.ch && ble.dev && ble.dev.gatt && ble.dev.gatt.connected) return Promise.resolve(ble.ch);
    var p = ble.dev ? Promise.resolve(ble.dev) : navigator.bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: SERV });
    return p.then(function (dev) {
      ble.dev = dev; say("Menyambung ke " + (dev.name || "printer") + "…");
      dev.addEventListener("gattserverdisconnected", function () { ble.ch = null; });
      return dev.gatt.connect();
    }).then(function (srv) { return srv.getPrimaryServices(); })
      .then(function (list) { return findChar(list, 0); })
      .then(function (ch) { ble.ch = ch; return ch; });
  }
  function bleWrite(ch, bytes, say) {
    var size = 100, i = 0, nores = !!(ch.properties.writeWithoutResponse && ch.writeValueWithoutResponse);
    function step() {
      if (i >= bytes.length) return Promise.resolve();
      var part = bytes.slice(i, i + size);
      return (nores ? ch.writeValueWithoutResponse(part) : ch.writeValue(part)).then(function () {
        i += part.length; say("Mengirim " + Math.round(i * 100 / bytes.length) + "%…"); return delay(14);
      }).then(step, function (e) { if (size > 20) { size = 20; return delay(60).then(step); } throw e; });
    }
    return step();
  }
  function viaBle(bytes, say) {
    return bleConnect(say).then(function (ch) { return bleWrite(ch, bytes, say); }).then(function () { return "Terkirim ke printer ✓"; });
  }
  function viaDialog(cv, o) {
    var old = document.getElementById("dmFrame"); if (old && old.parentNode) old.parentNode.removeChild(old);
    var f = document.createElement("iframe"), mmW = cv.width / 8, mmH = Math.ceil(cv.height / 8) + 2, d;
    f.id = "dmFrame"; f.setAttribute("aria-hidden", "true"); f.style.cssText = "position:fixed;left:-10000px;top:0;width:" + o.tw + "mm;height:200mm;border:0";
    document.body.appendChild(f); d = f.contentWindow.document; d.open();
    d.write('<!doctype html><html><head><meta charset="utf-8"><title>Struk</title><style>@page{size:' + o.tw + "mm " + mmH + "mm;margin:0}html,body{margin:0;padding:0;background:#fff}img{display:block;margin:0 auto;width:" + mmW + 'mm}</style></head><body><img src="' + cv.toDataURL("image/png") + '"></body></html>');
    d.close();
    setTimeout(function () { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { alert("Gagal membuka dialog cetak."); } }, 400);
    return Promise.resolve("Dialog cetak dibuka.");
  }
  function send(cv, o, say) {
    say = say || function () {};
    if (o.method === "dialog") return viaDialog(cv, o);
    var bytes = toBytes(cv, o);
    return o.method === "rawbt" ? viaRawBT(bytes) : viaBle(bytes, say);
  }

  window.ThermalPrint = { render: render, send: send, bytes: toBytes, hasBle: function () { return !!navigator.bluetooth; } };
})();
