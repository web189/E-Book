/* splash.js — urutan "boot" 4 detik. Mandiri, tidak bergantung app.js. */
(function () {
  "use strict";
  var el = document.getElementById("spl");
  if (!el) return;
  var root = document.documentElement;
  var skip = false;
  try { if (sessionStorage.getItem("lp_skip_splash")) { skip = true; sessionStorage.removeItem("lp_skip_splash"); } } catch (e) {}

  var TOTAL = skip ? 700 : 4000;      // lama tampil
  var FILL = skip ? 450 : 3550;       // waktu bar mencapai 100%
  var arc = el.querySelector(".sp-arc");
  var bar = el.querySelector(".sp-bar i");
  var pct = el.querySelector("#spPct");
  var net = el.querySelector("#spNet");
  var steps = el.querySelectorAll(".sp-steps li");
  var THR = [0.2, 0.46, 0.72, 0.96];
  var C = 2 * Math.PI * 118;
  if (arc) { arc.style.strokeDasharray = C; arc.style.strokeDashoffset = C; }

  if (net) {
    var on = navigator.onLine !== false;
    net.textContent = on ? "● Online" : "● Offline";
    if (!on) net.className = "sp-net off";
  }

  var t0 = Date.now(), done = false;
  function ease(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  function paint(p) {
    if (arc) arc.style.strokeDashoffset = (C * (1 - p)).toFixed(1);
    if (bar) bar.style.transform = "scaleX(" + p.toFixed(3) + ")";
    if (pct) pct.innerHTML = Math.round(p * 100) + "<em>%</em>";
    for (var i = 0; i < steps.length; i++) {
      var cls = p >= THR[i] ? "done" : (i === 0 || p >= THR[i - 1] ? "on" : "");
      if (steps[i].className !== cls) steps[i].className = cls;
    }
  }
  function tick() {
    if (done) return;
    var p = ease(Math.min(1, (Date.now() - t0) / FILL));
    paint(p);
    if (p < 1) setTimeout(tick, 40);
  }
  tick();

  function finish() {
    if (done) return; done = true;
    paint(1);
    el.classList.add("sp-out");
    root.classList.remove("is-loading");
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 450);
  }
  setTimeout(finish, TOTAL - 350);
  setTimeout(finish, TOTAL + 1500);   // pengaman
})();
