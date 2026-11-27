// Workshop Toolkit – home screen + router. Sections register themselves in js/views/*.js.
(function () {
  'use strict';
  const GROUPS = [
    { name: 'Threads & fasteners', ids: ['taps', 'drillcheck', 'fasteners'] },
    { name: 'Workshop', ids: ['welding', 'convert', 'metal'] },
    { name: 'Calculators', ids: ['elec', 'trig', 'area'] },
    { name: 'Automotive', ids: ['auto', 'autoelec', 'solar', 'tyres'] },
    { name: 'Residential', ids: ['reselec'], soon: [['Residential construction', 'Timber, spans, fixings']] },
  ];
  // extra search words per section (tabs and common terms)
  const KW = {
    taps: 'tap drill thread metric fine unc unf bsw bsf bsp pipe clearance hole common m3 m4 m5 m6 m8 m10 m12 spanner allen forming',
    drillcheck: 'thread percent engagement drill check material',
    fasteners: 'bolt torque grade 8.8 10.9 12.9 stainless a2 a4 strength kg shear pull imperial sae nut',
    welding: 'mig tig stick razor unimig wire speed volts gas tungsten fault porosity',
    convert: 'drill chart number letter fraction inch mm distance mile nautical area hectare acre weight kg lb ounce cooking cup tablespoon oven gas mark torque pressure psi bar kpa temperature',
    metal: 'steel aluminium weight kg per metre shs rhs chs angle flat bar sheet plate drill speed rpm feed',
    elec: 'ohm law virp voltage current resistance power watts voltage drop series parallel capacitor led resistor battery runtime amp hour colour code bands',
    trig: 'triangle right angle sine cosine pythagoras equilateral isosceles slope fall gradient degrees percent bolt circle pcd',
    area: 'area volume rectangle circle triangle trapezoid ring washer sector oval box slab cylinder post hole cone sphere concrete bags litres',
    auto: 'torque specs wheel nuts spark plugs landcruiser lc200 hilux rav4 celica mr2',
    autoelec: 'auto cable b&s awg amps fuse lug terminal derate',
    solar: 'solar panel mppt sun hours yield caravan 12v',
    tyres: 'tyre tire size speedo load index speed rating fitment stud pattern pcd centre bore offset',
    reselec: 'house mains 230 tps twin earth cable rating breaker circuit conduit fill',
  };

  function home() {
    WT.setHeader('Workshop Toolkit', false);
    const favs = () => WT.store.get('favs', []);
    const tile = (t) => `<div class="tile-w"><a class="tile" href="#${t.id}"><span class="tile-name">${t.name}</span><span class="tile-desc">${t.desc}</span></a>
      <button class="fav${favs().includes(t.id) ? ' on' : ''}" data-fav="${t.id}" aria-label="${favs().includes(t.id) ? 'Remove from' : 'Add to'} favourites">${favs().includes(t.id) ? '★' : '☆'}</button></div>`;
    WT.$view.innerHTML = `<input id="hs" class="search" type="search" placeholder="Search tools – e.g. fuse, M8, concrete, cup" autocomplete="off"><div id="hb"></div>`;
    const $b = WT.$view.querySelector('#hb'), $s = WT.$view.querySelector('#hs');
    function render() {
      const q = $s.value.trim().toLowerCase();
      if (q) {
        const words = q.split(/\s+/);
        const hits = WT.tiles.filter((t) => { const hay = `${t.name} ${t.desc} ${KW[t.id] || ''}`.toLowerCase(); return words.every((w) => hay.includes(w)); });
        $b.innerHTML = hits.length ? `<h2 class="group">Results</h2><div class="tiles">${hits.map(tile).join('')}</div>` : '<p class="empty">Nothing matches – try a shorter word.</p>';
        return;
      }
      const fv = favs().map((id) => WT.tiles.find((t) => t.id === id)).filter(Boolean);
      $b.innerHTML = (fv.length ? `<h2 class="group">Favourites</h2><div class="tiles">${fv.map(tile).join('')}</div>` : '') + GROUPS.map((g) => {
        const tiles = (g.ids || []).map((id) => WT.tiles.find((t) => t.id === id)).filter(Boolean);
        const soon = (g.soon || []).map(([n, d]) => `<div class="tile-w"><div class="tile soon" aria-disabled="true"><span class="tile-name">${n}</span><span class="tile-desc">${d} · coming</span></div></div>`);
        return `<h2 class="group">${g.name}</h2><div class="tiles">${tiles.map(tile).join('')}${soon.join('')}</div>`;
      }).join('') + `
        <p class="foot">Tap ☆ to pin a tool to Favourites. Offline reference – verify critical work.</p>`;
    }
    $b.addEventListener('click', (e) => {
      const f = e.target.closest('[data-fav]'); if (!f) return;
      e.preventDefault();
      const id = f.dataset.fav, L = favs(); const i = L.indexOf(id);
      if (i >= 0) L.splice(i, 1); else L.push(id);
      WT.store.set('favs', L); render();
    });
    $s.addEventListener('input', render);
    render();
  }

  async function route() {
    const key = location.hash.replace(/^#/, '');
    const fn = WT.routes[key] || home;
    try { await fn(); } catch (err) {
      WT.$view.innerHTML = `<p class="empty">Couldn't load this section. ${WT.esc(err.message)}</p>`;
    }
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);
  route();

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
