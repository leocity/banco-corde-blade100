// Piano di prove e schede di campo: funzioni pure (nessun DOM). Stesse regole di pipeline/field_tests.py:
// le schede sono misure e giudizi PERSONALI, restano accanto al laboratorio e non entrano mai in consigli, confronti o tensioni.
// Ore e durata di una prova vengono dalle uscite registrate mentre la prova era montata (collegamento `prove.links`).

export const FEEL_KEYS = ['compactness_vs_confidential', 'snapback_vs_otoro', 'launch_angle', 'flat_control', 'arm_comfort'];
export const FEEL_LABEL = { compactness_vs_confidential: 'Compattezza (come la Confidential)', snapback_vs_otoro: 'Scatto delle verticali (come la O-Toro)',
  launch_angle: 'Lancio della palla', flat_control: 'Controllo sul piatto', arm_comfort: 'Comfort del braccio' };
export const DT_KEYS = ['0h', '24h', '4h', '8h', '12h'];
export const DT_LABEL = { '0h': 'appena montata', '24h': 'dopo 24 h a riposo', '4h': 'dopo 4 h di gioco', '8h': 'dopo 8 h di gioco', '12h': 'dopo 12 h di gioco' };
export const NOTCH = ['low', 'medium', 'deep'];
export const NOTCH_WORD = { low: 'trascurabile', medium: 'medio', deep: 'profondo' };
const pf_NOTCH_ALIAS = { low: 'low', medium: 'medium', deep: 'deep', trascurabile: 'low', medio: 'medium', profondo: 'deep' };
export const FIELD_VERDICTS = ['liked', 'ok', 'disliked'];
export const FIELD_VERDICT_WORD = { liked: 'mi piace', ok: 'va bene', disliked: 'non mi piace' };
export const SNAP_WORD = { 3: 'scatta subito', 2: 'torna lenta', 1: 'resta fuori sede' };

const pf_isStr = (v) => typeof v === 'string';
const pf_isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const pf_isId = (v) => pf_isStr(v) && /^[A-Za-z0-9_.~:@+-]{1,150}$/.test(v) && v !== '.' && v !== '..';
const pf_DAY = /^\d{4}-\d{2}-\d{2}$/;
const pf_HOUR_KEY = /^\d{1,3}h$/;
const pf_r1 = (x) => Math.round(x * 10) / 10;

// ---------- schede di campo ----------
// Scheda pulita o null se manca l'essenziale (id, corde note, tensioni). I campi non validi si tolgono, non fanno perdere la scheda.
export function sanitizeField(t, known) {
  if (!t || typeof t !== 'object' || !pf_isId(t.fid)) return null;
  if (!known.has(t.mains) || !known.has(t.cross)) return null;
  const kg = t.tension_kg;
  if (!(Array.isArray(kg) && kg.length === 2 && kg.every((v) => pf_isNum(v) && v >= 15 && v <= 35))) return null;
  const out = { fid: t.fid, setup_id: pf_isStr(t.setup_id) && t.setup_id.trim() ? t.setup_id.trim().slice(0, 80) : t.fid, mains: t.mains, cross: t.cross, tension_kg: [...kg] };
  if (pf_isStr(t.plan) && pf_isId(t.plan)) out.plan = t.plan;
  if (pf_isStr(t.date) && pf_DAY.test(t.date)) out.date = t.date;
  if (pf_isNum(t.court_temp_c) && t.court_temp_c >= -10 && t.court_temp_c <= 50) out.court_temp_c = t.court_temp_c;
  if (pf_isStr(t.surface) && t.surface.length <= 40) out.surface = t.surface;
  const dt = {};
  for (const [k, v] of Object.entries(t.dt_log || {})) if (pf_HOUR_KEY.test(k) && pf_isNum(v) && v > 0 && v < 1000) dt[k] = v;
  if (Object.keys(dt).length) out.dt_log = dt;
  if (pf_isStr(t.dt_unit) && t.dt_unit.length <= 20) out.dt_unit = t.dt_unit;
  const feel = {};
  for (const k of FEEL_KEYS) { const v = (t.feel_1_5 || {})[k]; if (Number.isInteger(v) && v >= 1 && v <= 5) feel[k] = v; }
  if (Object.keys(feel).length) out.feel_1_5 = feel;
  if ([1, 2, 3].includes(t.snapback_check_8h)) out.snapback_check_8h = t.snapback_check_8h;
  if (pf_NOTCH_ALIAS[t.notching_8h]) out.notching_8h = pf_NOTCH_ALIAS[t.notching_8h];
  if (pf_isNum(t.playability_hours) && t.playability_hours >= 0 && t.playability_hours <= 200) out.playability_hours = t.playability_hours;
  if (FIELD_VERDICTS.includes(t.verdict)) out.verdict = t.verdict;
  if (pf_isStr(t.note) && t.note.trim()) out.note = t.note.slice(0, 500);
  return out;
}
export const sanitizeFields = (xs, known) => {
  const seen = new Set(), out = [];
  for (const x of Array.isArray(xs) ? xs : []) { const t = sanitizeField(x, known); if (t && !seen.has(t.fid)) { seen.add(t.fid); out.push(t); } }
  return out.sort((a, b) => (a.fid < b.fid ? -1 : a.fid > b.fid ? 1 : 0));
};

