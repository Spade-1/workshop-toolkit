// Fasteners – general bolt torque, property classes, stainless, imperial grades.
(function () {
  'use strict';
  const { fmt, esc, row } = WT;
  const TABS = [{ key: 'torque', label: 'Torque' }, { key: 'strength', label: 'Strength (kg)' }, { key: 'grades', label: 'Grades' }, { key: 'stainless', label: 'Stainless' }, { key: 'imperial', label: 'Imperial' }];
  const COND = [{ key: 'dry', label: 'Dry / plain' }, { key: 'zinc', label: 'Zinc plated' }, { key: 'lube', label: 'Oiled / anti-seize' }];
  const COMMON = ['M3', 'M4', 'M5', 'M6', 'M8', 'M10', 'M12'];
  const NM_FTLB = 0.737562;

  function torque($el, F) {
    const classes = Object.keys(F.torque.classes).map((k) => ({ key: k, label: k }));
    let cls = WT.store.get('fast.class', '8.8'); if (!F.torque.classes[cls]) cls = '8.8';
    let cond = WT.store.get('fast.cond', 'dry');
    let fine = WT.store.get('fast.fine', false);
    $el.innerHTML = `<p class="clab">Bolt grade <small>– the number stamped on the bolt head (8.8, 10.9…) or A2/A4 for stainless</small></p>
      <div id="cc">${WT.chips(classes, cls).replace('class="chips"', 'class="chips small"')}</div>
      <p class="clab">Thread condition <small>– dry, plated or lubricated changes the torque</small></p>
      <div id="cd">${WT.chips(COND, cond).replace('class="chips"', 'class="chips small"')}</div>
      <label class="inline"><input id="fine" type="checkbox"> Show fine pitches</label>
      <table class="tbl"><thead><tr><th>Size</th><th>N·m</th><th>ft·lb</th><th>Clamp kN</th></tr></thead><tbody id="tb"></tbody></table>
      <div class="notes"><p>${esc(F.torque.method)}</p>${F.torque.notes.map((n) => `<p>${esc(n)}</p>`).join('')}</div>`;
    const $ = (s) => $el.querySelector(s);
    $('#fine').checked = fine;
    function render() {
      $el.querySelectorAll('#cc .chip').forEach((b) => b.setAttribute('aria-selected', b.dataset.k === cls));
      $el.querySelectorAll('#cd .chip').forEach((b) => b.setAttribute('aria-selected', b.dataset.k === cond));
      const rows = F.torque.classes[cls];
      const base = (r) => r.size.split(/x/i)[0];
      const coarsePitch = {};
      rows.forEach((r) => { const b = base(r); if (!(b in coarsePitch) || r.pitch > coarsePitch[b]) coarsePitch[b] = r.pitch; });
      const list = rows.filter((r) => fine || r.pitch === coarsePitch[base(r)])
        .sort((a, b) => parseFloat(base(a).slice(1)) - parseFloat(base(b).slice(1)) || b.pitch - a.pitch);
      const dp = (v) => (v < 20 ? 1 : 0);
      $('#tb').innerHTML = list.map((r) => {
        const t = r[cond]; const isFine = r.pitch !== coarsePitch[base(r)];
        return `<tr class="${COMMON.includes(base(r)) && !isFine ? 'common' : ''}"><td>${base(r)}${isFine ? ` × ${fmt(r.pitch)}` : ''}</td>
          <td><b>${fmt(t, dp(t))}</b></td><td>${fmt(t * NM_FTLB, dp(t * NM_FTLB))}</td><td>${fmt(r.preload_kN, 1)}</td></tr>`;
      }).join('');
    }
    $('#cc').addEventListener('click', (e) => { const b = e.target.closest('.chip'); if (!b) return; cls = b.dataset.k; WT.store.set('fast.class', cls); render(); });
    $('#cd').addEventListener('click', (e) => { const b = e.target.closest('.chip'); if (!b) return; cond = b.dataset.k; WT.store.set('fast.cond', cond); render(); });
    $('#fine').addEventListener('change', () => { fine = $('#fine').checked; WT.store.set('fast.fine', fine); render(); });
    render();
  }

  function strength($el, F) {
    const S = F.strength;
    const classes = Object.keys(S.classes).map((k) => ({ key: k, label: k.replace(' / ', '/') }));
    let cls = WT.store.get('fast.sclass', '8.8'); if (!S.classes[cls]) cls = '8.8';
    $el.innerHTML = `<p class="warn">${esc(S.warning)}</p>
      <p class="clab">Bolt grade <small>– the number stamped on the bolt head, or A2/A4 for stainless</small></p>
      <div id="sc">${WT.chips(classes, cls).replace('class="chips"', 'class="chips small"')}</div>
      <div class="key"><p><b>All figures are kilograms for ONE bolt.</b></p>
        <p><b>Pull</b> – load along the bolt (hanging, clamping). <i>Stretches</i> = bolt yields and is ruined. <i>Breaks</i> = snaps.</p>
        <p><b>Shear</b> – load across the bolt (two plates sliding, like scissors). <i>Thread</i> = the threaded part sits where the plates meet (weaker).
        <i>Shank</i> = the plain, unthreaded part sits there (stronger). A clevis/double-sided joint has two shear planes ≈ double.</p></div>
      <table class="tbl strength"><thead><tr><th>Size</th><th>Pull<br><small>stretches</small></th><th>Pull<br><small>breaks</small></th><th>Shear<br><small>thread</small></th><th>Shear<br><small>shank</small></th></tr></thead><tbody id="sb"></tbody></table>
      <p class="foot">kg. 1 t = 1000 kg.</p>
      <div class="notes"><p>${esc(S.method)}</p><p>Sources: ${S.sources.map(esc).join(' · ')}</p></div>`;
    const k = (v) => (v >= 10000 ? `${fmt(v / 1000, 1)} t` : `${Math.round(v).toLocaleString('en-AU')}`);
    function render() {
      $el.querySelectorAll('#sc .chip').forEach((b) => b.setAttribute('aria-selected', b.dataset.k === cls));
      $el.querySelector('#sb').innerHTML = S.classes[cls].map((r) => `<tr class="${COMMON.includes(r.size) ? 'common' : ''}">
        <td>${r.size}</td><td>${r.yield_kg ? k(r.yield_kg) : '–'}</td><td><b>${k(r.tension_kg)}</b></td><td>${k(r.shear_thread_kg)}</td><td>${k(r.shear_shank_kg)}</td></tr>`).join('');
    }
    $el.querySelector('#sc').addEventListener('click', (e) => { const b = e.target.closest('.chip'); if (!b) return; cls = b.dataset.k; WT.store.set('fast.sclass', cls); render(); });
    render();
  }

  function grades($el, F) {
    $el.innerHTML = `<p class="intro">${esc(F.class_meaning)}</p>
      ${F.steel.map((c) => `<section class="card"><h2>${esc(c.class)} <small>${c.size !== 'all' ? esc(c.size) : ''}</small></h2>
        ${row('Tensile (min)', `${c.tensile} MPa`, 'hl')}
        ${row('Yield (min)', c.yield ? `${c.yield} MPa` : '–')}
        ${row('Proof stress', c.proof ? `${c.proof} MPa` : '–')}
        ${row('Head marking', esc(c.marking || '–'))}
        ${c.use ? row('Typical use', esc(c.use)) : ''}</section>`).join('')}
      <h3 class="sub">Nuts (ISO 898-2)</h3>
      <div class="out">${F.nuts.map((n) => row(`Class ${esc(n.class)} nut`, `up to ${esc(n.mates)} bolt · ${esc(n.marking || '')}`)).join('')}</div>
      <p class="foot">${esc(F.nut_rule)}</p>
      <h3 class="sub">Australian structural bolting (AS 4100 / AS/NZS 1252)</h3>
      <div class="out">${Object.entries(F.au.categories).map(([k, v]) => row(esc(k.replace('snug_tight_definition', 'Snug tight')), esc(v))).join('')}</div>
      <p class="foot">${esc(F.au.AS_NZS_1252)}</p>
      <h3 class="sub">Coatings</h3>
      <div class="out">${row('Zinc plated', esc(F.coatings.zinc_electroplated))}${row('Hot-dip galvanised', esc(F.coatings.hot_dip_galvanised))}${row('Hydrogen embrittlement', esc(F.coatings.hydrogen_embrittlement))}</div>
      <p class="foot">${esc(F.source)}</p>`;
  }

  function stainless($el, F) {
    const S = F.stainless;
    $el.innerHTML = `<table class="tbl"><thead><tr><th>Class</th><th>Tensile MPa</th><th>Yield MPa</th></tr></thead><tbody>
      ${S.classes.map((c) => `<tr><td><b>${esc(c.class)}</b></td><td>${c.tensile}</td><td>${c.yield}</td></tr>`).join('')}</tbody></table>
      <div class="out" style="margin-top:12px">${row('Material', esc(S.materials))}${row('Class code', esc(S.meaning))}${row('Marking', esc(S.marking))}${row('Galling', esc(S.galling))}</div>
      <h3 class="sub">Where to use</h3><ul class="fixes">${S.corrosion.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
      <p class="foot">A2-70 is roughly 8.8 tensile but lower yield (450 vs 640 MPa) – don't swap stainless in for 8.8 on load-critical joints.</p>`;
  }

  function imperial($el, F) {
    $el.innerHTML = `<p class="intro">SAE J429 – older and US-built gear.</p>
      <table class="tbl wrapl"><thead><tr><th>Grade</th><th>Size</th><th>Proof</th><th>Tensile</th><th>Head</th></tr></thead><tbody>
      ${F.sae.map((s) => `<tr><td><b>${esc(s.grade)}</b></td><td>${esc(s.size_in)}"</td><td>${s.proof}</td><td>${s.tensile}</td><td>${esc(s.marking)}</td></tr>`).join('')}</tbody></table>
      <p class="foot">MPa. Grade 5 ≈ metric 8.8, Grade 8 ≈ 10.9.</p>`;
  }

  async function fasteners() {
    WT.setHeader('Fasteners', true);
    const F = await WT.load('data/fasteners/fasteners.json');
    let tab = WT.store.get('fast.tab', 'torque');
    WT.$view.innerHTML = `${WT.chips(TABS, tab)}<div id="pane"></div>`;
    const $p = WT.$view.querySelector('#pane');
    function render() {
      WT.$view.querySelectorAll(':scope > .chips .chip').forEach((b) => b.setAttribute('aria-selected', b.dataset.k === tab));
      ({ torque, strength, grades, stainless, imperial })[tab]($p, F);
    }
    WT.$view.querySelector('.chips').addEventListener('click', (e) => { const b = e.target.closest('.chip'); if (!b) return; tab = b.dataset.k; WT.store.set('fast.tab', tab); render(); });
    render();
  }

  WT.section('fasteners', { name: 'Fasteners', desc: 'Torque, strength in kg, grades', group: 'Threads & fasteners' }, fasteners);
})();
