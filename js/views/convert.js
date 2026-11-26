// Conversions: drill size chart, length (with fractions + nearest drill), torque, pressure, temperature.
(function () {
  'use strict';
  const { fmt, esc, row } = WT;
  const IN = 25.4;

  const TABS = [
    { key: 'drills', label: 'Drill chart' },
    { key: 'length', label: 'mm ↔ inch' },
    { key: 'torque', label: 'Torque' },
    { key: 'pressure', label: 'Pressure' },
    { key: 'temp', label: 'Temp' },
  ];

  // ---- fractions
  function toFraction(inches, den = 64) {
    const sign = inches < 0 ? '-' : ''; inches = Math.abs(inches);
    let whole = Math.floor(inches), num = Math.round((inches - whole) * den);
    if (num === den) { whole += 1; num = 0; }
    let d = den; while (num && num % 2 === 0) { num /= 2; d /= 2; }
    const f = num ? `${num}/${d}` : '';
    return sign + (whole && f ? `${whole}-${f}"` : whole ? `${whole}"` : f ? `${f}"` : '0"');
  }
  function parseInches(s) { // "5/16", "1-1/4", "1 1/4", ".3125"
    s = String(s).trim().replace(/"/g, '');
    let m = s.match(/^(\d+)[\s-]+(\d+)\/(\d+)$/); if (m) return +m[1] + m[2] / m[3];
    m = s.match(/^(\d+)\/(\d+)$/); if (m) return m[1] / m[2];
    const v = parseFloat(s); return isNaN(v) ? null : v;
  }

  // ---- generic linked-unit converter
  function unitConverter($el, units, key) {
    // units: [{id,label,toBase(v),fromBase(b),d}]
    $el.innerHTML = `<form class="calc" onsubmit="return false">${units.map((u) => `
      <label>${u.label}<input data-u="${u.id}" type="number" inputmode="decimal" step="any"></label>`).join('')}</form>`;
    const inputs = [...$el.querySelectorAll('input')];
    function update(src) {
      const u = units.find((x) => x.id === src.dataset.u);
      const v = parseFloat(src.value);
      WT.store.set('conv.' + key, { u: u.id, v: src.value });
      inputs.forEach((i) => {
        if (i === src) return;
        const t = units.find((x) => x.id === i.dataset.u);
        i.value = isNaN(v) ? '' : fmt(t.fromBase(u.toBase(v)), t.d);
      });
    }
    inputs.forEach((i) => i.addEventListener('input', () => update(i)));
    const last = WT.store.get('conv.' + key, null);
    if (last) { const i = inputs.find((x) => x.dataset.u === last.u); if (i) { i.value = last.v; update(i); } }
  }

  const lin = (k, d = 2) => ({ toBase: (v) => v * k, fromBase: (b) => b / k, d });
  const TORQUE = [
    { id: 'nm', label: 'N·m', ...lin(1) },
    { id: 'ftlb', label: 'ft·lb', ...lin(1.3558179) },
    { id: 'inlb', label: 'in·lb', ...lin(0.1129848, 1) },
    { id: 'kgfm', label: 'kgf·m', ...lin(9.80665, 3) },
  ];
  const PRESSURE = [
    { id: 'kpa', label: 'kPa', ...lin(1, 1) },
    { id: 'bar', label: 'bar', ...lin(100, 3) },
    { id: 'psi', label: 'psi', ...lin(6.894757, 1) },
    { id: 'kgfcm', label: 'kgf/cm²', ...lin(98.0665, 3) },
  ];
  const TEMP = [
    { id: 'c', label: '°C', toBase: (v) => v, fromBase: (b) => b, d: 1 },
    { id: 'f', label: '°F', toBase: (v) => (v - 32) / 1.8, fromBase: (b) => b * 1.8 + 32, d: 1 },
  ];

  // ---- drill chart
  async function drillChart($el) {
    const dr = await WT.load('data/threads/drills.json');
    const nearestMetric = (mmv) => dr.metric_mm.reduce((a, b) => (Math.abs(b - mmv) < Math.abs(a - mmv) ? b : a));
    const F = [{ key: 'all', label: 'All' }, { key: 'number', label: 'Number' }, { key: 'letter', label: 'Letter' }, { key: 'fraction', label: 'Fraction' }];
    let f = WT.store.get('conv.drillfilter', 'all');
    $el.innerHTML = `${WT.chips(F, f).replace('class="chips"', 'class="chips small"')}
      <input id="dq" class="search" type="search" inputmode="decimal" placeholder="Find nearest to… e.g. 6.5 (mm) or 0.257 / 17/64 (in)">
      <table class="tbl"><thead><tr><th>Drill</th><th>inch</th><th>mm</th><th>Near metric</th></tr></thead><tbody id="db"></tbody></table>`;
    const $b = $el.querySelector('#db'), $q = $el.querySelector('#dq');
    function render() {
      $el.querySelectorAll('.chip').forEach((b) => b.setAttribute('aria-selected', b.dataset.k === f));
      const list = dr.imperial.filter((x) => f === 'all' || x.series === f);
      // query: <=2 with no slash = inch decimal if < 1.5? Treat "/" or leading "." or value < 1 as inch, else mm
      const q = $q.value.trim(); let target = null;
      if (q) {
        const isInch = q.includes('/') || q.includes('"') || parseFloat(q) < 1;
        const v = isInch ? parseInches(q) : parseFloat(q);
        if (v != null && !isNaN(v)) target = isInch ? v * IN : v;
      }
      let near = null;
      if (target != null) near = list.reduce((a, b) => (Math.abs(b.mm - target) < Math.abs(a.mm - target) ? b : a));
      $b.innerHTML = list.map((x) => `<tr${near === x ? ' class="near" id="nearrow"' : ''}>
        <td>${esc(x.name)}</td><td>${x.in.toFixed(4)}</td><td>${x.mm.toFixed(2)}</td><td>${nearestMetric(x.mm).toFixed(nearestMetric(x.mm) < 3 ? 2 : 1)}</td></tr>`).join('');
      if (near) { const n = $el.querySelector('#nearrow'); if (n) n.scrollIntoView({ block: 'center' }); }
    }
    $el.querySelector('.chips').addEventListener('click', (e) => {
      const b = e.target.closest('.chip'); if (!b) return; f = b.dataset.k; WT.store.set('conv.drillfilter', f); render();
    });
    $q.addEventListener('input', render);
    render();
  }

  // ---- length
  async function length($el) {
    const dr = await WT.load('data/threads/drills.json');
    $el.innerHTML = `<form class="calc" onsubmit="return false">
      <label>Millimetres<input id="lmm" type="number" inputmode="decimal" step="any"></label>
      <label>Inches – decimal or fraction (5/16, 1-1/4)<input id="lin" type="text" inputmode="text" autocomplete="off"></label>
      </form><div id="lout" class="out"></div>`;
    const $mm = $el.querySelector('#lmm'), $in = $el.querySelector('#lin'), $o = $el.querySelector('#lout');
    function show(mmv) {
      if (mmv == null || isNaN(mmv)) { $o.innerHTML = ''; return; }
      const inch = mmv / IN;
      const imp = dr.imperial.reduce((a, b) => (Math.abs(b.mm - mmv) < Math.abs(a.mm - mmv) ? b : a));
      const met = dr.metric_mm.reduce((a, b) => (Math.abs(b - mmv) < Math.abs(a - mmv) ? b : a));
      const fr = toFraction(inch);
      const frErr = (parseInches(fr) * IN - mmv);
      $o.innerHTML = row('mm', fmt(mmv, 3), 'hl') + row('inch', fmt(inch, 4), 'hl') +
        row('Nearest 1/64"', `${fr} <small>(${frErr >= 0 ? '+' : ''}${fmt(frErr, 3)} mm)</small>`) +
        row('Nearest imperial drill', `${esc(imp.name)} = ${imp.mm.toFixed(2)} mm`) +
        row('Nearest metric drill', `${fmt(met)} mm`);
      WT.store.set('conv.length', mmv);
    }
    $mm.addEventListener('input', () => { const v = parseFloat($mm.value); $in.value = isNaN(v) ? '' : fmt(v / IN, 4); show(v); });
    $in.addEventListener('input', () => { const v = parseInches($in.value); $mm.value = v == null ? '' : fmt(v * IN, 3); show(v == null ? null : v * IN); });
    const last = WT.store.get('conv.length', null);
    if (last != null) { $mm.value = fmt(last, 3); $in.value = fmt(last / IN, 4); show(last); }
  }

  async function convert() {
    WT.setHeader('Conversions', true);
    let tab = WT.store.get('conv.tab', 'drills');
    WT.$view.innerHTML = `${WT.chips(TABS, tab)}<div id="pane"></div>`;
    const $p = WT.$view.querySelector('#pane');
    async function render() {
      WT.$view.querySelectorAll(':scope > .chips .chip').forEach((b) => b.setAttribute('aria-selected', b.dataset.k === tab));
      if (tab === 'drills') await drillChart($p);
      else if (tab === 'length') await length($p);
      else if (tab === 'torque') unitConverter($p, TORQUE, 'torque');
      else if (tab === 'pressure') unitConverter($p, PRESSURE, 'pressure');
      else unitConverter($p, TEMP, 'temp');
    }
    WT.$view.querySelector('.chips').addEventListener('click', (e) => {
      const b = e.target.closest('.chip'); if (!b) return; tab = b.dataset.k; WT.store.set('conv.tab', tab); render();
    });
    await render();
  }

  WT.section('convert', { name: 'Conversions', desc: 'Drill chart, mm ↔ inch, torque, pressure' }, convert);
  WT.toFraction = toFraction; WT.parseInches = parseInches;
})();
