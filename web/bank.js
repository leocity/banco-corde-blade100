// Schermata Banco: tabella (o schede su telefono) con filtri e ordinamento, e pannello di confronto da 2 a 4 corde.
import { $, esc, fullName, nameOf, subline, MARK, SHAPES } from './format.js';
import { compactRowHtml, valHtml, pairHtml } from './cards.js';
import { rowValues, deltaVsEquipped } from './values.js';
import { labStiff } from './state.js';
import { newFilters, passesFilters, pairScore } from './choose.js';

const bankFilters = newFilters();
const bankView = { key: 'pairing', dir: -1, limit: 40, picks: [] };
const BANK_COLS = [['name', 'Corda'], ['spin', 'Spin'], ['stiffness', 'Rigidità'], ['durability', 'Tenuta'], ['control', 'Controllo'], ['pairing', 'Pairing']];
const BANK_MAX = 4;
const bankPhone = () => window.matchMedia('(max-width: 760px)').matches;

function bankSortValue(ctx, r, key) {
  switch (key) {
    case 'name': return nameOf(r);
    case 'spin': return r.spin ? r.spin.value : null;
    case 'stiffness': return r.stiffness ? r.stiffness.value_lbin : null;
    case 'durability': return r.derived.dims.durability;
    case 'control': return r.derived.dims.control;
    default: { const s = ctx.pairingOf(r.id).score; return s === undefined ? null : s; }
  }
}

function bankRows(ctx) {
  const k = bankView.key;
  return ctx.ALL.filter((r) => passesFilters(ctx, r, bankFilters)).sort((a, b) => {
    const va = bankSortValue(ctx, a, k), vb = bankSortValue(ctx, b, k);
    if ((va === null || va === undefined) && (vb === null || vb === undefined)) return 0;
    if (va === null || va === undefined) return 1;
    if (vb === null || vb === undefined) return -1;
    return (typeof va === 'string' ? va.localeCompare(vb) : va - vb) * bankView.dir;
  });
}

const cmpBox = (r) => `<input type="checkbox" class="cmp" data-id="${esc(r.id)}" aria-label="Confronta ${esc(fullName(r))}"${bankView.picks.includes(r.id) ? ' checked' : ''}>`;

function bankTable(ctx, rows) {
  const head = `<thead><tr><th><span class="sr">Confronta</span></th>${BANK_COLS.map(([k, l]) => `<th class="${k === 'name' ? '' : 'n'}" aria-sort="${k === bankView.key ? (bankView.dir > 0 ? 'ascending' : 'descending') : 'none'}"><button type="button" data-sort="${k}">${esc(l)}${k === bankView.key ? (bankView.dir > 0 ? ' ▲' : ' ▼') : ''}</button></th>`).join('')}</tr></thead>`;
  const body = rows.map((r) => {
    const v = Object.fromEntries(rowValues(r).map((x) => [x.key, x]));
    const cell = (x) => `<td class="v ${x.mark}"><span class="mark" title="${esc(x.note || x.why || '')}">${MARK[x.mark]}</span>${esc(x.text)}</td>`;
    return `<tr data-id="${esc(r.id)}"><td>${cmpBox(r)}</td><td><button type="button" class="rowlink" data-open="${esc(r.id)}">${esc(nameOf(r))}</button> <span class="muted small block">${esc(subline(r))}</span></td>`
      + `${cell(v.spin)}${cell(v.stiffness)}${cell(v.durability)}${cell(v.control)}<td>${pairHtml(ctx.cardCtx(r))}</td></tr>`;
  }).join('');
  return `${head}<tbody>${body}</tbody>`;
}

export function renderBank(ctx) {
  const brands = [...new Set(ctx.ALL.filter((r) => !bankFilters.target || r.is_target).map((r) => r.brand))].sort();
  $('#b-chips').innerHTML = brands.map((b) => `<button type="button" class="chipbtn" data-brand="${esc(b)}" aria-pressed="${bankFilters.brand === b}">${esc(b)}</button>`).join('');
  const rows = bankRows(ctx), shown = rows.slice(0, bankView.limit);
  $('#b-count').textContent = `${rows.length} corde${rows.length > shown.length ? `, ne mostro ${shown.length}` : ''}.`;
  if (bankPhone()) {
    $('#bank-table').innerHTML = '';
    $('#bank-cards').innerHTML = shown.map((r) => compactRowHtml(r, ctx.cardCtx(r, { after: `<label class="cmp-pick2">${cmpBox(r)}<span>Confronta</span></label>` }))).join('');
  } else {
    $('#bank-cards').innerHTML = '';
    $('#bank-table').innerHTML = bankTable(ctx, shown);
  }
  $('#b-more').hidden = rows.length <= shown.length;
  renderTray(ctx);
}

