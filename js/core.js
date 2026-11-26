// Shared helpers + view registry. Each js/views/*.js file registers a route.
(function () {
  'use strict';
  const WT = (window.WT = { routes: {}, tiles: [] });

  WT.$view = document.getElementById('view');
  const $title = document.getElementById('title');
  const $back = document.getElementById('back');
  $back.addEventListener('click', () => { location.hash = ''; });

  WT.setHeader = function (title, back) {
    $title.textContent = title;
    $back.hidden = !back;
    document.title = back ? `${title} · Workshop Toolkit` : 'Workshop Toolkit';
  };

  // up to d decimals, trailing zeros trimmed
  WT.fmt = (n, d = 2) => (n == null || isNaN(n) ? '–' : String(Number(Number(n).toFixed(d))));
  // drill / size in mm: at least 1 decimal (5.0, 6.8, 2.05)
  WT.mm = (n) => {
    if (n == null) return '–';
    const s = WT.fmt(n, 2);
    return `${s.includes('.') ? s : s + '.0'} mm`;
  };
  WT.pct = (n) => `${Math.round(n)}%`;
  WT.esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  WT.engClass = (p) => (p < 60 || p > 85 ? 'eng bad' : p < 65 || p > 80 ? 'eng warn' : 'eng ok');
  WT.row = (label, value, cls) => `<div class="kv${cls ? ' ' + cls : ''}"><span>${label}</span><b>${value}</b></div>`;

  const cache = {};
  WT.load = async (path) => (cache[path] ||= await (await fetch(path)).json());

  WT.store = {
    get(k, d) { try { const v = localStorage.getItem('wt.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('wt.' + k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
  };

  // Auto fuses: standard ratings and families (blade ATO/ATC/mini to 40 A, Maxi to 120 A, MIDI to 200 A, ANL / MEGA above).
  WT.FUSES = [1, 2, 3, 4, 5, 7.5, 10, 15, 20, 25, 30, 35, 40, 50, 60, 70, 80, 100, 125, 150, 175, 200, 225, 250, 300, 350, 400, 500];
  WT.fuseType = (a) => (a <= 40 ? 'ATO / mini blade' : a <= 100 ? 'Maxi blade or MIDI' : a <= 200 ? 'MIDI or ANL' : 'ANL or MEGA');
  WT.maxFuse = (cableA) => WT.FUSES.filter((f) => f <= cableA).pop() || null;
  /** Fuse for a load: at least 1.25 × load (continuous), never above the cable's rating. */
  WT.fuseFor = (loadA, cableA) => { const f = WT.FUSES.find((x) => x >= loadA * 1.25); return { f, ok: f != null && (cableA == null || f <= cableA) }; };

  /** Register a section: id (hash), tile info, render fn. */
  WT.section = function (id, tile, fn) {
    WT.routes[id] = fn;
    if (tile) WT.tiles.push({ id, ...tile });
  };

  /** Simple tab bar: tabs=[{key,label}], returns html. */
  WT.chips = (tabs, active) => `<div class="chips" role="tablist">${tabs.map((t) =>
    `<button class="chip" role="tab" data-k="${t.key}" aria-selected="${t.key === active}">${t.label}</button>`).join('')}</div>`;
})();
