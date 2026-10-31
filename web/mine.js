// Schermata Montata: corda montata, ore di gioco, usura, cambio corda e storico.
import { $, esc, fmt, fmtN, fullName, nameOf } from './format.js';
import { compactRowHtml } from './cards.js';
import { renderDiary, openPastDiary } from './diaryui.js';
import { changeString, addPastLife, addSession, removeSession, editSession, parseHours, tensionFor } from './state.js';

const WEAR_CLASS = { Fresca: 'ottimo', 'In uso': 'buono', 'Da controllare': 'attenzione', 'Da cambiare': 'poco' };
const BASIS_TEXT = { ipotesi: 'ipotesi di partenza, non misurata (8 + 0,12 × tenuta ore)', 'tua corda': 'dalle ore reali di questa corda', 'tuo storico': 'scalata sulle ore reali delle tue corde finite' };
let mineEditing = null, mineToastTimer = null, mineDownloads = null;

const pad = (n) => String(n).padStart(2, '0');
const mineToday = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const mineDate = (s) => new Date(s).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', timeZone: String(s).length === 10 ? 'UTC' : undefined });

export function mineToast(msg, label, onAction) {
  const t = $('#toast');
  t.innerHTML = `<span>${esc(msg)}</span><button class="btn" type="button">${esc(label)}</button>`;
  t.hidden = false;
  t.querySelector('button').onclick = () => { clearTimeout(mineToastTimer); t.hidden = true; onAction(); };
  clearTimeout(mineToastTimer);
  mineToastTimer = setTimeout(() => { t.hidden = true; }, 10000);
}

