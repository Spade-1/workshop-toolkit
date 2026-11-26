// Workshop Toolkit – home screen + router. Sections register themselves in js/views/*.js.
(function () {
  'use strict';
  const ORDER = ['common', 'taps', 'drillcheck', 'convert', 'welding', 'auto'];

  function home() {
    WT.setHeader('Workshop Toolkit', false);
    const tiles = ORDER.map((id) => WT.tiles.find((t) => t.id === id)).filter(Boolean);
    WT.$view.innerHTML = `<div class="tiles">${tiles.map((t) => `
      <a class="tile" href="#${t.id}"><span class="tile-name">${t.name}</span><span class="tile-desc">${t.desc}</span></a>`).join('')}</div>
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