export function saveField(state, t, known) {
  const clean = sanitizeField(t, known);
  if (!clean) return state;
  const rest = (state.fieldTests || []).filter((x) => x.fid !== clean.fid);
  return { ...state, fieldTests: [...rest, clean].sort((a, b) => (a.fid < b.fid ? -1 : 1)) };
}
export const removeField = (state, fid) => ({ ...state, fieldTests: (state.fieldTests || []).filter((x) => x.fid !== fid) });

// Calo % rispetto alla 0h (come pipeline/field_tests.dt_series): «24h» = riposo dopo la montata, le altre = ore di gioco.
export function dtSeries(dt) {
  const d = dt || {}, t0 = d['0h'];
  if (!pf_isNum(t0) || t0 <= 0) return [];
  const play = Object.keys(d).filter((k) => k !== '0h' && k !== '24h' && pf_isNum(d[k])).map((k) => [parseInt(k, 10), k]).sort((a, b) => a[0] - b[0]);
  const keys = [...(pf_isNum(d['24h']) ? [['riposo', 24, '24h']] : []), ...play.map(([h, k]) => ['gioco', h, k])];
  return keys.map(([kind, hours, key]) => ({ key, kind, hours, dt: d[key], loss: pf_r1((1 - d[key] / t0) * 100) }));
}
// Ore di gioco in cui il calo supera la soglia, interpolando tra le due misure vicine; null se non la raggiunge.
export function hoursToAlert(series, limit) {
  const pts = [[0, 0], ...series.filter((s) => s.kind === 'gioco').map((s) => [s.hours, s.loss])];
  for (let i = 1; i < pts.length; i += 1) {
    const [h0, l0] = pts[i - 1], [h1, l1] = pts[i];
    if (l1 >= limit && limit > l0) return pf_r1(h0 + ((h1 - h0) * (limit - l0)) / (l1 - l0));
  }
  return null;
}

// Formato di data/field_tests.json (per copiarlo nel repo e far girare la pipeline): senza fid, con setup_id.
export function fieldExport(tests) {
  return { _comment: 'Schede di campo scritte nella pagina Banco Corde. Da unire a data/field_tests.json (campo tests).',
    tests: (tests || []).map(({ fid, plan, ...t }) => ({ ...t, setup_id: t.setup_id || fid })) };
}

// ---------- collegamento uscite <-> prove ----------
// links: { <since della vita>: <id della prova> }. Una vita (montata o finita) appartiene a una prova se il suo inizio è collegato.
export const emptyProve = () => ({ links: {}, received: [] });
export function sanitizeProve(p) {
  const out = emptyProve();
  if (!p || typeof p !== 'object') return out;
  for (const [k, v] of Object.entries(p.links || {})) if (pf_isStr(k) && k.length <= 40 && pf_isId(v)) out.links[k] = v;
  out.received = [...new Set((Array.isArray(p.received) ? p.received : []).filter(pf_isId))];
  return out;
}
export const planOfLife = (state, since) => ((state.prove || {}).links || {})[since] || null;
export function linkPlan(state, since, planId) {
  const p = sanitizeProve(state.prove);
  if (planId) p.links[since] = planId; else delete p.links[since];
  return { ...state, prove: p };
}
const pf_lifeHours = (state, since) => (state.equipped.hours0 || 0) + state.sessions.filter((s) => s.life === since).reduce((a, s) => a + s.hours, 0);
const pf_days = (a, b) => Math.max(0, Math.round((Date.parse(b) - Date.parse(a)) / 86400000));

