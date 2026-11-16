/* Shared 15-puzzle engine. QuestPuzzle.start(opts) / destroy(). */
(function (global) {
  const N = 4, EMPTY = 15, TILES = 16, GAP = 3, DRAG_COMMIT = 0.28, TAP_PX = 10;
  let session = null;

  function cfg() { return (global.QUEST_CONFIG && global.QUEST_CONFIG.PUZZLE) || {}; }

  function destroy() {
    if (!session) return;
    const s = session;
    session = null;
    if (s.boardEl) {
      s.boardEl.removeEventListener("pointerdown", s.onDown);
      s.boardEl.removeEventListener("pointermove", s.onMove);
      s.boardEl.removeEventListener("pointerup", s.onUp);
      s.boardEl.removeEventListener("pointercancel", s.onUp);
      s.boardEl.querySelectorAll(".pz-tile").forEach((n) => n.remove());
    }
    if (s.skipEl) s.skipEl.removeEventListener("click", s.onSkip);
    if (s.numsEl) s.numsEl.removeEventListener("click", s.onNums);
    if (s.onResize) window.removeEventListener("resize", s.onResize);
    if (s.root) {
      s.root.classList.remove("pz-show-nums");
      if (s.frameEl) s.frameEl.classList.remove("solved");
      if (s.winEl) { s.winEl.textContent = ""; s.winEl.classList.remove("on"); }
      if (s.skipEl) s.skipEl.classList.remove("hidden");
    }
  }

  function start(opts) {
    opts = opts || {};
    destroy();
    const C = cfg();
    const root = opts.root || document;
    const q = (sel, id) => root.querySelector(sel) || document.getElementById(id);
    const params = new URLSearchParams(location.search);
    const FAST = opts.fast != null ? !!opts.fast : params.get("fast") === "1";
    const SLIDE_MS = FAST ? 90 : 200;
    const SHUFFLE_MOVES = FAST ? 48 : 88;
    const image = opts.image || "heart.webp";
    const boardEl = q(".pz-board", "pzBoard");
    const frameEl = q(".pz-frame", "pzFrame");
    const wellEl = q(".pz-well", "pzWell");
    const movesEl = q(".pz-count", "pzMoves");
    const skipEl = q(".pz-skip", "pzSkip");
    const numsEl = q(".pz-toggle", "pzNums");
    const winEl = q(".pz-win", "pzWin");
    const fullEl = q(".pz-full", "pzFull");
    const titleEl = q(".pz-title", "pzTitle");
    const hintEl = q(".pz-sub", "pzHint");
    if (!boardEl || !frameEl || !wellEl) {
      if (typeof opts.onDone === "function") opts.onDone();
      return;
    }
    if (titleEl) titleEl.textContent = C.title || "Пятнашки";
    if (hintEl) hintEl.textContent = C.hint || "Собери синее сердце";
    if (skipEl) skipEl.textContent = C.skip || "Пропустить";
    if (numsEl) numsEl.textContent = C.numbers || "Цифры";
    const movesTpl = C.moves || "Ходы: {n}";
    const winLine = C.win || "Теперь оно целое 💙";
    const awardId = C.awardId || "puzzle-heart";
    const primos = C.primos != null ? C.primos : 40;
    if (fullEl) fullEl.style.backgroundImage = 'url("' + image + '")';
    if (winEl) {
      winEl.textContent = "";
      winEl.classList.remove("on");
      if (opts.hideWinText) winEl.classList.add("hidden");
      else winEl.classList.remove("hidden");
    }

    let slots = Array.from({ length: TILES }, (_, i) => i);
    let moves = 0, won = false, busy = false, drag = null;
    const els = [];

    function rc(i) { return { r: (i / N) | 0, c: i % N }; }
    function emptyAt() { return slots.indexOf(EMPTY); }
    function neighbors(i) {
      const { r, c } = rc(i), out = [];
      if (r > 0) out.push(i - N);
      if (r < N - 1) out.push(i + N);
      if (c > 0) out.push(i - 1);
      if (c < N - 1) out.push(i + 1);
      return out;
    }
    function canSlide(from) { return neighbors(from).indexOf(emptyAt()) !== -1; }
    function cellSize() {
      const r = boardEl.getBoundingClientRect();
      return (r.width - GAP * (N + 1)) / N;
    }
    function cellXY(i, size) {
      const { r, c } = rc(i);
      return { x: GAP + c * (size + GAP), y: GAP + r * (size + GAP) };
    }
    function bgPos(tile) {
      const { r, c } = rc(tile);
      return (c / (N - 1) * 100).toFixed(3) + "% " + (r / (N - 1) * 100).toFixed(3) + "%";
    }
    function place(el, index, size, withTrans) {
      const p = cellXY(index, size);
      el.style.transition = withTrans ? ("left " + SLIDE_MS + "ms ease, top " + SLIDE_MS + "ms ease") : "none";
      el.style.width = size + "px";
      el.style.height = size + "px";
      el.style.left = p.x + "px";
      el.style.top = p.y + "px";
    }
    function layout(withTrans) {
      const size = cellSize();
      for (let i = 0; i < TILES; i++) {
        const t = slots[i];
        if (t === EMPTY) {
          const p = cellXY(i, size);
          wellEl.hidden = false;
          wellEl.style.width = size + "px";
          wellEl.style.height = size + "px";
          wellEl.style.left = p.x + "px";
          wellEl.style.top = p.y + "px";
          continue;
        }
        if (els[t]) place(els[t], i, size, withTrans);
      }
    }
    function setMoves(n) {
      moves = n;
      if (movesEl) movesEl.textContent = movesTpl.replace("{n}", String(moves));
    }
    function isSolved() {
      for (let i = 0; i < TILES; i++) if (slots[i] !== i) return false;
      return true;
    }
    function manhattan() {
      let d = 0;
      for (let i = 0; i < TILES; i++) {
        const t = slots[i];
        if (t === EMPTY) continue;
        const a = rc(t), b = rc(i);
        d += Math.abs(a.r - b.r) + Math.abs(a.c - b.c);
      }
      return d;
    }
    function swap(a, b) { const tmp = slots[a]; slots[a] = slots[b]; slots[b] = tmp; }
    function shuffle() {
      slots = Array.from({ length: TILES }, (_, i) => i);
      let last = -1, n = SHUFFLE_MOVES, guard = 0;
      while ((manhattan() < 18 || isSolved()) && guard < 8) {
        for (let k = 0; k < n; k++) {
          const e = emptyAt();
          let opts = neighbors(e).filter((i) => i !== last);
          if (!opts.length) opts = neighbors(e);
          const pick = opts[(Math.random() * opts.length) | 0];
          last = e;
          swap(pick, e);
        }
        n += 20; guard += 1;
      }
      setMoves(0);
    }
    function awardOnce() {
      if (global.QuestHUD && typeof QuestHUD.award === "function") QuestHUD.award(awardId, primos);
    }
    function celebrate() {
      if (won) return;
      won = true;
      busy = true;
      boardEl.classList.add("busy");
      if (skipEl) skipEl.classList.add("hidden");
      slots = Array.from({ length: TILES }, (_, i) => i);
      layout(true);
      awardOnce();
      setTimeout(function () {
        frameEl.classList.add("solved");
        if (winEl && !opts.hideWinText) {
          winEl.textContent = winLine;
          winEl.classList.add("on");
        }
        if (typeof opts.onWin === "function") opts.onWin({ line: winLine });
        else if (typeof opts.onDone === "function") opts.onDone();
      }, FAST ? 80 : 280);
    }
    function slideTile(fromIndex) {
      if (won || busy || !canSlide(fromIndex)) return false;
      const e = emptyAt();
      swap(fromIndex, e);
      setMoves(moves + 1);
      layout(true);
      if (isSolved()) {
        busy = true;
        boardEl.classList.add("busy");
        setTimeout(celebrate, SLIDE_MS + 40);
      }
      return true;
    }
    function tileIndexFromEl(el) {
      const t = el && el.closest && el.closest(".pz-tile");
      if (!t) return -1;
      return slots.indexOf(+t.dataset.tile);
    }
    function onDown(e) {
      if (won || busy) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      const from = tileIndexFromEl(e.target);
      if (from < 0 || !canSlide(from)) return;
      e.preventDefault();
      const tileId = slots[from];
      const el = els[tileId];
      const size = cellSize();
      const start = cellXY(from, size);
      const dest = cellXY(emptyAt(), size);
      const axis = Math.abs(dest.x - start.x) > 1 ? "x" : "y";
      drag = { pointerId: e.pointerId, el, from, size, start, dest, axis, x0: e.clientX, y0: e.clientY, moved: 0, ox: 0, oy: 0 };
      el.style.transition = "none";
      el.style.zIndex = "4";
      try { el.setPointerCapture(e.pointerId); } catch (err) {}
    }
    function onMove(e) {
      if (!drag || e.pointerId !== drag.pointerId) return;
      e.preventDefault();
      const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
      drag.moved = Math.hypot(dx, dy);
      let ox = 0, oy = 0;
      if (drag.axis === "x") {
        const span = drag.dest.x - drag.start.x;
        ox = span > 0 ? Math.max(0, Math.min(span, dx)) : Math.min(0, Math.max(span, dx));
      } else {
        const span = drag.dest.y - drag.start.y;
        oy = span > 0 ? Math.max(0, Math.min(span, dy)) : Math.min(0, Math.max(span, dy));
      }
      drag.ox = ox; drag.oy = oy;
      drag.el.style.left = (drag.start.x + ox) + "px";
      drag.el.style.top = (drag.start.y + oy) + "px";
    }
    function onUp(e) {
      if (!drag || (e && e.pointerId !== drag.pointerId)) return;
      const d = drag; drag = null;
      try { d.el.releasePointerCapture(d.pointerId); } catch (err) {}
      d.el.style.zIndex = "";
      const span = d.axis === "x" ? (d.dest.x - d.start.x) : (d.dest.y - d.start.y);
      const gone = d.axis === "x" ? d.ox : d.oy;
      const ratio = span !== 0 ? Math.abs(gone / span) : 0;
      if (d.moved < TAP_PX || ratio >= DRAG_COMMIT) slideTile(d.from);
      else {
        d.el.style.transition = "left " + SLIDE_MS + "ms ease, top " + SLIDE_MS + "ms ease";
        d.el.style.left = d.start.x + "px";
        d.el.style.top = d.start.y + "px";
      }
    }
    function onSkip(e) { e.preventDefault(); if (!won) celebrate(); }
    function onNums() {
      const on = root.classList.toggle("pz-show-nums");
      if (root === document) document.body.classList.toggle("pz-show-nums", on);
      if (numsEl) numsEl.setAttribute("aria-pressed", on ? "true" : "false");
    }
    function onResize() { if (!won) layout(false); }

    boardEl.querySelectorAll(".pz-tile").forEach((n) => n.remove());
    boardEl.classList.remove("busy");
    frameEl.classList.remove("solved");
    for (let t = 0; t < EMPTY; t++) {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "pz-tile";
      el.dataset.tile = String(t);
      el.setAttribute("aria-label", "Плитка " + (t + 1));
      el.style.backgroundImage = 'url("' + image + '")';
      el.style.backgroundPosition = bgPos(t);
      const num = document.createElement("span");
      num.className = "pz-num";
      num.textContent = String(t + 1);
      el.appendChild(num);
      boardEl.appendChild(el);
      els[t] = el;
    }
    boardEl.addEventListener("pointerdown", onDown);
    boardEl.addEventListener("pointermove", onMove);
    boardEl.addEventListener("pointerup", onUp);
    boardEl.addEventListener("pointercancel", onUp);
    if (skipEl) skipEl.addEventListener("click", onSkip);
    if (numsEl) numsEl.addEventListener("click", onNums);
    window.addEventListener("resize", onResize);

    session = { root, boardEl, frameEl, skipEl, numsEl, winEl, onDown, onMove, onUp, onSkip, onNums, onResize };
    shuffle();
    layout(false);
  }

  global.QuestPuzzle = { start: start, destroy: destroy };
})(window);
