// Welding – Unimig Razor 205 Smart Set: MIG calculator, stick, TIG tungsten.
(function () {
  'use strict';
  const { fmt, esc, row } = WT;

  const TABS = [{ key: 'mig', label: 'MIG' }, { key: 'stick', label: 'Stick' }, { key: 'tig', label: 'TIG' }, { key: 'faults', label: 'Fault finder' }];

  // linear interpolation over [{x,y}] sorted by x; clamps at the ends
  function interp(pts, x) {
    if (x <= pts[0].x) return { y: pts[0].y, clamped: x < pts[0].x };
    const last = pts[pts.length - 1];
    if (x >= last.x) return { y: last.y, clamped: x > last.x };
    for (let i = 1; i < pts.length; i++) {
      if (x <= pts[i].x) {
        const a = pts[i - 1], b = pts[i], t = (x - a.x) / (b.x - a.x);
        return { y: a.y + t * (b.y - a.y), clamped: false };
      }
    }
  }

  function rowLabel(r) {
    const m = r.material === 'steel' ? (r.wire_type.includes('flux') ? 'Steel – gasless flux-core' : 'Steel – solid') : r.material === 'stainless' ? 'Stainless' : 'Aluminium';
    return `${m} ${fmt(r.wire_dia_mm, 1)} mm`;
  }

  function mig($el, W) {
    const rows = W.door_chart.rows;
    let sel = WT.store.get('weld.row', 0); if (!rows[sel]) sel = 0;
    let th = WT.store.get('weld.th', 3);
    $el.innerHTML = `<form class="calc" onsubmit="return false">
        <label>Wire<select id="wr">${rows.map((r, i) => `<option value="${i}">${esc(rowLabel(r))}</option>`).join('')}</select></label>
        <label>Material thickness
          <div class="row2"><input id="th" type="number" inputmode="decimal" step="0.1" min="0.5" max="12"><span class="unit">mm</span></div>
          <input id="ths" type="range" min="1" max="8" step="0.5">
        </label>
      </form>
      <div id="mo" class="out"></div>
      <h3 class="sub">Door chart points</h3><div id="mt"></div>
      <p class="foot">${W.mig_notes.map(esc).join(' ')}</p>`;
    const $ = (id) => $el.querySelector('#' + id);
    $('wr').value = sel; $('th').value = th; $('ths').value = th;
    function calc() {
      const r = rows[$('wr').value];
      th = parseFloat($('th').value);
      WT.store.set('weld.row', +$('wr').value); WT.store.set('weld.th', th);
      const pts = r.points;
      let h = '';
      if (isNaN(th)) { $('mo').innerHTML = ''; return; }
      const v = interp(pts.map((p) => ({ x: p.thickness_mm, y: p.volts })), th);
      const w = interp(pts.map((p) => ({ x: p.thickness_mm, y: p.wfs })), th);
      const isSmart = r.material === 'steel' && !r.wire_type.includes('flux') && r.wire_dia_mm === 0.8;
      if (isSmart) {
        const ss = W.smartset; const wfs = Math.round(w.y * 10) / 10;
        const pt = ss.points.find((p) => Math.abs(p[0] - wfs) < 0.001);
        h += row('Wire speed', `<b class="big">${fmt(wfs, 1)}</b> m/min`, 'hl');
        h += pt ? row('Smart Set voltage', `<b class="big">${fmt(pt[1], 1)} V</b> <small>trim ${fmt(pt[1] - ss.trim_v, 1)}–${fmt(pt[1] + ss.trim_v, 1)} V</small>`, 'hl')
          : row('Smart Set voltage', `outside Smart Set range (${ss.points[0][0]}–${ss.points[ss.points.length - 1][0]})`, 'hl');
        h += row('Door chart voltage', `${fmt(v.y, 1)} V`);
        h += row('Smart Set program', esc(ss.program));
      } else {
        h += row('Wire speed', `<b class="big">${fmt(w.y, 1)}</b> m/min`, 'hl');
        h += row('Voltage', `<b class="big">${fmt(v.y, 1)} V</b>`, 'hl');
      }
      if (v.clamped || w.clamped) h += row('Note', `Outside the chart's ${pts[0].thickness_mm}–${pts[pts.length - 1].thickness_mm} mm range – nearest end shown`, 'warnrow');
      h += row('Gas', `${esc(r.gas)}${r.gas_flow_l_min ? ` · ${esc(r.gas_flow_l_min)} L/min` : ''}`);
      h += row('Polarity', esc(r.polarity));
      h += row('Drive roller', esc(r.drive_roller));
      $('mo').innerHTML = h;
      $('mt').innerHTML = `<table class="tbl"><thead><tr><th>mm</th>${pts.map((p) => `<th>${p.thickness_mm}</th>`).join('')}</tr></thead>
        <tbody><tr><td>V</td>${pts.map((p) => `<td>${p.volts}</td>`).join('')}</tr>
        <tr><td>m/min</td>${pts.map((p) => `<td>${p.wfs}</td>`).join('')}</tr></tbody></table>`;
    }
    $('wr').addEventListener('input', calc);
    $('th').addEventListener('input', () => { $('ths').value = $('th').value; calc(); });
    $('ths').addEventListener('input', () => { $('th').value = $('ths').value; calc(); });
    calc();
  }

  function stick($el, W) {
    const S = W.stick;
    $el.innerHTML = `<form class="calc" onsubmit="return false">
        <label>Material thickness<div class="row2"><input id="st" type="number" inputmode="decimal" step="0.5"><span class="unit">mm</span></div></label>
      </form><div id="so" class="out"></div>
      <h3 class="sub">E6013 current range</h3>
      <table class="tbl"><thead><tr><th>Electrode</th><th>Amps</th><th></th></tr></thead><tbody>
      ${S.current.map((c) => `<tr><td>${c[0]} mm</td><td>${c[1]}–${c[2]} A</td><td>${c[0] > S.machine_max_electrode ? '<small>above Razor 205</small>' : ''}</td></tr>`).join('')}
      </tbody></table>
      <p class="foot">${esc(S.source)}. ${S.notes.map(esc).join(' ')}</p>`;
    const $t = $el.querySelector('#st');
    $t.value = WT.store.get('weld.stick', 3);
    function calc() {
      const t = parseFloat($t.value); WT.store.set('weld.stick', t);
      if (isNaN(t)) { $el.querySelector('#so').innerHTML = ''; return; }
      const band = S.by_thickness.find((b) => t >= b[0] && (b[1] == null || t <= b[1])) || S.by_thickness[0];
      let e = band[2];
      let h = '';
      if (e > S.machine_max_electrode) {
        h += row('Note', `Book says ${e} mm – Razor 205 max is ${S.machine_max_electrode} mm: use ${S.machine_max_electrode} mm with multiple passes / bevel`, 'warnrow');
        e = S.machine_max_electrode;
      }
      const c = S.current.find((x) => x[0] === e);
      h = row('Electrode', `<b class="big">${e} mm</b> (max)`, 'hl') + row('Current', `<b class="big">${c[1]}–${c[2]} A</b>`, 'hl') + h;
      $el.querySelector('#so').innerHTML = h;
    }
    $t.addEventListener('input', calc); calc();
  }

  function tig($el, W, TG) {
    const T = W.tungsten;
    const tables = TG.tables;
    let ti = WT.store.get('weld.tigtable', 0); if (!tables[ti]) ti = 0;
    $el.innerHTML = `<p class="intro">Razor 205 is <b>DC lift-arc TIG only</b> – steel, stainless, copper. Aluminium needs an AC machine.</p>
      <form class="calc" onsubmit="return false">
        <label>Material / joint<select id="tt">${tables.map((t, i) => `<option value="${i}">${esc(t.material)} – ${esc(t.joint)}${t.ac ? ' (AC)' : ''}</option>`).join('')}</select></label>
        <label>Thickness<select id="tth"></select></label>
      </form>
      <div id="to" class="out"></div>
      <p class="foot">${esc(TG.razor205_note)}</p>
      <h3 class="sub">Tungsten size &amp; prep vs current (DC)</h3>
      <table class="tbl"><thead><tr><th>Ø</th><th>Tip flat</th><th>Angle</th><th>Amps</th><th>Pulsed</th></tr></thead><tbody>
      ${T.rows.map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}°</td><td>${r[3]}</td><td>${r[4]}</td></tr>`).join('')}
      </tbody></table>
      <p class="foot">${esc(T.source)}. Grind lengthways on a dedicated diamond wheel. Taper ≈ 2.5 × tungsten Ø.<br>Settings: ${esc(TG.source)}.</p>`;
    const $ = (id) => $el.querySelector('#' + id);
    $('tt').value = ti;
    function fillTh() {
      const t = tables[$('tt').value];
      const keep = WT.store.get('weld.tigth', 3);
      $('tth').innerHTML = t.rows.map((r) => `<option value="${r.thickness_mm}">${r.thickness_mm} mm</option>`).join('');
      if (t.rows.some((r) => r.thickness_mm === keep)) $('tth').value = keep;
    }
    function calc() {
      const t = tables[$('tt').value]; WT.store.set('weld.tigtable', +$('tt').value);
      const th = +$('tth').value; WT.store.set('weld.tigth', th);
      const r = t.rows.find((x) => x.thickness_mm === th); const c = TG.common;
      let h = row('Amps (main / peak)', `<b class="big">${r.peak_a} A</b>`, 'hl');
      h += row('Tungsten', `${r.tungsten_mm} mm ${esc(t.tungsten_type)}`, 'hl');
      h += row('Filler rod', `${r.filler_mm} mm`) + row('Cup', `#${r.cup}`);
      h += row('Gas', `${esc(c.gas)} · ${c.gas_flow_l_min} L/min`) + row('Polarity', esc(t.polarity));
      h += row('Down-slope', `${c.down_slope_s} s`);
      h += row('Start / finish amps', `${r.start_a} / ${r.finish_a} A <small>(machines with slope control)</small>`);
      h += row('Pre / post gas', `${c.pre_gas_s} / ${c.post_gas_s} s`);
      if (r.ac_hz) h += row('AC Hz / balance', `${r.ac_hz} Hz / ${r.ac_balance}`);
      if (t.note) h += row('Note', esc(t.note), 'warnrow');
      $('to').innerHTML = h;
    }
    $('tt').addEventListener('input', () => { fillTh(); calc(); });
    $('tth').addEventListener('input', calc);
    fillTh(); calc();
  }

  function faults($el, W, TG, TS) {
    const P = [{ key: 'mig', label: 'MIG' }, { key: 'wirefeed', label: 'Wire feed' }, { key: 'tig', label: 'TIG' }, { key: 'stick', label: 'Stick' }];
    let p = WT.store.get('weld.faultp', 'mig');
    $el.innerHTML = `${WT.chips(P, p).replace('class="chips"', 'class="chips small"')}<ul id="fl" class="list"></ul>
      <p class="foot">${esc(TS.source)}. ${TS.flags.map(esc).join(' ')}</p>`;
    const $l = $el.querySelector('#fl');
    function render() {
      $el.querySelectorAll('.chip').forEach((b) => b.setAttribute('aria-selected', b.dataset.k === p));
      $l.innerHTML = TS[p].map((f) => `<li class="item"><button class="item-head" aria-expanded="false"><span class="item-label">${esc(f.problem)}</span><span class="item-sum">›</span></button>
        <div class="item-body" hidden><ul class="fixes">${f.fixes.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div></li>`).join('');
    }
    $el.querySelector('.chips').addEventListener('click', (e) => { const b = e.target.closest('.chip'); if (!b) return; p = b.dataset.k; WT.store.set('weld.faultp', p); render(); });
    $l.addEventListener('click', (e) => { const h = e.target.closest('.item-head'); if (!h) return; const b = h.nextElementSibling; b.hidden = !b.hidden; h.setAttribute('aria-expanded', !b.hidden); });
    render();
  }

  async function welding() {
    WT.setHeader('Welding', true);
    const [W, TG, TS] = await Promise.all([WT.load('data/welding/razor205.json'), WT.load('data/welding/tig_unimig.json'), WT.load('data/welding/troubleshooting.json')]);
    let tab = WT.store.get('weld.tab', 'mig');
    WT.$view.innerHTML = `<p class="machine">${esc(W.machine.name)}</p>${WT.chips(TABS, tab)}<div id="pane"></div>`;
    const $p = WT.$view.querySelector('#pane');
    function render() {
      WT.$view.querySelectorAll(':scope > .chips .chip').forEach((b) => b.setAttribute('aria-selected', b.dataset.k === tab));
      ({ mig, stick, tig, faults })[tab]($p, W, TG, TS);
    }
    WT.$view.querySelector('.chips').addEventListener('click', (e) => {
      const b = e.target.closest('.chip'); if (!b) return; tab = b.dataset.k; WT.store.set('weld.tab', tab); render();
    });
    render();
  }

  WT.section('welding', { name: 'Welding', desc: 'Razor 205 MIG · stick · TIG' }, welding);
})();
