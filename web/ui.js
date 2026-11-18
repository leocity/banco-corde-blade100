// Piccoli pezzi di interfaccia condivisi: tooltip, valori misurati, nomi. Nessun accesso al DOM all'import.
import { esc, NF, SHAPES, fullName } from './format.js';
import { GLOSS, KIND_LABEL } from './glossary.js';
import { CMP_KEYS, valueOf } from './cmp.js';

// Bottone tooltip: `key` è una voce del glossario; `extra` aggiunge valore, fonte e data della singola cifra.
export function tip(key, label, extra = null, aria = '') {
  const x = extra ? ` data-tipx="${esc(JSON.stringify(extra))}"` : '';
  const a = aria ? ` aria-label="${esc(aria)}"` : '';
  return `<button type="button" class="tip${aria ? ' i' : ''}" data-tip="${esc(key)}"${x}${a}>${label}</button>`;
}
// Segno del tipo di valore, disegnato in CSS (i simboli ◐ non ci sono in tutti i caratteri): misurata, ricavata dai dati, dalla fisica.
const MK_WORD = { meas: 'misurata', der: 'ricavata da altri dati', phys: 'ricavata dalla fisica' };
export const mk = (est) => { const k = est === 'modello' ? 'phys' : est ? 'der' : 'meas'; return `<i class="mk mk-${k}" role="img" aria-label="${MK_WORD[k]}" title="${MK_WORD[k]}"></i>`; };
export const infoTip = (key, aria) => tip(key, 'ⓘ', null, aria);
export const misure = (n) => (n === 1 ? '1 misura' : `${n} misure`);

export function tipHtml(key, extra) {
  const g = GLOSS[key];
  if (!g) return '';
  const lines = [`<p class="tip-kind k-${g.kind}">${esc(KIND_LABEL[g.kind] || '')}</p>`, `<h3>${esc(g.title)}</h3>`, `<p>${esc(g.text)}</p>`];
  if (extra && extra.v) lines.push(`<p class="tip-val">${esc(extra.v)}</p>`);
  const src = (extra && extra.src) || g.src;
  const url = (extra && extra.url) || g.url;
  if (src) lines.push(`<p class="tip-src">Fonte: ${url ? `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(src)}</a>` : esc(src)}${extra && extra.date ? `, dati del ${esc(itDate(extra.date))}` : ''}</p>`);
  return lines.join('');
}

export const itDate = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || '')); return m ? `${m[3]}/${m[2]}/${m[1]}` : String(iso || ''); };
export const fmtV = (key, v) => {
  const k = CMP_KEYS[key];
  return v === null || v === undefined ? '—' : `${NF(k.dec).format(v)}${k.unit === '%' ? '%' : k.unit ? ` ${k.unit}` : ''}`;
};

const SRC_OF = { twu: 'TWU String Performance Database', rp: 'Racketpedia', excel: 'Il tuo Excel (test Ektelon)' };
// Valore misurato con tooltip (fonte, data, link). Se manca: «non misurato».
export function labValue(rec, key) {
  const k = CMP_KEYS[key];
  const v = rec && rec.lab ? k.get(rec.lab) : null;
  if (typeof v !== 'number') {
    const e = valueOf(rec, key);
    if (!e) return tip('nonmisurato', '<span class="nm">nessun valore</span>');
    return tip(key, `${mk(e.est)}<b class="num est">${esc(fmtV(key, e.v))}</b>`, { v: `${fullName(rec)}: ≈ ${fmtV(key, e.v)}${e.margin ? ` (± ${String(e.margin).replace('.', ',')})` : ''}, ${e.how}`, src: e.est === 'modello' ? 'Ricavata dalla fisica' : 'Ricavata da altri dati' });
  }
  const part = rec.lab[key.split('.')[0]] || {};
  return tip(key, `${mk(null)}<b class="num">${esc(fmtV(key, v))}</b>`, { v: `${fullName(rec)}: ${fmtV(key, v)}`, src: SRC_OF[key.split('.')[0]], url: part.url, date: part.date });
}

export const shapeOf = (r) => SHAPES[r.shape] || (r.shape ? r.shape.toLowerCase() : 'forma non indicata');
export const specLine = (r) => [r.gauge_mm ? tip('calibro', `${NF(2).format(r.gauge_mm)} mm`) : '', tip('forma', esc(shapeOf(r))), r.material ? esc(r.material) : ''].filter(Boolean).join(' · ');
export const nameBtn = (r, cls = '') => `<button type="button" class="linkish ${cls}" data-open="${esc(r.id)}">${esc(fullName(r))}</button>`;
export const measuredCount = (r) => (r.lab ? Object.keys(CMP_KEYS).filter((k) => typeof CMP_KEYS[k].get(r.lab) === 'number').length : 0);
export const hasMeasures = (r) => measuredCount(r) > 0;
