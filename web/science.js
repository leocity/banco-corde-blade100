// Schermata «Scienza»: cosa conta in una corda (con fonti e livello di prova), righelli delle misure, recensioni, fonti e date.
import { $, esc, fullName } from './format.js';
import { CMP_KEYS } from './cmp.js';
import { scaleOf, layoutLabels, nearest } from './rulers.js';
import { tip, fmtV, itDate } from './ui.js';
import { trialsOf } from './state.js';
import { diaryCsv } from './diary.js';

const SCI_LV = { D: ['Dimostrata', 'ok'], P: ['Plausibile, non misurata', 'est'], I: ['Ipotesi', 'warn'] };
const SCI_URL = {
  stiff: 'https://twu.tennis-warehouse.com/learning_center/stringstiffness.php',
  dead: 'https://twu.tennis-warehouse.com/learning_center/deadstrings.php',
  heat: 'https://twu.tennis-warehouse.com/learning_center/temperature.php',
  fric: 'https://twu.tennis-warehouse.com/learning_center/stringballfriction.php',
  patt: 'https://twu.tennis-warehouse.com/learning_center/spinpatterns.php',
  kaw: 'https://www.jstage.jst.go.jp/article/jsdd/6/2/6_2_213/_article/-char/en',
  bed: 'https://twu.tennis-warehouse.com/learning_center/stringbeds.php',
  db: 'https://twu.tennis-warehouse.com/learning_center/reporter2.php',
  bc08: 'https://link.springer.com/article/10.1007/s12283-008-0006-z',
  ping: 'https://www.physics.usyd.edu.au/~cross/StringTension.pdf',
  types: 'https://www.ashawayusa.com/Polyketone8.php',
};
const sciLink = (k, t) => `<a href="${SCI_URL[k]}" target="_blank" rel="noopener">${esc(t)}</a>`;

