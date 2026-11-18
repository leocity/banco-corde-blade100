// Confronto «questa corda contro la montata» solo su misure di laboratorio (blocco `lab` della pipeline).
// Regole (design v6 §5.2): stessa fonte, nessuna conversione tra fonti, nessuna stima, soglie dichiarate.
import { NF } from './format.js';

const STIFF_WHY_UP = 'Il letto cede meno quando colpisci: di solito più stabilità e meno comfort per il braccio.';
const STIFF_WHY_DOWN = 'Il letto cede di più quando colpisci: la palla resta un attimo in più sulle corde, di solito più comfort. L\'effetto sulla velocità della palla è piccolo.';

// Ogni grandezza: dove si legge, fonte, unità, come si misura la differenza, soglie (un po', nettamente), parole e perché.
export const CMP_KEYS = {
  'twu.stiffness': {
    get: (l) => l.twu && l.twu.stiffness, source: 'TWU', group: 'stiffness', unit: 'lb/in', dec: 0, decides: true,
    diff: (a, b) => ((a - b) / b) * 100, bands: [10, 15], diffUnit: '%',
    up: 'più rigida', down: 'più morbida', whyUp: STIFF_WHY_UP, whyDown: STIFF_WHY_DOWN, label: 'Rigidità in gioco',
  },
  'rp.kgmm': {
    get: (l) => l.rp && l.rp.kgmm, source: 'Racketpedia', group: 'stiffness', unit: 'kg/mm', dec: 2, decides: true,
    diff: (a, b) => a - b, bands: [0.1, 0.2], diffUnit: 'kg/mm',
    up: 'più rigida', down: 'più morbida', whyUp: STIFF_WHY_UP, whyDown: STIFF_WHY_DOWN, label: 'Rigidità a riposo',
  },
  'twu.loss': {
    get: (l) => l.twu && l.twu.loss, source: 'TWU', group: 'loss', unit: '%', dec: 0, decides: true,
    diff: (a, b) => a - b, bands: [5, 10], diffUnit: 'punti',
    up: 'perde più tensione', down: 'tiene meglio la tensione',
    whyUp: 'Dopo i primi colpi il letto si allenta di più: la sensazione cambia prima.',
    whyDown: 'Il letto si allenta meno dopo i primi colpi: la sensazione resta più costante nel tempo.', label: 'Perdita di tensione',
  },
  'twu.spin': {
    get: (l) => l.twu && l.twu.spin, source: 'TWU', group: 'spin', unit: '', dec: 1, decides: true,
    diff: (a, b) => a - b, bands: [0.5, 1.0], diffUnit: '',
    up: 'più spin potenziale', down: 'meno spin potenziale',
    whyUp: 'Le corde verticali scivolano e tornano al loro posto più facilmente (misura TWU). Quanto spin fai dipende soprattutto dal tuo colpo.',
    whyDown: 'Le corde verticali scivolano e tornano al loro posto meno facilmente (misura TWU). Quanto spin fai dipende soprattutto dal tuo colpo.', label: 'Spin potenziale',
  },
  'excel.stretch50': {
    get: (l) => l.excel && l.excel.stretch50, source: 'il tuo test Excel', group: 'stretch', unit: '%', dec: 1, decides: false,
    diff: (a, b) => a - b, bands: null, diffUnit: 'punti',
    up: 'si allunga di più', down: 'si allunga di meno',
    whyUp: 'Nel tuo test statico cede più tensione appena montata. Non concorda con le altre fonti: è solo un\'informazione.',
    whyDown: 'Nel tuo test statico cede meno tensione appena montata. Non concorda con le altre fonti: è solo un\'informazione.', label: 'Allungamento a 50 lb',
  },
};
const ORDER = Object.keys(CMP_KEYS);
const LEVEL_RANK = { simile: 0, "un po'": 1, nettamente: 2 };

