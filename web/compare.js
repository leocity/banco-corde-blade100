// "Confronta" (spec §4.4): tabella affiancata, prima colonna fissa = corda attuale, fino a 3 candidate.
import { candidates, describeDelta, THRESHOLDS } from './recommend.js';
import { $, ALL, BY_ID, LIKED_IDS, esc, fmt, fullName, nameOf, NF, SHAPES, store, TWU_OK } from './format.js';
import { valButton } from './prov.js';
import { getCurrent } from './current.js';
import { DIR_MARK, liveScore, valueHtml } from './home.js';

const CMP_MAX = 3;
const cmpValid = (ids, cur) => [...new Set((Array.isArray(ids) ? ids : []).filter((id) => typeof id === 'string' && BY_ID[id] && id !== cur.id))].slice(-CMP_MAX);
function cmpIds() {
  const cur = getCurrent(), stored = store.get('compare', null);
  // prima visita: le prime 2 consigliate, così la tabella non parte vuota
  return stored === null ? candidates(ALL, cur.r, LIKED_IDS, liveScore).slice(0, 2).map((r) => r.id) : cmpValid(stored, cur);
}
const cmpSave = (ids) => store.set('compare', ids);

export function addToCompare(id) {
  const cur = getCurrent(), sheet = $('#sheet');
  if (sheet.open) sheet.close();
  if (id === cur.id || !BY_ID[id]) return;
  cmpSave(cmpValid([...cmpIds().filter((x) => x !== id), id], cur));
}

// righe: [chiave, etichetta, valore html, differenza rispetto alla corda attuale]
const twuOk = (r) => r.twu && TWU_OK.includes(r.twu.match);
const twuVal = (r, k, field, d, unit) => (twuOk(r) && r.twu[k] != null ? valButton(r, field, `${fmt(r.twu[k], d)}${unit}`) : '<span class="muted">non misurato</span>');
const rawDelta = (a, b, d) => (a == null || b == null ? '' : `<span class="dd">${a - b > 0 ? '+' : a - b < 0 ? '−' : '±'}${NF(d).format(Math.abs(a - b))}</span>`);
const CMP_ROWS = [
  { key: 'stiffness', label: 'Rigidità (lb/in)', cell: (r) => valueHtml(r, 'stiffness'), word: true },
  { key: 'spin', label: 'Spin (scala TWU)', cell: (r) => valueHtml(r, 'spin'), word: true },
  { key: 'loss', label: 'Perdita di tensione TWU', cell: (r) => valueHtml(r, 'loss'), word: true },
  { key: 'energy', label: 'Restituzione di energia', cell: (r) => twuVal(r, 'energy_return_pct', 'energy_return', 0, ' %'), raw: (r) => (twuOk(r) ? r.twu.energy_return_pct : null), d: 0 },
  { key: 'cofss', label: 'Attrito corda-corda', cell: (r) => twuVal(r, 'cof_string_string', 'cof_string_string', 3, ''), raw: (r) => (twuOk(r) ? r.twu.cof_string_string : null), d: 3 },
  { key: 'cofsb', label: 'Attrito corda-palla', cell: (r) => twuVal(r, 'cof_string_ball', 'cof_string_ball', 3, ''), raw: (r) => (twuOk(r) ? r.twu.cof_string_ball : null), d: 3 },
  { key: 'gauge', label: 'Calibro', cell: (r) => (r.gauge_mm ? `${NF(2).format(r.gauge_mm)} mm` : esc(r.gauge_label || '—')) },
  { key: 'shape', label: 'Forma', cell: (r) => esc(SHAPES[r.shape] || r.shape || '—') },
];
const EXCEL_ROWS = [
  { key: 'stretch', label: 'Allungamento a 50 lbs (tuo file)', cell: (r) => (r.excel?.stretch_pct?.['50'] != null ? valButton(r, 'excel', `${fmt(r.excel.stretch_pct['50'], 1)} %`) : '<span class="muted">non misurato</span>'), raw: (r) => r.excel?.stretch_pct?.['50'], d: 1 },
  { key: 'tl', label: 'Perdita a 6 / 12 mesi (tuo file)', cell: (r) => (r.excel && (r.excel.tl6 != null || r.excel.tl12 != null) ? valButton(r, 'excel', `${fmt(r.excel.tl6, 0)} / ${fmt(r.excel.tl12, 0)} %`) : '<span class="muted">non misurato</span>') },
];

