// Stato dell'utente (montata, preferite, ore, corde finite): funzioni pure che restituiscono nuovi oggetti.
const isStr = (v) => typeof v === 'string';
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const isDate = (v) => isStr(v) && !Number.isNaN(Date.parse(v));
const uniq = (xs) => [...new Set(xs)];

export function defaultState(defaults, now = new Date()) {
  return {
    v: 1,
    equipped: { id: defaults.equipped.id, kg: [...defaults.equipped.kg], since: now.toISOString(), hours0: 0 },
    liked: [...defaults.liked], disliked: [...defaults.disliked], sessions: [], lives: [],
  };
}

export function setPreference(state, id, pref) {
  const liked = state.liked.filter((x) => x !== id), disliked = state.disliked.filter((x) => x !== id);
  if (pref === 'liked') liked.push(id);
  if (pref === 'disliked') disliked.push(id);
  return { ...state, liked, disliked };
}

export function equippedHours(state) {
  return state.equipped.hours0 + state.sessions.filter((s) => s.life === state.equipped.since).reduce((a, s) => a + s.hours, 0);
}

export function addSession(state, { date, hours, note = '', ts }) {
  const session = { ts: ts ?? `${Date.now()}-${state.sessions.length}`, date, hours, note, life: state.equipped.since };
  return { ...state, sessions: [...state.sessions, session] };
}
export const removeSession = (state, ts) => ({ ...state, sessions: state.sessions.filter((s) => s.ts !== ts) });
export const editSession = (state, ts, patch) => ({ ...state, sessions: state.sessions.map((s) => (s.ts === ts ? { ...s, ...patch } : s)) });

export function changeString(state, { id, kg, date, endReason, endHours, note = '' }) {
  const life = { id: state.equipped.id, kg: [...state.equipped.kg], from: state.equipped.since, to: date, hours: endHours ?? equippedHours(state), reason: endReason, note };
  return { ...state, equipped: { id, kg: [...kg], since: date, hours0: 0 }, lives: [...state.lives, life] };
}

export function parseHours(input) {
  const s = typeof input === 'number' ? String(input) : isStr(input) ? input.trim() : '';
  if (!/^\d+([.,]\d+)?$/.test(s)) return { ok: false, reason: 'Scrivi le ore come numero, per esempio 1,5.' };
  const value = Number(s.replace(',', '.'));
  if (!(value > 0)) return { ok: false, reason: 'Le ore devono essere più di 0.' };
  if (value > 24) return { ok: false, reason: 'Al massimo 24 ore per sessione.' };
  return { ok: true, value };
}

// Rigidità usata per correggere la tensione: solo dati di laboratorio, non le stime dal solo calibro.
export function labStiff(rec) {
  const s = rec && rec.stiffness;
  return s && ['misurata', 'parente', 'da Racketpedia'].includes(s.kind) && isNum(s.value_lbin) ? s.value_lbin : null;
}

const halfAway = (x) => Math.sign(x) * Math.round(Math.abs(x));
export const kgToLbs = (kg) => Math.round(kg * 2.2046 * 2) / 2;

// Tensione di partenza dalla montata: −0,75 kg ogni +15 lb/in di rigidità in più, al massimo ±2 kg (regola empirica, non validata).
export function tensionFor(rec, equippedRec, equippedKg) {
  const a = labStiff(rec), b = labStiff(equippedRec);
  const corrected = a !== null && b !== null;
  const delta = corrected ? Math.max(-2, Math.min(2, halfAway(-0.75 * (a - b) / 15 * 2) / 2)) : 0;
  const kg = equippedKg.map((x) => x + delta);
  return { kg, lbs: kg.map(kgToLbs), low: kg.map((x) => x - 1), high: kg.map((x) => x + 1), corrected };
}

export function sanitizeState(raw, defaults, knownIds) {
  const warnings = [], known = new Set(knownIds), base = defaultState(defaults);
  if (raw === null || raw === undefined) return { state: base, warnings };
  let obj = raw;
  if (isStr(raw)) { try { obj = JSON.parse(raw); } catch { obj = null; } }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return { state: base, warnings: ['Lo stato salvato non è leggibile: riparto dalle impostazioni iniziali.'] };
  const e = obj.equipped;
  let equipped = base.equipped;
  if (e !== undefined) {
    if (e && isStr(e.id) && known.has(e.id) && Array.isArray(e.kg) && e.kg.length === 2 && e.kg.every(isNum) && isDate(e.since)) {
      equipped = { id: e.id, kg: [...e.kg], since: e.since, hours0: isNum(e.hours0) && e.hours0 >= 0 ? e.hours0 : 0 };
    } else warnings.push('La corda montata salvata non esiste più o non è valida: ho ripristinato quella iniziale.');
  }
  const ids = (v, dflt) => (Array.isArray(v) ? uniq(v.filter((x) => isStr(x) && known.has(x))) : dflt);
  const liked = ids(obj.liked, base.liked);
  const disliked = ids(obj.disliked, base.disliked).filter((x) => !liked.includes(x));
  const sessions = (Array.isArray(obj.sessions) ? obj.sessions : []).filter((s) => s && isStr(s.ts) && isDate(s.date) && isNum(s.hours) && s.hours > 0 && s.hours <= 24 && isStr(s.life))
    .map((s) => ({ ts: s.ts, date: s.date, hours: s.hours, note: isStr(s.note) ? s.note : '', life: s.life }));
  const lives = (Array.isArray(obj.lives) ? obj.lives : []).filter((l) => l && isStr(l.id) && isNum(l.hours) && l.hours >= 0 && isStr(l.from) && isStr(l.to) && Array.isArray(l.kg))
    .map((l) => ({ id: l.id, kg: [...l.kg], from: l.from, to: l.to, hours: l.hours, reason: isStr(l.reason) ? l.reason : 'consumata', note: isStr(l.note) ? l.note : '' }));
  return { state: { v: 1, equipped, liked, disliked, sessions, lives }, warnings };
}
