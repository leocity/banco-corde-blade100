import { profileScore, DEFAULT_WEIGHTS, DISLIKED_THRESHOLD, dislikedFlag } from './score.js';

const DATA = window.STRINGS_DATA;
const ALL = DATA.strings;
const BY_ID = Object.fromEntries(ALL.map((r) => [r.id, r]));
const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const store = {
  get(k, d) { try { const v = localStorage.getItem('banco-corde:' + k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem('banco-corde:' + k, JSON.stringify(v)); } catch { /* storage non disponibile */ } },
};

/* ---------- formati ---------- */
const NF = (d) => new Intl.NumberFormat('it-IT', { minimumFractionDigits: d, maximumFractionDigits: d });
const fmt = (v, d = 1) => (v === null || v === undefined || Number.isNaN(v) ? '—' : NF(d).format(v));
const fmtH = (v, d = 1) => (v === null || v === undefined || Number.isNaN(v) ? '<span class="na" title="Non testato da questa fonte">—</span>' : NF(d).format(v));
const SHAPES = { RND: 'tonda', HEX: 'esagonale', PENT: 'pentagonale', SQ: 'quadrata', OCT: 'ottagonale', GEAR: 'a ingranaggio', TWST: 'ritorta', STAR: 'a stella', TRI: 'triangolare', HEP: 'eptagonale' };
const nameOf = (r) => `${r.brand} ${r.model}`;
const mmOf = (r) => (r.gauge_mm ? NF(2).format(r.gauge_mm) : r.gauge_label || '');
const fullName = (r) => `${nameOf(r)} ${mmOf(r)}`;
const subline = (r) => [r.gauge_mm ? `${NF(2).format(r.gauge_mm)} mm` : r.gauge_label, SHAPES[r.shape] || r.shape].filter(Boolean).join(' · ');
const SPIN_KIND = { misurato: 'misurato', parente: 'da calibro/colore gemello', tester: 'stimato dai tester', qualitativo: 'stimato dai giudizi', modello: 'stima da modello (rigidità e forma): bassa affidabilità' };
const STIFF_KIND = { misurata: 'misurata (TWU)', parente: 'da riga TWU di un calibro gemello, corretta per il diametro', 'da Racketpedia': 'da Racketpedia convertita sulla scala TWU', modello: 'stima dal solo calibro: bassa affidabilità' };
const stKind = (s) => (s.via === 'gemello' ? 'da Racketpedia di un calibro gemello, corretta per il diametro' : STIFF_KIND[s.kind] || s.kind);
const isEst = (o, measured) => o && o.kind !== measured;
const LEVEL_WORD = ['molto basso', 'basso', 'medio', 'alto', 'molto alto'];
const spinWord = (r) => (r.spin && r.spin.level != null ? LEVEL_WORD[Math.max(0, Math.min(4, Math.round(r.spin.level) - 1))] : null);
const labSpin = (r) => !!r.spin && ['misurato', 'parente'].includes(r.spin.kind);
const hasLab = (r) => !r.catalog_only && labSpin(r);
const safeUrl = (u) => (/^https?:\/\//i.test(String(u || '')) ? u : '#');

/* ---------- punteggio live ---------- */
let weights = { ...DEFAULT_WEIGHTS, ...store.get('weights', {}) };
const bestLiked = (r) => { const v = Object.values(r.derived.similarity_liked || {}).filter((x) => x !== null); return v.length ? Math.max(...v) : null; };
const worstDisliked = (r) => {
  if (r.preference) return null;
  const v = Object.values(r.derived.similarity_disliked || {}).filter((x) => x !== null);
  const w = v.length ? Math.max(...v) : null;
  return dislikedFlag(bestLiked(r), w) ? w : null;
};
function rescore() {
  for (const r of ALL) {
    const sub = r.derived.subscores, pen = worstDisliked(r), sr = r.derived.subscores_range;
    r._score = profileScore(sub, weights, pen);
    // margine dello spin (gemello ±0,5) propagato nel punteggio
    r._lo = sr && r._score !== null ? profileScore({ ...sub, spin: sr.spin[0] }, weights, pen) : null;
    r._hi = sr && r._score !== null ? profileScore({ ...sub, spin: sr.spin[1] }, weights, pen) : null;
  }
}
const scoreRange = (r) => (r._lo !== null && r._hi !== null && r._hi - r._lo >= 2 ? `tra ${r._lo} e ${r._hi}` : 'su 100');
rescore();

/* ---------- componenti ---------- */
const CRIT = [['stiffness', 'Rigidità'], ['spin', 'Spin'], ['durability', 'Tenuta']];
const CRIT_PROXY = [['control', 'Controllo'], ['comfort', 'Comfort']];
const BAR_TITLE = {
  stiffness: 'Posizione tra le corde del banco (rigidità dinamica TWU)',
  spin: 'Posizione tra le corde del banco (spin potential TWU)',
  durability: 'Posizione tra le corde del banco (perdita di tensione TWU e, dove c\'è, TL6 del tuo test)',
  control: 'Stima: segue la rigidità (e l\'allungamento a 50 lb del tuo test, se presente). Non è misurato',
  comfort: 'Stima: opposto della rigidità. Non è misurato',
};
function barRow(r, k, l, proxy) {
  const x = (r.derived.judgments || {})[k] || {};
  const est = proxy || (k === 'spin' && isEst(r.spin, 'misurato')) || (k === 'stiffness' && isEst(r.stiffness, 'misurata')) || x.lab_share === 0;
  const has = x.score !== null && x.score !== undefined;
  return `<div class="bar-row" title="${esc(BAR_TITLE[k])}"><span class="lab">${l}</span><div class="track"><div class="fill${k === 'stiffness' ? ' neutral' : ''}${est ? ' est' : ''}" style="width:${x.score ?? 0}%"></div></div><span class="word">${x.word ? `<b>${esc(x.word)}</b>` : '<span class="muted">n.d.</span>'}<span class="num">${has ? Math.round(x.score) : ''}</span></span></div>`;
}
function bars(r) {
  return `<div class="bars">${CRIT.map(([k, l]) => barRow(r, k, l, false)).join('')}
    <details class="proxy-bars"><summary>Stime dalla rigidità</summary>${CRIT_PROXY.map(([k, l]) => barRow(r, k, `${l} (stima)`, true)).join('')}<p class="muted small">Controllo e comfort non sono misurati da nessuna fonte: seguono la rigidità. Le barre tratteggiate sono stime.</p></details></div>`;
}
function badges(r) {
  const out = [];
  if (r.preference === 'liked') out.push('<span class="badge liked">★ preferita</span>');
  if (r.preference === 'disliked') out.push('<span class="badge disliked">✕ non gradita</span>');
  const labAny = Object.values(r.derived.judgments || {}).some((j) => j && j.lab_share > 0);
  if (r.catalog_only && !labAny) out.push('<span class="badge est" title="Nessun test di laboratorio: non viene giudicata">senza test di laboratorio</span>');
  else if (r.catalog_only) out.push('<span class="badge est" title="Non testata direttamente: i dati di laboratorio vengono da un calibro gemello">dati da calibro gemello</span>');
  if (r.spin && isEst(r.spin, 'misurato')) out.push(`<span class="badge est" title="Spin ${esc(SPIN_KIND[r.spin.kind])}">${r.spin.value == null ? 'spin solo dai tester' : r.spin.kind === 'modello' ? 'spin da modello' : 'spin stimato'}</span>`);
  if (r.derived.disliked_warning) out.push('<span class="badge warn" title="Somiglia più a una corda che non ti è piaciuta che alle tue preferite">⚠ simile a una non gradita</span>');
  if (r.production?.reason) out.push(`<span class="badge warn" title="Resta solo come tuo riferimento">${esc(r.production.reason)}</span>`);
  else if (r.production && r.production.year == null) out.push('<span class="badge" title="Anno di uscita non trovato: verifica che non sia un modello datato">anno da verificare</span>');
  if (r.production?.status === 'unclear') out.push('<span class="badge" title="Non è chiaro se sia ancora in vendita: verifica prima di comprare">produzione da verificare</span>');
  if (r.crosscheck?.verdict === 'contradicted') out.push('<span class="badge warn" title="Recensioni e produttori contraddicono i numeri di laboratorio">⚑ dati contestati</span>');
  return out.join(' ');
}
const tensionText = (r) => { const t = r.derived.tension_start; return t ? `${fmt(t.kg[0], 1)}/${fmt(t.kg[1], 1)} kg · ${fmt(t.lbs[0], 1)}/${fmt(t.lbs[1], 1)} lbs` : '—'; };
function why(r) {
  const j = r.derived.judgments || {};
  const strong = [['spin', 'spin'], ['durability', 'tenuta']]
    .filter(([k]) => (j[k]?.level || 0) >= 4).map(([, l]) => l);
  const parts = [];
  if (strong.length) parts.push(`Alta in ${strong.join(' e ')}`);
  if (j.stiffness?.word) parts.push(`rigidità ${j.stiffness.word.replace('molto ', 'molto ')}`);
  const sl = r.derived.similarity_liked || {};
  const best = Object.entries(sl).filter(([, v]) => v !== null).sort((a, b) => b[1] - a[1])[0];
  if (best && best[1] >= 50) parts.push(`affinità ${best[1]}/100 con la tua ${best[0] === 'confidential' ? 'Confidential' : 'O-Toro'} (su ${(r.derived.similarity_basis || {})[best[0]] ?? '—'} misure)`);
  return parts.join(' · ') || 'Profilo nella media';
}
function card(r, opts = {}) {
  return `<article class="scard">
    ${opts.rank ? `<span class="rank-tag">${opts.rank}</span>` : ''}
    <div class="scard-head"><span class="scard-name">${esc(nameOf(r))}</span><span class="scard-score">${fmt(r._score, 0)}<small>${scoreRange(r)}</small></span><span class="scard-sub">${esc(subline(r))}</span></div>
    <div class="badges">${badges(r)}</div>
    ${opts.why ? `<p class="why">${esc(why(r))}</p>` : ''}
    ${bars(r)}
    <p class="tension-line" title="Stima con regola empirica: parte dalla tua preferita più simile e corregge per la rigidità. Non è una misura.">Tensione di partenza <span class="badge est">stima</span> <b class="num">${tensionText(r)}</b> <span class="muted small">±1 kg</span></p>
    <div class="card-actions"><button class="btn primary" type="button" data-open="${esc(r.id)}">Scheda</button><button class="btn" type="button" data-compare="${esc(r.id)}">Confronta</button><button class="btn" type="button" data-open="${esc(r.id)}" data-section="fonti">Da dove vengono i dati</button></div>
  </article>`;
}

const BADGE_LEGEND = [
  ['<span class="badge liked">★ preferita</span>', 'Una delle tue due preferite (riferimento).'],
  ['<span class="badge disliked">✕ non gradita</span>', 'Una delle tue due non gradite (riferimento negativo).'],
  ['<span class="badge est">spin stimato</span>', 'Spin da un gemello (altro calibro o colore), margine ±0,5: conta nel punteggio.'],
  ['<span class="badge est">spin da modello</span>', 'Spin stimato da rigidità e forma (±1,5): non conta nel punteggio.'],
  ['<span class="badge est">dati da calibro gemello</span>', 'Non testata direttamente: i dati vengono da un gemello.'],
  ['<span class="badge est">senza test di laboratorio</span>', 'Nessuna misura: solo catalogo, nessun giudizio.'],
  ['<span class="badge est">stima</span>', 'Valore non misurato (per esempio la tensione di partenza).'],
  ['<span class="badge warn">⚠ simile a una non gradita</span>', 'Somiglia più a una corda che non ti è piaciuta che alle tue preferite.'],
  ['<span class="badge warn">⚑ dati contestati</span>', 'Fonti esterne contraddicono i numeri di laboratorio.'],
  ['<span class="badge">anno da verificare</span>', 'Anno di uscita non trovato: controlla che non sia un modello datato.'],
  ['<span class="badge">produzione da verificare</span>', 'Non è chiaro se sia ancora in vendita.'],
];
const legendHtml = () => `<details class="advanced"><summary>Legenda dei badge</summary>${BADGE_LEGEND.map(([b, d]) => `<div class="leg-row">${b}<span class="small">${d}</span></div>`).join('')}</details>`;

/* ---------- navigazione ---------- */
const TABS = ['perte', 'mappa', 'confronta', 'esplora', 'guida'];
function showTab(id) {
  if (!TABS.includes(id)) id = 'perte';
  for (const t of TABS) { $('#' + t).hidden = t !== id; const b = $('#tab-' + t); if (b) b.setAttribute('aria-selected', String(t === id)); }
  store.set('tab', id);
  if (id === 'mappa') drawScatter();
  if (id === 'confronta') renderCompare();
}
document.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => { showTab(b.dataset.tab); history.replaceState(null, '', '#' + b.dataset.tab); scrollTo(0, 0); }));
$('#open-guide').addEventListener('click', () => { showTab('guida'); history.replaceState(null, '', '#guida'); scrollTo(0, 0); });
document.addEventListener('click', (e) => { if (e.target.closest('[data-guide]')) { e.preventDefault(); showTab('guida'); history.replaceState(null, '', '#guida'); scrollTo(0, 0); } });