const mineDayStr = (back) => { const d = new Date(); d.setDate(d.getDate() - back); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
// Oggi / Ieri sono scorciatoie per il campo data, che resta (e resta impostato) per le sessioni successive.
function mineSyncDayChips() {
  const v = $('#hours-date').value;
  document.querySelectorAll('#day-chips [data-day]').forEach((b) => b.setAttribute('aria-pressed', String(v === mineDayStr(Number(b.dataset.day)))));
}

function mineError(msg) { const e = $('#hours-error'); e.textContent = msg || ''; e.hidden = !msg; }

function wearHtml(ctx) {
  const w = ctx.wear(), eq = ctx.equippedRec(), pct = Math.min(100, Math.round(w.ratio * 100)), cls = WEAR_CLASS[w.band];
  const lab = [eq.twu && eq.twu.tension_loss_pct != null ? `perdita TWU ${fmt(eq.twu.tension_loss_pct, 0)}%` : '', eq.excel && eq.excel.tl6 != null ? `TL6 ${fmt(eq.excel.tl6, 0)}%` : '',
    eq.excel && eq.excel.tl12 != null ? `TL12 ${fmt(eq.excel.tl12, 0)}%` : '', eq.excel && eq.excel.static_24h_creep != null ? `scorrimento ${fmt(eq.excel.static_24h_creep, 2)}″` : ''].filter(Boolean);
  const when = w.hoursLeft <= 0 ? '<b>Da cambiare ora.</b>' : `Ore residue ≈ <b>${fmtN(w.hoursLeft)} h</b>${w.changeBy ? ` · cambio stimato verso il ${esc(mineDate(w.changeBy))} (a ${fmtN(w.perWeek)} h/settimana)` : ''}.`;
  const n = w.life.n ? ` (${w.life.n})` : '';
  return `<div class="wear-head"><span class="pair ${cls}"><b>${esc(w.band)}</b></span><span>${fmtN(w.hours)} h su ≈ ${fmtN(w.life.hours, 0)} h <span class="muted small">(${fmtN(w.life.low, 0)}–${fmtN(w.life.high, 0)} h)</span></span></div>`
    + `<div class="wearbar" role="progressbar" aria-label="Usura" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><div class="fill f-${cls}" style="width:${pct}%"></div></div>`
    + `<p>${when}</p><p class="muted small">Vita attesa: ${esc(BASIS_TEXT[w.life.basis])}${esc(n)}. <button class="q" type="button" data-method="usura" aria-label="Come si calcola">?</button></p>`
    + `<p class="muted small">Montata da ${w.daysSince} giorni${lab.length ? ` · laboratorio: ${esc(lab.join(', '))}` : ''}. Anche ferma una poly perde tensione.</p>`;
}

export function renderMine(ctx) {
  const s = ctx.state(), eq = ctx.equippedRec();
  $('#mine-summary').innerHTML = compactRowHtml(eq, ctx.cardCtx(eq));
  $('#wear').innerHTML = wearHtml(ctx);
  renderDiary(ctx);
  if (!$('#hours-date').value) $('#hours-date').value = mineToday();
  mineSyncDayChips();
  const mine = s.sessions.filter((x) => x.life === s.equipped.since).sort((a, b) => b.date.localeCompare(a.date) || b.ts.localeCompare(a.ts));
  $('#sessions').innerHTML = mine.length ? mine.map((x) => (x.ts === mineEditing
    ? `<li data-ts="${esc(x.ts)}"><form><label>Ore <input name="hours" value="${esc(fmtN(x.hours))}" inputmode="decimal" size="5"></label><label>Nota <input name="note" value="${esc(x.note)}"></label><button class="btn primary" type="button" data-save-ts>Salva</button><button class="btn" type="button" data-cancel-edit>Annulla</button></form></li>`
    : `<li data-ts="${esc(x.ts)}"><span><b>${esc(mineDate(x.date))}</b> · ${fmtN(x.hours)} h${x.note ? ` · ${esc(x.note)}` : ''}</span><button class="btn" type="button" data-edit-ts>Modifica</button><button class="btn" type="button" data-del-ts>Togli</button></li>`)).join('')
    : '<li class="muted">Nessuna sessione registrata su questa corda.</li>';
  $('#history').innerHTML = s.lives.length ? [...s.lives].reverse().map((l) => `<li><span><b>${esc(ctx.BY_ID[l.id] ? fullName(ctx.BY_ID[l.id]) : l.id)}</b> · ${esc(fmtN(l.kg[0], 2))}/${esc(fmtN(l.kg[1], 2))} kg · ${esc(mineDate(l.from))}–${esc(mineDate(l.to))} · ${fmtN(l.hours)} h · ${esc(l.reason)}${l.diary ? ' · con voti' : ''}</span><button class="btn" type="button" data-past-open="${esc(l.lid)}">Voti e note</button></li>`).join('')
    : '<li class="muted">Ancora nessuna corda finita.</li>';
  renderPersistNote(ctx);
  $('#export-btn').hidden = !mineDownloads;
}

// Dove stanno i dati: solo su questo browser, o un salvataggio online fallito (le ultime modifiche restano in locale).
export function renderPersistNote(ctx) {
  const err = ctx.persistError();
  const notes = [...(ctx.persistMode() === 'local' ? ['Salvato solo su questo browser: su un altro dispositivo non ci saranno le ore. Puoi esportare lo storico.'] : []),
    ...(err ? [`Non sono riuscito a salvare online (${err}): le ultime modifiche sono solo su questo browser. Riprova più tardi.`] : []), ...(ctx.warnings || [])];
  $('#persist-note').textContent = notes.join(' ');
  $('#persist-note').hidden = !notes.length;
}

function addHours(ctx, raw, note = '') {
  const p = parseHours(raw);
  if (!p.ok) { mineError(p.reason); return; }
  const date = $('#hours-date').value || mineToday();
  if (date > mineToday()) { mineError('La data non può essere nel futuro.'); return; }
  mineError('');
  ctx.update((s) => addSession(s, { date, hours: p.value, note }));
  $('#hours-input').value = ''; $('#hours-note').value = '';
}

const eqKg = (v) => { const n = Number(String(v).trim().replace(',', '.')); return String(v).trim() !== '' && Number.isFinite(n) && n >= 15 && n <= 35 ? n : null; };
function eqSuggest(ctx) {
  const r = ctx.BY_ID[$('#eq-pick').value]; if (!r) return;
  const t = tensionFor(r, ctx.equippedRec(), ctx.state().equipped.kg);
  $('#eq-kgv').value = fmtN(t.kg[0], 2); $('#eq-kgh').value = fmtN(t.kg[1], 2);
}
function eqOptions(ctx, q, keep, sel = '#eq-pick') {
  const needle = q.trim().toLowerCase();
  const rows = ctx.ALL.filter((r) => !needle || fullName(r).toLowerCase().includes(needle)).sort((a, b) => fullName(a).localeCompare(fullName(b)));
  $(sel).innerHTML = rows.map((r) => `<option value="${esc(r.id)}">${esc(fullName(r))}</option>`).join('');
  if (keep && rows.some((r) => r.id === keep)) $(sel).value = keep;
}
function openEquip(ctx, id) {
  eqOptions(ctx, '', id || ctx.state().equipped.id);
  $('#eq-q').value = ''; $('#eq-rate').checked = false; $('#eq-date').value = mineToday(); $('#eq-reason').value = 'consumata'; $('#eq-hours').value = fmtN(ctx.hours());
  $('#eq-error').hidden = true;
  eqSuggest(ctx);
  if (!$('#equip-dialog').open) $('#equip-dialog').showModal();
}
function confirmEquip(ctx) {
  const err = (m) => { $('#eq-error').textContent = m; $('#eq-error').hidden = false; };
  const id = $('#eq-pick').value, v = eqKg($('#eq-kgv').value), h = eqKg($('#eq-kgh').value), date = $('#eq-date').value || mineToday();
  const hoursRaw = $('#eq-hours').value.trim();
  const endHours = hoursRaw === '' ? ctx.hours() : /^\d+([.,]\d+)?$/.test(hoursRaw) ? Number(hoursRaw.replace(',', '.')) : null;
  if (!id || !ctx.BY_ID[id]) return err('Scegli la nuova corda dall\'elenco.');
  if (v === null || h === null) return err('Tensione non valida: scrivi due numeri in kg tra 15 e 35.');
  if (date > mineToday()) return err('La data non può essere nel futuro.');
  if (endHours === null || endHours > 500) return err('Le ore giocate devono essere un numero (anche 0).');
  const prev = ctx.state();
  const since = `${date}T${new Date().toISOString().slice(11)}`;
  const lid = `${Date.now()}`, rate = $('#eq-rate').checked;
  ctx.update((s) => changeString(s, { id, kg: [v, h], date: since, endReason: $('#eq-reason').value, endHours, lid }));
  $('#equip-dialog').close();
  mineToast(`Montata: ${fullName(ctx.BY_ID[id])}`, 'Annulla cambio', () => { const d = $('#past-dialog'); if (d.open) d.close(); ctx.update(() => prev); });
  if (rate) openPastDiary(ctx, lid, 'end');
}

function openTrial(ctx) {
  eqOptions(ctx, '', ctx.state().equipped.id, '#tr-pick');
  $('#tr-q').value = ''; $('#tr-to').value = mineToday(); $('#tr-from').value = ''; $('#tr-hours').value = ''; $('#tr-reason').value = 'consumata';
  const kg = ctx.state().equipped.kg; $('#tr-kgv').value = fmtN(kg[0], 2); $('#tr-kgh').value = fmtN(kg[1], 2);
  $('#tr-error').hidden = true;
  if (!$('#trial-dialog').open) $('#trial-dialog').showModal();
}
function confirmTrial(ctx) {
  const err = (m) => { $('#tr-error').textContent = m; $('#tr-error').hidden = false; };
  const id = $('#tr-pick').value, v = eqKg($('#tr-kgv').value), h = eqKg($('#tr-kgh').value), from = $('#tr-from').value, to = $('#tr-to').value;
  const hRaw = $('#tr-hours').value.trim(), hours = /^\d+([.,]\d+)?$/.test(hRaw) ? Number(hRaw.replace(',', '.')) : null;
  if (!id || !ctx.BY_ID[id]) return err('Scegli la corda dall\'elenco.');
  if (v === null || h === null) return err('Tensione non valida: scrivi due numeri in kg tra 15 e 35.');
  if (!from || !to) return err('Scrivi le date di inizio e fine, anche approssimate.');
  if (to > mineToday()) return err('La data di fine non può essere nel futuro.');
  if (to < from) return err('Le date non tornano: «Al» deve essere dopo «Dal».');
  if (hours === null || hours > 500) return err('Le ore giocate devono essere un numero (anche 0), al massimo 500.');
  const lid = `${Date.now()}`;
  const next = addPastLife(ctx.state(), { id, kg: [v, h], from, to, hours, reason: $('#tr-reason').value, lid });
  if (next === ctx.state()) return err('Non riesco ad aggiungere questa prova: controlla i dati.');
  ctx.update(() => next);
  $('#trial-dialog').close();
  openPastDiary(ctx, lid, 'end');
}

export function initMine(ctx) {
  ctx.onEquip = (id) => openEquip(ctx, id);
  $('#day-chips').addEventListener('click', (e) => { const b = e.target.closest('[data-day]'); if (b) { $('#hours-date').value = mineDayStr(Number(b.dataset.day)); mineSyncDayChips(); } });
  $('#hours-date').addEventListener('input', mineSyncDayChips);
  $('#hours-add').addEventListener('click', () => addHours(ctx, $('#hours-input').value, $('#hours-note').value.trim()));
  $('#hours-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') addHours(ctx, e.target.value, $('#hours-note').value.trim()); });
  $('#montata').addEventListener('click', (e) => {
    const q = e.target.closest('[data-add-hours]'); if (q) { addHours(ctx, q.dataset.addHours); return; }
    const li = e.target.closest('#sessions li[data-ts]'); if (!li) return;
    const ts = li.dataset.ts;
    if (e.target.closest('[data-edit-ts]')) { mineEditing = ts; renderMine(ctx); return; }
    if (e.target.closest('[data-cancel-edit]')) { mineEditing = null; renderMine(ctx); return; }
    if (e.target.closest('[data-save-ts]')) {
      const p = parseHours(li.querySelector('input[name="hours"]').value);
      if (!p.ok) { mineError(p.reason); return; }
      mineError(''); mineEditing = null;
      ctx.update((s) => editSession(s, ts, { hours: p.value, note: li.querySelector('input[name="note"]').value.trim() }));
      return;
    }
    if (e.target.closest('[data-del-ts]')) { const prev = ctx.state(); ctx.update((s) => removeSession(s, ts)); mineToast('Sessione tolta', 'Annulla', () => ctx.update(() => prev)); }
  });
  $('#equip-btn').addEventListener('click', () => openEquip(ctx));
  $('#eq-cancel').addEventListener('click', () => $('#equip-dialog').close());
  $('#eq-ok').addEventListener('click', () => confirmEquip(ctx));
  $('#history').addEventListener('click', (e) => { const b = e.target.closest('[data-past-open]'); if (b) openPastDiary(ctx, b.dataset.pastOpen); });
  $('#past-add').addEventListener('click', () => openTrial(ctx));
  $('#tr-cancel').addEventListener('click', () => $('#trial-dialog').close());
  $('#tr-ok').addEventListener('click', () => confirmTrial(ctx));
  $('#tr-q').addEventListener('input', (e) => eqOptions(ctx, e.target.value, $('#tr-pick').value, '#tr-pick'));
  $('#eq-q').addEventListener('input', (e) => eqOptions(ctx, e.target.value, $('#eq-pick').value));
  $('#eq-pick').addEventListener('change', () => eqSuggest(ctx));
  $('#export-btn').addEventListener('click', async () => {
    try { await mineDownloads.save({ filename: 'banco-corde-storico.json', data: ctx.persist().exportJson(ctx.state()) }); } catch { /* rifiutato o non disponibile */ }
  });
  if (window.claude) window.claude.use('downloads').then((d) => { mineDownloads = d; if (d) renderMine(ctx); }).catch(() => {});
}
