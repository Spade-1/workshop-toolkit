// Geometry: Trig & angles (right, any, equilateral, isosceles triangles, slope, bolt circle) and Area & volume.
(function () {
  'use strict';
  const { esc, row } = WT;
  const D = Math.PI / 180;
  const sig = (n, p = 5) => (n == null || !isFinite(n) ? '–' : String(+(+n).toPrecision(p)));
  const num = (el) => { const v = parseFloat(el.value); return isFinite(v) && v > 0 ? v : null; };
  const work = (lines) => `<div class="work">${lines.map((l) => `<p>${l}</p>`).join('')}</div>`;
  const LU = ['mm', 'cm', 'm', 'in', 'ft'];

  // ---------- drawing helpers
  const W = 300, H = 200;
  function fit(pts, pad = 46) {
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const minx = Math.min(...xs), maxx = Math.max(...xs), miny = Math.min(...ys), maxy = Math.max(...ys);
    const w = maxx - minx || 1, h = maxy - miny || 1;
    const s = Math.min((W - 2 * pad) / w, (H - 2 * pad) / h);
    const ox = (W - w * s) / 2, oy = (H - h * s) / 2;
    return pts.map(([x, y]) => [ox + (x - minx) * s, H - oy - (y - miny) * s]);
  }
  const cen = (P) => [P.reduce((a, p) => a + p[0], 0) / P.length, P.reduce((a, p) => a + p[1], 0) / P.length];
  function push(p, from, d) { const dx = p[0] - from[0], dy = p[1] - from[1], L = Math.hypot(dx, dy) || 1; return [p[0] + (dx / L) * d, p[1] + (dy / L) * d]; }
  const T = (p, txt, cls, anchor = 'middle') => `<text x="${p[0].toFixed(1)}" y="${(p[1] + 4.5).toFixed(1)}" text-anchor="${anchor}" class="gl ${cls}">${txt}</text>`;
  const svg = (inner, title) => `<svg class="geo" viewBox="0 0 ${W} ${H}" role="img"><title>${esc(title)}</title>${inner}</svg>`;
  const anc = (q, c) => (q[0] < c[0] - 12 ? 'end' : q[0] > c[0] + 12 ? 'start' : 'middle');
  function sideLbl(p1, p2, c, txt, cls) {
    const m = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2], q = push(m, c, 10);
    const horiz = Math.abs(p1[1] - p2[1]) < Math.abs(p1[0] - p2[0]) * 0.35;
    if (horiz) return T([m[0], q[1] + (q[1] > m[1] ? 6 : -4)], txt, cls, 'middle');
    const q2 = push(m, c, 14), vert = Math.abs(p1[0] - p2[0]) < Math.abs(p1[1] - p2[1]) * 0.35;
    return T(vert ? q2 : [q2[0], q2[1] + Math.sign(q2[1] - m[1]) * 8], txt, cls, anc(q2, m));
  }
  function angLbl(p, c, txt, cls) { const q = push(p, c, 12); return T([q[0], q[1] + (q[1] > c[1] ? 5 : -2)], txt, cls, anc(q, c)); }
  const poly = (P) => `<polygon points="${P.map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' ')}" class="geo-s"/>`;
  function rightMark(p, a, b, s = 11) { // square at corner p toward a and b
    const u = (q) => { const dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy); return [dx / L * s, dy / L * s]; };
    const ua = u(a), ub = u(b);
    return `<polyline points="${p[0] + ua[0]},${p[1] + ua[1]} ${p[0] + ua[0] + ub[0]},${p[1] + ua[1] + ub[1]} ${p[0] + ub[0]},${p[1] + ub[1]}" class="geo-m"/>`;
  }

  // ---------- generic "fill any N" solver UI
  // cfg: { id, intro, fields:[{k,name,sub,kind:'len'|'deg'|'area'}], need, solve(g) -> {v:{}, w:[], err, note}, draw(v, given, solved, unit) }
  function solver($el, cfg) {
    let unit = WT.store.get('geo.unit', 'mm');
    $el.innerHTML = `<p class="intro">${cfg.intro}</p>${cfg.pre || ''}
      <div id="g_d"></div>
      <form class="calc gform" onsubmit="return false">
        ${cfg.fields.map((f) => `<div class="gf" id="f${f.k}"><label for="g${f.k}"><b>${f.k}</b> ${f.name}<small>${f.sub}</small></label>
          <div class="gi"><input id="g${f.k}" inputmode="decimal" autocomplete="off"><span class="gu" data-kind="${f.kind}"></span></div></div>`).join('')}
        <div class="vbar"><label class="inline">Units <select id="g_unit">${LU.map((u) => `<option${u === unit ? ' selected' : ''}>${u}</option>`).join('')}</select></label>
        <span id="g_h"></span><button type="button" class="btn" id="g_clr">Clear</button></div>
      </form><div id="g_o"></div>`;
    const $ = (id) => $el.querySelector('#' + id);
    const auto = new Set();
    const uLabel = () => $el.querySelectorAll('.gu').forEach((s) => (s.textContent = s.dataset.kind === 'deg' ? '°' : s.dataset.kind === 'area' ? unit + '²' : s.dataset.kind === 'vol' ? unit + '³' : unit));
    function go(e) {
      if (e && e.target && e.target.id && e.target.id[0] === 'g') auto.delete(e.target.id.slice(1));
      cfg.fields.forEach((f) => { if (auto.has(f.k)) $('g' + f.k).value = ''; $('f' + f.k).classList.remove('solved'); });
      auto.clear();
      const g = {};
      cfg.fields.forEach((f) => { const v = num($('g' + f.k)); if (v != null) g[f.k] = v; });
      const n = Object.keys(g).length;
      let res = null;
      if (n === cfg.need) res = cfg.solve(g, unit);
      const given = new Set(Object.keys(g)), solved = new Set();
      if (res && !res.err) {
        cfg.fields.forEach((f) => { if (!given.has(f.k) && res.v[f.k] != null && isFinite(res.v[f.k])) { $('g' + f.k).value = sig(res.v[f.k]); auto.add(f.k); solved.add(f.k); $('f' + f.k).classList.add('solved'); } });
      }
      $('g_d').innerHTML = cfg.draw(res && !res.err ? res.v : g, given, solved, unit);
      $('g_h').textContent = n < cfg.need ? `Fill any ${cfg.need}` : n > cfg.need ? `Only ${cfg.need} needed` : res && res.err ? '' : 'Solved';
      if (n !== cfg.need) { $('g_o').innerHTML = ''; return; }
      if (res.err) { $('g_o').innerHTML = `<div class="out">${row('Check', esc(res.err))}</div>`; return; }
      const u = (k) => { const f = cfg.fields.find((x) => x.k === k); return f ? (f.kind === 'deg' ? '°' : f.kind === 'area' ? ' ' + unit + '²' : f.kind === 'vol' ? ' ' + unit + '³' : ' ' + unit) : ''; };
      const lines = res.w.map((l) => l.replace(/\{(\w+)\}/g, (_, k) => sig(res.v[k]) + u(k)));
      $('g_o').innerHTML = `<div class="card solve"><div class="solve-h"><b>Working</b></div>${work(lines)}
        ${res.extra ? `<div class="out" style="padding:0;background:none;margin-top:6px">${res.extra.map(([a, b]) => row(a, b.replace(/\{(\w+)\}/g, (_, k) => sig(res.v[k]) + u(k)).replace(/\bU3\b/g, unit + '³').replace(/\bU2\b/g, unit + '²').replace(/\bU\b/g, unit))).join('')}</div>` : ''}
        ${res.note ? `<p class="foot">${res.note}</p>` : ''}</div>`;
    }
    cfg.fields.forEach((f) => $('g' + f.k).addEventListener('input', go));
    $('g_unit').addEventListener('change', () => { unit = $('g_unit').value; WT.store.set('geo.unit', unit); uLabel(); go(); });
    $('g_clr').addEventListener('click', () => { cfg.fields.forEach((f) => ($('g' + f.k).value = '')); auto.clear(); go(); });
    uLabel(); go();
  }
  const cls = (k, given, solved) => (given.has(k) ? 'g' : solved.has(k) ? 's' : 'u');
  const lab = (k, v, given, solved, suf) => (given.has(k) || solved.has(k) ? `${k} = ${sig(v[k], 4)}${suf}` : k);

  // ---------- Right-angled triangle
  const RIGHT = {
    intro: 'Fill any two (at least one side). Right angle is at C. <b>SOH CAH TOA</b>: sin = opp ÷ hyp, cos = adj ÷ hyp, tan = opp ÷ adj.',
    need: 2,
    fields: [
      { k: 'a', name: 'Side a', sub: 'upright, opposite A', kind: 'len' },
      { k: 'b', name: 'Side b', sub: 'base, opposite B', kind: 'len' },
      { k: 'c', name: 'Side c', sub: 'hypotenuse (longest)', kind: 'len' },
      { k: 'A', name: 'Angle A', sub: 'at the base', kind: 'deg' },
      { k: 'B', name: 'Angle B', sub: 'at the top', kind: 'deg' },
    ],
    solve(g) {
      let { a, b, c, A, B } = g; const w = [];
      if (A == null && B == null && [a, b, c].filter((x) => x != null).length < 2) return { err: 'Need at least one side' };
      if (A != null && B != null) return { err: 'Two angles fix the shape, not the size – give a side' };
      if ((A != null && A >= 90) || (B != null && B >= 90)) return { err: 'Angles A and B must be under 90°' };
      if (B != null) { A = 90 - B; w.push(`A = 90° − B = 90 − ${sig(B)} = {A}`); }
      if (a != null && b != null) { c = Math.hypot(a, b); A = Math.atan(a / b) / D; w.push('c = √(a² + b²) (Pythagoras)', `= √(${sig(a)}² + ${sig(b)}²) = {c}`, 'A = tan⁻¹(a ÷ b) – TOA', `= tan⁻¹(${sig(a)} ÷ ${sig(b)}) = {A}`); }
      else if (a != null && c != null) { if (c <= a) return { err: 'Hypotenuse c must be longer than a' }; b = Math.sqrt(c * c - a * a); A = Math.asin(a / c) / D; w.push('b = √(c² − a²)', `= √(${sig(c)}² − ${sig(a)}²) = {b}`, 'A = sin⁻¹(a ÷ c) – SOH', `= sin⁻¹(${sig(a)} ÷ ${sig(c)}) = {A}`); }
      else if (b != null && c != null) { if (c <= b) return { err: 'Hypotenuse c must be longer than b' }; a = Math.sqrt(c * c - b * b); A = Math.acos(b / c) / D; w.push('a = √(c² − b²)', `= √(${sig(c)}² − ${sig(b)}²) = {a}`, 'A = cos⁻¹(b ÷ c) – CAH', `= cos⁻¹(${sig(b)} ÷ ${sig(c)}) = {A}`); }
      else if (a != null) { const t = Math.tan(A * D); b = a / t; c = a / Math.sin(A * D); w.push('b = a ÷ tan A – TOA', `= ${sig(a)} ÷ tan ${sig(A)}° = {b}`, 'c = a ÷ sin A – SOH', `= ${sig(a)} ÷ sin ${sig(A)}° = {c}`); }
      else if (b != null) { a = b * Math.tan(A * D); c = b / Math.cos(A * D); w.push('a = b × tan A – TOA', `= ${sig(b)} × tan ${sig(A)}° = {a}`, 'c = b ÷ cos A – CAH', `= ${sig(b)} ÷ cos ${sig(A)}° = {c}`); }
      else if (c != null) { a = c * Math.sin(A * D); b = c * Math.cos(A * D); w.push('a = c × sin A – SOH', `= ${sig(c)} × sin ${sig(A)}° = {a}`, 'b = c × cos A – CAH', `= ${sig(c)} × cos ${sig(A)}° = {b}`); }
      if (g.B == null) { B = 90 - A; w.push(`B = 90° − A = {B}`); }
      return { v: { a, b, c, A, B, area: (a * b) / 2, per: a + b + c }, w, extra: [['Area', `${sig((a * b) / 2)} U2`], ['Perimeter', `${sig(a + b + c)} U`]] };
    },
    draw(v, given, solved, u) {
      const a = v.a || (v.c && v.A ? v.c * Math.sin(v.A * D) : 3), b = v.b || 4;
      const ok = v.a && v.b;
      const P = fit([[0, 0], [ok ? v.b : 4, 0], [0, ok ? v.a : 3]]); // C, A, B
      const c0 = cen(P);
      return svg(`${poly(P)}${rightMark(P[0], P[1], P[2])}
        ${sideLbl(P[0], P[2], c0, lab('a', v, given, solved, ' ' + u), cls('a', given, solved))}
        ${sideLbl(P[0], P[1], c0, lab('b', v, given, solved, ' ' + u), cls('b', given, solved))}
        ${sideLbl(P[1], P[2], c0, lab('c', v, given, solved, ' ' + u), cls('c', given, solved))}
        ${angLbl(P[1], c0, lab('A', v, given, solved, '°'), cls('A', given, solved), 34)}
        ${angLbl(P[2], c0, lab('B', v, given, solved, '°'), cls('B', given, solved), 30)}
        ${T(push(P[0], c0, 12), 'C', 'u')}`, 'Right-angled triangle');
    },
  };

  // ---------- Any triangle
  const ANY = {
    intro: 'Fill any three, including at least one side. Uses the sine rule (a ÷ sin A = b ÷ sin B) and cosine rule (a² = b² + c² − 2bc·cos A).',
    need: 3,
    fields: [
      { k: 'a', name: 'Side a', sub: 'opposite A', kind: 'len' }, { k: 'b', name: 'Side b', sub: 'opposite B', kind: 'len' }, { k: 'c', name: 'Side c', sub: 'opposite C', kind: 'len' },
      { k: 'A', name: 'Angle A', sub: '', kind: 'deg' }, { k: 'B', name: 'Angle B', sub: '', kind: 'deg' }, { k: 'C', name: 'Angle C', sub: '', kind: 'deg' },
    ],
    solve(g) {
      const s = { a: g.a, b: g.b, c: g.c }, A = { a: g.A, b: g.B, c: g.C }, U = { a: 'A', b: 'B', c: 'C' };
      const ks = ['a', 'b', 'c'], w = []; let note = '';
      const nS = ks.filter((k) => s[k] != null).length, nA = ks.filter((k) => A[k] != null).length;
      if (!nS) return { err: 'Need at least one side' };
      if (ks.reduce((t, k) => t + (A[k] || 0), 0) >= 180) return { err: 'Angles add to 180° or more' };
      const law = (k) => { const o = ks.filter((x) => x !== k); s[k] = Math.sqrt(s[o[0]] ** 2 + s[o[1]] ** 2 - 2 * s[o[0]] * s[o[1]] * Math.cos(A[k] * D)); w.push(`${k}² = ${o[0]}² + ${o[1]}² − 2·${o[0]}·${o[1]}·cos ${U[k]}`, `${k} = {${k}}`); };
      const angFromSides = (k) => { const o = ks.filter((x) => x !== k); A[k] = Math.acos((s[o[0]] ** 2 + s[o[1]] ** 2 - s[k] ** 2) / (2 * s[o[0]] * s[o[1]])) / D; w.push(`cos ${U[k]} = (${o[0]}² + ${o[1]}² − ${k}²) ÷ 2${o[0]}${o[1]} → ${U[k]} = {${U[k]}}`); };
      if (nA === 2) { const k = ks.find((x) => A[x] == null); A[k] = 180 - ks.filter((x) => x !== k).reduce((t, x) => t + A[x], 0); w.push(`${U[k]} = 180° − others = {${U[k]}}`); }
      if (ks.filter((k) => A[k] != null).length === 3) {
        const k0 = ks.find((k) => s[k] != null), r = s[k0] / Math.sin(A[k0] * D);
        w.push(`Sine rule: ${k0} ÷ sin ${U[k0]} = ${sig(r)}`);
        ks.forEach((k) => { if (s[k] == null) { s[k] = r * Math.sin(A[k] * D); w.push(`${k} = ${sig(r)} × sin ${U[k]} = {${k}}`); } });
      } else if (nS === 3) {
        if (s.a + s.b <= s.c || s.a + s.c <= s.b || s.b + s.c <= s.a) return { err: 'Those sides can’t close – each side must be shorter than the other two combined' };
        ks.forEach((k) => { if (A[k] == null) angFromSides(k); });
      } else if (nS === 2) {
        const m = ks.find((k) => s[k] == null);
        if (A[m] != null) { law(m); ks.forEach((k) => { if (A[k] == null) angFromSides(k); }); }
        else { // SSA
          const i = ks.find((k) => s[k] != null && A[k] != null); const j = ks.find((k) => k !== i && s[k] != null);
          const sj = (s[j] * Math.sin(A[i] * D)) / s[i];
          if (sj > 1) return { err: 'No triangle fits those values (side too short to reach)' };
          A[j] = Math.asin(sj) / D; w.push(`sin ${U[j]} = ${j}·sin ${U[i]} ÷ ${i} → ${U[j]} = {${U[j]}}`);
          const alt = 180 - A[j];
          if (alt + A[i] < 180 && Math.abs(alt - A[j]) > 1e-6) note = `Two triangles fit these values. Shown: ${U[j]} = ${sig(A[j], 4)}°. The other has ${U[j]} = ${sig(alt, 4)}°.`;
          A[m] = 180 - A[i] - A[j]; w.push(`${U[m]} = 180° − ${U[i]} − ${U[j]} = {${U[m]}}`);
          s[m] = (s[i] * Math.sin(A[m] * D)) / Math.sin(A[i] * D); w.push(`${m} = ${i}·sin ${U[m]} ÷ sin ${U[i]} = {${m}}`);
        }
      } else return { err: 'Need two sides, or one side and two angles' };
      const v = { a: s.a, b: s.b, c: s.c, A: A.a, B: A.b, C: A.c };
      const area = 0.5 * s.b * s.c * Math.sin(A.a * D);
      return { v, w, note, extra: [['Area', `${sig(area)} U2`], ['Perimeter', `${sig(s.a + s.b + s.c)} U`]] };
    },
    draw(v, given, solved, u) {
      const ok = v.b && v.c && v.A;
      const b = ok ? v.b : 4, c = ok ? v.c : 5, Aa = ok ? v.A : 50;
      const P = fit([[0, 0], [c, 0], [b * Math.cos(Aa * D), b * Math.sin(Aa * D)]]); // A, B, C
      const c0 = cen(P);
      return svg(`${poly(P)}
        ${sideLbl(P[1], P[2], c0, lab('a', v, given, solved, ' ' + u), cls('a', given, solved))}
        ${sideLbl(P[0], P[2], c0, lab('b', v, given, solved, ' ' + u), cls('b', given, solved))}
        ${sideLbl(P[0], P[1], c0, lab('c', v, given, solved, ' ' + u), cls('c', given, solved))}
        ${angLbl(P[0], c0, lab('A', v, given, solved, '°'), cls('A', given, solved), 32)}
        ${angLbl(P[1], c0, lab('B', v, given, solved, '°'), cls('B', given, solved), 32)}
        ${angLbl(P[2], c0, lab('C', v, given, solved, '°'), cls('C', given, solved), 28)}`, 'Triangle');
    },
  };

  // ---------- Equilateral
  const EQ = {
    intro: 'All three sides equal, all angles 60°. Fill any one.',
    need: 1,
    fields: [{ k: 's', name: 'Side', sub: 'each side', kind: 'len' }, { k: 'h', name: 'Height', sub: 'base to tip', kind: 'len' },
      { k: 'P', name: 'Perimeter', sub: '3 × side', kind: 'len' }, { k: 'Ar', name: 'Area', sub: '', kind: 'area' }],
    solve(g) {
      let s; const w = [];
      if (g.s) s = g.s;
      if (g.h) { s = (2 * g.h) / Math.sqrt(3); w.push('s = 2h ÷ √3 = {s}'); }
      if (g.P) { s = g.P / 3; w.push('s = P ÷ 3 = {s}'); }
      if (g.Ar) { s = Math.sqrt((4 * g.Ar) / Math.sqrt(3)); w.push('s = √(4 × Area ÷ √3) = {s}'); }
      const v = { s, h: (Math.sqrt(3) / 2) * s, P: 3 * s, Ar: (Math.sqrt(3) / 4) * s * s };
      if (!g.h) w.push('h = s × √3 ÷ 2 = {h}');
      if (!g.P) w.push('P = 3 × s = {P}');
      if (!g.Ar) w.push('Area = √3 ÷ 4 × s² = {Ar}');
      return { v, w };
    },
    draw(v, given, solved, u) {
      const P = fit([[0, 0], [2, 0], [1, Math.sqrt(3)]]); const c0 = cen(P);
      const mid = [(P[0][0] + P[1][0]) / 2, P[0][1]];
      const has = (k) => given.has(k) || solved.has(k);
      return svg(`${poly(P)}<line x1="${P[2][0]}" y1="${P[2][1]}" x2="${mid[0]}" y2="${mid[1]}" class="geo-d"/>${rightMark(mid, P[1], P[2], 8)}
        ${sideLbl(P[0], P[1], c0, has('s') ? `s = ${sig(v.s, 4)} ${u}` : 's', cls('s', given, solved))}
        ${T([mid[0] + 8, (P[2][1] + mid[1]) / 2], has('h') ? `h = ${sig(v.h, 4)} ${u}` : 'h', cls('h', given, solved), 'start')}
        ${angLbl(P[0], c0, '60°', 'g', 30)}${angLbl(P[1], c0, '60°', 'g', 30)}${angLbl(P[2], c0, '60°', 'g', 26)}`, 'Equilateral triangle');
    },
  };

  // ---------- Isosceles
  const ISO = {
    intro: 'Two equal legs. Fill any two.',
    need: 2,
    fields: [{ k: 'b', name: 'Base', sub: 'the odd side', kind: 'len' }, { k: 'l', name: 'Leg', sub: 'each equal side', kind: 'len' },
      { k: 'h', name: 'Height', sub: 'base to apex', kind: 'len' }, { k: 'θ', name: 'Apex angle', sub: 'at the top', kind: 'deg' }],
    solve(g) {
      let x, h; const w = []; const t = g['θ'];
      if (t != null && t >= 180) return { err: 'Apex angle must be under 180°' };
      if (g.b && g.l) { x = g.b / 2; if (g.l <= x) return { err: 'Legs must be longer than half the base' }; h = Math.sqrt(g.l ** 2 - x * x); w.push('h = √(l² − (b÷2)²) = {h}'); }
      else if (g.b && g.h) { x = g.b / 2; h = g.h; }
      else if (g.l && g.h) { if (g.l <= g.h) return { err: 'Leg must be longer than the height' }; h = g.h; x = Math.sqrt(g.l ** 2 - h * h); w.push('b = 2 × √(l² − h²) = {b}'); }
      else if (g.b && t) { x = g.b / 2; h = x / Math.tan((t / 2) * D); w.push('h = (b÷2) ÷ tan(θ÷2) = {h}'); }
      else if (g.l && t) { x = g.l * Math.sin((t / 2) * D); h = g.l * Math.cos((t / 2) * D); w.push('b = 2l × sin(θ÷2) = {b}', 'h = l × cos(θ÷2) = {h}'); }
      else if (g.h && t) { h = g.h; x = h * Math.tan((t / 2) * D); w.push('b = 2h × tan(θ÷2) = {b}'); }
      const v = { b: 2 * x, h, l: Math.hypot(x, h), 'θ': (2 * Math.atan(x / h)) / D };
      if (!g.l && !(g.l && t)) w.push('l = √((b÷2)² + h²) = {l}');
      if (t == null) w.push('θ = 2 × tan⁻¹((b÷2) ÷ h) = {θ}');
      v.base = 90 - v['θ'] / 2;
      return { v, w, extra: [['Base angles', `${sig(v.base, 4)}° each`], ['Area', `${sig(x * h)} U2`], ['Perimeter', `${sig(2 * v.l + 2 * x)} U`]] };
    },
    draw(v, given, solved, u) {
      const ok = v.b && v.h; const x = ok ? v.b / 2 : 2, h = ok ? v.h : 3;
      const P = fit([[0, 0], [2 * x, 0], [x, h]]); const c0 = cen(P); const mid = [(P[0][0] + P[1][0]) / 2, P[0][1]];
      const has = (k) => given.has(k) || solved.has(k);
      return svg(`${poly(P)}<line x1="${P[2][0]}" y1="${P[2][1]}" x2="${mid[0]}" y2="${mid[1]}" class="geo-d"/>
        ${sideLbl(P[0], P[1], c0, has('b') ? `b = ${sig(v.b, 4)} ${u}` : 'b', cls('b', given, solved))}
        ${sideLbl(P[1], P[2], c0, has('l') ? `l = ${sig(v.l, 4)} ${u}` : 'l', cls('l', given, solved))}
        ${T([mid[0] - 6, (P[2][1] + mid[1]) / 2 + 10], has('h') ? `h = ${sig(v.h, 4)}` : 'h', cls('h', given, solved), 'end')}
        ${T([P[2][0], P[2][1] - 12], has('θ') ? `θ = ${sig(v['θ'], 4)}°` : 'θ', cls('θ', given, solved))}`, 'Isosceles triangle');
    },
  };

  // ---------- Slope
  function slope($el) {
    $el.innerHTML = `<p class="intro">Type in any box – the rest convert. Add a run length to get the rise.</p><div id="sd"></div>
      <form class="calc gform" onsubmit="return false">
        <div class="gf"><label><b>°</b> Degrees<small>angle from flat</small></label><div class="gi"><input id="sdeg" inputmode="decimal"></div></div>
        <div class="gf"><label><b>%</b> Percent<small>rise ÷ run × 100</small></label><div class="gi"><input id="spct" inputmode="decimal"></div></div>
        <div class="gf"><label><b>1:n</b> Ratio<small>1 up for n along</small></label><div class="gi"><input id="srat" inputmode="decimal"></div></div>
        <div class="gf"><label><b>mm/m</b> Fall<small>mm per metre</small></label><div class="gi"><input id="smm" inputmode="decimal"></div></div>
        <div class="gf"><label><b>Run</b> Length along<small>horizontal, m</small></label><div class="gi"><input id="srun" inputmode="decimal"></div></div>
      </form><div id="so"></div>
      <p class="foot">Common: stormwater pipe 1:100 (1%) min · shower floor about 1:60 to 1:80 · wheelchair ramp 1:14 max (AS 1428.1) · roof pitch in degrees.</p>`;
    const $ = (id) => $el.querySelector('#' + id);
    let deg = WT.store.get('geo.slope', null);
    function show(from) {
      const t = Math.tan(deg * D);
      if (from !== 'sdeg') $('sdeg').value = deg == null ? '' : sig(deg, 4);
      if (from !== 'spct') $('spct').value = deg == null ? '' : sig(t * 100, 4);
      if (from !== 'srat') $('srat').value = deg == null ? '' : sig(1 / t, 4);
      if (from !== 'smm') $('smm').value = deg == null ? '' : sig(t * 1000, 4);
      const run = num($('srun'));
      const dd = deg == null ? 15 : Math.min(Math.max(deg, 10), 70);
      const P = fit([[0, 0], [1, 0], [1, Math.tan(dd * D)]]); const c0 = cen(P);
      $('sd').innerHTML = svg(`${poly(P)}${rightMark(P[1], P[0], P[2], 9)}${angLbl(P[0], c0, deg == null ? 'θ' : sig(deg, 3) + '°', deg == null ? 'u' : 's', 40)}
        ${sideLbl(P[0], P[1], c0, run ? `run ${sig(run)} m` : 'run', run ? 'g' : 'u')}${T([P[1][0] - 8, (P[1][1] + P[2][1]) / 2 - 6], run && deg != null ? `rise ${sig(run * t * 1000, 4)} mm` : 'rise', run && deg != null ? 's' : 'u', 'end')}`, 'Slope') + (deg != null && deg < 10 ? '<p class="foot" style="margin:-2px 0 6px;text-align:center">Drawing steepened to show – not to scale</p>' : '');
      $('so').innerHTML = deg == null ? '' : `<div class="card solve">${work([`% = tan θ × 100 = ${sig(t * 100, 4)}%`, `1:n → n = 1 ÷ tan θ = ${sig(1 / t, 4)}`, ...(run ? [`Rise = run × tan θ = ${sig(run)} × ${sig(t, 4)} = <strong>${sig(run * t, 4)} m (${sig(run * t * 1000, 4)} mm)</strong>`, `Sloped length = ${sig(run / Math.cos(deg * D), 5)} m`] : [])])}</div>`;
      WT.store.set('geo.slope', deg);
    }
    const from = {
      sdeg: (v) => v, spct: (v) => Math.atan(v / 100) / D, srat: (v) => Math.atan(1 / v) / D, smm: (v) => Math.atan(v / 1000) / D,
    };
    Object.keys(from).forEach((id) => $(id).addEventListener('input', () => { const v = num($(id)); deg = v == null || (id === 'sdeg' && v >= 90) ? null : from[id](v); show(id); }));
    $('srun').addEventListener('input', () => show('srun'));
    show();
  }

  // ---------- Bolt circle
  function bolt($el) {
    const st = WT.store.get('geo.bolt', { pcd: '100', n: '6', a0: '0' });
    $el.innerHTML = `<p class="intro">Hole positions on a pitch circle (PCD). Centre = 0,0. Angle 0° is 3 o’clock, counting anticlockwise.</p><div id="bd"></div>
      <form class="calc" onsubmit="return false"><div class="row2"><label>PCD (diameter)<input id="pcd" inputmode="decimal"></label><label>Holes<input id="n" inputmode="numeric"></label></div>
      <label>First hole angle (°)<input id="a0" inputmode="decimal"></label></form><div id="bo"></div>`;
    const $ = (id) => $el.querySelector('#' + id);
    Object.entries(st).forEach(([k, v]) => ($(k).value = v));
    function go() {
      WT.store.set('geo.bolt', { pcd: $('pcd').value, n: $('n').value, a0: $('a0').value });
      const pcd = num($('pcd')), n = Math.round(num($('n')) || 0), a0 = parseFloat($('a0').value) || 0;
      if (!pcd || n < 2 || n > 72) { $('bd').innerHTML = ''; $('bo').innerHTML = ''; return; }
      const r = pcd / 2, holes = [...Array(n)].map((_, i) => { const a = a0 + (360 / n) * i; return { i: i + 1, a, x: r * Math.cos(a * D), y: r * Math.sin(a * D) }; });
      const cx = W / 2, cy = H / 2, R = 72, hr = Math.max(4, Math.min(10, 90 / n));
      $('bd').innerHTML = svg(`<circle cx="${cx}" cy="${cy}" r="${R}" class="geo-d"/><line x1="${cx - 8}" y1="${cy}" x2="${cx + 8}" y2="${cy}" class="geo-m"/><line x1="${cx}" y1="${cy - 8}" x2="${cx}" y2="${cy + 8}" class="geo-m"/>
        ${holes.map((h) => { const px = cx + R * Math.cos(h.a * D), py = cy - R * Math.sin(h.a * D), lx = cx + (R + 16 + hr) * Math.cos(h.a * D), ly = cy - (R + 16 + hr) * Math.sin(h.a * D);
          return `<circle cx="${px}" cy="${py}" r="${hr}" class="geo-h"/>${n <= 24 ? T([lx, ly], h.i, h.i === 1 ? 's' : 'g') : ''}`; }).join('')}
        ${T([cx, cy + 22], `PCD ${sig(pcd)}`, 'u')}`, 'Bolt circle');
      const chord = pcd * Math.sin(Math.PI / n);
      $('bo').innerHTML = `<div class="out">${row('Hole to hole (straight)', `<b class="acc">${sig(chord, 5)}</b>`, 'hl')}${row('Angle between', `${sig(360 / n, 5)}°`)}</div>
        ${work([`Chord = PCD × sin(180° ÷ n) = ${sig(pcd)} × sin(${sig(180 / n, 4)}°) = ${sig(chord, 5)}`, 'X = r × cos(angle), Y = r × sin(angle)'])}
        <table class="tbl"><thead><tr><th>Hole</th><th>Angle</th><th>X</th><th>Y</th></tr></thead><tbody>
        ${holes.map((h) => `<tr><td>${h.i}</td><td>${sig(((h.a % 360) + 360) % 360, 5)}°</td><td>${sig(Math.abs(h.x) < 1e-9 ? 0 : h.x, 5)}</td><td>${sig(Math.abs(h.y) < 1e-9 ? 0 : h.y, 5)}</td></tr>`).join('')}</tbody></table>`;
    }
    ['pcd', 'n', 'a0'].forEach((k) => $(k).addEventListener('input', go)); go();
  }

  const TRIG_TABS = [{ key: 'right', label: 'Right angle' }, { key: 'any', label: 'Any triangle' }, { key: 'eq', label: 'Equilateral' }, { key: 'iso', label: 'Isosceles' }, { key: 'slope', label: 'Slope' }, { key: 'bolt', label: 'Bolt circle' }];
  async function trig() {
    WT.setHeader('Trig & angles', true);
    let tab = WT.store.get('geo.tab', 'right');
    WT.$view.innerHTML = `${WT.chips(TRIG_TABS, tab)}<div id="pane"></div>`;
    const $p = WT.$view.querySelector('#pane');
    function render() {
      WT.$view.querySelectorAll(':scope > .chips .chip').forEach((b) => b.setAttribute('aria-selected', b.dataset.k === tab));
      ({ right: () => solver($p, RIGHT), any: () => solver($p, ANY), eq: () => solver($p, EQ), iso: () => solver($p, ISO), slope: () => slope($p), bolt: () => bolt($p) })[tab]();
    }
    WT.$view.querySelector('.chips').addEventListener('click', (e) => { const b = e.target.closest('.chip'); if (!b) return; tab = b.dataset.k; WT.store.set('geo.tab', tab); render(); });
    render();
  }
  WT.section('trig', { name: 'Trig & angles', desc: 'Triangles, slope, bolt circle' }, trig);
  WT.geo = { fit, cen, push, T, svg, poly, sideLbl, angLbl, rightMark, solver, sig, W, H };
})();
