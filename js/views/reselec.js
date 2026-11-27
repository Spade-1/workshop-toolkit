// Residential electrical (AU 230 V): TPS cable ratings by installation method, circuit guidance, conduit fill, voltage drop link.
(function () {
  'use strict';
  const { esc, row } = WT;
  const sig = (n, p = 3) => (n == null || !isFinite(n) ? '–' : String(+(+n).toPrecision(p)));

  function cables($el, M) {
    let m = WT.store.get('res.meth', 'touching');
    let I = WT.store.get('res.i', ''), L = WT.store.get('res.l', '');
    $el.innerHTML = `<p class="warn">Guidance from manufacturer data (Prysmian / Olex), not a substitute for AS/NZS 3008.1.1. Copper TPS twin and earth, 75 °C conductor, 40 °C air, one circuit – grouping reduces ratings further.</p>
      <form class="calc" onsubmit="return false">
      <label>How the cable is installed<select id="m">${M.methods.map(([k, t]) => `<option value="${k}">${esc(t)}</option>`).join('')}</select></label>
      <p class="intro" id="mn"></p>
      <div class="row2"><label>Load current (A), optional<input id="i" inputmode="decimal"></label><label>Run length one way (m), optional<input id="l" inputmode="decimal"></label></div></form>
      <table class="tbl"><thead><tr><th>Cable</th><th>Rated A</th><th>mV/A·m</th><th id="th4">Max run at 5%</th></tr></thead><tbody id="tb"></tbody></table>
      <p class="foot">${esc(M.note)} <a href="${esc(M.source_url)}" target="_blank" rel="noopener">Prysmian cable guide</a>.</p>`;
    const $ = (id) => $el.querySelector('#' + id);
    $('m').value = m; $('i').value = I; $('l').value = L;
    function go() {
      m = $('m').value; WT.store.set('res.meth', m); WT.store.set('res.i', $('i').value); WT.store.set('res.l', $('l').value);
      $('mn').textContent = M.methods.find((x) => x[0] === m)[2];
      const i = parseFloat($('i').value), l = parseFloat($('l').value);
      $('th4').textContent = i > 0 && l > 0 ? 'Drop at your run' : i > 0 ? 'Max run at 5%' : 'Max run, 10 A at 5%';
      const best = i > 0 ? M.rows.find((r) => r[m] >= i && (!(l > 0) || (r.mv * i * l) / 1000 <= 11.5)) : null;
      $('tb').innerHTML = M.rows.map((r) => {
        const okA = !(i > 0) || r[m] >= i;
        let c4;
        if (i > 0 && l > 0) { const vd = (r.mv * i * l) / 1000; c4 = `<span class="${vd <= 11.5 ? 'ok' : 'bad'}">${sig(vd)} V · ${sig((vd / 230) * 100, 2)}%</span>`; }
        else c4 = `${sig((11.5 * 1000) / (r.mv * (i > 0 ? i : 10)))} m`;
        return `<tr${r === best ? ' class="near"' : ''}><td><b>${r.mm2} mm²</b>${r === best ? ' ★' : ''}</td><td class="${okA ? '' : 'bad'}">${r[m]}</td><td>${r.mv}</td><td>${c4}</td></tr>`;
      }).join('');
    }
    $('m').addEventListener('change', go); ['i', 'l'].forEach((k) => $(k).addEventListener('input', go)); go();
  }

  function circuits($el, R) {
    $el.innerHTML = `<p class="warn">Typical Australian domestic pairings from retailer and installer guides – guidance only. The appliance rating plate, its install manual and AS/NZS 3000 (maximum demand, voltage drop, derating) govern.</p>
      <ul id="cl" class="list wrap">${R.circuits.map((c) => `<li class="item"><button class="item-head" aria-expanded="false">
        <span class="item-label">${esc(c.circuit)}</span><span class="item-sum">${esc(c.cable)} mm² · ${esc(c.breaker.split(' (')[0].split(';')[0])} A <span class="conf conf-${esc(c.conf)}">${c.conf === 'low' ? 'unverified' : esc(c.conf)}</span></span></button>
        <div class="item-body" hidden>${row('Cable (Cu)', `${esc(c.cable)} mm²`, 'hl')}${row('Breaker', `${esc(c.breaker)} A`)}${c.notes ? row('Notes', esc(c.notes)) : ''}${c.comment ? row('Sources say', esc(c.comment)) : ''}
          ${row('Sources', c.src.map((u, i) => `<a href="${esc(u)}" target="_blank" rel="noopener">src ${i + 1}</a>`).join(' · '))}</div></li>`).join('')}</ul>
      <p class="foot">${esc(R.vd_limits)}</p>`;
    $el.querySelector('#cl').addEventListener('click', (e) => { const h = e.target.closest('.item-head'); if (!h) return; const b = h.nextElementSibling; b.hidden = !b.hidden; h.setAttribute('aria-expanded', !b.hidden); });
  }

  function conduit($el, R) {
    const C = R.conduit;
    $el.innerHTML = `<p class="intro">Max single-core cables per conduit size (mm). Pick the row for your cable size.</p>
      <div style="overflow-x:auto"><table class="tbl cheat"><thead><tr><th>mm²</th>${C.cols.map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>
      ${C.rows.map((r) => `<tr><td><b>${r[0]}</b></td>${r.slice(1).map((v) => `<td>${v}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
      <p class="foot">${esc(C.note)} <a href="${esc(C.url)}" target="_blank" rel="noopener">Olex Handbook</a>.</p>
      <p class="foot">${esc(C.space)} Keep bends to about 360° total between pull points.</p>`;
  }

  function vd($el) {
    $el.innerHTML = `<p class="intro">Voltage drop for 230 V TPS circuits lives in the Electrical calculators, with all eight installation methods.</p>
      <button type="button" class="btn" id="go">Open 230 V voltage drop</button>`;
    $el.querySelector('#go').addEventListener('click', () => {
      const s = WT.store.get('elec.vd2', {}); Object.assign(s, { v: '230', type: 'tps', tgt: '5', sel: '' }); WT.store.set('elec.vd2', s);
      WT.store.set('elec.tab', 'vdrop'); location.hash = 'elec';
    });
  }

  const TABS = [{ key: 'cables', label: 'Cable ratings' }, { key: 'circ', label: 'Circuits & breakers' }, { key: 'conduit', label: 'Conduit fill' }, { key: 'vd', label: 'Voltage drop' }];
  async function reselec() {
    WT.setHeader('Residential electrical', true);
    const M = await WT.load('data/elec/mains_cable.json'), R = await WT.load('data/elec/residential.json');
    let tab = WT.store.get('res.tab', 'cables');
    WT.$view.innerHTML = `${WT.chips(TABS, tab)}<div id="pane"></div>`;
    const $p = WT.$view.querySelector('#pane');
    function render() {
      WT.$view.querySelectorAll(':scope > .chips .chip').forEach((b) => b.setAttribute('aria-selected', b.dataset.k === tab));
      ({ cables: () => cables($p, M), circ: () => circuits($p, R), conduit: () => conduit($p, R), vd: () => vd($p) })[tab]();
    }
    WT.$view.querySelector('.chips').addEventListener('click', (e) => { const b = e.target.closest('.chip'); if (!b) return; tab = b.dataset.k; WT.store.set('res.tab', tab); render(); });
    render();
  }
  WT.section('reselec', { name: 'Residential electrical', desc: 'TPS ratings, circuits, conduit fill' }, reselec);
})();
