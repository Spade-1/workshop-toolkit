// Automotive / caravan solar: daily yield from a panel with MPPT, heat loss and cable loss.
(function () {
  'use strict';
  const { esc, row } = WT;
  const sig = (n, p = 3) => (n == null || !isFinite(n) ? '–' : String(+(+n).toPrecision(p)));
  const work = (lines) => `<div class="work">${lines.map((l) => `<p>${l}</p>`).join('')}</div>`;
  const val = (el) => { const v = parseFloat(el.value); return isFinite(v) ? v : null; };
  const RHO = 0.0172;

  async function solar() {
    WT.setHeader('Solar (12 V)', true);
    const C = await WT.load('data/auto/cable.json');
    const S = await WT.load('data/auto/solar_psh.json');
    const cab = C.rows.filter((r) => r.au_mm2 && r.au_mm2 <= 21).map((r) => ({ id: r.bs, a: r.au_mm2, name: /auto/.test(r.au_sold_as) ? `${r.au_sold_as.replace(' auto', '').replace('mm', ' mm')} auto (${r.bs} B&S)` : `${r.bs} B&S` })).sort((x, y) => x.a - y.a);
    const st = WT.store.get('solar', { loc: 'Sydney', mon: 'y', w: '80', vmp: '18', psh: '4.65', amb: '30', rise: '25', coef: '-0.35', mppt: '95', len: '2.5', cab: '12', bv: '12', use: '' });
    WT.$view.innerHTML = `<p class="intro">Daily energy from a panel through an MPPT controller. Clean panel assumed. Change any default.</p>
      <form class="calc" onsubmit="return false">
      <div class="row2"><label>Panel rating (W)<input id="w" inputmode="decimal"></label><label>Panel Vmp (V)<input id="vmp" inputmode="decimal"></label></div>
      <div class="row2"><label>Location<select id="loc">${S.locations.map((l) => `<option>${esc(l.name)}</option>`).join('')}<option value="">Custom</option></select></label>
        <label>Month<select id="mon"><option value="y">Year average</option>${S.months.map((m, i) => `<option value="${i}">${m}</option>`).join('')}</select></label></div>
      <label>Peak sun hours per day (flat panel)<input id="psh" inputmode="decimal"></label>
      <p class="foot" id="pshn" style="margin:-6px 0 8px"></p>
      <div class="row2"><label>Air temp (°C)<input id="amb" inputmode="decimal"></label><label>Panel runs hotter by (°C)<input id="rise" inputmode="decimal"></label></div>
      <div class="row2"><label>Temp coefficient (%/°C)<input id="coef" inputmode="decimal"></label><label>MPPT efficiency (%)<input id="mppt" inputmode="decimal"></label></div>
      <div class="row2"><label>Panel cable, one way (m)<input id="len" inputmode="decimal"></label><label>Cable<select id="cab">${cab.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></label></div>
      <div class="row2"><label>Battery voltage<select id="bv"><option>12</option><option>24</option></select></label><label>Your daily use (Wh, optional)<input id="use" inputmode="decimal"></label></div>
      </form><div id="so"></div>
      <p class="foot">Panel heat: output falls by the temp coefficient for every °C the cells sit above 25 °C. A flat panel on a roof runs roughly 20–30 °C above air (rule of thumb, low confidence). Modern panels are about −0.30 to −0.36 %/°C. Flat roof panels lose about 10% more in winter versus tilted (ExplorOz) – many fitters add ~20% panel instead of tilting. MPPT controllers are 92–96% in real use (Victron quotes >98% peak). Shade on even part of a panel cuts output sharply.</p>`;
    const $ = (id) => WT.$view.querySelector('#' + id);
    Object.entries(st).forEach(([k, v]) => { if ($(k)) $(k).value = v; });
    function setPsh() {
      const l = S.locations.find((x) => x.name === $('loc').value);
      if (!l) { $('pshn').textContent = 'Custom value – type your own peak sun hours.'; return; }
      const mi = $('mon').value, v = mi === 'y' ? l.year : l.m[+mi];
      $('psh').value = v;
      $('amb').value = mi === 'y' ? sig(l.t.reduce((a, b) => a + b, 0) / 12) : l.t[+mi];
      $('pshn').innerHTML = `${esc(l.name)}, ${mi === 'y' ? 'year average' : S.months[+mi]}, flat panel. BOM ${esc(l.station)} (<a href="${esc(l.url)}" target="_blank" rel="noopener">source</a>, high confidence). Lowest month ${Math.min(...l.m)} h, highest ${Math.max(...l.m)} h. Air temp = BOM mean daily max for that month (medium confidence).`;
    }
    function monthly(kRest, W, bv, use, coef, rise) {
      const l = S.locations.find((x) => x.name === $('loc').value);
      if (!l) return '';
      const mi = $('mon').value;
      return `<h3 class="sub">${esc(l.name)} by month <small>(each month at its own sun hours and air temp)</small></h3>
        <table class="tbl"><thead><tr><th>Month</th><th>Sun h</th><th>Air °C</th><th>Wh/day</th><th>Ah/day</th>${use ? '<th>vs use</th>' : ''}</tr></thead><tbody>
        ${l.m.map((h, i) => { const kTm = Math.max(0, 1 + (coef / 100) * (l.t[i] + rise - 25)), wh = W * h * kTm * kRest; return `<tr${String(i) === mi ? ' class="near"' : ''}><td>${S.months[i]}</td><td>${h}</td><td>${l.t[i]}</td><td>${Math.round(wh)}</td><td>${sig(wh / bv)}</td>${use ? `<td class="${wh >= use ? 'ok' : 'bad'}">${wh >= use ? '+' : ''}${Math.round(wh - use)}</td>` : ''}</tr>`; }).join('')}</tbody></table>`;
    }
    function go() {
      Object.keys(st).forEach((k) => (st[k] = $(k).value)); WT.store.set('solar', st);
      const W = val($('w')), vmp = val($('vmp')), psh = val($('psh')), amb = val($('amb')) ?? 30, rise = val($('rise')) ?? 25, coef = val($('coef')) ?? -0.35, mppt = (val($('mppt')) || 95) / 100, L = val($('len')) || 0, bv = +st.bv, use = val($('use'));
      if (!W || !vmp || !psh) { $('so').innerHTML = ''; return; }
      const cell = amb + rise, kT = Math.max(0, 1 + (coef / 100) * (cell - 25));
      const c = cab.find((x) => x.id === st.cab) || cab[0];
      const Pt = W * kT, I = Pt / vmp, R = (RHO * 2 * L) / c.a, Ploss = I * I * R, kC = Math.max(0, 1 - Ploss / Pt);
      const Wh = W * psh * kT * kC * mppt, Ah = Wh / bv, avg = Wh / 24;
      const lines = [`Heat: cells = ${sig(amb)} + ${sig(rise)} = ${sig(cell)} °C`, `= 1 ${coef < 0 ? '−' : '+'} ${sig(Math.abs(coef))}% × (${sig(cell)} − 25) = ×${sig(kT, 3)}`,
        `Cable: I = ${sig(Pt)} W ÷ ${sig(vmp)} V = ${sig(I)} A, R = 0.0172 × 2 × ${sig(L)} ÷ ${c.a} = ${sig(R, 3)} Ω`, `loss = I²R = ${sig(Ploss)} W (${sig((Ploss / Pt) * 100, 2)}%) → ×${sig(kC, 4)}`,
        `Wh/day = ${sig(W)} W × ${sig(psh)} h × ${sig(kT, 3)} × ${sig(kC, 4)} × ${sig(mppt * 100)}%`, `= <strong>${sig(Wh)} Wh</strong> = ${sig(Ah)} Ah at ${bv} V`];
      let bal = '';
      if (use) { const net = Wh - use; bal = row('Against your use', `<span class="${net >= 0 ? 'ok' : 'bad'}">${net >= 0 ? '+' : ''}${sig(net)} Wh/day</span> <small>${net >= 0 ? 'covered' : `need about ${sig((use / (Wh / W)), 3)} W of panel`}</small>`); }
      $('so').innerHTML = `<div class="out">${row('Per day', `<b class="acc">${sig(Wh)} Wh · ${sig(Ah)} Ah</b>`, 'hl')}${row('Average over 24 h', `${sig(avg)} W`)}
        ${row('Midday peak (approx)', `${sig(Pt * kC * mppt)} W · ${sig((Pt * kC * mppt) / bv)} A into battery`)}${row('Heat loss', `${sig((1 - kT) * 100, 3)}%`)}${row('Cable loss', `${sig((1 - kC) * 100, 2)}%`)}${bal}</div>
        <div class="card solve"><div class="solve-h"><b>Working</b></div>${work(lines)}</div>${monthly(kC * mppt, W, bv, use, coef, rise)}`;
      WT.store.set('solar.last', { wh: Math.round(Wh), label: `${sig(W)} W, ${$('loc').value || 'custom'} ${$('mon').value === 'y' ? 'year avg' : S.months[+$('mon').value]}` });
    }
    WT.$view.querySelectorAll('input,select').forEach((x) => x.addEventListener(x.tagName === 'SELECT' ? 'change' : 'input', go));
    ['loc', 'mon'].forEach((k) => $(k).addEventListener('change', () => { setPsh(); go(); }));
    $('psh').addEventListener('input', () => { if ($('loc').value) { $('loc').value = ''; setPsh(); go(); } });
    if (st.loc) setPsh(); else $('pshn').textContent = 'Custom value – type your own peak sun hours.';
    go();
  }
  WT.section('solar', { name: 'Solar (12 V)', desc: 'Panel yield per day, heat and cable loss' }, solar);
})();
