/* Карточка названия мира. Подключается на входных страницах миров (не на переходах).
   <script src="../common/world_title.js" data-world="pubg|minecraft|subnautica|genshin"></script>
   WorldTitle.whenReady() — промис, который резолвится после карточки (или сразу, если её нет). */
(function () {
  const script = document.currentScript;
  const worldId = (script && script.getAttribute("data-world")) || "";
  const params = new URLSearchParams(location.search);
  const FORCE = params.get("title") === "1";
  const FAST = params.get("fast") === "1";

  function cfg() {
    return (window.QUEST_CONFIG && window.QUEST_CONFIG.WORLD_TITLES) || {};
  }
  function worldCfg(id) {
    const all = cfg().worlds || {};
    return all[id] || null;
  }
  function shouldPlay(id) {
    if (!id || !worldCfg(id)) return false;
    if (FORCE) return true;
    if (FAST || params.get("auto") === "1") return false;
    const skipKeys = ["q", "loc", "radio", "levi", "leviathan", "cave", "glow", "intro", "current", "reunion", "meet", "seamoth", "moth", "event", "stage", "craft", "book", "exit", "end", "done", "shop", "skip", "fireflies", "svetlyachki", "stars", "constellation", "constellations", "scanner", "missyou"];
    for (let i = 0; i < skipKeys.length; i++) {
      const v = params.get(skipKeys[i]);
      if (v != null && v !== "") return false;
    }
    return true;
  }
  function lineFor(id) {
    const w = worldCfg(id) || {};
    if (w.line) return w.line;
    const kicker = w.kicker || "Мир";
    const roman = w.roman || "";
    const name = w.name || "";
    return (kicker + (roman ? " " + roman : "") + (name ? " — " + name : "")).replace(/\s+/g, " ").trim();
  }

  function play(id) {
    const w = worldCfg(id);
    if (!w || !shouldPlay(id)) return Promise.resolve();
    const C = cfg();
    const total = FAST ? Math.min(Number(C.DURATION_MS) || 2500, 500) : (Number(C.DURATION_MS) || 2500);
    const fade = FAST ? 80 : (Number(C.FADE_MS) || 450);
    return new Promise((resolve) => {
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        el.classList.remove("on");
        setTimeout(() => { el.setAttribute("hidden", ""); el.remove(); resolve(); }, fade + 20);
      };
      const el = document.createElement("div");
      el.className = "world-title wt-" + id;
      el.style.setProperty("--wt-fade", fade + "ms");
      el.setAttribute("role", "dialog");
      el.setAttribute("aria-label", lineFor(id));
      el.innerHTML = '<div class="wt-card">' +
        '<div class="wt-kicker"></div>' +
        '<h1 class="wt-title"></h1>' +
        '<div class="wt-skip"></div>' +
        "</div>";
      el.querySelector(".wt-kicker").textContent = (w.kicker || "Мир") + (w.roman ? " " + w.roman : "");
      el.querySelector(".wt-title").textContent = lineFor(id);
      el.querySelector(".wt-skip").textContent = C.skip || "Нажми, чтобы пропустить";
      document.body.appendChild(el);
      document.documentElement.dataset.worldTitle = id;
      requestAnimationFrame(() => { requestAnimationFrame(() => el.classList.add("on")); });
      const t = setTimeout(done, total);
      const skip = (e) => { e && e.preventDefault(); clearTimeout(t); done(); };
      el.addEventListener("click", skip);
      el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " " || e.key === "Escape") skip(e); });
      el.tabIndex = 0;
      try { el.focus({ preventScroll: true }); } catch (e) {}
      const prev = done;
      // expose skip for tests
      el._skip = () => { clearTimeout(t); prev(); };
    }).then(() => { delete document.documentElement.dataset.worldTitle; });
  }

  let ready = null;
  function whenReady() {
    if (ready) return ready;
    ready = new Promise((resolve) => {
      const go = () => play(worldId).then(resolve);
      if (document.body) go();
      else document.addEventListener("DOMContentLoaded", go);
    });
    return ready;
  }
  window.WorldTitle = { play: play, whenReady: whenReady, shouldPlay: shouldPlay, lineFor: lineFor, world: worldId };
  whenReady();
})();
