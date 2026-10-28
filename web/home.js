// "La tua corda" (spec §4.3): 3 modelli da provare rispetto alla corda attuale, poi altre da considerare e Avanzate.
import { profileScore, DEFAULT_WEIGHTS, dislikedFlag } from './score.js';
import { candidates, describeDelta, tensionFrom, modelId, values } from './recommend.js';
import { $, ALL, BY_ID, DATA, LIKED_IDS, esc, fmt, fullName, nameOf, NF, safeUrl, store, subline } from './format.js';
import { valButton, infoButton } from './prov.js';
import { badges } from './badges.js';
import { getCurrent } from './current.js';

/* ---------- punteggio live (solo per ordinare: il numero non si mostra) ---------- */
let homeWeights = { ...DEFAULT_WEIGHTS, ...store.get('weights', {}) };
const bestLiked = (r) => { const v = Object.values(r.derived.similarity_liked || {}).filter((x) => x !== null); return v.length ? Math.max(...v) : null; };
function worstDisliked(r) {
  if (r.preference) return null;
  const v = Object.values(r.derived.similarity_disliked || {}).filter((x) => x !== null);
  const w = v.length ? Math.max(...v) : null;
  return dislikedFlag(bestLiked(r), w) ? w : null;
}
export const liveScore = (r) => profileScore(r.derived.subscores, homeWeights, worstDisliked(r));

/* ---------- pezzi condivisi con confronto e scheda ---------- */
export const DIR_MARK = { up: '▲', down: '▼', same: '=' };
const DELTA_LABEL = { spin: 'Spin', stiffness: 'Rigidità', loss: 'Perdita di tensione' };
const DELTA_FIELD = { spin: 'spin', stiffness: 'stiffness', loss: 'tension_loss' };
export function valueHtml(r, key) {
  const v = values(r)[key];
  if (!v) return '<span class="muted">non misurato</span>';
  const txt = key === 'spin' ? fmt(v.v, 1) : key === 'stiffness' ? `${fmt(v.v, 0)} lb/in` : `${fmt(v.v, 0)} %`;
  return valButton(r, DELTA_FIELD[key], `${v.approx ? '≈ ' : ''}${txt}`);
}
const kgRange = ([a, b]) => `${NF(a % 1 ? 1 : 0).format(a)}–${NF(b % 1 ? 1 : 0).format(b)}`;
export function tensionHtml(r, cur) {
  const t = tensionFrom(r, cur.r, cur.kg);
  const how = t.corrected
    ? `Regola empirica non validata: parte dalla tua corda (${fullName(cur.r)} a ${fmt(cur.kg[0], 1)}/${fmt(cur.kg[1], 1)} kg) e corregge di ${fmt(t.delta, 1)} kg (−0,75 kg ogni 15 lb/in di rigidità in più, al massimo ±2 kg). L'intervallo è ±1 kg.`
    : `Manca la rigidità di laboratorio di una delle due corde: si parte dalla tensione della tua corda senza correzione. L'intervallo è ±1 kg.`;
  return `<p class="tension-line">Tensione di partenza ${infoButton('badge est', 'stima', how)} <b class="tkg">${kgRange(t.range[0])} / ${kgRange(t.range[1])} kg</b></p>`;
}
function deltaChips(r, cur) {
  const d = describeDelta(r, cur.r);
  const byKey = Object.fromEntries(d.parts.map((p) => [p.key, p]));
  return `<ul class="deltas">${['spin', 'stiffness', 'loss'].map((k) => {
    const p = byKey[k];
    return `<li class="delta ${p ? p.dir : 'none'}"><span class="dl">${DELTA_LABEL[k]}</span> ${valueHtml(r, k)} <span class="dm" aria-label="${p ? { up: 'più alto', down: 'più basso', same: 'simile' }[p.dir] : 'non confrontabile'}">${p ? DIR_MARK[p.dir] : '·'}</span></li>`;
  }).join('')}</ul>`;
}
const otherGauges = (r) => ALL.filter((x) => x.id !== r.id && modelId(x) === modelId(r)).map((x) => mmFmt(x)).filter(Boolean);
const mmFmt = (r) => (r.gauge_mm ? NF(2).format(r.gauge_mm) : r.gauge_label);

