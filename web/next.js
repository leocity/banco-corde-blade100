// «Prossima»: quali corde e quali ibridi proporre per la domanda scelta, prima quelle in casa.
// Il metro è il modello fisico del letto (phys.js): rigidità appena montata, rigidità dopo il calo di tensione,
// lancio, spin, tenuta, alla tua tensione. Valori misurati o ricavati; una corda entra solo se il suo valore
// principale per la domanda è misurato o ricavato da dati (non solo dalla fisica). Puro, testato.
import { compareTo, valueOf } from './cmp.js';
import { bedOf, compareBeds, physSummary } from './phys.js';
import { canStringFull } from './state.js';

// Le tue marche: quelle delle corde che hai segnato con ★. Tra le corde che vanno nella direzione chiesta vengono prima;
// un'altra marca passa davanti solo se è nettamente migliore (il bonus vale circa 10 punti percentuali di rigidità).
export const BRAND_BONUS = 1.0;
export const prefBrands = (state, by) => new Set((state.liked || []).map((id) => by[id] && by[id].brand).filter(Boolean));

export const GOALS = [
  { key: 'same', label: 'Simile', ask: 'simile alla tua' },
  { key: 'softer', label: 'Più morbida', ask: 'più morbida' },
  { key: 'stiffer', label: 'Più rigida', ask: 'più rigida' },
  { key: 'lower', label: 'Palla più bassa', ask: 'con la palla più bassa (meno lunghe)' },
  { key: 'holds', label: 'Tiene di più', ask: 'che tiene di più la tensione' },
  { key: 'spin', label: 'Più spin', ask: 'con più spin' },
];
// valore principale che deve essere misurato o ricavato da dati per ogni domanda
const PRIMARY = { same: 'twu.stiffness', softer: 'twu.stiffness', stiffer: 'twu.stiffness', lower: 'twu.stiffness', holds: 'twu.loss', spin: 'twu.spin' };
const STOCK_ORDER = (state) => (state.stock || []).map((s) => s.id);
export const shortName = (r) => (r ? r.model : '');
const row = (rows, k) => rows.find((r) => r.key === k) || null;
const dd = (rows, k) => { const r = row(rows, k); return r ? r.diff : null; };

// Punteggio fisico per domanda: ok = va nella direzione chiesta; score più alto = migliore.
export function judgePhys(goal, rows) {
  const kNow = dd(rows, 'kNow'), kAfter = dd(rows, 'kAfter'), spin = dd(rows, 'spin'), loss = dd(rows, 'loss');
  const L = (k) => (row(rows, k) || {}).level, D = (k) => (row(rows, k) || {}).dir;
  const spinPen = spin !== null && spin < -1 ? (-spin - 1) : 0;
  switch (goal) {
    case 'same': {
      const ok = kNow !== null && L('kNow') === 'simile' && (kAfter === null || L('kAfter') === 'simile') && (spin === null || L('spin') === 'simile');
      return { ok, score: -(Math.abs(kNow || 0) / 10 + Math.abs(kAfter || 0) / 10 + Math.abs(spin || 0) / 0.5) };
    }
    case 'softer': return { ok: D('kNow') === 'meno', score: -Math.abs((kNow || 0) + 15) / 10 - spinPen };
    case 'stiffer': return { ok: D('kNow') === 'più', score: -Math.abs((kNow || 0) - 15) / 10 - spinPen };
    case 'lower': return { ok: D('launch') === 'meno', score: -Math.abs((kAfter || 0) - 15) / 10 - spinPen - Math.max(0, (kNow || 0) - 20) / 10 };
    case 'holds': return { ok: D('loss') === 'meno' && kNow !== null && Math.abs(kNow) <= 15, score: -(loss || 0) / 5 - Math.abs(kNow || 0) / 10 };
    case 'spin': return { ok: D('spin') === 'più' && kNow !== null && Math.abs(kNow) <= 15, score: (spin || 0) / 0.5 - Math.abs(kNow || 0) / 10 };
    default: return { ok: false, score: 0 };
  }
}

