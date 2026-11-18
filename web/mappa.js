// Schermata «Mappa»: cerchi una corda e la vedi su ogni righello accanto alla tua. Tutte le corde: misurate (●),
// ricavate da altri dati (◐), ricavate dalla fisica (○). Un righello per grandezza, sempre sulla stessa scala.
import { $, esc, fullName, safeUrl } from './format.js';
import { CMP_KEYS, valueOf } from './cmp.js';
import { scaleOf, layoutLabels, nearest } from './rulers.js';
import { tip, fmtV, itDate, mk } from './ui.js';
import { trialsOf } from './state.js';
import { diaryCsv } from './diary.js';
import { itMonth } from './sheet.js';

const MAP_RULERS = [
  { key: 'twu.stiffness', ends: ['più morbida', 'più rigida'], field: 'In campo: più a destra = il letto cede meno, palla più ferma e diretta, più dura sul braccio. Sotto il 10% di differenza non la senti.' },
  { key: 'twu.loss', ends: ['tiene di più', 'perde di più'], field: 'In campo: più a sinistra = la sensazione resta uguale più a lungo dopo l\'incordatura.' },
  { key: 'twu.spin', ends: ['meno spin', 'più spin'], field: 'In campo: più a destra = le verticali scivolano e tornano di più, la corda ti aiuta a far girare la palla. Lo spin vero lo fa il tuo colpo.' },
  { key: 'rp.kgmm', ends: ['più morbida', 'più rigida'], field: 'Misura da ferma (Racketpedia): conferma o smentisce la rigidità in campo.' },
];
let mapSel = []; // corde scelte dall'utente (oltre alla montata), al massimo 4
let mapPick = {}; // per righello: ultimo tocco

const pointsOf = (ctx, key) => ctx.ALL.map((r) => ({ r, val: valueOf(r, key) })).filter((p) => p.val);

function rulerHtml(ctx, R, width) {
  const k = CMP_KEYS[R.key], st = ctx.state(), ref = ctx.equippedRec();
  const pts = pointsOf(ctx, R.key);
  if (!pts.length) return '';
  const sc = scaleOf(pts.map((p) => p.val.v));
  const chosen = [ref.id, ...mapSel.filter((id) => id !== ref.id)];
  const liked = new Set([...st.liked, ...(st.stock || []).map((x) => x.id)]);
  const important = chosen.map((id) => pts.find((p) => p.r.id === id)).filter(Boolean);
  const labels = layoutLabels(important.map((p) => ({ id: p.r.id, x: sc.x(p.val.v), label: p.r.model })), width, 7);
  const cls = (p) => `rdot ${p.val.est ? `e-${p.val.est}` : ''} ${p.r.id === ref.id ? 'me' : chosen.includes(p.r.id) ? 'sel' : liked.has(p.r.id) ? 'mine' : ''}`;
  const dots = pts.map((p) => `<span class="${cls(p)}" style="left:${sc.x(p.val.v).toFixed(2)}%"></span>`).join('');
  const lab = labels.filter((l) => l.lane !== null).map((l) => `<span class="rl ${l.id === ref.id ? 'me' : 'sel'}" style="left:${l.left.toFixed(0)}px;top:${l.lane * 22}px">${esc(l.label)}</span>`).join('');
  const lanes = Math.max(1, ...labels.map((l) => (l.lane === null ? 0 : l.lane + 1)));
  const missing = chosen.filter((id) => !pts.some((p) => p.r.id === id)).map((id) => ctx.BY_ID[id].model);
  const pk = mapPick[R.key] ? pts.find((p) => p.r.id === mapPick[R.key]) : null;
  const ordered = [...pts].sort((a, b) => a.val.v - b.val.v);
  const nMeas = pts.filter((p) => !p.val.est).length;
  return `<section class="ruler" data-ruler="${esc(R.key)}">
    <h3>${tip(R.key, esc(k.label))} <span class="muted small">· ${pts.length} corde (${nMeas} misurate)</span></h3>
    <p class="small">${esc(R.field)}</p>
    <div class="r-labels" style="height:${lanes * 22}px" aria-hidden="true">${lab}</div>
    <div class="r-track" data-track="${esc(R.key)}" aria-hidden="true">${dots}</div>
    <div class="r-ends small muted" aria-hidden="true"><span>← ${esc(R.ends[0])}</span><span>${esc(R.ends[1])} →</span></div>
    ${missing.length ? `<p class="small muted">Senza valore su questa scala: ${esc(missing.join(', '))}.</p>` : ''}
    <p class="r-pick small" aria-live="polite">${pk ? `<button type="button" class="linkish" data-open="${esc(pk.r.id)}">${esc(fullName(pk.r))}</button> ${mk(pk.val.est)}<b class="num">${esc(fmtV(R.key, pk.val.v))}</b> <button type="button" class="btn" data-map-add="${esc(pk.r.id)}">Evidenzia</button> <button type="button" class="btn" data-cmp="${esc(pk.r.id)}">Confronta</button>` : 'Tocca il righello: vedi la corda più vicina.'}</p>
    <details class="more"><summary>Tutte in ordine (${pts.length})</summary><ol class="r-list">${ordered.map((p) => `<li${p.r.id === ref.id ? ' class="me"' : ''}><button type="button" class="linkish" data-open="${esc(p.r.id)}">${esc(fullName(p.r))}</button> <span class="num">${mk(p.val.est)}${esc(fmtV(R.key, p.val.v))}</span></li>`).join('')}</ol></details>
  </section>`;
}

