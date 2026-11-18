// Scheda di una corda e dialogo di confronto con la montata. Solo misure nei confronti; le stime in fondo, marcate.
import { esc, NF, fullName, fmtN, safeUrl } from './format.js';
import { CATS, MOMENTS } from './diary.js';
import { CMP_KEYS, compareTo, summarize, agreement, UNKNOWN } from './cmp.js';
import { likeness } from './next.js';
import { bedOf, compareBeds, physSummary, physPhrase, diffTxt } from './phys.js';
import { tip, labValue, specLine, fmtV, itDate, infoTip, misure, shapeOf } from './ui.js';

const SRC_ROWS = [
  ['TWU (in gioco, 51 lb)', ['twu.stiffness', 'twu.loss', 'twu.spin']],
  ['Racketpedia (a riposo)', ['rp.kgmm']],
  ['Il tuo test Excel', ['excel.stretch50']],
];
const CLASS_OK = { indipendente: 'ok', 'indipendente con riserva': 'ok' };
const EST_KIND = { parente: 'dallo stesso modello in un altro calibro', 'da Racketpedia': 'convertita dalla misura Racketpedia', modello: 'da un modello statistico', calibro: 'dal solo calibro', tester: 'dai punteggi dei tester', qualitativo: 'dai giudizi dei tester' };
const estKind = (k) => EST_KIND[k] || 'stima';
const yearTxt = (r) => { const p = r.production || {}; if (!p.year) return 'anno non verificato'; return p.year_confidence === 'exact' ? `uscita nel ${p.year}` : `in vendita almeno dal ${p.year} (anno non verificato)`; };

export function measuresHtml(r) {
  return SRC_ROWS.map(([title, keys]) => `<div class="mgroup"><h4>${esc(title)}</h4><dl>${keys.map((k) => `<dt>${tip(k, esc(CMP_KEYS[k].label))}</dt><dd>${labValue(r, k)}</dd>`).join('')}</dl></div>`).join('');
}

