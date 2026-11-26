// Automotive – AU cable chart (Aaron's compiled Narva / Tycab data).
(function () {
  'use strict';
  const { fmt, esc, row } = WT;

  const TERM = { Yellow: 'term-y', Blue: 'term-b', Red: 'term-r' };

  async function auto() {
    WT.setHeader('Automotive', true);
    const C = await WT.load('data/auto/cable.json');
    let amb = WT.store.get('auto.amb', 30);
    WT.$view.innerHTML = `
      <h2 class="h2">${esc(C.title)} <small>B&amp;S = AWG</small></h2>
      <label class="inline">Ambient for Cont. A
        <select id="amb">${C.derate.map(([t]) => `<option value="${t}">${t}°C</option>`).join('')}</select>
      </label>
      <ul id="cl" class="list"></ul>
      <h3 class="sub">Metric mm² / Narva lug → nearest B&amp;S</h3>
      <div class="grid5">${C.metric_to_bs.map(([m, b]) => `<div><b>${m} mm²</b><small>≈ ${b} B&amp;S</small></div>`).join('')}
        ${C.lug_gaps.map((g) => `<div><b>—</b><small>${esc(g)}</small></div>`).join('')}</div>
      <div class="notes">${C.notes.map((n) => `<p>${esc(n)}</p>`).join('')}<p><small>Source: ${esc(C.source)}</small></p></div>`;
    const $amb = WT.$view.querySelector('#amb'), $l = WT.$view.querySelector('#cl');
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
    $l.addEventListener('click', (e) => {
      const h = e.target.closest('.item-head'); if (!h) return;
      const b = h.nextElementSibling; b.hidden = !b.hidden; h.setAttribute('aria-expanded', !b.hidden);
    });
    render();
  }

  WT.section('auto', { name: 'Automotive', desc: 'Cable size, amps, lugs' }, auto);
})();
