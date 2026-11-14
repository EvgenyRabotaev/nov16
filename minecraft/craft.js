/* ============================================================
   Майнкрафт: крафт на верстаке + пиксельный домик по этапам (15.11).
   Все иконки и текстуры рисуются кодом (canvas), без файлов текстур.
   API: window.MCCraft = { icon(id), open(def) → Promise, House }.
   ============================================================ */
(function () {
  "use strict";

  /* ---------- маленький детерминированный рандом ---------- */
  function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  function hex(c) { const n = parseInt(c.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function shade(c, k) { const [r, g, b] = hex(c); const f = (v) => Math.max(0, Math.min(255, Math.round(v * k))); return "rgb(" + f(r) + "," + f(g) + "," + f(b) + ")"; }

  /* ---------- текстуры блоков 8×8 (для дома) и 16×16 (для иконок) ---------- */
  function texPlanks(ctx, x0, y0, n, base, seed) {
    const r = rng(seed); const line = shade(base, 0.68), dark = shade(base, 0.85), lite = shade(base, 1.1);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const nz = n === 16 ? 0.07 : 0.18;
      let c = r() < nz ? dark : r() < nz * 0.8 ? lite : base;
      const row = Math.floor(y / (n / 4));
      if (y % (n / 4) === (n / 4) - 1) c = line;
      const seam = (row % 2 ? n / 2 : 0) + (n === 16 ? 3 : 1);
      if (x === seam % n && y % (n / 4) !== (n / 4) - 1) c = line;
      ctx.fillStyle = c; ctx.fillRect(x0 + x, y0 + y, 1, 1);
    }
  }
  function texLog(ctx, x0, y0, n, seed) {
    const r = rng(seed); const cols = ["#6b4f2a", "#594222", "#7a5b33", "#4a361c"];
    for (let x = 0; x < n; x++) { const col = cols[(x * 7 + seed) % 3]; for (let y = 0; y < n; y++) { ctx.fillStyle = r() < 0.2 ? cols[3] : r() < 0.12 ? cols[2] : col; ctx.fillRect(x0 + x, y0 + y, 1, 1); } }
  }
  function texCobble(ctx, x0, y0, n, seed) {
    const r = rng(seed); const cols = ["#7d7d7d", "#6a6a6a", "#909090", "#555555", "#a2a2a2"];
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const v = r(); ctx.fillStyle = v < 0.18 ? cols[3] : v < 0.4 ? cols[1] : v < 0.6 ? cols[2] : v < 0.66 ? cols[4] : cols[0]; ctx.fillRect(x0 + x, y0 + y, 1, 1); }
  }
  function texWool(ctx, x0, y0, n, base, seed) {
    const r = rng(seed);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const v = r(); ctx.fillStyle = v < 0.2 ? shade(base, 0.9) : v < 0.32 ? shade(base, 0.82) : base; ctx.fillRect(x0 + x, y0 + y, 1, 1); }
  }

  /* ---------- иконки предметов 16×16 ---------- */
  function px(ctx, pts, color) { ctx.fillStyle = color; pts.forEach(([x, y]) => ctx.fillRect(x, y, 1, 1)); }
  function block3d(ctx, topFn, sideFn) {
    /* «изометрический» кубик как в инвентаре: верх (ромб) + две стороны */
    const t = document.createElement("canvas"); t.width = t.height = 16; const tc = t.getContext("2d"); topFn(tc);
    const s = document.createElement("canvas"); s.width = s.height = 16; const sc = s.getContext("2d"); sideFn(sc);
    ctx.save(); ctx.imageSmoothingEnabled = false;
    // верх
    ctx.setTransform(0.5, 0.25, -0.5, 0.25, 8, 0.5); ctx.drawImage(t, 0, 0);
    // левая сторона
    ctx.setTransform(0.5, 0.25, 0, 0.56, 0, 4.5); ctx.drawImage(s, 0, 0); ctx.fillStyle = "rgba(0,0,0,.22)"; ctx.fillRect(0, 0, 16, 16);
    // правая сторона
    ctx.setTransform(0.5, -0.25, 0, 0.56, 8, 8.5); ctx.drawImage(s, 0, 0); ctx.fillStyle = "rgba(0,0,0,.4)"; ctx.fillRect(0, 0, 16, 16);
    ctx.restore();
  }
  const DRAW = {
    log(ctx) {
      block3d(ctx, (c) => { // торец бревна — кольца
        c.fillStyle = "#6b4f2a"; c.fillRect(0, 0, 16, 16);
        c.fillStyle = "#b8945a"; c.fillRect(2, 2, 12, 12); c.fillStyle = "#a07e48"; c.fillRect(4, 4, 8, 8); c.fillStyle = "#b8945a"; c.fillRect(6, 6, 4, 4);
      }, (c) => texLog(c, 0, 0, 16, 3));
    },
    planks(ctx) { block3d(ctx, (c) => texPlanks(c, 0, 0, 16, "#b48a52", 5), (c) => texPlanks(c, 0, 0, 16, "#a8804b", 9)); },
    cobblestone(ctx) { block3d(ctx, (c) => texCobble(c, 0, 0, 16, 11), (c) => texCobble(c, 0, 0, 16, 17)); },
    wool(ctx) { block3d(ctx, (c) => texWool(c, 0, 0, 16, "#f2f2f2", 21), (c) => texWool(c, 0, 0, 16, "#e8e8e8", 23)); },
    crafting_table(ctx) {
      block3d(ctx, (c) => {
        texPlanks(c, 0, 0, 16, "#b48a52", 31); c.fillStyle = "#6e4f2c";
        c.fillRect(0, 0, 16, 1); c.fillRect(0, 15, 16, 1); c.fillRect(0, 0, 1, 16); c.fillRect(15, 0, 1, 16);
        c.fillRect(5, 1, 1, 14); c.fillRect(10, 1, 1, 14); c.fillRect(1, 5, 14, 1); c.fillRect(1, 10, 14, 1);
      }, (c) => {
        texPlanks(c, 0, 0, 16, "#9a7140", 33);
        c.fillStyle = "#4a3520"; c.fillRect(0, 0, 16, 3);
        c.fillStyle = "#9b9b9b"; c.fillRect(3, 6, 4, 2); c.fillStyle = "#5b4128"; c.fillRect(4, 8, 2, 5); // молоток
        c.fillStyle = "#bdbdbd"; c.fillRect(9, 5, 4, 6); c.fillStyle = "#7a7a7a"; c.fillRect(9, 11, 4, 1); c.fillStyle = "#5b4128"; c.fillRect(10, 12, 2, 2); // пила
      });
    },
    stick(ctx) {
      for (let i = 0; i < 11; i++) { const x = 3 + i, y = 13 - i; px(ctx, [[x, y + 1], [x + 1, y + 1]], "#2e1f0e"); px(ctx, [[x, y]], "#8a6331"); px(ctx, [[x + 1, y]], "#6b4a22"); }
    },
    cornflower(ctx) {
      px(ctx, [[8, 15], [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9]], "#3d7a28");
      px(ctx, [[6, 12], [7, 12], [9, 11], [10, 11], [5, 13], [11, 10]], "#4f9a33");
      const petals = [[7, 4], [8, 4], [9, 4], [6, 5], [7, 5], [8, 5], [9, 5], [10, 5], [5, 6], [6, 6], [10, 6], [11, 6], [6, 7], [7, 7], [9, 7], [10, 7], [7, 8], [8, 8], [9, 8], [8, 3], [5, 5], [11, 5]];
      px(ctx, petals, "#4a6fe0"); px(ctx, [[7, 3], [9, 3], [4, 6], [12, 6], [6, 8], [10, 8]], "#2f4fbf");
      px(ctx, [[7, 6], [8, 6], [9, 6], [8, 7]], "#1e2f80"); px(ctx, [[8, 6]], "#7f9cf5");
    },
    blue_dye(ctx) {
      const rows = ["......XXX.......", ".....XbbbX......", "....XbBBbbX.....", "...XbBBBBbbX....", "...XbBBBbbbX....", "..XbbBbbbbbbX...", "..XbbbbbbbbbX...", "..XbbbbbbbdbX...", "..XbbbbbbbddX...", "...XbbbbbddX....", "....XXdddXX.....", "......XXX......."];
      rows.forEach((r, y) => [...r].forEach((ch, x) => { const c = { X: "#141b46", b: "#3c5bd6", B: "#7d98f2", d: "#2a3ea3" }[ch]; if (c) { ctx.fillStyle = c; ctx.fillRect(x + 1, y + 2, 1, 1); } }));
    },
    lapis(ctx) {
      const rows = ["....XX......", "...XbBX..XX.", "..XbBbbXXbBX", "..XbbbdXbbdX", ".XXbddX.XdX.", "XbBXXX..XXX.", "XbbdX..XBbX.", ".XddX.XbbdX.", "..XX..XXddX.", "........XX.."];
      rows.forEach((r, y) => [...r].forEach((ch, x) => { const c = { X: "#0f1d5a", b: "#2a4fc8", B: "#6f8ff0", d: "#1c3796" }[ch]; if (c) { ctx.fillStyle = c; ctx.fillRect(x + 2, y + 3, 1, 1); } }));
    },
    boat(ctx) {
      // лодка как предмет в Майне: деревянный корпус-«корыто» и весло
      const rows = ["................", "............Xo..", "...........XoX..", "..........XoX...", ".X.......XoX..X.", "XbX.....XoX..XbX", "XbbXXXXXXXXXXbbX", "XbBbbbBbbbbBbbbX", "XbbbbbbbbbbbbbbX", ".XdbbBbbbbbBbdX.", "..XddddddddddX..", "...XXXXXXXXXX..."];
      rows.forEach((r, y) => [...r].forEach((ch, x) => { const c = { X: "#2b1d0f", b: "#a8804b", B: "#8a6638", d: "#6e4f2c", o: "#c9a26b" }[ch]; if (c) { ctx.fillStyle = c; ctx.fillRect(x, y + 2, 1, 1); } }));
    },
    bed(ctx) {
      // кровать сбоку: белое одеяло, голубая подушка, деревянная рама
      ctx.fillStyle = "#2b1d0f"; ctx.fillRect(1, 6, 14, 1); ctx.fillRect(1, 6, 1, 7); ctx.fillRect(14, 6, 1, 7);
      for (let x = 2; x < 14; x++) for (let y = 7; y < 10; y++) { ctx.fillStyle = (x + y) % 4 ? "#f4f4f4" : "#e2e2e2"; ctx.fillRect(x, y, 1, 1); }
      ctx.fillStyle = "#a9d0f2"; ctx.fillRect(2, 7, 3, 2); ctx.fillStyle = "#cfe5f8"; ctx.fillRect(2, 7, 2, 1);
      ctx.fillStyle = "#c9c9c9"; ctx.fillRect(2, 9, 12, 1);
      for (let x = 2; x < 14; x++) { ctx.fillStyle = x % 3 ? "#a8804b" : "#8a6638"; ctx.fillRect(x, 10, 1, 2); }
      ctx.fillStyle = "#5b4128"; ctx.fillRect(2, 12, 2, 2); ctx.fillRect(12, 12, 2, 2);
    }
  };
  const ICONS = {};
  function icon(id) {
    if (ICONS[id]) return ICONS[id];
    const c = document.createElement("canvas"); c.width = c.height = 16;
    const ctx = c.getContext("2d"); ctx.imageSmoothingEnabled = false;
    (DRAW[id] || (() => {}))(ctx);
    return (ICONS[id] = c.toDataURL());
  }

  const NAMES = { log: "Бревно", planks: "Доски", stick: "Палка", cobblestone: "Булыжник", crafting_table: "Верстак", wool: "Шерсть", bed: "Кровать", cornflower: "Василёк", lapis: "Лазурит", blue_dye: "Синий краситель", boat: "Лодка" };

  /* Рецепты (форма может стоять в любом месте сетки, как в игре). */
  const RECIPES = {
    planks: { patterns: [["L"]], key: { L: "log" }, count: 4, inv: [["log", 1], ["stick", 2], ["cobblestone", 3]] },
    crafting_table: { patterns: [["PP", "PP"]], key: { P: "planks" }, count: 1, inv: [["planks", 4], ["stick", 2], ["cobblestone", 2]] },
    bed: { patterns: [["WWW", "PPP"]], key: { W: "wool", P: "planks" }, count: 1, inv: [["wool", 3], ["planks", 3], ["stick", 1], ["cobblestone", 2]] },
    blue_dye: { patterns: [["F"], ["Z"]], key: { F: "cornflower", Z: "lapis" }, count: 1, inv: [["cornflower", 1], ["stick", 1], ["cobblestone", 2]] },
    boat: { patterns: [["P.P", "PPP"]], key: { P: "planks", ".": null }, count: 1, inv: [["planks", 5], ["stick", 2], ["cobblestone", 2]] }
  };

  function trim(grid) {
    let x0 = 3, y0 = 3, x1 = -1, y1 = -1;
    for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) if (grid[y * 3 + x]) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    if (x1 < 0) return [];
    const out = []; for (let y = y0; y <= y1; y++) { const row = []; for (let x = x0; x <= x1; x++) row.push(grid[y * 3 + x]); out.push(row); }
    return out;
  }
  function matches(recipe, grid) {
    const t = trim(grid);
    return recipe.patterns.some((p) => p.length === t.length && p.every((row, y) => row.length === t[y].length && [...row].every((ch, x) => recipe.key[ch] === t[y][x])));
  }

  /* ---------- стили ---------- */
  const css = `
  .mc-craft { position: fixed; inset: 0; z-index: 40; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px;
    background: rgba(10, 10, 20, .45); opacity: 0; transition: opacity .35s ease; touch-action: none; -webkit-user-select: none; user-select: none; }
  .mc-craft.on { opacity: 1; }
  .mc-craft * { -webkit-tap-highlight-color: transparent; }
  .mc-goal { font: 700 clamp(17px, 2.2vw, 24px)/1.2 "Courier New", "DejaVu Sans Mono", monospace; color: #ffff55; text-shadow: 2px 2px 0 #3f3f00; text-align: center; padding: 0 12px; }
  .mc-gui { --s: min(54px, calc((100vw - 56px) / 9.4)); background: #c6c6c6; padding: calc(var(--s) * .26); border: 3px solid #000;
    box-shadow: inset 3px 3px 0 #fff, inset -3px -3px 0 #555; image-rendering: pixelated; position: relative; }
  .mc-title { font: 700 calc(var(--s) * .34)/1 "Courier New", "DejaVu Sans Mono", monospace; color: #404040; margin: 0 0 calc(var(--s) * .22) calc(var(--s) * .1); }
  .mc-top { display: flex; align-items: center; justify-content: center; gap: calc(var(--s) * .45); margin-bottom: calc(var(--s) * .3); }
  .mc-grid { display: grid; grid-template-columns: repeat(3, var(--s)); gap: 0; }
  .mc-inv { display: grid; grid-template-columns: repeat(9, var(--s)); }
  .mc-slot { width: var(--s); height: var(--s); background: #8b8b8b; position: relative; box-shadow: inset 2px 2px 0 #373737, inset -2px -2px 0 #fff; touch-action: none; cursor: pointer; }
  .mc-slot.hover, .mc-slot.sel { background: #a9a9a9; }
  .mc-slot.sel { outline: 2px solid #ffff55; outline-offset: -2px; }
  .mc-slot img, .mc-ghost img { position: absolute; left: 12%; top: 12%; width: 76%; height: 76%; image-rendering: pixelated; pointer-events: none; }
  .mc-slot .ghost-hint { opacity: .33; filter: grayscale(.2); }
  .mc-cnt { position: absolute; right: 6%; bottom: 2%; font: 700 calc(var(--s) * .34)/1 "Courier New", monospace; color: #fff; text-shadow: 2px 2px 0 #3f3f3f; pointer-events: none; }
  .mc-arrow { width: calc(var(--s) * .9); height: calc(var(--s) * .6); position: relative; }
  .mc-arrow::before { content: ""; position: absolute; left: 0; top: 35%; width: 62%; height: 30%; background: #8b8b8b; }
  .mc-arrow::after { content: ""; position: absolute; right: 0; top: 0; border-left: calc(var(--s) * .38) solid #8b8b8b; border-top: calc(var(--s) * .3) solid transparent; border-bottom: calc(var(--s) * .3) solid transparent; }
  .mc-arrow.ready::before { background: #fff; } .mc-arrow.ready::after { border-left-color: #fff; }
  .mc-result { width: calc(var(--s) * 1.45); height: calc(var(--s) * 1.45); }
  .mc-result.ready { animation: resPulse 1s ease-in-out infinite; }
  @keyframes resPulse { 50% { background: #b5b5b5; box-shadow: inset 2px 2px 0 #373737, inset -2px -2px 0 #fff, 0 0 14px #ffff99; } }
  .mc-label { font: 700 calc(var(--s) * .3)/1 "Courier New", monospace; color: #404040; margin: 0 0 calc(var(--s) * .14) calc(var(--s) * .1); }
  .mc-tip { min-height: 1.2em; font: 600 14px/1.3 "Segoe UI", system-ui, sans-serif; color: #fff; text-shadow: 1px 1px 0 #000; text-align: center; padding: 0 12px; max-width: 560px; }
  .mc-hintbtn { appearance: none; cursor: pointer; padding: 8px 16px; font: 700 14px/1 "Courier New", monospace; color: #fff; text-shadow: 2px 2px 0 #3f3f3f;
    background: #8b8b8b; border: 3px solid #1b1b1b; box-shadow: inset 3px 3px 0 #c6c6c6, inset -3px -3px 0 #555; visibility: hidden; }
  .mc-hintbtn.show { visibility: visible; }
  .mc-ghost { position: fixed; left: 0; top: 0; width: 54px; height: 54px; pointer-events: none; z-index: 60; transform: translate(-50%, -50%); }
  .mc-fly { position: fixed; z-index: 61; pointer-events: none; image-rendering: pixelated; transition: transform .9s cubic-bezier(.3,.7,.2,1), opacity .9s ease; }
  .mc-toast { position: fixed; left: 50%; top: 40%; transform: translate(-50%, -50%); z-index: 62; font: 700 clamp(20px, 3vw, 30px)/1.1 "Courier New", monospace; color: #55ff55; text-shadow: 3px 3px 0 #0a3f0a; pointer-events: none; animation: toast 1.4s ease forwards; white-space: nowrap; }
  @keyframes toast { 0% { opacity: 0; transform: translate(-50%, -30%) scale(.8); } 20% { opacity: 1; transform: translate(-50%, -50%) scale(1.05); } 75% { opacity: 1; } 100% { opacity: 0; transform: translate(-50%, -80%); } }
  .mc-gui.ok { animation: guiOk .6s ease; }
  @keyframes guiOk { 40% { box-shadow: inset 3px 3px 0 #fff, inset -3px -3px 0 #555, 0 0 30px #ffff88; } }
  /* дом */
  .mc-house { position: absolute; pointer-events: none; }
  .mc-house canvas { position: absolute; inset: 0; width: 100%; height: 100%; image-rendering: pixelated; opacity: 0; transition: opacity 1s ease; }
  .mc-house canvas.on { opacity: 1; }
  .mc-house .hshadow { position: absolute; left: -4%; right: -4%; bottom: -3%; height: 9%; border-radius: 50%; background: rgba(0, 40, 0, .28); filter: blur(5px); opacity: 0; transition: opacity 1s ease; }
  .mc-house.has .hshadow { opacity: 1; }
  .mc-house .glow { position: absolute; border-radius: 30%; background: radial-gradient(closest-side, rgba(255, 214, 120, .85), rgba(255, 190, 80, .35) 60%, rgba(255, 180, 60, 0)); opacity: 0; transition: opacity 1.4s ease; mix-blend-mode: screen; }
  .mc-house.lit .glow { opacity: 1; animation: flick 3.2s ease-in-out infinite; }
  @keyframes flick { 50% { filter: brightness(1.12); } }
  `;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  /* ---------- окно крафта ---------- */
  function open(def) {
    const recipe = RECIPES[def.craft];
    if (!recipe) return Promise.resolve();
    return new Promise((resolve) => {
      const root = document.createElement("div"); root.className = "mc-craft"; root.dataset.craft = def.craft;
      root.innerHTML =
        '<div class="mc-goal">' + (def.hint || ("Скрафти: " + NAMES[def.craft])) + '</div>' +
        '<div class="mc-gui"><div class="mc-title">Верстак</div>' +
        '<div class="mc-top"><div class="mc-grid"></div><div class="mc-arrow"></div><div class="mc-slot mc-result" data-k="res"></div></div>' +
        '<div class="mc-label">Инвентарь</div><div class="mc-inv"></div></div>' +
        '<div class="mc-tip"></div><button class="mc-hintbtn" type="button">Показать рецепт</button>';
      document.body.appendChild(root);
      const gridEl = root.querySelector(".mc-grid"), invEl = root.querySelector(".mc-inv"), resEl = root.querySelector(".mc-result");
      const arrow = root.querySelector(".mc-arrow"), tip = root.querySelector(".mc-tip"), hintBtn = root.querySelector(".mc-hintbtn"), gui = root.querySelector(".mc-gui");
      const grid = Array(9).fill(null);
      const inv = Array(9).fill(null).map((_, i) => recipe.inv[i] ? { id: recipe.inv[i][0], n: recipe.inv[i][1] } : null);
      let fails = 0, wasFull = false, ghost = null, sel = null, finished = false, showRecipe = false;
      const need = recipe.patterns[0].join("").replace(/\./g, "").length;
      const gridSlots = [], invSlots = [];
      for (let i = 0; i < 9; i++) { const s = document.createElement("div"); s.className = "mc-slot"; s.dataset.k = "g" + i; gridEl.appendChild(s); gridSlots.push(s); }
      for (let i = 0; i < 9; i++) { const s = document.createElement("div"); s.className = "mc-slot"; s.dataset.k = "i" + i; invEl.appendChild(s); invSlots.push(s); }
      const fill = (el, id, n, cls) => { el.innerHTML = id ? '<img class="' + (cls || "") + '" alt="" src="' + icon(id) + '">' + (n > 1 ? '<span class="mc-cnt">' + n + "</span>" : "") : ""; if (id && !cls) el.title = NAMES[id] || ""; else el.removeAttribute("title"); };
      function ready() { return matches(recipe, grid); }
      function render() {
        grid.forEach((id, i) => fill(gridSlots[i], id, 1));
        if (showRecipe) { const p = recipe.patterns[0]; p.forEach((row, y) => [...row].forEach((ch, x) => { const i = y * 3 + x; if (!grid[i]) fill(gridSlots[i], recipe.key[ch], 1, "ghost-hint"); })); }
        inv.forEach((it, i) => { fill(invSlots[i], it && it.n > 0 ? it.id : null, it ? it.n : 0); invSlots[i].classList.toggle("sel", sel === i && !!it && it.n > 0); });
        const ok = ready();
        fill(resEl, ok ? def.craft : null, ok ? recipe.count : 0);
        resEl.classList.toggle("ready", ok); arrow.classList.toggle("ready", ok);
        const filled = grid.filter(Boolean).length;
        if (!ok && filled >= need && !wasFull) { fails++; wasFull = true; tip.textContent = "Пока не то… Попробуй другую форму."; if (fails >= 2) hintBtn.classList.add("show"); }
        if (filled < need) wasFull = false;
        if (ok) tip.textContent = "Готово! Забери " + NAMES[def.craft].toLowerCase() + " из клетки справа.";
        window.__craft = { craft: def.craft, grid: grid.slice(), inv: inv.map((x) => x && x.n ? x.id + ":" + x.n : null), ready: ok, fails, hintShown: hintBtn.classList.contains("show") };
      }
      function toInv(id) {
        let slot = inv.findIndex((x) => x && x.id === id);
        if (slot < 0) slot = inv.findIndex((x) => !x || x.n === 0);
        if (slot < 0) return;
        if (!inv[slot] || inv[slot].n === 0) inv[slot] = { id, n: 0 };
        inv[slot].n++;
      }
      function placeFromInv(i, g) {
        const it = inv[i]; if (!it || it.n <= 0) return false;
        if (grid[g]) toInv(grid[g]);
        grid[g] = it.id; it.n--; return true;
      }
      function slotAt(x, y) {
        const el = document.elementFromPoint(x, y);
        const s = el && el.closest && el.closest(".mc-slot");
        return s && root.contains(s) ? s.dataset.k : el && el.closest && el.closest(".mc-gui") ? "gui" : "out";
      }
      function takeResult() {
        if (!ready() || finished) return;
        finished = true;
        for (let i = 0; i < 9; i++) grid[i] = null;
        showRecipe = false; render();
        fill(resEl, def.craft, recipe.count);
        gui.classList.add("ok");
        const r = resEl.getBoundingClientRect();
        const fly = document.createElement("img"); fly.className = "mc-fly"; fly.src = icon(def.craft); fly.alt = "";
        fly.style.left = r.left + "px"; fly.style.top = r.top + "px"; fly.style.width = r.width + "px"; fly.style.height = r.height + "px";
        document.body.appendChild(fly); resEl.innerHTML = "";
        const tx = window.innerWidth / 2 - (r.left + r.width / 2), ty = window.innerHeight * 0.62 - (r.top + r.height / 2);
        requestAnimationFrame(() => requestAnimationFrame(() => { fly.style.transform = "translate(" + tx + "px," + ty + "px) scale(1.8) rotate(8deg)"; }));
        const toast = document.createElement("div"); toast.className = "mc-toast"; toast.textContent = "+ " + NAMES[def.craft] + (recipe.count > 1 ? " ×" + recipe.count : ""); document.body.appendChild(toast);
        window.__craftDone = def.craft;
        setTimeout(() => { fly.style.opacity = "0"; root.classList.remove("on"); }, 950);
        setTimeout(() => { fly.remove(); toast.remove(); root.remove(); window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); window.removeEventListener("pointercancel", onUp); resolve(def.craft); }, 1500);
      }

      /* перетаскивание: мышь и палец (pointer events). Короткое нажатие без движения — «тап». */
      let drag = null;
      root.addEventListener("pointerdown", (e) => {
        const s = e.target.closest && e.target.closest(".mc-slot"); if (!s || finished) return;
        e.preventDefault();
        const k = s.dataset.k; let id = null;
        if (k === "res") id = ready() ? def.craft : null;
        else if (k[0] === "g") id = grid[+k.slice(1)];
        else { const it = inv[+k.slice(1)]; id = it && it.n > 0 ? it.id : null; }
        drag = { k, id, x0: e.clientX, y0: e.clientY, moved: false, pid: e.pointerId };
        lastAct = Date.now();
      });
      function onMove(e) {
        if (!drag || e.pointerId !== drag.pid) return;
        if (!drag.moved && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) > 6 && drag.id) {
          drag.moved = true;
          ghost = document.createElement("div"); ghost.className = "mc-ghost"; ghost.innerHTML = '<img alt="" src="' + icon(drag.id) + '">';
          const sz = gridSlots[0].getBoundingClientRect().width; ghost.style.width = ghost.style.height = sz + "px";
          document.body.appendChild(ghost);
          // предмет «в руке»: убираем из исходной клетки
          if (drag.k[0] === "g") grid[+drag.k.slice(1)] = null;
          else if (drag.k[0] === "i") inv[+drag.k.slice(1)].n--;
          sel = null; render();
        }
        if (drag.moved) {
          ghost.style.left = e.clientX + "px"; ghost.style.top = e.clientY + "px";
          const k = slotAt(e.clientX, e.clientY);
          root.querySelectorAll(".mc-slot.hover").forEach((s) => s.classList.remove("hover"));
          const h = root.querySelector('.mc-slot[data-k="' + k + '"]'); if (h && k !== "res") h.classList.add("hover");
        }
      }
      function onUp(e) {
        if (!drag || e.pointerId !== drag.pid) return;
        const d = drag; drag = null;
        root.querySelectorAll(".mc-slot.hover").forEach((s) => s.classList.remove("hover"));
        if (d.moved) {
          ghost.remove(); ghost = null;
          const k = slotAt(e.clientX, e.clientY);
          if (d.k === "res") { if (k !== "res") takeResult(); else render(); return; }
          if (k && k[0] === "g") { const g = +k.slice(1); if (grid[g]) toInv(grid[g]); grid[g] = d.id; }
          else toInv(d.id); // в инвентарь / мимо — вернуть
          render(); return;
        }
        // тап
        if (d.k === "res") { takeResult(); return; }
        if (d.k[0] === "i") { const i = +d.k.slice(1); sel = (sel === i || !d.id) ? null : i; render(); return; }
        if (d.k[0] === "g") {
          const g = +d.k.slice(1);
          if (sel != null && inv[sel] && inv[sel].n > 0) { placeFromInv(sel, g); if (!inv[sel] || inv[sel].n <= 0) sel = null; }
          else if (grid[g]) { toInv(grid[g]); grid[g] = null; }
          render();
        }
      }
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
      hintBtn.addEventListener("click", () => { showRecipe = true; tip.textContent = "Полупрозрачные клетки — подсказка: положи предметы так же."; render(); });
      // бездействие ~25 с — тоже можно открыть подсказку
      let lastAct = Date.now();
      const idle = setInterval(() => { if (finished) { clearInterval(idle); return; } if (Date.now() - lastAct > 25000) hintBtn.classList.add("show"); }, 1000);
      tip.textContent = window.matchMedia && matchMedia("(pointer: coarse)").matches ? "Перетащи предметы пальцем в сетку 3×3 (или коснись предмета, потом клетки)." : "Перетащи предметы мышкой из инвентаря в сетку 3×3.";
      render();
      requestAnimationFrame(() => root.classList.add("on"));
      window.__craftApi = { take: takeResult, place: (i, g) => { placeFromInv(i, g); render(); } };
    });
  }

  /* ---------- пиксельный домик (13×10 блоков по 8 px) ---------- */
  const BW = 13, BH = 10, T = 8;
  function drawHouse(level, wallColor) {
    const c = document.createElement("canvas"); c.width = BW * T; c.height = BH * T;
    const ctx = c.getContext("2d"); ctx.imageSmoothingEnabled = false;
    const blk = (x, y, fn) => fn(x * T, y * T, x * 31 + y * 7 + 1);
    const wall = wallColor || "#b48a52";
    const planks = (x, y) => blk(x, y, (X, Y, s) => texPlanks(ctx, X, Y, T, wall, s));
    const roof = (x, y) => blk(x, y, (X, Y, s) => { texPlanks(ctx, X, Y, T, "#5a3b22", s + 3); ctx.fillStyle = "rgba(0,0,0,.18)"; ctx.fillRect(X, Y + T - 1, T, 1); });
    const log = (x, y) => blk(x, y, (X, Y, s) => texLog(ctx, X, Y, T, s));
    const cobble = (x, y) => blk(x, y, (X, Y, s) => texCobble(ctx, X, Y, T, s));
    if (level >= 1) { for (let x = 0; x < BW; x++) cobble(x, 9); if (level === 1) { log(1, 8); log(11, 8); planks(2, 8); planks(10, 8); } }
    if (level >= 2) {
      for (let y = 5; y <= 8; y++) for (let x = 1; x <= 11; x++) (x === 1 || x === 11) ? log(x, y) : planks(x, y);
      for (let y = 1; y <= 4; y++) for (let x = 5 - y; x <= 7 + y; x++) planks(x, y); // фронтон
      for (let y = 0; y <= 4; y++) { roof(4 - y, y); roof(8 + y, y); }
      for (let x = 4; x <= 8; x++) roof(x, 0);
      cobble(10, 0); cobble(10, 1); // труба
      // дверь
      blk(6, 7, (X, Y) => { ctx.fillStyle = "#7a5530"; ctx.fillRect(X, Y, T, T * 2); ctx.fillStyle = "#5e4022"; ctx.fillRect(X, Y, T, 1); ctx.fillRect(X, Y, 1, T * 2); ctx.fillRect(X + T - 1, Y, 1, T * 2); ctx.fillRect(X, Y + T, T, 1);
        ctx.fillStyle = "#8f6a3e"; ctx.fillRect(X + 2, Y + 2, 4, 4); ctx.fillRect(X + 2, Y + 10, 4, 4); ctx.fillStyle = "#cfcfcf"; ctx.fillRect(X + 6, Y + 9, 1, 2); });
    }
    if (level >= 3) {
      const win = (x, y, w, h) => { for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) blk(x + xx, y + yy, (X, Y) => { ctx.fillStyle = "#ffd77a"; ctx.fillRect(X, Y, T, T); ctx.fillStyle = "#ffe9a8"; ctx.fillRect(X + 2, Y + 2, 3, 3); ctx.fillStyle = "#f5c25a"; ctx.fillRect(X + 5, Y + 5, 2, 2); });
        ctx.fillStyle = "#4a3520"; ctx.fillRect(x * T, y * T, w * T, 1); ctx.fillRect(x * T, (y + h) * T - 1, w * T, 1); ctx.fillRect(x * T, y * T, 1, h * T); ctx.fillRect((x + w) * T - 1, y * T, 1, h * T);
        if (w > 1) ctx.fillRect((x + w / 2) * T, y * T, 1, h * T); if (h > 1) ctx.fillRect(x * T, (y + h / 2) * T, w * T, 1); };
      win(3, 6, 2, 2); win(8, 6, 2, 2); win(6, 2, 1, 1);
      // фонарик у двери
      ctx.fillStyle = "#2b2b2b"; ctx.fillRect(7 * T + 3, 7 * T - 1, 2, 2); ctx.fillStyle = "#3a3a3a"; ctx.fillRect(7 * T + 2, 7 * T + 1, 4, 5); ctx.fillStyle = "#ffcf5e"; ctx.fillRect(7 * T + 3, 7 * T + 2, 2, 3);
    }
    return c;
  }
  const House = {
    el: null, level: 0, wall: null,
    mount(parent) {
      const el = document.createElement("div"); el.className = "mc-house"; el.innerHTML = '<div class="hshadow"></div>';
      [[3, 6, 2, 2], [8, 6, 2, 2], [6, 2, 1, 1], [7, 7, 1, 1]].forEach(([x, y, w, h]) => {
        const g = document.createElement("div"); g.className = "glow";
        const m = w > 1 ? 1.2 : 1.6;
        g.style.left = ((x + w / 2) / BW * 100 - w * m / BW * 50) + "%"; g.style.top = ((y + h / 2) / BH * 100 - h * m / BH * 50) + "%";
        g.style.width = (w * m / BW * 100) + "%"; g.style.height = (h * m / BH * 100) + "%"; el.appendChild(g);
      });
      parent.appendChild(el); this.el = el; return el;
    },
    set(level, wallColor, instant) {
      if (!this.el) return;
      this.level = level; if (wallColor) this.wall = wallColor;
      const c = drawHouse(level, this.wall); c.dataset.level = level;
      this.el.appendChild(c);
      const old = [...this.el.querySelectorAll("canvas")].filter((x) => x !== c);
      const on = () => { c.classList.add("on"); setTimeout(() => old.forEach((o) => o.remove()), 1100); };
      if (instant) { c.style.transition = "none"; c.classList.add("on"); old.forEach((o) => o.remove()); requestAnimationFrame(() => (c.style.transition = "")); }
      else requestAnimationFrame(() => requestAnimationFrame(on));
      this.el.classList.toggle("has", level >= 1);
      this.el.classList.toggle("lit", level >= 3);
    },
    place(box) { if (!this.el) return; Object.assign(this.el.style, { left: box.x + "px", width: box.w + "px", height: box.w * BH / BW + "px", bottom: box.bottom + "px" }); },
    ratio: BH / BW
  };

  window.MCCraft = { icon, open, House, RECIPES, NAMES, matches };
})();