export function levelOf(key, a, b, meta = {}) {
  const k = CMP_KEYS[key];
  const d = Math.abs(k.diff(a, b));
  const bands = k.bands || [meta.excel_stretch50_sd ?? 1, meta.excel_stretch50_sd ?? 1];
  const eps = 1e-9; // 0,90 − 0,75 in virgola mobile non deve finire sotto 0,15
  return d < bands[0] - eps ? 'simile' : d <= bands[1] + eps && bands[0] !== bands[1] ? "un po'" : 'nettamente';
}

// Una riga per grandezza misurata in entrambe le corde. `a` è la corda in esame, `b` il riferimento (la montata).
export function compareTo(a, b, meta = {}) {
  const la = a && a.lab, lb = b && b.lab;
  if (!la || !lb) return [];
  const rows = [];
  for (const key of ORDER) {
    const k = CMP_KEYS[key];
    const va = k.get(la), vb = k.get(lb);
    if (typeof va !== 'number' || typeof vb !== 'number' || !Number.isFinite(va) || !Number.isFinite(vb)) continue;
    const level = levelOf(key, va, vb, meta);
    const raw = k.diff(va, vb);
    const dir = level === 'simile' ? null : raw > 0 ? 'più' : 'meno';
    rows.push({ key, source: k.source, group: k.group, label: k.label, a: va, b: vb, unit: k.unit, dec: k.dec, delta: raw, diffUnit: k.diffUnit,
      level, dir, decides: k.decides, word: dir === null ? 'simile' : dir === 'più' ? k.up : k.down,
      why: dir === 'meno' ? k.whyDown : dir === 'più' ? k.whyUp : 'Differenza sotto la soglia: nelle misure non si distinguono.' });
  }
  return rows;
}

// Accordo tra le due misure di rigidità (TWU in gioco, Racketpedia a riposo), quando ci sono tutte e due.
export function agreement(rows) {
  const st = rows.filter((r) => r.group === 'stiffness');
  if (st.length < 2) return { stiffness: null };
  const dirs = st.map((r) => r.dir);
  if (dirs[0] && dirs[1] && dirs[0] !== dirs[1]) return { stiffness: 'disaccordo' };
  if (dirs[0] === dirs[1]) return { stiffness: 'concordano' };
  return { stiffness: 'in parte' };
}

const fmtDelta = (r) => {
  const v = Math.abs(r.delta);
  if (r.key === 'twu.stiffness') return `${NF(0).format(v)}%`;
  return `${NF(r.dec === 0 ? 0 : r.key === 'rp.kgmm' ? 2 : 1).format(v)}${r.diffUnit ? ` ${r.diffUnit}` : ''}`;
};

// Frase per il giocatore. `refName` è il nome breve della montata (es. «Slap»).
export function summarize(rows, refName) {
  const dec = rows.filter((r) => r.decides);
  if (!dec.length) return { kind: 'none', text: `Non confrontabile con le misure: nessuna misura di laboratorio in comune con la ${refName}.` };
  const ag = agreement(rows);
  const parts = [];
  for (const g of ['stiffness', 'loss', 'spin']) {
    const rs = dec.filter((r) => r.group === g && r.dir);
    if (!rs.length) continue;
    if (g === 'stiffness' && ag.stiffness === 'disaccordo') { parts.push('rigidità: le fonti non concordano'); continue; }
    const best = rs.sort((x, y) => LEVEL_RANK[y.level] - LEVEL_RANK[x.level])[0];
    const lv = best.level === 'nettamente' ? 'nettamente ' : "un po' ";
    parts.push(`${lv}${best.word} (${rs.map((r) => `${r.source} ${r.dir === 'più' ? '+' : '−'}${fmtDelta(r)}`).join(', ')})`);
  }
  if (!parts.length) return { kind: 'same', text: `Nelle misure in comune è simile alla ${refName}.` };
  return { kind: 'diff', text: `Rispetto alla ${refName}: ${parts.join('; ')}.` };
}

export const UNKNOWN = 'Controllo e potenza non sono misure: nessuna fonte di laboratorio li misura.';
