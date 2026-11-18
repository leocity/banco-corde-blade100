// Scheda di una corda e dialogo di confronto con la montata. Solo misure nei confronti; le stime in fondo, marcate.
import { esc, NF, fullName, fmtN } from './format.js';
import { CMP_KEYS, compareTo, summarize, agreement, UNKNOWN } from './cmp.js';
import { likeness } from './next.js';
import { tip, labValue, specLine, fmtV, itDate, infoTip, misure, shapeOf } from './ui.js';

const SRC_ROWS = [
  ['TWU (in gioco, 51 lb)', ['twu.stiffness', 'twu.loss', 'twu.spin']],
  ['Racketpedia (a riposo)', ['rp.kgmm']],
  ['Il tuo test Excel', ['excel.stretch50']],
];
const CLASS_OK = { indipendente: 'ok', 'indipendente con riserva': 'ok' };
const yearTxt = (r) => { const p = r.production || {}; if (!p.year) return 'anno non verificato'; return p.year_confidence === 'exact' ? `uscita nel ${p.year}` : `in vendita almeno dal ${p.year} (anno non verificato)`; };

export function measuresHtml(r) {
  return SRC_ROWS.map(([title, keys]) => `<div class="mgroup"><h4>${esc(title)}</h4><dl>${keys.map((k) => `<dt>${tip(k, esc(CMP_KEYS[k].label))}</dt><dd>${labValue(r, k)}</dd>`).join('')}</dl></div>`).join('');
}

function estimatesHtml(r) {
  const out = [];
  const st = r.stiffness;
  if (st && st.value_lbin != null && st.kind !== 'misurata') out.push(`rigidità ≈ ${NF(0).format(st.value_lbin)} lb/in (${esc(st.kind)}${st.low != null ? `, tra ${NF(0).format(st.low)} e ${NF(0).format(st.high)}` : ''})`);
  const sp = r.spin;
  if (sp && sp.value != null && sp.kind !== 'misurato') out.push(`spin ≈ ${NF(1).format(sp.value)} (${esc(sp.kind)}${sp.low != null ? `, tra ${NF(1).format(sp.low)} e ${NF(1).format(sp.high)}` : ''})`);
  if (!out.length) return '';
  return `<details class="more est"><summary>${tip('stima', 'Stime')} (non usate nei confronti né nei consigli)</summary><p class="small">${out.join('; ')}.</p></details>`;
}

function rowsHtml(rows, refName, name) {
  if (!rows.length) return '';
  return `<ul class="cmp-rows">${rows.map((x) => `<li class="${x.decides ? '' : 'info'}">
    <p class="cmp-q">${tip(x.key, esc(x.label))} <span class="muted small">· ${esc(x.source)}</span></p>
    <p class="cmp-v"><span>${esc(refName)} <b class="num">${esc(fmtV(x.key, x.b))}</b></span> → <span>${esc(name)} <b class="num">${esc(fmtV(x.key, x.a))}</b></span></p>
    <p class="cmp-w lvl-${x.level === 'simile' ? 'same' : x.level === 'nettamente' ? 'big' : 'some'}">${tip('soglie', x.level === 'simile' ? 'simile' : `${esc(x.level)} ${esc(x.word)}`)}${x.decides ? '' : ' <span class="muted small">(solo informativo)</span>'}</p>
    <p class="small">${esc(x.why)}</p></li>`).join('')}</ul>`;
}

export function compareHtml(r, ref, meta) {
  const rows = compareTo(r, ref, meta);
  const s = summarize(rows, ref.model);
  const ag = agreement(rows).stiffness;
  const agTxt = ag === 'concordano' ? 'TWU e Racketpedia concordano sulla rigidità.' : ag === 'disaccordo' ? 'TWU e Racketpedia non concordano sulla rigidità: nessuna conclusione.' : ag === 'in parte' ? 'Sulla rigidità una fonte vede una differenza, l\'altra no.' : '';
  const spec = `<ul class="spec-cmp"><li>${tip('calibro', 'Calibro')}: ${ref.gauge_mm ? NF(2).format(ref.gauge_mm) : '—'} → ${r.gauge_mm ? NF(2).format(r.gauge_mm) : '—'} mm${ref.gauge_mm && r.gauge_mm && Math.abs(r.gauge_mm - ref.gauge_mm) >= 0.03 ? (r.gauge_mm < ref.gauge_mm ? ' (più sottile: di solito più morso, dura meno)' : ' (più spessa: di solito dura di più, meno morso)') : ''}</li>
    <li>${tip('forma', 'Forma')}: ${esc(shapeOf(ref))} → ${esc(shapeOf(r))}</li></ul>`;
  return `<p class="summary">${esc(s.text)} ${infoTip('soglie', 'Come decidiamo simile, un po\' o nettamente')}</p>${agTxt ? `<p class="small">${esc(agTxt)}</p>` : ''}${rowsHtml(rows, ref.model, r.model)}${spec}
    <p class="small muted">${tip('controllo', 'Cosa non sappiamo')}: ${esc(UNKNOWN)}</p>`;
}

