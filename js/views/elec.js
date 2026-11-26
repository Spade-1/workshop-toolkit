// Electrical calculators: VIRP (Ohm's law + power), voltage drop, series/parallel, LED resistor, battery runtime.
(function () {
  'use strict';
  const { esc, row } = WT;

  // ---------- number helpers
  const sig = (n, p = 4) => (n == null || !isFinite(n) ? '–' : String(+(+n).toPrecision(p)));
  const PRE = [[1e9, 'G'], [1e6, 'M'], [1e3, 'k'], [1, ''], [1e-3, 'm'], [1e-6, 'µ'], [1e-9, 'n'], [1e-12, 'p']];
  function si(n, unit, p = 4) { // 4700, 'Ω' -> '4.7 kΩ'
    if (n == null || !isFinite(n)) return '–';
    if (n === 0) return `0 ${unit}`;
    const a = Math.abs(n);
    const [k, s] = PRE.find(([k]) => a >= k * 0.99999) || PRE[PRE.length - 1];
    return `${sig(n / k, p)} ${s}${unit}`;
  }
  function parseSI(t) { // '4.7k', '4k7', '100n', '2.2u', '1M', '330'
    t = String(t).trim().replace(/\s*(ohms?|Ω|F)$/i, '').replace('µ', 'u');
    let m = t.match(/^(\d+)([pnumkKMG])(\d+)$/);
    if (m) t = `${m[1]}.${m[3]}${m[2]}`;
    m = t.match(/^([\d.]+(?:e-?\d+)?)\s*([pnumkKMG]?)$/);
    if (!m) return null;
    const mult = { p: 1e-12, n: 1e-9, u: 1e-6, m: 1e-3, '': 1, k: 1e3, K: 1e3, M: 1e6, G: 1e9 }[m[2]];
    const v = parseFloat(m[1]) * mult;
    return isFinite(v) && v > 0 ? v : null;
  }
  const num = (el) => { const v = parseFloat(el.value); return isFinite(v) ? v : null; };
  const work = (lines) => `<div class="work">${lines.map((l) => `<p>${l}</p>`).join('')}</div>`;

  // ---------- VIRP
  const Q = {
    V: { name: 'Voltage', word: 'volts (V)', unit: 'V', u: [['mV', 1e-3], ['V', 1], ['kV', 1e3]], d: 1 },
    I: { name: 'Current', word: 'amps (A)', unit: 'A', u: [['mA', 1e-3], ['A', 1]], d: 1 },
    R: { name: 'Resistance', word: 'ohms (Ω)', unit: 'Ω', u: [['Ω', 1], ['kΩ', 1e3], ['MΩ', 1e6]], d: 0 },
    P: { name: 'Power', word: 'watts (W)', unit: 'W', u: [['mW', 1e-3], ['W', 1], ['kW', 1e3]], d: 1 },
  };
  const K = ['V', 'I', 'R', 'P'];

  function tri(top, bl, br, solve, title) {
    const cell = ([l, v], x, y) => {
      const s = l.replace('²', '') === solve;
      return `<text x="${x}" y="${y}" text-anchor="middle" class="tl${s ? ' s' : ''}">${l}</text>
        <text x="${x}" y="${y + 20}" text-anchor="middle" class="tv${s ? ' s' : ''}">${esc(v)}</text>`;
    };
    return `<svg class="tri" viewBox="0 0 220 134" role="img"><title>${esc(title)}</title>
      <polygon points="110,6 6,128 214,128" class="tri-o"/>
      <line x1="58" y1="67" x2="162" y2="67" class="tri-l"/><line x1="110" y1="67" x2="110" y2="128" class="tri-l"/>
      ${cell(top, 110, 40)}${cell(bl, 70, 95)}${cell(br, 150, 95)}</svg>`;
  }

  function virp($el) {
    const units = WT.store.get('elec.virp.u', { V: 1, I: 1, R: 0, P: 1 });
    $el.innerHTML = `<p class="intro">Fill any two. The other two are solved, with the triangle and working for each.</p>
      <form class="calc virp" onsubmit="return false">${K.map((k) => `
        <div class="vf" id="f${k}"><div class="vl"><b>${k}</b><span>${Q[k].name}</span><small>${Q[k].word}</small></div>
          <input id="v${k}" inputmode="decimal" autocomplete="off">
          <select id="u${k}">${Q[k].u.map(([n], i) => `<option value="${i}"${i === units[k] ? ' selected' : ''}>${n}</option>`).join('')}</select></div>`).join('')}
        <div class="vbar"><span id="vhint">Fill any two</span><button type="button" class="btn" id="vclr">Clear</button></div>
      </form><div id="vout"></div>`;
    const $ = (id) => $el.querySelector('#' + id);
    const auto = new Set();
    const mult = (k) => Q[k].u[+$('u' + k).value][1];
    const show = (k, base) => si(base, Q[k].unit);

    function go(e) {
      if (e && e.target.tagName === 'INPUT') auto.delete(e.target.id.slice(1));
      K.forEach((k) => { if (auto.has(k)) $('v' + k).value = ''; $('f' + k).classList.remove('solved'); });
      auto.clear();
      const g = {};
      K.forEach((k) => { const v = num($('v' + k)); if (v != null && v > 0) g[k] = v * mult(k); });
      const have = Object.keys(g).sort().join('');
      if (have.length !== 2) {
        $('vout').innerHTML = '';
        $('vhint').textContent = have.length > 2 ? 'Only two needed – clear one' : 'Fill any two';
        return;
      }
      let { V, I, R, P } = g;
      const S = [];
      const add = (k, val, f, nums, t) => S.push({ k, val, f, nums, t });
      const s = (k) => show(k, g[k]);
      const OHM = "Ohm's law", PL = 'Power law', PIR = 'Power from I and R', PVR = 'Power from V and R';
      if (have === 'IV') {
        R = V / I; P = V * I;
        add('R', R, 'R = V ÷ I', `${s('V')} ÷ ${s('I')}`, [['V', s('V')], ['I', s('I')], ['R', '?'], OHM]);
        add('P', P, 'P = V × I', `${s('V')} × ${s('I')}`, [['P', '?'], ['I', s('I')], ['V', s('V')], PL]);
      } else if (have === 'RV') {
        I = V / R; P = (V * V) / R;
        add('I', I, 'I = V ÷ R', `${s('V')} ÷ ${s('R')}`, [['V', s('V')], ['I', '?'], ['R', s('R')], OHM]);
        add('P', P, 'P = V² ÷ R', `(${s('V')})² ÷ ${s('R')}`, [['V²', `(${s('V')})²`], ['P', '?'], ['R', s('R')], PVR]);
      } else if (have === 'IR') {
        V = I * R; P = I * I * R;
        add('V', V, 'V = I × R', `${s('I')} × ${s('R')}`, [['V', '?'], ['I', s('I')], ['R', s('R')], OHM]);
        add('P', P, 'P = I² × R', `(${s('I')})² × ${s('R')}`, [['P', '?'], ['I²', `(${s('I')})²`], ['R', s('R')], PIR]);
      } else if (have === 'PV') {
        I = P / V; R = (V * V) / P;
        add('I', I, 'I = P ÷ V', `${s('P')} ÷ ${s('V')}`, [['P', s('P')], ['I', '?'], ['V', s('V')], PL]);
        add('R', R, 'R = V² ÷ P', `(${s('V')})² ÷ ${s('P')}`, [['V²', `(${s('V')})²`], ['P', s('P')], ['R', '?'], PVR]);
      } else if (have === 'IP') {
        V = P / I; R = P / (I * I);
        add('V', V, 'V = P ÷ I', `${s('P')} ÷ ${s('I')}`, [['P', s('P')], ['I', s('I')], ['V', '?'], PL]);
        add('R', R, 'R = P ÷ I²', `${s('P')} ÷ (${s('I')})²`, [['P', s('P')], ['I²', `(${s('I')})²`], ['R', '?'], PIR]);
      } else if (have === 'PR') {
        I = Math.sqrt(P / R); V = Math.sqrt(P * R);
        add('I', I, 'I = √(P ÷ R)', `√(${s('P')} ÷ ${s('R')})`, [['P', s('P')], ['I²', '?'], ['R', s('R')], PIR]);
        add('V', V, 'V = √(P × R)', `√(${s('P')} × ${s('R')})`, [['V²', '?'], ['P', s('P')], ['R', s('R')], PVR]);
      }
      $('vout').innerHTML = S.map((x) => {
        $('v' + x.k).value = sig(x.val / mult(x.k));
        auto.add(x.k); $('f' + x.k).classList.add('solved');
        const [top, bl, br, name] = x.t;
        return `<div class="card solve"><div class="solve-h"><b>${x.k}</b> ${Q[x.k].name} = <strong>${show(x.k, x.val)}</strong><small>${name}</small></div>
          ${tri(top, bl, br, x.k, name)}
          ${work([x.f, `= ${x.nums}`, `= <strong>${show(x.k, x.val)}</strong>`])}</div>`;
      }).join('');
      $('vhint').textContent = 'Solved';
    }
    K.forEach((k) => {
      $('v' + k).addEventListener('input', go);
      $('u' + k).addEventListener('change', () => {
        units[k] = +$('u' + k).value; WT.store.set('elec.virp.u', units);
        if (auto.has(k)) auto.delete(k), ($('v' + k).value = '');
        go();
      });
    });
    $('vclr').addEventListener('click', () => { K.forEach((k) => ($('v' + k).value = '')); auto.clear(); go(); });
  }

  // ---------- Voltage drop
  const RHO = 0.0172; // Ω·mm²/m, copper at 20 °C
  const AUTO_INST = [
    ['air30', 'Free air or cabin, up to 30 °C', 1.0, 'The rated condition (Tycab, 30 °C ambient). Full rating.'],
    ['cab40', 'Warm cabin, tray or canopy, 40 °C', 0.9, 'Warmer air leaves less headroom before the insulation reaches its limit.'],
    ['bay50', 'Engine bay, away from heat, 50 °C', 0.76, 'Under-bonnet air is hot even away from the engine.'],
    ['bay60', 'Engine bay, typical, 60 °C', 0.6, 'Typical engine bay. Cable carries a bit over half its rating.'],
    ['bay70', 'Engine bay near exhaust or turbo, 70 °C', 0.45, 'Close to heat sources. Under half the rating – reroute or upsize.'],
  ];
  const VPRE = [['12', '12 V'], ['13.8', '13.8 V (idling, charging)'], ['14.4', '14.4 V (charging)'], ['24', '24 V'], ['28.8', '28.8 V (24 V charging)'], ['48', '48 V'], ['230', '230 V AC'], ['', 'Custom']];
  function autoName(r) {
    const s = r.au_sold_as || '';
    if (/auto/.test(s)) return `${s.replace(' auto', '').replace('mm', ' mm')} · ${r.bs} B&S`;
    if (/"8mm"/.test(s)) return `8 mm · ${r.bs} B&S`;
    return `${r.bs} B&S`;
  }
  async function vdrop($el) {
    const C = await WT.load('data/auto/cable.json');
    const M = await WT.load('data/elec/mains_cable.json');
    const dc = C.rows.filter((r) => r.au_mm2).map((r) => ({ id: r.bs, name: autoName(r), a: r.au_mm2, rating: parseFloat(r.cont_a) })).sort((a, b) => a.a - b.a);
    const st = WT.store.get('elec.vd2', { v: '12', type: 'auto', i: '', l: '', tgt: '3', inst: 'air30', minst: 'touching', sel: '' });
    $el.innerHTML = `<form class="calc" onsubmit="return false">
      <div class="row2"><label>System voltage (V)<input id="v" inputmode="decimal"></label><label>Preset<select id="vp">${VPRE.map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}</select></label></div>
      <label>Cable type<select id="type"><option value="auto">Auto / marine single-core (DC)</option><option value="tps">Building TPS twin and earth (230 V)</option></select></label>
      <div class="row2"><label>Current draw (A)<input id="i" inputmode="decimal"></label><label>Run length, one way (m)<input id="l" inputmode="decimal"></label></div>
      <label>Where it's installed<select id="inst"></select></label>
      <p class="intro" id="instn"></p>
      <label>Allowed drop<select id="tgt"></select></label>
      </form><div id="vdo"></div><p class="foot" id="vdn"></p>`;
    const $ = (id) => $el.querySelector('#' + id);
    $('v').value = st.v; $('type').value = st.type; $('i').value = st.i; $('l').value = st.l;
    let sel = st.sel;
    const vpSync = () => { $('vp').value = VPRE.some(([v]) => v === $('v').value) ? $('v').value : ''; };
    function fill() {
      const tps = $('type').value === 'tps';
      $('inst').innerHTML = (tps ? M.methods.map(([k, t]) => [k, t]) : AUTO_INST.map(([k, t]) => [k, t])).map(([k, t]) => `<option value="${k}">${esc(t)}</option>`).join('');
      $('inst').value = tps ? st.minst : st.inst;
      if (!$('inst').value) $('inst').selectedIndex = 0;
      $('tgt').innerHTML = (tps ? [['5', '5% (AS/NZS 3000, whole installation)'], ['3', '3%'], ['2.5', '2.5% (final-circuit rule of thumb)']]
        : [['3', '3% – critical: fridge, lights, charging'], ['5', '5%'], ['10', '10% – non-critical']]).map(([v, t]) => `<option value="${v}">${t}</option>`).join('');
      if ([...$('tgt').options].some((o) => o.value === st.tgt)) $('tgt').value = st.tgt;
      $('vdn').innerHTML = tps ? `${esc(M.note)} Source: <a href="${esc(M.source_url)}" target="_blank" rel="noopener">${esc(M.source)}</a> (${esc(M.confidence)} confidence).`
        : 'Drop uses round-trip copper resistance at 20 °C (ρ = 0.0172 Ω·mm²/m) and the copper area AU auto cable is actually sold with – auto cable sizes are smaller than their B&S equivalent. Earth-return circuits: count the positive run only. Ratings: Tycab continuous at 30 °C, derated for the location you pick. Bundling in a loom or split tube lowers ratings further – factor being sourced.';
    }
    function go() {
      const tps = $('type').value === 'tps', V = num($('v')), I = num($('i')), L = num($('l')), tgt = +$('tgt').value, inst = $('inst').value;
      Object.assign(st, { v: $('v').value, type: $('type').value, i: $('i').value, l: $('l').value, tgt: $('tgt').value, sel });
      if (tps) st.minst = inst; else st.inst = inst;
      WT.store.set('elec.vd2', st);
      const m = tps ? M.methods.find((x) => x[0] === inst) : AUTO_INST.find((x) => x[0] === inst);
      const k = tps ? null : m[2];
      $('instn').innerHTML = tps ? esc(m[2]) : `<b>×${k}</b> of the 30 °C rating. ${esc(m[3])}`;
      if (!V || !I || !L) { $('vdo').innerHTML = `<div class="out">${row('Enter', 'voltage, current and length')}</div>`; return; }
      const allow = (V * tgt) / 100;
      const list = (tps ? M.rows.map((r) => ({ id: String(r.mm2), name: `${r.mm2} mm² TPS`, a: r.mm2, rating: r[inst], vd: (r.mv * I * L) / 1000, mv: r.mv }))
        : dc.map((r) => ({ ...r, rating: r.rating * k, base: r.rating, vd: (I * RHO * 2 * L) / r.a })))
        .map((r) => ({ ...r, pct: (r.vd / V) * 100, okV: r.vd <= allow, okA: r.rating >= I }));
      const best = list.find((r) => r.okV && r.okA);
      const cur = list.find((r) => r.id === sel) || best || list[list.length - 1];
      let w;
      if (tps) w = [`Vd = mV/A·m × I × L ÷ 1000`, `= ${cur.mv} × ${sig(I)} × ${sig(L)} ÷ 1000`, `= <strong>${sig(cur.vd, 3)} V</strong> (${sig(cur.pct, 3)}% of ${sig(V)} V)`];
      else w = [`R = ρ × 2L ÷ A = 0.0172 × 2 × ${sig(L)} ÷ ${cur.a}`, `= ${sig((RHO * 2 * L) / cur.a, 3)} Ω`, `Vd = I × R = <strong>${sig(cur.vd, 3)} V</strong> (${sig(cur.pct, 3)}% of ${sig(V)} V)`,
        `Rating = ${cur.base} A × ${k} = ${sig(cur.rating, 3)} A`];
      const maxRun = tps ? (allow * 1000) / (cur.mv * I) : (allow * cur.a) / (RHO * 2 * I);
      $('vdo').innerHTML = `<div class="card solve"><div class="solve-h"><b>${esc(cur.name)}</b>${cur === best ? ' <span class="ok">· smallest that passes</span>' : ''}</div>
        <div class="out" style="padding:0;background:none">${row('Drop', `<span class="${cur.okV ? 'ok' : 'bad'}">${sig(cur.vd, 3)} V · ${sig(cur.pct, 3)}%</span>`, 'hl')}
        ${row('At the load', `${sig(V - cur.vd, 4)} V`)}${row('Rating here', `<span class="${cur.okA ? 'ok' : 'bad'}">${sig(cur.rating, 3)} A${cur.okA ? '' : ' · too small for ' + sig(I) + ' A'}</span>`)}
        ${row(`Max run at ${tgt}%`, `${sig(maxRun, 3)} m one way`)}</div>${work(w)}</div>
        <table class="tbl vdt"><thead><tr><th>Cable</th><th>mm²</th><th>Rated A</th><th>Drop V</th><th>%</th></tr></thead><tbody>
        ${list.map((r) => `<tr data-id="${esc(r.id)}" class="${r === cur ? 'near' : ''}"><td>${esc(r.name)}${r === best ? ' ★' : ''}</td><td>${r.a}</td>
          <td class="${r.okA ? '' : 'bad'}">${sig(r.rating, 3)}</td><td class="${r.okV ? 'ok' : 'bad'}">${sig(r.vd, 2)}</td><td class="${r.okV ? 'ok' : 'bad'}">${sig(r.pct, 2)}</td></tr>`).join('')}</tbody></table>
        <p class="foot">Tap a row to see its working. ★ = smallest cable that passes both drop and rating. Red = fails.</p>`;
      $el.querySelectorAll('.vdt tbody tr').forEach((tr) => tr.addEventListener('click', () => { sel = tr.dataset.id; go(); }));
    }
    fill(); vpSync();
    $('vp').addEventListener('change', () => {
      if ($('vp').value) { $('v').value = $('vp').value; const t = $('vp').value === '230' ? 'tps' : 'auto'; if (t !== $('type').value) { $('type').value = t; sel = ''; fill(); } }
      else $('v').focus();
      go();
    });
    $('v').addEventListener('input', () => { vpSync(); go(); });
    $('type').addEventListener('change', () => { sel = ''; fill(); go(); });
    ['i', 'l'].forEach((x) => $(x).addEventListener('input', go));
    ['inst', 'tgt'].forEach((x) => $(x).addEventListener('change', go));
    go();
  }

  // ---------- Series / parallel
  function combo($el) {
    let mode = WT.store.get('elec.sp.mode', 'R');
    $el.innerHTML = `${WT.chips([{ key: 'R', label: 'Resistors' }, { key: 'C', label: 'Capacitors' }], mode).replace('class="chips"', 'class="chips small"')}
      <form class="calc" onsubmit="return false"><label>Values, separated by commas or spaces<input id="sv" autocomplete="off" placeholder="e.g. 4.7k, 10k, 2k2"></label></form>
      <div id="so"></div><p class="foot">Suffixes: p n u (µ) m k M. 4k7 = 4.7k.</p>`;
    const $v = $el.querySelector('#sv'), $o = $el.querySelector('#so');
    $v.value = WT.store.get('elec.sp.v.' + mode, '');
    function go() {
      WT.store.set('elec.sp.v.' + mode, $v.value);
      const parts = $v.value.split(/[\s,;]+/).filter(Boolean);
      const vals = parts.map(parseSI);
      if (!parts.length) { $o.innerHTML = ''; return; }
      if (vals.some((v) => v == null)) { $o.innerHTML = `<div class="out">${row("Can't read", esc(parts[vals.indexOf(null)]))}</div>`; return; }
      const u = mode === 'R' ? 'Ω' : 'F';
      const sum = vals.reduce((a, b) => a + b, 0), recip = 1 / vals.reduce((a, b) => a + 1 / b, 0);
      const list = vals.map((v) => si(v, u)).join(' + ');
      const rlist = vals.map((v) => `1/${si(v, u)}`).join(' + ');
      const add = mode === 'R' ? 'Series' : 'Parallel', rec = mode === 'R' ? 'Parallel' : 'Series';
      $o.innerHTML = `<div class="card solve"><div class="solve-h"><b>${add}</b> = <strong>${si(sum, u)}</strong></div>${work([`${mode}t = ${list}`, `= <strong>${si(sum, u)}</strong>`])}</div>
        <div class="card solve"><div class="solve-h"><b>${rec}</b> = <strong>${si(recip, u)}</strong></div>${work([`1/${mode}t = ${rlist}`, `${mode}t = <strong>${si(recip, u)}</strong>`])}
        ${vals.length === 2 ? work([`Two only: (A × B) ÷ (A + B) = ${si(vals[0] * vals[1] / (vals[0] + vals[1]), u)}`]) : ''}</div>
        ${mode === 'C' ? '<p class="foot">Capacitors add in parallel and combine as reciprocals in series – the opposite of resistors. Series caps: check each voltage rating.</p>' : ''}`;
    }
    $el.querySelector('.chips').addEventListener('click', (e) => {
      const b = e.target.closest('.chip'); if (!b) return;
      mode = b.dataset.k; WT.store.set('elec.sp.mode', mode);
      $el.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-selected', c.dataset.k === mode));
      $v.value = WT.store.get('elec.sp.v.' + mode, ''); go();
    });
    $v.addEventListener('input', go); go();
  }

  // ---------- LED resistor
  const E12 = [1.0, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2];
  const E24 = [1.0, 1.1, 1.2, 1.3, 1.5, 1.6, 1.8, 2.0, 2.2, 2.4, 2.7, 3.0, 3.3, 3.6, 3.9, 4.3, 4.7, 5.1, 5.6, 6.2, 6.8, 7.5, 8.2, 9.1];
  const up = (r, S) => { const d = 10 ** Math.floor(Math.log10(r)); const m = S.find((x) => x * d >= r * 0.9999); return m ? m * d : 10 * d; };
  const WATT = [0.125, 0.25, 0.5, 1, 2, 3, 5, 10];
  const VF = [['2.0', 'Red / yellow ~2.0 V'], ['2.2', 'Orange / amber ~2.2 V'], ['3.1', 'White / blue / green ~3.1 V'], ['', 'Custom']];
  function led($el) {
    const st = WT.store.get('elec.led', { vs: '14.4', vf: '3.1', i: '20', n: '1' });
    $el.innerHTML = `<form class="calc" onsubmit="return false">
      <div class="row2"><label>Supply (V)<input id="vs" inputmode="decimal"></label><label>LEDs in series<input id="n" inputmode="numeric"></label></div>
      <label>LED colour / forward voltage<select id="vfs">${VF.map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}</select></label>
      <div class="row2"><label>Forward voltage (V)<input id="vf" inputmode="decimal"></label><label>Current (mA)<input id="i" inputmode="decimal"></label></div>
      </form><div id="lo"></div>
      <p class="foot">Car: use 14.4 V (charging), not 12 V. Check the LED datasheet for forward voltage and current; 20 mA is typical for 5 mm LEDs.</p>`;
    const $ = (id) => $el.querySelector('#' + id);
    $('vs').value = st.vs; $('vf').value = st.vf; $('i').value = st.i; $('n').value = st.n;
    $('vfs').value = VF.some(([v]) => v === st.vf) ? st.vf : '';
    function go() {
      WT.store.set('elec.led', { vs: $('vs').value, vf: $('vf').value, i: $('i').value, n: $('n').value });
      const Vs = num($('vs')), Vf = num($('vf')), mA = num($('i')), n = Math.max(1, Math.round(num($('n')) || 1));
      if (!Vs || !Vf || !mA) { $('lo').innerHTML = ''; return; }
      const I = mA / 1000, Vr = Vs - n * Vf;
      if (Vr <= 0) { $('lo').innerHTML = `<div class="out">${row('Not enough supply', `${n} × ${Vf} V = ${sig(n * Vf)} V ≥ ${Vs} V – use fewer LEDs in series`)}</div>`; return; }
      const R = Vr / I, r12 = up(R, E12), r24 = up(R, E24);
      const Ia = Vr / r12, Pr = Ia * Ia * r12, Wr = WATT.find((w) => w >= Pr * 2) || '>10';
      $('lo').innerHTML = `<div class="card solve"><div class="solve-h"><b>R</b> = <strong>${si(R, 'Ω', 3)}</strong><small>exact</small></div>
        ${work([`R = (Vs − n × Vf) ÷ I`, `= (${sig(Vs)} − ${n} × ${sig(Vf)}) ÷ ${sig(I)}`, `= ${sig(Vr, 3)} ÷ ${sig(I)} = <strong>${si(R, 'Ω', 3)}</strong>`])}</div>
        <div class="out">${row('Use (E12)', `<b class="acc">${si(r12, 'Ω', 3)}</b>`, 'hl')}${row('Or (E24)', si(r24, 'Ω', 3))}
        ${row('Actual current', `${sig(Ia * 1000, 3)} mA`)}${row('Resistor heat', `${sig(Pr, 2)} W`)}${row('Resistor rating', `${Wr === '>10' ? '>10' : Wr >= 1 ? Wr : '1/' + 1 / Wr} W <small>(2× margin)</small>`)}</div>`;
    }
    $('vfs').addEventListener('change', () => { if ($('vfs').value) $('vf').value = $('vfs').value; go(); });
    $('vf').addEventListener('input', () => { $('vfs').value = VF.some(([v]) => v === $('vf').value) ? $('vf').value : ''; go(); });
    ['vs', 'i', 'n'].forEach((k) => $(k).addEventListener('input', go));
    go();
  }

  // ---------- Battery runtime
  const CHEM = [['0.5', 'AGM / flooded lead-acid – 50% usable'], ['0.8', 'Lead-acid, deep cycle pushed – 80%'], ['0.9', 'Lithium LiFePO4 – 90% usable'], ['1', 'Full capacity – 100%']];
  const CAPU = [['ah', 'Ah'], ['mah', 'mAh'], ['wh', 'Wh'], ['kwh', 'kWh']];
  const LOADU = [['w', 'W'], ['kw', 'kW'], ['a', 'A'], ['ma', 'mA']];
  function battery($el) {
    const st = WT.store.get('elec.bat2', { cap: '100', cu: 'ah', v: '12', dod: '0.5', load: '', lu: 'w', sup: 'dc', eff: '85', hrs: '' });
    $el.innerHTML = `<form class="calc" onsubmit="return false">
      <div class="row2"><label>Battery capacity<input id="cap" inputmode="decimal"></label><label>Unit<select id="cu">${CAPU.map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}</select></label></div>
      <div class="row2"><label>Battery voltage (V)<select id="v">${['3.7', '7.4', '12', '24', '48'].map((x) => `<option>${x}</option>`).join('')}</select></label><label>&nbsp;</label></div>
      <label>Type / usable capacity<select id="dod">${CHEM.map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}</select></label>
      <div class="row2"><label>Load – what the device draws<input id="load" inputmode="decimal"></label><label>Unit<select id="lu">${LOADU.map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}</select></label></div>
      <label>Device runs on<select id="sup"><option value="dc">DC, straight off the battery</option><option value="ac">230 V AC, through an inverter</option></select></label>
      <label id="effw">Inverter efficiency (%)<input id="eff" inputmode="decimal"></label>
      </form><div id="bo"></div>
      <h3 class="sub">Battery needed</h3>
      <form class="calc" onsubmit="return false"><label>Run time wanted (hours)<input id="hrs" inputmode="decimal"></label></form><div id="bn"></div>
      <p class="foot">Ah × V = Wh. Lead-acid gives less than its rated Ah at high draw (Peukert) and in the cold; ratings are usually at the 20-hour rate. AC amps are converted at 230 V.</p>`;
    const $ = (id) => $el.querySelector('#' + id);
    Object.entries(st).forEach(([k, v]) => { if ($(k)) $(k).value = v; });
    function go() {
      const s = {}; Object.keys(st).forEach((k) => (s[k] = $(k).value)); WT.store.set('elec.bat2', s);
      $('effw').hidden = s.sup !== 'ac';
      const V = +s.v, dod = +s.dod, cap = num($('cap')), load = num($('load')), eff = (num($('eff')) || 85) / 100, H = num($('hrs'));
      if (!load) { $('bo').innerHTML = ''; $('bn').innerHTML = ''; return; }
      const lv = s.sup === 'ac' ? 230 : V;
      const Wdev = { w: load, kw: load * 1000, a: load * lv, ma: (load / 1000) * lv }[s.lu];
      const Wdc = s.sup === 'ac' ? Wdev / eff : Wdev;
      const lw = [];
      if (s.lu === 'a' || s.lu === 'ma') lw.push(`Load = ${sig(s.lu === 'ma' ? load / 1000 : load)} A × ${lv} V = ${sig(Wdev, 4)} W`);
      else lw.push(`Load = ${sig(Wdev, 4)} W`);
      if (s.sup === 'ac') lw.push(`Battery side = ${sig(Wdev, 4)} W ÷ ${sig(eff)} = ${sig(Wdc, 4)} W`);
      lw.push(`Battery current = ${sig(Wdc, 4)} W ÷ ${V} V = ${sig(Wdc / V, 3)} A`);
      if (cap) {
        const Wh = { ah: cap * V, mah: (cap / 1000) * V, wh: cap, kwh: cap * 1000 }[s.cu];
        const capTxt = { ah: `${sig(cap)} Ah × ${V} V`, mah: `${sig(cap)} mAh ÷ 1000 × ${V} V`, wh: `${sig(cap)} Wh`, kwh: `${sig(cap)} kWh × 1000` }[s.cu];
        const use = Wh * dod, h = use / Wdc;
        const t = h >= 48 ? `${sig(h / 24, 3)} days` : h < 1 ? `${sig(h * 60, 3)} min` : `${sig(h, 3)} h`;
        $('bo').innerHTML = `<div class="card solve"><div class="solve-h"><b>Runtime</b> = <strong>${t}</strong><small>${sig(Wh, 4)} Wh total · ${sig(use, 4)} Wh usable</small></div>
          ${work([...lw, `Capacity = ${capTxt} = ${sig(Wh, 4)} Wh`, `Usable = ${sig(Wh, 4)} × ${dod * 100}% = ${sig(use, 4)} Wh`, `Time = ${sig(use, 4)} Wh ÷ ${sig(Wdc, 4)} W = <strong>${sig(h, 3)} h</strong>`])}</div>`;
      } else $('bo').innerHTML = '';
      if (H) {
        const WhNeed = (Wdc * H) / dod, ah = WhNeed / V;
        $('bn').innerHTML = `<div class="card solve"><div class="solve-h"><b>Need</b> = <strong>${sig(ah, 3)} Ah</strong><small>${sig(WhNeed, 4)} Wh at ${V} V</small></div>
          ${work([`Wh = W × h ÷ usable = ${sig(Wdc, 4)} × ${sig(H)} ÷ ${dod}`, `= ${sig(WhNeed, 4)} Wh`, `Ah = Wh ÷ V = ${sig(WhNeed, 4)} ÷ ${V} = <strong>${sig(ah, 3)} Ah</strong>`])}</div>`;
      } else $('bn').innerHTML = '';
    }
    $el.querySelectorAll('input,select').forEach((x) => x.addEventListener(x.tagName === 'SELECT' ? 'change' : 'input', go));
    go();
  }

  const TABS = [{ key: 'virp', label: 'V I R P' }, { key: 'vdrop', label: 'Voltage drop' }, { key: 'combo', label: 'Series / parallel' }, { key: 'led', label: 'LED resistor' }, { key: 'bat', label: 'Battery' }];
  async function elec() {
    WT.setHeader('Electrical calculators', true);
    let tab = WT.store.get('elec.tab', 'virp');
    WT.$view.innerHTML = `${WT.chips(TABS, tab)}<div id="pane"></div>`;
    const $p = WT.$view.querySelector('#pane');
    async function render() {
      WT.$view.querySelectorAll(':scope > .chips .chip').forEach((b) => b.setAttribute('aria-selected', b.dataset.k === tab));
      await ({ virp, vdrop, combo, led, bat: battery })[tab]($p);
    }
    WT.$view.querySelector('.chips').addEventListener('click', (e) => { const b = e.target.closest('.chip'); if (!b) return; tab = b.dataset.k; WT.store.set('elec.tab', tab); render(); });
    await render();
  }
  WT.section('elec', { name: 'Electrical', desc: 'V I R P, voltage drop, LED, battery' }, elec);
  WT.parseSI = parseSI; WT.si = si;
})();
