// Schermata «Prossima»: una domanda, poi le corde in casa e quelle da comprare, ognuna con il confronto e il perché.
import { $, esc, fullName } from './format.js';
import { GOALS, candidates } from './next.js';
import { setNextGoal } from './state.js';
import { tip, nameBtn, specLine, hasMeasures, infoTip, misure } from './ui.js';

const goalOf = (st) => st.nextGoal || 'same';

function card(c, ctx, inStockInfo, goal) {
  const r = c.rec;
  const common = [...new Set(c.rows.map((x) => x.source))].join(', ');
  const why = c.rows.filter((x) => x.decides && x.dir).slice(0, 2).map((x) => `<li>${esc(x.why)}</li>`).join('');
  const rank = c.rank ? `<p class="small">${c.rank.pos}ª su ${c.rank.n} corde misurate da TWU (${esc(fmtRank(c, goal))}).</p>` : '';
  const lk = c.likeness && c.likeness.id ? `<p class="small muted">Simile alla ${esc(ctx.BY_ID[c.likeness.id].model)} (ti piace) in ${misure(c.likeness.similar)} su ${c.likeness.total}.</p>` : '';
  const warn = c.likeness && c.likeness.warn ? `<p class="small warn-t">Somiglia alla ${esc(ctx.BY_ID[c.likeness.warn].model)}, che non ti piace.</p>` : '';
  const stockTag = inStockInfo ? `<span class="tag ok">in casa: ${inStockInfo}</span>` : '';
  const off = c.inStock && !c.compatible ? '<p class="small muted">Non va nella direzione che hai chiesto.</p>' : '';
  return `<article class="cand ${c.compatible ? '' : 'dim'}">
    <h3>${nameBtn(r)} ${stockTag}</h3>
    <p class="muted small">${specLine(r)}</p>
    <p class="summary">${esc(c.summary.text)} ${infoTip('soglie', 'Come decidiamo simile, un po\' o nettamente')}</p>
    ${common ? `<p class="small muted common">Misure in comune con la tua: ${esc(common)}.</p>` : ''}
    ${why ? `<ul class="why">${why}</ul>` : ''}${rank}${lk}${warn}${off}
    <div class="actions"><button type="button" class="btn" data-cmp="${esc(r.id)}">Confronta</button>
      <button type="button" class="btn" data-equip="${esc(r.id)}">Monta</button></div>
  </article>`;
}
function fmtRank(c, goal) {
  if (c.value === null || c.value === undefined) return '';
  const v = String(c.value).replace('.', ',');
  return goal === 'holds' ? `perde il ${v}%` : `spin potenziale ${v}`;
}

export function renderNext(ctx) {
  const st = ctx.state(), goal = goalOf(st), ref = ctx.equippedRec();
  const res = candidates(st, ctx.ALL, goal, ctx.META);
  const g = GOALS.find((x) => x.key === goal);
  const stockOf = (id) => (st.stock || []).filter((x) => x.id === id).map((x) => `${x.n} ${x.size}`).join(', ');
  $('#next-q').innerHTML = `<h2>Cosa vuoi cambiare rispetto alla ${esc(ref.model)}?</h2>
    <div class="chips goals" role="radiogroup" aria-label="Cosa vuoi cambiare">${GOALS.map((x) => `<button type="button" role="radio" class="chipbtn" data-goal="${x.key}" aria-checked="${x.key === goal}">${esc(x.label)}</button>`).join('')}</div>
    ${res.note ? `<p class="callout small">${esc(res.note)}</p>` : ''}`;
  const stockHtml = res.inStock.length ? `<div class="section-head"><h2>${tip('scorta', 'Ce l\'hai in casa')}</h2></div>${res.inStock.map((c) => card(c, ctx, stockOf(c.rec.id), goal)).join('')}` : '';
  const buyHtml = `<div class="section-head"><h2>Da comprare</h2><span class="muted small">${esc(g.ask)}, solo con misure</span></div>
    ${res.toBuy.length ? res.toBuy.map((c) => card(c, ctx, '', goal)).join('') : `<p class="muted">Nessuna corda misurata è ${esc(g.ask)} oltre la soglia. Prova un'altra domanda o cerca una corda qui sotto.</p>`}`;
  $('#next-list').innerHTML = (res.inStock.some((c) => c.compatible) ? stockHtml + buyHtml : buyHtml + stockHtml);
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