// Preferita più simile: numero di grandezze «simile» nella stessa fonte (misure e valori ricavati).
export function likeness(rec, likedIds, dislikedIds, ALL, meta) {
  const by = Object.fromEntries(ALL.map((r) => [r.id, r]));
  const best = (ids) => {
    let out = null;
    for (const id of ids) {
      if (id === rec.id || !by[id]) continue;
      const rows = compareTo(rec, by[id], meta);
      if (!rows.length) continue;
      const similar = rows.filter((r) => r.level === 'simile').length;
      if (!out || similar > out.similar || (similar === out.similar && rows.length > out.total)) out = { id, similar, total: rows.length };
    }
    return out;
  };
  const l = best(likedIds), d = best(dislikedIds);
  if (!l && !d) return null;
  const warn = d && d.similar >= 1 && d.similar === d.total && (!l || d.similar > l.similar) ? d.id : null;
  const good = l && l.similar * 2 >= l.total ? l : null;
  return { ...(good || { id: null, similar: 0, total: 0 }), warn };
}

const solidFor = (rec, goal) => { const v = valueOf(rec, PRIMARY[goal]); return !!v && v.est !== 'modello'; };
const estPenalty = (rows) => rows.reduce((a, r) => a + (r.est === 'modello' ? 0.3 : r.est === 'ricavata' ? 0.1 : 0), 0);

export function candidates(state, ALL, goal, meta, limit = 3) {
  const by = Object.fromEntries(ALL.map((r) => [r.id, r]));
  const ref = by[state.equipped.id];
  const kg = state.equipped.kg;
  const refBed = bedOf(ref, ref, kg);
  const refName = shortName(ref);
  const excluded = new Set([state.equipped.id, ...(state.disliked || [])]);
  const stockIds = STOCK_ORDER(state);
  const pool = ALL.filter((r) => !excluded.has(r.id) || stockIds.includes(r.id));
  const refEst = ['twu.stiffness', 'twu.loss', 'twu.spin'].map((k) => valueOf(ref, k)).filter((v) => v && v.est);
  const note = !refBed.kNow ? `Per la ${refName} non c'è nessun valore di rigidità: il confronto usa solo spin e tenuta.`
    : refEst.length ? `La ${refName} non è misurata da TWU: i suoi valori in campo sono ricavati (rigidità dalla misura Racketpedia, spin e tenuta dalla fisica). Il segno ≈ nelle frasi indica i valori ricavati della corda proposta.` : '';
  const likedNoEq = (state.liked || []).filter((id) => id !== state.equipped.id);
  const brands = prefBrands(state, by);
  const items = pool.map((rec) => {
    const bed = bedOf(rec, rec, kg);
    const rows = compareBeds(bed, refBed);
    const j = judgePhys(goal, rows);
    const solid = solidFor(rec, goal);
    return { rec, bed, rows, summary: { text: physSummary(rows, refName) }, cmpRows: compareTo(rec, ref, meta),
      compatible: j.ok && solid, score: j.score - estPenalty(rows) + (brands.has(rec.brand) ? BRAND_BONUS : 0), solid, likeness: likeness(rec, likedNoEq, state.disliked || [], ALL, meta),
      prefBrand: brands.has(rec.brand), inStock: stockIds.includes(rec.id), full: canStringFull(state, rec.id),
      equipped: rec.id === state.equipped.id, disliked: (state.disliked || []).includes(rec.id) };
  });
  const sorter = (a, b) => (b.compatible - a.compatible) || (b.score - a.score)
    || `${a.rec.brand} ${a.rec.model} ${a.rec.gauge_mm}`.localeCompare(`${b.rec.brand} ${b.rec.model} ${b.rec.gauge_mm}`);
  // in casa: prima quelle che bastano per una racchetta intera (matassina o due mezze), poi le mezze sole (vanno negli ibridi)
  const inStock = items.filter((x) => x.inStock).sort((a, b) => (b.full - a.full) || sorter(a, b));
  const toBuy = items.filter((x) => !x.inStock && x.compatible && !excluded.has(x.rec.id)).sort(sorter).slice(0, limit);
  return { mode: 'relative', note, inStock, toBuy, refName, refBed };
}