/* ---------- PER TE ---------- */
const reliable = (r) => r.is_target && !r.preference && !r.catalog_only && labSpin(r) && !r.derived.disliked_warning && r.crosscheck?.verdict !== 'contradicted' && r._score !== null;
const topIds = () => ALL.filter(reliable).sort((a, b) => b._score - a._score).slice(0, 3).map((r) => r.id);
function renderTop3() {
  const top = topIds().map((id) => BY_ID[id]);
  $('#top3').innerHTML = top.map((r, i) => card(r, { rank: ['Prima scelta', 'Seconda scelta', 'Terza scelta'][i], why: true })).join('');
  $('#top3-note').innerHTML = `Solo corde con spin misurato o da calibro gemello. <b>Il punteggio (0–100) è una posizione tra le ${ALL.length} corde del banco, non un voto</b>: spin ${weights.spin}, tenuta ${weights.durability}, affinità con le tue preferite ${weights.affinity}. <a href="#guida" data-guide>Come si calcola e da dove vengono i dati</a>.`;
}
function renderTastes() {
  $('#tastes').innerHTML = `<p class="eyebrow">Cosa dicono i tuoi gusti</p>${DATA.insight ? `<p>${esc(DATA.insight)}</p>` : ''}<p class="muted small">Ipotesi ricavata da 4 corde (2 preferite, 2 non gradite) e dalle misure TWU/Excel: non è una regola.</p>`;
}
const SLIDER_LABELS = { spin: 'Spin', durability: 'Tenuta di tensione', affinity: 'Affinità con le tue preferite' };
function renderSliders() {
  $('#sliders').innerHTML = Object.keys(DEFAULT_WEIGHTS).map((k) => `<div class="slider"><div class="lab"><label for="w-${k}">${SLIDER_LABELS[k]}</label><span class="num" id="wv-${k}">${weights[k]}</span></div><input type="range" id="w-${k}" min="0" max="50" step="5" value="${weights[k]}"></div>`).join('');
  for (const k of Object.keys(DEFAULT_WEIGHTS)) {
    $('#w-' + k).addEventListener('input', (e) => { weights[k] = Number(e.target.value); $('#wv-' + k).textContent = weights[k]; store.set('weights', weights); rescore(); renderTop3(); renderList(); });
  }
}
$('#reset-weights').addEventListener('click', () => { weights = { ...DEFAULT_WEIGHTS }; store.set('weights', weights); rescore(); renderSliders(); renderTop3(); renderList(); });
$('#only-target').addEventListener('change', renderList);
$('#q').addEventListener('input', renderList);
const conf = BY_ID['solinco-confidential-16l'];
const sub = (r, k) => r.derived.subscores?.[k] ?? null;
const PRESETS = {
  score: { desc: 'Ordinate per punteggio sul tuo profilo, calcolato solo su dati di laboratorio.', list: (rs) => rs.filter((r) => r._score !== null).sort((a, b) => (hasLab(b) - hasLab(a)) || (b._score - a._score)) },
  similar: { desc: 'Le più vicine per misure a Confidential o O-Toro.', list: (rs) => rs.filter((r) => !r.preference && bestLiked(r) !== null).sort((a, b) => bestLiked(b) - bestLiked(a)) },
  spin: { desc: 'Rigidità simile alla tua Confidential (entro ±10 punti sulla scala del banco), ma più spin.', list: (rs) => rs.filter((r) => !r.preference && !r.derived.disliked_warning && sub(r, 'spin') !== null && sub(r, 'control') !== null && sub(r, 'control') >= sub(conf, 'control') - 10 && sub(r, 'spin') > sub(conf, 'spin')).sort((a, b) => sub(b, 'spin') - sub(a, 'spin')) },
  durable: { desc: 'Quelle che tengono meglio la tensione, escluse quelle simili alle non gradite.', list: (rs) => rs.filter((r) => sub(r, 'durability') !== null && !r.derived.disliked_warning && r.preference !== 'disliked').sort((a, b) => sub(b, 'durability') - sub(a, 'durability')) },
};
let preset = 'score';
document.querySelectorAll('.preset').forEach((b) => b.addEventListener('click', () => { preset = b.dataset.preset; document.querySelectorAll('.preset').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); renderList(); }));
function renderList() {
  const q = $('#q').value.trim().toLowerCase();
  let rs = ALL;
  if ($('#only-target').checked) rs = rs.filter((r) => r.is_target || r.preference);
  if (q) { rs = rs.filter((r) => fullName(r).toLowerCase().includes(q)); $('#preset-desc').textContent = `${rs.length} corde trovate per "${q}".`; }
  else {
    const noScore = ALL.filter((r) => r._score === null && (r.is_target || r.preference)).length;
    $('#preset-desc').textContent = PRESETS[preset].desc + (preset === 'score' && noScore ? ` ${noScore} corde non hanno punteggio perché manca spin o tenuta: le trovi in Esplora.` : '');
  }
  const shown = new Set(topIds());
  let list = q ? rs.sort((a, b) => (b._score ?? -1) - (a._score ?? -1)) : PRESETS[preset].list([...rs]);
  if (!q && preset === 'score') list = list.filter((r) => !shown.has(r.id));
  list = list.slice(0, 12);
  $('#list').innerHTML = list.length ? list.map((r) => card(r)).join('') : '<p class="muted">Nessuna corda per questo criterio.</p>';
}

