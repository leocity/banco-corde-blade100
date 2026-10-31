// Le prove dell'utente su una corda e il confronto tra i suoi voti e le misure di laboratorio.
// Tutto qui è lettura: i voti sono opinioni e non cambiano punteggi, pairing o classifiche.
import { esc, fmtN } from './format.js';
import { CATS, MOMENTS, momentAverage, categoryMeans, spearman } from './diary.js';
import { labStiff } from './state.js';

export const LAB_MIN_STRINGS = 5;  // sotto questo numero di corde il laboratorio non si mostra
export const LAB_TRUST_N = 8;      // sotto questo numero la correlazione è dichiarata inaffidabile
const TR_SENTENCE_CATS = ['spin', 'control', 'comfort'];
const TR_VERDICT = { si: 'sì', forse: 'forse', no: 'no' };
const trMean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const trNum = (v) => typeof v === 'number' && Number.isFinite(v);
const trCat = (key) => CATS.find((c) => c.key === key);

// Le prove di una corda, dalla tensione più bassa alla più alta (a parità, la più recente prima).
export function trialsForString(trials, id) {
  return trials.filter((t) => t.id === id).sort((a, b) => a.kg[0] - b.kg[0] || String(b.from).localeCompare(String(a.from)));
}

const trCatsText = (diaries) => {
  const m = categoryMeans(diaries);
  return TR_SENTENCE_CATS.filter((k) => trNum(m[k])).map((k) => `${trCat(k).label.toLowerCase()} ${fmtN(m[k], 1)}`);
};

// «a 22,5 kg: spin 4, controllo 3 · a 23,5 kg: spin 3, controllo 4» — solo con almeno due tensioni diverse che hanno voti.
export function tensionSentence(list) {
  const groups = new Map();
  for (const t of list) if (t.diary) groups.set(t.kg[0], [...(groups.get(t.kg[0]) || []), t.diary]);
  const parts = [...groups.entries()].sort((a, b) => a[0] - b[0]).map(([kg, ds]) => [kg, trCatsText(ds)]).filter(([, c]) => c.length);
  return parts.length >= 2 ? parts.map(([kg, c]) => `a ${fmtN(kg, 2)} kg: ${c.join(', ')}`).join(' · ') : '';
}

const trDay = (s) => (s ? new Date(`${String(s).slice(0, 10)}T12:00:00Z`).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', timeZone: 'UTC' }) : '');

// Una prova senza voti, verdetto, tag o note non dice nulla: non fa una riga.
export const hasTrialContent = (d) => !!d && (Object.keys(d.ratings || {}).length > 0 || !!d.verdict || (d.tags || []).length > 0 || !!d.notes);

export function trialsSectionHtml(given) {
  const list = given.filter((t) => hasTrialContent(t.diary));
  if (!list.length) return '';
  const rows = list.map((t) => {
    const d = t.diary, moms = d ? MOMENTS.map((m) => [m.label, momentAverage(d, m.key)]).filter(([, a]) => a !== null).map(([l, a]) => `${esc(l.toLowerCase())} ${fmtN(a, 1)}`) : [];
    const when = t.to ? `${esc(trDay(t.from))}–${esc(trDay(t.to))}` : `da ${esc(trDay(t.from))} (montata)`;
    const verdict = d && d.verdict ? ` · ricomprerei: <b>${esc(TR_VERDICT[d.verdict])}</b>` : '';
    const note = d && d.notes ? `<span class="muted small">${esc(d.notes.slice(0, 160))}${d.notes.length > 160 ? '…' : ''}</span>` : '';
    return `<li><span><b>${esc(fmtN(t.kg[0], 2))}/${esc(fmtN(t.kg[1], 2))} kg</b> · ${when} · ${esc(fmtN(t.hours))} h${moms.length ? ` · ${moms.join(' · ')}` : ' · senza voti'}${verdict}</span>${note}</li>`;
  }).join('');
  const all = categoryMeans(list.filter((t) => t.diary).map((t) => t.diary));
  const avgs = CATS.filter((c) => trNum(all[c.key])).map((c) => `${esc(c.label.toLowerCase())} ${fmtN(all[c.key], 1)}`);
  const sentence = tensionSentence(list);
  return `<details class="sheet-section trials-sec" open><summary>Le tue prove (${list.length})</summary><ul class="sessions trials">${rows}</ul>`
    + (avgs.length ? `<p class="small">Medie dei tuoi voti: ${avgs.join(' · ')}.</p>` : '')
    + (sentence ? `<p class="small tsent">${esc(sentence)}. <span class="muted">Sono tue sensazioni, non misure.</span></p>` : '') + '</details>';
}

// Misura di laboratorio con cui si confronta ogni categoria di voto; sempre da dati misurati, mai dalle stime da modello sullo spin.
const TR_LAB = [
  { cat: 'spin', label: 'Spin ↔ spin TWU', measure: (r) => (r.twu && trNum(r.twu.spin_potential) ? r.twu.spin_potential : null) },
  { cat: 'control', label: 'Controllo ↔ indice di controllo', measure: (r) => (r.derived && r.derived.dims && trNum(r.derived.dims.control) ? r.derived.dims.control : null) },
  { cat: 'liveness', label: 'Mantenimento ↔ tenuta', measure: (r) => (r.derived && r.derived.dims && trNum(r.derived.dims.durability) ? r.derived.dims.durability : null) },
  { cat: 'power', label: 'Potenza ↔ 100 − controllo', measure: (r) => (r.derived && r.derived.dims && trNum(r.derived.dims.control) ? 100 - r.derived.dims.control : null) },
  { cat: 'comfort', label: 'Comfort ↔ inverso della rigidità', measure: (r) => { const s = labStiff(r); return s === null ? null : -s; } },
];

// Correlazione di rango tra i voti di fine vita e le misure: una corda conta una volta (media delle sue prove).
export function labComparison(trials, recOf) {
  const byId = new Map();
  for (const t of trials) if (t.diary && t.diary.ratings.end) byId.set(t.id, [...(byId.get(t.id) || []), t.diary.ratings.end]);
  const pairs = [];
  for (const def of TR_LAB) {
    const xs = [], ys = [];
    for (const [id, ends] of byId) {
      const rec = recOf(id), vals = ends.map((e) => e[def.cat]).filter(trNum);
      const m = rec ? def.measure(rec) : null;
      if (m !== null && vals.length) { xs.push(trMean(vals)); ys.push(m); }
    }
    const s = spearman(xs, ys);
    if (s) pairs.push({ cat: def.cat, label: def.label, r: s.r, n: s.n, few: s.n < LAB_TRUST_N });
  }
  return { pairs, show: pairs.some((p) => p.n >= LAB_MIN_STRINGS) };
}

export function labComparisonHtml(c) {
  if (!c.show) return '';
  const rows = c.pairs.map((p) => `<tr><th scope="row">${esc(p.label)}</th><td>${p.r === null ? '—' : esc(fmtN(p.r, 2))}</td><td>${p.n}</td><td>${p.few ? '<span class="muted">troppo poche corde per fidarsi</span>' : ''}</td></tr>`).join('');
  return `<table class="labcmp"><thead><tr><th>Voto ↔ misura</th><th>r</th><th>corde</th><th></th></tr></thead><tbody>${rows}</tbody></table>`;
}