// Ogni scheda: titolo, livello di prova, cosa dice, il dato, cosa vuol dire per te, fonti.
const CARDS = [
  { t: 'Rigidità: quanto cede il letto', lv: 'D', claim: 'Una corda più rigida cede meno all\'impatto: la palla resta meno sulle corde (contatto di 4–7 millesimi di secondo).', data: 'TWU: corde entro il 10–15% di rigidità tendono a sembrare uguali. Per questo nei confronti «simile» vuol dire sotto il 10%.', you: 'È il primo numero da guardare quando cambi corda. Che più rigida voglia dire «più controllo» è un\'esperienza comune, ma non è una misura.', src: [['stiff', 'TWU, rigidità delle corde']] },
  { t: 'Perdita di tensione', lv: 'D', claim: 'Le corde perdono tensione subito dopo l\'incordatura e nei primi colpi; il poliestere più del nylon.', data: 'TWU: fino a 15 lb nel primo minuto di colpi; il caldo dopo l\'incordatura aggiunge dal 30 al 76% di perdita, che non si recupera.', you: 'Tra due corde simili in rigidità, quella con la perdita TWU più bassa cambia meno nel tempo. Niente racchetta in auto al sole.', src: [['dead', 'TWU, corde «morte»'], ['heat', 'TWU, temperatura']] },
  { t: 'Come nasce lo spin', lv: 'D', claim: 'Più le verticali scivolano sulla palla e tornano al loro posto, più spin: conta l\'attrito corda-palla alto e corda-corda basso.', data: 'Kawazoe 2012: corde intaccate −40% di spin, lubrificate +30%. TWU: tra le poly le differenze di spin misurate sono piccole (poly circa +4–5% sul nylon in un 16×19).', you: 'Lo spin viene soprattutto dal tuo colpo. Lo «spin potenziale» TWU dice solo quanto la corda aiuta.', src: [['fric', 'TWU, attrito'], ['kaw', 'Kawazoe 2012 (accesso libero)'], ['patt', 'TWU, piatto e spin']] },
  { t: 'Forma della corda', lv: 'P', claim: 'Gli spigoli aumentano l\'attrito sulla palla, ma anche tra le corde.', data: 'TWU non ha trovato un legame prevedibile tra superficie e attrito; i migliori in ogni categoria sono però sagomati o rivestiti.', you: 'Non scegliere dal numero di lati: guarda le misure.', src: [['fric', 'TWU, attrito']] },
  { t: 'Calibro', lv: 'D', claim: 'Più spessa = più rigida e più durevole, meno morso.', data: 'TWU: Barb Wire 186 lb/in a 1,20 mm e 214 lb/in a 1,30 mm, circa +15% per 0,1 mm. Cambiare corda sposta di più (O-Toro Tour +31% rispetto a O-Toro a parità di calibro).', you: 'Da 1,23 a 1,25 cambia poco: è una regolazione fine, da fare per ultima.', src: [['db', 'TWU, database']] },
  { t: 'Materiale e mescola', lv: 'P', claim: 'Poli e co-poli cambiano rigidità, elasticità e tenuta; le corde «soft» spesso guadagnano comfort e perdono tenuta.', data: 'Nessuna misura per mescola: il nome non basta, contano gli effetti misurati.', you: 'Giudica dalla rigidità e dalla perdita di tensione, non dal nome.', src: [['types', 'Ashaway, tipi di corda']] },
  { t: 'Tensione', lv: 'D', claim: 'Più tensione: palla un po\' più lenta e più bassa; meno tensione: più veloce.', data: 'Bower e Cross: +2,7% di velocità passando da circa 28 a 18 kg. Solo l\'11% dei giocatori esperti sente 6 lb (circa 2,7 kg) di differenza.', you: 'Cambiare corda pesa più che cambiare di 1 kg. La regola «se è nettamente più rigida scendi di 0,5 kg» è un\'ipotesi del progetto.', src: [['bc08', 'Bower e Cross 2008'], ['bed', 'TWU, energia del letto']] },
  { t: 'Ibridi', lv: 'I', claim: 'In un ibrido la verticale dà il carattere (rigidità, morso), l\'orizzontale lo scorrimento.', data: 'Non abbiamo trovato una fonte di laboratorio gratuita sugli ibridi. Il «letto» (media 16/19) è una semplificazione; TWU dice che letti con la stessa rigidità complessiva giocano in modo simile.', you: 'Usa gli ibridi come prova: cambia una cosa sola alla volta.', src: [['stiff', 'TWU, rigidità delle corde']] },
  { t: 'Il ping come termometro', lv: 'D', claim: 'La frequenza del suono delle corde va con la radice quadrata della tensione.', data: 'Cross: −10% di tensione ≈ −5% di frequenza.', you: 'Con un\'app che misura il ping vedi quando la tua corda ha perso tensione.', src: [['ping', 'Cross, tensione delle corde']] },
  { t: 'Le fonti tra loro', lv: 'D', claim: 'TWU (in gioco) e Racketpedia (a riposo) vanno d\'accordo sulla rigidità; il tuo test Excel no.', data: 'Concordanza di rango sulle corde in comune: TWU–Racketpedia +0,65 (26 corde); Excel con le altre due quasi nulla. Per questo non mescoliamo mai le fonti.', you: 'Quando due fonti dicono cose opposte sulla stessa corda, l\'app lo scrive e non conclude.', src: [] },
];

function cardsHtml(ctx) {
  const ref = ctx.equippedRec();
  const rp = ctx.ALL.filter((r) => r.lab && r.lab.rp).sort((x, y) => x.lab.rp.kgmm - y.lab.rp.kgmm);
  const pos = rp.findIndex((r) => r.id === ref.id);
  const mine = pos >= 0 ? `<p class="small callout">La tua ${esc(ref.model)}: ${pos + 1}ª più morbida a riposo su ${rp.length} corde misurate da Racketpedia (${esc(fmtV('rp.kgmm', ref.lab.rp.kgmm))}).${ref.lab.twu ? '' : ' Non è misurata da TWU.'}</p>` : '';
  return mine + CARDS.map((c) => `<details class="sci"><summary><span class="tag ${SCI_LV[c.lv][1]}">${SCI_LV[c.lv][0]}</span> <b>${esc(c.t)}</b></summary>
    <p>${esc(c.claim)}</p><p class="small"><b>Il dato.</b> ${esc(c.data)}</p><p class="small"><b>Per te.</b> ${esc(c.you)}</p>
    ${c.src.length ? `<p class="small muted">Fonti: ${c.src.map(([k, t]) => sciLink(k, t)).join(', ')}</p>` : ''}</details>`).join('');
}

