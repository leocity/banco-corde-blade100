// Filtro unico per Scegli e Mappa: marca, solo dati misurati, pairing buono o meglio, anche altre marche.
// Si apre da un solo pulsante «Filtra» e vale per entrambe le schermate.
import { $, esc } from './format.js';

export const filters = { brand: '', measured: false, good: false, others: false };
export const filterCount = () => [filters.brand, filters.measured, filters.good, filters.others].filter(Boolean).length;
export const filterLabel = () => (filterCount() ? `Filtra (${filterCount()})` : 'Filtra');
export const filterReset = () => { filters.brand = ''; filters.measured = false; filters.good = false; filters.others = false; };

let fltCtx = null, fltCount = () => 0, fltChanged = () => {};

function renderFilterDialog() {
  const ctx = fltCtx;
  const brands = [...new Set(ctx.ALL.filter((r) => filters.others || r.is_target).map((r) => r.brand))].sort();
  $('#flt-brands').innerHTML = brands.map((b) => `<button type="button" class="chipbtn" data-brand="${esc(b)}" aria-pressed="${filters.brand === b}">${esc(b)}</button>`).join('');
  $('#flt-measured').checked = filters.measured; $('#flt-good').checked = filters.good; $('#flt-others').checked = filters.others;
  const n = fltCount();
  $('#flt-ok').textContent = `Mostra ${n} ${n === 1 ? 'corda' : 'corde'}`;
}

export function openFilter() { renderFilterDialog(); if (!$('#filter-dialog').open) $('#filter-dialog').showModal(); }

// count(): quante corde passano i filtri correnti; changed(): ridisegna la schermata che usa i filtri
export function initFilter(ctx, { count, changed }) {
  fltCtx = ctx; fltCount = count; fltChanged = changed;
  const upd = () => { renderFilterDialog(); fltChanged(); };
  $('#flt-brands').addEventListener('click', (e) => { const b = e.target.closest('[data-brand]'); if (b) { filters.brand = filters.brand === b.dataset.brand ? '' : b.dataset.brand; upd(); } });
  $('#flt-measured').addEventListener('change', (e) => { filters.measured = e.target.checked; upd(); });
  $('#flt-good').addEventListener('change', (e) => { filters.good = e.target.checked; upd(); });
  $('#flt-others').addEventListener('change', (e) => { filters.others = e.target.checked; if (!filters.others && filters.brand && !ctx.ALL.some((r) => r.is_target && r.brand === filters.brand)) filters.brand = ''; upd(); });
  $('#flt-reset').addEventListener('click', () => { filterReset(); upd(); });
  $('#flt-ok').addEventListener('click', () => $('#filter-dialog').close());
  document.addEventListener('click', (e) => { if (e.target.closest('[data-open-filter]')) openFilter(); });
}
