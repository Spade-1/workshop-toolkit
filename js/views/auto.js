// Automotive – AU cable chart (Aaron's Narva / Tycab compilation), vehicle torque specs, spark plugs.
(function () {
  'use strict';
  const { fmt, esc, row } = WT;

  const TERM = { Yellow: 'term-y', Blue: 'term-b', Red: 'term-r' };
  const TABS = [{ key: 'torque', label: 'Torque specs' }, { key: 'wheels', label: 'Wheel nuts' }, { key: 'plugs', label: 'Spark plugs' }];
  const conf = (c) => `<span class="conf conf-${esc(c || 'low')}">${c === 'low' || !c ? 'unverified' : esc(c)}</span>`;
  const src = (r) => r.source_url ? `<a href="${esc(r.source_url)}" target="_blank" rel="noopener">${esc(r.source_name || 'source')}</a>` : esc(r.source_name || '');
  const toggle = ($l) => $l.addEventListener('click', (e) => {
    const h = e.target.closest('.item-head'); if (!h) return;
    const b = h.nextElementSibling; b.hidden = !b.hidden; h.setAttribute('aria-expanded', !b.hidden);
  });

  function cables($el, C) {
    let amb = WT.store.get('auto.amb', 30);
    $el.innerHTML = `
      <h2 class="h2">${esc(C.title)} <small>B&amp;S = AWG</small></h2>
      <label class="inline">Ambient for Cont. A
        <select id="amb">${C.derate.map(([t]) => `<option value="${t}">${t}°C</option>`).join('')}</select>
      </label>
      <ul id="cl" class="list"></ul>
      <h3 class="sub">Metric mm² / Narva lug → nearest B&amp;S</h3>
      <div class="grid5">${C.metric_to_bs.map(([m, b]) => `<div><b>${m} mm²</b><small>≈ ${b} B&amp;S</small></div>`).join('')}
        ${C.lug_gaps.map((g) => `<div><b>—</b><small>${esc(g)}</small></div>`).join('')}</div>
      <div class="notes">${C.notes.map((n) => `<p>${esc(n)}</p>`).join('')}<p><small>Source: ${esc(C.source)}</small></p></div>`;
    const $amb = $el.querySelector('#amb'), $l = $el.querySelector('#cl');
    $amb.value = amb;
    function render() {
      amb = +$amb.value; WT.store.set('auto.amb', amb);
      const k = C.derate.find(([t]) => t === amb)[1];
      $l.innerHTML = C.rows.map((r) => {
        const base = parseFloat(r.cont_a); const mark = String(r.cont_a).replace(/[\d.]/g, '');
        const cont = k === 1 ? `${r.cont_a}` : `${fmt(base * k, 0)}${mark} <small>(${r.cont_a} @30°C)</small>`;
        const term = TERM[r.terminal] ? `<span class="term ${TERM[r.terminal]}">${r.terminal}</span>` : `${esc(r.terminal)}${r.terminal_flag ? ' ⚠' : ''}`;
        return `<li class="item"><button class="item-head" aria-expanded="false">
            <span class="item-label"><span class="bs">${esc(r.bs)}</span> B&amp;S${r.au_sold_as.includes('auto') || r.au_sold_as.includes('"') ? ` <small>${esc(r.au_sold_as.replace(/^\d+ B&S \/ /, ''))}</small>` : ''}</span>
            <span class="item-sum">${cont} A · ${term}</span></button>
          <div class="item-body" hidden>
            ${row('Cont. A (Tycab)', `${cont} A`, 'hl')}
            ${row('Peak A (Narva, 5 min 60%)', r.peak_a == null ? '—' : `${r.peak_a} A`)}
            ${row('Terminal / lug', term)}
            ${row('AU sold as', esc(r.au_sold_as))}
            ${row('True area', `${r.true_mm2} mm²`)}
            ${row('AU sold area (Tycab)', `${r.au_mm2} mm²`)}
            ${row('Conductor Ø', `${r.cond_dia_mm} mm`)}
            ${row('Sheath Ø', `${esc(r.sheath_mm)} mm`)}
          </div></li>`;
      }).join('');
    }
    $amb.addEventListener('input', render);
    toggle($l);
    render();
  }

  function torque($el, T) {
    const V = T.vehicles.map((v, i) => ({ key: String(i), label: v.name.replace('Toyota ', '').replace(' (MR-S)', '').replace(' Spyder', '') }));
    let vi = WT.store.get('auto.veh', '0'); if (!T.vehicles[vi]) vi = '0';
    $el.innerHTML = `<p class="warn">${esc(T.warning)}</p>${WT.chips(V, vi).replace('class="chips"', 'class="chips small"')}<ul id="tl" class="list"></ul>
      <h3 class="sub">Still missing</h3><ul class="fixes">${T.gaps.map((g) => `<li>${esc(g)}</li>`).join('')}</ul>`;
    const $l = $el.querySelector('#tl');
    function render() {
      $el.querySelectorAll('.chip').forEach((b) => b.setAttribute('aria-selected', b.dataset.k === vi));
      $l.innerHTML = T.vehicles[vi].rows.map((r) => `<li class="item"><button class="item-head" aria-expanded="false">
          <span class="item-label">${esc(r.component)} <small>${esc(r.years)}</small></span>
          <span class="item-sum">${esc(r.torque_nm)} N·m ${conf(r.confidence)}</span></button>
        <div class="item-body" hidden>
          ${row('Torque', `${esc(r.torque_nm)} N·m <small>(${esc(r.torque_original)})</small>`, 'hl')}
          ${r.fastener_detail ? row('Detail', esc(r.fastener_detail)) : ''}
          ${row('Model / engine', `${esc(r.model_code)} · ${esc(r.engine)}`)}
          ${row('Source', src(r) + (r.also ? ' · ' + r.also.map(src).join(' · ') : ''))}
          ${r.notes ? row('Notes', esc(r.notes)) : ''}
        </div></li>`).join('');
    }
    $el.querySelector('.chips').addEventListener('click', (e) => { const b = e.target.closest('.chip'); if (!b) return; vi = b.dataset.k; WT.store.set('auto.veh', vi); render(); });
    toggle($l); render();
  }

  function wheels($el, T) {
    $el.innerHTML = `<p class="warn">${esc(T.warning)}</p><ul id="wl" class="list">${T.wheel_nuts.map((r) => `<li class="item"><button class="item-head" aria-expanded="false">
        <span class="item-label">${esc(r.vehicle)} <small>${esc(r.model_code.split(/[ (]/)[0])}</small></span>
        <span class="item-sum">${esc(r.torque_nm)} N·m ${conf(r.confidence)}</span></button>
        <div class="item-body" hidden>${row('Model', esc(r.model_code))}${row('Years', esc(r.years))}${row('Source', src(r))}${r.notes ? row('Notes', esc(r.notes)) : ''}</div></li>`).join('')}</ul>
      <h3 class="sub">Generic by stud size – only if the vehicle figure is unknown</h3>
      <table class="tbl"><thead><tr><th>Stud</th><th>N·m</th><th>Source</th></tr></thead><tbody>
      ${T.generic_wheel_nuts.map((r) => `<tr><td>${esc(r.size)}</td><td>${esc(r.torque_nm)}</td><td>${src(r)}</td></tr>`).join('')}</tbody></table>
      <p class="foot">Tighten in a star pattern in two stages; re-check after 50–100 km on alloys.</p>`;
    toggle($el.querySelector('#wl'));
  }

  function plugs($el, T) {
    const rows = T.spark_plugs;
    $el.innerHTML = `<p class="intro">Generic spark plug torque by thread and seat (NGK / Denso). Use your engine's figure where known (see Torque specs).</p>
      <table class="tbl"><thead><tr><th>Thread</th><th>Seat · head</th><th>N·m</th></tr></thead><tbody>
      ${rows.map((r) => { const m = r.item.split(' - '); return `<tr><td>${esc(r.size)}</td><td>${esc(m[0])} · ${esc((m[1] || '') + ' ' + (m[2] || '')).replace('head', '')}</td><td>${esc(r.torque_nm)}</td></tr>`; }).join('')}</tbody></table>
      <p class="foot">Sources: ${[...new Set(rows.map((r) => r.source_name))].map(esc).join(' · ')}. Torque wrench on a cold engine; NGK and Denso differ slightly – stay inside both where they overlap.</p>`;
  }

  async function auto() {
    WT.setHeader('Automotive', true);
    const T = await WT.load('data/auto/torque.json');
    let tab = WT.store.get('auto.tab', 'torque'); if (!TABS.some((t) => t.key === tab)) tab = 'torque';
    WT.$view.innerHTML = `${WT.chips(TABS, tab)}<div id="pane"></div>`;
    const $p = WT.$view.querySelector('#pane');
    function render() {
      WT.$view.querySelectorAll(':scope > .chips .chip').forEach((b) => b.setAttribute('aria-selected', b.dataset.k === tab));
      ({ torque, wheels, plugs })[tab]($p, T);
    }
    WT.$view.querySelector('.chips').addEventListener('click', (e) => { const b = e.target.closest('.chip'); if (!b) return; tab = b.dataset.k; WT.store.set('auto.tab', tab); render(); });
    render();
  }

  async function autoelec() {
    WT.setHeader('Auto electrical', true);
    const C = await WT.load('data/auto/cable.json');
    WT.$view.innerHTML = '<div id="pane"></div>';
    cables(WT.$view.querySelector('#pane'), C);
  }

  WT.section('auto', { name: 'Automotive', desc: 'Torque specs, wheel nuts, plugs', group: 'Automotive' }, auto);
  WT.section('autoelec', { name: 'Auto electrical', desc: 'Cable size, amps, lugs', group: 'Electrical' }, autoelec);
})();