function homeCard(r, i, cur) {
  const d = describeDelta(r, cur.r), others = otherGauges(r);
  return `<article class="scard pick">
    <span class="rank-tag">${['1ª', '2ª', '3ª'][i]} scelta</span>
    <div class="scard-head"><span class="scard-name">${esc(nameOf(r))}</span><span class="scard-sub">calibro consigliato ${esc(subline(r))}${others.length ? ` · altri calibri: ${esc(others.join(', '))}` : ''}</span></div>
    <p class="why">${esc(d.sentence)}</p>
    ${deltaChips(r, cur)}
    ${tensionHtml(r, cur)}
    <div class="badges">${badges(r, cur)}</div>
    <div class="card-actions"><button class="btn primary" type="button" data-compare="${esc(r.id)}">Confronta</button><button class="btn" type="button" data-open="${esc(r.id)}">Scheda</button></div>
  </article>`;
}
const homeRow = (r, cur) => `<li><button class="rowlink" type="button" data-open="${esc(r.id)}">${esc(fullName(r))}</button> <span class="muted small">${esc(describeDelta(r, cur.r).sentence)}</span></li>`;

/* ---------- schermata ---------- */
export function renderHome() {
  const cur = getCurrent();
  const list = candidates(ALL, cur.r, LIKED_IDS, liveScore);
  const top = list.slice(0, 3), more = list.slice(3, 12);
  $('#home-top').innerHTML = `<div class="section-head"><h2>Le 3 da provare dopo la tua ${esc(nameOf(cur.r))}</h2>
    <p class="muted small">Solo dati di laboratorio; escluse le versioni della tua corda e delle preferite, le non gradite e i dati incerti. Tocca un numero per vederne la fonte.</p></div>
    ${top.length < 3 ? `<p class="callout">Solo ${top.length} ${top.length === 1 ? 'corda rispetta' : 'corde rispettano'} i criteri: allarga i pesi in Avanzate.</p>` : ''}
    <div class="top3">${top.map((r, i) => homeCard(r, i, cur)).join('')}</div>`;
  const q = (store.get('home-q', '') || '').trim().toLowerCase();
  const found = q ? ALL.filter((r) => r.id !== cur.id && fullName(r).toLowerCase().includes(q)).slice(0, 12) : [];
  $('#home-more').innerHTML = `<div class="section-head"><h2>${q ? `Ricerca: ${found.length} ${found.length === 1 ? 'corda' : 'corde'}` : `Altre ${more.length} da considerare`}</h2></div>
    <label class="search"><span class="sr">Cerca una corda</span><input type="search" id="home-q" placeholder="Cerca: Hyper-G, Toro, Zero…" value="${esc(q)}"></label>
    <ul class="rows">${(q ? found : more).map((r) => homeRow(r, cur)).join('') || '<li class="muted">Nessuna corda.</li>'}</ul>`;
  const inp = $('#home-q');
  inp.addEventListener('input', () => { store.set('home-q', inp.value); renderHome(); const n = $('#home-q'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); });
  renderAdvanced();
}

