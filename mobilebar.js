/* Menu bawah untuk HP: Beranda, Materi, Cari, Tema. Ringan, tanpa library. */
(function () {
  "use strict";
  function ic(p) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + p + "</svg>"; }
  var ICONS = {
    home: ic('<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>'),
    book: ic('<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5"/>'),
    search: ic('<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>'),
    theme: ic('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>')
  };
  function click(id) { var e = document.getElementById(id); if (e) e.click(); }
  function build() {
    if (document.querySelector(".mbar")) return;
    var bar = document.createElement("nav");
    bar.className = "mbar";
    bar.setAttribute("aria-label", "Menu bawah");
    bar.innerHTML =
      '<a href="#/" data-k="home">' + ICONS.home + "<span>Beranda</span></a>" +
      '<a href="#/materi" data-k="materi">' + ICONS.book + "<span>Materi</span></a>" +
      '<button type="button" data-k="cari">' + ICONS.search + "<span>Cari</span></button>" +
      '<button type="button" data-k="tema">' + ICONS.theme + "<span>Tema</span></button>";
    document.body.appendChild(bar);
    bar.querySelector('[data-k="cari"]').addEventListener("click", function () {
      click("openSearchBtnMobile") || click("openSearchBtn");
    });
    bar.querySelector('[data-k="tema"]').addEventListener("click", function () { click("themeToggle"); });
    function mark() {
      var h = location.hash || "#/";
      var k = (h === "#/" || h === "" || h === "#") ? "home" : "materi";
      var els = bar.querySelectorAll("[data-k]");
      for (var i = 0; i < els.length; i++) {
        els[i].classList.toggle("on", els[i].getAttribute("data-k") === k);
      }
    }
    window.addEventListener("hashchange", mark);
    mark();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build); else build();
})();
