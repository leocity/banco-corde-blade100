// Diario di prova: voti 1–5 in tre momenti, setup, tensiometro, tag, note e verdetto. Funzioni pure e immutabili.
// I voti sono opinioni dell'utente: non entrano in pairing né in punteggi (solo il verdetto aggiorna le preferite, in state.js).
export const CATS = [
  { key: 'spin', label: 'Spin', hint: 'rotazione che riesci a generare' },
  { key: 'control', label: 'Controllo', hint: 'profondità e direzione' },
  { key: 'power', label: 'Potenza', hint: 'profondità senza spingere' },
  { key: 'touch', label: 'Tocco', hint: 'volée e smorzate' },
  { key: 'comfort', label: 'Comfort', hint: 'braccio e gomito' },
  { key: 'stability', label: 'Stabilità', hint: 'sui colpi decentrati' },
  { key: 'liveness', label: 'Mantenimento', hint: 'quanto resta viva' },
  { key: 'durability', label: 'Durata', hint: 'resistenza alla rottura' },
];
export const MOMENTS = [{ key: 'first', label: 'Primo colpo' }, { key: 'mid', label: 'Metà vita' }, { key: 'end', label: 'Fine vita' }];
export const TAGS = ['secca', 'spenta', 'pastosa', 'scivola', 'vibra', 'rimbalza', 'precisa', 'imprecisa-lunga', 'si-spegne-presto', 'resta-viva'];
export const SURFACES = ['terra', 'cemento', 'erba', 'indoor', 'mista'];
export const PRESTRETCH = ['nessuno', 'leggero', '10%', 'altro'];
export const VERDICTS = ['si', 'forse', 'no'];

const MAX_TAGS = 8, MAX_METER = 8, MAX_NOTES = 2000, MAX_STRINGER = 60, MAX_DELTA = 3;
const isRating = (v) => Number.isInteger(v) && v >= 1 && v <= 5;
const diaryNum = (v) => typeof v === 'number' && Number.isFinite(v);
const clip = (s, n) => (typeof s === 'string' ? s.slice(0, n) : '');
const isDay = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) && new Date(`${v}T00:00:00Z`).toISOString().slice(0, 10) === v;
const okMeter = (m) => m && diaryNum(m.hours) && m.hours >= 0 && m.hours <= 5000 && diaryNum(m.value) && m.value > 0 && m.value <= 1000;
const meterSort = (a, b) => a.hours - b.hours;
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export const emptyDiary = () => ({ setup: { strungOn: null, prestretch: null, stringer: '', surface: null }, meter: [], ratings: {}, tags: [], notes: '', verdict: null, nextKgDelta: null });

export function setRating(d, moment, cat, value) {
  if (!MOMENTS.some((m) => m.key === moment) || !CATS.some((c) => c.key === cat) || !isRating(value)) return d;
  return { ...d, ratings: { ...d.ratings, [moment]: { ...(d.ratings[moment] || {}), [cat]: value } } };
}
// Ritoccare lo stesso voto lo toglie.
export function toggleRating(d, moment, cat, value) {
  if (d.ratings[moment] && d.ratings[moment][cat] === value) {
    const { [cat]: _gone, ...rest } = d.ratings[moment];
    const { [moment]: _m, ...others } = d.ratings;
    return { ...d, ratings: Object.keys(rest).length ? { ...others, [moment]: rest } : others };
  }
  return setRating(d, moment, cat, value);
}

export const momentAverage = (d, moment) => mean(Object.values(d.ratings[moment] || {}).filter(isRating));
export function categoryMeans(diaries) {
  return Object.fromEntries(CATS.map((c) => [c.key, mean(diaries.flatMap((d) => MOMENTS.map((m) => (d.ratings[m.key] || {})[c.key]).filter(isRating)))]));
}

export function setTag(d, tag, on) {
  if (!TAGS.includes(tag)) return d;
  if (!on) return { ...d, tags: d.tags.filter((t) => t !== tag) };
  return d.tags.includes(tag) || d.tags.length >= MAX_TAGS ? d : { ...d, tags: [...d.tags, tag] };
}
export const setVerdict = (d, v) => (v === null ? { ...d, verdict: null } : VERDICTS.includes(v) ? { ...d, verdict: v } : d);
export const setNotes = (d, text) => ({ ...d, notes: clip(text, MAX_NOTES) });
export const setNextKgDelta = (d, v) => (v === null ? { ...d, nextKgDelta: null } : diaryNum(v) && Math.abs(v) <= MAX_DELTA ? { ...d, nextKgDelta: v } : d);
export function setSetup(d, patch) {
  const next = { ...d.setup };
  if ('strungOn' in patch) next.strungOn = isDay(patch.strungOn) ? patch.strungOn : null;
  if ('prestretch' in patch) next.prestretch = PRESTRETCH.includes(patch.prestretch) ? patch.prestretch : null;
  if ('stringer' in patch) next.stringer = clip(patch.stringer, MAX_STRINGER);
  if ('surface' in patch) next.surface = SURFACES.includes(patch.surface) ? patch.surface : null;
  return { ...d, setup: next };
}