// ---------- righelli ----------
const RULERS = ['twu.stiffness', 'rp.kgmm', 'twu.loss', 'twu.spin'];
const DIR = { 'twu.stiffness': ['più morbida', 'più rigida'], 'rp.kgmm': ['più morbida', 'più rigida'], 'twu.loss': ['tiene di più', 'perde di più'], 'twu.spin': ['meno spin', 'più spin'] };
let pickByRuler = {};

function rulerHtml(ctx, key, width) {
  const k = CMP_KEYS[key], st = ctx.state(), ref = ctx.equippedRec();
  const pts = ctx.ALL.map((r) => ({ r, v: r.lab ? k.get(r.lab) : null })).filter((p) => typeof p.v === 'number');
  if (!pts.length) return '';
  const sc = scaleOf(pts.map((p) => p.v));
  const mark = new Set([...st.liked, ...(st.stock || []).map((x) => x.id)]);
  const refPt = pts.find((p) => p.r.id === ref.id);
  const important = [refPt, ...pts.filter((p) => p.r.id !== ref.id && mark.has(p.r.id))].filter(Boolean).slice(0, 6);
  const labels = layoutLabels(important.map((p) => ({ id: p.r.id, x: sc.x(p.v), label: p.r.model })), width, 7);
  const dots = pts.map((p) => `<span class="rdot ${p.r.id === ref.id ? 'me' : mark.has(p.r.id) ? 'mine' : ''}" style="left:${sc.x(p.v).toFixed(2)}%"></span>`).join('');
  const lab = labels.filter((l) => l.lane !== null).map((l) => `<span class="rl ${l.id === ref.id ? 'me' : ''}" style="left:${l.left.toFixed(0)}px;top:${l.lane * 22}px">${esc(l.label)}</span>`).join('');
  const sel = pickByRuler[key] ? pts.find((p) => p.r.id === pickByRuler[key]) : null;
  const ordered = [...pts].sort((x, y) => x.v - y.v);
  return `<section class="ruler" data-ruler="${esc(key)}">
    <h3>${tip(key, esc(k.label))} <span class="muted small">· ${esc(k.source)} · ${pts.length} corde</span></h3>
    ${refPt ? '' : `<p class="small muted">La ${esc(ref.model)} non ha questa misura.</p>`}
    <div class="r-labels" style="height:${(Math.max(1, ...labels.map((l) => (l.lane === null ? 0 : l.lane + 1)))) * 22}px" aria-hidden="true">${lab}</div>
    <div class="r-track" data-track="${esc(key)}" aria-hidden="true">${dots}${sel ? `<span class="rdot sel" style="left:${sc.x(sel.v).toFixed(2)}%"></span>` : ''}</div>
    <div class="r-ends small muted" aria-hidden="true"><span>← ${esc(DIR[key][0])}</span><span>${esc(DIR[key][1])} →</span></div>
    <p class="r-pick small" aria-live="polite">${sel ? `<button type="button" class="linkish" data-open="${esc(sel.r.id)}">${esc(fullName(sel.r))}</button>: <b class="num">${esc(fmtV(key, sel.v))}</b> <button type="button" class="btn" data-cmp="${esc(sel.r.id)}">Confronta</button>` : 'Tocca il righello per vedere la corda più vicina.'}</p>
    <details class="more"><summary>Elenco in ordine (${pts.length})</summary><ol class="r-list">${ordered.map((p) => `<li${p.r.id === ref.id ? ' class="me"' : ''}><button type="button" class="linkish" data-open="${esc(p.r.id)}">${esc(fullName(p.r))}</button> <span class="num">${esc(fmtV(key, p.v))}</span></li>`).join('')}</ol></details>
  </section>`;
}

function sciReviewsHtml(ctx) {
  const st = ctx.state();
  const rows = ctx.ALL.filter((r) => (r.indep_reviews || []).length);
  const first = new Set([st.equipped.id, ...st.liked, ...(st.stock || []).map((x) => x.id)]);
  rows.sort((x, y) => first.has(y.id) - first.has(x.id) || fullName(x).localeCompare(fullName(y)));
  const indep = rows.reduce((n, r) => n + r.indep_reviews.filter((v) => v.class.startsWith('indipendente')).length, 0);
  return `<p class="small">Classificazione dei canali fatta il 18/11/2026 sulle ultime 15 descrizioni di ciascun canale. ${indep} recensioni da canali indipendenti. Nessun video è stato ancora guardato per intero: le frasi chiave mancano finché non lo sono.</p>
    <ul class="reviews">${rows.map((r) => `<li><button type="button" class="linkish" data-open="${esc(r.id)}">${esc(fullName(r))}</button>: ${r.indep_reviews.map((v) => `<a href="${esc(v.url)}" target="_blank" rel="noopener">${esc(v.channel)}</a> <span class="tag ${v.class.startsWith('indipendente') ? 'ok' : ''}">${esc(v.class)}</span>`).join(' · ')}</li>`).join('')}</ul>`;
}