/* ---------- SCHEDA ---------- */
const dlg = $('#sheet');
$('#sheet-close').addEventListener('click', () => dlg.close());
dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
document.addEventListener('click', (e) => {
  const o = e.target.closest('[data-open]'); if (o) { openSheet(o.dataset.open, o.dataset.section); return; }
  const c = e.target.closest('[data-compare]'); if (c) { addToCompare(c.dataset.compare); }
});
const kv = (pairs) => `<dl class="kv">${pairs.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>`;
const sp = (o, k) => o?.[k] ?? o?.[String(k)];
const VERDICT = { confirmed: 'confermata', plausible: 'plausibile', questionable: 'dubbia', contradicted: 'contraddetta', no_data: 'nessun dato esterno' };
const KIND_IT = { lab_playtest: 'playtest', review: 'recensione', brand: 'produttore', forum: 'forum', video: 'video' };
const CRIT_IT = { spin: 'spin', comfort: 'comfort', control: 'controllo', power: 'potenza', durability: 'durata', stiffness: 'rigidità' };
function provenance(r) {
  const m = DATA.estimates_meta || {}, j = r.derived.judgments || {}, ts = r.derived.tension_start, st = r.stiffness, sp = r.spin;
  const nSpin = ALL.filter((x) => x.spin?.kind === 'misurato').length, nSt = ALL.filter((x) => x.stiffness?.kind === 'misurata').length;
  const cap = (s) => s.replace(/^(<[^>]+>)*\s*([a-zàèéìòù])/, (m, a, c) => (a || '') + c.toUpperCase());
  const li = (k, v, how) => `<div class="prov"><b>${k}</b> <span class="num">${v}</span><p class="small">${how}</p></div>`;
  const rpLink = r.rpedia?.url ? `<a href="${esc(safeUrl(r.rpedia.url))}" target="_blank" rel="noopener">scheda Racketpedia</a> (${fmt(r.rpedia.static_stiffness_kgmm, 2)} kg/mm${r.rpedia.match === 'exact' ? '' : ', altro calibro o colore'})` : '';
  const out = [];
  if (st) {
    const how = [];
    if (['misurata', 'parente'].includes(st.kind) && r.twu?.twu_name) how.push(`riga TWU «${esc(r.twu.twu_name)}» (51 lb, swing veloce)`);
    if (st.kind === 'parente' && st.from_lbin) how.push(`${fmt(st.from_lbin, 0)} lb/in della riga TWU, corretti per il diametro${st.twu_gauge_mm ? ` (${fmt(st.twu_gauge_mm, 2)} → ${fmt(r.gauge_mm, 2)} mm)` : ''} di circa ${fmt((m.stiffness_gauge || {}).slope, 0)} lb/in per mm`);
    if (st.kind === 'da Racketpedia') how.push(`${rpLink || 'Racketpedia'}, convertita sulla scala TWU (errore medio ±${fmt((m.rp_to_twu || {}).mae, 0)} lb/in)${st.via === 'gemello' ? ', da un calibro gemello e corretta per il diametro' : ''}`);
    if (st.kind === 'modello') how.push(`solo dal calibro: modello su ${((m.stiffness_model || {}).gauge || {}).n} corde misurate, errore medio ±${fmt(((m.stiffness_model || {}).gauge || {}).mae, 0)} lb/in`);
    if (st.kind === 'misurata' && r.rpedia?.url) how.push(`controprova: ${rpLink}`);
    out.push(li('Rigidità', `${st.kind === 'misurata' ? '' : '≈ '}${fmt(st.value_lbin, 0)} lb/in${st.kind === 'misurata' ? '' : ` (tra ${fmt(st.low, 0)} e ${fmt(st.high, 0)})`}`, `${esc(cap(stKind(st)))}. ${cap(how.join('. '))}. Posizione nel punteggio: percentile tra le ${nSt} corde con rigidità TWU misurata${j.stiffness?.modelled ? ' (solo informativa)' : ''}.`));
  } else out.push(li('Rigidità', 'n.d.', 'Nessuna fonte ha la rigidità di questa corda.'));
  if (sp) {
    const how = [];
    if (['misurato', 'parente'].includes(sp.kind) && r.twu?.twu_name) how.push(`riga TWU «${esc(r.twu.twu_name)}»: spin potential, scala 0–10`);
    if (sp.kind === 'parente') how.push('stessa corda in un altro calibro o colore, margine fisso ±0,5');
    if (sp.kind === 'modello') { const mm = (m.spin_model || {})[sp.model === 'forma' ? 'shape' : 'stiffness_shape'] || {}; how.push(`modello su ${esc(sp.model)} (${mm.n} corde misurate, errore medio ±${fmt(mm.mae, 2)} contro ±${fmt(mm.baseline_mae, 2)} della media; intervallo all'80% ±${fmt(mm.q80, 1)}). Non entra nel punteggio`); }
    out.push(li('Spin', `${sp.kind === 'misurato' ? '' : '≈ '}${fmt(sp.value, 1)}`, `${esc(cap(SPIN_KIND[sp.kind]))}. ${cap(how.join('. '))}. Percentile tra le ${nSpin} corde con spin misurato.`));
  } else out.push(li('Spin', 'n.d.', 'TWU non ha misurato questa corda e non esiste un gemello misurato.'));
  const dur = j.durability, e = r.excel;
  out.push(li('Tenuta', dur?.score != null ? `${dur.word} · ${Math.round(dur.score)}` : 'n.d.', `${r.twu?.tension_loss_pct != null ? `Perdita TWU ${fmt(r.twu.tension_loss_pct, 1)}% (prova breve)` : 'Nessuna perdita TWU'}${e?.tl6 != null ? `; tuo test Excel: TL6 ${fmt(e.tl6, 0)}%${e.tl12 != null ? `, TL12 ${fmt(e.tl12, 0)}%` : ''} (6 e 12 mesi)` : ''}. Media dei percentili disponibili.`));
  out.push(li('Controllo e comfort', 'stime', 'Non misurati: derivano dalla rigidità (e dall\'allungamento a 50 lb del tuo test, se presente). Non entrano nel punteggio.'));
  const sb = r.derived.similarity_basis || {};
  out.push(li('Punteggio', r._score == null ? 'non calcolabile' : `${r._score}${r._lo !== null && r._hi - r._lo >= 2 ? ` (${r._lo}–${r._hi})` : ''}`, `Posizione tra le ${ALL.length} corde, non un voto: spin ${weights.spin}, tenuta ${weights.durability}, affinità ${weights.affinity} (percentili, rinormalizzati). ${r._score == null ? 'Servono spin e tenuta.' : ''} ${r._lo !== null && r._hi - r._lo >= 2 ? 'L\'intervallo viene dal margine ±0,5 dello spin da gemello.' : ''}`));
  out.push(li('Affinità', `${fmt(Math.max(...Object.values(r.derived.similarity_liked || {}).filter((v) => v !== null), 0), 0)}/100`, `Somiglianza con la tua preferita più vicina su ${Math.max(...Object.values(sb), 0)} misure in comune (rigidità, perdita TWU, spin, Stiff Index, TL6, Racketpedia): distanza tra z-score, +5 se stessa forma. È una misura di vicinanza, non di qualità.`));
  if (ts) out.push(li('Tensione di partenza', `${tensionText(r)} (±${ts.range_kg ?? 1} kg)`, `Stima, non misura: ${esc(ts.note)}. La pendenza è ricavata solo dalle tue due preferite.`));
  return out.join('');
}
function openSheet(id, section) {
  const r = BY_ID[id]; if (!r) return;
  const e = r.excel, t = r.twu, p = r.rpedia, ts = r.derived.tension_start;
  let olg = '';
  if (e && ts) {
    const target = (ts.lbs[0] + ts.lbs[1]) / 2;
    const near = [40, 50, 60, 65].reduce((a, b) => (Math.abs(b - target) < Math.abs(a - target) ? b : a));
    const v = sp(e.olg_16x19, near);
    if (v !== null && v !== undefined) olg = `<div class="tbox"><span class="muted small">Lunghezza guadagnata 16×19 a ${near} lbs</span><span class="big">${fmt(v, 1)}″</span><span class="muted small">utile se incordi da matassa</span></div>`;
  }
  const spinTxt = !r.spin ? 'non disponibile' : r.spin.value == null ? `${spinWord(r)} secondo i tester · nessuna stima numerica affidabile` : `${r.spin.kind === 'misurato' ? '' : '≈ '}${fmt(r.spin.value, 1)}${r.spin.kind === 'misurato' ? '' : ` (tra ${fmt(r.spin.low, 1)} e ${fmt(r.spin.high, 1)})`} · ${SPIN_KIND[r.spin.kind]}`;
  const stTxt = r.stiffness ? `${r.stiffness.kind === 'misurata' ? '' : '≈ '}${fmt(r.stiffness.value_lbin, 0)} lb/in${r.stiffness.kind === 'misurata' ? '' : ` (tra ${fmt(r.stiffness.low, 0)} e ${fmt(r.stiffness.high, 0)})`} · ${stKind(r.stiffness)}` : 'non disponibile';
  const revs = r.reviews?.sources || [];
  $('#sheet-body').innerHTML = `
    <div class="sheet-head">
      <p class="eyebrow">${r.is_target ? 'Marca valutata' : 'Concorrente di riferimento'}</p>
      <h2 id="sheet-title">${esc(nameOf(r))}</h2>
      <p class="muted">${esc(subline(r))}${r.shape_source ? ' (forma dal produttore)' : ''}${r.shape_source && r.shape_excel && r.shape_excel !== r.shape ? ` · nel tuo file: ${esc(SHAPES[r.shape_excel] || r.shape_excel)}` : ''}</p>
      <div class="badges">${badges(r)} <span class="badge">Punteggio ${fmt(r._score, 0)}${r._lo !== null && r._hi - r._lo >= 2 ? ` (${r._lo}–${r._hi})` : ''}</span></div>
    </div>
    <div class="tension"><div class="tbox"><span class="muted small">Tensione di partenza (verticali/orizzontali)</span><span class="big">${ts ? `${fmt(ts.kg[0], 1)} / ${fmt(ts.kg[1], 1)} kg` : '—'}</span><span class="num">${ts ? `${fmt(ts.lbs[0], 1)} / ${fmt(ts.lbs[1], 1)} lbs` : ''}</span>${ts ? `<span class="muted small">Indicativa: ${esc(ts.note)}</span>` : ''}</div>${olg}</div>
    ${bars(r)}
    ${kv([['Spin', esc(spinTxt)], ['Rigidità', esc(stTxt)]])}
    <details class="sheet-section" id="sec-fonti"${section === 'fonti' ? ' open' : ''}><summary>Da dove vengono i numeri · ${esc(nameOf(r))}</summary>${provenance(r)}</details>
    <details class="sheet-section" open><summary>Note dell'incordatore</summary>
      ${[['feel', 'Sensazione'], ['on_blade_100_v9', 'Sulla Blade 100 v9'], ['for_your_style', 'Per il tuo stile'], ['vs_favorites', 'Rispetto alle tue preferite']].filter(([k]) => r.notes?.[k]).map(([k, l]) => `<div class="note"><h3>${l}</h3><p>${esc(r.notes[k])}</p></div>`).join('')}
    </details>
    <details class="sheet-section"><summary>Dati di laboratorio</summary>
      <div class="src"><h3>Test Ektelon (tuo file)</h3>${e ? kv([
        ['Allungamento 40 / 50 / 60 / 65 lbs', ['40', '50', '60', '65'].map((k) => fmt(sp(e.stretch_pct, k), 1)).join(' / ') + ' %'],
        ['Stiff Index medio <span class="muted">(indice di cedimento)</span>', fmt(e.stiff_index_avg, 2)],
        ['Scorrimento 24 h con 40 lbs', e.static_24h_creep === null ? '—' : fmt(e.static_24h_creep, 2) + '″'],
        ['Perdita tensione 6 / 12 mesi', `${e.tl6 === null ? '—' : fmt(e.tl6, 0) + ' %'} / ${e.tl12 === null ? '—' : fmt(e.tl12, 0) + ' %'}`],
        ...(e.extra_test_sets ? [['Set di test nel file', `${e.extra_test_sets + 1} (mostrato il primo)`]] : [])]) : '<p class="muted small">Non testata nel tuo file.</p>'}</div>
      <div class="src"><h3>Tennis Warehouse University</h3>${t ? `${t.match !== 'exact' ? `<p class="proxy small">Dato di «${esc(t.twu_name)}» (${t.match === 'proxy' ? 'stesso modello, altro calibro' : 'stessa corda, nome diverso'}).</p>` : ''}${kv([
        ['Rigidità dinamica', fmtH(t.stiffness_lbin, 1) + ' lb/in'], ['Perdita di tensione', fmtH(t.tension_loss_pct, 1) + ' %'], ['Spin potential', fmtH(t.spin_potential, 1)]])}` : '<p class="muted small">Non presente.</p>'}</div>
      <div class="src"><h3>Racketpedia</h3>${p ? `${kv([['Rigidità statica', fmt(p.static_stiffness_kgmm, 2) + ' kg/mm']])}<p class="small"><a href="${esc(safeUrl(p.url))}" target="_blank" rel="noopener">Apri su Racketpedia</a></p>` : '<p class="muted small">Non presente.</p>'}</div>
    </details>
    <details class="sheet-section"><summary>Cosa dicono i tester (${revs.length} fonti · solo riferimento, non entrano nel punteggio)</summary>
      ${revs.length ? revs.map((s) => {
        const sc = Object.entries(s.scores || {}).filter(([, v]) => v !== null).map(([k, v]) => `${CRIT_IT[k]} ${Math.round(v)}`);
        const lv = Object.entries(s.levels || {}).filter(([, v]) => v !== null).map(([k, v]) => `${CRIT_IT[k]} ${['molto basso', 'basso', 'medio', 'alto', 'molto alto'][v - 1]}`);
        return `<div class="rev"><span><b>${esc(s.site)}</b> <span class="muted small">${esc(KIND_IT[s.kind] || s.kind)}</span></span>${sc.length ? `<span class="small">Punteggi /100: ${esc(sc.join(' · '))}</span>` : ''}${lv.length ? `<span class="small">Giudizi: ${esc(lv.join(' · '))}</span>` : ''}${s.note ? `<span class="muted small">${esc(s.note)}</span>` : ''}<a class="small" href="${esc(safeUrl(s.url))}" target="_blank" rel="noopener">Fonte</a></div>`;
      }).join('') : '<p class="muted small">Nessuna recensione trovata.</p>'}
    </details>
    ${r.crosscheck ? `<details class="sheet-section"><summary>Controllo incrociato: ${esc(VERDICT[r.crosscheck.verdict] || r.crosscheck.verdict)}</summary>${r.crosscheck.note ? `<p class="small">${esc(r.crosscheck.note)}</p>` : ''}<p class="small muted">Fonti: ${(r.crosscheck.sources || []).map((u) => { let h = u; try { h = new URL(u).hostname.replace('www.', ''); } catch { /* url non valido */ } return `<a href="${esc(safeUrl(u))}" target="_blank" rel="noopener">${esc(h)}</a>`; }).join(' · ')}</p></details>` : ''}
    <details class="sheet-section"><summary>Somiglianza con le tue corde</summary>${kv([
      ['★ Confidential 1.25', fmt(r.derived.similarity_liked?.confidential, 0)], ['★ O-Toro 1.23', fmt(r.derived.similarity_liked?.otoro, 0)],
      ['✕ Confidential Soft', fmt(r.derived.similarity_disliked?.confidential_soft, 0)], ['✕ RPM Blast', fmt(r.derived.similarity_disliked?.rpm_blast, 0)]])}</details>
    <div class="card-actions"><button class="btn" type="button" data-compare="${esc(r.id)}">Aggiungi al confronto</button></div>`;
  if (!dlg.open) dlg.showModal();
  dlg.scrollTop = 0;
  if (section === 'fonti') $('#sec-fonti')?.scrollIntoView({ block: 'start' });
}

