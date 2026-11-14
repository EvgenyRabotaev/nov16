/* Квест 16.11 — общий HUD: кнопка подсказки + счётчик примогемов + переходы.
   Подключение (в <head>, после quest_config.js):
     <link rel="stylesheet" href="../common/hud.css">
     <script src="../common/quest_config.js"></script>
     <script src="../common/hud.js" data-screen="pubg-flight"></script>
   API: window.QuestHUD.getPrimos() / setPrimos(n) / addPrimos(n) / spend(n)
        award(id, n) / setStep(step) / next() / showNext(label) / reset()          */
(function () {
  "use strict";
  var script = document.currentScript;
  var CFG = window.QUEST_CONFIG || {};
  var FLOW = CFG.FLOW || [];
  var HINTS = CFG.HINTS || {};
  var P = CFG.PRIMOS || {};
  var KEY = P.STORAGE_KEY || "nov16_primos";
  var AKEY = P.AWARDS_KEY || "nov16_primo_awards";
  var START = P.START || 0;
  var ROOT = new URL("..", script ? script.src : location.href).href;
  var screenId = window.QUEST_SCREEN || (script && script.dataset.screen) || "";
  var entry = null, idx = -1;
  for (var i = 0; i < FLOW.length; i++) if (FLOW[i].id === screenId) { entry = FLOW[i]; idx = i; }
  var theme = (script && script.dataset.theme) || (entry && entry.theme) || "quest";
  var step = "";
  var mem = {};

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return mem[k] == null ? null : mem[k]; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { mem[k] = v; } }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) { delete mem[k]; } }

  var params = new URLSearchParams(location.search);
  if (params.get("newgame") === "1") {
    /* новая игра: стираем ВСЁ состояние квеста (примогемы, награды, гача — все версии ключей, ответы…), кроме входа по коду */
    lsDel(KEY); lsDel(AKEY);
    [window.localStorage, window.sessionStorage].forEach(function (st) {
      try {
        var ks = []; for (var i = 0; i < st.length; i++) ks.push(st.key(i));
        ks.forEach(function (k) { if (/^(nov16_|quest_)/.test(k) && k !== "nov16_ok") st.removeItem(k); });
      } catch (e) {}
    });
    mem = {};
    try { params.delete("newgame"); history.replaceState(null, "", location.pathname + (params.toString() ? "?" + params : "") + location.hash); } catch (e) {}
  }

  function getPrimos() {
    var v = parseInt(lsGet(KEY), 10);
    return isNaN(v) ? START : Math.max(0, v);
  }
  function setPrimos(n) {
    n = Math.max(0, Math.round(+n || 0));
    lsSet(KEY, String(n));
    render(null);
    return n;
  }
  function addPrimos(n) {
    n = Math.round(+n || 0);
    var v = setPrimos(getPrimos() + n);
    if (n) render(n);
    return v;
  }
  function spend(n) {
    n = Math.round(+n || 0);
    var cur = getPrimos();
    if (n > cur) return false;
    setPrimos(cur - n);
    return true;
  }
  function awards() { try { return JSON.parse(lsGet(AKEY) || "[]") || []; } catch (e) { return []; } }
  function award(id, n) {
    var list = awards();
    if (list.indexOf(id) !== -1) return false;
    list.push(id);
    lsSet(AKEY, JSON.stringify(list));
    addPrimos(n == null ? (P.PER_QUESTION || 0) : n);
    return true;
  }
  function reset() { lsDel(KEY); lsDel(AKEY); render(null); }

  function hintText() {
    return HINTS[screenId + ":" + step] || HINTS[screenId] || HINTS.DEFAULT || "Подсказка появится позже";
  }
  function nextUrl() {
    var n = FLOW[idx + 1];
    return n ? new URL(n.path, ROOT).href : null;
  }
  function next() {
    var u = nextUrl();
    if (u) location.href = u;
  }


  /* ---------- проверка ответов ---------- */
  function norm(t) {
    return String(t || "").toLowerCase().replace(/ё/g, "е")
      .replace(/[^a-zа-я0-9]+/g, " ")
      .replace(/\b0+(\d)/g, "$1")
      .replace(/\s+/g, " ").trim();
  }
  function hasStem(n, stem) {
    stem = norm(stem);
    if (!stem) return false;
    if (stem.indexOf(" ") !== -1) return (" " + n + " ").indexOf(" " + stem) !== -1;
    var words = n.split(" ");
    for (var i = 0; i < words.length; i++) if (words[i].indexOf(stem) === 0) return true;
    return false;
  }
  /* -> "correct" | "almost" | "wrong" */
  function checkPart(part, value) {
    var n = norm(value);
    if (!n) return "wrong";
    var acc = part.accept || [];
    for (var i = 0; i < acc.length; i++) if (norm(acc[i]) === n) return "correct";
    var groups = part.keywords || [];
    if (groups.length) {
      var all = true;
      for (var g = 0; g < groups.length; g++) {
        var any = false;
        for (var k = 0; k < groups[g].length; k++) if (hasStem(n, groups[g][k])) { any = true; break; }
        if (!any) { all = false; break; }
      }
      if (all) return "correct";
    }
    var al = part.almost || [];
    for (var a = 0; a < al.length; a++) if (hasStem(n, al[a])) return "almost";
    return "wrong";
  }
  function checkAnswer(question, values) {
    var parts = (question && question.parts) || [];
    var res = parts.map(function (p, i) { return checkPart(p, values[i]); });
    var ok = res.length > 0 && res.every(function (r) { return r === "correct"; });
    return { ok: ok, parts: res };
  }
  function getQuestion(world, i) {
    var list = (CFG.QUESTIONS || {})[world] || [];
    return list[i] || null;
  }

  /* ---------- DOM ---------- */
  var GEM = '<svg class="qhud-gem" viewBox="0 0 24 24" aria-hidden="true"><defs>' +
    '<linearGradient id="qhudGemF" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#cfe7ff"/><stop offset="1" stop-color="#7fb6ea"/></linearGradient>' +
    '<linearGradient id="qhudGemG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe9a8"/><stop offset="1" stop-color="#c9a24a"/></linearGradient></defs>' +
    '<polygon points="12,1.6 14.6,9.4 22.4,12 14.6,14.6 12,22.4 9.4,14.6 1.6,12 9.4,9.4" fill="url(#qhudGemF)" stroke="url(#qhudGemG)" stroke-width="1.5" stroke-linejoin="round"/>' +
    '<polygon points="12,6 13.3,10.7 18,12 13.3,13.3 12,18 10.7,13.3 6,12 10.7,10.7" fill="#fff" opacity=".55"/></svg>';
  var ICON = {
    pubg: '<span class="qhud-ico">?</span>',
    minecraft: '<span class="qhud-ico">?</span>',
    subnautica: '<span class="qhud-ico">i</span>',
    genshin: '<span class="qhud-ico">✦</span>',
    quest: '<span class="qhud-ico">💙</span>'
  };
  var LABEL = { pubg: "ПОДСКАЗКА", subnautica: "ПОДСКАЗКА", minecraft: "Подсказка", genshin: "Подсказка", quest: "Подсказка" };

  var root, row, counter, num, btn, panel, panelText, nextBtn, built = false;

  function build() {
    if (built) return;
    built = true;
    root = document.createElement("div");
    root.className = "qhud qhud--" + theme;
    root.setAttribute("data-qhud", screenId);
    root.innerHTML =
      '<div class="qhud-panel" role="dialog" aria-label="Подсказка" hidden>' +
        '<div class="qhud-panel-head"><span class="qhud-panel-title">Подсказка</span>' +
        '<button type="button" class="qhud-close" aria-label="Закрыть">✕</button></div>' +
        '<div class="qhud-panel-text"></div></div>' +
      '<div class="qhud-row">' +
        '<div class="qhud-counter" title="Примогемы">' + GEM + '<span class="qhud-num">0</span></div>' +
        '<button type="button" class="qhud-hint" aria-label="Подсказка">' + (ICON[theme] || ICON.quest) +
        '<span class="qhud-label">' + (LABEL[theme] || "Подсказка") + '</span></button>' +
      '</div>';
    document.body.appendChild(root);
    row = root.querySelector(".qhud-row");
    counter = root.querySelector(".qhud-counter");
    num = root.querySelector(".qhud-num");
    btn = root.querySelector(".qhud-hint");
    panel = root.querySelector(".qhud-panel");
    panelText = root.querySelector(".qhud-panel-text");
    if (script && script.dataset.counter === "off") counter.style.display = "none";

    btn.addEventListener("click", function (e) { e.stopPropagation(); toggle(); });
    root.querySelector(".qhud-close").addEventListener("click", function (e) { e.stopPropagation(); close(); });
    panel.addEventListener("click", function (e) { e.stopPropagation(); });
    root.addEventListener("pointerdown", function (e) { e.stopPropagation(); });
    document.addEventListener("click", function () { close(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
    window.addEventListener("storage", function (e) { if (e.key === KEY) render(null); });
    window.addEventListener("resize", layout);
    render(null);
    layout();
    setTimeout(layout, 300);
  }

  function open() { panelText.textContent = hintText(); panel.hidden = false; root.classList.add("qhud--open"); }
  function close() { if (!panel) return; panel.hidden = true; root.classList.remove("qhud--open"); }
  function toggle() { if (panel.hidden) open(); else close(); }

  function render(delta) {
    if (!num) return;
    num.textContent = String(getPrimos());
    if (delta) {
      counter.classList.remove("qhud-bump"); void counter.offsetWidth; counter.classList.add("qhud-bump");
      var f = document.createElement("span");
      f.className = "qhud-float";
      f.textContent = (delta > 0 ? "+" : "") + delta;
      counter.appendChild(f);
      setTimeout(function () { f.remove(); }, 1500);
    }
  }

  /* ---------- placement next to a (possibly letterboxed) map ---------- */
  var mapEl = null, forcedRect = null;
  function mapRect() {
    if (forcedRect) return forcedRect;
    if (!mapEl) return null;
    var r = mapEl.getBoundingClientRect();
    var fit = getComputedStyle(mapEl).objectFit;
    var nw = mapEl.naturalWidth, nh = mapEl.naturalHeight;
    if (!nw || !nh || (fit !== "contain" && fit !== "scale-down")) return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
    var s = Math.min(r.width / nw, r.height / nh);
    var w = nw * s, h = nh * s;
    var l = r.left + (r.width - w) / 2, t = r.top + (r.height - h) / 2;
    return { left: l, top: t, right: l + w, bottom: t + h };
  }
  function layout() {
    if (!root) return;
    root.classList.remove("qhud--gutter-right", "qhud--gutter-bottom");
    root.style.left = root.style.top = root.style.right = root.style.bottom = "";
    var m = mapRect();
    if (m) placeByMap(m);
    avoid();
  }
  /* Не перекрывать элементы страницы (data-avoid="#squadHud, #panel"): поднимаем HUD над ними. */
  function avoid() {
    var sel = script && script.dataset.avoid;
    if (!sel) return;
    var vh = window.innerHeight;
    var els = document.querySelectorAll(sel);
    for (var k = 0; k < 3; k++) {
      var moved = false;
      var hr = row.getBoundingClientRect();
      for (var j = 0; j < els.length; j++) {
        var r = els[j].getBoundingClientRect();
        if (!r.width || !r.height) continue;
        var cs = getComputedStyle(els[j]);
        if (cs.display === "none" || cs.visibility === "hidden") continue;
        var hit = !(r.right <= hr.left - 6 || r.left >= hr.right + 6 || r.bottom <= hr.top - 6 || r.top >= hr.bottom + 6);
        if (hit) { root.style.bottom = (vh - r.top + 10) + "px"; moved = true; }
      }
      if (!moved) break;
    }
  }
  function placeByMap(m) {
    var vw = window.innerWidth, vh = window.innerHeight;
    var hr = row.getBoundingClientRect();
    var hw = hr.width, hh = hr.height, pad = 12;
    var freeR = vw - m.right, freeB = vh - m.bottom;
    if (freeR >= hw + pad * 2) {
      root.classList.add("qhud--gutter-right");
      root.style.right = Math.max(pad, (freeR - hw) / 2) + "px";
      root.style.bottom = Math.max(pad, vh - m.bottom + pad) + "px";
    } else if (freeB >= hh + pad * 2) {
      root.classList.add("qhud--gutter-bottom");
      root.style.right = Math.max(pad, vw - m.right) + "px";
      root.style.bottom = Math.max(pad, (freeB - hh) / 2) + "px";
    }
  }
  function placeOutside(rect) { forcedRect = rect || null; layout(); }
  function watchMap(el) {
    mapEl = typeof el === "string" ? document.querySelector(el) : el;
    if (mapEl && !mapEl.complete) mapEl.addEventListener("load", layout);
    layout();
  }

  /* ---------- «Дальше» ---------- */
  function showNext(label, opts) {
    build();
    opts = opts || {};
    if (!nextBtn) {
      nextBtn = document.createElement("button");
      nextBtn.type = "button";
      nextBtn.className = "qhud-next qhud-next--" + theme;
      nextBtn.addEventListener("click", function (e) { e.stopPropagation(); if (opts.onClick) opts.onClick(); else next(); });
      document.body.appendChild(nextBtn);
    }
    nextBtn.textContent = label || "Дальше";
    if (opts.className) nextBtn.classList.add(opts.className);
    requestAnimationFrame(function () { nextBtn.classList.add("qhud-next--show"); });
    return nextBtn;
  }
  function hideNext() { if (nextBtn) nextBtn.classList.remove("qhud-next--show"); }

  window.QuestHUD = {
    screen: screenId, theme: theme, root: ROOT,
    getPrimos: getPrimos, setPrimos: setPrimos, addPrimos: addPrimos, spend: spend,
    award: award, awards: awards, reset: reset,
    setStep: function (s) { step = s || ""; if (panel && !panel.hidden) panelText.textContent = hintText(); },
    getStep: function () { return step; },
    hintText: hintText, openHint: function () { build(); open(); }, closeHint: close,
    next: next, nextUrl: nextUrl, showNext: showNext, hideNext: hideNext,
    watchMap: watchMap, placeOutside: placeOutside, layout: layout,
    setVisible: function (v) { build(); root.style.display = v ? "" : "none"; if (!v) close(); render(null); if (v) layout(); },
    refresh: function (delta) { render(delta || null); },
    normalize: norm, checkPart: checkPart, checkAnswer: checkAnswer, getQuestion: getQuestion,
    answerText: function (k) { return (CFG.ANSWER_TEXT || {})[k] || ""; }
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () {
    build();
    var m = document.querySelector("[data-hud-map]");
    if (m) watchMap(m);
  });
  else { build(); var m0 = document.querySelector("[data-hud-map]"); if (m0) watchMap(m0); }
})();
