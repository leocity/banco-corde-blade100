// Pairing con le corde "mi piace": stesse regole e parametri di pipeline/pairing.py (parità sul fixture condiviso).
export const DIM_KEYS = ['stiffness', 'durability', 'control', 'elasticity', 'spin'];
export const WEIGHTS = { spin: 30, durability: 20, stiffness: 20, control: 15, elasticity: 15 };
export const UP_ONLY = ['spin', 'durability'];
export const TOL = 5;
export const FALLOFF = 20;
export const PENALTY = 15;
export const PENALTY_THRESHOLD = 75;
export const MIN_DIMS = 3;
const BANDS = [[80, 'Ottimo'], [60, 'Buono'], [40, 'Attenzione'], [0, 'Poco adatta']];
const DIM_IT = { stiffness: 'rigidità', durability: 'tenuta', control: 'controllo', elasticity: 'elasticità', spin: 'spin' };
const OUT_WORD = {
  stiffness: { above: 'più rigida', below: 'più morbida' }, control: { above: 'più compatta', below: 'più potente' },
  durability: { above: 'tiene di più', below: 'tiene meno' }, elasticity: { above: 'più elastica', below: 'meno elastica' },
  spin: { above: 'più spin', below: 'meno spin' },
};

export function bandFor(score) {
  return BANDS.find(([floor]) => score >= floor)[1];
}

function fitDim(v, x, dim) {
  const d = v - x;
  if (d > 0 && UP_ONLY.includes(dim)) return 100;
  const a = Math.abs(d);
  return a <= TOL ? 100 : Math.max(0, 100 * (1 - (a - TOL) / FALLOFF));
}

export function fitTo(dims, ref) {
  let num = 0, den = 0;
  for (const [dim, w] of Object.entries(WEIGHTS)) {
    const v = dims[dim], x = ref[dim];
    if (v === null || v === undefined || x === null || x === undefined) continue;
    num += w * fitDim(v, x, dim);
    den += w;
  }
  return den ? num / den : null;
}

const dirOf = (v, x) => (v - x > TOL ? 'above' : v - x < -TOL ? 'below' : 'in');
const has = (v) => v !== null && v !== undefined;

export function pairing(dims, liked, disliked, penalize = true) {
  const present = DIM_KEYS.filter((k) => has(dims[k]));
  const out = {
    score: null, band: null, n_dims: present.length, missing: DIM_KEYS.filter((k) => !has(dims[k])), no_spin: !has(dims.spin),
    best_ref: null, penalized: false, fits: Object.fromEntries(DIM_KEYS.map((k) => [k, { fit: null, dir: null }])),
  };
  if (present.length < MIN_DIMS) { out.band = 'Non valutabile'; return out; }
  const scored = liked.map((r) => [fitTo(dims, r.dims), r]).filter(([s]) => s !== null);
  if (!scored.length) { out.band = 'Senza riferimenti'; return out; }
  let [best, ref] = scored.reduce((a, b) => (b[0] > a[0] ? b : a));
  out.best_ref = ref.id;
  for (const k of present) if (has(ref.dims[k])) out.fits[k] = { fit: Math.round(fitDim(dims[k], ref.dims[k], k) * 10) / 10, dir: dirOf(dims[k], ref.dims[k]) };
  const worst = Math.max(-1, ...disliked.map((r) => fitTo(dims, r.dims)).filter((s) => s !== null));
  if (penalize && worst >= PENALTY_THRESHOLD && worst > best) { out.penalized = true; best -= PENALTY; }
  out.score = Math.max(0, Math.min(100, Math.floor(best + 0.5)));
  out.band = bandFor(out.score);
  return out;
}

// Frase breve per la scheda: cosa è in linea con la preferita più vicina e cosa se ne discosta.
export function pairingReason(res, nameOf = (id) => id) {
  const list = (ks) => ks.map((k) => DIM_IT[k]).join(', ');
  if (res.band === 'Non valutabile') return `Servono almeno ${MIN_DIMS} misure di laboratorio: mancano ${list(res.missing)}.`;
  if (res.band === 'Senza riferimenti') return 'Segna almeno una corda «mi piace» per calcolare il pairing.';
  const inLine = DIM_KEYS.filter((k) => res.fits[k].dir === 'in');
  const off = DIM_KEYS.filter((k) => res.fits[k].dir === 'above' || res.fits[k].dir === 'below').map((k) => OUT_WORD[k][res.fits[k].dir]);
  let t = `${inLine.length ? `In linea con ${nameOf(res.best_ref)}: ${list(inLine)}` : `Lontana da ${nameOf(res.best_ref)}`}`;
  if (off.length) t += `; ${off.join(', ')}`;
  if (res.no_spin) t += ' (senza spin)';
  if (res.penalized) t += ' · somiglia a una non gradita';
  return t + '.';
}
