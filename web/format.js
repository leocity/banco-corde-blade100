// Formati e piccoli helper condivisi. Puri: nessun accesso al DOM all'import.
export const $ = (s, el = document) => el.querySelector(s);
export const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// I formattatori si creano una volta sola: crearne uno a ogni numero costava decine di millisecondi per schermata su un telefono lento.
const nfCache = new Map();
export const NF = (d) => { if (!nfCache.has(d)) nfCache.set(d, new Intl.NumberFormat('it-IT', { minimumFractionDigits: d, maximumFractionDigits: d })); return nfCache.get(d); };
const nfMaxCache = new Map();
const nfMax = (m) => { if (!nfMaxCache.has(m)) nfMaxCache.set(m, new Intl.NumberFormat('it-IT', { maximumFractionDigits: m })); return nfMaxCache.get(m); };
export const fmt = (v, d = 1) => (v === null || v === undefined || Number.isNaN(v) ? '—' : NF(d).format(v));
export const SHAPES = { RND: 'tonda', HEX: 'esagonale', PENT: 'pentagonale', SQ: 'quadrata', OCT: 'ottagonale', GEAR: 'a ingranaggio', TWST: 'ritorta', STAR: 'a stella', TRI: 'triangolare', HEP: 'eptagonale' };
export const MARK = { measured: '●', estimated: '◐', missing: '○' };
export const nameOf = (r) => `${r.brand} ${r.model}`;
export const mmOf = (r) => (r.gauge_mm ? NF(2).format(r.gauge_mm) : r.gauge_label || '');
export const fullName = (r) => `${nameOf(r)} ${mmOf(r)}`;
export const subline = (r) => [r.gauge_mm ? `${NF(2).format(r.gauge_mm)} mm` : r.gauge_label, SHAPES[r.shape] || r.shape].filter(Boolean).join(' · ');
export const safeUrl = (u) => (/^https?:\/\//i.test(String(u || '')) ? u : '#');
// Numero con al massimo `max` decimali, senza zeri superflui (ore: "3", "1,5").
export const fmtN = (v, max = 1) => (v === null || v === undefined || Number.isNaN(v) ? '—' : nfMax(max).format(v));
