// Taps & drills (with Common cheat sheet) and Drill check.
(function () {
  'use strict';
  const { fmt, mm, pct, esc, engClass, row } = WT;
  const C = window.ThreadCalc;

  const SERIES = [
    { key: 'common', label: 'Common' },
    { key: 'metric_coarse', label: 'Metric' },
    { key: 'metric_fine', label: 'Metric fine' },
    { key: 'unc', label: 'UNC' },
    { key: 'unf', label: 'UNF' },
    { key: 'bsw', label: 'BSW' },
    { key: 'bsf', label: 'BSF' },
    { key: 'pipe', label: 'Pipe' },
  ];
  const DATA_SERIES = SERIES.filter((s) => s.key !== 'common');
  const loadThreads = () => WT.load('data/threads/threads.json');
  const n = (v) => fmt(v, 2); // bare number, no unit
  const engTag = (p) => `<span class="${engClass(p)}">${pct(p)}</span>`;

  // ---------------------------------------------------------------- common cheat sheet (M3–M12)
  async function commonTable($el, d) {
    const extra = await WT.load('data/threads/common.json');
    const rowsHtml = extra.sizes.map((x) => {
      const c = d.metric_coarse.find((r) => r.major_mm === x.d);
      const fines = d.metric_fine.filter((r) => r.major_mm === x.d && r.pitch_mm >= 0.5);
      return `<tr class="cs-main"><td><b>M${x.d}</b><small>×${fmt(c.pitch_mm)}</small></td>
          <td><b class="acc">${n(c.tap_drill_mm)}</b></td><td>${n(c.clearance_mm.normal)}</td>
          <td>${esc(x.hex_spanner.split(' ')[0])}</td><td>${esc(x.socket_cap_key)}</td></tr>
        ${fines.length ? `<tr class="cs-fine"><td colspan="5">Fine: ${fines.map((f) => `×${fmt(f.pitch_mm)} → <b>${n(f.tap_drill_mm)}</b>`).join(' · ')}</td></tr>` : ''}`;
    }).join('');
    $el.innerHTML = `<table class="tbl cheat"><thead><tr><th>Size</th><th>Tap drill</th><th>Clear hole</th><th>Spanner</th><th>Allen</th></tr></thead>
      <tbody>${rowsHtml}</tbody></table>
      <p class="foot">All mm. Tap drill ≈ 75% thread. Clearance = normal fit (ISO 273); close/loose in the Metric tab.
      Spanner: hex head bolt/nut (ISO; DIN M10 = 17, M12 = 19). Allen: socket cap screw.</p>`;
  }

  // ---------------------------------------------------------------- list
  function head(series) {
    if (series === 'pipe') return ['Size', 'Tap drill', ''];
    if (series === 'metric_coarse' || series === 'metric_fine') return ['Size', 'Tap drill', 'Thread', 'Clear'];
    return ['Size', 'Metric drill', 'Thread', 'Imperial'];
  }
  function cols(r) {
    if (r.series === 'BSP') return [mm(r.drill_G_mm) + ' G', '', ''];
    if (r.series === 'NPT') return [mm(r.drill.mm), '', esc(r.drill.name)];
    if (r.tap_drill_mm != null) return [n(r.tap_drill_mm), engTag(r.tap_drill_engagement_pct), r.clearance_mm ? n(r.clearance_mm.normal) : '–'];
    const t = r.tap_drill;
    return [n(t.metric.mm), engTag(t.metric.engagement_pct), esc(t.imperial ? t.imperial.name : '')];
  }
  const drillLine = (d) => `${mm(d.mm)} ${engTag(d.engagement_pct)}`;
  const impLine = (d) => `${esc(d.name)} (${fmt(d.in, 4)}") ${engTag(d.engagement_pct)}`;

  function detail(r) {
    let h = '';
    if (r.series === 'BSP') {
      return row('Tap drill – G (fastening, parallel)', mm(r.drill_G_mm)) + row('Tap drill – Rp (sealing, parallel)', mm(r.drill_Rp_mm)) +
        row('Tap drill – Rc (taper)', mm(r.drill_Rc_mm)) + row('Major dia', mm(r.major_mm)) + row('Minor dia', mm(r.minor_mm)) + row('TPI', r.tpi);
    }
    if (r.series === 'NPT') {
      return row('Tap drill (no reamer)', `${esc(r.drill.name)} = ${mm(r.drill.mm)}`) +
        row('Pipe OD', `${fmt(r.pipe_od_in, 3)}" = ${mm(r.pipe_od_mm)}`) + row('TPI', r.tpi);
    }
    if (r.tap_drill_mm != null) {
      h += row('Tap drill', `${mm(r.tap_drill_mm)} ${engTag(r.tap_drill_engagement_pct)}`, 'hl');
      h += row('Tap drill is smaller than bolt by', `${fmt(r.major_mm - r.tap_drill_mm, 2)} mm`);
      if (r.clearance_mm) h += row('Clearance close / normal / loose', `${fmt(r.clearance_mm.close)} / ${fmt(r.clearance_mm.normal)} / ${fmt(r.clearance_mm.loose)} mm`);
      h += row('Imperial drill (≈75%)', impLine(r.nearest_imperial_drill));
      h += row('Forming tap drill', mm(r.forming_drill_mm));
      h += row('Pitch', `${fmt(r.pitch_mm, 3)} mm (${fmt(r.tpi, 1)} TPI)`);
      h += row('Minor dia (nut)', mm(r.minor_int_mm));
      return h;
    }
    const t = r.tap_drill;
    h += row('Metric drill', drillLine(t.metric), 'hl');
    if (t.imperial) h += row('Imperial drill', impLine(t.imperial));
    h += row('Other metric', t.metric_alts.map(drillLine).join(' · '));
    if (t.imperial_alts) h += row('Other imperial', t.imperial_alts.map(impLine).join(' · '));
    h += row('Major dia', `${fmt(r.major_in, 4)}" = ${mm(r.major_mm)}`);
    h += row('Pitch', `${r.tpi} TPI = ${fmt(r.pitch_mm, 3)} mm`);
    return h;
  }

  async function taps(initial) {
    WT.setHeader('Taps & drills', true);
    const d = await loadThreads();
    let series = typeof initial === 'string' ? initial : WT.store.get('taps.series', 'common');
    if (series !== 'common' && !d[series]) series = 'common';
    WT.$view.innerHTML = `
      ${WT.chips(SERIES, series)}
      <div id="body"></div>`;
    const $b = WT.$view.querySelector('#body');

    function renderList() {
      $b.innerHTML = `<input id="q" class="search" type="search" placeholder="Search e.g. M8, 1/4, 3/8 BSP" autocomplete="off">
        <div class="lhead" id="lh"></div><ul id="list" class="list"></ul>
        <p class="foot">Sizes in mm. <b>Thread %</b> = how deep the thread is cut vs a full thread – 75% is the normal target.
        <span class="eng ok">65–80</span> good · <span class="eng warn">60–65 / 80–85</span> OK · <span class="eng bad">outside</span> avoid. Tap a row for more.</p>`;
      const $list = $b.querySelector('#list'), $q = $b.querySelector('#q'), $h = $b.querySelector('#lh');
      const norm = (s) => s.toLowerCase().replace(/["×x\s]/g, '');
      function render() {
        const q = norm($q.value);
        const pool = q ? DATA_SERIES.flatMap((s) => d[s.key]) : d[series];
        const hs = head(q ? 'unc' : series);
        $h.innerHTML = hs.map((t) => `<span>${t}</span>`).join('');
        $h.className = 'lhead g' + hs.length;
        const rows = pool.filter((r) => !q || norm(r.label).includes(q) || norm(r.id).includes(q));
        $list.innerHTML = rows.length ? rows.map((r) => {
          const c = cols(r);
          return `<li class="item"><button class="item-head grid g${hs.length}" aria-expanded="false">
            <span class="item-label">${esc(r.label)}</span>${c.slice(0, hs.length - 1).map((x) => `<span>${x}</span>`).join('')}</button>
            <div class="item-body" hidden>${detail(r)}</div></li>`;
        }).join('') : '<li class="empty">No match</li>';
      }
      $q.addEventListener('input', render);
      $list.addEventListener('click', (e) => {
        const h = e.target.closest('.item-head'); if (!h) return;
        const body = h.nextElementSibling; const open = body.hidden;
        body.hidden = !open; h.setAttribute('aria-expanded', open);
      });
      render();
    }
    async function render() {
      WT.$view.querySelectorAll('.chip').forEach((b) => b.setAttribute('aria-selected', b.dataset.k === series));
      if (series === 'common') await commonTable($b, d); else renderList();
    }
    WT.$view.querySelector('.chips').addEventListener('click', (e) => {
      const b = e.target.closest('.chip'); if (!b) return;
      series = b.dataset.k; WT.store.set('taps.series', series); render();
    });
    await render();
  }

  // ---------------------------------------------------------------- drill check
  // % of full thread by material and job – OSG tap drill chart (Vol 3, 2024)
  const MATERIALS = [
    { key: 'free', label: 'Mild steel, aluminium, brass, bronze, copper, cast iron', group: 'Free cutting' },
    { key: 'hard', label: 'Stainless, cast steel, forgings, nickel steel, Monel', group: 'Hard / tough' },
  ];
  const JOBS = [
    { key: 'avg', label: 'Normal hole' },
    { key: 'deep', label: 'Deep hole (over ~1.5 × dia)' },
    { key: 'thin', label: 'Thin sheet' },
  ];
  const RANGE = { free: { deep: [60, 70], avg: [65, 70], thin: [75, 85] }, hard: { deep: [55, 65], avg: [60, 70], thin: [75, 85] } };

  async function drillcheck() {
    WT.setHeader('Drill check', true);
    const [d, dr] = await Promise.all([loadThreads(), WT.load('data/threads/drills.json')]);
    const all = DATA_SERIES.flatMap((s) => d[s.key]).filter((r) => r.series !== 'BSP' && r.series !== 'NPT');
    WT.$view.innerHTML = `
      <p class="intro"><b>Thread %</b> = how deep the tap cuts compared with a full thread. More isn't stronger past ~75% –
      it just makes the tap work harder and break. Pick the material and job and it picks the drill.</p>
      <form class="calc" onsubmit="return false">
        <label>Thread<select id="t">${all.map((r, i) => `<option value="${i}">${esc(r.label)}</option>`).join('')}</select></label>
        <label>Material<select id="m">${MATERIALS.map((m) => `<option value="${m.key}">${esc(m.group)} – ${esc(m.label)}</option>`).join('')}</select></label>
        <label>Job<select id="j">${JOBS.map((j) => `<option value="${j.key}">${esc(j.label)}</option>`).join('')}</select></label>
        <label>Check your own drill (optional)
          <div class="row2"><input id="dv" type="number" inputmode="decimal" step="any" placeholder="e.g. 6.8">
          <select id="du"><option value="mm">mm</option><option value="in">inch</option></select></div>
        </label>
      </form>
      <div id="out" class="out"></div>
      <p class="foot">Target ranges: OSG tap drill chart (% of full thread by material, 2024). % here uses the shop formula (0.01299 × % ÷ TPI), same as the chart.</p>`;
    const $ = (id) => WT.$view.querySelector('#' + id);
    let idx = all.findIndex((r) => r.id === WT.store.get('engage.thread', null));
    if (idx < 0) idx = all.findIndex((r) => r.id === 'M8x1.25');
    $('t').value = idx; $('m').value = WT.store.get('engage.mat', 'free'); $('j').value = WT.store.get('engage.job', 'avg');

    const metric = dr.metric_mm, imp = dr.imperial;
    function calc() {
      const r = all[$('t').value];
      WT.store.set('engage.thread', r.id); WT.store.set('engage.mat', $('m').value); WT.store.set('engage.job', $('j').value);
      const form = r.series === 'BSW' || r.series === 'BSF' ? 55 : 60;
      const D = r.major_mm, P = r.pitch_mm;
      const [lo, hi] = RANGE[$('m').value][$('j').value];
      const mid = (lo + hi) / 2;
      const e = (dm) => C.engagement(D, P, dm, form);
      const inRange = (p) => p >= lo - 0.5 && p <= hi + 0.5;
      const ideal = C.drillForEngagement(D, P, mid, form);
      const best = (list, key) => list.filter((x) => inRange(e(key(x)))).sort((a, b) => Math.abs(key(a) - ideal) - Math.abs(key(b) - ideal));
      const bm = best(metric, (x) => x).slice(0, 3);
      const bi = best(imp, (x) => x.mm).slice(0, 2);
      let h = row('Target thread', `<b class="big">${lo}–${hi}%</b>`, 'hl');
      h += row('Best metric drill', bm.length ? bm.map((x) => `<b>${mm(x)}</b> ${engTag(e(x))}`).join(' · ') : 'none in range – see chart drill', 'hl');
      if (bi.length) h += row('Imperial option', bi.map((x) => `${esc(x.name)} ${engTag(e(x.mm))}`).join(' · '));
      if (r.tap_drill_mm != null) h += row('Standard chart drill', `${mm(r.tap_drill_mm)} ${engTag(e(r.tap_drill_mm))}`);
      const v = parseFloat($('dv').value);
      if (!isNaN(v)) {
        const dm = $('du').value === 'in' ? v * C.IN : v;
        const p = e(dm);
        const txt = dm >= D ? 'bigger than the bolt – no thread' : p > 100 ? 'smaller than the thread root – tap will bind'
          : `${engTag(p)} ${inRange(p) ? '✓ in range' : p > hi ? '– tight, tap works harder' : '– loose, weaker thread'}`;
        h = row('Your drill', `${mm(dm)} → ${txt}`, 'hl') + h;
      }
      h += row('Bolt size / pitch', `${mm(D)} × ${fmt(P, 3)}`);
      $('out').innerHTML = h;
    }
    ['t', 'm', 'j', 'dv', 'du'].forEach((id) => $(id).addEventListener('input', calc));
    calc();
  }

  WT.section('taps', { name: 'Taps & drills', desc: 'Common M3–M12 cheat sheet + all series', group: 'Threads & fasteners' }, taps);
  WT.section('drillcheck', { name: 'Drill check', desc: 'Pick material → right tap drill', group: 'Threads & fasteners' }, drillcheck);
  WT.routes.common = () => taps('common'); // old link
  WT.routes.engage = drillcheck; // old link
})();