function sourcesHtml(ctx) {
  const s = ctx.DATA.sources || {}, n = (ctx.DATA.lab_meta || {}).n || {};
  const v = ctx.DATA.verified;
  return `<ul class="sources small">
    <li>TWU String Performance Database: ${n.twu || 0} corde misurate; scaricato il ${esc(itDate((s.twu || {}).fetched))}. Ricontrollato il 18/11/2026: nessuna novità. Slap, Zero e Confidential 1,25 non ci sono.</li>
    <li>Racketpedia: ${n.rp || 0} corde; scaricato il ${esc(itDate((s.racketpedia || {}).fetched))}.</li>
    <li>Il tuo Excel (test Ektelon): ${n.excel || 0} corde; file del ${esc(itDate((s.excel || {}).modified))}.</li>
    ${v ? `<li>Verifiche a mano del ${esc(itDate(v.date))}: ${esc(v.note)}.</li>` : ''}
    <li>Corde nel banco: ${ctx.ALL.length}. Quelle uscite prima del 2020 o fuori produzione sono tolte (le tue preferite restano).</li>
    <li>Le stime (stesso modello in altro calibro, modelli, conversioni tra fonti) si vedono solo nella scheda di ogni corda, con ≈, e non entrano mai in confronti e consigli.</li>
  </ul>
  <div class="actions" id="exports" hidden><button type="button" class="btn" id="export-json">Esporta tutto (JSON)</button><button type="button" class="btn" id="export-csv">Esporta le prove (CSV)</button></div>`;
}

export function renderScience(ctx) {
  const el = $('#scienza');
  const width = Math.max(260, Math.min(1000, (el.clientWidth || 360) - 32));
  el.innerHTML = `<div class="section-head"><h2>Cosa conta in una corda</h2></div>
    <p class="small muted">Ogni scheda dice quanto è solida: dimostrata (misure o studi), plausibile (spiegazione fisica senza misura), ipotesi (regola nostra).</p>
    ${cardsHtml(ctx)}
    <div class="section-head"><h2>Mappa delle misure</h2></div>
    <p class="small muted">Un righello per misura, una fonte per righello: mai mescolate. In evidenza la tua corda; con il nome le preferite e quelle in casa.</p>
    ${RULERS.map((k) => rulerHtml(ctx, k, width)).join('')}
    <div class="section-head"><h2>${tip('indipendente', 'Recensioni')}</h2></div>${sciReviewsHtml(ctx)}
    <div class="section-head"><h2>Da dove vengono i dati</h2></div>${sourcesHtml(ctx)}`;
  if (ctx.downloads) $('#exports').hidden = false;
}

export function initScience(ctx) {
  const el = $('#scienza');
  el.addEventListener('click', async (e) => {
    const tr = e.target.closest('[data-track]');
    if (tr) {
      const key = tr.dataset.track, k = CMP_KEYS[key];
      const pts = ctx.ALL.map((r) => ({ r, v: r.lab ? k.get(r.lab) : null })).filter((p) => typeof p.v === 'number');
      const sc = scaleOf(pts.map((p) => p.v));
      const box = tr.getBoundingClientRect();
      const x = ((e.clientX - box.left) / box.width) * 100;
      const p = nearest(pts.map((q) => ({ id: q.r.id, x: sc.x(q.v) })), x);
      if (p) { pickByRuler[key] = p.id; renderScience(ctx); }
      return;
    }
    if (e.target.closest('#export-json')) { try { await ctx.downloads.save({ filename: 'banco-corde-storico.json', data: ctx.persist().exportJson(ctx.state()) }); } catch { /* rifiutato */ } return; }
    if (e.target.closest('#export-csv')) { try { await ctx.downloads.save({ filename: 'banco-corde-prove.csv', data: `﻿${diaryCsv(trialsOf(ctx.state()), (id) => (ctx.BY_ID[id] ? fullName(ctx.BY_ID[id]) : id))}` }); } catch { /* rifiutato */ } }
  });
}

