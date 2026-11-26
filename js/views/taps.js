// Taps & drills, common metric cheat sheet, and drill check.
(function () {
  'use strict';
  const { fmt, mm, pct, esc, engClass, row } = WT;
  const C = window.ThreadCalc;

  const SERIES = [
    { key: 'metric_coarse', label: 'Metric' },
    { key: 'metric_fine', label: 'Metric fine' },
    { key: 'unc', label: 'UNC' },
    { key: 'unf', label: 'UNF' },
    { key: 'bsw', label: 'BSW' },
    { key: 'bsf', label: 'BSF' },
    { key: 'pipe', label: 'Pipe' },
  ];
  const loadThreads = () => WT.load('data/threads/threads.json');

  // ---------------------------------------------------------------- common metric
  async function common() {
    WT.setHeader('Common metric', true);
    const [d, extra] = await Promise.all([loadThreads(), WT.load('data/threads/common.json')]);
    const byD = (list, D) => list.filter((r) => r.major_mm === D);
    const cards = extra.sizes.map((x) => {
      const c = byD(d.metric_coarse, x.d)[0];
      const fines = byD(d.metric_fine, x.d);
      const cl = c.clearance_mm;
      return `<section class="card">
        <h2>M${x.d} <small>× ${fmt(c.pitch_mm)} coarse</small></h2>
        ${row('Tap drill', `${mm(c.tap_drill_mm)} <span class="${engClass(c.tap_drill_engagement_pct)}">${pct(c.tap_drill_engagement_pct)}</span>`, 'hl')}
        ${row('Clearance hole', `${fmt(cl.normal)} mm <small>(close ${fmt(cl.close)} · loose ${fmt(cl.loose)})</small>`, 'hl')}
        ${fines.map((f) => row(`Fine × ${fmt(f.pitch_mm)}`, `${mm(f.tap_drill_mm)} <span class="${engClass(f.tap_drill_engagement_pct)}">${pct(f.tap_drill_engagement_pct)}</span>`)).join('')}
        ${row('Forming tap drill', mm(c.forming_drill_mm))}
        ${row('Spanner (hex head)', `${esc(x.hex_spanner)} mm`)}
        ${row('Allen key (cap screw)', `${esc(x.socket_cap_key)} mm`)}
      </section>`;
    }).join('');
    WT.$view.innerHTML = `${cards}<p class="foot">${extra.notes.map(esc).join(' ')} Percent = thread depth vs a full thread (75% is the normal target).</p>`;
  }

  // ---------------------------------------------------------------- all taps
  function summary(r) {
    if (r.series === 'BSP') return mm(r.drill_G_mm) + ' (G)';
    if (r.series === 'NPT') return `${esc(r.drill.name)} · ${mm(r.drill.mm)}`;
    if (r.tap_drill_mm != null) return mm(r.tap_drill_mm);
    const t = r.tap_drill;
    return `${mm(t.metric.mm)} · ${esc(t.imperial ? t.imperial.name : '')}`;
  }
  const drillLine = (d) => `${mm(d.mm)} <span class="${engClass(d.engagement_pct)}">${pct(d.engagement_pct)}</span>`;
  const impLine = (d) => `${esc(d.name)} (${fmt(d.in, 4)}") <span class="${engClass(d.engagement_pct)}">${pct(d.engagement_pct)}</span>`;

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
    if (r.tap_drill_mm != null) { // metric
      h += row('Tap drill', `${mm(r.tap_drill_mm)} <span class="${engClass(r.tap_drill_engagement_pct)}">${pct(r.tap_drill_engagement_pct)}</span>`, 'hl');
      if (r.clearance_mm) h += row('Clearance close / normal / loose', `${fmt(r.clearance_mm.close)} / ${fmt(r.clearance_mm.normal)} / ${fmt(r.clearance_mm.loose)} mm`);
      h += row('Imperial drill (≈75%)', impLine(r.nearest_imperial_drill));
      h += row('Forming tap drill', mm(r.forming_drill_mm));
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
    WT.setHeader('Taps & drills', true);
    const d = await loadThreads();
    let series = WT.store.get('taps.series', 'metric_coarse');
    if (!d[series]) series = 'metric_coarse';
    WT.$view.innerHTML = `
      ${WT.chips(SERIES, series)}
      <input id="q" class="search" type="search" placeholder="Search size e.g. M8, 1/4, 3/8 BSP" autocomplete="off">
      <ul id="list" class="list"></ul>
      <p class="foot">% = how deep the thread is vs a full thread. <span class="eng ok">65–80%</span> good · <span class="eng warn">60–65 / 80–85%</span> usable · <span class="eng bad">outside</span> avoid. 75% is the normal target.</p>`;
    const $list = WT.$view.querySelector('#list');
    const $q = WT.$view.querySelector('#q');
    const norm = (s) => s.toLowerCase().replace(/["×x\s]/g, '');

    function render() {
      WT.$view.querySelectorAll('.chip').forEach((b) => b.setAttribute('aria-selected', b.dataset.k === series));
      const q = norm($q.value);
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
    WT.$view.querySelector('.chips').addEventListener('click', (e) => {
      const b = e.target.closest('.chip'); if (!b) return;
      series = b.dataset.k; WT.store.set('taps.series', series); $q.value = ''; render();
    });
    $q.addEventListener('input', render);
    $list.addEventListener('click', (e) => {
      const h = e.target.closest('.item-head'); if (!h) return;
      const body = h.nextElementSibling; const open = body.hidden;
      body.hidden = !open; h.setAttribute('aria-expanded', open);
    });
    render();
  }

  // ---------------------------------------------------------------- drill check
  async function drillcheck() {
    WT.setHeader('Drill check', true);
    const d = await loadThreads();
    const all = SERIES.flatMap((s) => d[s.key]).filter((r) => r.series !== 'BSP' && r.series !== 'NPT');
    WT.$view.innerHTML = `
      <p class="intro">Got a different drill to the chart? Check how much thread it will give.
      <b>Thread %</b> is how deep the thread is cut compared with a full-depth thread. <b>75%</b> is the normal target –
      almost the same strength as 100% and far easier on the tap. Go higher (80%+) in thin or soft material,
      lower (60–70%) in stainless or hard steel.</p>
      <form class="calc" onsubmit="return false">
        <label>Thread
          <select id="t">${all.map((r, i) => `<option value="${i}">${esc(r.label)}</option>`).join('')}</select>
        </label>
        <label>Your drill
          <div class="row2"><input id="dv" type="number" inputmode="decimal" step="any" placeholder="e.g. 6.8">
          <select id="du"><option value="mm">mm</option><option value="in">inch</option></select></div>
        </label>
        <label>Or: drill for a target %
          <div class="row2"><input id="tp" type="number" inputmode="decimal" value="75"><span class="unit">%</span></div>
        </label>
      </form>
      <div id="out" class="out"></div>`;
    const $ = (id) => WT.$view.querySelector('#' + id);
    let idx = all.findIndex((r) => r.id === WT.store.get('engage.thread', null));
    if (idx < 0) idx = all.findIndex((r) => r.id === 'M8x1.25');
    $('t').value = idx;
    function calc() {
      const r = all[$('t').value];
      WT.store.set('engage.thread', r.id);
      const form = r.series === 'BSW' || r.series === 'BSF' ? 55 : 60;
      const D = r.major_mm, P = r.pitch_mm;
      const tp = parseFloat($('tp').value) || 75;
      const ideal = C.drillForEngagement(D, P, tp, form);
      let h = '';
      const v = parseFloat($('dv').value);
      if (!isNaN(v)) {
        const dm = $('du').value === 'in' ? v * C.IN : v;
        const e = C.engagement(D, P, dm, form);
        const txt = dm >= D ? 'bigger than the thread – no thread' : e > 100 ? 'smaller than the thread root – tap will bind' : `<span class="${engClass(e)}">${fmt(e, 1)}% thread</span>`;
        h += row('Your drill', `${mm(dm)} → ${txt}`, 'hl');
      }
      h += row(`Drill for ${fmt(tp, 1)}%`, `${mm(ideal)} = ${fmt(ideal / C.IN, 4)}"`, 'hl');
      if (r.tap_drill_mm != null) h += row('Chart tap drill', mm(r.tap_drill_mm));
      h += row('Major dia', mm(D)) + row('Pitch', `${fmt(P, 3)} mm`);
      $('out').innerHTML = h;
    }
    ['t', 'dv', 'du', 'tp'].forEach((id) => $(id).addEventListener('input', calc));
    calc();
  }

  WT.section('common', { name: 'Common metric', desc: 'M4 · M5 · M6 · M8 · M10' }, common);
  WT.section('taps', { name: 'Taps & drills', desc: 'All thread series' }, taps);
  WT.section('drillcheck', { name: 'Drill check', desc: 'Will this drill give a good thread?' }, drillcheck);
  WT.routes.engage = drillcheck; // old link
})();