// Ore, uscite e giorni di una prova (somma su tutte le volte che l'hai montata). `now` per i test.
export function planUsage(state, planId, now = new Date()) {
  const links = (state.prove || {}).links || {};
  const out = { hours: 0, sessions: 0, days: 0, mounts: 0, current: false, ended: false, from: null, to: null };
  const add = (from, to, hours, sessions) => {
    out.hours += hours; out.sessions += sessions; out.days += pf_days(from, to); out.mounts += 1;
    if (!out.from || from < out.from) out.from = from;
    if (!out.to || to > out.to) out.to = to;
  };
  for (const l of state.lives || []) if (links[l.from] === planId) { add(l.from, l.to, l.hours, state.sessions.filter((s) => s.life === l.from).length); out.ended = true; }
  if (links[state.equipped.since] === planId) {
    add(state.equipped.since, now.toISOString(), pf_lifeHours(state, state.equipped.since), state.sessions.filter((s) => s.life === state.equipped.since).length);
    out.current = true;
  }
  out.hours = pf_r1(out.hours);
  return out;
}

// Ore giocate rispetto alle ore ipotizzate dal piano [min, max]: si giudica solo a prova finita (finché è montata è «in corso»).
export function hoursVsGuess(hours, guess, ended) {
  if (!Array.isArray(guess) || guess.length !== 2) return null;
  if (!ended) return hours >= guess[1] ? { word: 'già oltre l\'ipotesi', cls: 'warn' } : { word: `in corso, ${pf_r1(guess[1] - hours)} h al massimo dell'ipotesi`.replace('.', ','), cls: '' };
  if (hours < guess[0]) return { word: 'durata meno dell\'ipotesi', cls: 'warn' };
  if (hours > guess[1]) return { word: 'durata più dell\'ipotesi', cls: 'ok' };
  return { word: 'dentro l\'ipotesi', cls: 'ok' };
}

// Stato di ogni prova: montata ora, fatta (montata e tolta, oppure scheda con verdetto), da fare.
export function planStatus(state, row) {
  const u = planUsage(state, row.id);
  const verdict = (state.fieldTests || []).find((t) => t.plan === row.id && t.verdict);
  if (u.current) return { key: 'montata', word: 'montata ora', cls: 'ok', usage: u };
  if (u.ended || verdict) return { key: 'fatta', word: 'fatta', cls: '', usage: u };
  return { key: 'dafare', word: 'da fare', cls: 'est', usage: u };
}
export function nextPlanRow(state, rows) {
  const cur = rows.find((r) => planStatus(state, r).key === 'montata');
  return cur || rows.find((r) => planStatus(state, r).key === 'dafare') || null;
}

// ---------- ordine in arrivo ----------
// «È arrivato»: ogni busta dà una mezza di verticali e una di orizzontali; si aggiungono alla scorta una volta sola.
export function receiveOrder(state, order) {
  if (!order || !pf_isId(order.key)) return state;
  const p = sanitizeProve(state.prove);
  if (p.received.includes(order.key)) return state;
  const stock = [...(state.stock || [])];
  for (const [id, n] of Object.entries(order.halves || {})) {
    const i = stock.findIndex((x) => x.id === id && x.size === 'mezza');
    if (i >= 0) stock[i] = { ...stock[i], n: Math.min(99, stock[i].n + n) }; else stock.push({ id, size: 'mezza', n: Math.min(99, n) });
  }
  return { ...state, stock, prove: { ...p, received: [...p.received, order.key] } };
}
export const orderReceived = (state, key) => !!key && ((state.prove || {}).received || []).includes(key);

// Mezze da togliere dalla scorta montando una prova ibrida (le full le gestisce il dialogo con «due mezze»).
export function useHybridHalves(state, row) {
  if (!row || row.kind !== 'hybrid') return state;
  let stock = [...(state.stock || [])];
  for (const [id, origin] of [[row.main, row.from[0]], [row.cross, row.from[1]]]) {
    if (origin === 'da_comprare') continue;
    const i = stock.findIndex((x) => x.id === id && x.size === 'mezza');
    if (i >= 0) stock[i] = { ...stock[i], n: stock[i].n - 1 };
  }
  stock = stock.filter((x) => x.n >= 1);
  return { ...state, stock };
}
