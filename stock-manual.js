/* Stock Pagi/Sore Manual — form input + hasil gambar JPG (meniru tabel "STOCK GUDANG DEPO PARUNG"). ES5. */
(function () {
  "use strict";
  var KEY = "lp_stock_manual", SC = 3, MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  var GROUPS = [
    [["AQ.200ML", "BOX"], ["AQ.220ML CUBE", "BOX"], ["AQ.330ML", "BOX"], ["AQ.600ML", "BOX"], ["AQ.600ML OPP GOSOK", "BOX"], ["AQ.1500ML", "BOX"]],
    [["VT.200ML", "BOX"], ["VT.220ML BOTTLE", "BOX"], ["VT.330ML", "BOX"], ["VT.550ML", "BOX"], ["VT.1500ML", "BOX"]],
    [["MIZONE ACTIVE LYCHEE LEMON 500ML", "BOX"], ["MIZONE MOOD UP CHANBERRY 500ML", "BOX"], ["MIZONE COCO BOOST 500 ML", "BOX"], ["SGM VITAGROW CHOCO 6X245G SAP HMLY", "BOX"], ["SGM VITAGROW CHOCO 1X245G SAP HMLY", "PCS"], ["SGM VITAGROW CHOCO 120X35G SCH HMLY", "BOX"], ["SGM VITAGROW CHOCO 1X35G SCH HMLY", "PCS"], ["SGM VITAGROW CHOCO 10X35G SCH HMLY", "RENCENG"]],
    [["AQ.5 GLN ISI", "GALLON"], ["AQ.5 GLN BTL", "GALLON"], ["VT.5 GLN ISI", "GALLON"], ["VT.5 GLN BTL", "GALLON"]],
    [["AQ.5 GLN ISI PET", "GALLON"], ["AQ.5 GLN BTL PET", "GALLON"]]
  ];
  var st, root;

  function two(n) { return (n < 10 ? "0" : "") + n; }
  function iso(d) { return d.getFullYear() + "-" + two(d.getMonth() + 1) + "-" + two(d.getDate()); }
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;"); }
  function num(x) { var n = parseInt(x, 10); return isNaN(n) ? 0 : n; }
  function longDate(v) { var p = String(v).split("-"); return p.length === 3 ? parseInt(p[2], 10) + " " + MONTHS[parseInt(p[1], 10) - 1] + " " + p[0] : ""; }
  function load() {
    var d = {}; try { d = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) {}
    var now = new Date();
    st = { tgl: iso(now), sesi: now.getHours() < 12 ? "PAGI" : "SORE", v: d.v || {} };
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify({ v: st.v })); } catch (e) {} }
  function val(n) { return st.v[n] || ["", "", ""]; }

  /* ---------- gambar (canvas) ---------- */
  function draw(cv) {
    var W = 702, RH = 20, TOP = 81, cw = [305, 82, 78, 78, 78, 81], xs = [0], i, g, r;
    for (i = 0; i < cw.length; i++) xs.push(xs[i] + cw[i]);
    var rows = 1 + GROUPS.length; GROUPS.forEach(function (x) { rows += x.length; });
    var H = TOP + rows * RH + 1;
    cv.width = W * SC; cv.height = H * SC;
    var c = cv.getContext("2d"); c.setTransform(SC, 0, 0, SC, 0, 0);
    c.fillStyle = "#fff"; c.fillRect(0, 0, W, H);
    var SANS = 'Calibri,"Segoe UI",Arial,sans-serif', SERIF = 'Cambria,"Times New Roman",Times,serif';
    c.fillStyle = "#000"; c.textBaseline = "middle";
    c.font = "bold 21px " + SANS; c.textAlign = "center"; c.fillText("STOCK GUDANG DEPO PARUNG", W / 2, 21);
    c.font = "bold 13px " + SANS; c.textAlign = "left"; c.fillText("TANGGAL", 3, 51);
    c.textAlign = "center"; c.fillText(longDate(st.tgl), 333, 51);
    c.textAlign = "left"; c.fillText(st.sesi, 466, 51);
    var BLUE = "#95B3D7", GREEN = "#EBF1DE", ORG = "#FBD3B4", y = TOP;
    function cell(ci, fill, text, bold, align) {
      c.fillStyle = fill; c.fillRect(xs[ci], y, cw[ci], RH);
      c.strokeStyle = "#1a1a1a"; c.lineWidth = 0.7; c.strokeRect(xs[ci] + 0.5, y + 0.5, cw[ci] - 1, RH - 1);
      if (text !== "") {
        c.fillStyle = "#000"; c.font = (bold ? "bold " : "") + "12.5px " + SERIF; c.textAlign = align || "center";
        c.fillText(text, align === "left" ? xs[ci] + 3 : xs[ci] + cw[ci] / 2, y + RH / 2 + 0.5);
      }
    }
    ["", "Satuan", "Layak Jual", "BS", "Reject", "Total Fisik"].forEach(function (t, k) { cell(k, BLUE, t, true); });
    y += RH;
    GROUPS.forEach(function (grp) {
      grp.forEach(function (p, k) {
        var v = val(p[0]), l = num(v[0]), b = num(v[1]), rj = num(v[2]);
        cell(0, k % 2 === 0 ? GREEN : "#fff", p[0], true, "left"); cell(1, "#fff", p[1]);
        cell(2, ORG, String(l)); cell(3, ORG, String(b)); cell(4, ORG, String(rj)); cell(5, ORG, String(l + b + rj));
        y += RH;
      });
      for (r = 0; r < 6; r++) cell(r, BLUE, "");
      y += RH;
    });
  }

  /* ---------- halaman ---------- */
  function fieldRow(p) {
    var v = val(p[0]);
    return '<div class="sm-row" data-n="' + esc(p[0]) + '"><div class="sm-name"><b>' + esc(p[0]) + '</b><i>' + p[1] + '</i></div>' +
      ["Layak", "BS", "Reject"].map(function (L, k) { return '<label><span>' + L + '</span><input type="number" min="0" inputmode="numeric" data-k="' + k + '" value="' + esc(v[k]) + '" placeholder="0"></label>'; }).join("") +
      '<div class="sm-tot"><span>Total</span><b>' + (num(v[0]) + num(v[1]) + num(v[2])) + '</b></div></div>';
  }
  function render(el) {
    load(); root = el;
    el.innerHTML = '<section class="dm-page"><div class="dm-head"><h1>Stock Pagi/Sore Manual</h1><p>Isi saldo Layak, BS, dan Reject tiap produk. Total Fisik dihitung otomatis. Hasilnya berupa gambar JPG yang siap dikirim.</p></div>' +
      '<div class="dm-grid"><div class="dm-card"><h2>Isi data</h2><div class="dm-two"><label>Tanggal<input type="date" id="smT" value="' + st.tgl + '"></label>' +
      '<label>Pagi / Sore<select id="smS"><option' + (st.sesi === "PAGI" ? " selected" : "") + '>PAGI</option><option' + (st.sesi === "SORE" ? " selected" : "") + '>SORE</option></select></label></div>' +
      GROUPS.map(function (g, gi) { return '<h3>' + ["Air Mineral", "Vit", "Mizone & SGM", "Galon", "Galon PET"][gi] + '</h3>' + g.map(fieldRow).join(""); }).join("") +
      '<div class="dm-actions"><button type="button" class="dm-btn dm-ghost" id="smClr">Kosongkan semua angka</button></div></div>' +
      '<div class="dm-card sm-stick"><h2>Hasil gambar</h2><canvas id="smC" class="sm-cv"></canvas>' +
      '<button type="button" class="dm-btn dm-primary" id="smDl">Unduh JPG</button><button type="button" class="dm-btn dm-test" id="smSh" hidden>Bagikan / simpan ke galeri</button></div></div></section>';
    var cv = el.querySelector("#smC");
    function redraw() { draw(cv); }
    el.addEventListener("input", function (e) {
      var t = e.target, row = t.closest && t.closest(".sm-row");
      if (row) {
        var n = row.getAttribute("data-n"), a = [0, 1, 2].map(function (k) { return row.querySelector('[data-k="' + k + '"]').value; });
        st.v[n] = a; row.querySelector(".sm-tot b").textContent = num(a[0]) + num(a[1]) + num(a[2]); save();
      } else if (t.id === "smT") st.tgl = t.value; else return;
      redraw();
    });
    el.addEventListener("change", function (e) { if (e.target.id === "smS") { st.sesi = e.target.value; redraw(); } });
    function name() { return "Stock-Gudang-Parung-" + st.tgl + "-" + st.sesi + ".jpg"; }
    function blob(cb) { draw(cv); cv.toBlob(cb, "image/jpeg", 0.95); }
    el.addEventListener("click", function (e) {
      var id = e.target.id;
      if (id === "smDl") blob(function (b) {
        if (window.navigator.msSaveBlob) { window.navigator.msSaveBlob(b, name()); return; }
        var a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = name(); document.body.appendChild(a); a.click();
        setTimeout(function () { document.body.removeChild(a); }, 500);
      });
      else if (id === "smSh") blob(function (b) {
        var f = new File([b], name(), { type: "image/jpeg" });
        navigator.share({ files: [f], title: "Stock Gudang Depo Parung " + st.sesi }).catch(function () {});
      });
      else if (id === "smClr" && window.confirm("Kosongkan semua angka?")) { st.v = {}; save(); render(el); }
    });
    try { var tf = new File([""], "a.jpg", { type: "image/jpeg" }); if (navigator.canShare && navigator.canShare({ files: [tf] })) el.querySelector("#smSh").hidden = false; } catch (x) {}
    redraw();
  }
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href="#/stock-manual"]'); if (!a) return;
    var d = document.getElementById("mobileDrawer"); if (d) d.classList.remove("open");
    var h = document.getElementById("hamburgerBtn"); if (h) h.setAttribute("aria-expanded", "false");
    [].forEach.call(document.querySelectorAll(".nav-dropdown.open"), function (o) { o.classList.remove("open"); });
  });
  window.StockManual = { render: render };
})();