function cmpCell(row, r, cur, parts) {
  let mark = '';
  if (r !== cur.r) {
    if (row.word) { const p = parts[r.id][row.key]; mark = p ? `<span class="dm ${p.dir}" title="${esc(p.text)}">${DIR_MARK[p.dir]}</span>` : ''; }
    else if (row.raw) mark = rawDelta(row.raw(r), row.raw(cur.r), row.d);
  }
  return `<td>${row.cell(r)} ${mark}</td>`;
}

export function renderCompare() {
  const cur = getCurrent(), ids = cmpIds(), cols = [cur.r, ...ids.map((id) => BY_ID[id])];
  const desc = Object.fromEntries(ids.map((id) => [id, describeDelta(BY_ID[id], cur.r)]));
  const parts = Object.fromEntries(ids.map((id) => [id, Object.fromEntries(desc[id].parts.map((p) => [p.key, p]))]));
  const rows = [...CMP_ROWS, ...(cols.some((r) => r.excel) ? EXCEL_ROWS : [])];
  const opts = [...ALL].filter((r) => r.id !== cur.id && !ids.includes(r.id)).sort((a, b) => fullName(a).localeCompare(fullName(b)))
    .map((r) => `<option value="${esc(fullName(r))}">`).join('');
  $('#cmp').innerHTML = `<div class="section-head"><h2>Confronta con la tua corda</h2></div>
    <div class="cmp-add"><label for="cmp-q" class="sr">Aggiungi una corda</label><input type="search" id="cmp-q" list="cmp-list" placeholder="Aggiungi una corda (fino a ${CMP_MAX})"${ids.length >= CMP_MAX ? ' disabled' : ''}><datalist id="cmp-list">${opts}</datalist></div>
    ${ids.length ? `<ul class="cmp-sum">${ids.map((id) => `<li><b>${esc(fullName(BY_ID[id]))}</b>: ${esc(desc[id].sentence)}</li>`).join('')}</ul>` : '<p class="muted">Aggiungi una corda dai consigli o dal campo qui sopra.</p>'}
    <p class="cmp-pos small muted" id="cmp-pos" hidden></p>
    <div class="cmp-wrap" id="cmp-wrap"><table class="cmp">
      <thead><tr>${cols.map((r, i) => `<th scope="col" class="${i ? 'cand' : 'mine'}"><span class="cn">${esc(nameOf(r))}</span><span class="cg">${r.gauge_mm ? NF(2).format(r.gauge_mm) : esc(r.gauge_label || '')}${i ? '' : ' · la tua'}</span>${i ? `<button type="button" class="rm" data-rm="${esc(r.id)}" aria-label="Togli ${esc(fullName(r))}">×</button>` : ''}</th>`).join('')}</tr></thead>
      <tbody>${rows.map((row) => `<tr class="lbl"><th scope="rowgroup" colspan="${cols.length}"><span>${esc(row.label)}</span></th></tr><tr>${cols.map((r) => cmpCell(row, r, cur, parts)).join('')}</tr>`).join('')}</tbody>
    </table></div>
    <p class="muted small">≈ stima (tocca il numero per fonte e margine) · ▲ ▼ più alto o più basso della tua corda oltre la soglia (spin ${fmt(THRESHOLDS.spin, 1)}, rigidità ${THRESHOLDS.stiffness} lb/in, perdita ${THRESHOLDS.loss} punti) · = simile · +/− differenza grezza dove non c'è una soglia. Attrito corda-corda più basso = le corde scorrono e tornano di più (è da qui che viene lo spin).</p>`;
  const q = $('#cmp-q');
  q.addEventListener('change', () => { const r = ALL.find((x) => fullName(x) === q.value); if (r) { addToCompare(r.id); renderCompare(); } });
  $('#cmp').querySelectorAll('[data-rm]').forEach((b) => b.addEventListener('click', () => { cmpSave(cmpIds().filter((x) => x !== b.dataset.rm)); renderCompare(); }));
  const wrap = $('#cmp-wrap'), pos = $('#cmp-pos');
  const where = () => {
    const ths = [...wrap.querySelectorAll('th.cand')];
    if (!ths.length || wrap.scrollWidth <= wrap.clientWidth + 2) { pos.hidden = true; return; }
    const edge = wrap.getBoundingClientRect().left + wrap.querySelector('th.mine').offsetWidth;
    const i = Math.max(0, ths.findIndex((th) => th.getBoundingClientRect().right > edge + 8));
    pos.hidden = false; pos.textContent = `Corda ${i + 1} di ${ths.length}: scorri la tabella di lato per le altre`;
  };
  wrap.addEventListener('scroll', where, { passive: true }); where();
}
