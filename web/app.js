import { $, esc, fullName } from './format.js';
import { pairing } from './pairing.js';
import { defaultState, setPreference, equippedHours, tensionFor } from './state.js';
import { createPersistence } from './persist.js';
import { sheetHtml } from './cards.js';
import { renderChoose, initChoose, renderStrip } from './choose.js';
import { wearStatus, lifeEstimate } from './wear.js';
import { renderBank, initBank } from './bank.js';
import { renderMine, initMine } from './mine.js';
import { renderMap, initMap } from './map.js';
import { renderMethod } from './method.js';

const DATA = window.STRINGS_DATA;
const ALL = DATA.strings;
const BY_ID = Object.fromEntries(ALL.map((r) => [r.id, r]));
const TABS = ['scegli', 'mappa', 'banco', 'montata', 'metodo'];
const RENDERERS = { scegli: renderChoose, banco: renderBank, montata: renderMine, mappa: renderMap, metodo: renderMethod };
const safeStorage = () => { try { return window.localStorage; } catch { return null; } };

let state = defaultState(DATA.defaults);
let current = 'scegli', sheetId = null, persist = null, dirty = false;
const cache = new Map();
const dlg = $('#sheet');

const refsOf = (ids) => ids.filter((id) => BY_ID[id]).map((id) => ({ id, dims: BY_ID[id].derived.dims }));
function pairingOf(id) {
  if (!cache.has(id)) cache.set(id, pairing(BY_ID[id].derived.dims, refsOf(state.liked), refsOf(state.disliked), !state.liked.includes(id)));
  return cache.get(id);
}
const equippedRec = () => BY_ID[state.equipped.id];
const tenutaOf = (id) => (BY_ID[id] ? BY_ID[id].derived.dims.durability : null);
const lifeFor = (r) => lifeEstimate(tenutaOf(r.id), state.lives, r.id, tenutaOf);
const wear = () => wearStatus({ state, tenuta: tenutaOf(state.equipped.id), tenutaOf, now: new Date() });
function cardCtx(r, extra = {}) {
  return { pairing: pairingOf(r.id), pref: state.liked.includes(r.id) ? 'liked' : state.disliked.includes(r.id) ? 'disliked' : null,
    equipped: equippedRec(), tension: tensionFor(r, equippedRec(), state.equipped.kg), isEquipped: r.id === state.equipped.id, life: lifeFor(r),
    nameOf: (id) => (BY_ID[id] ? fullName(BY_ID[id]) : id), ...extra };
}

const ctx = { DATA, ALL, BY_ID, state: () => state, pairingOf, equippedRec, cardCtx, hours: () => equippedHours(state), wear, tenutaOf,
  wearLabel: () => `usura: ${wear().band}`, persist: () => persist, persistMode: () => (persist ? persist.mode : 'pending'), warnings: [],
  update, openSheet, showTab, equip: (id) => { if (ctx.onEquip) ctx.onEquip(id); else showTab('montata'); } };

function renderAll() { (RENDERERS[current] || (() => {}))(ctx); renderStrip(ctx); } // la striscia sta in Scegli ma deve restare aggiornata ovunque
function update(fn) {
  state = fn(state); dirty = true; cache.clear();
  if (persist) persist.save(state);
  renderAll();
  if (dlg.open && sheetId) openSheet(sheetId);
}

function showTab(id) {
  if (!TABS.includes(id)) id = 'scegli';
  current = id;
  for (const t of TABS) { $('#' + t).hidden = t !== id; const b = $('#tab-' + t); if (b) b.setAttribute('aria-selected', String(t === id)); }
  try { localStorage.setItem('banco-corde:tab', id); } catch { /* archivio non disponibile */ }
  renderAll();
}
function goto(id) { if (dlg.open) dlg.close(); showTab(id); history.replaceState(null, '', '#' + id); scrollTo(0, 0); }

function openSheet(id) {
  const r = BY_ID[id]; if (!r) return;
  sheetId = id;
  $('#sheet-body').innerHTML = sheetHtml(r, cardCtx(r));
  if (!dlg.open) dlg.showModal();
  dlg.scrollTop = 0;
}
$('#sheet-close').addEventListener('click', () => dlg.close());
dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
dlg.addEventListener('close', () => { sheetId = null; });

document.addEventListener('click', (e) => {
  const t = e.target;
  const tab = t.closest('.tabs [data-tab]'); if (tab) { goto(tab.dataset.tab); return; }
  const g = t.closest('[data-goto]'); if (g) { goto(g.dataset.goto); return; }
  const mth = t.closest('[data-method]'); if (mth) { goto('metodo'); const el = document.getElementById('m-' + mth.dataset.method); if (el) el.scrollIntoView({ block: 'start' }); return; }
  const o = t.closest('[data-open]'); if (o) { openSheet(o.dataset.open); return; }
  const l = t.closest('[data-like]'); if (l) { const id = l.dataset.like; update((s) => setPreference(s, id, s.liked.includes(id) ? null : 'liked')); return; }
  const d = t.closest('[data-dislike]'); if (d) { const id = d.dataset.dislike; update((s) => setPreference(s, id, s.disliked.includes(id) ? null : 'disliked')); return; }
  const q = t.closest('[data-equip]'); if (q) { if (dlg.open) dlg.close(); ctx.equip(q.dataset.equip); }
});

initChoose(ctx);
initBank(ctx);
initMine(ctx);
initMap(ctx);
renderMethod(ctx);
$('#foot').innerHTML = `<p>Fonti: test Ektelon del tuo file, <a href="https://twu.tennis-warehouse.com/learning_center/reporter2.php" target="_blank" rel="noopener">TWU</a> (${esc(DATA.guide?.twu_ref || '51 lbs')}), <a href="https://www.racketpedia.com/" target="_blank" rel="noopener">Racketpedia</a> (solo rigidità statica gratuita), recensioni solo come link in ogni scheda.</p><p>${ALL.length} corde poly, calibri 1.18–1.30 mm. Aggiornato il ${esc(DATA.generated)}.</p>`;
const hashTab = (location.hash || '').slice(1);
showTab(TABS.includes(hashTab) ? hashTab : 'scegli');
window.addEventListener('hashchange', () => { const h = location.hash.slice(1); if (TABS.includes(h)) showTab(h); });

// Lo stato salvato arriva dopo il primo disegno (il db può metterci un po'): se l'utente ha già cambiato qualcosa, vale il suo.
(async () => {
  try {
    persist = await createPersistence({ claude: window.claude, storage: safeStorage(), defaults: DATA.defaults, knownIds: ALL.map((r) => r.id) });
    const loaded = await persist.load();
    ctx.warnings = loaded.warnings;
    if (!dirty) { state = loaded.state; cache.clear(); } else persist.save(state);
    renderAll();
  } finally { window.__bancoReady = true; }
})();
