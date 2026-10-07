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
const SPIN_KIND = { misurato: 'misurato', parente: 'da calibro/colore gemello', tester: 'stimato dai tester', qualitativo: 'stimato dai giudizi' };
const STIFF_KIND = { misurata: 'misurata (TWU)', parente: 'da calibro gemello', 'da Racketpedia': 'da Racketpedia', qualitativo: 'dai giudizi dei tester' };
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
function rescore() { for (const r of ALL) r._score = profileScore(r.derived.subscores, weights, worstDisliked(r)); }
rescore();

/* ---------- componenti ---------- */
const CRIT = [['stiffness', 'Rigidità'], ['spin', 'Spin'], ['control', 'Controllo'], ['power', 'Potenza'], ['durability', 'Tenuta'], ['comfort', 'Comfort']];
function bars(r) {
  const j = r.derived.judgments || {};
  return `<div class="bars">${CRIT.map(([k, l]) => {
    const x = j[k] || {};
    const est = (k === 'spin' && isEst(r.spin, 'misurato')) || (k === 'stiffness' && isEst(r.stiffness, 'misurata')) || x.lab_share === 0;
    const title = x.score === null || x.score === undefined ? 'nessun dato' : `${Math.round(x.score)}/100 · dati di laboratorio`;
    return `<div class="bar-row" title="${esc(title)}"><span class="lab">${l}</span><div class="track"><div class="fill${k === 'stiffness' ? ' neutral' : ''}${est ? ' est' : ''}" style="width:${x.score ?? 0}%"></div></div><span class="word">${x.word ? `<b>${esc(x.word)}</b>` : '<span class="muted">n.d.</span>'}<span class="num">${x.score === null || x.score === undefined ? '' : Math.round(x.score)}</span></span></div>`;
  }).join('')}</div>`;
}
function badges(r) {
  const out = [];
  if (r.preference === 'liked') out.push('<span class="badge liked">★ preferita</span>');
  if (r.preference === 'disliked') out.push('<span class="badge disliked">✕ non gradita</span>');
  const labAny = Object.values(r.derived.judgments || {}).some((j) => j && j.lab_share > 0);
  if (r.catalog_only && !labAny) out.push('<span class="badge est" title="Nessun test di laboratorio: non viene giudicata">senza test di laboratorio</span>');
  else if (r.catalog_only) out.push('<span class="badge est" title="Non testata direttamente: i dati di laboratorio vengono da un calibro gemello">dati da calibro gemello</span>');
  if (r.spin && isEst(r.spin, 'misurato')) out.push(`<span class="badge est" title="Spin ${esc(SPIN_KIND[r.spin.kind])}">${r.spin.value == null ? 'spin solo dai tester' : 'spin stimato'}</span>`);
  if (r.derived.disliked_warning) out.push('<span class="badge warn" title="Somiglia più a una corda che non ti è piaciuta che alle tue preferite">⚠ simile a una non gradita</span>');
  if (r.crosscheck?.verdict === 'contradicted') out.push('<span class="badge warn" title="Recensioni e produttori contraddicono i numeri di laboratorio">⚑ dati contestati</span>');
  return out.join(' ');
}
const tensionText = (r) => { const t = r.derived.tension_start; return t ? `${fmt(t.kg[0], 1)}/${fmt(t.kg[1], 1)} kg · ${fmt(t.lbs[0], 1)}/${fmt(t.lbs[1], 1)} lbs` : '—'; };
function why(r) {
  const j = r.derived.judgments || {};
  const strong = [['spin', 'spin'], ['control', 'controllo'], ['durability', 'tenuta'], ['comfort', 'comfort'], ['power', 'potenza']]
    .filter(([k]) => (j[k]?.level || 0) >= 4).map(([, l]) => l);
  const parts = [];
  if (strong.length) parts.push(`Forte in ${strong.slice(0, 3).join(', ')}`);
  if (j.stiffness?.word) parts.push(`rigidità ${j.stiffness.word.replace('molto ', 'molto ')}`);
  const sl = r.derived.similarity_liked || {};
  const best = Object.entries(sl).filter(([, v]) => v !== null).sort((a, b) => b[1] - a[1])[0];
  if (best && best[1] >= 50) parts.push(`simile alla tua ${best[0] === 'confidential' ? 'Confidential' : 'O-Toro'} (${best[1]}/100)`);
  return parts.join(' · ') || 'Profilo nella media';
}
function card(r, opts = {}) {
  return `<article class="scard">
    ${opts.rank ? `<span class="rank-tag">${opts.rank}</span>` : ''}
    <div class="scard-head"><span class="scard-name">${esc(nameOf(r))}</span><span class="scard-score">${fmt(r._score, 0)}<small>per te</small></span><span class="scard-sub">${esc(subline(r))}</span></div>
    <div class="badges">${badges(r)}</div>
    ${opts.why ? `<p class="why">${esc(why(r))}</p>` : ''}
    ${bars(r)}
    <p class="tension-line">Tensione di partenza: <b class="num">${tensionText(r)}</b></p>
    <div class="card-actions"><button class="btn primary" type="button" data-open="${esc(r.id)}">Scheda</button><button class="btn" type="button" data-compare="${esc(r.id)}">Confronta</button></div>
  </article>`;
}

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

