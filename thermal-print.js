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
      im.src = "assets/icons/logo-thermal.png";
    });
    return logoWait;
  }
  function delay(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  /* ---------- susun & gambar struk ---------- */
  function layout(c, d, W, img, dry) {
    var M = 8, IW = W - 2 * M, y = 4, logoY = -1;
    function f(sz, b) { c.font = (b ? "bold " : "") + sz + "px " + FONT; }
    function put(t, x, yy, al) { if (dry) return; c.textAlign = al || "left"; c.fillText(t, x, yy); }
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
    function center(t, sz, b) { f(sz, b); put(t, W / 2, y, "center"); y += Math.round(sz * 1.3); }
    function line(dash, th) {
      if (!dry) { c.save(); c.lineWidth = th; c.setLineDash(dash); c.beginPath(); c.moveTo(M, y); c.lineTo(W - M, y); c.stroke(); c.restore(); }
      y += th + 6;
    }
    function bar(left, right, sz, al) {
      var h = Math.round(sz * 1.75);
      if (!dry) {
        c.fillStyle = "#000"; c.fillRect(M, y, IW, h); c.fillStyle = "#fff"; f(sz, true);
        if (al === "center") put(left, W / 2, y + Math.round((h - sz) / 2), "center");
        else { put(left, M + 10, y + Math.round((h - sz) / 2)); put(right, W - M - 10, y + Math.round((h - sz) / 2), "right"); }
        c.fillStyle = "#000";
      }
      y += h + 8;
    }
    function kv(k, v) {
      if (!v) return;
      var lw = 108, lines; f(21, true); lines = wrap(v, IW - lw - 14);
      f(21, false); put(k, M, y);
      f(21, true); lines.forEach(function (ln, i) { if (!i) put(":", M + lw, y); put(ln, M + lw + 14, y); y += 27; });
    }

    if (img) { logoY = y; y += img.height + 4; }
    center("DEPO PARUNG", 25, true); y += 4;
    bar(d.title || "BUKTI KELUAR BARANG", "", 22, "center");
    center(d.test ? "( TES CETAK )" : "( MANUAL )", 17, false); y += 2;
    line([7, 4], 2);
    if (d.doc) kv("Jenis", d.doc);
    if (d.nodok) kv("No. Dok", String(d.nodok).toUpperCase());
    kv("Gudang", d.gudang);
    if (d.party) kv("Pihak", String(d.party).toUpperCase());
    kv("Tanggal", d.now.t + "  " + d.now.j);
    kv("Kendaraan", (d.kendaraan || "").toUpperCase());
    kv("Pengemudi", (d.pengemudi || "").toUpperCase());
    kv("Ket", (d.ket || "").toUpperCase());
    y += 4;
    f(17, true); put("NO", M, y); put("NAMA BARANG", M + 34, y); put("JUMLAH", W - M, y, "right"); y += 22;
    line([], 2);
    var tot = 0, tx = M + 34, qw = 104, nameW = W - M - qw - tx - 4;
    d.items.forEach(function (r, i) {
      var st0 = y, lines;
      f(21, true); lines = wrap(String(r.n || "").toUpperCase(), nameW);
      put(String(i + 1), M, y);
      lines.forEach(function (ln) { put(ln, tx, y); y += 26; });
      f(17, false); put("Kode " + String(r.k || "").toUpperCase(), tx, y); y += 22;
      f(31, true); put(String(r.q), W - M, st0, "right");
      f(18, true); put(String(r.s || "").toUpperCase(), W - M, st0 + 36, "right");
      if (y < st0 + 60) y = st0 + 60;
      y += 4; line([2, 4], 1);
      tot += parseFloat(r.q) || 0;
    });
    if (!d.items.length) { f(20, false); put("(belum ada barang)", W / 2, y, "center"); y += 30; }
    y += 4;
    bar("TOTAL " + d.items.length + " ITEM", String(tot), 23, "lr");
    if (d.test) {
      y += 4; if (!dry) c.fillRect(0, y, W, 14); y += 22;
      f(16, false); put("Teks kecil 16px: ABCDEFGHIJ 012345", M, y); y += 22;
      f(20, true); put("Tebal 20px: ABCDEFGH 01234", M, y); y += 28;
      if (!dry) { c.fillRect(0, y, 3, 24); c.fillRect(W - 3, y, 3, 24); } y += 32;
    }
    y += 10;
    f(19, false); put("Dibuat", W * 0.25, y, "center"); put("Diterima", W * 0.75, y, "center"); y += 66;
    if (!dry) { c.fillRect(M + 8, y, W / 2 - M - 34, 2); c.fillRect(W / 2 + 26, y, W / 2 - M - 34, 2); }
    y += 22;
    line([7, 4], 2); y += 4;
    if ("letterSpacing" in c) c.letterSpacing = "1px";
    center("Sistem & Website Developer", 17, false); y += 2;
    if ("letterSpacing" in c) c.letterSpacing = "2px";
    f(25, true);
    var bw = Math.min(IW, Math.ceil(c.measureText("benyoriki.com").width) + 40);
    if (!dry) { c.save(); c.lineWidth = 3; c.strokeRect((W - bw) / 2, y, bw, 42); c.restore(); }
    put("benyoriki.com", W / 2 + 1, y + 8, "center");
    if ("letterSpacing" in c) c.letterSpacing = "0px";
    y += 60;
    return { h: y + 24, logoY: logoY };
  }

  function draw(d, o, img) {
    var W = DOTS[o.tw] || 384, S = 2, big = document.createElement("canvas"), c, L, H, i, id, p, g, sm, sc;
    big.width = W * S; big.height = 200; c = big.getContext("2d");
    c.setTransform(S, 0, 0, S, 0, 0); c.textBaseline = "top";
    L = layout(c, d, W, img, true); H = Math.ceil(L.h);
    big.width = W * S; big.height = H * S; c = big.getContext("2d");
    c.fillStyle = "#fff"; c.fillRect(0, 0, W * S, H * S);
    c.setTransform(S, 0, 0, S, 0, 0); c.textBaseline = "top"; c.fillStyle = "#000"; c.strokeStyle = "#000";
    layout(c, d, W, img, false);
    if (o.hi) { if (img && L.logoY >= 0) { c.imageSmoothingEnabled = false; c.drawImage(img, Math.round((W - img.width) / 2), L.logoY); } return big; }
    /* turunkan 2x -> 1x lalu hitam-putihkan: tepi huruf mulus tapi tidak abu-abu */
    sm = document.createElement("canvas"); sm.width = W; sm.height = H; sc = sm.getContext("2d");
    sc.fillStyle = "#fff"; sc.fillRect(0, 0, W, H);
    sc.imageSmoothingEnabled = true; if (sc.imageSmoothingQuality) sc.imageSmoothingQuality = "high";
    sc.drawImage(big, 0, 0, W, H);
    id = sc.getImageData(0, 0, W, H); p = id.data;
    for (i = 0; i < p.length; i += 4) { g = p[i] * 0.299 + p[i + 1] * 0.587 + p[i + 2] * 0.114; p[i] = p[i + 1] = p[i + 2] = g < 175 ? 0 : 255; p[i + 3] = 255; }
    sc.putImageData(id, 0, 0);
    if (img && L.logoY >= 0) { sc.imageSmoothingEnabled = false; sc.drawImage(img, Math.round((W - img.width) / 2), L.logoY); }
    return sm;
  }
  function render(d, o) {
    o = o || {};
    return (o.logo === false ? Promise.resolve(null) : loadLogo()).then(function (img) {
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
