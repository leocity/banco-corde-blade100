// Quattro valori di riga (spin, rigidità, tenuta); controllo e potenza non è un indice di laboratorio e sta a parte (communityRows) con affidabilità, e differenze rispetto alla montata.
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
  return out;
}

const DELTA_DIMS = [['spin', 'spin'], ['durability', 'tenuta']];

// Differenze con la corda montata: percentili per spin e tenuta (>= 5 punti), lb/in per la rigidità (>= 10).
export function deltaVsEquipped(rec, equipped) {
  if (!equipped || rec.id === equipped.id) return { text: '', parts: [] };
  const parts = [];
  for (const [k, label] of DELTA_DIMS) {
    const a = rec.derived.dims[k], b = equipped.derived.dims[k];
    if (a === null || a === undefined || b === null || b === undefined) continue;
    const diff = Math.round(a - b);
    if (Math.abs(diff) < 5) continue;
    parts.push({ key: k, label, diff });
  }
  const sa = labStiff(rec), sb = labStiff(equipped);
  if (sa !== null && sb !== null && Math.abs(sa - sb) >= 10) parts.push({ key: 'stiffness', label: 'lb/in', diff: Math.round(sa - sb) });
  const text = parts.map((p) => `${p.diff > 0 ? '+' : '−'}${Math.abs(p.diff)} ${p.label}`).join(' · ');
  return { text, parts };
}

const MINI_LEVEL = { 'molto basso': 'min', basso: 'bassa', medio: 'media', alto: 'alta', 'molto alto': 'max' };
const MINI_EM = { spin: 'spin', stiffness: 'lb/in', durability: 'tenuta' };
function miniText(v) {
  if (v.mark === 'missing') return '—';
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