/* ---------- PER TE ---------- */
const reliable = (r) => r.is_target && !r.preference && !r.catalog_only && labSpin(r) && !r.derived.disliked_warning && r.crosscheck?.verdict !== 'contradicted' && r._score !== null;
function renderTop3() {
  const top = ALL.filter(reliable).sort((a, b) => b._score - a._score).slice(0, 3);
  $('#top3').innerHTML = top.map((r, i) => card(r, { rank: ['Prima scelta', 'Seconda scelta', 'Terza scelta'][i], why: true })).join('');
  $('#top3-note').textContent = 'Tra le marche che valuti, solo corde con spin misurato o da un calibro gemello; escluse quelle con dati contestati e quelle simili alle non gradite.';
}
function renderTastes() {
  $('#tastes').innerHTML = `<p class="eyebrow">Cosa dicono i tuoi gusti</p>${DATA.insight ? `<p>${esc(DATA.insight)}</p>` : ''}`;
}
const SLIDER_LABELS = { spin: 'Spin', control: 'Controllo', durability: 'Tenuta di tensione', power: 'Potenza' };
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
  spin: { desc: 'Almeno il controllo della tua Confidential (±10), ma più spin.', list: (rs) => rs.filter((r) => !r.preference && !r.derived.disliked_warning && sub(r, 'spin') !== null && sub(r, 'control') !== null && sub(r, 'control') >= sub(conf, 'control') - 10 && sub(r, 'spin') > sub(conf, 'spin')).sort((a, b) => sub(b, 'spin') - sub(a, 'spin')) },
  durable: { desc: 'Quelle che tengono meglio la tensione, escluse quelle simili alle non gradite.', list: (rs) => rs.filter((r) => sub(r, 'durability') !== null && !r.derived.disliked_warning && r.preference !== 'disliked').sort((a, b) => sub(b, 'durability') - sub(a, 'durability')) },
};
let preset = 'score';
document.querySelectorAll('.preset').forEach((b) => b.addEventListener('click', () => { preset = b.dataset.preset; document.querySelectorAll('.preset').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); renderList(); }));
function renderList() {
  const q = $('#q').value.trim().toLowerCase();
  let rs = ALL;
  if ($('#only-target').checked) rs = rs.filter((r) => r.is_target || r.preference);
  if (q) { rs = rs.filter((r) => fullName(r).toLowerCase().includes(q)); $('#preset-desc').textContent = `${rs.length} corde trovate per "${q}".`; }
  else $('#preset-desc').textContent = PRESETS[preset].desc;
  const list = (q ? rs.sort((a, b) => (b._score ?? -1) - (a._score ?? -1)) : PRESETS[preset].list([...rs])).slice(0, 12);
  $('#list').innerHTML = list.length ? list.map((r) => card(r)).join('') : '<p class="muted">Nessuna corda per questo criterio.</p>';
}