// Letture del tensiometro: ore giocate e valore (sempre nella stessa unità).
export const addMeter = (d, m) => (okMeter(m) && d.meter.length < MAX_METER ? { ...d, meter: [...d.meter, { hours: m.hours, value: m.value }].sort(meterSort) } : d);
export const removeMeter = (d, i) => ({ ...d, meter: d.meter.filter((_, k) => k !== i) });
// Perdita rispetto alla lettura a 0 h (senza quella non si calcola).
export function tensionLoss(d) {
  const t0 = d.meter.find((m) => m.hours === 0);
  if (!t0) return [];
  return d.meter.filter((m) => m.hours > 0).map((m) => ({ hours: m.hours, pct: Math.round(((t0.value - m.value) / t0.value) * 1000) / 10 }));
}

function ranks(xs) {
  const idx = xs.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]), out = new Array(xs.length);
  for (let i = 0; i < idx.length;) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j += 1;
    const r = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) out[idx[k][1]] = r;
    i = j + 1;
  }
  return out;
}
// Correlazione di rango di Spearman (parità = rango medio). Meno di 3 coppie: nessun risultato.
export function spearman(xs, ys) {
  const pairs = xs.map((x, i) => [x, ys[i]]).filter(([x, y]) => diaryNum(x) && diaryNum(y));
  if (pairs.length < 3) return null;
  const a = ranks(pairs.map((p) => p[0])), b = ranks(pairs.map((p) => p[1])), n = pairs.length;
  const ma = mean(a), mb = mean(b);
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) { num += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2; }
  return da === 0 || db === 0 ? { r: null, n } : { r: Math.round((num / Math.sqrt(da * db)) * 1000) / 1000, n };
}

// Tutto ciò che arriva da db o dal browser passa da qui: voti, tag, tensioni e testi fuori norma vengono scartati.
export function sanitizeDiary(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const s = raw.setup && typeof raw.setup === 'object' && !Array.isArray(raw.setup) ? raw.setup : {};
  const ratings = {};
  for (const m of MOMENTS) {
    const src = raw.ratings && typeof raw.ratings[m.key] === 'object' && raw.ratings[m.key] ? raw.ratings[m.key] : null;
    if (!src) continue;
    const r = {};
    for (const c of CATS) if (isRating(src[c.key])) r[c.key] = src[c.key];
    if (Object.keys(r).length) ratings[m.key] = r;
  }
  return {
    setup: { strungOn: isDay(s.strungOn) ? s.strungOn : null, prestretch: PRESTRETCH.includes(s.prestretch) ? s.prestretch : null, stringer: clip(s.stringer, MAX_STRINGER), surface: SURFACES.includes(s.surface) ? s.surface : null },
    meter: (Array.isArray(raw.meter) ? raw.meter.filter(okMeter) : []).slice(0, MAX_METER).map((m) => ({ hours: m.hours, value: m.value })).sort(meterSort),
    ratings,
    tags: [...new Set(Array.isArray(raw.tags) ? raw.tags.filter((t) => TAGS.includes(t)) : [])].slice(0, MAX_TAGS),
    notes: clip(raw.notes, MAX_NOTES),
    verdict: VERDICTS.includes(raw.verdict) ? raw.verdict : null,
    nextKgDelta: diaryNum(raw.nextKgDelta) && Math.abs(raw.nextKgDelta) <= MAX_DELTA ? raw.nextKgDelta : null,
  };
}

const csvCell = (v) => { const s = v === null || v === undefined ? '' : String(v); return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const CSV_HEAD = ['corda', 'tensione_v_kg', 'tensione_h_kg', 'dal', 'al', 'ore', 'motivo', 'momento', ...CATS.map((c) => c.key), 'tag', 'note', 'verdetto', 'prossima_volta_kg', 'montaggio', 'pre_stretch', 'incordatore', 'superficie'];
// Una riga per prova e momento con voti (una sola riga, senza momento, se la prova non ha voti).
export function diaryCsv(trials, nameOf) {
  const rows = [CSV_HEAD];
  for (const t of trials) {
    const d = t.diary || emptyDiary(), moments = MOMENTS.filter((m) => d.ratings[m.key]);
    for (const m of moments.length ? moments : [null]) {
      const r = m ? d.ratings[m.key] : {};
      rows.push([nameOf(t.id), t.kg[0], t.kg[1], String(t.from || '').slice(0, 10), String(t.to || '').slice(0, 10), t.hours, t.reason, m ? m.label : '', ...CATS.map((c) => r[c.key]),
        d.tags.join(' '), d.notes, d.verdict, d.nextKgDelta, d.setup.strungOn, d.setup.prestretch, d.setup.stringer, d.setup.surface]);
    }
  }
  return rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
}
