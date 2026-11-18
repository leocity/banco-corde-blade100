// Modello fisico del letto di corde (pieno o ibrido) alla tua tensione. Puro, testato.
// Ingressi per corda: rigidità dinamica TWU (lb/in, a 51 lb), perdita di tensione TWU (%), spin potenziale TWU,
// misurati o ricavati (cmp.valueOf). Uscite: rigidità appena montata, rigidità dopo il calo di tensione, lancio, spin, tenuta.
// Ipotesi dichiarate (scritte anche nei tooltip):
// - la rigidità del letto cresce con la tensione: metà dal materiale, metà dalla tensione (membrana tesa);
// - il calo di tensione in gioco segue la perdita misurata da TWU (ordine tra le corde, non ore esatte);
// - lancio: un letto più morbido trattiene di più la palla e la fa partire più alta (TWU, Cross); più rigido = più bassa;
// - ibrido: media pesata 16 verticali / 19 orizzontali; spin 60% dalle verticali (sono loro a scivolare e tornare).
import { valueOf } from './cmp.js';

export const T_REF = 23.1; // kg = 51 lb, la tensione della prova TWU
export const kAt = (k51, T) => k51 * (0.5 + (0.5 * T) / T_REF);
const KIND_RANK = { null: 0, ricavata: 1, modello: 2 };
const worst = (...xs) => xs.reduce((a, b) => (KIND_RANK[b] > KIND_RANK[a] ? b : a), null);
const w = (a, b) => (16 * a + 19 * b) / 35;

export function bedOf(V, O, kg) {
  const g = (r, k) => valueOf(r, k);
  const kV = g(V, 'twu.stiffness'), kO = g(O, 'twu.stiffness');
  const lV = g(V, 'twu.loss'), lO = g(O, 'twu.loss');
  const sV = g(V, 'twu.spin'), sO = g(O, 'twu.spin');
  const [tv, to] = kg;
  const kNow = kV && kO ? { v: w(kAt(kV.v, tv), kAt(kO.v, to)), est: worst(kV.est, kO.est) } : null;
  const loss = lV && lO ? { v: w(lV.v, lO.v), est: worst(lV.est, lO.est) } : null;
  const kAfter = kNow && lV && lO ? { v: w(kAt(kV.v, tv * (1 - lV.v / 100)), kAt(kO.v, to * (1 - lO.v / 100))), est: worst(kNow.est, loss.est) } : null;
  const spin = sV && sO ? { v: V === O ? sV.v : 0.6 * sV.v + 0.4 * sO.v, est: worst(sV.est, sO.est) } : null;
  return { V, O, kg: [tv, to], kNow, kAfter, loss, spin, roundCross: O.shape === 'RND', hybrid: V !== O };
}

// Grandezze del confronto tra due letti, con soglie (le stesse dei confronti tra corde).
export const PHYS_KEYS = [
  { key: 'kNow', label: 'Appena montata', rel: true, bands: [10, 15], up: 'più rigida', down: 'più morbida', tip: 'twu.stiffness' },
  { key: 'kAfter', label: 'Dopo il calo di tensione', rel: true, bands: [10, 15], up: 'resta più rigida', down: 'si ammorbidisce di più', tip: 'twu.loss' },
  { key: 'launch', label: 'Lancio della palla', from: 'kAfter', rel: true, bands: [10, 15], up: 'più bassa', down: 'più alta', inverse: true, tip: 'lancio' },
  { key: 'spin', label: 'Spin', rel: false, bands: [0.5, 1.0], up: 'più spin', down: 'meno spin', tip: 'twu.spin' },
  { key: 'loss', label: 'Tenuta della tensione', rel: false, bands: [5, 10], up: 'perde di più', down: 'tiene di più', tip: 'twu.loss' },
];
const WHY = {
  kNow: { più: 'Il letto cede meno all\'impatto: palla più ferma e diretta, più dura sul braccio.', meno: 'Il letto cede di più: la palla resta un attimo in più sulle corde, più comfort e un po\' più di spinta.' },
  kAfter: { più: 'Perde meno tensione, quindi dopo le prime ore resta più rigido: la sensazione cambia meno.', meno: 'Perde più tensione, quindi dopo le prime ore si ammorbidisce di più: la palla comincia a volare.' },
  launch: { più: 'Letto più rigido in gioco: la palla parte più bassa e più tesa, meno palle lunghe.', meno: 'Letto più morbido in gioco: la palla parte più alta e più lunga.' },
  spin: { più: 'Le verticali scivolano e tornano di più: la corda ti aiuta a far girare la palla.', meno: 'Le verticali scivolano e tornano di meno: meno aiuto sulla rotazione.' },
  loss: { più: 'Perde più tensione: la sensazione cambia prima, da reincordare prima.', meno: 'Tiene di più la tensione: la sensazione resta uguale più a lungo.' },
};

