// Quattro valori di riga (spin, rigidità, tenuta, controllo); la potenza non è un indice di laboratorio e sta a parte (communityRows) con affidabilità, e differenze rispetto alla montata.
import { fmt } from './format.js';
import { labStiff } from './state.js';

export const SPIN_NOTE = { misurato: 'spin potential TWU, misurato', parente: 'da calibro o colore gemello, margine ±0,5', modello: 'stima da modello su rigidità e forma, bassa affidabilità (±1,5)' };
export const STIFF_NOTE = { misurata: 'rigidità dinamica TWU, misurata', parente: 'da un calibro gemello TWU, corretta per il diametro', 'da Racketpedia': 'da Racketpedia convertita sulla scala TWU', modello: 'stima dal solo calibro, bassa affidabilità' };

export function rowValues(rec) {
  const j = rec.derived.judgments || {}, dims = rec.derived.dims || {}, inp = rec.derived.dim_inputs || {};
  const out = [];
  const sp = rec.spin;
  if (sp && sp.value !== null && sp.value !== undefined) {
    const meas = sp.kind === 'misurato';
    const word = sp.kind !== 'modello' && j.spin && j.spin.word ? ` · ${j.spin.word}` : '';
    out.push({ key: 'spin', label: 'Spin', mark: meas ? 'measured' : 'estimated', text: `${meas ? '' : '≈ '}${fmt(sp.value, 1)}${word}`, note: SPIN_NOTE[sp.kind] || sp.kind });
  } else {
    out.push({ key: 'spin', label: 'Spin', mark: 'missing', text: 'manca', note: '', why: rec.catalog_only ? 'manca: solo catalogo, nessun test di laboratorio' : 'manca: TWU non l\'ha misurata e non c\'è un calibro gemello' });
  }
  const st = rec.stiffness;
  if (st && st.value_lbin !== null && st.value_lbin !== undefined) {
    const meas = st.kind === 'misurata';
    const word = j.stiffness && j.stiffness.word ? ` · ${j.stiffness.word}` : '';
    const note = st.kind === 'da Racketpedia' && st.via === 'gemello' ? 'da Racketpedia di un calibro gemello, corretta per il diametro' : STIFF_NOTE[st.kind] || st.kind;
    out.push({ key: 'stiffness', label: 'Rigidità', mark: meas ? 'measured' : 'estimated', text: `${meas ? '' : '≈ '}${fmt(st.value_lbin, 0)} lb/in${word}`, note });
  } else {
    out.push({ key: 'stiffness', label: 'Rigidità', mark: 'missing', text: 'manca', note: '', why: 'manca: nessuna fonte (TWU, Racketpedia, gemello)' });
  }
  if (dims.durability !== null && dims.durability !== undefined) {
    const n = inp.durability || 0;
    out.push({ key: 'durability', label: 'Tenuta', mark: 'measured', text: (j.durability && j.durability.word) || `${fmt(dims.durability, 0)}`, note: `da ${n} ${n === 1 ? 'misura' : 'misure'} di laboratorio (perdita TWU, TL6/TL12 e scorrimento del tuo test)` });
  } else {
    out.push({ key: 'durability', label: 'Tenuta', mark: 'missing', text: 'manca', note: '', why: 'manca: né perdita TWU né test Excel' });
  }
  if (dims.control !== null && dims.control !== undefined) {
    const c = Math.round(dims.control);
    const cr = rec.derived.control_range;
    const margin = Array.isArray(cr) ? `; con il margine delle sue basi (rigidità stimata, un gradino dello strumento) va da ${Math.round(cr[0])} a ${Math.round(cr[1])}` : '';
    out.push({ key: 'control', label: 'Controllo', mark: 'estimated', text: `controllo ${c}`, note: `indice da ${inp.control || 0} di 3 misure (rigidità, allungamento, elasticità): non lo misura nessun laboratorio${margin}. La potenza è un valore a parte: viene dai tester, non dal laboratorio` });
  } else {
    out.push({ key: 'control', label: 'Controllo', mark: 'missing', text: 'manca', note: '', why: 'manca: nessuna delle misure che lo compongono' });
  }
  return out;
}

const DELTA_DIMS = [['spin', 'spin'], ['durability', 'tenuta'], ['control', 'controllo']];

// Differenze con la corda montata: percentili per spin, tenuta e controllo (>= 5 punti), lb/in per la rigidità (>= 10).
export function deltaVsEquipped(rec, equipped) {
  if (!equipped || rec.id === equipped.id) return { text: '', parts: [] };
  const parts = [], unclear = [];
  for (const [k, label] of DELTA_DIMS) {
    const a = rec.derived.dims[k], b = equipped.derived.dims[k];
    if (a === null || a === undefined || b === null || b === undefined) continue;
    const diff = Math.round(a - b);
    if (Math.abs(diff) < 5) continue;
    // il controllo è un indice con un margine: se gli intervalli delle due corde si sovrappongono la differenza non si può affermare
    const ra = rec.derived.control_range, rb = equipped.derived.control_range;
    if (k === 'control' && Array.isArray(ra) && Array.isArray(rb) && ra[0] <= rb[1] && rb[0] <= ra[1]) { unclear.push(label); continue; }
    parts.push({ key: k, label, diff });
  }
  const sa = labStiff(rec), sb = labStiff(equipped);
  if (sa !== null && sb !== null && Math.abs(sa - sb) >= 10) parts.push({ key: 'stiffness', label: 'lb/in', diff: Math.round(sa - sb) });
  const text = [...parts.map((p) => `${p.diff > 0 ? '+' : '−'}${Math.abs(p.diff)} ${p.label}`), ...unclear.map((l) => `${l}: entro il margine`)].join(' · ');
  return { text, parts, unclear };
}

const MINI_LEVEL = { 'molto basso': 'min', basso: 'bassa', medio: 'media', alto: 'alta', 'molto alto': 'max' };
const MINI_EM = { spin: 'spin', stiffness: 'lb/in', durability: 'tenuta', control: 'ctrl' };
function miniText(v) {
  if (v.mark === 'missing') return '—';
  if (v.key === 'control') { const m = /controllo (\d+)/.exec(v.text); return m ? m[1] : '—'; }
  const head = v.text.split(' · ')[0];
  if (v.key === 'durability') return MINI_LEVEL[head] || head;
  return v.key === 'stiffness' ? head.replace(' lb/in', '') : head;
}

// Versione breve dei quattro valori per la riga compatta: il numero (o la parola), l'unità e il marcatore.
export function miniValues(rec) {
  return rowValues(rec).map((v) => ({ key: v.key, em: MINI_EM[v.key], mark: v.mark, val: miniText(v), title: v.note || v.why || '' }));
}

// Controllo e potenza come li raccontano i tester indipendenti (forum, recensioni): due righe distinte, solo opinioni.
const COMM_ROWS = [['control', 'Controllo'], ['power', 'Potenza']];
export function communityRows(rec) {
  const c = rec.community || {};
  return COMM_ROWS.map(([key, label]) => { const v = c[key]; return { key, label, word: v ? v.word : null, n: v ? v.n : 0, split: !!(v && v.split), evidence: v ? v.evidence || [] : [] }; });
}