// Ibridi suggeriti. Regole fisiche (TWU, Cross): la verticale dà rigidità e morso (deve essere almeno rigida quanto
// l'orizzontale, entro il 10%); l'orizzontale liscia e tonda lascia scivolare e tornare le verticali (piccolo vantaggio).
export function suggestHybrids(state, ALL, goal, meta, limit = 3) {
  const by = Object.fromEntries(ALL.map((r) => [r.id, r]));
  const ref = by[state.equipped.id], kg = state.equipped.kg;
  const refBed = bedOf(ref, ref, kg);
  const brands = prefBrands(state, by);
  const disliked = new Set(state.disliked || []);
  const stock = [...new Set(STOCK_ORDER(state))].map((id) => by[id]).filter(Boolean);
  const okStiff = (r) => { const v = valueOf(r, 'twu.stiffness'); return !!v && v.est !== 'modello'; };
  const catalog = ALL.filter((r) => okStiff(r) && !disliked.has(r.id));
  const sameModel = (a, b) => a.brand === b.brand && a.model.toLowerCase() === b.model.toLowerCase();
  const evalPair = (V, O) => {
    if (V.id === O.id || sameModel(V, O)) return null; // stessa corda in due calibri: non è un ibrido
    const kv = valueOf(V, 'twu.stiffness'), ko = valueOf(O, 'twu.stiffness');
    if (!kv || !ko || kv.v < ko.v * 0.9) return null; // verticale più morbida dell'orizzontale: al contrario
    const bed = bedOf(V, O, kg);
    const rows = compareBeds(bed, refBed);
    const j = judgePhys(goal, rows);
    if (!j.ok) return null;
    const bb = (brands.has(V.brand) ? BRAND_BONUS / 2 : 0) + (brands.has(O.brand) ? BRAND_BONUS / 2 : 0);
    return { V, O, bed, rows, summary: { text: physSummary(rows, shortName(ref)) }, score: j.score - estPenalty(rows) + (bed.roundCross ? 0.3 : 0) + bb,
      inStock: [stockHas(state, V.id), stockHas(state, O.id)] };
  };
  // una coppia sola per combinazione di corde (il verso migliore), poi le migliori
  const best = (pairs) => {
    const byPair = new Map();
    for (const p of pairs.filter(Boolean)) { const k = [p.V.id, p.O.id].sort().join('|'); if (!byPair.has(k) || byPair.get(k).score < p.score) byPair.set(k, p); }
    return [...byPair.values()].sort((a, b) => b.score - a.score).slice(0, limit);
  };
  const fromStock = best(stock.flatMap((V) => stock.map((O) => evalPair(V, O))));
  const seen = new Set(fromStock.map((p) => [p.V.id, p.O.id].sort().join('|')));
  const buyOne = best(stock.flatMap((s) => catalog.filter((c) => !stock.includes(c)).flatMap((c) => [evalPair(s, c), evalPair(c, s)]))
    .filter((p) => p && !seen.has([p.V.id, p.O.id].sort().join('|'))));
  // senza corde in casa: coppie tra le corde con rigidità misurata da TWU (due mezze da comprare)
  const measured = catalog.filter((r) => r.lab && r.lab.twu && r.lab.twu.stiffness != null);
  const buyBoth = stock.length ? [] : best(measured.flatMap((V) => measured.map((O) => evalPair(V, O))));
  return { fromStock, buyOne, buyBoth, refBed };
}
const stockHas = (state, id) => (state.stock || []).some((x) => x.id === id);