// Tabella delle corde scelte: una riga per corda, una colonna per grandezza, con il segno del tipo di valore.
function tableHtml(ctx) {
  const ref = ctx.equippedRec();
  const ids = [ref.id, ...mapSel.filter((id) => id !== ref.id)];
  const keys = MAP_RULERS.map((R) => R.key);
  const cell = (r, key) => { const v = valueOf(r, key); return v ? `${mk(v.est)}${esc(fmtV(key, v.v))}` : '<span class="nm">nessun valore</span>'; };
  return `<div class="mtable" role="table" aria-label="Le corde scelte">
    ${ids.map((id) => { const r = ctx.BY_ID[id]; return `<div class="mrow" role="row"><div class="mname" role="cell"><button type="button" class="linkish" data-open="${esc(id)}">${esc(fullName(r))}</button>${id === ref.id ? ' <span class="tag ok">montata</span>' : ` <button type="button" class="btn sq ghost" data-map-del="${esc(id)}" aria-label="Togli ${esc(fullName(r))} dalla mappa">✕</button>`}</div>
      ${keys.map((k) => `<div class="mcell" role="cell"><span class="mk">${esc(CMP_KEYS[k].label)}</span> <span class="num">${cell(r, k)}</span></div>`).join('')}
      ${id === ref.id ? '' : `<div class="mcell" role="cell"><button type="button" class="btn" data-cmp="${esc(id)}">Confronta con la tua</button></div>`}</div>`; }).join('')}
  </div>`;
}

function sourcesHtml(ctx) {
  const s = ctx.DATA.sources || {}, n = (ctx.DATA.lab_meta || {}).n || {}, v = ctx.DATA.verified;
  const rows = ctx.ALL.filter((r) => (r.indep_reviews || []).length);
  return `<details class="more block"><summary>Da dove vengono i numeri</summary><ul class="sources small">
    <li>${mk(null)}Misurata: TWU (in campo, 51 lb, ${n.twu || 0} corde, dati del ${esc(itDate((s.twu || {}).fetched))}), Racketpedia (da ferma, ${n.rp || 0} corde), il tuo Excel (${n.excel || 0} corde).</li>
    <li>${mk('ricavata')}Ricavata da altri dati: la stessa corda misurata in un altro calibro o colore (corretta per il diametro), oppure la misura da ferma di Racketpedia portata sulla scala in campo.</li>
    <li>${mk('modello')}Ricavata dalla fisica: dal calibro e dal materiale per la rigidità (più spessa = più rigida), dalla rigidità e dalla forma per lo spin. Usata solo dove non c'è nient'altro.</li>
    ${v ? `<li>Verifiche a mano del ${esc(itDate(v.date))}: ${esc(v.note)}.</li>` : ''}
  </ul></details>
  <details class="more"><summary>Recensioni (opinioni, mai nei numeri)</summary><ul class="reviews">${rows.map((r) => `<li><button type="button" class="linkish" data-open="${esc(r.id)}">${esc(fullName(r))}</button>: ${r.indep_reviews.map((x) => `<a href="${esc(safeUrl(x.url))}" target="_blank" rel="noopener">${esc(x.channel)}</a>${x.date ? ` <span class="small muted">${esc(itMonth(x.date))}</span>` : ''} <span class="tag ${x.class.startsWith('indipendente') ? 'ok' : ''}">${esc(x.class)}</span>`).join(' · ')}</li>`).join('')}</ul></details>
  <div class="actions" id="exports" hidden><button type="button" class="btn" id="export-json">Esporta tutto (JSON)</button><button type="button" class="btn" id="export-csv">Esporta le prove (CSV)</button></div>`;
}

