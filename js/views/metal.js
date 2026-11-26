// Metalwork: weight per metre / total for common sections, and drill cutting speed → RPM.
(function () {
  'use strict';
  const { esc, row } = WT;
  const PI = Math.PI;
  const sig = (n, p = 4) => (n == null || !isFinite(n) ? '–' : String(+(+n).toPrecision(p)));
  const work = (lines) => `<div class="work">${lines.map((l) => `<p>${l}</p>`).join('')}</div>`;
  const val = (el) => { const v = parseFloat(el && el.value); return isFinite(v) && v > 0 ? v : null; };

  // densities kg/m³ (typical published values)
  const MAT = [['steel', 'Mild steel', 7850], ['ss', 'Stainless 304/316', 7950], ['al', 'Aluminium', 2700], ['brass', 'Brass', 8500], ['cu', 'Copper', 8960], ['ci', 'Cast iron', 7200]];

  // profile: inputs (mm), area mm², drawing
  const PROF = {
    flat: { name: 'Flat bar', f: [['W', 'Width'], ['T', 'Thickness']], area: (v) => v.W * v.T, eq: 'A = W × T' },
    round: { name: 'Round bar', f: [['D', 'Diameter']], area: (v) => (PI / 4) * v.D ** 2, eq: 'A = π ÷ 4 × D²' },
    square: { name: 'Square bar', f: [['A', 'Side']], area: (v) => v.A ** 2, eq: 'A = side²' },
    shs: { name: 'SHS (square tube)', f: [['A', 'Side'], ['t', 'Wall']], area: (v) => v.A ** 2 - (v.A - 2 * v.t) ** 2, eq: 'A = side² − (side − 2t)²', note: 'Square corners assumed; real SHS has radiused corners and weighs 1–4% less.' },
    rhs: { name: 'RHS (rect. tube)', f: [['A', 'Depth'], ['B', 'Width'], ['t', 'Wall']], area: (v) => v.A * v.B - (v.A - 2 * v.t) * (v.B - 2 * v.t), eq: 'A = d × w − (d − 2t)(w − 2t)', note: 'Square corners assumed; real RHS weighs 1–4% less.' },
    chs: { name: 'CHS / pipe', f: [['D', 'Outside Ø'], ['t', 'Wall']], area: (v) => (PI / 4) * (v.D ** 2 - (v.D - 2 * v.t) ** 2), eq: 'A = π ÷ 4 × (OD² − (OD − 2t)²)' },
    angle: { name: 'Angle', f: [['A', 'Leg 1'], ['B', 'Leg 2'], ['t', 'Thickness']], area: (v) => v.t * (v.A + v.B - v.t), eq: 'A = t × (leg1 + leg2 − t)', note: 'Root and toe radii ignored – within a few %.' },
    sheet: { name: 'Sheet / plate', f: [['t', 'Thickness'], ['W', 'Width'], ['L', 'Length']], sheet: true },
  };

  function drawProf(k, v) {
    const S = 150, c = 75, has = (x) => v[x] != null;
    const lab = (x, y, t, k2, a = 'middle') => `<text x="${x}" y="${y}" text-anchor="${a}" class="gl ${has(k2) ? 'g' : 'u'}">${t}${has(k2) ? ' ' + sig(v[k2]) : ''}</text>`;
    let g = '';
    if (k === 'flat') { const r = Math.min(0.6, Math.max(0.1, has('W') && has('T') ? v.T / v.W : 0.2)); const w = 120, h = w * r; g = `<rect x="${c - w / 2}" y="${c - h / 2}" width="${w}" height="${h}" class="geo-s"/>${lab(c, c + h / 2 + 18, 'W', 'W')}${lab(c + w / 2 + 6, c + 4, 'T', 'T', 'start')}`; }
    if (k === 'round') g = `<circle cx="${c}" cy="${c}" r="52" class="geo-s"/><line x1="${c - 52}" y1="${c}" x2="${c + 52}" y2="${c}" class="geo-d"/>${lab(c, c - 6, 'Ø', 'D')}`;
    if (k === 'square') g = `<rect x="${c - 50}" y="${c - 50}" width="100" height="100" class="geo-s"/>${lab(c, c + 68, 'side', 'A')}`;
    if (k === 'shs' || k === 'rhs') {
      const w = 110, h = k === 'shs' ? 110 : 110 * Math.min(1, Math.max(0.3, has('A') && has('B') ? v.A / v.B : 0.6)), tt = Math.max(5, Math.min(20, has('t') && has(k === 'shs' ? 'A' : 'B') ? (w * v.t) / v[k === 'shs' ? 'A' : 'B'] : 9));
      g = `<path d="M${c - w / 2} ${c - h / 2}h${w}v${h}h${-w}Z M${c - w / 2 + tt} ${c - h / 2 + tt}v${h - 2 * tt}h${w - 2 * tt}v${-(h - 2 * tt)}Z" fill-rule="evenodd" class="geo-s"/>
        ${lab(c, c + h / 2 + 18, k === 'shs' ? 'side' : 'w', k === 'shs' ? 'A' : 'B')}${k === 'rhs' ? lab(c + w / 2 + 6, c + 4, 'd', 'A', 'start') : ''}${lab(c, c - h / 2 + tt + 16, 't', 't')}`;
    }
    if (k === 'chs') { const R = 55, ri = Math.max(10, R - Math.max(4, Math.min(30, has('t') && has('D') ? (2 * R * v.t) / v.D : 8))); g = `<path d="M${c - R} ${c}a${R} ${R} 0 1 0 ${2 * R} 0a${R} ${R} 0 1 0 ${-2 * R} 0Z M${c - ri} ${c}a${ri} ${ri} 0 1 1 ${2 * ri} 0a${ri} ${ri} 0 1 1 ${-2 * ri} 0Z" fill-rule="evenodd" class="geo-s"/>${lab(c, c + R + 18, 'OD', 'D')}${lab(c, c + 5, 't', 't')}`; }
    if (k === 'angle') { const a = 110, tt = Math.max(6, Math.min(30, has('t') && has('A') ? (a * v.t) / v.A : 12)), x0 = c - 50, y0 = c + 55; g = `<path d="M${x0} ${y0}V${y0 - a}h${tt}V${y0 - tt}H${x0 + a}V${y0}Z" class="geo-s"/>${lab(x0 - 6, y0 - a / 2, 'leg 1', 'A', 'end')}${lab(x0 + a / 2, y0 + 18, 'leg 2', 'B')}${lab(x0 + tt + 6, y0 - tt - 8, 't', 't', 'start')}`; }
    if (k === 'sheet') g = `<path d="M30 105 L95 70 L165 95 L100 130Z" class="geo-s"/><path d="M30 105v8L100 138v-8M100 138l65-35v-8" class="geo-s"/>${lab(55, 140, 'W', 'W', 'end')}${lab(140, 128, 'L', 'L', 'start')}${lab(178, 104, 't', 't', 'start')}`;
    return `<svg class="geo" viewBox="-60 0 270 ${S}" role="img"><title>${esc(PROF[k].name)}</title>${g}</svg>`;
  }

  let CAT = null;
  function catFind(mat, prof, v) {
    if (!CAT) return null;
    return CAT.rows.find((r) => r.mat === mat && r.prof === prof && Object.entries(r.k).every(([k, x]) => v[k] != null && Math.abs(v[k] - x) < 1e-6)
      && (prof !== 'angle' && prof !== 'rhs' ? true : true)) || (prof === 'rhs' || prof === 'angle' ? CAT.rows.find((r) => r.mat === mat && r.prof === prof && Math.abs(r.k.A - v.B) < 1e-6 && Math.abs(r.k.B - v.A) < 1e-6 && Math.abs(r.k.t - v.t) < 1e-6) : null);
  }
  async function weight($el) {
    CAT = await WT.load('data/metal/catalogue.json');
    const st = WT.store.get('metal.w', { mat: 'steel', prof: 'shs', v: {}, len: '' });
    $el.innerHTML = `<form class="calc" onsubmit="return false">
      <div class="row2"><label>Material<select id="mat">${MAT.map(([k, n, d]) => `<option value="${k}">${n} (${d} kg/m³)</option>`).join('')}</select></label></div>
      <label>Section<select id="prof">${Object.entries(PROF).map(([k, p]) => `<option value="${k}">${p.name}</option>`).join('')}</select></label>
      <div id="pd"></div><div id="pf" class="gform"></div>
      <label id="lenw">Length (m) – optional, for total weight<input id="len" inputmode="decimal"></label>
      </form><div id="wo"></div>`;
    const $ = (id) => $el.querySelector('#' + id);
    $('mat').value = st.mat; $('prof').value = st.prof; $('len').value = st.len;
    function fields() {
      const p = PROF[st.prof];
      $('pf').innerHTML = p.f.map(([k, n]) => `<div class="gf"><label><b>${k}</b> ${n}<small>${st.prof === 'sheet' && k !== 't' ? 'mm, optional' : 'mm'}</small></label>
        <div class="gi"><input data-k="${k}" inputmode="decimal" value="${esc((st.v[st.prof] || {})[k] || '')}"><span class="gu">mm</span></div></div>`).join('');
      $('lenw').hidden = !!p.sheet;
    }
    function go() {
      st.mat = $('mat').value; st.len = $('len').value; WT.store.set('metal.w', st);
      const p = PROF[st.prof], rho = MAT.find((m) => m[0] === st.mat)[2], v = {};
      $('pf').querySelectorAll('input').forEach((i) => { const x = val(i); if (x != null) v[i.dataset.k] = x; });
      $('pd').innerHTML = drawProf(st.prof, v);
      if (p.sheet) {
        if (!v.t) { $('wo').innerHTML = ''; return; }
        const kgm2 = (v.t / 1000) * rho, sq = v.W && v.L ? (v.W * v.L) / 1e6 : null;
        $('wo').innerHTML = `<div class="out">${row('Per m²', `<b class="acc">${sig(kgm2)} kg/m²</b>`, 'hl')}${sq ? row('This sheet', `<b class="acc">${sig(kgm2 * sq)} kg</b> <small>(${sig(sq)} m²)</small>`) : ''}</div>
          ${work([`kg/m² = t ÷ 1000 × density = ${sig(v.t)} ÷ 1000 × ${rho} = ${sig(kgm2)}`, ...(sq ? [`Area = ${sig(v.W)} × ${sig(v.L)} mm = ${sig(sq)} m²`, `Weight = ${sig(kgm2)} × ${sig(sq)} = <strong>${sig(kgm2 * sq)} kg</strong>`] : [])])}`;
        return;
      }
      if (p.f.some(([k]) => v[k] == null)) { $('wo').innerHTML = ''; return; }
      if (v.t && ((v.A && 2 * v.t >= v.A) || (v.B && 2 * v.t >= v.B) || (v.D && 2 * v.t >= v.D))) { $('wo').innerHTML = `<div class="out">${row('Check', 'Wall is too thick for that size')}</div>`; return; }
      const A = p.area(v), kgf = A * 1e-6 * rho, L = val($('len'));
      const cat = catFind(st.mat, st.prof, v), kgm = cat ? cat.kgm : kgf;
      $('wo').innerHTML = `<div class="out">${row('Per metre', `<b class="acc">${sig(kgm)} kg/m</b> ${cat ? '<small>catalogue</small>' : '<small>calculated</small>'}`, 'hl')}${L ? row(`${sig(L)} m length`, `<b class="acc">${sig(kgm * L)} kg</b>`) : ''}
        ${cat ? row('Calculated (square corners)', `${sig(kgf)} kg/m`) + row('Source', `<a href="${esc(cat.url)}" target="_blank" rel="noopener">${esc(cat.src)}</a> <small>${esc(cat.conf)}</small>`) : ''}${row('Cross-section', `${sig(A)} mm²`)}</div>
        ${work([p.eq, `= ${sig(A)} mm²`, `kg/m = mm² × density ÷ 1,000,000`, `= ${sig(A)} × ${rho} ÷ 1,000,000 = <strong>${sig(kgf)} kg/m</strong>`, ...(L ? [`Total = ${sig(kgm)} × ${sig(L)} m = <strong>${sig(kgm * L)} kg</strong>`] : [])])}
        ${p.note && !cat ? `<p class="foot">${p.note}</p>` : ''}${cat ? '<p class="foot">Standard size – catalogue weight used (includes corner radii). Total uses the catalogue figure.</p>' : ''}`;
    }
    $('pf').addEventListener('input', (e) => { const k = e.target.dataset.k; if (!k) return; (st.v[st.prof] ||= {})[k] = e.target.value; go(); });
    $('prof').addEventListener('change', () => { st.prof = $('prof').value; fields(); go(); });
    $('mat').addEventListener('change', go); $('len').addEventListener('input', go);
    fields(); go();
  }

  // ---------- Drill speed. Typical HSS cutting speeds (m/min); cobalt similar to +20%, carbide roughly 2–3×.
  const VC = [['al', 'Aluminium', 60, 120, 0], ['brass', 'Brass / bronze', 50, 80, 0], ['plas', 'Plastic (acrylic, nylon)', 30, 80, 0], ['ms', 'Mild steel', 20, 30, 1], ['ci', 'Cast iron', 20, 35, 3], ['cs', 'Med. carbon / 4140 steel', 10, 20, 2], ['ss', 'Stainless 304/316', 8, 15, 2], ['tool', 'Tool steel (annealed)', 8, 15, 2]];
  // AIMS feed mm/rev by diameter band; columns: soft, mild steel, alloy/stainless, cast iron
  const FEED = [[3, ['0.03–0.06', '0.03–0.05', '0.02–0.04', '0.03–0.05']], [6, ['0.06–0.12', '0.05–0.10', '0.04–0.08', '0.05–0.10']], [12, ['0.12–0.25', '0.10–0.18', '0.08–0.15', '0.10–0.18']],
    [20, ['0.25–0.40', '0.18–0.30', '0.12–0.25', '0.18–0.30']], [32, ['0.40–0.65', '0.25–0.45', '0.18–0.35', '0.25–0.45']], [1e9, ['0.65–1.00', '0.40–0.60', '0.30–0.50', '0.40–0.60']]];
  const AIMS = 'https://www.aimsindustrial.com.au';
  const SIZES = [3, 4, 5, 6, 6.8, 8, 8.5, 10, 10.2, 12, 13, 16, 20, 25];
  function speed($el) {
    const st = WT.store.get('metal.s', { m: 'ms', d: '8.5', tool: '1' });
    $el.innerHTML = `<p class="intro">RPM = cutting speed × 1000 ÷ (π × drill Ø). Typical HSS figures – start low and adjust by the chip and sound.</p>
      <form class="calc" onsubmit="return false">
      <label>Material<select id="m">${VC.map(([k, n, a, b]) => `<option value="${k}">${n} – ${a}–${b} m/min</option>`).join('')}</select></label>
      <div class="row2"><label>Drill Ø (mm)<input id="d" inputmode="decimal"></label><label>Drill type<select id="tool"><option value="1">HSS</option><option value="1.2">Cobalt (HSS-Co) – ×1.2, unverified</option><option value="2.5">Carbide – ×2.5, unverified</option></select></label></div>
      </form><div id="so"></div><h3 class="sub">Common sizes</h3><div id="st"></div>
      <p class="foot">Use cutting fluid on steel and stainless; aluminium likes kerosene/WD-40. Stainless: keep feed steady – rubbing work-hardens it. Large drills: pilot first. HSS speeds and feeds: AIMS Industrial (AU distributor) chart, medium confidence. Cobalt and carbide multipliers are not yet sourced – to check.</p>`;
    const $ = (id) => $el.querySelector('#' + id);
    $('m').value = st.m; $('d').value = st.d; $('tool').value = st.tool;
    const rpm = (vc, d) => (vc * 1000) / (PI * d);
    function go() {
      st.m = $('m').value; st.d = $('d').value; st.tool = $('tool').value; WT.store.set('metal.s', st);
      const [, n, a0, b0, fc] = VC.find((x) => x[0] === st.m), k = +st.tool, a = a0 * k, b = b0 * k, d = val($('d'));
      $('so').innerHTML = d ? `<div class="out">${row('Spindle speed', `<b class="acc">${Math.round(rpm(a, d))}–${Math.round(rpm(b, d))} rpm</b>`, 'hl')}${row('Cutting speed', `${sig(a, 3)}–${sig(b, 3)} m/min`)}${row('Feed', `${FEED.find(([mx]) => d < mx)[1][fc]} mm/rev`)}</div>
        ${work([`RPM = Vc × 1000 ÷ (π × D)`, `= ${sig(a, 3)} × 1000 ÷ (π × ${sig(d)}) = ${Math.round(rpm(a, d))}`, `to ${sig(b, 3)} × 1000 ÷ (π × ${sig(d)}) = ${Math.round(rpm(b, d))}`])}` : '';
      $('st').innerHTML = `<table class="tbl"><thead><tr><th>Drill Ø</th><th>RPM (${esc(n)})</th></tr></thead><tbody>
        ${SIZES.map((s) => `<tr${d === s ? ' class="near"' : ''}><td>${s} mm</td><td>${Math.round(rpm(a, s))}–${Math.round(rpm(b, s))}</td></tr>`).join('')}</tbody></table>`;
    }
    $('d').addEventListener('input', go); ['m', 'tool'].forEach((x) => $(x).addEventListener('change', go)); go();
  }

  const TABS = [{ key: 'weight', label: 'Metal weight' }, { key: 'speed', label: 'Drill speed' }];
  async function metal() {
    WT.setHeader('Metalwork', true);
    let tab = WT.store.get('metal.tab', 'weight');
    WT.$view.innerHTML = `${WT.chips(TABS, tab)}<div id="pane"></div>`;
    const $p = WT.$view.querySelector('#pane');
    async function render() {
      WT.$view.querySelectorAll(':scope > .chips .chip').forEach((b) => b.setAttribute('aria-selected', b.dataset.k === tab));
      await ({ weight, speed })[tab]($p);
    }
    WT.$view.querySelector('.chips').addEventListener('click', (e) => { const b = e.target.closest('.chip'); if (!b) return; tab = b.dataset.k; WT.store.set('metal.tab', tab); render(); });
    render();
  }
  WT.section('metal', { name: 'Metalwork', desc: 'Steel & alloy weight, drill RPM' }, metal);
})();
