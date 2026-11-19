// Schermata «Prossima»: una domanda, poi le corde in casa e quelle da comprare, ognuna con il confronto e il perché.
import { $, esc, fullName, NF } from './format.js';
import { GOALS, candidates, suggestHybrids } from './next.js';
import { physPhrase } from './phys.js';
import { setNextGoal } from './state.js';
import { tip, nameBtn, specLine, hasMeasures, infoTip, misure } from './ui.js';

const goalOf = (st) => st.nextGoal || 'same';

const WHY_LIMIT = 3;
function whyList(rows) {
  const w = rows.filter((x) => x.dir && !(x.key === 'kAfter' && rows.some((y) => y.key === 'launch' && y.dir))).slice(0, WHY_LIMIT);
  return w.length ? `<ul class="why">${w.map((x) => `<li><b>${esc(physPhrase(x))}</b>: ${esc(x.why)}</li>`).join('')}</ul>` : '';
}

function card(c, ctx, inStockInfo, cls = '') {
  const r = c.rec;
  const lk = c.likeness && c.likeness.id ? `<p class="small muted">Simile alla ${esc(ctx.BY_ID[c.likeness.id].model)} (ti piace) in ${misure(c.likeness.similar)} su ${c.likeness.total}.</p>` : '';
  const warn = c.likeness && c.likeness.warn ? `<p class="small warn-t">Somiglia alla ${esc(ctx.BY_ID[c.likeness.warn].model)}, che non ti piace.</p>` : '';
  const stockTag = (inStockInfo ? `<span class="tag ok">in casa: ${inStockInfo}</span>` : '') + (c.prefBrand ? ' <span class="tag">tua marca</span>' : '') + (c.equipped ? ' <span class="tag">è la tua montata</span>' : '') + (c.disliked ? ' <span class="tag warn">non ti piace</span>' : '');
  const half = c.inStock && !c.full ? '<p class="small callout">Hai solo una mezza: basta per metà racchetta. La trovi negli ibridi consigliati; per montarla intera serve un\'altra mezza o una matassina.</p>' : '';
  const off = c.inStock && !c.compatible ? '<p class="small muted">Non va nella direzione che hai chiesto.</p>' : '';
  return `<article class="cand ${cls} ${c.compatible ? '' : 'dim'}">
    <h3>${nameBtn(r)} ${stockTag}</h3>
    <p class="muted small">${specLine(r)}</p>
    <p class="summary">${esc(c.summary.text)} ${infoTip('fisica', 'Come si calcola il confronto in campo')}</p>
    ${whyList(c.rows)}${lk}${warn}${off}${half}
    <div class="actions"><button type="button" class="btn" data-cmp="${esc(r.id)}">Confronta</button>
      ${c.inStock && !c.full ? '' : `<button type="button" class="btn" data-equip="${esc(r.id)}">Monta</button>`}</div>
  </article>`;
}

function hyCard(p, ctx, st) {
  const tag = (r, i) => (p.inStock[i] ? ` <span class="tag ok">in casa</span>` : ' <span class="tag">da comprare: una mezza</span>');
  return `<article class="cand hyc">
    <h3>Ibrido</h3>
    <p><b>Verticali:</b> ${nameBtn(p.V)}${tag(p.V, 0)}<br><b>Orizzontali:</b> ${nameBtn(p.O)}${tag(p.O, 1)}</p>
    <p class="muted small">${NF(1).format(st.equipped.kg[0])}/${NF(1).format(st.equipped.kg[1])} kg come la tua${p.bed.roundCross ? ' · orizzontale tonda: lascia scivolare e tornare le verticali' : ''}</p>
    <p class="summary">${esc(p.summary.text)} ${infoTip('letto', 'Come si calcola un ibrido')}</p>
    ${whyList(p.rows)}
    <div class="actions"><button type="button" class="btn" data-hy-set="${esc(p.V.id)}|${esc(p.O.id)}">Apri nel costruttore</button></div>
  </article>`;
}

