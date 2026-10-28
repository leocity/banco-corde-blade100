// Avvio: tre schermate (spec §4.1), corda attuale, provenienza. Le schermate stanno in home.js, compare.js, explore.js.
import { $, $$, DATA, ALL, esc, store } from './format.js';
import { initProv } from './prov.js';
import { renderCurrentPicker } from './current.js';

const TABS = ['casa', 'confronta', 'esplora'];
const OLD_TABS = { perte: 'casa', mappa: 'esplora', guida: 'esplora' }; // link della v2
const screens = {
  casa: () => (typeof renderHome === 'function' ? renderHome() : null),
  confronta: () => (typeof renderCompare === 'function' ? renderCompare() : null),
  esplora: () => (typeof renderExplore === 'function' ? renderExplore() : null),
};

function showTab(id) {
  id = OLD_TABS[id] || id;
  if (!TABS.includes(id)) id = 'casa';
  for (const t of TABS) { $('#' + t).hidden = t !== id; $('#tab-' + t).setAttribute('aria-selected', String(t === id)); }
  store.set('tab', id);
  screens[id]();
}
function goTab(id) { showTab(id); history.replaceState(null, '', '#' + id); scrollTo(0, 0); }

$$('.tabs button').forEach((b) => b.addEventListener('click', () => goTab(b.dataset.tab)));
$('#open-how').addEventListener('click', () => {
  goTab('esplora');
  const how = document.getElementById('come-leggere');
  if (how) { how.open = true; how.scrollIntoView({ block: 'start' }); }
});
document.addEventListener('click', (e) => {
  const o = e.target.closest('[data-open]');
  if (o && typeof openSheet === 'function') { openSheet(o.dataset.open); return; }
  const c = e.target.closest('[data-compare]');
  if (c && typeof addToCompare === 'function') { addToCompare(c.dataset.compare); goTab('confronta'); }
});
document.addEventListener('current-change', () => { for (const t of TABS) if (!$('#' + t).hidden) screens[t](); });

initProv();
renderCurrentPicker($('#current'));
$('#foot').innerHTML = `<p>Fonti: test Ektelon del tuo file, <a href="https://twu.tennis-warehouse.com/learning_center/reporter2.php" target="_blank" rel="noopener">TWU</a>, <a href="https://www.racketpedia.com/" target="_blank" rel="noopener">Racketpedia</a> (rigidità statica gratuita). Recensioni solo come link nelle schede.</p><p>${ALL.length} corde poly, calibri 1.18–1.30 mm. Aggiornato il ${esc(DATA.generated)}.</p>`;
showTab((location.hash || '').slice(1) || store.get('tab', 'casa'));
addEventListener('hashchange', () => showTab(location.hash.slice(1)));
