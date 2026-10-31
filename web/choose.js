// Schermata Scegli: striscia della montata, preferite, le 3 da provare e la lista filtrabile.
import { $, esc, fmt, fmtN, fullName, nameOf, SHAPES } from './format.js';
import { compactRowHtml } from './cards.js';

export const newFilters = () => ({ q: '', brand: '', gauge: '', shape: '', target: true, measured: false, good: false });
const chooseFilters = { ...newFilters(), limit: 12 };
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

function renderRefs(ctx) {
  const s = ctx.state(), by = ctx.BY_ID;
  const chip = (id, kind) => `<button type="button" class="chip ${kind}" data-${kind === 'liked' ? 'like' : 'dislike'}="${esc(id)}" aria-label="Togli ${esc(fullName(by[id]))} da ${kind === 'liked' ? 'le preferite' : 'le non gradite'}">${kind === 'liked' ? '★' : '✕'} ${esc(fullName(by[id]))} ×</button>`;
  $('#myrefs').innerHTML = s.liked.filter((id) => by[id]).map((id) => chip(id, 'liked')).join('') + s.disliked.filter((id) => by[id]).map((id) => chip(id, 'disliked')).join('');
  $('#no-refs').hidden = s.liked.length > 0;
  $('#myrefs-sum').textContent = `Le tue corde: ${s.liked.filter((id) => by[id]).length} ★ · ${s.disliked.filter((id) => by[id]).length} ✕ (tocca per modificare)`;
}

// Filtri comuni a Scegli e Banco. Con una ricerca in corso il filtro "marche valutate" non si applica.
export function passesFilters(ctx, r, f) {
  const q = f.q.trim().toLowerCase();
  return (!q || fullName(r).toLowerCase().includes(q)) && (q || !f.target || r.is_target) && (!f.brand || r.brand === f.brand) && (!f.gauge || r.gauge_label === f.gauge) && (!f.shape || r.shape === f.shape)
    && (!f.measured || strictlyMeasured(r)) && (!f.good || pairScore(ctx, r) >= 60);
}

export function renderChoose(ctx) {
  const s = ctx.state();
  renderStrip(ctx);
  renderRefs(ctx);
  const top = topIds(ctx);
  $('#top3-note').innerHTML = `Spin misurato o da gemello. <b>Il pairing (0–100) non è un voto.</b> <button class="q" type="button" data-method="pairing" aria-label="Come si calcola">?</button>`;
  $('#top3').innerHTML = top.map((id, i) => compactRowHtml(ctx.BY_ID[id], ctx.cardCtx(ctx.BY_ID[id], { why: true, rankNum: i + 1 }))).join('');
  const brands = [...new Set(ctx.ALL.filter((r) => !chooseFilters.target || r.is_target).map((r) => r.brand))].sort();
  $('#chips').innerHTML = brands.map((b) => `<button type="button" class="chipbtn" data-brand="${esc(b)}" aria-pressed="${chooseFilters.brand === b}">${esc(b)}</button>`).join('');
  const searching = chooseFilters.q.trim() !== '';
  $('#top3-wrap').hidden = searching;
  $('#list-title').textContent = searching ? 'Risultati' : 'Tutte le altre';
  const active = [chooseFilters.brand, chooseFilters.gauge, chooseFilters.shape, !chooseFilters.target, chooseFilters.measured, chooseFilters.good].filter(Boolean).length;
  $('#filters summary').textContent = active ? `Filtri (${active})` : 'Filtri';
  const rows = ctx.ALL.filter((r) => passesFilters(ctx, r, chooseFilters) && (searching || (r.id !== s.equipped.id && !s.liked.includes(r.id) && !s.disliked.includes(r.id) && !top.includes(r.id))))
    .sort((a, b) => pairScore(ctx, b) - pairScore(ctx, a) || nameOf(a).localeCompare(nameOf(b)));
  $('#list').innerHTML = rows.slice(0, chooseFilters.limit).map((r) => compactRowHtml(r, ctx.cardCtx(r))).join('') || '<p class="muted">Nessuna corda con questi filtri.</p>';
  $('#list-count').textContent = `${rows.length} corde${rows.length > chooseFilters.limit ? `, ne mostro ${chooseFilters.limit}` : ''}. ◐ = valore stimato, ○ = dato mancante.`;
  $('#more').hidden = rows.length <= chooseFilters.limit;
}

export function initChoose(ctx) {
  const gauges = [...new Set(ctx.ALL.map((r) => r.gauge_label).filter(Boolean))].sort();
  $('#f-gauge').insertAdjacentHTML('beforeend', gauges.map((g) => `<option>${esc(g)}</option>`).join(''));
  const shapes = [...new Set(ctx.ALL.map((r) => r.shape).filter(Boolean))].sort();
  $('#f-shape').insertAdjacentHTML('beforeend', shapes.map((x) => `<option value="${esc(x)}">${esc(SHAPES[x] || x)}</option>`).join(''));
  const redo = () => { chooseFilters.limit = 12; renderChoose(ctx); };
  $('#q').addEventListener('input', (e) => { chooseFilters.q = e.target.value; redo(); });
  $('#f-gauge').addEventListener('change', (e) => { chooseFilters.gauge = e.target.value; redo(); });
  $('#f-shape').addEventListener('change', (e) => { chooseFilters.shape = e.target.value; redo(); });
  $('#only-target').addEventListener('change', (e) => { chooseFilters.target = e.target.checked; if (chooseFilters.brand && chooseFilters.target && !ctx.ALL.some((r) => r.is_target && r.brand === chooseFilters.brand)) chooseFilters.brand = ''; redo(); });
  $('#only-measured').addEventListener('change', (e) => { chooseFilters.measured = e.target.checked; redo(); });
  $('#only-good').addEventListener('change', (e) => { chooseFilters.good = e.target.checked; redo(); });
  $('#chips').addEventListener('click', (e) => { const b = e.target.closest('[data-brand]'); if (b) { chooseFilters.brand = chooseFilters.brand === b.dataset.brand ? '' : b.dataset.brand; redo(); } });
  $('#more').addEventListener('click', () => { chooseFilters.limit += 12; renderChoose(ctx); });
}
