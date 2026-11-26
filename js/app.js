// Workshop Toolkit – home screen + router. Sections register themselves in js/views/*.js.
(function () {
  'use strict';
  const GROUPS = [
    { name: 'Threads & fasteners', ids: ['taps', 'drillcheck', 'fasteners'] },
    { name: 'Workshop', ids: ['welding', 'convert'] },
    { name: 'Calculators', ids: ['elec', 'trig'], soon: [['Area & volume', 'Shapes, slabs, concrete']] },
    { name: 'Automotive', ids: ['auto', 'autoelec', 'tyres'] },
    { name: 'Residential', soon: [['Residential electrical', 'Cable ratings, voltage drop'], ['Residential construction', 'Timber, spans, fixings']] },
  ];

  function home() {
    WT.setHeader('Workshop Toolkit', false);
    const tile = (t) => `<a class="tile" href="#${t.id}"><span class="tile-name">${t.name}</span><span class="tile-desc">${t.desc}</span></a>`;
    WT.$view.innerHTML = GROUPS.map((g) => {
      const tiles = (g.ids || []).map((id) => WT.tiles.find((t) => t.id === id)).filter(Boolean);
      const soon = (g.soon || []).map(([n, d]) => `<div class="tile soon" aria-disabled="true"><span class="tile-name">${n}</span><span class="tile-desc">${d} · coming</span></div>`);
      return `<h2 class="group">${g.name}</h2><div class="tiles">${tiles.map(tile).join('')}${soon.join('')}</div>`;
    }).join('') + `
      <p class="foot">Offline reference. Thread data computed from ISO / ASME / BS standards; welding from Unimig data and your machine; cable chart from your Narva / Tycab compilation. Verify critical work.</p>`;
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