/* ---------- MAPPA ---------- */
const AX = {
  stiff: { label: 'Rigidità (lb/in, scala TWU)', short: 'Rigidità', get: (r) => r.stiffness?.value_lbin, est: (r) => isEst(r.stiffness, 'misurata'), lo: (r) => r.stiffness?.low, hi: (r) => r.stiffness?.high, d: 0 },
  spin: { label: 'Spin (scala TWU)', short: 'Spin', get: (r) => r.spin?.value, est: (r) => isEst(r.spin, 'misurato'), lo: (r) => r.spin?.low, hi: (r) => r.spin?.high, d: 1 },
  tl: { label: 'Perdita di tensione TWU (%)', short: 'Perdita', get: (r) => r.twu?.tension_loss_pct, est: () => false, d: 1 },
  si: { label: 'Stiff Index Excel (cedimento)', short: 'Stiff Idx', get: (r) => r.excel?.stiff_index_avg, est: () => false, d: 2 },
  score: { label: 'Punteggio per te', short: 'Punteggio', get: (r) => r._score, est: () => false, d: 0 },
};
const CAT_LABEL = { liked: 'Tue preferite', disliked: 'Non gradite', target: 'Marche valutate', other: 'Concorrenti' };
const CAT_COLOR = { liked: 'var(--s-liked)', disliked: 'var(--s-disliked)', target: 'var(--s-target)', other: 'var(--s-other)' };
const cat = (r) => (r.preference === 'liked' ? 'liked' : r.preference === 'disliked' ? 'disliked' : r.is_target ? 'target' : 'other');
function initMap() {
  const opts = Object.entries(AX).map(([k, a]) => `<option value="${k}">${esc(a.label)}</option>`).join('');
  $('#ax-x').innerHTML = opts; $('#ax-y').innerHTML = opts; $('#ax-x').value = 'stiff'; $('#ax-y').value = 'spin';
  ['#ax-x', '#ax-y', '#show-comp', '#show-est'].forEach((s) => $(s).addEventListener('change', drawScatter));
  $('#map-legend').innerHTML = ['liked', 'disliked', 'target', 'other'].map((c) => `<span><i class="sw" style="background:${CAT_COLOR[c]}"></i>${CAT_LABEL[c]}</span>`).join('') + '<span><i class="sw hollow"></i>Valore stimato, con margine</span><span><i class="sw hollow dashed"></i>Spin da modello (bassa affidabilità)</span>';
}
function ticks(min, max, n = 5) {
  const span = max - min || 1, step0 = span / n, mag = 10 ** Math.floor(Math.log10(step0));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= step0);
  const out = []; for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) out.push(+v.toFixed(6));
  return out;
}
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0; };
function renderMapStatus({ pts, stripB, stripL, noneR, hidComp, hidEst, mx, my }) {
  const list = (rs) => rs.map((r) => `<button class="rowlink" type="button" data-open="${esc(r.id)}">${esc(fullName(r))}</button>`).join(', ');
  const total = pts.length + stripB.length + stripL.length + noneR.length;
  const parts = [];
  if (stripB.length) parts.push(`<p><b>${stripB.length}</b> senza ${esc(my.short.toLowerCase())}: sono nella fascia in basso, posizionate solo per ${esc(mx.short.toLowerCase())}.</p><p class="small">${list(stripB)}</p>`);
  if (stripL.length) parts.push(`<p><b>${stripL.length}</b> senza ${esc(mx.short.toLowerCase())}: sono nella fascia a sinistra, posizionate solo per ${esc(my.short.toLowerCase())}.</p><p class="small">${list(stripL)}</p>`);
  if (noneR.length) parts.push(`<p><b>${noneR.length}</b> senza né ${esc(mx.short.toLowerCase())} né ${esc(my.short.toLowerCase())}: non si possono posizionare.</p><p class="small">${list(noneR)}</p>`);
  const nModel = [...pts, ...stripL, ...stripB].filter((r) => (mx === AX.spin || my === AX.spin ? r.spin?.kind === 'modello' : false)).length;
  const nStModel = [...pts, ...stripL, ...stripB].filter((r) => (mx === AX.stiff || my === AX.stiff) && r.stiffness?.kind === 'modello').length;
  if (nStModel) parts.push(`<p><b>${nStModel}</b> hanno la rigidità <b>stimata dal solo calibro</b> (±${fmt((DATA.estimates_meta?.stiffness_model?.gauge || {}).q80, 0)} lb/in): sono cerchi tratteggiati con barra orizzontale larga. Dice poco più della media del banco; non entra nel punteggio.</p>`);
  const nStRp = [...pts, ...stripL, ...stripB].filter((r) => (mx === AX.stiff || my === AX.stiff) && r.stiffness && r.stiffness.kind !== 'misurata' && r.stiffness.kind !== 'modello').length;
  if (nStRp) parts.push(`<p><b>${nStRp}</b> hanno la rigidità <b>stimata</b> da un gemello o da Racketpedia (±10–19 lb/in): cerchi vuoti con barra d'errore.</p>`);
  if (nModel) parts.push(`<p><b>${nModel}</b> hanno lo spin <b>stimato da modello</b> (rigidità e forma): cerchi tratteggiati con barra d'errore larga (±${fmt((DATA.estimates_meta?.spin_model?.stiffness_shape || {}).q80, 1)}). Dicono se la corda sta sopra o sotto la media, non un valore preciso. Non entrano nel punteggio.</p>`);
  if (hidEst.length) parts.push(`<p><b>${hidEst.length}</b> con valori stimati, nascoste perché "Mostra le stime" è spento.</p>`);
  if (hidComp.length) parts.push(`<p><b>${hidComp.length}</b> concorrenti nascosti: attiva "Mostra anche i concorrenti" per vederli (${hidComp.filter((r) => mx.get(r) != null && my.get(r) != null).length} hanno entrambi i dati).</p>`);
  $('#map-missing').innerHTML = `<p class="map-status"><b>${pts.length}</b> corde nel grafico${total > pts.length ? `, altre <b>${total - pts.length}</b> con dati incompleti` : ''}${hidComp.length || hidEst.length ? `, ${hidComp.length + hidEst.length} nascoste dai filtri` : ''}.</p>${parts.length ? `<details class="advanced" open><summary>Corde con dati mancanti o nascoste</summary>${parts.join('')}</details>` : ''}`;
}
function drawScatter() {
  const kx = $('#ax-x').value, ky = $('#ax-y').value, mx = AX[kx], my = AX[ky];
  const showComp = $('#show-comp').checked, showEst = $('#show-est').checked;
  const vis = (r) => showComp || r.is_target || r.preference;
  const hasBoth = (r) => mx.get(r) != null && my.get(r) != null;
  const estOk = (r) => showEst || (!mx.est(r) && !my.est(r));
  const pts = ALL.filter((r) => vis(r) && hasBoth(r) && estOk(r));
  // corde con un solo asse: non si nascondono, finiscono nelle fasce "dato non disponibile"
  const stripB = ALL.filter((r) => vis(r) && mx.get(r) != null && my.get(r) == null).sort((a, b) => mx.get(a) - mx.get(b));
  const stripL = ALL.filter((r) => vis(r) && mx.get(r) == null && my.get(r) != null).sort((a, b) => my.get(a) - my.get(b));
  const noneR = ALL.filter((r) => vis(r) && mx.get(r) == null && my.get(r) == null);
  const hidComp = ALL.filter((r) => !vis(r));
  const hidEst = ALL.filter((r) => vis(r) && hasBoth(r) && !estOk(r));
  renderMapStatus({ pts, stripB, stripL, noneR, hidComp, hidEst, mx, my });
  const W = 900, H = 600, L = 116, R = 18, T = 18, B = stripB.length ? 104 : 56, svg = $('#scatter');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  if (!pts.length && !stripB.length && !stripL.length) { svg.innerHTML = `<text x="${W / 2}" y="${H / 2}" text-anchor="middle">Nessuna corda con almeno un valore</text>`; return; }
  const xs = [...pts, ...stripB].flatMap((r) => [mx.get(r), mx.lo?.(r), mx.hi?.(r)]).filter((v) => v != null);
  const ys = [...pts, ...stripL].flatMap((r) => [my.get(r), my.lo?.(r), my.hi?.(r)]).filter((v) => v != null);
  const pad = (a, b) => { const s = (b - a) * 0.05 || 1; return [a - s, b + s]; };
  const [x0, x1] = pad(Math.min(...xs), Math.max(...xs)), [y0, y1] = pad(Math.min(...ys), Math.max(...ys));
  const sx = (v) => L + (v - x0) / (x1 - x0) * (W - L - R), sy = (v) => H - B - (v - y0) / (y1 - y0) * (H - T - B);
  let s = '';
  s += ticks(x0, x1).map((v) => `<line class="grid" x1="${sx(v)}" x2="${sx(v)}" y1="${T}" y2="${H - B}"/><text x="${sx(v)}" y="${H - B + 16}" text-anchor="middle">${NF(mx.d && v % 1 ? 1 : 0).format(v)}</text>`).join('');
  s += ticks(y0, y1).map((v) => `<line class="grid" x1="${L}" x2="${W - R}" y1="${sy(v)}" y2="${sy(v)}"/><text x="${L - 8}" y="${sy(v) + 4}" text-anchor="end">${NF(v % 1 ? 1 : 0).format(v)}</text>`).join('');
  if (kx === 'stiff' && ky === 'spin') {
    const cx = sx(median(pts.filter((r) => !mx.est(r)).map(mx.get))), cy = sy(median(pts.filter((r) => !my.est(r)).map(my.get)));
    s += `<line class="mid" x1="${cx}" x2="${cx}" y1="${T}" y2="${H - B}"/><line class="mid" x1="${L}" x2="${W - R}" y1="${cy}" y2="${cy}"/>`;
    s += `<text class="zone" x="${L + 10}" y="${T + 18}">VIVE DA SPIN</text><text class="zone" x="${W - R - 10}" y="${T + 18}" text-anchor="end">COMPATTE DA SPIN</text>`;
    s += `<text class="zone" x="${L + 10}" y="${H - B - 10}">MORBIDE E TRANQUILLE</text><text class="zone" x="${W - R - 10}" y="${H - B - 10}" text-anchor="end">CONTROLLO PURO</text>`;
  }
  s += `<text class="axis-title" x="${(L + W - R) / 2}" y="${H - 12}" text-anchor="middle">${esc(mx.label)}${kx === 'stiff' ? ' → più rigida' : ''}</text>`;
  s += `<text class="axis-title" transform="translate(14 ${(T + H - B) / 2}) rotate(-90)" text-anchor="middle">${esc(my.label)}${ky === 'spin' ? ' → più spin' : ''}</text>`;
  const stripDot = (r, x, y) => `<circle class="dot miss" data-id="${esc(r.id)}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5" style="stroke:${CAT_COLOR[cat(r)]}" tabindex="0" role="button" aria-label="${esc(fullName(r))}: ${esc(my.short)} non disponibile"/>`;
  if (stripB.length) {
    const y0s = H - B + 28;
    s += `<rect class="strip" x="${L}" y="${y0s}" width="${W - L - R}" height="48" rx="6"/><text class="strip-lbl" x="${L + 6}" y="${y0s + 11}">${esc(my.short)} non disponibile (${stripB.length})</text>`;
    s += stripB.map((r, i) => stripDot(r, sx(mx.get(r)), y0s + 22 + (i % 3) * 11)).join('');
  }
  if (stripL.length) {
    s += `<rect class="strip" x="40" y="${T}" width="60" height="${H - B - T}" rx="6"/><text class="strip-lbl" transform="translate(52 ${H - B - 8}) rotate(-90)">${esc(mx.short)} non disponibile (${stripL.length})</text>`;
    s += stripL.map((r, i) => stripDot(r, 72 + (i % 3) * 11, sy(my.get(r)))).join('');
  }
  const order = { other: 0, target: 1, disliked: 2, liked: 3 };
  for (const r of [...pts].sort((a, b) => order[cat(a)] - order[cat(b)])) {
    const x = sx(mx.get(r)), y = sy(my.get(r)), c = CAT_COLOR[cat(r)], est = mx.est(r) || my.est(r);
    const mdl = ((kx === 'spin' || ky === 'spin') && r.spin?.kind === 'modello') || ((kx === 'stiff' || ky === 'stiff') && r.stiffness?.kind === 'modello') ? ' model' : '';
    if (my.est(r) && my.lo) s += `<line class="err${mdl}" x1="${x}" x2="${x}" y1="${sy(my.lo(r))}" y2="${sy(my.hi(r))}" stroke="${c}"/>`;
    if (mx.est(r) && mx.lo) s += `<line class="err${mdl}" x1="${sx(mx.lo(r))}" x2="${sx(mx.hi(r))}" y1="${y}" y2="${y}" stroke="${c}"/>`;
    s += `<circle class="dot${est ? ' hollow' : ''}${mdl}" data-id="${esc(r.id)}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.preference ? 8 : 6}" ${est ? `style="stroke:${c}"` : `fill="${c}"`} tabindex="0" role="button" aria-label="${esc(fullName(r))}"/>`;
  }
  const groups = [];
  for (const r of pts.filter((r) => r.preference)) {
    const x = sx(mx.get(r)), y = sy(my.get(r));
    const g = groups.find((g) => g.model === r.model && Math.hypot(g.x - x, g.y - y) < 14);
    if (g) g.g.push(r.gauge_label || ''); else groups.push({ x, y, model: r.model, pref: r.preference, g: [r.gauge_label || ''] });
  }
  for (const g of groups) { const right = g.x < W - 220;  const ly = g.y - 9 < T + 30 ? g.y + 22 : g.y - 9; s += `<text class="lbl" x="${g.x + (right ? 11 : -11)}" y="${ly}" text-anchor="${right ? 'start' : 'end'}">${g.pref === 'liked' ? '★ ' : '✕ '}${esc(g.model)} ${esc(g.g.join(' · '))}</text>`; }
  svg.innerHTML = s;
  const tip = $('#tip');
  svg.querySelectorAll('.dot').forEach((d) => {
    const r = BY_ID[d.dataset.id];
    const show = () => {
      tip.hidden = false;
      const v = (a) => (a.get(r) == null ? 'non disponibile' : `${a.est(r) ? '≈ ' : ''}${fmt(a.get(r), a.d)}`);
      tip.innerHTML = `<b>${esc(fullName(r))}</b><br>${esc(mx.short)} ${v(mx)} · ${esc(my.short)} ${v(my)}`;
      const box = svg.getBoundingClientRect(), k = box.width / W;
      tip.style.left = Math.min(Number(d.getAttribute('cx')) * k + 12, box.width - 250) + 'px'; tip.style.top = Math.max(Number(d.getAttribute('cy')) * k - 50, 4) + 'px';
    };
    d.addEventListener('mouseenter', show); d.addEventListener('focus', show);
    d.addEventListener('mouseleave', () => { tip.hidden = true; }); d.addEventListener('blur', () => { tip.hidden = true; });
    const pick = () => { svg.querySelectorAll('.dot.sel').forEach((x) => x.classList.remove('sel')); d.classList.add('sel'); $('#map-pick').innerHTML = card(r, { why: true }); $('#map-pick').scrollIntoView({ block: 'nearest', behavior: 'smooth' }); };
    d.addEventListener('click', pick);
    d.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
  });
}