export function renderNext(ctx) {
  const st = ctx.state(), goal = goalOf(st), ref = ctx.equippedRec();
  const res = candidates(st, ctx.ALL, goal, ctx.META);
  const g = GOALS.find((x) => x.key === goal);
  const stockOf = (id) => (st.stock || []).filter((x) => x.id === id).map((x) => `${x.n} ${x.size === 'intera' ? (x.n === 1 ? 'matassina' : 'matassine') : (x.n === 1 ? 'mezza' : 'mezze')}`).join(', ');
  $('#next-q').innerHTML = `<h2>Cosa vuoi cambiare rispetto alla ${esc(ref.model)}?</h2>
    <div class="chips goals" role="radiogroup" aria-label="Cosa vuoi cambiare">${GOALS.map((x) => `<button type="button" role="radio" class="chipbtn" data-goal="${x.key}" aria-checked="${x.key === goal}">${esc(x.label)}</button>`).join('')}</div>
    ${res.note ? `<p class="callout small">${esc(res.note)}</p>` : ''}`;
  const okStock = res.inStock.filter((c) => c.compatible), otherStock = res.inStock.filter((c) => !c.compatible);
  const stockHtml = res.inStock.length ? `<div class="section-head"><h2>${tip('scorta', 'Ce l\'hai in casa')}</h2></div>
    ${okStock.length ? okStock.slice(0, 3).map((c) => card(c, ctx, stockOf(c.rec.id))).join('') : '<p class="small muted">Nessuna delle corde che hai in casa va in questa direzione.</p>'}
    ${okStock.length + otherStock.length > 3 ? `<details class="more"><summary>Le altre corde in casa (${okStock.length + otherStock.length - Math.min(3, okStock.length)})</summary>${[...okStock.slice(3), ...otherStock].map((c) => card(c, ctx, stockOf(c.rec.id))).join('')}</details>` : ''}` : '';
  const buyHtml = `<div class="section-head"><h2>Da comprare</h2><span class="muted small">${esc(g.ask)}</span></div>
    ${res.toBuy.length ? res.toBuy.map((c) => card(c, ctx, '', 'buy')).join('') : `<p class="muted">${esc(emptyWhy(ctx, goal, ref))} Prova un'altra domanda o cerca una corda qui sotto.</p>`}`;
  const hy = suggestHybrids(st, ctx.ALL, goal, ctx.META);
  const hyHtml = (hy.fromStock.length || hy.buyOne.length || hy.buyBoth.length) ? `<div class="section-head"><h2>Ibridi consigliati</h2><span class="muted small">${esc(g.ask)}</span></div>
    ${hy.fromStock.length ? `<p class="small"><b>Con le corde che hai in casa</b></p>${hy.fromStock.map((p) => hyCard(p, ctx, st)).join('')}` : (st.stock || []).length ? '<p class="small muted">Con le corde che hai in casa nessuna coppia va in questa direzione.</p>' : ''}
    ${hy.buyBoth.length ? `<p class="small"><b>Comprando due mezze matassine</b> <span class="muted">(aggiungi le corde che hai in casa in «Oggi» per vedere prima quelle)</span></p>${hy.buyBoth.map((p) => hyCard(p, ctx, st)).join('')}` : ''}
    ${hy.buyOne.length ? `<p class="small"><b>Comprando una mezza matassina</b></p>${hy.buyOne.map((p) => hyCard(p, ctx, st)).join('')}` : ''}` : '';
  $('#next-list').innerHTML = (res.inStock.some((c) => c.compatible) ? stockHtml + buyHtml : buyHtml + stockHtml) + hyHtml;
}

function renderSearch(ctx) {
  const q = $('#next-search').value.trim().toLowerCase();
  const out = $('#next-results');
  if (!q) { out.innerHTML = ''; return; }
  const words = q.split(/\s+/);
  const hits = ctx.ALL.filter((r) => words.every((w) => fullName(r).toLowerCase().includes(w))).slice(0, 10);
  out.innerHTML = hits.length ? hits.map((r) => `<li>${nameBtn(r)}${hasMeasures(r) ? '' : ' <span class="tag">nessuna misura</span>'}</li>`).join('') : '<li class="muted">Nessuna corda trovata.</li>';
}

export function initNext(ctx) {
  $('#prossima').addEventListener('click', (e) => {
    const g = e.target.closest('[data-goal]');
    if (g) { ctx.update((s) => setNextGoal(s, g.dataset.goal)); const b = $(`[data-goal="${g.dataset.goal}"]`); if (b) b.focus(); }
  });
  $('#next-search').addEventListener('input', () => renderSearch(ctx));
}
