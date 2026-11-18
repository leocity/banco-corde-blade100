// «Prossima»: quali corde proporre per la domanda scelta, prima quelle in casa. Puro, testato (design v6 §5.4, §12.1).
import { compareTo, summarize } from './cmp.js';

export const GOALS = [
  { key: 'same', label: 'Simile', ask: 'simile alla tua' },
  { key: 'softer', label: 'Più morbida', ask: 'più morbida' },
  { key: 'stiffer', label: 'Più rigida', ask: 'più rigida' },
  { key: 'holds', label: 'Tiene di più la tensione', ask: 'che tiene di più la tensione' },
  { key: 'spin', label: 'Più spin', ask: 'con più spin potenziale' },
];
// Domande TWU: grandezza, direzione voluta, «migliore» = valore più basso o più alto.
const TWU_GOAL = { holds: { key: 'twu.loss', field: 'loss', want: 'meno', better: (a, b) => a - b, word: 'perde', unit: '%' },
  spin: { key: 'twu.spin', field: 'spin', want: 'più', better: (a, b) => b - a, word: 'spin', unit: '' } };
const STOCK_ORDER = (state) => (state.stock || []).map((s) => s.id);
export const shortName = (r) => (r ? r.model : '');
const hasLab = (r) => !!(r && r.lab && (r.lab.twu || r.lab.rp || r.lab.excel));

// Preferita più simile: numero di grandezze «simile» nella stessa fonte (decisive + Excel), calibro e forma esclusi.
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
  return { ...(l || { id: null, similar: 0, total: 0 }), warn };
}

function judge(goal, rows) {
  const dec = rows.filter((r) => r.decides);
  if (goal === 'same') return { ok: dec.length > 0 && dec.every((r) => r.level === 'simile'), confirm: dec.length };
  if (goal === 'softer' || goal === 'stiffer') {
    const want = goal === 'stiffer' ? 'più' : 'meno';
    const st = dec.filter((r) => r.group === 'stiffness');
    const yes = st.filter((r) => r.dir === want).length, no = st.filter((r) => r.dir && r.dir !== want).length;
    return { ok: yes > 0 && no === 0, confirm: yes };
  }
  const g = TWU_GOAL[goal];
  const r = dec.find((x) => x.key === g.key);
  return { ok: !!r && r.dir === g.want, confirm: r && r.dir === g.want ? 1 : 0 };
}

export function candidates(state, ALL, goal, meta, limit = 3) {
  const by = Object.fromEntries(ALL.map((r) => [r.id, r]));
  const ref = by[state.equipped.id];
  const refName = shortName(ref);
  const excluded = new Set([state.equipped.id, ...(state.disliked || [])]);
  const stockIds = STOCK_ORDER(state);
  const pool = ALL.filter((r) => !excluded.has(r.id));
  let mode = 'relative', note = '';
  let refs = [ref];
  if (!hasLab(ref)) {
    note = `La ${refName} non ha nessuna misura di laboratorio: `;
    if (goal === 'same') { refs = (state.liked || []).map((id) => by[id]).filter((r) => hasLab(r) && r.id !== ref.id); note += 'ti mostro le corde simili alle tue preferite.'; }
    else note += 'il confronto diretto non è possibile.';
  }
  const g = TWU_GOAL[goal];
  const refTwu = g && ref && ref.lab && ref.lab.twu && typeof ref.lab.twu[g.field] === 'number';
  let ranked = null;
  if (g && !refTwu) {
    mode = 'absolute';
    note = `La ${refName} non è misurata da TWU: ti mostro le corde ${goal === 'holds' ? 'che perdono meno tensione' : 'con più spin potenziale'} tra quelle misurate da TWU (il quarto migliore).`;
    const measured = ALL.filter((r) => r.lab && r.lab.twu && typeof r.lab.twu[g.field] === 'number').sort((a, b) => g.better(a.lab.twu[g.field], b.lab.twu[g.field]));
    ranked = new Map(measured.map((r, i) => [r.id, { pos: i + 1, n: measured.length, value: r.lab.twu[g.field] }]));
  }
  const cut = ranked ? Math.ceil(ranked.size / 4) : 0;
  const items = pool.map((rec) => {
    const rows = refs[0] ? compareTo(rec, refs[0], meta) : [];
    let ok = false, confirm = 0, rank = null;
    if (mode === 'absolute') { rank = ranked.get(rec.id) || null; ok = !!rank && rank.pos <= cut; confirm = ok ? 1 : 0; }
    else if (refs.length > 1 || (refs[0] && refs[0] !== ref)) {
      for (const rf of refs) { const j = judge(goal, compareTo(rec, rf, meta)); if (j.ok) { ok = true; confirm = Math.max(confirm, j.confirm); } }
    } else if (refs[0]) { const j = judge(goal, rows); ok = j.ok; confirm = j.confirm; }
    const lk = likeness(rec, (state.liked || []).filter((id) => id !== state.equipped.id), state.disliked || [], ALL, meta);
    const value = g && rec.lab && rec.lab.twu && typeof rec.lab.twu[g.field] === 'number' ? rec.lab.twu[g.field] : null;
    return { rec, rows, summary: summarize(rows, refName), compatible: ok, confirm, likeness: lk, rank, value, inStock: stockIds.includes(rec.id) };
  });
  const sorter = (a, b) => (b.compatible - a.compatible) || (b.confirm - a.confirm)
    || (g && a.value !== null && b.value !== null ? g.better(a.value, b.value) : 0)
    || ((b.likeness ? b.likeness.similar : 0) - (a.likeness ? a.likeness.similar : 0))
    || `${a.rec.brand} ${a.rec.model} ${a.rec.gauge_mm}`.localeCompare(`${b.rec.brand} ${b.rec.model} ${b.rec.gauge_mm}`);
  const inStock = items.filter((x) => x.inStock).sort(sorter);
  const toBuy = items.filter((x) => !x.inStock && x.compatible).sort(sorter).slice(0, limit);
  return { mode, note, inStock, toBuy, refName };
}