/* ---------- SCHEDA ---------- */
const dlg = $('#sheet');
$('#sheet-close').addEventListener('click', () => dlg.close());
dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
document.addEventListener('click', (e) => {
  const o = e.target.closest('[data-open]'); if (o) { openSheet(o.dataset.open); return; }
  const c = e.target.closest('[data-compare]'); if (c) { addToCompare(c.dataset.compare); }
});
const kv = (pairs) => `<dl class="kv">${pairs.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>`;
const sp = (o, k) => o?.[k] ?? o?.[String(k)];
const VERDICT = { confirmed: 'confermata', plausible: 'plausibile', questionable: 'dubbia', contradicted: 'contraddetta', no_data: 'nessun dato esterno' };
const KIND_IT = { lab_playtest: 'playtest', review: 'recensione', brand: 'produttore', forum: 'forum', video: 'video' };
const CRIT_IT = { spin: 'spin', comfort: 'comfort', control: 'controllo', power: 'potenza', durability: 'durata', stiffness: 'rigidità' };
function openSheet(id) {
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
  const stTxt = r.stiffness ? `${r.stiffness.kind === 'misurata' ? '' : '≈ '}${fmt(r.stiffness.value_lbin, 0)} lb/in${r.stiffness.kind === 'misurata' ? '' : ` (tra ${fmt(r.stiffness.low, 0)} e ${fmt(r.stiffness.high, 0)})`} · ${STIFF_KIND[r.stiffness.kind]}` : 'non disponibile';
  const revs = r.reviews?.sources || [];
  $('#sheet-body').innerHTML = `
    <div class="sheet-head">
      <p class="eyebrow">${r.is_target ? 'Marca valutata' : 'Concorrente di riferimento'}</p>
      <h2 id="sheet-title">${esc(nameOf(r))}</h2>
      <p class="muted">${esc(subline(r))}${r.shape_source ? ' (forma dal produttore)' : ''}${r.shape_source && r.shape_excel && r.shape_excel !== r.shape ? ` · nel tuo file: ${esc(SHAPES[r.shape_excel] || r.shape_excel)}` : ''}</p>
      <div class="badges">${badges(r)} <span class="badge">Punteggio ${fmt(r._score, 0)}</span></div>
    </div>
    <div class="tension"><div class="tbox"><span class="muted small">Tensione di partenza (verticali/orizzontali)</span><span class="big">${ts ? `${fmt(ts.kg[0], 1)} / ${fmt(ts.kg[1], 1)} kg` : '—'}</span><span class="num">${ts ? `${fmt(ts.lbs[0], 1)} / ${fmt(ts.lbs[1], 1)} lbs` : ''}</span>${ts ? `<span class="muted small">Indicativa: ${esc(ts.note)}</span>` : ''}</div>${olg}</div>
    ${bars(r)}
    ${kv([['Spin', esc(spinTxt)], ['Rigidità', esc(stTxt)]])}
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
  $('#map-legend').innerHTML = ['liked', 'disliked', 'target', 'other'].map((c) => `<span><i class="sw" style="background:${CAT_COLOR[c]}"></i>${CAT_LABEL[c]}</span>`).join('') + '<span><i class="sw hollow"></i>Valore stimato, con margine</span>';
}
function ticks(min, max, n = 5) {
  const span = max - min || 1, step0 = span / n, mag = 10 ** Math.floor(Math.log10(step0));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= step0);
  const out = []; for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) out.push(+v.toFixed(6));
  return out;
}
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0; };
function drawScatter() {
  const kx = $('#ax-x').value, ky = $('#ax-y').value, mx = AX[kx], my = AX[ky];
  const showComp = $('#show-comp').checked, showEst = $('#show-est').checked;
  const pts = ALL.filter((r) => (showComp || r.is_target || r.preference) && mx.get(r) != null && my.get(r) != null && (showEst || (!mx.est(r) && !my.est(r))));
  const W = 900, H = 540, L = 60, R = 18, T = 18, B = 52, svg = $('#scatter');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  if (!pts.length) { svg.innerHTML = `<text x="${W / 2}" y="${H / 2}" text-anchor="middle">Nessuna corda con entrambi i valori</text>`; return; }
  const xs = pts.flatMap((r) => [mx.get(r), mx.lo?.(r), mx.hi?.(r)]).filter((v) => v != null);
  const ys = pts.flatMap((r) => [my.get(r), my.lo?.(r), my.hi?.(r)]).filter((v) => v != null);
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
  s += `<text class="axis-title" transform="translate(16 ${(T + H - B) / 2}) rotate(-90)" text-anchor="middle">${esc(my.label)}${ky === 'spin' ? ' → più spin' : ''}</text>`;
  const order = { other: 0, target: 1, disliked: 2, liked: 3 };
  for (const r of [...pts].sort((a, b) => order[cat(a)] - order[cat(b)])) {
    const x = sx(mx.get(r)), y = sy(my.get(r)), c = CAT_COLOR[cat(r)], est = mx.est(r) || my.est(r);
    if (my.est(r) && my.lo) s += `<line class="err" x1="${x}" x2="${x}" y1="${sy(my.lo(r))}" y2="${sy(my.hi(r))}" stroke="${c}"/>`;
    if (mx.est(r) && mx.lo) s += `<line class="err" x1="${sx(mx.lo(r))}" x2="${sx(mx.hi(r))}" y1="${y}" y2="${y}" stroke="${c}"/>`;
    s += `<circle class="dot${est ? ' hollow' : ''}" data-id="${esc(r.id)}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.preference ? 8 : 6}" ${est ? `stroke="${c}"` : `fill="${c}"`} tabindex="0" role="button" aria-label="${esc(fullName(r))}"/>`;
  }
  const groups = [];
  for (const r of pts.filter((r) => r.preference)) {
    const x = sx(mx.get(r)), y = sy(my.get(r));
    const g = groups.find((g) => g.model === r.model && Math.hypot(g.x - x, g.y - y) < 14);
    if (g) g.g.push(r.gauge_label || ''); else groups.push({ x, y, model: r.model, pref: r.preference, g: [r.gauge_label || ''] });
  }
  for (const g of groups) { const right = g.x < W - 220; s += `<text class="lbl" x="${g.x + (right ? 11 : -11)}" y="${g.y - 9}" text-anchor="${right ? 'start' : 'end'}">${g.pref === 'liked' ? '★ ' : '✕ '}${esc(g.model)} ${esc(g.g.join(' · '))}</text>`; }
  svg.innerHTML = s;
  const tip = $('#tip');
  svg.querySelectorAll('.dot').forEach((d) => {
    const r = BY_ID[d.dataset.id];
    const show = () => {
      tip.hidden = false;
      tip.innerHTML = `<b>${esc(fullName(r))}</b><br>${esc(mx.short)} ${mx.est(r) ? '≈ ' : ''}${fmt(mx.get(r), mx.d)} · ${esc(my.short)} ${my.est(r) ? '≈ ' : ''}${fmt(my.get(r), my.d)}`;
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
  const opts = '<option value="">— scegli —</option>' + [...ALL].sort((a, b) => fullName(a).localeCompare(fullName(b))).map((r) => `<option value="${esc(r.id)}">${esc(fullName(r))}${r.preference === 'liked' ? ' ★' : r.preference === 'disliked' ? ' ✕' : ''}</option>`).join('');
  $('#cmp-pickers').innerHTML = [0, 1, 2, 3].map((i) => `<label><span><i class="sw" style="background:${SLOT[i]}"></i> Corda ${i + 1}</span><select id="cmp-${i}">${opts}</select></label>`).join('');
  [0, 1, 2, 3].forEach((i) => { const s = $('#cmp-' + i); s.value = picks[i] || ''; s.addEventListener('change', () => { picks[i] = s.value; store.set('picks2', picks); renderCompare(); }); });
}
function addToCompare(id) {
  if (!picks.includes(id)) { const i = picks.findIndex((p) => !p); picks[i === -1 ? 3 : i] = id; store.set('picks2', picks); [0, 1, 2, 3].forEach((k) => { $('#cmp-' + k).value = picks[k] || ''; }); }
  if (dlg.open) dlg.close();
  showTab('confronta'); history.replaceState(null, '', '#confronta'); scrollTo(0, 0);
}
const ROWS = [
  { k: 'stiffness', label: 'Rigidità', lead: 'più rigida', val: (r) => r.stiffness?.value_lbin, show: (r) => `${r.stiffness ? `${isEst(r.stiffness, 'misurata') ? '≈ ' : ''}${fmt(r.stiffness.value_lbin, 0)} lb/in` : '—'} · ${r.derived.judgments?.stiffness?.word || 'n.d.'}`, small: (r) => [r.stiffness && isEst(r.stiffness, 'misurata') ? STIFF_KIND[r.stiffness.kind] : '', r.rpedia ? `Racketpedia ${fmt(r.rpedia.static_stiffness_kgmm, 2)} kg/mm` : '', r.excel?.stiff_index_avg != null ? `Stiff Index ${fmt(r.excel.stiff_index_avg, 2)}` : ''].filter(Boolean).join(' · ') },
  { k: 'spin', label: 'Spin', lead: 'più spin', val: (r) => (labSpin(r) ? r.spin.value : null), show: (r) => (r.spin && r.spin.value == null ? `${spinWord(r)} secondo i tester` : `${r.spin ? `${isEst(r.spin, 'misurato') ? '≈ ' : ''}${fmt(r.spin.value, 1)}` : '—'} · ${r.derived.judgments?.spin?.word || 'n.d.'}`), small: (r) => (!r.spin ? '' : r.spin.value == null ? 'nessuna stima numerica affidabile' : isEst(r.spin, 'misurato') ? `${SPIN_KIND[r.spin.kind]}, tra ${fmt(r.spin.low, 1)} e ${fmt(r.spin.high, 1)}` : '') },
  { k: 'control', label: 'Controllo', lead: 'più controllo', val: (r) => r.derived.judgments?.control?.score },
  { k: 'power', label: 'Potenza', lead: 'più potenza', val: (r) => r.derived.judgments?.power?.score },
  { k: 'durability', label: 'Tenuta', lead: 'tiene meglio', val: (r) => r.derived.judgments?.durability?.score, small: (r) => [r.twu?.tension_loss_pct != null ? `TWU −${fmt(r.twu.tension_loss_pct, 0)}%` : '', r.excel?.tl6 != null ? `6 mesi −${fmt(r.excel.tl6, 0)}%` : '', r.excel?.tl12 != null ? `12 mesi −${fmt(r.excel.tl12, 0)}%` : ''].filter(Boolean).join(' · ') },
  { k: 'comfort', label: 'Comfort', lead: 'più comoda', val: (r) => r.derived.judgments?.comfort?.score },
];
function renderCompare() {
  const chosen = picks.map((id, i) => ({ r: BY_ID[id], i })).filter((x) => x.r);
  const leaders = {};
  for (const row of ROWS) {
    const vals = chosen.map(({ r }) => row.val(r)).filter((v) => v != null);
    if (vals.length >= 2) leaders[row.k] = Math.max(...vals);
  }
  $('#cmp-cards').innerHTML = chosen.length ? chosen.map(({ r, i }) => `<article class="ccard">
    <h3><i class="sw" style="background:${SLOT[i]}"></i> ${esc(nameOf(r))}</h3><p class="muted small">${esc(subline(r))}</p><div class="badges">${badges(r)}</div>
    ${ROWS.map((row) => { const v = row.val(r); const w = r.derived.judgments?.[row.k];
      return `<div class="crow"><span class="k">${row.label}</span><span class="v">${row.show ? row.show(r) : `${w?.word || 'n.d.'} <span class="num muted">${v == null ? '' : Math.round(v)}</span>`}</span>${row.small && row.small(r) ? `<span class="s">${esc(row.small(r))}</span>` : ''}${v != null && leaders[row.k] === v ? `<span class="lead">▲ ${row.lead}</span>` : ''}</div>`; }).join('')}
    <div class="crow"><span class="k">Tensione di partenza</span><span class="v num">${tensionText(r)}</span></div>
    <div class="crow"><span class="k">Punteggio per te</span><span class="v">${fmt(r._score, 0)}</span></div>
    <button class="btn" type="button" data-open="${esc(r.id)}">Scheda</button></article>`).join('') : '<p class="muted">Scegli almeno una corda.</p>';
  $('#cmp-summary').innerHTML = chosen.length >= 2 ? summary(chosen[0].r, chosen[1].r) : '';
}
function summary(a, b) {
  const gain = [], lose = [];
  for (const [k, l] of [['spin', 'spin'], ['control', 'controllo'], ['power', 'potenza'], ['durability', 'tenuta'], ['comfort', 'comfort']]) {
    const va = a.derived.judgments?.[k]?.score, vb = b.derived.judgments?.[k]?.score;
    if (va == null || vb == null) continue;
    if (vb - va >= 10) gain.push(l); else if (va - vb >= 10) lose.push(l);
  }
  const join = (xs) => (xs.length > 1 ? xs.slice(0, -1).join(', ') + ' e ' + xs.at(-1) : xs[0]);
  const sa = a.stiffness?.value_lbin, sb = b.stiffness?.value_lbin;
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
  { key: 'stiff', label: 'Rigidità', n: true, get: (r) => r.stiffness?.value_lbin, cell: (r) => (r.stiffness ? `<span class="${isEst(r.stiffness, 'misurata') ? 'proxy' : ''}" title="${esc(STIFF_KIND[r.stiffness.kind])}">${isEst(r.stiffness, 'misurata') ? '≈' : ''}${fmt(r.stiffness.value_lbin, 0)}</span>` : fmtH(null)) },
  { key: 'spin', label: 'Spin', n: true, get: (r) => r.spin?.value, cell: (r) => (!r.spin ? fmtH(null) : r.spin.value == null ? `<span class="proxy" title="giudizio dei tester, senza numero">${esc(spinWord(r))}</span>` : `<span class="${isEst(r.spin, 'misurato') ? 'proxy' : ''}" title="${esc(SPIN_KIND[r.spin.kind])}">${isEst(r.spin, 'misurato') ? '≈' : ''}${fmt(r.spin.value, 1)}</span>`) },
  { key: 'tl', label: 'Perdita %', n: true, get: (r) => r.twu?.tension_loss_pct, cell: (r) => fmtH(r.twu?.tension_loss_pct, 1) },
  { key: 'si', label: 'Stiff Idx', title: 'Stiff Index del test Ektelon: indice di cedimento, più alto = la corda torna meno indietro', n: true, get: (r) => r.excel?.stiff_index_avg, cell: (r) => fmtH(r.excel?.stiff_index_avg, 2) },
  { key: 'score', label: 'Per te', n: true, get: (r) => r._score, cell: (r) => fmtH(r._score, 0) },
  { key: 'sim', label: 'Simil. ★', n: true, get: bestLiked, cell: (r) => fmtH(bestLiked(r), 0) },
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
    <div class="callout"><h3>Lo Stiff Index del tuo file</h3>
      <p>È (allungamento − recupero) / 11,25 × 100: misura quanto la corda <b>non torna indietro</b> dopo essere stata tirata. Nei dati si lega più alla perdita di tensione (r = 0,60) che alla rigidità (r = −0,34), quindi leggilo come indice di cedimento. Più alto = la corda cede di più.</p></div>
    <div class="callout"><h3>Come stimiamo lo spin</h3>
      <ul>
        <li><b>Misurato</b>: lo spin potential di TWU sulla stessa corda.</li>
        <li><b>Da calibro o colore gemello</b>: lo stesso modello misurato in un altro calibro, ±0,5.</li>
        <li><b>Recensioni</b>: non entrano nei calcoli. Le abbiamo verificate: ${c.n ? `su ${c.n} corde il voto spin dei tester non prevede lo spin TWU (pendenza ${fmt(c.a, 3)}), ` : ''}${(m.spin_qualitative || {}).n ? `e tradurre i giudizi in un numero sbaglia di ${fmt(m.spin_qualitative.mae, 2)} contro ${fmt(m.spin_qualitative.baseline_mae, 2)} della media.` : ''}</li>

      </ul>
      <p>Il tuo file Excel non basta a stimare lo spin: su 57 corde un modello basato su allungamento, recupero, forma e calibro sbaglia di 1,27 punti, peggio della media (1,20). Lo spin dipende soprattutto da quanto le corde scivolano l'una sull'altra, che il test in trazione non misura. Nella mappa le stime sono cerchi vuoti con la loro barra d'errore.</p></div>
    <div class="guide-grid">
      ${[['Rigidità', 'Alta: palla controllata e piatto compatto, meno potenza. Bassa: più potenza e comfort. È descrittiva: non è né meglio né peggio.'],
        ['Spin', 'Quanto le verticali scorrono e tornano in sede. Più alto = più rotazione a parità di swing.'],
        ['Tenuta', 'Quanto poco la corda perde tensione. Con 4–5 ore a settimana conta: una poly che cala presto si sente alla seconda settimana.'],
        ['Controllo e potenza', 'Vengono dalla rigidità vista in direzioni opposte, più l\'allungamento del tuo test e i giudizi dei tester.'],
        ['Comfort', 'Opposto della rigidità statica (o dinamica se manca), più i giudizi dei tester.'],
        ['Tensione di partenza', 'Dalla tua preferita più simile, corretta di circa 0,75 kg ogni 15 lb/in di differenza di rigidità, fino a ±2 kg.']]
        .map(([t, d]) => `<div class="gcard"><h3>${t}</h3><p>${d}</p></div>`).join('')}
    </div>
    <h3>Glossario del file Excel (colonne A–Y)</h3>
    <div class="table-scroll"><table class="data"><tbody>${[['A–C', 'Marca, nome, calibro'], ['D–G', 'Tipo: poly, co-poly, budello, multifilamento'], ['H', 'Forma'], ['I', 'Tensione: 40, 50, 60, 65 lbs'], ['J–K', 'Lunghezza in tensione del tratto di 11,25″ e percentuale'], ['L–M', 'Lunghezza a riposo dopo il rilascio e percentuale'], ['N', 'Diff: stretch − recover'], ['O', 'Stiff Index: (diff / 11,25) × 100, indice di cedimento'], ['P–Q', 'Gain sul tratto e OLG sul piatto 16×19'], ['R–S', 'Elongazione al micrometro (non significativa)'], ['T–W', 'Peso statico 40 lbs: iniziale, dopo 24 h, a riposo, differenza'], ['X–Y', 'Perdita di tensione a 6 e 12 mesi da 50 lbs']].map(([a, b]) => `<tr><td class="n">${a}</td><td style="white-space:normal">${esc(b)}</td></tr>`).join('')}</tbody></table></div>`;
}

/* ---------- avvio ---------- */
renderTop3(); renderTastes(); renderSliders(); renderList(); initMap(); initCompare(); initExplore(); renderExplore(); renderGuide();
$('#foot').innerHTML = `<p>Fonti: test Ektelon del tuo file, <a href="https://twu.tennis-warehouse.com/learning_center/reporter2.php" target="_blank" rel="noopener">TWU</a> (${esc(DATA.guide?.twu_ref || '51 lbs')}), <a href="https://www.racketpedia.com/" target="_blank" rel="noopener">Racketpedia</a> (solo rigidità statica gratuita), recensioni di Tennis Warehouse, Tennisnerd e altri solo come link di riferimento in ogni scheda.</p><p>${ALL.length} corde poly, calibri 1.18–1.30 mm. Aggiornato il ${esc(DATA.generated)}.</p>`;
showTab((location.hash || '').slice(1) || store.get('tab', 'perte'));
window.addEventListener('hashchange', () => showTab(location.hash.slice(1)));
