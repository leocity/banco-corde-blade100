import { $, fullName } from './format.js';
import { defaultState, setPreference, sameState, addStock } from './state.js';
import { createPersistence } from './persist.js';
import { initTips } from './tip.js';
import { renderToday, initToday } from './today.js';
import { renderNext, initNext } from './nextui.js';
import { renderHybrid, initHybrid } from './hybrid.js';
import { renderScience, initScience } from './science.js';
import { sheetHtml, compareHtml } from './sheet.js';
import { askBoxHtml, initAsk } from './ask.js';

const DATA = window.STRINGS_DATA;
const ALL = DATA.strings;
const BY_ID = Object.fromEntries(ALL.map((r) => [r.id, r]));
const META = DATA.lab_meta || {};
const TABS = ['oggi', 'prossima', 'scienza'];
const safeStorage = () => { try { return window.localStorage; } catch { return null; } };

let state = defaultState(DATA.defaults);
let epoch = 0; // sale quando lo stato arriva dal server: un annulla di un'epoca vecchia non vale più
let current = 'oggi', sheetId = null, cmpId = null, persist = null, loaded = false;
let pendingFns = []; // modifiche fatte prima che lo stato salvato arrivi: si rieseguono sopra di esso
const sheet = $('#sheet'), cmpDlg = $('#cmp-dialog');

const ctx = { DATA, ALL, BY_ID, META, state: () => state, equippedRec: () => BY_ID[state.equipped.id], persist: () => persist, downloads: null,
  update, openSheet, openCompare, goto, toast, askBox: (id) => askBoxHtml(id), epoch: () => epoch, loaded: () => loaded,
  refresh: () => { renderAll(); if (sheet.open && sheetId) openSheet(sheetId); },
  equip: (id) => { if (ctx.onEquip) whenDialogsClosed(() => ctx.onEquip(id)); } };

// ---------- stato e salvataggio ----------
const SYNC_TEXT = { sync: ['●', 'Sincronizzato', 'ok'], local: ['○', 'Solo su questo browser', 'local'], error: ['⚠', 'Errore di salvataggio', 'err'] };
function renderSyncBadge() {
  const b = $('#sync-badge'), t = SYNC_TEXT[persist ? persist.status : 'pending'];
  b.innerHTML = t ? `<span class="dot" aria-hidden="true">${t[0]}</span> <span class="t">${t[1]}</span>` : '';
  b.className = `sync ${t ? t[2] : ''}`; b.title = persist && persist.lastError ? persist.lastError : (t ? t[1] : '');
}
function renderAll() {
  if (current === 'oggi') renderToday(ctx);
  if (current === 'prossima') { renderNext(ctx); renderHybrid(ctx); const a = $('#ask-main'); if (a) a.innerHTML = askBoxHtml(''); }
  if (current === 'scienza') renderScience(ctx);
}
function update(fn) {
  hideToast();
  state = fn(state);
  if (!loaded) pendingFns.push(fn);
  else if (persist) persist.save(state).then(renderSyncBadge);
  renderAll();
  if (sheet.open && sheetId) openSheet(sheetId);
  if (cmpDlg.open && cmpId) openCompare(cmpId);
}

// ---------- avvisi brevi con «Annulla» ----------
let toastTimer = null;
function hideToast() { const t = $('#toast'); t.hidden = true; clearTimeout(toastTimer); }
function toast(msg, onUndo) {
  const t = $('#toast');
  if (!loaded) onUndo = null; // prima che arrivi lo stato salvato non si offre nessun annulla
  t.innerHTML = `<span>${msg.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))}</span>${onUndo ? '<button type="button" class="btn" id="toast-undo">Annulla</button>' : ''}`;
  t.hidden = false;
  if (onUndo) $('#toast-undo').onclick = () => { hideToast(); onUndo(); };
  clearTimeout(toastTimer); toastTimer = setTimeout(hideToast, onUndo ? 8000 : 4000);
}

