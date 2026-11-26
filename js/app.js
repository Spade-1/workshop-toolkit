// Workshop Toolkit – UI. Plain JS, hash routing, data from /data/*.json.
(function () {
  'use strict';
  const $view = document.getElementById('view');
  const $title = document.getElementById('title');
  const $back = document.getElementById('back');
  const C = window.ThreadCalc;

  // up to d decimals, trailing zeros trimmed
  const fmt = (n, d = 2) => (n == null ? '–' : String(Number(Number(n).toFixed(d))));
  // drill sizes: at least 1 decimal (5.0, 6.8, 2.05)
  const mm = (n) => { if (n == null) return '–'; const s = fmt(n, 2); return `${s.includes('.') ? s : s + '.0'} mm`; };
  const pct = (n) => `${Math.round(n)}%`;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const engClass = (p) => (p < 60 || p > 85 ? 'eng bad' : p < 65 || p > 80 ? 'eng warn' : 'eng ok');

  let threads = null;
  async function loadThreads() {
    if (!threads) threads = await (await fetch('data/threads/threads.json')).json();
    return threads;
  }

  // ------------------------------------------------------------ store (per-viewer prefs)
  const store = {
    get(k, d) { try { const v = localStorage.getItem('wt.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('wt.' + k, JSON.stringify(v)); } catch (e) { /* ignore */ } },
  };

  // ------------------------------------------------------------ routes
  const SECTIONS = [
    { id: 'taps', name: 'Taps & drills', desc: 'Tap drill, clearance, engagement', ready: true },
    { id: 'engage', name: 'Thread engagement', desc: 'Any drill → % thread', ready: true },
    { id: 'threads', name: 'Thread reference', desc: 'Pitch, major / minor dia', ready: false },
    { id: 'convert', name: 'Conversions', desc: 'Drill sizes, mm ↔ inch', ready: false },
    { id: 'welding', name: 'Welding', desc: 'MIG / TIG / stick settings', ready: false },
    { id: 'auto', name: 'Automotive', desc: 'Your reference table', ready: false },
  ];

  function setHeader(title, back) {
    $title.textContent = title;
    $back.hidden = !back;
    document.title = back ? `${title} · Workshop Toolkit` : 'Workshop Toolkit';
  }
  $back.addEventListener('click', () => { location.hash = ''; });

  function home() {
    setHeader('Workshop Toolkit', false);
    $view.innerHTML = `<div class="tiles">${SECTIONS.map((s) => `
      <a class="tile${s.ready ? '' : ' soon'}" href="${s.ready ? '#' + s.id : '#'}" ${s.ready ? '' : 'aria-disabled="true"'}>
        <span class="tile-name">${s.name}</span>
        <span class="tile-desc">${s.ready ? s.desc : 'Coming soon'}</span>
      </a>`).join('')}</div>
      <p class="foot">Offline reference. Values computed from ISO / ASME / BS thread standards – verify critical work.</p>`;
  }

  // ------------------------------------------------------------ taps & drills
  const SERIES = [
    { key: 'metric_coarse', label: 'Metric' },
    { key: 'metric_fine', label: 'Metric fine' },
    { key: 'unc', label: 'UNC' },
    { key: 'unf', label: 'UNF' },
    { key: 'bsw', label: 'BSW' },
    { key: 'bsf', label: 'BSF' },
    { key: 'pipe', label: 'Pipe' },
  ];

  function summary(r) {
    if (r.series === 'BSP') return mm(r.drill_G_mm) + ' (G)';
    if (r.series === 'NPT') return `${esc(r.drill.name)} · ${mm(r.drill.mm)}`;
    if (r.tap_drill_mm != null) return mm(r.tap_drill_mm);
    const t = r.tap_drill;
    return `${mm(t.metric.mm)} · ${esc(t.imperial ? t.imperial.name : '')}`;
  }

  function row(label, value, cls) {
    return `<div class="kv${cls ? ' ' + cls : ''}"><span>${label}</span><b>${value}</b></div>`;
  }

  function drillLine(d) {
    return `${mm(d.mm)} <span class="${engClass(d.engagement_pct)}">${pct(d.engagement_pct)}</span>`;
  }
  function impLine(d) {
    return `${esc(d.name)} (${fmt(d.in, 4)}") <span class="${engClass(d.engagement_pct)}">${pct(d.engagement_pct)}</span>`;
  }

  function detail(r) {
    let h = '';
    if (r.series === 'BSP') {
      h += row('Tap drill – G (fastening, parallel)', mm(r.drill_G_mm));
      h += row('Tap drill – Rp (sealing, parallel)', mm(r.drill_Rp_mm));
      h += row('Tap drill – Rc (taper)', mm(r.drill_Rc_mm));
      h += row('Major dia', mm(r.major_mm));
      h += row('Minor dia', mm(r.minor_mm));
      h += row('TPI', r.tpi);
      return h;
    }
    if (r.series === 'NPT') {
      h += row('Tap drill (no reamer)', `${esc(r.drill.name)} = ${mm(r.drill.mm)}`);
      h += row('Pipe OD', `${fmt(r.pipe_od_in, 3)}" = ${mm(r.pipe_od_mm)}`);
      h += row('TPI', r.tpi);
      return h;
    }
    if (r.tap_drill_mm != null) { // metric
      h += row('Tap drill', `${mm(r.tap_drill_mm)} <span class="${engClass(r.tap_drill_engagement_pct)}">${pct(r.tap_drill_engagement_pct)}</span>`, 'hl');
      h += row('Imperial drill (≈75%)', impLine(r.nearest_imperial_drill));
      h += row('Forming tap drill', mm(r.forming_drill_mm));
      if (r.clearance_mm) h += row('Clearance close / normal / loose', `${fmt(r.clearance_mm.close)} / ${fmt(r.clearance_mm.normal)} / ${fmt(r.clearance_mm.loose)} mm`);
      h += row('Pitch', `${fmt(r.pitch_mm, 3)} mm (${fmt(r.tpi, 1)} TPI)`);
      h += row('Minor dia (nut)', mm(r.minor_int_mm));
      h += row('Pitch dia', mm(r.pitch_dia_mm));
      return h;
    }
    const t = r.tap_drill; // unified / whitworth
    h += row('Metric drill', drillLine(t.metric), 'hl');
    if (t.imperial) h += row('Imperial drill', impLine(t.imperial));
    h += row('Other metric', t.metric_alts.map(drillLine).join(' · '));
    if (t.imperial_alts) h += row('Other imperial', t.imperial_alts.map(impLine).join(' · '));
    h += row('Ideal @ 75%', mm(t.ideal_mm));
    h += row('Major dia', `${fmt(r.major_in, 4)}" = ${mm(r.major_mm)}`);
    h += row('Pitch', `${r.tpi} TPI = ${fmt(r.pitch_mm, 3)} mm`);
    if (r.minor_int_mm != null) h += row('Minor dia (nut)', mm(r.minor_int_mm));
    if (r.minor_mm != null) h += row('Minor dia', mm(r.minor_mm));
    return h;
  }

  async function taps() {
    setHeader('Taps & drills', true);
    const d = await loadThreads();
    let series = store.get('taps.series', 'metric_coarse');
    if (!d[series]) series = 'metric_coarse';
    $view.innerHTML = `
      <div class="chips" role="tablist">${SERIES.map((s) => `<button class="chip" role="tab" data-k="${s.key}">${s.label}</button>`).join('')}</div>
      <input id="q" class="search" type="search" inputmode="search" placeholder="Search size e.g. M8, 1/4, 3/8 BSP" autocomplete="off">
      <ul id="list" class="list"></ul>
      <p class="foot">Engagement colour: <span class="eng ok">65–80%</span> <span class="eng warn">60–65 / 80–85%</span> <span class="eng bad">outside</span>. 75% is the usual target; go higher in soft or thin material.</p>`;
    const $list = $view.querySelector('#list');
    const $q = $view.querySelector('#q');
    const norm = (s) => s.toLowerCase().replace(/["×x\s]/g, '').replace('m', 'm');

    function render() {
      $view.querySelectorAll('.chip').forEach((b) => b.setAttribute('aria-selected', b.dataset.k === series));
      const q = norm($q.value);
      // search across all series when there's a query
      const pool = q ? SERIES.flatMap((s) => d[s.key]) : d[series];
      const rows = pool.filter((r) => !q || norm(r.label).includes(q) || norm(r.id).includes(q));
      $list.innerHTML = rows.length ? rows.map((r) => `
        <li class="item">
          <button class="item-head" aria-expanded="false">
            <span class="item-label">${esc(r.label)}</span>
            <span class="item-sum">${summary(r)}</span>
          </button>
          <div class="item-body" hidden>${detail(r)}</div>
        </li>`).join('') : '<li class="empty">No match</li>';
    }
    $view.querySelector('.chips').addEventListener('click', (e) => {
      const b = e.target.closest('.chip'); if (!b) return;
      series = b.dataset.k; store.set('taps.series', series); $q.value = ''; render();
    });
    $q.addEventListener('input', render);
    $list.addEventListener('click', (e) => {
      const h = e.target.closest('.item-head'); if (!h) return;
      const body = h.nextElementSibling; const open = body.hidden;
      body.hidden = !open; h.setAttribute('aria-expanded', open);
    });
    render();
  }

  // ------------------------------------------------------------ engagement calculator
  async function engage() {
    setHeader('Thread engagement', true);
    const d = await loadThreads();
    const all = SERIES.flatMap((s) => d[s.key]).filter((r) => r.series !== 'BSP' && r.series !== 'NPT');
    $view.innerHTML = `
      <form class="calc" onsubmit="return false">
        <label>Thread
          <select id="t">${all.map((r, i) => `<option value="${i}">${esc(r.label)}</option>`).join('')}</select>
        </label>
        <label>Drill
          <div class="row2"><input id="dv" type="number" inputmode="decimal" step="any" placeholder="e.g. 6.8">
          <select id="du"><option value="mm">mm</option><option value="in">inch</option></select></div>
        </label>
        <label>Target engagement
          <div class="row2"><input id="tp" type="number" inputmode="decimal" value="75"><span class="unit">%</span></div>
        </label>
      </form>
      <div id="out" class="out"></div>`;
    const $ = (id) => $view.querySelector('#' + id);
    const last = store.get('engage.thread', null);
    let idx = all.findIndex((r) => r.id === last);
    if (idx < 0) idx = all.findIndex((r) => r.id === 'M8x1.25');
    if (idx >= 0) $('t').value = idx;
    function calc() {
      const r = all[$('t').value];
      store.set('engage.thread', r.id);
      const form = r.series === 'BSW' || r.series === 'BSF' ? 55 : 60;
      const D = r.major_mm, P = r.pitch_mm;
      const tp = parseFloat($('tp').value) || 75;
      const ideal = C.drillForEngagement(D, P, tp, form);
      let h = row(`Drill for ${fmt(tp, 1)}%`, `${mm(ideal)} = ${fmt(ideal / C.IN, 4)}"`, 'hl');
      const v = parseFloat($('dv').value);
      if (!isNaN(v)) {
        const dm = $('du').value === 'in' ? v * C.IN : v;
        const e = C.engagement(D, P, dm, form);
        const txt = dm >= D ? 'larger than the thread – no engagement' : dm <= D - 1.3 * P ? 'smaller than the minor dia – tap will bind' : `<span class="${engClass(e)}">${fmt(e, 1)}%</span>`;
        h = row('Your drill', `${mm(dm)} → ${txt}`, 'hl') + h;
      }
      h += row('Major dia', mm(D));
      h += row('Pitch', `${fmt(P, 3)} mm`);
      h += row('Thread form', `${form}°`);
      $('out').innerHTML = h;
    }
    ['t', 'dv', 'du', 'tp'].forEach((id) => $(id).addEventListener('input', calc));
    calc();
  }

  // ------------------------------------------------------------ router
  const ROUTES = { '': home, taps, engage };
  async function route() {
    const key = location.hash.replace(/^#/, '');
    const fn = ROUTES[key] || home;
    try { await fn(); } catch (err) {
      $view.innerHTML = `<p class="empty">Couldn't load this section. ${esc(err.message)}</p>`;
    }
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);
  route();

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
