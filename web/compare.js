// Confronto da 2 a 4 corde: si aggiunge dalla scheda («Confronta»), il pannello sta in basso.
import { $, esc, fullName, nameOf, subline } from './format.js';
import { valHtml } from './cards.js';
import { rowValues, deltaVsEquipped } from './values.js';
import { labStiff } from './state.js';

export function compareSummary(a, b) {
  const gain = [], lose = [];
  for (const [k, l] of [['spin', 'spin'], ['durability', 'tenuta']]) {
    const va = a.derived.dims[k], vb = b.derived.dims[k];
    if (va === null || va === undefined || vb === null || vb === undefined) continue;
    if (vb - va >= 10) gain.push(l); else if (va - vb >= 10) lose.push(l);
  }
  const join = (xs) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} e ${xs[xs.length - 1]}` : xs[0]);
  const sa = labStiff(a), sb = labStiff(b);
  const stiff = sa !== null && sb !== null && Math.abs(sb - sa) >= 10 ? ` La seconda è ${sb > sa ? 'più rigida' : 'più morbida'} di circa ${Math.round(Math.abs(sb - sa))} lb/in.` : '';
  const head = `Passando da <b>${esc(fullName(a))}</b> a <b>${esc(fullName(b))}</b> `;
  return head + (!gain.length && !lose.length ? 'il profilo resta simile.' : `${[gain.length ? `guadagni ${join(gain)}` : '', lose.length ? `perdi ${join(lose)}` : ''].filter(Boolean).join(' e ')}.`) + stiff;
}

export const comparePicks = () => cmpState.picks;
const cmpState = { picks: [], msg: '', open: false };
const CMP_MAX = 4;

export function renderTray(ctx) {
  const picks = cmpState.picks.map((id) => ctx.BY_ID[id]).filter(Boolean);
  $('#tray').hidden = picks.length < 1;
  $('#tray').classList.toggle('open', cmpState.open && picks.length >= 1);
  if (picks.length < 1) { $('#tray').innerHTML = ''; cmpState.open = false; return; }
  // barra compatta (una riga); il confronto si apre solo se lo tocchi, così non copre la lista
  const bar = `<button type="button" class="tray-bar" id="tray-toggle" aria-expanded="${cmpState.open}"><b>Confronto</b><span>${picks.length} ${picks.length === 1 ? 'corda' : 'corde'}${picks.length < 2 ? ' · aggiungine un\'altra' : ''}</span><span class="chev" aria-hidden="true">${cmpState.open ? '▼' : '▲'}</span></button>`;
  if (!cmpState.open) { $('#tray').innerHTML = bar + (cmpState.msg ? `<p class="gaps">${esc(cmpState.msg)}</p>` : ''); return; }
  if (picks.length < 2) {
    $('#tray').innerHTML = `${bar}<div class="tray-head"><p class="summary">${esc(nameOf(picks[0]))} è nel confronto: apri un'altra corda e tocca «Confronta».</p><button class="btn" type="button" id="cmp-clear">Svuota</button></div>`;
    return;
  }
  const first = picks[0];
  const cols = picks.map((r, i) => `<div class="tcol"><p><i class="sw" style="background:var(--s-c${i + 1})"></i> <b class="scard-name">${esc(nameOf(r))}</b> <span class="muted small">${esc(subline(r))}</span></p>${pairHtml(ctx.cardCtx(r))}`
    + `<div class="vals">${rowValues(r).map(valHtml).join('')}</div>${i ? (() => { const d = deltaVsEquipped(r, first).text; return d ? `<p class="delta">rispetto alla prima: <b>${esc(d)}</b></p>` : ''; })() : ''}`
    + `<div class="card-actions"><button class="btn" type="button" data-open="${esc(r.id)}">Scheda</button><button class="btn icon" type="button" data-uncmp="${esc(r.id)}" aria-label="Togli ${esc(fullName(r))} dal confronto">×</button></div></div>`).join('');
  const gaps = rowValues(first).map((v) => v.key).map((k) => {
    const who = picks.filter((r) => rowValues(r).find((v) => v.key === k).mark === 'missing').map(nameOf);
    const label = { spin: 'spin', stiffness: 'rigidità', durability: 'tenuta' }[k];
    return who.length ? `${label} (manca per ${who.map(esc).join(', ')})` : '';
  }).filter(Boolean);
  $('#tray').innerHTML = `${bar}<div class="tray-head">${cmpState.msg ? `<p class="gaps">${esc(cmpState.msg)}</p>` : ''}<p class="summary">${compareSummary(first, picks[1])}${gaps.length ? ` <span class="gaps">⚠ Non confrontabili per dati mancanti: ${gaps.join('; ')}.</span>` : ''}</p><button class="btn" type="button" id="cmp-clear">Azzera</button></div><div class="tcols">${cols}</div>`;
}


export function toggleCompare(ctx, id) {
  const has = cmpState.picks.includes(id);
  if (has) cmpState.picks = cmpState.picks.filter((x) => x !== id);
  else if (cmpState.picks.length >= CMP_MAX) { cmpState.msg = `Al massimo ${CMP_MAX} corde: togline una dal confronto.`; renderTray(ctx); return false; }
  else cmpState.picks = [...cmpState.picks, id];
  cmpState.msg = '';
  renderTray(ctx);
  return !has;
}

export function initCompare(ctx) {
  document.addEventListener('click', (e) => {
    const c = e.target.closest('[data-compare]');
    if (c) { const added = toggleCompare(ctx, c.dataset.compare); const d = $('#sheet'); if (added && d && d.open) d.close(); return; }
    if (e.target.closest('#tray-toggle')) { cmpState.open = !cmpState.open; renderTray(ctx); return; }
    const u = e.target.closest('[data-uncmp]'); if (u) { cmpState.picks = cmpState.picks.filter((x) => x !== u.dataset.uncmp); renderTray(ctx); return; }
    if (e.target.closest('#cmp-clear')) { cmpState.picks = []; cmpState.open = false; renderTray(ctx); }
  });
}
