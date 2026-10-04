/* Penanda gambar: kotak + nomor di atas gambar, dan daftar penjelasan di bawahnya.
   Ringan (tanpa library), aman untuk Chrome 109 / Windows 7. */
(function () {
  "use strict";
  var DATA = window.ANNOT_DATA || {};
  function base(src) { return (src || "").split("/").pop().split("?")[0]; }
  function build(img) {
    if (img.closest(".annot-wrap")) return;
    var list = DATA[base(img.getAttribute("src"))];
    if (!list || !list.length) return;
    var wrap = document.createElement("span");
    wrap.className = "annot-wrap";
    img.parentNode.insertBefore(wrap, img);
    wrap.appendChild(img);
    list.forEach(function (a) {
      var m = document.createElement("i");
      m.className = "annot-box";
      m.style.cssText = "left:" + a.x + "%;top:" + a.y + "%;width:" + a.w + "%;height:" + a.h + "%";
      m.innerHTML = "<b>" + a.n + "</b>";
      wrap.appendChild(m);
    });
    var box = img.closest(".tx-step");
    var body = box && box.querySelector(".tx-step-body");
    if (body && !body.querySelector(".annot-legend")) {
      var ol = document.createElement("ol");
      ol.className = "annot-legend";
      ol.setAttribute("aria-label", "Penjelasan tanda pada gambar");
      ol.innerHTML = list.map(function (a) { return '<li><i class="lg">' + a.n + "</i><span>" + a.t + "</span></li>"; }).join("");
      var cap = document.createElement("p");
      cap.className = "annot-cap";
      cap.textContent = "Cocokkan nomor pada gambar dengan penjelasan ini:";
      body.appendChild(cap);
      body.appendChild(ol);
    }
  }
  function scan(root) {
    var imgs = (root || document).querySelectorAll(".reader-body img");
    for (var i = 0; i < imgs.length; i++) build(imgs[i]);
  }
  window.AnnotScan = scan;
  function start() {
    var app = document.getElementById("app");
    if (!app) return;
    scan(app);
    if (window.MutationObserver) {
      new MutationObserver(function () { scan(app); }).observe(app, { childList: true, subtree: true });
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