function reviewsHtml(r) {
  const rs = r.indep_reviews || [];
  const old = ((r.reviews || {}).sources || []).filter((s) => s.url);
  if (!rs.length && !old.length) return '';
  const li = rs.map((v) => `<li><span class="tag ${CLASS_OK[v.class] || ''}">${esc(v.class)}</span> <a href="${esc(v.url)}" target="_blank" rel="noopener">${esc(v.channel)}${v.kind === 'articolo' ? ' (articolo)' : ''}</a>${v.date ? ` <span class="muted small">${esc(v.date)}</span>` : ''}${v.phrase ? `<br><span class="small">«${esc(v.phrase)}»</span>` : '<br><span class="small muted">da guardare: frase non ancora verificata</span>'}</li>`).join('');
  const oli = old.map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.site || s.url)}</a></li>`).join('');
  return `<section class="block"><h3>${tip('indipendente', 'Recensioni')}</h3>${li ? `<ul class="reviews">${li}</ul>` : ''}
    ${oli ? `<details class="more"><summary>Altre recensioni (negozi e siti, non verificate)</summary><ul class="reviews">${oli}</ul></details>` : ''}
    <p class="small muted">Le recensioni sono opinioni: non entrano mai nei confronti né nei consigli.</p></section>`;
}

function trialsHtml(r, st) {
  const lives = st.lives.filter((l) => l.id === r.id);
  const cur = st.equipped.id === r.id ? st.sessions.filter((s) => s.life === st.equipped.since) : [];
  const feels = cur.filter((s) => s.feel).map((s) => s.feel);
  if (!lives.length && !cur.length) return '';
  const v = { si: 'la ricompreresti', no: 'non la ricompreresti', forse: 'forse la ricompreresti' };
  return `<section class="block"><h3>Le tue prove</h3><ul class="sessions">
    ${cur.length ? `<li>Montata ora: ${cur.length} uscite${feels.length ? `, voto medio ${fmtN(feels.reduce((a, b) => a + b, 0) / feels.length, 1)}/5` : ''}</li>` : ''}
    ${lives.map((l) => `<li>${esc(itDate(l.from))} → ${esc(itDate(l.to))}: ${fmtN(l.hours, 1)} h, ${esc(l.reason)}${l.diary && l.diary.verdict ? `, ${v[l.diary.verdict]}` : ''}${l.diary && l.diary.tags && l.diary.tags.length ? ` · ${esc(l.diary.tags.join(', '))}` : ''}</li>`).join('')}
  </ul></section>`;
}

export function sheetHtml(r, ctx) {
  const st = ctx.state(), ref = ctx.equippedRec(), meta = ctx.META;
  const isEq = r.id === st.equipped.id;
  const liked = st.liked.includes(r.id), disliked = st.disliked.includes(r.id);
  const lk = isEq ? null : likeness(r, st.liked.filter((id) => id !== st.equipped.id), st.disliked, ctx.ALL, meta);
  const lkTxt = lk && lk.id ? `Simile alla ${esc(ctx.BY_ID[lk.id].model)} (ti piace) in ${misure(lk.similar)} su ${lk.total}.` : '';
  const warn = lk && lk.warn ? `<p class="callout warn small">Somiglia a una che non ti piace: ${esc(ctx.BY_ID[lk.warn].model)}.</p>` : '';
  const inStock = (st.stock || []).filter((x) => x.id === r.id);
  return `<h2 id="sheet-title">${esc(fullName(r))}</h2>
    <p class="muted">${specLine(r)} · ${esc(yearTxt(r))}</p>
    ${isEq ? '<p class="tag ok">montata ora</p>' : ''}${liked ? '<p class="tag ok">★ ti piace</p>' : ''}${disliked ? '<p class="tag warn">non ti piace</p>' : ''}${inStock.length ? `<p class="tag ok">in casa: ${inStock.map((x) => `${x.n} ${esc(x.size)}`).join(', ')}</p>` : ''}
    ${isEq ? '' : `<section class="block"><h3>Rispetto alla tua (${esc(ref.model)})</h3>${compareHtml(r, ref, meta)}${lkTxt ? `<p class="small">${lkTxt}</p>` : ''}${warn}</section>`}
    <section class="block"><h3>Misure</h3>${measuresHtml(r)}${estimatesHtml(r)}</section>
    ${trialsHtml(r, st)}
    ${reviewsHtml(r)}
    ${ctx.askBox ? ctx.askBox(r.id) : ''}
    <div class="sheet-actions">
      ${isEq ? '' : `<button type="button" class="btn primary" data-equip="${esc(r.id)}">Monta questa</button>`}
      <button type="button" class="btn" data-like="${esc(r.id)}" aria-pressed="${liked}">${liked ? '★ Ti piace' : '☆ Mi piace'}</button>
      <button type="button" class="btn" data-dislike="${esc(r.id)}" aria-pressed="${disliked}">${disliked ? '✕ Non ti piace' : '✕ Non mi piace'}</button>
      <button type="button" class="btn" data-stock-add="${esc(r.id)}" data-size="intera">+ In casa (intera)</button>
      <button type="button" class="btn" data-stock-add="${esc(r.id)}" data-size="mezza">+ In casa (mezza)</button>
    </div>`;
}