/* ---------- CONFRONTA ---------- */
const SLOT = ['var(--s-c1)', 'var(--s-c2)', 'var(--s-c3)', 'var(--s-c4)'];
let picks = store.get('picks2', null);
if (!Array.isArray(picks)) {
  const top = ALL.filter(reliable).sort((a, b) => b._score - a._score)[0];
  picks = ['solinco-confidential-16l', 'toroline-o-toro-17', top ? top.id : '', ''];
}
function initCompare() {
  const opts = '<option value="">— scegli —</option>' + [...ALL].sort((a, b) => fullName(a).localeCompare(fullName(b))).map((r) => `<option value="${esc(r.id)}">${esc(fullName(r))}${r.preference === 'liked' ? ' ★' : r.preference === 'disliked' ? ' ✕' : ''}${r._score === null ? ' · parziale' : ''}</option>`).join('');
  $('#cmp-pickers').innerHTML = [0, 1, 2, 3].map((i) => `<label><span><i class="sw" style="background:${SLOT[i]}"></i> Corda ${i + 1}</span><select id="cmp-${i}">${opts}</select></label>`).join('');
  [0, 1, 2, 3].forEach((i) => { const s = $('#cmp-' + i); s.value = picks[i] || ''; s.addEventListener('change', () => { picks[i] = s.value; store.set('picks2', picks); renderCompare(); }); });
}
function addToCompare(id) {
  if (!picks.includes(id)) { const i = picks.findIndex((p) => !p); picks[i === -1 ? 3 : i] = id; store.set('picks2', picks); [0, 1, 2, 3].forEach((k) => { $('#cmp-' + k).value = picks[k] || ''; }); }
  if (dlg.open) dlg.close();
  showTab('confronta'); history.replaceState(null, '', '#confronta'); scrollTo(0, 0);
}
const ROWS = [
  { k: 'stiffness', label: 'Rigidità', lead: 'più rigida', val: (r) => (r.stiffness && r.stiffness.kind !== 'modello' ? r.stiffness.value_lbin : null), show: (r) => `${r.stiffness ? `${isEst(r.stiffness, 'misurata') ? '≈ ' : ''}${fmt(r.stiffness.value_lbin, 0)} lb/in` : '—'} · ${r.derived.judgments?.stiffness?.word || 'n.d.'}`, small: (r) => [r.stiffness && isEst(r.stiffness, 'misurata') ? `${stKind(r.stiffness)}, tra ${fmt(r.stiffness.low, 0)} e ${fmt(r.stiffness.high, 0)} lb/in` : '', r.rpedia ? `Racketpedia ${fmt(r.rpedia.static_stiffness_kgmm, 2)} kg/mm` : '', r.excel?.stiff_index_avg != null ? `Stiff Index ${fmt(r.excel.stiff_index_avg, 2)}` : ''].filter(Boolean).join(' · ') },
  { k: 'spin', label: 'Spin', lead: 'più spin', val: (r) => (labSpin(r) ? r.spin.value : null), show: (r) => (r.spin && r.spin.value == null ? `${spinWord(r)} secondo i tester` : `${r.spin ? `${isEst(r.spin, 'misurato') ? '≈ ' : ''}${fmt(r.spin.value, 1)}` : '—'} · ${r.derived.judgments?.spin?.word || 'n.d.'}`), small: (r) => (!r.spin ? '' : r.spin.value == null ? 'nessuna stima numerica affidabile' : isEst(r.spin, 'misurato') ? `${SPIN_KIND[r.spin.kind]}, tra ${fmt(r.spin.low, 1)} e ${fmt(r.spin.high, 1)}` : '') },
  { k: 'control', label: 'Controllo (stima dalla rigidità)', lead: 'più compatta', val: (r) => r.derived.judgments?.control?.score },
  { k: 'durability', label: 'Tenuta', lead: 'tiene meglio', val: (r) => r.derived.judgments?.durability?.score, small: (r) => [r.twu?.tension_loss_pct != null ? `TWU −${fmt(r.twu.tension_loss_pct, 0)}% (prova breve)` : '', r.excel?.tl6 != null ? `6 mesi −${fmt(r.excel.tl6, 0)}%` : '', r.excel?.tl12 != null ? `12 mesi −${fmt(r.excel.tl12, 0)}%` : ''].filter(Boolean).join(' · ') },
  { k: 'comfort', label: 'Comfort (stima dalla rigidità)', lead: 'più comoda', val: (r) => r.derived.judgments?.comfort?.score },
];
const MISSING_WHY = {
  stiffness: () => 'nessuna fonte (TWU, Racketpedia, calibro gemello) ha la rigidità di questa corda',
  spin: (r) => (r.catalog_only ? 'solo catalogo: nessun test di laboratorio' : 'TWU non l\'ha misurata e non c\'è un calibro gemello misurato'),
  control: () => 'è una stima dalla rigidità, che manca',
  durability: () => 'né perdita TWU né TL6/TL12 del tuo test',
  comfort: () => 'è una stima dalla rigidità, che manca',
};
const ROW_NAME = { stiffness: 'rigidità', spin: 'spin', durability: 'tenuta' };
function renderCompare() {
  const chosen = picks.map((id, i) => ({ r: BY_ID[id], i })).filter((x) => x.r);
  const leaders = {}, nWith = {};
  for (const row of ROWS) {
    const vals = chosen.map(({ r }) => row.val(r)).filter((v) => v != null);
    nWith[row.k] = vals.length;
    if (vals.length >= 2) leaders[row.k] = Math.max(...vals);
  }
  $('#cmp-cards').innerHTML = chosen.length ? chosen.map(({ r, i }) => `<article class="ccard">
    <h3><i class="sw" style="background:${SLOT[i]}"></i> ${esc(nameOf(r))}</h3><p class="muted small">${esc(subline(r))}</p><div class="badges">${badges(r)}</div>
    <p class="small completeness">Dati: ${['spin', 'stiffness', 'durability'].map((k) => { const ok = ROWS.find((x) => x.k === k).val(r) != null; return `<span class="${ok ? 'has' : 'lack'}">${ok ? '✓' : '✗'} ${ROW_NAME[k]}</span>`; }).join(' · ')}</p>
    ${ROWS.map((row) => { const v = row.val(r); const w = r.derived.judgments?.[row.k];
      if (v == null && row.k === 'spin' && r.spin?.kind === 'modello') return `<div class="crow est"><span class="k">${row.label}</span><span class="v">≈ ${fmt(r.spin.value, 1)} · stima da modello</span><span class="s">tra ${fmt(r.spin.low, 1)} e ${fmt(r.spin.high, 1)} (${esc(r.spin.model)}; errore tipico ±${fmt((DATA.estimates_meta?.spin_model?.[r.spin.model === 'forma' ? 'shape' : 'stiffness_shape'] || {}).mae, 1)}). Non entra nel confronto né nel punteggio.</span></div>`;
      if (v == null && row.k === 'stiffness' && r.stiffness?.kind === 'modello') return `<div class="crow est"><span class="k">${row.label}</span><span class="v">≈ ${fmt(r.stiffness.value_lbin, 0)} lb/in · stima dal solo calibro</span><span class="s">tra ${fmt(r.stiffness.low, 0)} e ${fmt(r.stiffness.high, 0)} lb/in: poco più della media del banco. Non entra nel confronto né nel punteggio.</span></div>`;
      if (v == null) return `<div class="crow missing"><span class="k">${row.label}</span><span class="v">dato mancante</span><span class="s">${esc(MISSING_WHY[row.k](r))}. Non confrontabile.</span></div>`;
      return `<div class="crow"><span class="k">${row.label}</span><span class="v">${row.show ? row.show(r) : `${w?.word || 'n.d.'} <span class="num muted">${v == null ? '' : Math.round(v)}</span>`}</span>${row.small && row.small(r) ? `<span class="s">${esc(row.small(r))}</span>` : ''}${v != null && leaders[row.k] === v ? `<span class="lead">▲ ${row.lead}${nWith[row.k] < chosen.length ? ` (tra le ${nWith[row.k]} con dato)` : ''}</span>` : ''}</div>`; }).join('')}
    <div class="crow"><span class="k">Tensione di partenza</span><span class="v num">${tensionText(r)}</span></div>
    <div class="crow${r._score === null ? ' missing' : ''}"><span class="k">Punteggio (rango tra ${ALL.length})</span><span class="v">${r._score === null ? 'non calcolabile' : fmt(r._score, 0)}</span>${r._score === null ? '<span class="s">servono spin e tenuta</span>' : ''}</div>
    <button class="btn" type="button" data-open="${esc(r.id)}">Scheda</button></article>`).join('') : '<p class="muted">Scegli almeno una corda.</p>';
  const gaps = ['spin', 'stiffness', 'durability'].map((k) => { const row = ROWS.find((x) => x.k === k); const who = chosen.filter(({ r }) => row.val(r) == null).map(({ r }) => nameOf(r) + ((k === 'spin' && r.spin?.kind === 'modello') || (k === 'stiffness' && r.stiffness?.kind === 'modello') ? ' (solo stima)' : '')); return who.length ? `${ROW_NAME[k]} (manca per ${who.map(esc).join(', ')})` : ''; }).filter(Boolean);
  renderCmpDots();
  $('#cmp-summary').innerHTML = (chosen.length >= 2 ? summary(chosen[0].r, chosen[1].r) : '') + (gaps.length ? `<span class="gaps"> ⚠ Non confrontabili per dati mancanti: ${gaps.join('; ')}.</span>` : '');
}
function renderCmpDots() {
  const box = $('#cmp-cards'), cards = [...box.querySelectorAll('.ccard')], dots = $('#cmp-dots');
  dots.innerHTML = cards.length > 1 ? cards.map((_, i) => `<button type="button" class="dot-i" data-i="${i}" aria-label="Vai alla corda ${i + 1}"></button>`).join('') : '';
  const upd = () => { if (!cards.length) return; const w = cards[0].getBoundingClientRect().width + 10; const i = Math.max(0, Math.min(cards.length - 1, Math.round(box.scrollLeft / w))); dots.querySelectorAll('.dot-i').forEach((d, k) => d.classList.toggle('on', k === i)); };
  box.onscroll = upd; upd();
  dots.onclick = (e) => { const b = e.target.closest('.dot-i'); if (b) cards[+b.dataset.i].scrollIntoView({ inline: 'start', behavior: 'smooth', block: 'nearest' }); };
}
function summary(a, b) {
  const gain = [], lose = [];
  for (const [k, l] of [['spin', 'spin'], ['durability', 'tenuta']]) {
    const va = a.derived.judgments?.[k]?.score, vb = b.derived.judgments?.[k]?.score;
    if (va == null || vb == null) continue; // criterio non confrontabile: lo segnala la riga "Non confrontabili"
    if (vb - va >= 10) gain.push(l); else if (va - vb >= 10) lose.push(l);
  }
  const join = (xs) => (xs.length > 1 ? xs.slice(0, -1).join(', ') + ' e ' + xs.at(-1) : xs[0]);
  const sa = a.stiffness?.kind === 'modello' ? null : a.stiffness?.value_lbin, sb = b.stiffness?.kind === 'modello' ? null : b.stiffness?.value_lbin;
  const stiff = sa != null && sb != null && Math.abs(sb - sa) >= 10 ? ` La seconda è ${sb > sa ? 'più rigida' : 'più morbida'} di circa ${fmt(Math.abs(sb - sa), 0)} lb/in.` : '';
  let s = `Passando da <b>${esc(fullName(a))}</b> a <b>${esc(fullName(b))}</b> `;
  s += !gain.length && !lose.length ? 'il profilo resta simile.' : [gain.length ? `guadagni ${join(gain)}` : '', lose.length ? `perdi ${join(lose)}` : ''].filter(Boolean).join(' e ') + '.';
  return s + stiff;
}