const SLIDER_LABELS = { spin: 'Spin', durability: 'Tenuta di tensione', affinity: 'Somiglianza alle tue preferite' };
function renderAdvanced() {
  const el = $('#home-adv');
  const wasOpen = el.querySelector('details')?.open;
  const removed = DATA.removed_discontinued || [];
  el.innerHTML = `<details class="advanced"${wasOpen ? ' open' : ''}><summary>Avanzate: pesi, ipotesi sui tuoi gusti, corde tolte</summary>
    <h3>Cosa conta per te</h3>
    <div id="sliders">${Object.keys(DEFAULT_WEIGHTS).map((k) => `<div class="slider"><div class="lab"><label for="w-${k}">${SLIDER_LABELS[k]}</label><span class="num">${homeWeights[k]}</span></div><input type="range" id="w-${k}" data-w="${k}" min="0" max="50" step="5" value="${homeWeights[k]}"></div>`).join('')}</div>
    <button class="ghost" id="reset-weights" type="button">Ripristina pesi</button>
    <h3>Cosa dicono i tuoi gusti (ipotesi)</h3>
    ${DATA.insight ? `<p>${esc(DATA.insight)}</p>` : ''}<p class="muted small">Ipotesi ricavata da 4 corde (2 preferite, 2 non gradite): non è una regola.</p>
    <h3>Corde tolte (${removed.length})</h3>
    <p class="muted small">Uscite prima del 2020 o fuori produzione. Anni raccolti da un agente: per molte è solo "già in vendita nel…".</p>
    <input type="search" id="removed-q" placeholder="Filtra le corde tolte">
    <div class="table-scroll"><table class="data" id="removed"><thead><tr><th>Corda</th><th>Motivo</th><th>Sostituita da</th></tr></thead><tbody>${removed.map((x) => `<tr><td>${esc(x.name)}</td><td>${esc(x.reason || '')}</td><td>${esc(x.successor || '')}</td></tr>`).join('')}</tbody></table></div>
  </details>`;
  el.querySelectorAll('[data-w]').forEach((s) => s.addEventListener('change', () => { homeWeights[s.dataset.w] = Number(s.value); store.set('weights', homeWeights); renderHome(); }));
  $('#reset-weights').addEventListener('click', () => { homeWeights = { ...DEFAULT_WEIGHTS }; store.set('weights', homeWeights); renderHome(); });
  $('#removed-q').addEventListener('input', (e) => { const q = e.target.value.toLowerCase(); el.querySelectorAll('#removed tbody tr').forEach((tr) => { tr.hidden = q && !tr.textContent.toLowerCase().includes(q); }); });
}

/* ---------- scheda dettaglio ---------- */
const sheetDlg = $('#sheet');
$('#sheet-close').addEventListener('click', () => sheetDlg.close());
sheetDlg.addEventListener('click', (e) => { if (e.target === sheetDlg) sheetDlg.close(); });
const kv = (pairs) => `<dl class="kv">${pairs.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>`;
const sp = (o, k) => o?.[k] ?? o?.[String(k)];
const VERDICT = { confirmed: 'confermata', plausible: 'plausibile', questionable: 'dubbia', contradicted: 'contraddetta', no_data: 'nessun dato esterno' };
const KIND_IT = { lab_playtest: 'playtest', review: 'recensione', brand: 'produttore', forum: 'forum', video: 'video' };

