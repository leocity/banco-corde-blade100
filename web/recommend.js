// Logica pura della v3 (spec §4.3–4.6): consigli rispetto alla corda attuale, frase sulle differenze, tensione.
import { kgToLbs } from './score.js';

// stessa lista di pipeline/estimate.py (COLOURS): i colori non distinguono il modello
export const COLOURS = ['black', 'blue', 'pink', 'orange', 'ornage', 'green', 'yellow', 'white', 'neon', 'matcha', 'pom',
  'gry', 'grey', 'blk', 'bk', 'ble', 'desert', 'yl', 'pk', 'red', 'silver', 'gold', 'bronze'];
export const THRESHOLDS = { spin: 0.5, stiffness: 10, loss: 5 };
export const DEFAULT_CURRENT = { id: 'solinco-confidential-16l', kg: [22, 21] };
const RC_LAB_STIFF = ['misurata', 'parente', 'da Racketpedia'];
const RC_LAB_SPIN = ['misurato', 'parente'];
const RC_MEASURED_TWU = ['exact', 'probable'];

export function modelId(r) {
  if (r.model_id) return r.model_id;
  const base = String(r.model || '').toLowerCase().split(/[\s-]+/).filter((w) => w && !COLOURS.includes(w)).join(' ');
  return `${r.brand} ${base}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

const rcMargin = (o) => (o.low != null && o.high != null ? Math.round(((o.high - o.low) / 2) * 100) / 100 : 0);

export function values(r) {
  const s = r.spin, st = r.stiffness, t = r.twu;
  return {
    spin: s && s.value != null ? { v: s.value, approx: s.kind !== 'misurato', margin: rcMargin(s) } : null,
    stiffness: st && st.value_lbin != null ? { v: st.value_lbin, approx: st.kind !== 'misurata', margin: rcMargin(st) } : null,
    loss: t && t.tension_loss_pct != null ? { v: t.tension_loss_pct, approx: !RC_MEASURED_TWU.includes(t.match), margin: 0 } : null,
  };
}

export function candidates(all, current, likedIds, scoreOf) {
  const excluded = new Set([modelId(current), ...all.filter((r) => likedIds.includes(r.id)).map(modelId)]);
  const best = new Map();
  const gap = (r) => Math.abs((r.gauge_mm ?? 0) - (current.gauge_mm ?? 0));
  for (const r of all) {
    const score = scoreOf(r);
    if (!r.is_target || score === null || score === undefined || r.preference === 'disliked') continue;
    if (!r.spin || !RC_LAB_SPIN.includes(r.spin.kind)) continue;
    if (r.crosscheck?.verdict === 'contradicted' || r.derived?.disliked_warning) continue;
    const m = modelId(r);
    if (excluded.has(m)) continue;
    const prev = best.get(m);
    if (!prev || score > prev.score || (score === prev.score && gap(r) < gap(prev.r))) best.set(m, { r, score });
  }
  return [...best.values()].sort((a, b) => b.score - a.score || gap(a.r) - gap(b.r)).map((x) => x.r);
}

const rcNum = (v, d) => new Intl.NumberFormat('it-IT', { minimumFractionDigits: d, maximumFractionDigits: d }).format(Math.abs(v));
const rcSigned = (v, d) => `${v < 0 ? '−' : '+'}${rcNum(v, d)}`;
const RC_WORDS = {
  spin: { up: 'più spin', down: 'meno spin', same: 'spin simile', fmt: (d) => rcSigned(d, 1) },
  stiffness: { up: 'più rigida', down: 'più morbida', same: 'rigidità simile', fmt: (d) => `${rcSigned(d, 0)} lb/in` },
  loss: { up: 'perde più tensione', down: 'tiene meglio la tensione', same: 'tenuta simile', fmt: (d) => `${rcSigned(d, 0)} punti` },
};
const RC_MISSING = { spin: 'spin', stiffness: 'rigidità', loss: 'perdita di tensione' };

export function describeDelta(cand, cur) {
  const a = values(cand), b = values(cur);
  const parts = [], missing = [];
  for (const key of ['spin', 'stiffness', 'loss']) {
    if (!a[key] || !b[key]) { missing.push(key); continue; }
    const delta = a[key].v - b[key].v, approx = a[key].approx || b[key].approx, w = RC_WORDS[key];
    const margin = Math.max(a[key].margin, b[key].margin);
    let dir = delta > 0 ? 'up' : 'down', text;
    if (Math.abs(delta) < THRESHOLDS[key]) { dir = 'same'; text = w.same + (approx ? ' (stima)' : ''); }
    else if (approx && Math.abs(delta) <= margin) { dir = 'same'; text = `${w.same} (stima)`; }
    else text = `${w[dir]} (${approx ? 'circa ' : ''}${w.fmt(delta)})`;
    parts.push({ key, dir, delta, approx, text, weight: Math.abs(delta) / THRESHOLDS[key] });
  }
  parts.sort((x, y) => y.weight - x.weight);
  const shown = parts.slice(0, 3).map(({ weight, ...p }) => p);
  let sentence = shown.length && shown.every((p) => p.dir === 'same') ? 'Molto simile alla tua corda'
    : shown.map((p) => p.text).join(', ');
  sentence = sentence ? sentence[0].toUpperCase() + sentence.slice(1) : '';
  if (missing.length) sentence = `${sentence ? sentence + '. ' : ''}Mancano: ${missing.map((k) => RC_MISSING[k]).join(', ')}.`;
  return { parts: shown, missing, sentence };
}

// arrotondamento a 0,5 con pareggi al pari, come round() di Python in pipeline/derive.py (_half)
function rcHalf(x) {
  const y = x * 2, f = Math.floor(y), diff = y - f;
  const r = Math.abs(diff - 0.5) < 1e-9 ? (f % 2 === 0 ? f : f + 1) : Math.round(y);
  return r / 2 + 0;
}
const rcLabStiff = (r) => (r.stiffness && RC_LAB_STIFF.includes(r.stiffness.kind) ? r.stiffness.value_lbin : null);

// slope: kg per lb/in; la pipeline la ricava dalle due preferite (DATA.tension_slope_kg_per_lbin), altrimenti la regola v2
export function tensionFrom(cand, cur, kg, slope = -0.75 / 15) {
  const sc = rcLabStiff(cand), sb = rcLabStiff(cur);
  const corrected = sc != null && sb != null;
  const delta = corrected ? Math.max(-2, Math.min(2, rcHalf(slope * (sc - sb)))) : 0;
  const out = [kg[0] + delta, kg[1] + delta];
  return { kg: out, range: out.map((k) => [k - 1, k + 1]), lbs: out.map(kgToLbs), corrected, delta };
}

export function resolveCurrent(stored, byId, fallbackId = DEFAULT_CURRENT.id) {
  const ok = stored && typeof stored === 'object' && typeof stored.id === 'string' && byId[stored.id]
    && Array.isArray(stored.kg) && stored.kg.length === 2 && stored.kg.every((k) => typeof k === 'number' && k >= 15 && k <= 30);
  return ok ? { id: stored.id, kg: [stored.kg[0], stored.kg[1]] } : { id: fallbackId, kg: [...DEFAULT_CURRENT.kg] };
}