/* ---------- ESPLORA ---------- */
const COLS = [
  { key: 'name', label: 'Corda', get: nameOf, cell: (r) => `<button class="rowlink" data-open="${esc(r.id)}">${esc(nameOf(r))}</button>` },
  { key: 'mm', label: 'mm', n: true, get: (r) => r.gauge_mm, cell: (r) => fmtH(r.gauge_mm, 2) },
  { key: 'shape', label: 'Forma', get: (r) => SHAPES[r.shape] || r.shape || '', cell: (r) => esc(SHAPES[r.shape] || r.shape || '—') },
  { key: 'stiff', label: 'Rigidità lb/in', title: 'Rigidità dinamica TWU (lb/in). ≈ = stima da calibro gemello o da Racketpedia', n: true, get: (r) => r.stiffness?.value_lbin, cell: (r) => (r.stiffness ? `<span class="${isEst(r.stiffness, 'misurata') ? 'proxy' : ''}" title="${esc(stKind(r.stiffness))}">${isEst(r.stiffness, 'misurata') ? '≈' : ''}${fmt(r.stiffness.value_lbin, 0)}</span>` : fmtH(null)) },
  { key: 'spin', label: 'Spin TWU', title: 'Spin potential TWU, scala 0–10 a 51 lbs, swing veloce. ≈ = stima da calibro/colore gemello', n: true, get: (r) => r.spin?.value, cell: (r) => (!r.spin ? fmtH(null) : r.spin.value == null ? `<span class="proxy" title="giudizio dei tester, senza numero">${esc(spinWord(r))}</span>` : `<span class="${isEst(r.spin, 'misurato') ? 'proxy' : ''}" title="${esc(SPIN_KIND[r.spin.kind])}">${isEst(r.spin, 'misurato') ? '≈' : ''}${fmt(r.spin.value, 1)}</span>`) },
  { key: 'tl', label: 'Perdita TWU %', title: 'Perdita di tensione misurata da TWU (prova breve)', n: true, get: (r) => r.twu?.tension_loss_pct, cell: (r) => fmtH(r.twu?.tension_loss_pct, 1) },
  { key: 'si', label: 'Stiff Idx', title: 'Stiff Index del test Ektelon: indice di cedimento, più alto = la corda torna meno indietro', n: true, get: (r) => r.excel?.stiff_index_avg, cell: (r) => fmtH(r.excel?.stiff_index_avg, 2) },
  { key: 'score', label: 'Punti', title: 'Punteggio 0–100 = posizione in classifica tra le corde del banco', n: true, get: (r) => r._score, cell: (r) => fmtH(r._score, 0) },
  { key: 'sim', label: 'Affinità ★', title: 'Somiglianza (0–100) con la più vicina delle tue due preferite', n: true, get: bestLiked, cell: (r) => fmtH(bestLiked(r), 0) },
  { key: 'b', label: '', get: () => 0, cell: (r) => badges(r) },
];
let sortKey = 'score', sortDir = -1;
function initExplore() {
  const brands = [...new Set(ALL.map((r) => r.brand))].sort();
  $('#f-brand').insertAdjacentHTML('beforeend', brands.map((b) => `<option>${esc(b)}</option>`).join(''));
  const gauges = [...new Set(ALL.map((r) => r.gauge_label).filter(Boolean))].sort();
  $('#f-gauge').insertAdjacentHTML('beforeend', gauges.map((g) => `<option>${esc(g)}</option>`).join(''));
  const shapes = [...new Set(ALL.map((r) => r.shape).filter(Boolean))].sort();
  $('#f-shape').insertAdjacentHTML('beforeend', shapes.map((s) => `<option value="${esc(s)}">${esc(SHAPES[s] || s)}</option>`).join(''));
  ['#f-q', '#f-brand', '#f-gauge', '#f-shape', '#f-target', '#f-lab'].forEach((s) => $(s).addEventListener('input', renderExplore));
}
function renderExplore() {
  $('#badge-legend').innerHTML = legendHtml();
  const q = $('#f-q').value.trim().toLowerCase(), b = $('#f-brand').value, g = $('#f-gauge').value, sh = $('#f-shape').value;
  const rows = ALL.filter((r) => (!q || fullName(r).toLowerCase().includes(q)) && (!b || r.brand === b) && (!g || r.gauge_label === g) && (!sh || r.shape === sh) && (!$('#f-target').checked || r.is_target) && (!$('#f-lab').checked || !r.catalog_only));
  const col = COLS.find((c) => c.key === sortKey);
  rows.sort((a, c) => { if (sortKey === 'score' && hasLab(a) !== hasLab(c)) return hasLab(c) - hasLab(a); const va = col.get(a), vc = col.get(c); if (va == null && vc == null) return 0; if (va == null) return 1; if (vc == null) return -1; return (typeof va === 'string' ? va.localeCompare(vc) : va - vc) * sortDir; });
  $('#f-count').textContent = `${rows.length} corde. "≈" e corsivo indicano un valore stimato.`;
  $('#f-cards').innerHTML = rows.slice(0, 60).map((r) => card(r)).join('') + (rows.length > 60 ? `<p class="muted small">Mostrate le prime 60: usa i filtri per restringere.</p>` : '');
  $('#table').innerHTML = `<thead><tr>${COLS.map((c) => `<th class="${c.n ? 'n' : ''}" aria-sort="${c.key === sortKey ? (sortDir > 0 ? 'ascending' : 'descending') : 'none'}"><button type="button" data-sort="${c.key}"${c.title ? ` title="${esc(c.title)}"` : ''}>${esc(c.label)}${c.key === sortKey ? (sortDir > 0 ? ' ▲' : ' ▼') : ''}</button></th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${COLS.map((c) => `<td class="${c.n ? 'n' : ''}">${c.cell(r)}</td>`).join('')}</tr>`).join('')}</tbody>`;
  $('#table').querySelectorAll('[data-sort]').forEach((btn) => btn.addEventListener('click', () => { if (sortKey === btn.dataset.sort) sortDir = -sortDir; else { sortKey = btn.dataset.sort; sortDir = ['name', 'shape'].includes(sortKey) ? 1 : -1; } renderExplore(); }));
}