export function openSheet(id) {
  const r = BY_ID[id]; if (!r) return;
  const cur = getCurrent(), e = r.excel, t = r.twu, p = r.rpedia;
  const ex = (html) => valButton(r, 'excel', html);
  const tw = (field, v, d, unit = '') => (v == null ? '<span class="muted">non misurato</span>' : valButton(r, field, `${fmt(v, d)}${unit}`));
  const revs = r.reviews?.sources || [];
  $('#sheet-body').innerHTML = `
    <div class="sheet-head">
      <p class="eyebrow">${r.is_target ? 'Marca valutata' : 'Concorrente di riferimento'}</p>
      <h2 id="sheet-title">${esc(nameOf(r))}</h2>
      <p class="muted">${esc(subline(r))}${r.shape_source ? ' (forma dal produttore)' : ''}</p>
      <div class="badges">${badges(r, cur)}</div>
    </div>
    ${r.id === cur.id ? '<p>È la corda che monti adesso.</p>' : `<p class="why">Rispetto alla tua ${esc(fullName(cur.r))}: ${esc(describeDelta(r, cur.r).sentence)}</p>${deltaChips(r, cur)}${tensionHtml(r, cur)}`}
    <details class="sheet-section" open><summary>Note dell'incordatore</summary>
      ${[['feel', 'Sensazione'], ['on_blade_100_v9', 'Sulla Blade 100 v9'], ['for_your_style', 'Per il tuo stile'], ['vs_favorites', 'Rispetto alle tue preferite']].filter(([k]) => r.notes?.[k]).map(([k, l]) => `<div class="note"><h3>${l}</h3><p>${esc(r.notes[k])}</p></div>`).join('') || '<p class="muted small">Nessuna nota.</p>'}
    </details>
    <details class="sheet-section"><summary>Dati di laboratorio</summary>
      <div class="src"><h3>Tennis Warehouse University</h3>${t ? `${t.match !== 'exact' && t.match !== 'probable' ? `<p class="proxy small">Dato di «${esc(t.twu_name)}» (stesso modello, altro calibro).</p>` : ''}${kv([
        ['Rigidità dinamica', tw('stiffness', t.stiffness_lbin, 0, ' lb/in')], ['Perdita di tensione', tw('tension_loss', t.tension_loss_pct, 0, ' %')], ['Spin (scala TWU)', tw('spin', t.spin_potential, 1)],
        ['Restituzione di energia', tw('energy_return', t.energy_return_pct, 0, ' %')], ['Attrito corda-corda', tw('cof_string_string', t.cof_string_string, 3)], ['Attrito corda-palla', tw('cof_string_ball', t.cof_string_ball, 3)]])}` : '<p class="muted small">Non testata da TWU.</p>'}</div>
      <div class="src"><h3>Test Ektelon (tuo file)</h3>${e ? kv([
        ['Allungamento 40 / 50 / 60 / 65 lbs', ex(['40', '50', '60', '65'].map((k) => fmt(sp(e.stretch_pct, k), 1)).join(' / ') + ' %')],
        ['Stiff Index medio <span class="muted">(indice di cedimento)</span>', ex(fmt(e.stiff_index_avg, 2))],
        ['Perdita di tensione 6 / 12 mesi', ex(`${e.tl6 == null ? '—' : fmt(e.tl6, 0) + ' %'} / ${e.tl12 == null ? '—' : fmt(e.tl12, 0) + ' %'}`)]]) : '<p class="muted small">Non testata nel tuo file.</p>'}</div>
      <div class="src"><h3>Racketpedia</h3>${p ? `${kv([['Rigidità statica', fmt(p.static_stiffness_kgmm, 2) + ' kg/mm']])}<p class="small"><a href="${esc(safeUrl(p.url))}" target="_blank" rel="noopener">Apri su Racketpedia</a></p>` : '<p class="muted small">Non presente.</p>'}</div>
    </details>
    <details class="sheet-section"><summary>Recensioni (${revs.length}, solo link: non entrano nei calcoli)</summary>
      ${revs.length ? revs.map((s) => `<div class="rev"><span><b>${esc(s.site)}</b> <span class="muted small">${esc(KIND_IT[s.kind] || s.kind)}</span></span>${s.note ? `<span class="muted small">${esc(s.note)}</span>` : ''}<a class="small" href="${esc(safeUrl(s.url))}" target="_blank" rel="noopener">Apri</a></div>`).join('') : '<p class="muted small">Nessuna recensione trovata.</p>'}
    </details>
    ${r.crosscheck ? `<details class="sheet-section"><summary>Controllo incrociato: ${esc(VERDICT[r.crosscheck.verdict] || r.crosscheck.verdict)}</summary>${r.crosscheck.note ? `<p class="small">${esc(r.crosscheck.note)}</p>` : ''}</details>` : ''}
    <div class="card-actions"><button class="btn primary" type="button" data-compare="${esc(r.id)}">Aggiungi al confronto</button></div>`;
  if (!sheetDlg.open) sheetDlg.showModal();
  sheetDlg.scrollTop = 0;
}