export function compareBeds(a, b) {
  const rows = [];
  for (const P of PHYS_KEYS) {
    const src = P.from || P.key;
    const A = a[src], B = b[src];
    if (!A || !B) continue;
    const diff = P.rel ? ((A.v - B.v) / B.v) * 100 : A.v - B.v;
    const d = Math.abs(diff);
    const level = d < P.bands[0] ? 'simile' : d <= P.bands[1] ? "un po'" : 'nettamente';
    let dir = level === 'simile' ? null : diff > 0 ? 'più' : 'meno';
    const word = dir === null ? 'simile' : dir === 'più' ? P.up : P.down;
    const est = worst(A.est, B.est);
    if (P.inverse && dir) dir = dir === 'più' ? 'meno' : 'più'; // lancio: letto più rigido = palla più bassa
    rows.push({ key: P.key, label: P.label, tip: P.tip, diff, rel: P.rel, level, dir, word, est, estA: A.est,
      why: dir === null ? 'In campo la differenza non si sente.' : WHY[P.key][P.inverse ? (dir === 'meno' ? 'più' : 'meno') : dir] });
  }
  return rows;
}

const pct = (x) => `${x > 0 ? '+' : '−'}${Math.abs(Math.round(x))}%`;
const pts = (x, d = 1) => `${x > 0 ? '+' : '−'}${Math.abs(x).toFixed(d).replace('.', ',')}`;
export const diffTxt = (r) => (r.rel ? pct(r.diff) : pts(r.diff, r.key === 'loss' ? 0 : 1));

// Frase breve: le differenze che contano, nell'ordine in cui si sentono in campo. ≈ solo se il valore della corda
// proposta è ricavato (che la montata abbia valori ricavati lo dice una nota sola).
const PHRASE = {
  kNow: { più: 'più rigida appena montata', meno: 'più morbida appena montata' },
  kAfter: { più: 'resta più rigida dopo il calo di tensione', meno: 'si ammorbidisce di più col calo di tensione' },
  launch: { più: 'palla più alta', meno: 'palla più bassa' },
  spin: { più: 'più spin', meno: 'meno spin' },
  loss: { più: 'perde di più la tensione', meno: 'tiene di più la tensione' },
};
export function physPhrase(r) {
  return `${r.level === 'nettamente' ? 'nettamente ' : ''}${PHRASE[r.key][r.dir]}${r.estA ? ' ≈' : ''}`;
}
export function physSummary(rows, refName) {
  const diff = rows.filter((r) => r.dir);
  if (!rows.length) return `Nessun valore per confrontarla con la ${refName}.`;
  if (!diff.length) return `In campo è simile alla ${refName}.`;
  // «dopo il calo» ripete «appena montata» quando vanno nello stesso verso: si tiene il lancio, che è ciò che si vede
  const shown = diff.filter((r) => !(r.key === 'kAfter' && diff.some((x) => x.key === 'launch')));
  return `Rispetto alla ${refName}: ${shown.map(physPhrase).join(', ')}.`;
}