/* ---------- GUIDA ---------- */
function renderGuide() {
  const m = DATA.estimates_meta || {}, c = m.spin_calibration || {}, rp = m.rp_to_twu || {};
  $('#guida').innerHTML = `
    <h2>Come leggere il banco</h2>
    <p>Ogni corda ha fino a quattro fonti: il test Ektelon del tuo file, il laboratorio di Tennis Warehouse University (TWU), Racketpedia e le recensioni dei tester. Barre, punteggi e classifiche usano <b>solo dati di laboratorio</b>. Le recensioni dei tester restano nella scheda come link di riferimento, ma non spostano nulla.</p>
    <div class="callout"><h3>Perché le due rigidità non coincidono</h3>
      <p>Sulle ${rp.n ?? 48} corde misurate da entrambi, TWU e Racketpedia vanno nella stessa direzione ma non sono allineate (correlazione r = ${fmt(rp.r ?? 0.62, 2)}).</p>
      <ul>
        <li><b>Velocità di carico.</b> TWU colpisce la corda in pochi millesimi di secondo, come la palla; Racketpedia la carica lentamente. Il poliestere è viscoelastico: la rigidità cambia con la velocità e ogni miscela reagisce in modo diverso, quindi l'ordine tra corde si rimescola.</li>
        <li><b>Condizioni diverse.</b> Tensione di riferimento, lunghezza del tratto, temperatura, lotto e diametro reale.</li>
        <li><b>Risoluzione.</b> Racketpedia arrotonda a 0,05 kg/mm: molte corde risultano a pari merito.</li>
      </ul>
      <p>In campo pesa di più TWU, che simula l'impatto. Quando TWU manca convertiamo Racketpedia sulla scala TWU con un errore medio di ±${fmt(rp.mae ?? 11, 0)} lb/in.</p></div>
    <div class="callout"><h3>Come stimiamo la rigidità quando manca</h3>
      <ul>
        <li><b>Misurata</b>: rigidità dinamica TWU della stessa corda.</li>
        <li><b>Da gemello TWU, corretta per il diametro</b>: stessa corda in un altro calibro. Prima copiavamo il valore; ora lo correggiamo di circa ${fmt((m.stiffness_gauge || {}).slope, 0)} lb/in per mm (a parità di modello, su ${(m.stiffness_gauge || {}).n_pairs ?? '—'} coppie di calibri): errore medio ${fmt((m.stiffness_gauge || {}).mae, 1)} contro ${fmt((m.stiffness_gauge || {}).copy_mae, 1)} del copia-incolla, margine ±${fmt((m.stiffness_gauge || {}).q80, 0)} lb/in. Vale anche per le tue preferite: la Confidential 1,25 deriva dalla riga TWU del 1,30. Controllo indipendente: su dati di un altro laboratorio (USRSA, 25 coppie di calibri) la stessa correzione riduce l'errore da 20,7 a 7,8 lb/in.</li>
        <li><b>Da Racketpedia</b>: rigidità statica letta dalla scheda del sito (${(m.rpedia_site || {}).rows ?? '—'} righe verificate) e convertita sulla scala TWU (errore medio ±${fmt(rp.mae ?? 11, 0)} lb/in su ${rp.n ?? '—'} coppie), eventualmente di un calibro gemello e corretta per il diametro.</li>
        <li><b>Dal solo calibro</b>: l'ultima risorsa, per le corde senza nessun altro dato. Errore medio ${fmt(((m.stiffness_model || {}).gauge || {}).mae, 1)} contro ${fmt(((m.stiffness_model || {}).gauge || {}).baseline_mae, 1)} della media: è poco meglio di dire "nella media". Margine ±${fmt(((m.stiffness_model || {}).gauge || {}).q80, 0)} lb/in.</li>
      </ul>
      <p>I giudizi personali dei tester non entrano in nessuna stima (non sono misure). Le stime di rigidità si vedono con "≈", cerchi vuoti in mappa e barre tratteggiate; le ultime due sono escluse dal punteggio.</p></div>
    <div class="callout"><h3>Lo Stiff Index del tuo file</h3>
      <p>È (allungamento − recupero) / 11,25 × 100: misura quanto la corda <b>non torna indietro</b> dopo essere stata tirata. Nei dati si lega più alla perdita di tensione (r = 0,60) che alla rigidità (r = −0,34), quindi leggilo come indice di cedimento. Più alto = la corda cede di più.</p></div>
    <div class="callout"><h3>Come stimiamo lo spin</h3>
      <ul>
        <li><b>Misurato</b>: lo spin potential di TWU sulla stessa corda.</li>
        <li><b>Da calibro o colore gemello</b>: lo stesso modello misurato in un altro calibro, ±0,5.</li>
        <li><b>Da modello (rigidità e forma)</b>: per le corde senza TWU né gemello. Più morbida e a sezione esagonale = più spin. ${(m.spin_model?.stiffness_shape || {}).mae ? `Verificato su ${m.spin_model.stiffness_shape.n} corde misurate (leave-one-out): errore medio ${fmt(m.spin_model.stiffness_shape.mae, 2)} contro ${fmt(m.spin_model.stiffness_shape.baseline_mae, 2)} della media; l'intervallo mostrato (±${fmt(m.spin_model.stiffness_shape.q80, 1)}) copre circa l'80% dei casi. Senza rigidità si usa la sola forma (errore ${fmt((m.spin_model.shape || {}).mae, 2)}).` : ''} È una stima debole: l'effetto della forma esagonale viene da sole 6 corde misurate e non distingue corde vicine. Compare solo in mappa, confronto e schede, <b>mai nel punteggio o nelle top 3</b>.</li>
        <li><b>Recensioni</b>: non entrano nei calcoli. Le abbiamo verificate: ${c.n ? `su ${c.n} corde il voto spin dei tester non prevede lo spin TWU (pendenza ${fmt(c.a, 3)}), ` : ''}${(m.spin_qualitative || {}).n ? `e tradurre i giudizi in un numero sbaglia di ${fmt(m.spin_qualitative.mae, 2)} contro ${fmt(m.spin_qualitative.baseline_mae, 2)} della media.` : ''}</li>

      </ul>
      <p>Il tuo file Excel non basta a stimare lo spin: su 57 corde un modello basato su allungamento, recupero, forma e calibro sbaglia di 1,27 punti, peggio della media (1,20). Lo spin dipende soprattutto da quanto le corde scivolano l'una sull'altra, che il test in trazione non misura. Nella mappa le stime sono cerchi vuoti con la loro barra d'errore.</p></div>
    <div class="guide-grid">
      ${[['Rigidità', 'Alta: palla controllata e piatto compatto, meno potenza. Bassa: più potenza e comfort. È descrittiva: non è né meglio né peggio.'],
        ['Spin', 'Quanto le verticali scorrono e tornano in sede. Più alto = più rotazione a parità di swing.'],
        ['Tenuta', 'Quanto poco la corda perde tensione. Unisce la perdita TWU (prova breve) e, dove c\'è, la perdita TL6 del tuo test a 6 mesi. Con 4–5 ore a settimana conta: una poly che cala presto si sente alla seconda settimana.'],
        ['Controllo e comfort (stime)', 'Non sono misurati da nessuna fonte. Controllo segue la rigidità (e l\'allungamento a 50 lb del tuo test, dove c\'è); comfort è l\'opposto della rigidità. Le recensioni non entrano. "Potenza" è stata tolta: era sempre l\'opposto di controllo.'],
        ['Punteggio', 'Posizione 0–100 tra le corde del banco (non un voto assoluto): spin 35, tenuta 20, affinità con le tue preferite 20, servono spin e tenuta (senza, nessun punteggio); l\'affinità, se manca, si ignora. −15 se somiglia più a una non gradita (soglia 75). Per le corde con spin da gemello (±0,5) la scheda mostra anche l\'intervallo del punteggio.'],
        ['Affinità', 'Somiglianza (0–100) con la più vicina delle tue due preferite, calcolata su 6 misure (rigidità, perdita TWU, spin, Stiff Index, TL6, Racketpedia): distanza tra z-score, +5 se stessa forma. È vicinanza, non qualità. Penalità −15 se somiglia più a una non gradita (soglia 75).'],
        ['Tensione di partenza', `È una stima: parte dalla tua preferita più simile e la corregge di circa ${fmt(Math.abs((ALL.find((r) => r.derived.tension_start) || {}).derived?.tension_start?.slope_kg_per_15 ?? 0.75), 2)} kg ogni 15 lb/in di rigidità in più (massimo ±2 kg). La pendenza è ricavata dalle tue due preferite (la O-Toro, più morbida, la tendi 1 kg più alta): solo due punti, quindi è un punto di partenza ±1 kg, non una misura.`]]
        .map(([t, d]) => `<div class="gcard"><h3>${t}</h3><p>${d}</p></div>`).join('')}
    </div>
    ${(DATA.removed_discontinued || []).length ? `<div class="callout"><h3>Corde tolte perché vecchie o fuori produzione</h3><p class="small">Escluse le corde uscite prima del 2020 e quelle non più in vendita.</p><details><summary class="small">Elenco (${DATA.removed_discontinued.length})</summary><p class="small">${DATA.removed_discontinued.map((x) => `${esc(x.name)} <span class="muted">(${esc(x.reason || '')}${x.successor ? `, ora ${esc(x.successor)}` : ''})</span>`).join(' · ')}</p></details><p class="small muted">Anni e produzione raccolti da un agente dai siti dei produttori, Tennis Warehouse e Tennis Warehouse Europe: per molte corde l\'anno è solo "già in vendita nel…" e va verificato. Le tue 4 corde di riferimento restano comunque.</p></div>` : ''}
    ${legendHtml()}
    <h3>Glossario del file Excel (colonne A–Y)</h3>
    <div class="table-scroll"><table class="data"><tbody>${[['A–C', 'Marca, nome, calibro'], ['D–G', 'Tipo: poly, co-poly, budello, multifilamento'], ['H', 'Forma'], ['I', 'Tensione: 40, 50, 60, 65 lbs'], ['J–K', 'Lunghezza in tensione del tratto di 11,25″ e percentuale'], ['L–M', 'Lunghezza a riposo dopo il rilascio e percentuale'], ['N', 'Diff: stretch − recover'], ['O', 'Stiff Index: (diff / 11,25) × 100, indice di cedimento'], ['P–Q', 'Gain sul tratto e OLG sul piatto 16×19'], ['R–S', 'Elongazione al micrometro (non significativa)'], ['T–W', 'Peso statico 40 lbs: iniziale, dopo 24 h, a riposo, differenza'], ['X–Y', 'TL6 / TL12: perdita di tensione (%) a 6 e 12 mesi da 50 lbs']].map(([a, b]) => `<tr><td class="n">${a}</td><td style="white-space:normal">${esc(b)}</td></tr>`).join('')}</tbody></table></div>`;
}

/* ---------- avvio ---------- */
renderTop3(); renderTastes(); renderSliders(); renderList(); initMap(); initCompare(); initExplore(); renderExplore(); renderGuide();
$('#foot').innerHTML = `<p>Fonti: test Ektelon del tuo file, <a href="https://twu.tennis-warehouse.com/learning_center/reporter2.php" target="_blank" rel="noopener">TWU</a> (${esc(DATA.guide?.twu_ref || '51 lbs')}), <a href="https://www.racketpedia.com/" target="_blank" rel="noopener">Racketpedia</a> (solo rigidità statica gratuita), recensioni di Tennis Warehouse, Tennisnerd e altri solo come link di riferimento in ogni scheda.</p><p>${ALL.length} corde poly, calibri 1.18–1.30 mm. Aggiornato il ${esc(DATA.generated)}.</p>`;
showTab((location.hash || '').slice(1) || store.get('tab', 'perte'));
window.addEventListener('hashchange', () => showTab(location.hash.slice(1)));
