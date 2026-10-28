// Dati, formati e nomi condivisi da tutte le schermate.
export const DATA = window.STRINGS_DATA;
export const ALL = DATA.strings;
export const BY_ID = Object.fromEntries(ALL.map((r) => [r.id, r]));
export const LIKED_IDS = ALL.filter((r) => r.preference === 'liked').map((r) => r.id);
export const $ = (s, el = document) => el.querySelector(s);
export const $$ = (s, el = document) => [...el.querySelectorAll(s)];
export const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const store = {
  get(k, d) { try { const v = localStorage.getItem('banco-corde:' + k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem('banco-corde:' + k, JSON.stringify(v)); } catch { /* storage non disponibile */ } },
};

export const NF = (d) => new Intl.NumberFormat('it-IT', { minimumFractionDigits: d, maximumFractionDigits: d });
export const fmt = (v, d = 1) => (v === null || v === undefined || Number.isNaN(v) ? '—' : NF(d).format(v));
export const SHAPES = { RND: 'tonda', HEX: 'esagonale', PENT: 'pentagonale', SQ: 'quadrata', OCT: 'ottagonale', GEAR: 'a ingranaggio', TWST: 'ritorta', STAR: 'a stella', TRI: 'triangolare', HEP: 'eptagonale' };
export const nameOf = (r) => `${r.brand} ${r.model}`;
export const mmOf = (r) => (r.gauge_mm ? NF(2).format(r.gauge_mm) : r.gauge_label || '');
const baseName = (r) => `${nameOf(r)} ${mmOf(r)}`;
// stesse mm per due righe (es. RPM Blast "16L" del tuo file e "17" del sito, entrambe 1,25): si aggiunge l'etichetta
const DUP_NAMES = new Set(ALL.map(baseName).filter((n, i, a) => a.indexOf(n) !== i));
export const fullName = (r) => (DUP_NAMES.has(baseName(r)) && r.gauge_label ? `${baseName(r)} (${r.gauge_label})` : baseName(r));
export const subline = (r) => [r.gauge_mm ? `${NF(2).format(r.gauge_mm)} mm` : r.gauge_label, SHAPES[r.shape] || r.shape].filter(Boolean).join(' · ');
export const SPIN_KIND = { misurato: 'misurato (TWU)', parente: 'da calibro o colore gemello', modello: 'stima da modello (rigidità e forma): bassa affidabilità' };
export const STIFF_KIND = { misurata: 'misurata (TWU)', parente: 'da calibro gemello TWU, corretta per il diametro', 'da Racketpedia': 'da Racketpedia convertita sulla scala TWU', modello: 'stima dal solo calibro: bassa affidabilità' };
export const stKind = (s) => (s.via === 'gemello' ? 'da Racketpedia di un calibro gemello, corretta per il diametro' : STIFF_KIND[s.kind] || s.kind);
export const isEst = (o, measured) => !!o && o.kind !== measured;
export const safeUrl = (u) => (/^https?:\/\//i.test(String(u || '')) ? u : '#');
export const TWU_OK = ['exact', 'probable'];