function estimatesHtml(r) {
  const out = [];
  const st = r.stiffness;
  if (st && st.value_lbin != null && st.kind !== 'misurata') out.push(`rigidità ≈ ${NF(0).format(st.value_lbin)} lb/in (${esc(estKind(st.kind))}${st.low != null ? `, tra ${NF(0).format(st.low)} e ${NF(0).format(st.high)}` : ''})`);
  const sp = r.spin;
  if (sp && sp.value != null && sp.kind !== 'misurato') out.push(`spin ≈ ${NF(1).format(sp.value)} (${esc(estKind(sp.kind))}${sp.low != null ? `, tra ${NF(1).format(sp.low)} e ${NF(1).format(sp.high)}` : ''})`);
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

// Il confronto in campo (modello fisico, alla tua tensione) e sotto le misure fonte per fonte.
function physBlock(r, ref, kg) {
  const rows = compareBeds(bedOf(r, r, kg), bedOf(ref, ref, kg));
  if (!rows.length) return '';
  return `<p class="summary">${esc(physSummary(rows, ref.model))} ${tip('fisica', 'ⓘ', null, 'Come si calcola il confronto in campo')}</p>
    <ul class="cmp-rows">${rows.map((x) => `<li><p class="cmp-q">${tip(x.tip, esc(x.label))}</p><p class="cmp-w lvl-${x.level === 'simile' ? 'same' : x.level === 'nettamente' ? 'big' : 'some'}">${x.dir ? esc(physPhrase(x)) : 'simile'} <span class="muted small">(${esc(diffTxt(x))})</span></p><p class="small">${esc(x.why)}</p></li>`).join('')}</ul>`;
}

export function compareHtml(r, ref, meta, kg = [22, 21]) {
  const phys = physBlock(r, ref, kg);
  const rows = compareTo(r, ref, meta);
  const s = summarize(rows, ref.model);
  const ag = agreement(rows).stiffness;
  const agTxt = ag === 'concordano' ? 'TWU e Racketpedia concordano sulla rigidità.' : ag === 'disaccordo' ? 'TWU e Racketpedia non concordano sulla rigidità: nessuna conclusione.' : ag === 'in parte' ? 'Sulla rigidità una fonte vede una differenza, l\'altra no.' : '';
  const spec = `<ul class="spec-cmp"><li>${tip('calibro', 'Calibro')}: ${ref.gauge_mm ? NF(2).format(ref.gauge_mm) : '—'} → ${r.gauge_mm ? NF(2).format(r.gauge_mm) : '—'} mm${ref.gauge_mm && r.gauge_mm && Math.abs(r.gauge_mm - ref.gauge_mm) >= 0.03 ? (r.gauge_mm < ref.gauge_mm ? ' (più sottile: di solito più morso, dura meno)' : ' (più spessa: di solito dura di più, meno morso)') : ''}</li>
    <li>${tip('forma', 'Forma')}: ${esc(shapeOf(ref))} → ${esc(shapeOf(r))}</li></ul>`;
  const detail = `<p class="summary">${esc(s.text)} ${infoTip('soglie', 'Come decidiamo simile, un po\' o nettamente')}</p>${agTxt ? `<p class="small">${esc(agTxt)}</p>` : ''}${rowsHtml(rows, ref.model, r.model)}`;
  return `${phys || detail}${phys ? `<details class="more"><summary>Le misure, fonte per fonte</summary>${detail}</details>` : ''}${spec}
    <p class="small muted">${tip('controllo', 'Cosa non sappiamo')}: ${esc(UNKNOWN)}</p>`;
}

function reviewsHtml(r) {
  const rs = r.indep_reviews || [];
  const old = ((r.reviews || {}).sources || []).filter((s) => s.url);
  if (!rs.length && !old.length) return '';
  const li = rs.map((v) => `<li><span class="tag ${CLASS_OK[v.class] || ''}">${esc(v.class)}</span> <a href="${esc(safeUrl(v.url))}" target="_blank" rel="noopener">${esc(v.channel)}${v.kind === 'articolo' ? ' (articolo)' : ''}</a>${v.date ? ` <span class="muted small">${esc(itMonth(v.date))}</span>` : ''}${v.phrase ? `<br><span class="small">«${esc(v.phrase)}»</span>` : '<br><span class="small muted">da guardare: frase non ancora verificata</span>'}</li>`).join('');
  const oli = old.map((s) => `<li><a href="${esc(safeUrl(s.url))}" target="_blank" rel="noopener">${esc(s.site || s.url)}</a></li>`).join('');
  return `<section class="block"><h3>${tip('indipendente', 'Recensioni')}</h3>${li ? `<ul class="reviews">${li}</ul>` : ''}
    ${oli ? `<details class="more"><summary>Altre recensioni (negozi e siti, non verificate)</summary><ul class="reviews">${oli}</ul></details>` : ''}
    <p class="small muted">Le recensioni sono opinioni: non entrano mai nei confronti né nei consigli.</p></section>`;
}

const MONTHS = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
export const itMonth = (d) => { const m = /^(≈)?(\d{4})-(\d{2})/.exec(String(d || '')); return m ? `${m[1] ? 'circa ' : ''}${MONTHS[Number(m[3]) - 1]} ${m[2]}` : String(d || ''); };
const VERDICT = { si: 'la ricompreresti', no: 'non la ricompreresti', forse: 'forse la ricompreresti' };
const tagWord = (t) => String(t).replace(/-/g, ' ');

// Il diario salvato (v5): si legge tutto, non si compila più.
function diaryHtml(d) {
  if (!d) return '';
  const parts = [];
  if (d.verdict) parts.push(`<p>Verdetto: <b>${esc(VERDICT[d.verdict] || d.verdict)}</b></p>`);
  if (d.notes) parts.push(`<p>«${esc(d.notes)}»</p>`);
  if (d.tags && d.tags.length) parts.push(`<p>Parole: ${esc(d.tags.map(tagWord).join(', '))}</p>`);
  const rows = MOMENTS.filter((m) => d.ratings && d.ratings[m.key] && Object.keys(d.ratings[m.key]).length)
    .map((m) => `<li><b>${esc(m.label)}</b>: ${CATS.filter((c) => d.ratings[m.key][c.key]).map((c) => `${esc(c.label)} ${d.ratings[m.key][c.key]}/5`).join(', ')}</li>`).join('');
  if (rows) parts.push(`<ul class="diary-votes">${rows}</ul>`);
  const su = d.setup || {};
  const setup = [su.strungOn ? `incordata il ${itDate(su.strungOn)}` : '', su.surface ? `campo: ${su.surface}` : '', su.stringer ? `incordatore: ${su.stringer}` : '', su.prestretch ? `prestretch: ${su.prestretch}` : ''].filter(Boolean);
  if (setup.length) parts.push(`<p class="small">${esc(setup.join(' · '))}</p>`);
  if (d.meter && d.meter.length) parts.push(`<p class="small">Tensiometro: ${d.meter.map((m) => `${esc(fmtN(m.value, 1))} dopo ${esc(fmtN(m.hours, 1))} h`).join(', ')}</p>`);
  return parts.length ? `<details class="more"><summary>Il tuo diario</summary>${parts.join('')}<p class="small muted">Le tue opinioni: non cambiano misure, confronti o consigli.</p></details>` : '';
}

function trialsHtml(r, st) {
  const lives = st.lives.filter((l) => l.id === r.id);
  const isEq = st.equipped.id === r.id;
  const cur = isEq ? st.sessions.filter((s) => s.life === st.equipped.since) : [];
  const feels = cur.filter((s) => s.feel).map((s) => s.feel);
  if (!lives.length && !isEq) return '';
  return `<section class="block"><h3>Le tue prove</h3><ul class="trials">
    ${isEq ? `<li><p>Montata ora: ${cur.length} ${cur.length === 1 ? 'uscita' : 'uscite'}${feels.length ? `, voto medio ${fmtN(feels.reduce((a, b) => a + b, 0) / feels.length, 1)}/5` : ''}</p>${diaryHtml(st.equipped.diary)}</li>` : ''}
    ${lives.map((l) => `<li><p>${esc(itDate(l.from))} → ${esc(itDate(l.to))}: ${fmtN(l.hours, 1)} h, ${esc(l.reason)}${l.diary && l.diary.verdict ? `, ${VERDICT[l.diary.verdict]}` : ''}</p>${diaryHtml(l.diary)}</li>`).join('')}
  </ul></section>`;
}

const NOTE_TITLES = { feel: 'Sensazione', on_blade_100_v9: 'Sulla Blade 100', for_your_style: 'Per il tuo gioco', vs_favorites: 'Rispetto alle preferite' };
function notesHtml(r) {
  const n = r.notes || {};
  const items = Object.keys(NOTE_TITLES).filter((k) => n[k]).map((k) => `<p><b>${NOTE_TITLES[k]}.</b> ${esc(n[k])}</p>`).join('');
  return items ? `<details class="more"><summary>Note da incordatore (opinioni e regole pratiche, non misure)</summary>${items}</details>` : '';
}
const COMM_LABEL = { control: 'Controllo', power: 'Potenza', spin: 'Spin', comfort: 'Comfort', durability: 'Durata' };
function communityHtml(r) {
  const c = r.community || {};
  const items = Object.keys(COMM_LABEL).filter((k) => c[k] && c[k].evidence && c[k].evidence.length).map((k) => `<li><b>${COMM_LABEL[k]}</b>: ${esc(c[k].word || '')} (${c[k].n} ${c[k].n === 1 ? 'parere' : 'pareri'})
    <ul>${c[k].evidence.slice(0, 3).map((e) => `<li class="small"><q class="quote" lang="en">${esc(e.quote)}</q> — <a href="${esc(safeUrl(e.url))}" target="_blank" rel="noopener">${esc(e.site)}</a></li>`).join('')}</ul></li>`).join('');
  return items ? `<details class="more"><summary>${tip('controllo', 'Pareri dei forum')} (opinioni, mai nei calcoli)</summary><ul class="reviews">${items}</ul></details>` : '';
}
function twinExcel(r, ALL) {
  const e = r.lab && r.lab.excel;
  if (!e) return '';
  const same = ALL.filter((x) => x.id !== r.id && x.lab && x.lab.excel && x.lab.excel.stretch50 === e.stretch50 && x.lab.excel.recover50 === e.recover50 && x.lab.excel.creep24 === e.creep24);
  return same.length ? `<p class="small callout warn">I valori del tuo Excel sono identici a quelli della ${esc(same.map((x) => fullName(x)).join(', '))}: forse una riga copiata nel file.</p>` : '';
}
function tensionHtml(r, ref, st, meta, rows) {
  const t = rows.find((x) => x.key === 'twu.stiffness');
  const kg = st.equipped.kg;
  const base = `${NF(1).format(kg[0])}/${NF(1).format(kg[1])} kg`;
  if (t && t.level === 'nettamente' && t.dir === 'più') return `<p class="small">${tip('tensione', 'Tensione')}: parti dalla tua (${base}). Ipotesi: essendo nettamente più rigida in TWU, prova ${NF(1).format(kg[0] - 0.5)}/${NF(1).format(kg[1] - 0.5)} kg.</p>`;
  return `<p class="small">${tip('tensione', 'Tensione')}: parti dalla tua (${base}).</p>`;
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
    ${isEq ? '' : `<section class="block"><h3>Rispetto alla tua (${esc(ref.model)})</h3>${compareHtml(r, ref, meta, st.equipped.kg)}${tensionHtml(r, ref, st, meta, compareTo(r, ref, meta))}${lkTxt ? `<p class="small">${lkTxt}</p>` : ''}${warn}</section>`}
    <section class="block"><h3>Misure</h3>${measuresHtml(r)}${twinExcel(r, ctx.ALL)}${estimatesHtml(r)}</section>
    ${trialsHtml(r, st)}
    ${reviewsHtml(r)}
    ${notesHtml(r) || communityHtml(r) ? `<section class="block">${notesHtml(r)}${communityHtml(r)}</section>` : ''}
    ${ctx.askBox ? ctx.askBox(r.id) : ''}
    <div class="sheet-actions">
      ${isEq ? '' : `<button type="button" class="btn primary" data-equip="${esc(r.id)}">Monta questa</button>`}
      <button type="button" class="btn" data-like="${esc(r.id)}" aria-pressed="${liked}">${liked ? '★ Ti piace' : '☆ Mi piace'}</button>
      <button type="button" class="btn" data-dislike="${esc(r.id)}" aria-pressed="${disliked}">${disliked ? '✕ Non ti piace' : '✕ Non mi piace'}</button>
      <button type="button" class="btn" data-stock-add="${esc(r.id)}" data-size="intera">+ In casa (intera)</button>
      <button type="button" class="btn" data-stock-add="${esc(r.id)}" data-size="mezza">+ In casa (mezza)</button>
    </div>`;
}