// ---------- schede e cronologia (il tasto Indietro chiude i dialoghi, poi torna alla schermata precedente) ----------
function showTab(id) {
  if (!TABS.includes(id)) id = 'oggi';
  current = id;
  for (const t of TABS) { $('#' + t).hidden = t !== id; const b = $('#tab-' + t); if (b) { b.setAttribute('aria-selected', String(t === id)); b.tabIndex = t === id ? 0 : -1; } }
  renderAll();
}
const dlgStack = [];
let ignorePop = 0, skipBack = 0, afterPop = [];
const lastFocus = new Map();
let lastClicked = null; // alcuni browser non danno il focus ai bottoni toccati: si ricorda l'ultimo toccato
document.addEventListener('click', (e) => { const b = e.target.closest('button, a, summary'); if (b) lastClicked = b; }, true);
const nativeShowModal = HTMLDialogElement.prototype.showModal;
HTMLDialogElement.prototype.showModal = function showModalTracked() {
  const a = document.activeElement;
  lastFocus.set(this, a && a !== document.body && !this.contains(a) ? a : lastClicked);
  nativeShowModal.call(this); dlgStack.push(this); history.pushState({ dlg: true }, '');
};
document.addEventListener('close', (e) => {
  const i = dlgStack.indexOf(e.target); if (i < 0) return;
  dlgStack.splice(i, 1);
  const f = lastFocus.get(e.target); lastFocus.delete(e.target);
  const refocus = () => { if (f && document.contains(f) && !dlgStack.some((d) => d.open)) f.focus(); }; // il focus torna a chi ha aperto il dialogo
  refocus();
  if (skipBack > 0) { skipBack -= 1; return; }
  afterPop.push(() => setTimeout(refocus, 0)); // tornare indietro nella cronologia toglie il focus: lo si rimette dopo
  ignorePop += 1; history.back();
}, true);
window.addEventListener('popstate', () => {
  if (ignorePop > 0) { ignorePop -= 1; const fns = afterPop; afterPop = []; fns.forEach((f) => f()); return; }
  const top = dlgStack[dlgStack.length - 1];
  if (top && top.open) { skipBack += 1; top.close(); return; }
  const h = location.hash.slice(1); showTab(TABS.includes(h) ? h : 'oggi');
});
function whenDialogsClosed(fn) {
  const open = dlgStack.filter((d) => d.open);
  if (!open.length) { fn(); return; }
  afterPop.push(fn);
  open.forEach((d) => d.close());
}
function goto(id) {
  whenDialogsClosed(() => {
    showTab(id);
    if (location.hash !== `#${id}`) history.pushState(null, '', `#${id}`);
    window.scrollTo(0, 0);
  });
}
function openSheet(id) {
  const r = BY_ID[id]; if (!r) return;
  sheetId = id;
  $('#sheet-body').innerHTML = sheetHtml(r, ctx);
  if (!sheet.open) { sheet.showModal(); sheet.scrollTop = 0; $('#sheet-close').focus(); }
}
function openCompare(id) {
  const r = BY_ID[id], ref = BY_ID[state.equipped.id]; if (!r || !ref) return;
  cmpId = id;
  $('#cmp-title').textContent = `${r.model} contro la tua ${ref.model}`;
  $('#cmp-body').innerHTML = `<p class="muted small">${fullName(ref)} (montata) → ${fullName(r)}</p>${compareHtml(r, ref, META)}`;
  $('#cmp-open').dataset.open = id;
  if (!cmpDlg.open) { cmpDlg.showModal(); $('#cmp-close').focus(); }
}
for (const [d, btn] of [[sheet, '#sheet-close'], [cmpDlg, '#cmp-close']]) {
  $(btn).addEventListener('click', () => d.close());
  d.addEventListener('click', (e) => { if (e.target === d) d.close(); });
}
sheet.addEventListener('close', () => { sheetId = null; });
cmpDlg.addEventListener('close', () => { cmpId = null; });

// tasti freccia tra le schede (pattern tablist)
$('.tabs').addEventListener('keydown', (e) => {
  if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
  const i = TABS.indexOf(current), n = TABS[(i + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length];
  goto(n); $('#tab-' + n).focus();
});

document.addEventListener('click', (e) => {
  const t = e.target;
  const tab = t.closest('.tabs [data-tab]'); if (tab) { goto(tab.dataset.tab); return; }
  const g = t.closest('[data-goto]'); if (g) { e.preventDefault(); goto(g.dataset.goto); return; }
  const c = t.closest('[data-cmp]'); if (c) { const id = c.dataset.cmp; whenDialogsClosed(() => openCompare(id)); return; }
  const o = t.closest('[data-open]'); if (o) { const id = o.dataset.open; if (cmpDlg.open) whenDialogsClosed(() => openSheet(id)); else openSheet(id); return; }
  const l = t.closest('[data-like]'); if (l) { const id = l.dataset.like; update((s) => setPreference(s, id, s.liked.includes(id) ? null : 'liked')); return; }
  const d = t.closest('[data-dislike]'); if (d) { const id = d.dataset.dislike; update((s) => setPreference(s, id, s.disliked.includes(id) ? null : 'disliked')); return; }
  const sa = t.closest('[data-stock-add]'); if (sa) { const id = sa.dataset.stockAdd, size = sa.dataset.size; update((s) => addStock(s, id, size)); toast(`${fullName(BY_ID[id])} (${size}) aggiunta alle corde in casa.`); return; }
  const q = t.closest('[data-equip]'); if (q) { ctx.equip(q.dataset.equip); }
});

initTips();
initToday(ctx);
initNext(ctx);
initHybrid(ctx);
initScience(ctx);
initAsk(ctx);
const hashTab = (location.hash || '').slice(1);
showTab(TABS.includes(hashTab) ? hashTab : 'oggi');
history.replaceState(null, '', `#${current}`);
window.scrollTo(0, 0);
if (window.claude && window.claude.use) Promise.resolve(window.claude.use('downloads')).then((d) => { ctx.downloads = d; if (d) renderAll(); }).catch(() => {});

// Lo stato salvato arriva dopo il primo disegno: le modifiche già fatte si rieseguono sopra di esso.
(async () => {
  try {
    persist = await createPersistence({ claude: window.claude, storage: safeStorage(), defaults: DATA.defaults, knownIds: ALL.map((r) => r.id) });
    const got = await persist.load();
    state = got.state;
    for (const fn of pendingFns) state = fn(state);
    const replayed = pendingFns.length > 0;
    pendingFns = []; loaded = true; epoch += 1;
    if (replayed || got.unsynced) persist.save(state);
    if (got.warnings && got.warnings.length) toast(got.warnings.join(' '));
    renderAll(); renderSyncBadge();
    persist.subscribe((remote) => {
      if (!loaded || sameState(remote, state)) { renderSyncBadge(); return; }
      hideToast(); // un annulla con una foto vecchia cancellerebbe ciò che l'altro dispositivo ha appena aggiunto
      state = remote; epoch += 1; renderAll(); renderSyncBadge();
      if (sheet.open && sheetId) openSheet(sheetId);
    });
  } finally { loaded = true; window.__bancoReady = true; }
})();
