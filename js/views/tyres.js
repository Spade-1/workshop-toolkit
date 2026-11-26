// Tyres & wheels – size decoder, compare / speedo error, load & speed index.
(function () {
  'use strict';
  const { fmt, esc, row } = WT;
  const IN = 25.4;

  // 265/65R17 112H · 265/65 R17 · LT265/75R16 · 33x12.50R15 · 33x12.5R15LT
  function parse(s) {
    s = String(s || '').toUpperCase().replace(/\s+/g, '');
    let m = s.match(/^(?:P|LT)?(\d{3})\/(\d{2,3})(?:Z?R|D|-)(\d{2}(?:\.\d)?)(?:LT|C)?(\d{2,3}(?:\/\d{2,3})?)?([A-Z])?/);
    if (m) {
      const w = +m[1], ar = +m[2], rim = +m[3];
      const side = w * ar / 100;
      return { kind: 'metric', w, ar, rim, side, dia: rim * IN + 2 * side, li: m[4], sr: m[5] };
    }
    m = s.match(/^(\d{2}(?:\.\d+)?)X(\d{1,2}(?:\.\d+)?)R(\d{2}(?:\.\d)?)(?:LT)?(\d{2,3})?([A-Z])?/);
    if (m) {
      const dIn = +m[1], wIn = +m[2], rim = +m[3];
      return { kind: 'flotation', w: wIn * IN, ar: Math.round(((dIn - rim) / 2) / wIn * 100), rim, side: (dIn - rim) / 2 * IN, dia: dIn * IN, li: m[4], sr: m[5] };
    }
    return null;
  }

  function sizeRows(t, D) {
    const circ = Math.PI * t.dia;
    let h = row('Overall diameter', `<b class="big">${fmt(t.dia, 0)} mm</b> = ${fmt(t.dia / IN, 1)}"`, 'hl');
    h += row('Width', `${fmt(t.w, 0)} mm = ${fmt(t.w / IN, 1)}"`);
    h += row('Sidewall height', `${fmt(t.side, 0)} mm (${t.ar}%)`);
    h += row('Rim', `${t.rim}"`);
    h += row('Circumference', `${fmt(circ, 0)} mm`);
    h += row('Revs per km', fmt(1e6 / circ, 0));
    if (t.li) {
      const parts = t.li.split('/');
      h += row('Load index', parts.map((p) => `${p} = ${D.load_index[p] ? D.load_index[p] + ' kg' : '?'}`).join(' · ') + ' <small>per tyre</small>');
    }
    if (t.sr) { const s = D.speed_rating.find((x) => x[0] === t.sr); h += row('Speed rating', s ? `${t.sr} = ${s[1]} km/h` : t.sr); }
    return h;
  }

  function calc($el, D) {
    $el.innerHTML = `<form class="calc" onsubmit="return false">
        <label>Current tyre<input id="a" type="text" autocomplete="off" placeholder="e.g. 285/60R18 116V"></label>
        <label>New tyre (optional, to compare)<input id="b" type="text" autocomplete="off" placeholder="e.g. 285/70R17 or 33x12.50R17"></label>
      </form><div id="o" class="out"></div>
      <p class="foot">Diameter from the nominal size – real tyres vary a few mm by brand and tread depth. ${esc(D.fitment_note)}</p>`;
    const $a = $el.querySelector('#a'), $b = $el.querySelector('#b'), $o = $el.querySelector('#o');
    $a.value = WT.store.get('tyre.a', '285/60R18 116V'); $b.value = WT.store.get('tyre.b', '');
    function go() {
      WT.store.set('tyre.a', $a.value); WT.store.set('tyre.b', $b.value);
      const A = parse($a.value), B = parse($b.value);
      if (!A) { $o.innerHTML = row('Size', 'Enter a size like 265/65R17 or 33x12.50R15'); return; }
      let h = sizeRows(A, D);
      if (B) {
        const diff = (B.dia - A.dia) / A.dia;
        h += `<h3 class="sub">New tyre</h3>` + sizeRows(B, D);
        h += row('Diameter change', `<b class="big">${diff >= 0 ? '+' : ''}${fmt(diff * 100, 1)}%</b> (${diff >= 0 ? '+' : ''}${fmt(B.dia - A.dia, 0)} mm)`, 'hl');
        h += row('Ride height change', `${diff >= 0 ? '+' : ''}${fmt((B.dia - A.dia) / 2, 0)} mm`);
        h += row('Speedo shows 100 km/h', `actual <b class="big">${fmt(100 * (1 + diff), 1)} km/h</b>`, 'hl');
        h += row('Speedo shows 60 km/h', `actual ${fmt(60 * (1 + diff), 1)} km/h`);
      } else if ($b.value.trim()) h += row('New tyre', 'size not recognised');
      $o.innerHTML = h;
    }
    $a.addEventListener('input', go); $b.addEventListener('input', go); go();
  }

  function decode($el, D) {
    $el.innerHTML = `<h3 class="sub">Reading the sidewall</h3><div class="out">${D.markings.map(([k, v]) => row(esc(k), esc(v))).join('')}</div>
      <h3 class="sub">Wheel terms</h3><div class="out">${D.wheel_terms.map(([k, v]) => row(esc(k), esc(v))).join('')}</div>`;
  }

  function tables($el, D) {
    const li = Object.entries(D.load_index);
    const half = Math.ceil(li.length / 2);
    const pair = li.slice(0, half).map((a, i) => [a, li[half + i]]);
    $el.innerHTML = `<h3 class="sub">Speed rating</h3>
      <table class="tbl"><thead><tr><th>Letter</th><th>km/h</th><th>Letter</th><th>km/h</th></tr></thead><tbody>
      ${D.speed_rating.slice(0, 7).map((s, i) => { const t = D.speed_rating[i + 7]; return `<tr><td><b>${s[0]}</b></td><td>${s[1]}</td><td><b>${t ? t[0] : ''}</b></td><td>${t ? t[1] : ''}</td></tr>`; }).join('')}</tbody></table>
      <h3 class="sub">Load index (kg per tyre)</h3>
      <table class="tbl"><thead><tr><th>LI</th><th>kg</th><th>LI</th><th>kg</th></tr></thead><tbody>
      ${pair.map(([a, b]) => `<tr><td><b>${a[0]}</b></td><td>${a[1]}</td><td><b>${b ? b[0] : ''}</b></td><td>${b ? b[1] : ''}</td></tr>`).join('')}</tbody></table>
      <p class="foot">${D.sources.map(esc).join(' ')}</p>`;
  }

  const TABS = [{ key: 'calc', label: 'Size calculator' }, { key: 'decode', label: 'Explained' }, { key: 'tables', label: 'Load & speed' }];
  async function tyres() {
    WT.setHeader('Tyres & wheels', true);
    const D = await WT.load('data/auto/tyres.json');
    let tab = WT.store.get('tyre.tab', 'calc');
    WT.$view.innerHTML = `${WT.chips(TABS, tab)}<div id="pane"></div>`;
    const $p = WT.$view.querySelector('#pane');
    function render() {
      WT.$view.querySelectorAll(':scope > .chips .chip').forEach((b) => b.setAttribute('aria-selected', b.dataset.k === tab));
      ({ calc, decode, tables })[tab]($p, D);
    }
    WT.$view.querySelector('.chips').addEventListener('click', (e) => { const b = e.target.closest('.chip'); if (!b) return; tab = b.dataset.k; WT.store.set('tyre.tab', tab); render(); });
    render();
  }
  WT.section('tyres', { name: 'Tyres & wheels', desc: 'Size calc, speedo error, load/speed' }, tyres);
  WT.parseTyre = parse;
})();
