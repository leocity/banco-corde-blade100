// Valutatore di usura: ore giocate / vita attesa. La vita attesa di partenza è un'ipotesi non misurata (spec §9).
import { equippedHours } from './state.js';

const DAY = 86400000;
const median = (xs) => { const s = [...xs].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const hasT = (t) => t !== null && t !== undefined && Number.isFinite(t);
const r2 = (x) => Math.round(x * 100) / 100;
const band = (hours, spread) => ({ hours, low: r2(hours * (1 - spread)), high: r2(hours * (1 + spread)) });

export function priorLife(tenuta) {
  return { ...(hasT(tenuta) ? band(8 + 0.12 * tenuta, 0.25) : band(14, 0.4)), basis: 'ipotesi' };
}

// Vita attesa: la mediana delle tue ore finali per la stessa corda; con 3+ corde diverse la scala dell'ipotesi; altrimenti l'ipotesi.
export function lifeEstimate(tenuta, lives, stringId, tenutaOf) {
  const done = lives.filter((l) => l.reason === 'consumata' && l.hours > 0);
  const same = done.filter((l) => l.id === stringId);
  if (same.length) return { ...band(median(same.map((l) => l.hours)), 0.25), basis: 'tua corda', n: same.length };
  const scaled = done.filter((l) => hasT(tenutaOf(l.id)));
  if (new Set(scaled.map((l) => l.id)).size >= 3) {
    const ratio = median(scaled.map((l) => l.hours / priorLife(tenutaOf(l.id)).hours));
    return { ...band(priorLife(tenuta).hours * ratio, 0.25), basis: 'tuo storico', n: scaled.length };
  }
  return { ...priorLife(tenuta), n: 0 };
}

export function wearBand(ratio) {
  return ratio < 0.4 ? 'Fresca' : ratio < 0.7 ? 'In uso' : ratio <= 1 ? 'Da controllare' : 'Da cambiare';
}

// Media delle ultime 4 settimane; 4,5 (dal profilo) se non c'è nessuna sessione recente.
export function hoursPerWeek(sessions, now, fallback = 4.5) {
  const from = now.getTime() - 28 * DAY;
  const recent = sessions.filter((s) => { const t = Date.parse(s.date); return t >= from && t <= now.getTime() + DAY; });
  return recent.length ? recent.reduce((a, s) => a + s.hours, 0) / 4 : fallback;
}

export function projectedChange(hoursLeft, perWeek, now) {
  if (hoursLeft <= 0) return new Date(now.getTime());
  if (!(perWeek > 0)) return null;
  return new Date(now.getTime() + (hoursLeft / perWeek) * 7 * DAY);
}

export function wearStatus({ state, tenuta, tenutaOf, now }) {
  const life = lifeEstimate(tenuta, state.lives, state.equipped.id, tenutaOf);
  const hours = equippedHours(state), ratio = hours / life.hours, hoursLeft = Math.max(0, life.hours - hours), perWeek = hoursPerWeek(state.sessions, now);
  const change = projectedChange(hoursLeft, perWeek, now);
  return { hours, life, ratio, band: wearBand(ratio), hoursLeft, perWeek, changeBy: change ? change.toISOString() : null,
    daysSince: Math.max(0, Math.floor((now.getTime() - Date.parse(state.equipped.since)) / DAY)) };
}
