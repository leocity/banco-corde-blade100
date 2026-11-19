// Comparatore: la corda montata e fino a 3 altre, una grandezza per blocco, con il segno del tipo di valore
// (misurata, ricavata dai dati, dalla fisica) e il verdetto rispetto alla montata. Stesso modello fisico dei consigli.
import { $, esc, NF, fullName } from './format.js';
import { valueOf } from './cmp.js';
import { bedOf, compareBeds, physPhrase, diffTxt } from './phys.js';
import { tip, mk, fmtV, shapeOf } from './ui.js';

export const CMP_MAX = 4;
let cmpIds = [];

const BLOCKS = [
  { key: 'kNow', label: 'Rigidità appena montata', tip: 'twu.stiffness', unit: 'lb/in', dec: 0 },
  { key: 'kAfter', label: 'Rigidità dopo il calo di tensione', tip: 'twu.loss', unit: 'lb/in', dec: 0 },
  { key: 'launch', label: 'Lancio della palla', tip: 'lancio' },
  { key: 'spin', label: 'Spin', tip: 'twu.spin', unit: '', dec: 1 },
  { key: 'loss', label: 'Perdita di tensione', tip: 'twu.loss', unit: '%', dec: 0 },
];

function bedVal(bed, key) {
  const v = key === 'launch' ? bed.kAfter : bed[key];
  if (!v) return '<span class="nm">nessun valore</span>';
  if (key === 'launch') return '';
  const b = BLOCKS.find((x) => x.key === key);
  return `${mk(v.est)}<b class="num">${NF(b.dec).format(v.v)}${b.unit === '%' ? '%' : b.unit ? ` ${b.unit}` : ''}</b>`;
}

export function compareListHtml(ctx) {
  const st = ctx.state(), ref = ctx.equippedRec(), kg = st.equipped.kg;
  const ids = [ref.id, ...cmpIds.filter((id) => id !== ref.id && ctx.BY_ID[id])].slice(0, CMP_MAX);
  const recs = ids.map((id) => ctx.BY_ID[id]);
  const refBed = bedOf(ref, ref, kg);
  const beds = recs.map((r) => bedOf(r, r, kg));
  const rowsOf = beds.map((b, i) => (i === 0 ? [] : compareBeds(b, refBed)));
  const chips = recs.map((r, i) => `<span class="cchip">${esc(fullName(r))}${i === 0 ? ' <span class="tag ok">montata</span>' : ` <button type="button" class="btn sq ghost" data-cmp-del="${esc(r.id)}" aria-label="Togli ${esc(fullName(r))} dal confronto">✕</button>`}</span>`).join('');
  const block = (B) => `<section class="cblock"><h3>${tip(B.tip, esc(B.label))}</h3><ul class="clist">${recs.map((r, i) => {
    const row = i === 0 ? null : rowsOf[i].find((x) => x.key === B.key);
    const verdict = i === 0 ? '<span class="muted small">la tua</span>' : row ? `<span class="lvl-${row.level === 'simile' ? 'same' : row.level === 'nettamente' ? 'big' : 'some'}">${row.dir ? esc(physPhrase(row)) : 'simile'}</span> <span class="muted small">(${esc(diffTxt(row))})</span>` : '';
    return `<li><span class="cname">${esc(r.model)} ${r.gauge_mm ? NF(2).format(r.gauge_mm) : ''}</span><span class="cval">${bedVal(beds[i], B.key)} ${verdict}</span></li>`;
  }).join('')}</ul></section>`;
  const spec = `<section class="cblock"><h3>Calibro, forma, materiale, rigidità da ferma</h3><ul class="clist">${recs.map((r) => {
    const rp = valueOf(r, 'rp.kgmm');
    return `<li><span class="cname">${esc(r.model)}</span><span class="cval small">${r.gauge_mm ? `${NF(2).format(r.gauge_mm)} mm` : '—'} · ${esc(shapeOf(r))} · ${esc(r.material || '—')} · ${rp ? `${mk(rp.est)}${esc(fmtV('rp.kgmm', rp.v))}` : 'da ferma: nessun valore'}</span></li>`;
  }).join('')}</ul></section>`;
  return `<p class="small muted">Alla tua tensione (${NF(1).format(kg[0])}/${NF(1).format(kg[1])} kg). ${mk(null)}misurata ${mk('ricavata')}ricavata dai dati ${mk('modello')}dalla fisica</p>
    <div class="cchips">${chips}</div>
    ${ids.length < CMP_MAX ? `<label class="search"><span class="sr">Aggiungi una corda al confronto</span><input type="search" id="cmp-q" placeholder="Aggiungi una corda (fino a ${CMP_MAX - 1})" autocomplete="off"></label><ul class="picklist results" id="cmp-results"></ul>` : ''}
    ${BLOCKS.map(block).join('')}${spec}`;
}

export function cmpSearch(ctx) {
  const q = (($('#cmp-q') || {}).value || '').trim().toLowerCase();
  const out = $('#cmp-results'); if (!out) return;
  if (!q) { out.innerHTML = ''; return; }
  const words = q.split(/\s+/);
  out.innerHTML = ctx.ALL.filter((r) => words.every((w) => fullName(r).toLowerCase().includes(w))).slice(0, 8)
    .map((r) => `<li><button type="button" class="pick" data-cmp-add="${esc(r.id)}"><span>${esc(fullName(r))}</span></button></li>`).join('') || '<li class="muted">Nessuna corda trovata.</li>';
}

export const setCompare = (ids) => { cmpIds = [...new Set(ids)].slice(0, CMP_MAX - 1); };
export const addCompare = (id) => { if (!cmpIds.includes(id)) cmpIds = [...cmpIds, id].slice(-(CMP_MAX - 1)); };
export const delCompare = (id) => { cmpIds = cmpIds.filter((x) => x !== id); };
export const compareIds = () => [...cmpIds];
