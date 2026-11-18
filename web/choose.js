// Schermata Scegli: striscia della montata, preferite, le 3 da provare e la lista filtrabile.
import { $, esc, fmt, fmtN, fullName, nameOf } from './format.js';
import { compactRowHtml } from './cards.js';

import { filters, filterLabel } from './filter.js';

const chooseView = { q: '', limit: 12 };
const labSpinKind = (r) => !!r.spin && ['misurato', 'parente'].includes(r.spin.kind);
export const strictlyMeasured = (r) => !r.catalog_only && !!r.spin && r.spin.kind === 'misurato' && !!r.stiffness && r.stiffness.kind === 'misurata';
export const pairScore = (ctx, r) => { const s = ctx.pairingOf(r.id).score; return s === null || s === undefined ? -1 : s; };

// Le 3 da provare: alternative delle marche valutate, non preferite né montata, con spin misurato o da gemello e pairing calcolato.
export function topIds(ctx) {
  const s = ctx.state();
  return ctx.ALL.filter((r) => r.is_target && r.id !== s.equipped.id && !s.liked.includes(r.id) && !s.disliked.includes(r.id) && !r.catalog_only && labSpinKind(r)
    && ctx.pairingOf(r.id).score !== null && !(r.crosscheck && r.crosscheck.verdict === 'contradicted'))
    .sort((a, b) => pairScore(ctx, b) - pairScore(ctx, a) || b.spin.value - a.spin.value).slice(0, 3).map((r) => r.id);
}

export function renderStrip(ctx) {
  const s = ctx.state(), eq = ctx.equippedRec();
  $('#strip').innerHTML = `<span class="k">Montata</span><b>${esc(fullName(eq))}</b><span>${fmt(s.equipped.kg[0], 1)}/${fmt(s.equipped.kg[1], 1)} kg · ${fmtN(ctx.hours())} h</span><span id="strip-wear">${ctx.wearLabel ? esc(ctx.wearLabel()) : ''}</span>`;
}

// Una corda passa i filtri comuni (marca, misurate, pairing buono, altre marche) e la ricerca. Cercando, «altre marche» non conta.
export function passesFilters(ctx, r, f = filters, q = '') {
  const needle = q.trim().toLowerCase();
  return (!needle || fullName(r).toLowerCase().includes(needle)) && (needle || f.others || r.is_target) && (!f.brand || r.brand === f.brand)
    && (!f.measured || strictlyMeasured(r)) && (!f.good || pairScore(ctx, r) >= 60);
}
export const filteredCount = (ctx) => ctx.ALL.filter((r) => passesFilters(ctx, r)).length;

export function renderChoose(ctx) {
  const s = ctx.state();
  renderStrip(ctx);
  $('#no-refs').hidden = s.liked.length > 0;
  const top = topIds(ctx);
  $('#top3').innerHTML = top.map((id, i) => compactRowHtml(ctx.BY_ID[id], ctx.cardCtx(ctx.BY_ID[id], { rankNum: i + 1 }))).join('');
  const searching = chooseView.q.trim() !== '';
  $('#top3-wrap').hidden = searching || filterActive();
  $('#list-title').textContent = searching ? 'Risultati' : filterActive() ? 'Corde filtrate' : 'Tutte le altre';
  $('#filter-btn').textContent = filterLabel();
  const rows = ctx.ALL.filter((r) => passesFilters(ctx, r, filters, chooseView.q) && (searching || filterActive() || (r.id !== s.equipped.id && !s.liked.includes(r.id) && !s.disliked.includes(r.id) && !top.includes(r.id))))
    .sort((a, b) => pairScore(ctx, b) - pairScore(ctx, a) || nameOf(a).localeCompare(nameOf(b)));
  $('#list').innerHTML = rows.slice(0, chooseView.limit).map((r) => compactRowHtml(r, ctx.cardCtx(r))).join('') || '<p class="muted">Nessuna corda con questi filtri.</p>';
  $('#list-count').textContent = `${rows.length} ${rows.length === 1 ? 'corda' : 'corde'}`;
  $('#more').hidden = rows.length <= chooseView.limit;
}
const filterActive = () => filterLabel() !== 'Filtra';

export function initChoose(ctx) {
  $('#q').addEventListener('input', (e) => { chooseView.q = e.target.value; chooseView.limit = 12; renderChoose(ctx); });
  $('#more').addEventListener('click', () => { chooseView.limit += 12; renderChoose(ctx); });
}
