// Area & volume: shapes with live drawings, fill any N, working shown. Volumes give litres, m³ and concrete bags.
(function () {
  'use strict';
  const G = WT.geo, { sig, T, svg, poly, rightMark } = G;
  const PI = Math.PI, D = PI / 180;
  const M3 = { mm: 1e-9, cm: 1e-6, m: 1, in: 1.6387064e-5, ft: 0.0283168466 };
  const M2 = { mm: 1e-6, cm: 1e-4, m: 1, in: 6.4516e-4, ft: 0.09290304 };
  const has = (k, gv, sv) => gv.has(k) || sv.has(k);
  const cl = (k, gv, sv) => (gv.has(k) ? 'g' : sv.has(k) ? 's' : 'u');
  const lb = (k, name, v, gv, sv, u) => (has(k, gv, sv) ? `${name} = ${sig(v[k], 4)} ${u}` : name);
  const clamp = (r, lo = 0.25, hi = 4) => Math.min(hi, Math.max(lo, r || 1));
  const cx = G.W / 2, cy = G.H / 2;
  const m2row = (a, unit) => ['In m²', `${sig(a * M2[unit], 4)} m²`];
  function volRows(V, unit) {
    const m3 = V * M3[unit];
    return [['In m³', `${sig(m3, 4)} m³`], ['Litres', `${sig(m3 * 1000, 4)} L`],
      ['Concrete, 20 kg premix bags', `≈ ${Math.ceil((m3 * 1.1) / 0.01)} bags <small>(+10% waste, 10 L per bag)</small>`]];
  }
  const CONC = 'Concrete: 20 kg premix yields about 10 L (≈100 bags per m³; brands range 8.4–11 L – check your bag). For more than about 0.5 m³, ready-mix is usually cheaper.';

  // ---------- Area shapes
  const RECT = {
    intro: 'Fill any two.', need: 2,
    fields: [{ k: 'L', name: 'Length', sub: '', kind: 'len' }, { k: 'W', name: 'Width', sub: '', kind: 'len' }, { k: 'Ar', name: 'Area', sub: '', kind: 'area' }],
    solve(g, unit) {
      let { L, W, Ar } = g; const w = [];
      if (L && W) { Ar = L * W; w.push('Area = L × W', `= ${sig(L)} × ${sig(W)} = {Ar}`); }
      else if (L) { W = Ar / L; w.push('W = Area ÷ L = {W}'); }
      else { L = Ar / W; w.push('L = Area ÷ W = {L}'); }
      return { v: { L, W, Ar }, w, extra: [m2row(Ar, unit), ['Perimeter', `${sig(2 * (L + W))} U`], ['Diagonal', `${sig(Math.hypot(L, W))} U`]] };
    },
    draw(v, gv, sv, u) {
      const r = clamp(v.L && v.W ? v.W / v.L : 0.6, 0.2, 1.2), w = 200, h = Math.min(130, 200 * r), x = cx - w / 2, y = cy - h / 2;
      return svg(`<rect x="${x}" y="${y}" width="${w}" height="${h}" class="geo-s"/>${T([cx, y + h + 18], lb('L', 'L', v, gv, sv, u), cl('L', gv, sv))}
        ${T([x - 8, cy], lb('W', 'W', v, gv, sv, u), cl('W', gv, sv), 'end')}${T([cx, cy], has('Ar', gv, sv) ? `Area ${sig(v.Ar, 4)} ${u}²` : 'Area', cl('Ar', gv, sv))}`, 'Rectangle');
    },
  };
  const CIRC = {
    intro: 'Fill any one.', need: 1,
    fields: [{ k: 'd', name: 'Diameter', sub: 'across', kind: 'len' }, { k: 'r', name: 'Radius', sub: 'centre to edge', kind: 'len' },
      { k: 'C', name: 'Circumference', sub: 'distance around', kind: 'len' }, { k: 'Ar', name: 'Area', sub: '', kind: 'area' }],
    solve(g, unit) {
      let r; const w = [];
      if (g.d) r = g.d / 2; if (g.r) r = g.r;
      if (g.C) { r = g.C / (2 * PI); w.push('r = C ÷ 2π = {r}'); }
      if (g.Ar) { r = Math.sqrt(g.Ar / PI); w.push('r = √(Area ÷ π) = {r}'); }
      const v = { r, d: 2 * r, C: 2 * PI * r, Ar: PI * r * r };
      if (!g.d) w.push('d = 2r = {d}'); if (!g.r && g.d) w.push('r = d ÷ 2 = {r}');
      if (!g.C) w.push('C = π × d', `= π × ${sig(v.d)} = {C}`);
      if (!g.Ar) w.push('Area = π × r²', `= π × ${sig(r)}² = {Ar}`);
      return { v, w, extra: [m2row(v.Ar, unit)] };
    },
    draw(v, gv, sv, u) {
      const R = 66;
      return svg(`<circle cx="${cx}" cy="${cy}" r="${R}" class="geo-s"/><line x1="${cx - R}" y1="${cy}" x2="${cx + R}" y2="${cy}" class="geo-d"/>
        <line x1="${cx}" y1="${cy}" x2="${cx + R * 0.7}" y2="${cy - R * 0.7}" class="geo-m"/>
        ${T([cx, cy + 16], lb('d', 'd', v, gv, sv, u), cl('d', gv, sv))}${T([cx + R * 0.45, cy - R * 0.5], lb('r', 'r', v, gv, sv, u), cl('r', gv, sv), 'start')}
        ${T([cx, cy + R + 18], has('C', gv, sv) ? `C = ${sig(v.C, 4)} ${u}` : 'C (around)', cl('C', gv, sv))}
        ${T([cx, cy - R - 10], has('Ar', gv, sv) ? `Area ${sig(v.Ar, 4)} ${u}²` : 'Area', cl('Ar', gv, sv))}`, 'Circle');
    },
  };
  const TRI = {
    intro: 'Any triangle: area = ½ × base × perpendicular height. Fill any two.', need: 2,
    fields: [{ k: 'b', name: 'Base', sub: '', kind: 'len' }, { k: 'h', name: 'Height', sub: 'square to the base', kind: 'len' }, { k: 'Ar', name: 'Area', sub: '', kind: 'area' }],
    solve(g, unit) {
      let { b, h, Ar } = g; const w = [];
      if (b && h) { Ar = (b * h) / 2; w.push('Area = ½ × b × h', `= ½ × ${sig(b)} × ${sig(h)} = {Ar}`); }
      else if (b) { h = (2 * Ar) / b; w.push('h = 2 × Area ÷ b = {h}'); } else { b = (2 * Ar) / h; w.push('b = 2 × Area ÷ h = {b}'); }
      return { v: { b, h, Ar }, w, extra: [m2row(Ar, unit)] };
    },
    draw(v, gv, sv, u) {
      const r = clamp(v.b && v.h ? v.h / v.b : 0.7, 0.25, 1.6);
      const P = G.fit([[0, 0], [1, 0], [0.35, r]]), foot = [P[2][0], P[0][1]], c0 = G.cen(P);
      return svg(`${poly(P)}<line x1="${P[2][0]}" y1="${P[2][1]}" x2="${foot[0]}" y2="${foot[1]}" class="geo-d"/>${rightMark(foot, P[1], P[2], 8)}
        ${T([(P[0][0] + P[1][0]) / 2, P[0][1] + 18], lb('b', 'b', v, gv, sv, u), cl('b', gv, sv))}
        ${T([foot[0] - 6, (P[2][1] + foot[1]) / 2], lb('h', 'h', v, gv, sv, u), cl('h', gv, sv), 'end')}
        ${T([c0[0] + 30, c0[1] + 8], has('Ar', gv, sv) ? `Area ${sig(v.Ar, 4)}` : 'Area', cl('Ar', gv, sv), 'start')}`, 'Triangle area');
    },
  };
  const TRAP = {
    intro: 'Two parallel sides a and b, height h between them. Fill any three.', need: 3,
    fields: [{ k: 'a', name: 'Top', sub: 'parallel side a', kind: 'len' }, { k: 'b', name: 'Bottom', sub: 'parallel side b', kind: 'len' },
      { k: 'h', name: 'Height', sub: 'between a and b', kind: 'len' }, { k: 'Ar', name: 'Area', sub: '', kind: 'area' }],
    solve(g, unit) {
      let { a, b, h, Ar } = g; const w = [];
      if (Ar == null) { Ar = ((a + b) / 2) * h; w.push('Area = (a + b) ÷ 2 × h', `= (${sig(a)} + ${sig(b)}) ÷ 2 × ${sig(h)} = {Ar}`); }
      else if (h == null) { h = (2 * Ar) / (a + b); w.push('h = 2 × Area ÷ (a + b) = {h}'); }
      else if (a == null) { a = (2 * Ar) / h - b; w.push('a = 2 × Area ÷ h − b = {a}'); }
      else { b = (2 * Ar) / h - a; w.push('b = 2 × Area ÷ h − a = {b}'); }
      if (a <= 0 || b <= 0) return { err: 'Those values give a negative side' };
      return { v: { a, b, h, Ar }, w, extra: [m2row(Ar, unit)] };
    },
    draw(v, gv, sv, u) {
      const ok = v.a && v.b && v.h, a = ok ? v.a : 2, b = ok ? v.b : 3.4, h = ok ? clamp(v.h / Math.max(a, b), 0.2, 1.2) * Math.max(a, b) : 1.6;
      const off = (b - a) / 2, P = G.fit([[0, 0], [b, 0], [off + a, h], [off, h]]);
      const ft = [P[3][0], P[0][1]];
      return svg(`${poly(P)}<line x1="${P[3][0]}" y1="${P[3][1]}" x2="${ft[0]}" y2="${ft[1]}" class="geo-d"/>
        ${T([(P[2][0] + P[3][0]) / 2, P[3][1] - 9], lb('a', 'a', v, gv, sv, u), cl('a', gv, sv))}${T([(P[0][0] + P[1][0]) / 2, P[0][1] + 18], lb('b', 'b', v, gv, sv, u), cl('b', gv, sv))}
        ${T([ft[0] + 6, (P[3][1] + ft[1]) / 2 + 4], lb('h', 'h', v, gv, sv, u), cl('h', gv, sv), 'start')}`, 'Trapezoid');
    },
  };
  const RING = {
    intro: 'Washer, pipe wall or ring path. Fill any two.', need: 2,
    fields: [{ k: 'D', name: 'Outside Ø', sub: 'outer diameter', kind: 'len' }, { k: 'd', name: 'Inside Ø', sub: 'hole diameter', kind: 'len' },
      { k: 't', name: 'Wall', sub: 'thickness', kind: 'len' }, { k: 'Ar', name: 'Area', sub: 'of the ring', kind: 'area' }],
    solve(g, unit) {
      let { D: Do, d, t, Ar } = g; const w = [];
      if (Do && d) {} else if (Do && t) { d = Do - 2 * t; w.push('d = D − 2t = {d}'); } else if (d && t) { Do = d + 2 * t; w.push('D = d + 2t = {D}'); }
      else if (Do && Ar) { d = Math.sqrt(Do * Do - (4 * Ar) / PI); w.push('d = √(D² − 4·Area ÷ π) = {d}'); }
      else if (d && Ar) { Do = Math.sqrt(d * d + (4 * Ar) / PI); w.push('D = √(d² + 4·Area ÷ π) = {D}'); }
      else { // t & Ar: Ar = π t (D - t)
        Do = Ar / (PI * t) + t; d = Do - 2 * t; w.push('D = Area ÷ (π·t) + t = {D}');
      }
      if (!(Do > d && d >= 0)) return { err: 'Outside must be bigger than inside' };
      t = (Do - d) / 2; Ar = (PI / 4) * (Do * Do - d * d);
      if (!g.Ar) w.push('Area = π ÷ 4 × (D² − d²)', `= π ÷ 4 × (${sig(Do)}² − ${sig(d)}²) = {Ar}`);
      if (!g.t) w.push('t = (D − d) ÷ 2 = {t}');
      return { v: { D: Do, d, t, Ar }, w, extra: [m2row(Ar, unit)] };
    },
    draw(v, gv, sv, u) {
      const R = 68, r = v.D && v.d ? Math.max(8, (R * v.d) / v.D) : 40;
      return svg(`<circle cx="${cx}" cy="${cy}" r="${R}" class="geo-s"/><circle cx="${cx}" cy="${cy}" r="${r}" class="geo-h"/>
        ${T([cx, cy - R - 10], lb('D', 'D', v, gv, sv, u), cl('D', gv, sv))}${T([cx, cy + 4], lb('d', 'd', v, gv, sv, u), cl('d', gv, sv))}
        ${T([cx + R + 8, cy], lb('t', 't', v, gv, sv, u), cl('t', gv, sv), 'start')}${T([cx, cy + R + 18], has('Ar', gv, sv) ? `Area ${sig(v.Ar, 4)} ${u}²` : 'Area', cl('Ar', gv, sv))}`, 'Ring');
    },
  };
  const SECT = {
    intro: 'A pie slice of a circle. Fill any two.', need: 2,
    fields: [{ k: 'r', name: 'Radius', sub: '', kind: 'len' }, { k: 'θ', name: 'Angle', sub: 'of the slice', kind: 'deg' },
      { k: 'L', name: 'Arc length', sub: 'curved edge', kind: 'len' }, { k: 'Ar', name: 'Area', sub: '', kind: 'area' }],
    solve(g, unit) {
      let r = g.r, th = g['θ'], L = g.L, Ar = g.Ar; const w = [];
      if (th != null && th > 360) return { err: 'Angle can’t be over 360°' };
      if (r && th) {} else if (r && L) { th = (L / r) / D; w.push('θ = L ÷ r (radians) = {θ}'); }
      else if (r && Ar) { th = ((2 * Ar) / (r * r)) / D; w.push('θ = 2·Area ÷ r² (radians) = {θ}'); }
      else if (th && L) { r = L / (th * D); w.push('r = L ÷ θ(rad) = {r}'); }
      else if (th && Ar) { r = Math.sqrt((2 * Ar) / (th * D)); w.push('r = √(2·Area ÷ θ(rad)) = {r}'); }
      else { th = ((L * L) / (2 * Ar)) / D; r = L / (th * D); w.push('θ = L² ÷ 2·Area (radians) = {θ}', 'r = L ÷ θ = {r}'); }
      if (th > 360) return { err: 'Those values need more than a full circle' };
      L = r * th * D; Ar = 0.5 * r * r * th * D;
      if (!g.L) w.push('L = r × θ × π ÷ 180', `= ${sig(r)} × ${sig(th)} × π ÷ 180 = {L}`);
      if (!g.Ar) w.push('Area = π r² × θ ÷ 360 = {Ar}');
      return { v: { r, 'θ': th, L, Ar }, w, extra: [m2row(Ar, unit), ['Chord (straight across)', `${sig(2 * r * Math.sin((th * D) / 2))} U`]] };
    },
    draw(v, gv, sv, u) {
      const th = v['θ'] && v.r ? Math.min(v['θ'], 359.9) : 70, R = 74, a0 = 90 - th / 2;
      const p = (a) => [cx + R * Math.cos(a * D), cy + 30 - R * Math.sin(a * D)];
      const s = p(a0), e = p(a0 + th), C0 = [cx, cy + 30];
      return svg(`<path d="M${C0} L${s} A${R} ${R} 0 ${th > 180 ? 1 : 0} 0 ${e} Z" class="geo-s"/>
        ${T([(C0[0] + s[0]) / 2 + 8, (C0[1] + s[1]) / 2 + 8], lb('r', 'r', v, gv, sv, u), cl('r', gv, sv), 'start')}
        ${T([cx, cy + 30 - R - 12], has('L', gv, sv) ? `L = ${sig(v.L, 4)} ${u}` : 'L (arc)', cl('L', gv, sv))}
        ${T([cx, cy + 30 + 20], has('θ', gv, sv) ? `θ = ${sig(v['θ'], 4)}°` : 'θ', cl('θ', gv, sv))}`, 'Sector');
    },
  };
  const ELL = {
    intro: 'Oval: a and b are the half-widths (semi-axes). Fill any two.', need: 2,
    fields: [{ k: 'a', name: 'Half-length', sub: 'semi-major axis', kind: 'len' }, { k: 'b', name: 'Half-width', sub: 'semi-minor axis', kind: 'len' }, { k: 'Ar', name: 'Area', sub: '', kind: 'area' }],
    solve(g, unit) {
      let { a, b, Ar } = g; const w = [];
      if (a && b) { Ar = PI * a * b; w.push('Area = π × a × b', `= π × ${sig(a)} × ${sig(b)} = {Ar}`); }
      else if (a) { b = Ar / (PI * a); w.push('b = Area ÷ (π a) = {b}'); } else { a = Ar / (PI * b); w.push('a = Area ÷ (π b) = {a}'); }
      const hh = ((a - b) / (a + b)) ** 2, per = PI * (a + b) * (1 + (3 * hh) / (10 + Math.sqrt(4 - 3 * hh)));
      return { v: { a, b, Ar }, w, extra: [m2row(Ar, unit), ['Perimeter (Ramanujan)', `${sig(per)} U`]] };
    },
    draw(v, gv, sv, u) {
      const rx = 100, ry = 100 * clamp(v.a && v.b ? v.b / v.a : 0.55, 0.15, 0.75);
      return svg(`<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" class="geo-s"/><line x1="${cx}" y1="${cy}" x2="${cx + rx}" y2="${cy}" class="geo-d"/><line x1="${cx}" y1="${cy}" x2="${cx}" y2="${cy - ry}" class="geo-d"/>
        ${T([cx + rx / 2, cy + 16], lb('a', 'a', v, gv, sv, u), cl('a', gv, sv))}${T([cx - 6, cy - ry / 2], lb('b', 'b', v, gv, sv, u), cl('b', gv, sv), 'end')}
        ${T([cx, cy + ry + 18], has('Ar', gv, sv) ? `Area ${sig(v.Ar, 4)} ${u}²` : 'Area', cl('Ar', gv, sv))}`, 'Ellipse');
    },
  };

  // ---------- Volumes
  function iso(x, y, z) { return [x * 0.87 - y * 0.87, -(x * 0.5 + y * 0.5) - z]; } // isometric
  const BOX = {
    intro: 'Box, slab or footing. Fill any three.', need: 3, pre: '',
    fields: [{ k: 'L', name: 'Length', sub: '', kind: 'len' }, { k: 'W', name: 'Width', sub: '', kind: 'len' }, { k: 'H', name: 'Depth / height', sub: '', kind: 'len' }, { k: 'V', name: 'Volume', sub: '', kind: 'vol' }],
    solve(g, unit) {
      let { L, W, H, V } = g; const w = [];
      if (V == null) { V = L * W * H; w.push('V = L × W × H', `= ${sig(L)} × ${sig(W)} × ${sig(H)} = {V}`); }
      else if (H == null) { H = V / (L * W); w.push('H = V ÷ (L × W) = {H}'); }
      else if (W == null) { W = V / (L * H); w.push('W = V ÷ (L × H) = {W}'); }
      else { L = V / (W * H); w.push('L = V ÷ (W × H) = {L}'); }
      return { v: { L, W, H, V }, w, extra: volRows(V, unit), note: CONC };
    },
    draw(v, gv, sv, u) {
      const ok = v.L && v.W && v.H, m = ok ? Math.max(v.L, v.W, v.H) : 1;
      const L = ok ? clamp(v.L / m, 0.15, 1) : 1, Wd = ok ? clamp(v.W / m, 0.15, 1) : 0.6, H = ok ? clamp(v.H / m, 0.08, 1) : 0.35;
      const pts = [[0, 0, 0], [L, 0, 0], [L, Wd, 0], [0, Wd, 0], [0, 0, H], [L, 0, H], [L, Wd, H], [0, Wd, H]].map(([x, y, z]) => iso(x, y, z));
      const P = G.fit(pts, 50), c0 = G.cen(P); const f = (i) => P[i].map((n) => n.toFixed(1)).join(',');
      const face = (ix) => `<polygon points="${ix.map(f).join(' ')}" class="geo-s"/>`;
      return svg(`${face([0, 1, 5, 4])}${face([1, 2, 6, 5])}${face([4, 5, 6, 7])}
        ${G.sideLbl(P[0], P[1], c0, lb('L', 'L', v, gv, sv, u), cl('L', gv, sv))}${G.sideLbl(P[1], P[2], c0, lb('W', 'W', v, gv, sv, u), cl('W', gv, sv))}
        ${G.sideLbl(P[0], P[4], c0, lb('H', 'H', v, gv, sv, u), cl('H', gv, sv))}
        ${T([G.W / 2, 16], has('V', gv, sv) ? `V = ${sig(v.V, 4)} ${u}³` : 'Volume', cl('V', gv, sv))}`, 'Box');
    },
  };
  const CYL = {
    intro: 'Cylinder, post hole, tank or pipe contents. Fill any two.', need: 2,
    fields: [{ k: 'd', name: 'Diameter', sub: 'inside, for contents', kind: 'len' }, { k: 'h', name: 'Height / depth', sub: 'or pipe length', kind: 'len' }, { k: 'V', name: 'Volume', sub: '', kind: 'vol' }],
    solve(g, unit) {
      let { d, h, V } = g; const w = [];
      if (V == null) { V = (PI / 4) * d * d * h; w.push('V = π ÷ 4 × d² × h', `= π ÷ 4 × ${sig(d)}² × ${sig(h)} = {V}`); }
      else if (h == null) { h = V / ((PI / 4) * d * d); w.push('h = V ÷ (π ÷ 4 × d²) = {h}'); }
      else { d = Math.sqrt((4 * V) / (PI * h)); w.push('d = √(4V ÷ (π h)) = {d}'); }
      return { v: { d, h, V }, w, extra: volRows(V, unit), note: CONC };
    },
    draw(v, gv, sv, u) {
      const r = v.d && v.h ? clamp(v.h / v.d, 0.3, 3) : 1.4, rx = r > 1.6 ? 38 : 62, ht = Math.min(120, rx * 2 * r * 0.75), ry = rx * 0.3, top = cy - ht / 2, bot = cy + ht / 2;
      return svg(`<path d="M${cx - rx} ${top} L${cx - rx} ${bot} A${rx} ${ry} 0 0 0 ${cx + rx} ${bot} L${cx + rx} ${top}" class="geo-s"/><ellipse cx="${cx}" cy="${top}" rx="${rx}" ry="${ry}" class="geo-s"/>
        <line x1="${cx - rx}" y1="${top}" x2="${cx + rx}" y2="${top}" class="geo-d"/>
        ${T([cx, top - ry - 8], lb('d', 'd', v, gv, sv, u), cl('d', gv, sv))}${T([cx + rx + 8, cy], lb('h', 'h', v, gv, sv, u), cl('h', gv, sv), 'start')}
        ${T([cx, bot + ry + 18], has('V', gv, sv) ? `V = ${sig(v.V, 4)} ${u}³` : 'Volume', cl('V', gv, sv))}`, 'Cylinder');
    },
  };
  const CONE = {
    intro: 'Cone or pile of material (⅓ of the cylinder). Fill any two.', need: 2,
    fields: [{ k: 'd', name: 'Base diameter', sub: '', kind: 'len' }, { k: 'h', name: 'Height', sub: '', kind: 'len' }, { k: 'V', name: 'Volume', sub: '', kind: 'vol' }],
    solve(g, unit) {
      let { d, h, V } = g; const w = [];
      if (V == null) { V = (PI / 12) * d * d * h; w.push('V = π ÷ 12 × d² × h', `= π ÷ 12 × ${sig(d)}² × ${sig(h)} = {V}`); }
      else if (h == null) { h = V / ((PI / 12) * d * d); w.push('h = 12V ÷ (π d²) = {h}'); }
      else { d = Math.sqrt((12 * V) / (PI * h)); w.push('d = √(12V ÷ (π h)) = {d}'); }
      return { v: { d, h, V }, w, extra: volRows(V, unit).slice(0, 2) };
    },
    draw(v, gv, sv, u) {
      const r = v.d && v.h ? clamp(v.h / v.d, 0.25, 2) : 0.8, rx = 70, ry = 20, ht = Math.min(125, 140 * r), bot = cy + ht / 2, top = bot - ht;
      return svg(`<path d="M${cx - rx} ${bot} L${cx} ${top} L${cx + rx} ${bot}" class="geo-s"/><ellipse cx="${cx}" cy="${bot}" rx="${rx}" ry="${ry}" class="geo-s"/>
        <line x1="${cx}" y1="${top}" x2="${cx}" y2="${bot}" class="geo-d"/>
        ${T([cx, bot + ry + 16], lb('d', 'd', v, gv, sv, u), cl('d', gv, sv))}${T([cx + 6, (top + bot) / 2], lb('h', 'h', v, gv, sv, u), cl('h', gv, sv), 'start')}
        ${T([cx, top - 8], has('V', gv, sv) ? `V = ${sig(v.V, 4)} ${u}³` : 'Volume', cl('V', gv, sv))}`, 'Cone');
    },
  };
  const SPH = {
    intro: 'Ball or round tank. Fill any one.', need: 1,
    fields: [{ k: 'd', name: 'Diameter', sub: '', kind: 'len' }, { k: 'V', name: 'Volume', sub: '', kind: 'vol' }, { k: 'S', name: 'Surface area', sub: '', kind: 'area' }],
    solve(g, unit) {
      let d; const w = [];
      if (g.d) d = g.d;
      if (g.V) { d = Math.cbrt((6 * g.V) / PI); w.push('d = ∛(6V ÷ π) = {d}'); }
      if (g.S) { d = Math.sqrt(g.S / PI); w.push('d = √(S ÷ π) = {d}'); }
      const v = { d, V: (PI / 6) * d ** 3, S: PI * d * d };
      if (!g.V) w.push('V = π ÷ 6 × d³', `= π ÷ 6 × ${sig(d)}³ = {V}`);
      if (!g.S) w.push('S = π × d² = {S}');
      return { v, w, extra: volRows(v.V, unit).slice(0, 2) };
    },
    draw(v, gv, sv, u) {
      const R = 66;
      return svg(`<circle cx="${cx}" cy="${cy}" r="${R}" class="geo-s"/><ellipse cx="${cx}" cy="${cy}" rx="${R}" ry="${R * 0.28}" class="geo-d"/>
        ${T([cx, cy - 8], lb('d', 'd', v, gv, sv, u), cl('d', gv, sv))}${T([cx, cy + R + 18], has('V', gv, sv) ? `V = ${sig(v.V, 4)} ${u}³` : 'Volume', cl('V', gv, sv))}`, 'Sphere');
    },
  };

  const AREA = [['rect', 'Rectangle', RECT], ['circ', 'Circle', CIRC], ['tri', 'Triangle', TRI], ['trap', 'Trapezoid', TRAP], ['ring', 'Ring / washer', RING], ['sect', 'Sector', SECT], ['ell', 'Oval', ELL]];
  const VOL = [['box', 'Box / slab', BOX], ['cyl', 'Cylinder / post hole', CYL], ['cone', 'Cone / pile', CONE], ['sph', 'Sphere', SPH]];

  async function area() {
    WT.setHeader('Area & volume', true);
    let mode = WT.store.get('av.mode', 'area');
    let shape = WT.store.get('av.shape.' + mode, mode === 'area' ? 'rect' : 'box');
    WT.$view.innerHTML = `${WT.chips([{ key: 'area', label: 'Area' }, { key: 'vol', label: 'Volume' }], mode)}<div id="shp"></div><div id="pane"></div>`;
    const $p = WT.$view.querySelector('#pane'), $s = WT.$view.querySelector('#shp');
    function render() {
      WT.$view.querySelectorAll(':scope > .chips .chip').forEach((b) => b.setAttribute('aria-selected', b.dataset.k === mode));
      const L = mode === 'area' ? AREA : VOL;
      if (!L.some(([k]) => k === shape)) shape = L[0][0];
      $s.innerHTML = WT.chips(L.map(([k, n]) => ({ key: k, label: n })), shape).replace('class="chips"', 'class="chips small"');
      G.solver($p, L.find(([k]) => k === shape)[2]);
    }
    WT.$view.querySelector(':scope > .chips').addEventListener('click', (e) => { const b = e.target.closest('.chip'); if (!b) return; mode = b.dataset.k; WT.store.set('av.mode', mode); shape = WT.store.get('av.shape.' + mode, ''); render(); });
    $s.addEventListener('click', (e) => { const b = e.target.closest('.chip'); if (!b) return; shape = b.dataset.k; WT.store.set('av.shape.' + mode, shape); render(); });
    render();
  }
  WT.section('area', { name: 'Area & volume', desc: 'Shapes, slabs, concrete bags' }, area);
})();