export function compareSummary(a, b) {
  const gain = [], lose = [];
  for (const [k, l] of [['spin', 'spin'], ['durability', 'tenuta'], ['control', 'controllo']]) {
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

function renderTray(ctx) {
  const picks = bankView.picks.map((id) => ctx.BY_ID[id]).filter(Boolean);
  $('#tray').hidden = picks.length < 2;
  if (picks.length < 2) { $('#tray').innerHTML = ''; return; }
  const first = picks[0];
  const cols = picks.map((r, i) => `<div class="tcol"><p><i class="sw" style="background:var(--s-c${i + 1})"></i> <b class="scard-name">${esc(nameOf(r))}</b> <span class="muted small">${esc(subline(r))}</span></p>${pairHtml(ctx.cardCtx(r))}`
    + `<div class="vals">${rowValues(r).map(valHtml).join('')}</div>${i ? (() => { const d = deltaVsEquipped(r, first).text; return d ? `<p class="delta">rispetto alla prima: <b>${esc(d)}</b></p>` : ''; })() : ''}`
    + `<div class="card-actions"><button class="btn" type="button" data-open="${esc(r.id)}">Scheda</button><button class="btn icon" type="button" data-uncmp="${esc(r.id)}" aria-label="Togli ${esc(fullName(r))} dal confronto">×</button></div></div>`).join('');
  const gaps = rowValues(first).map((v) => v.key).map((k) => {
    const who = picks.filter((r) => rowValues(r).find((v) => v.key === k).mark === 'missing').map(nameOf);
    const label = { spin: 'spin', stiffness: 'rigidità', durability: 'tenuta', control: 'controllo' }[k];
    return who.length ? `${label} (manca per ${who.map(esc).join(', ')})` : '';
  }).filter(Boolean);
  $('#tray').innerHTML = `<div class="tray-head"><b>Confronto</b><p class="summary">${compareSummary(first, picks[1])}${gaps.length ? ` <span class="gaps">⚠ Non confrontabili per dati mancanti: ${gaps.join('; ')}.</span>` : ''}</p><button class="btn" type="button" id="cmp-clear">Azzera</button></div><div class="tcols">${cols}</div>`;
}

export function initBank(ctx) {
  const gauges = [...new Set(ctx.ALL.map((r) => r.gauge_label).filter(Boolean))].sort();
  $('#b-gauge').insertAdjacentHTML('beforeend', gauges.map((g) => `<option>${esc(g)}</option>`).join(''));
  const shapes = [...new Set(ctx.ALL.map((r) => r.shape).filter(Boolean))].sort();
  $('#b-shape').insertAdjacentHTML('beforeend', shapes.map((x) => `<option value="${esc(x)}">${esc(SHAPES[x] || x)}</option>`).join(''));
  const redo = () => { bankView.limit = 40; renderBank(ctx); };
  $('#b-q').addEventListener('input', (e) => { bankFilters.q = e.target.value; redo(); });
  $('#b-gauge').addEventListener('change', (e) => { bankFilters.gauge = e.target.value; redo(); });
  $('#b-shape').addEventListener('change', (e) => { bankFilters.shape = e.target.value; redo(); });
  $('#b-target').addEventListener('change', (e) => { bankFilters.target = e.target.checked; redo(); });
  $('#b-measured').addEventListener('change', (e) => { bankFilters.measured = e.target.checked; redo(); });
  $('#b-good').addEventListener('change', (e) => { bankFilters.good = e.target.checked; redo(); });
  $('#b-chips').addEventListener('click', (e) => { const b = e.target.closest('[data-brand]'); if (b) { bankFilters.brand = bankFilters.brand === b.dataset.brand ? '' : b.dataset.brand; redo(); } });
  $('#b-more').addEventListener('click', () => { bankView.limit += 40; renderBank(ctx); });
  $('#banco').addEventListener('click', (e) => {
    const s = e.target.closest('[data-sort]');
    if (s) { if (bankView.key === s.dataset.sort) bankView.dir = -bankView.dir; else { bankView.key = s.dataset.sort; bankView.dir = s.dataset.sort === 'name' ? 1 : -1; } renderBank(ctx); }
  });
  $('#banco').addEventListener('change', (e) => {
    const c = e.target.closest('input.cmp'); if (!c) return;
    const id = c.dataset.id;
    if (c.checked) {
      if (bankView.picks.length >= BANK_MAX) { c.checked = false; $('#cmp-msg').textContent = `Al massimo ${BANK_MAX} corde nel confronto: togline una per aggiungerne un'altra.`; return; }
      bankView.picks.push(id);
    } else bankView.picks = bankView.picks.filter((x) => x !== id);
    $('#cmp-msg').textContent = '';
    renderTray(ctx);
  });
  $('#tray').addEventListener('click', (e) => {
    if (e.target.closest('#cmp-clear')) { bankView.picks = []; $('#cmp-msg').textContent = ''; renderBank(ctx); return; }
    const u = e.target.closest('[data-uncmp]'); if (u) { bankView.picks = bankView.picks.filter((x) => x !== u.dataset.uncmp); renderBank(ctx); }
  });
  window.matchMedia('(max-width: 760px)').addEventListener('change', () => renderBank(ctx));
}