function searchResults(ctx) {
  const q = ($('#map-q') && $('#map-q').value || '').trim().toLowerCase();
  if (!q) return '';
  const words = q.split(/\s+/);
  const hits = ctx.ALL.filter((r) => words.every((w) => fullName(r).toLowerCase().includes(w))).slice(0, 8);
  return hits.length ? hits.map((r) => `<li><button type="button" class="pick" data-map-add="${esc(r.id)}"><span>${esc(fullName(r))}</span>${mapSel.includes(r.id) ? '<span class="tag ok">sulla mappa</span>' : ''}</button></li>`).join('') : '<li class="muted">Nessuna corda trovata.</li>';
}

export function renderMap(ctx) {
  const el = $('#mappa');
  const q = $('#map-q') ? $('#map-q').value : '';
  const width = Math.max(260, Math.min(720, (el.clientWidth || 360) - 32));
  el.innerHTML = `<div class="section-head"><h2>Mappa delle corde</h2></div>
    <label class="search"><span class="sr">Cerca una corda da mettere sulla mappa</span><input type="search" id="map-q" placeholder="Cerca una corda, es. Confidential" autocomplete="off"></label>
    <ul class="picklist results" id="map-results" aria-live="polite"></ul>
    <p class="small legend">${mk(null)}misurata · ${mk('ricavata')}ricavata da altri dati · ${mk('modello')}ricavata dalla fisica</p>
    ${tableHtml(ctx)}
    ${MAP_RULERS.map((R) => rulerHtml(ctx, R, width)).join('')}
    ${sourcesHtml(ctx)}`;
  $('#map-q').value = q;
  $('#map-results').innerHTML = searchResults(ctx);
  if (ctx.downloads) $('#exports').hidden = false;
}

export function initMap(ctx) {
  const el = $('#mappa');
  el.addEventListener('input', (e) => { if (e.target.id === 'map-q') $('#map-results').innerHTML = searchResults(ctx); });
  el.addEventListener('click', async (e) => {
    const add = e.target.closest('[data-map-add]');
    if (add) {
      const id = add.dataset.mapAdd;
      if (!mapSel.includes(id) && id !== ctx.state().equipped.id) mapSel = [...mapSel, id].slice(-4);
      $('#map-q').value = '';
      renderMap(ctx);
      return;
    }
    const del = e.target.closest('[data-map-del]');
    if (del) { mapSel = mapSel.filter((x) => x !== del.dataset.mapDel); renderMap(ctx); return; }
    const tr = e.target.closest('[data-track]');
    if (tr) {
      const key = tr.dataset.track;
      const pts = pointsOf(ctx, key);
      const sc = scaleOf(pts.map((p) => p.val.v));
      const box = tr.getBoundingClientRect();
      const x = ((e.clientX - box.left) / box.width) * 100;
      const p = nearest(pts.map((q) => ({ id: q.r.id, x: sc.x(q.val.v) })), x);
      if (p) { mapPick[key] = p.id; renderMap(ctx); }
      return;
    }
    if (e.target.closest('#export-json')) { try { await ctx.downloads.save({ filename: 'banco-corde-storico.json', data: ctx.persist().exportJson(ctx.state()) }); } catch { /* rifiutato */ } return; }
    if (e.target.closest('#export-csv')) { try { await ctx.downloads.save({ filename: 'banco-corde-prove.csv', data: `﻿${diaryCsv(trialsOf(ctx.state()), (id) => (ctx.BY_ID[id] ? fullName(ctx.BY_ID[id]) : id))}` }); } catch { /* rifiutato */ } }
  });
}
