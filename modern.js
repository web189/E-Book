/* modern.js — poles ringan: bilah progres baca, muncul-saat-scroll, tombol ke atas.
   Semua opsional: bila gagal, situs tetap tampil normal. Aman untuk Chrome 109 / Windows 7. */
(function () {
  "use strict";
  try {
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var body = document.body;

    // 1) bilah progres scroll (transform saja, tanpa layout)
    var bar = document.createElement("div");
    bar.id = "mdProg"; bar.setAttribute("aria-hidden", "true");
    body.appendChild(bar);

    // 2) tombol kembali ke atas
    var top = document.createElement("button");
    top.id = "mdTop"; top.type = "button"; top.setAttribute("aria-label", "Kembali ke atas");
    top.innerHTML = "&#8593;";
    top.addEventListener("click", function () {
      try { window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" }); } catch (e) { window.scrollTo(0, 0); }
    });
    body.appendChild(top);

    var ticking = false;
    function onScroll() {
      if (ticking) return; ticking = true;
      window.requestAnimationFrame(function () {
        var y = window.pageYOffset || document.documentElement.scrollTop || 0;
        var h = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        bar.style.transform = "scaleX(" + Math.min(1, y / h).toFixed(4) + ")";
        if (y > 700) top.classList.add("show"); else top.classList.remove("show");
        ticking = false;
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    // 3) kartu muncul halus saat terlihat (dilepas setelah selesai agar hover normal)
    if (!reduce && "IntersectionObserver" in window) {
      var SEL = ".feature-card,.materi-card,.tx-step,.section-head,.oc-card";
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          var el = en.target; io.unobserve(el);
          el.classList.add("rv-in");
          setTimeout(function () { el.classList.remove("rv", "rv-in"); el.style.transitionDelay = ""; }, 650);
        });
      }, { rootMargin: "0px 0px -6% 0px", threshold: 0.05 });
      var timer = null;
      function scan() {
        var list = document.querySelectorAll(SEL), i, el, n = 0;
        for (i = 0; i < list.length; i++) {
          el = list[i];
          if (el.getAttribute("data-rv")) continue;
          el.setAttribute("data-rv", "1");
          el.style.transitionDelay = (n % 4) * 60 + "ms";
          el.classList.add("rv"); io.observe(el); n++;
        }
      }
      new MutationObserver(function () { clearTimeout(timer); timer = setTimeout(scan, 120); })
        .observe(document.getElementById("app") || body, { childList: true, subtree: true });
      scan();
    }
  } catch (e) { /* abaikan: poles saja */ }
})();
