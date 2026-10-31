// Costruttori HTML puri di riga, scheda corta (mappa) e scheda completa. Ogni dato testuale passa da esc().
import { esc, fmt, MARK, nameOf, subline, safeUrl, fullName } from './format.js';
import { rowValues, deltaVsEquipped, miniValues, communityRows } from './values.js';
import { pairingReason } from './pairing.js';
import { trialsSectionHtml } from './trials.js';

const BAND_CLASS = { Ottimo: 'ottimo', Buono: 'buono', Attenzione: 'attenzione', 'Poco adatta': 'poco', 'Non valutabile': 'nv', 'Senza riferimenti': 'nv' };
const LEVEL_WORDS = ['molto basso', 'basso', 'medio', 'alto', 'molto alto'];
const STIFF_LEVEL_WORDS = ['molto morbida', 'morbida', 'media', 'rigida', 'molto rigida'];
const CONFLICT_TEXT = { spin: ['lo spin', LEVEL_WORDS], durability: ['la tenuta', LEVEL_WORDS], stiffness: ['la rigidità', STIFF_LEVEL_WORDS] };
const REVIEW_KIND = { lab_playtest: 'playtest', review: 'recensione', brand: 'produttore', forum: 'forum', video: 'video' };
const VERDICT = { confirmed: 'confermata', plausible: 'plausibile', questionable: 'dubbia', contradicted: 'contraddetta', no_data: 'nessun dato esterno' };
const qBtn = (a) => `<button class="q" type="button" data-method="${a}" aria-label="Come si legge">?</button>`;

export function pairHtml(ctx) {
  const p = ctx.pairing || {};
  if (ctx.isEquipped) return `<span class="pair equipped" title="La corda che hai montata ora"><b>montata</b>${p.score != null ? ` · pairing ${p.score}` : ''}</span>`;
  if (ctx.pref === 'liked') return '<span class="pair liked">★ preferita</span>';
  if (ctx.pref === 'disliked') return '<span class="pair disliked">✕ non gradita</span>';
  return `<span class="pair ${BAND_CLASS[p.band] || 'nv'}" title="Pairing con la tua Blade 100 v9: somiglianza con la preferita più vicina">${p.score != null ? `<b>${p.score}</b> ` : ''}${esc(p.band || '—')}</span>`;
}

function warnInfo(rec, ctx) {
  const pr = rec.production || {};
  return rec.crosscheck && rec.crosscheck.verdict === 'contradicted' ? ['⚑ dati contestati', 'Recensioni e produttori contraddicono i numeri di laboratorio']
    : pr.reason ? [pr.reason, 'Resta solo come tuo riferimento']
    : rec.production && (pr.year === null || pr.year === undefined) ? ['anno da verificare', 'Anno di uscita non trovato: verifica che non sia un modello datato']
    : pr.status === 'unclear' ? ['produzione da verificare', 'Non è chiaro se sia ancora in vendita']
    : ctx.pairing && ctx.pairing.penalized ? ['⚠ simile a una non gradita', 'Somiglia più a una corda che non ti è piaciuta che alle tue preferite'] : null;
}
function warnHtml(rec, ctx) {
  const w = warnInfo(rec, ctx);
  return w ? `<span class="warn" title="${esc(w[1])}">${esc(w[0])}</span>` : '';
}

export function valHtml(v) {
  const title = v.note || v.why || '';
  return `<div class="val ${v.mark}" data-k="${v.key}"><span class="k">${esc(v.label)}</span><span class="mark" title="${esc(title)}" aria-label="${esc(title)}">${MARK[v.mark]}</span><span class="v">${esc(v.text)}</span>${v.mark === 'missing' ? `<small class="why-miss">${esc(v.why)}</small>` : ''}</div>`;
}

const deltaHtml = (rec, ctx) => { const t = ctx.isEquipped ? '' : deltaVsEquipped(rec, ctx.equipped).text; return t ? `<p class="delta">rispetto alla tua: <b>${esc(t)}</b></p>` : ''; };

function tensionHtml(ctx) {
  const t = ctx.tension;
  if (!t) return '';
  return `<p class="tension-line">Tensione <span class="badge est" title="Regola empirica dalla tua montata: non è una misura">stima</span> <b class="num">${fmt(t.kg[0], 1)}/${fmt(t.kg[1], 1)} kg</b> <span class="muted small">± 1 kg${t.corrected ? '' : ' · come la montata'}</span></p>`;
}

function actionsHtml(rec, ctx, extra = '') {
  const id = esc(rec.id);
  return `<div class="card-actions"><button class="btn primary" type="button" data-open="${id}">Scheda</button>${ctx.isEquipped ? '' : `<button class="btn" type="button" data-equip="${id}">Monta</button>`}`
    + `<button class="btn icon${ctx.pref === 'liked' ? ' on' : ''}" type="button" data-like="${id}" aria-pressed="${ctx.pref === 'liked'}" aria-label="Mi piace">★</button>`
    + `<button class="btn icon${ctx.pref === 'disliked' ? ' on' : ''}" type="button" data-dislike="${id}" aria-pressed="${ctx.pref === 'disliked'}" aria-label="Non mi piace">✕</button>${extra}</div>`;
}

export function rowHtml(rec, ctx) {
  const why = ctx.why ? `<p class="why">${esc(pairingReason(ctx.pairing, ctx.nameOf))}</p>` : '';
  return `<article class="scard" data-id="${esc(rec.id)}">${ctx.rank ? `<span class="rank-tag">${esc(ctx.rank)}</span>` : ''}`
    + `<div class="scard-head"><span class="scard-name">${esc(nameOf(rec))}</span>${pairHtml(ctx)}<span class="scard-sub">${esc(subline(rec))}</span></div>${why}`
    + `<div class="vals">${rowValues(rec).map(valHtml).join('')}</div>${deltaHtml(rec, ctx)}${tensionHtml(ctx)}<div class="badges">${warnHtml(rec, ctx)}</div>${actionsHtml(rec, ctx)}</article>`;
}

// Pairing in poco spazio: il colore dice la fascia, il numero il valore, la fascia per esteso sta nel suggerimento e nella scheda.
function compactPair(ctx) {
  const p = ctx.pairing || {};
  if (ctx.isEquipped) return '<span class="pair equipped" title="La corda che hai montata ora">montata</span>';
  if (ctx.pref === 'liked') return '<span class="pair liked" title="Tua preferita">★</span>';
  if (ctx.pref === 'disliked') return '<span class="pair disliked" title="Non gradita">✕</span>';
  return `<span class="pair ${BAND_CLASS[p.band] || 'nv'}" title="${esc(p.band || '—')}${p.score != null ? ` · ${p.score}` : ''}">${p.score != null ? `<b>${p.score}</b>` : '—'}</span>`;
}

// Riga da liste e Banco: due righe, un solo pulsante (tutta la riga) che apre la scheda. Le azioni stanno nella scheda.
export function compactRowHtml(rec, ctx) {
  const id = esc(rec.id), w = warnInfo(rec, ctx), d = ctx.isEquipped ? '' : deltaVsEquipped(rec, ctx.equipped).text;
  const minis = miniValues(rec).map((m) => `<span class="m ${m.mark}" data-k="${m.key}" title="${esc(m.title)}"><span class="mk">${MARK[m.mark]}</span><b>${esc(m.val)}</b><em>${esc(m.em)}</em></span>`).join('');
  const why = ctx.why ? `<span class="r3">${esc(pairingReason(ctx.pairing, ctx.nameOf))}</span>` : '';
  return `<div class="crow2wrap" data-id="${id}"><button type="button" class="crow2" data-open="${id}" aria-label="Apri la scheda di ${esc(fullName(rec))}">`
    + `<span class="r1">${ctx.rankNum ? `<span class="rk">${ctx.rankNum}</span>` : ''}<span class="nm">${esc(fullName(rec))}</span>${w ? `<span class="wdot" title="${esc(`${w[0]}: ${w[1]}`)}">⚑</span>` : ''}${compactPair(ctx)}</span>`
    + `<span class="r2">${minis}${d ? `<span class="d">${esc(d)}</span>` : ''}</span>${why}</button>${ctx.after || ''}</div>`;
}

export function shortCardHtml(rec, ctx) {
  return `<div class="short" data-id="${esc(rec.id)}"><p><b class="scard-name">${esc(nameOf(rec))}</b> <span class="muted small">${esc(subline(rec))}</span></p>${pairHtml(ctx)}`
    + `<div class="vals">${rowValues(rec).map(valHtml).join('')}</div>${deltaHtml(rec, ctx)}<button class="btn" type="button" data-open="${esc(rec.id)}">Apri scheda</button></div>`;
}

const kv = (pairs) => `<dl class="kv">${pairs.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>`;
const pick = (o, k) => (o ? o[k] ?? o[String(k)] : undefined);
const NOTE_PARTS = [['feel', 'Sensazione'], ['for_your_style', 'Per il tuo stile'], ['vs_favorites', 'Rispetto alle tue preferite']];
// la tensione "Parti da …" nelle note è calcolata dalle preferite iniziali: la tensione viva sta nel riquadro dedicato
const stripStart = (s) => String(s || '').replace(/Parti da [\d.,/ ]+kg \([\d.,/ ]+lbs\)\.?/g, '').trim();

function conflictsHtml(rec) {
  const c = rec.reviews.conflicts || [];
  if (!c.length) return '';
  return `<div class="conflicts"><h3>Tester e dati non concordano</h3>${c.map((x) => {
    const [what, words] = CONFLICT_TEXT[x.criterion] || [x.criterion, LEVEL_WORDS];
    const w = (lv) => words[Math.max(0, Math.min(4, Math.round(lv) - 1))];
    return `<p class="conflict"><b>${esc(what)}:</b> I tester dicono <b>${esc(w(x.testers))}</b>, i dati misurano <b>${esc(w(x.lab))}</b> <span class="muted small">(${esc(x.sites.join(', '))})</span></p>`;
  }).join('')}<p class="muted small">Le recensioni sono opinioni: non entrano in nessun punteggio.</p></div>`;
}

function labHtml(rec, ctx) {
  const e = rec.excel, t = rec.twu, p = rec.rpedia;
  let olg = '';
  if (e && e.olg_16x19 && ctx.tension) {
    const target = (ctx.tension.lbs[0] + ctx.tension.lbs[1]) / 2;
    const near = [40, 50, 60, 65].reduce((a, b) => (Math.abs(b - target) < Math.abs(a - target) ? b : a));
    const v = pick(e.olg_16x19, near);
    if (v !== null && v !== undefined) olg = `<p class="small">Lunghezza guadagnata 16×19 a ${near} lbs: <b>${fmt(v, 1)}″</b> <span class="muted">(utile se incordi da matassa)</span></p>`;
  }
  const f = (v, d, u = '') => (v === null || v === undefined ? '—' : `${fmt(v, d)}${u}`);
  const ex = e ? kv([
    ['Allungamento 40 / 50 / 60 / 65 lbs', ['40', '50', '60', '65'].map((k) => f(pick(e.stretch_pct, k), 1)).join(' / ') + ' %'],
    ['Cedimento <span class="muted">(ex Stiff Index: più alto = cede di più)</span>', f(e.stiff_index_avg, 2)],
    ['Scorrimento 24 h con 40 lbs', f(e.static_24h_creep, 2, '″')],
    ['Perdita tensione 6 / 12 mesi', `${f(e.tl6, 0, ' %')} / ${f(e.tl12, 0, ' %')}`]]) + olg : '<p class="muted small">Non testata nel tuo file.</p>';
  const tw = t ? `${t.match !== 'exact' ? `<p class="proxy small">Dato di «${esc(t.twu_name)}» (${t.match === 'proxy' ? 'stesso modello, altro calibro' : 'stessa corda, nome diverso'}).</p>` : ''}${kv([
    ['Rigidità dinamica', f(t.stiffness_lbin, 1, ' lb/in')], ['Perdita di tensione', f(t.tension_loss_pct, 1, ' %')], ['Spin potential', f(t.spin_potential, 1)]])}` : '<p class="muted small">Non presente.</p>';
  const rp = p ? `${kv([['Rigidità statica', f(p.static_stiffness_kgmm, 2, ' kg/mm')]])}<p class="small"><a href="${esc(safeUrl(p.url))}" target="_blank" rel="noopener">Apri su Racketpedia</a></p>` : '<p class="muted small">Non presente.</p>';
  return `<details class="sheet-section lab-sec"><summary>Dati di laboratorio completi</summary><div class="src"><h3>Test Ektelon (il tuo file)</h3>${ex}</div><div class="src"><h3>Tennis Warehouse University</h3>${tw}</div><div class="src"><h3>Racketpedia</h3>${rp}</div></details>`;
}

// Recensioni dei tester e conflitti con i dati: aperta da sola quando i tester e le misure non concordano.
function reviewsHtml(rec) {
  const revs = rec.reviews.sources || [], bad = (rec.reviews.conflicts || []).length > 0;
  const list = revs.length ? revs.map((s) => `<div class="rev"><span><b>${esc(s.site)}</b> <span class="muted small">${esc(REVIEW_KIND[s.kind] || s.kind)}</span>${s.gauge_mismatch ? ' <span class="badge" title="La recensione non dichiara il calibro o riguarda un altro calibro">calibro diverso</span>' : ''}</span>${s.note ? `<span class="muted small">${esc(s.note)}</span>` : ''}<a class="small" href="${esc(safeUrl(s.url))}" target="_blank" rel="noopener">Fonte</a></div>`).join('') : '<p class="muted small">Nessuna recensione trovata.</p>';
  return `<details class="sheet-section reviews-sec"${bad ? ' open' : ''}><summary>Recensioni dei tester: ${bad ? '⚠ non concordano con i dati' : `${revs.length} · solo riferimento`}</summary>${conflictsHtml(rec)}${list}</details>`;
}

function crosscheckHtml(rec) {
  const c = rec.crosscheck;
  if (!c) return '';
  const host = (u) => { try { return new URL(u).hostname.replace('www.', ''); } catch { return u; } };
  return `<details class="sheet-section"><summary>Controllo incrociato: ${esc(VERDICT[c.verdict] || c.verdict)}</summary>${c.note ? `<p class="small">${esc(c.note)}</p>` : ''}<p class="small muted">Fonti: ${(c.sources || []).map((u) => `<a href="${esc(safeUrl(u))}" target="_blank" rel="noopener">${esc(host(u))}</a>`).join(' · ')}</p></details>`;
}

const TILE_ANCHOR = { spin: 'spin', stiffness: 'rigidita', durability: 'tenuta' };
function tileHtml(v) {
  let big, small;
  if (v.mark === 'missing') { big = '—'; small = v.why; }
  else { const parts = v.text.split(' · '); big = parts[0]; small = parts[1] || (v.mark === 'estimated' ? 'stima' : ''); }
  return `<div class="tile ${v.mark}" data-k="${v.key}"><span class="k">${esc(v.label)} ${qBtn(TILE_ANCHOR[v.key])}</span><b class="big">${esc(big)}</b><span class="s"><span class="mark" title="${esc(v.note || v.why || '')}">${MARK[v.mark]}</span> ${esc(small)}</span></div>`;
}

// Controllo e potenza dei tester, separati. Sono opinioni: non entrano nei punteggi.
const FEM = { alto: 'alta', medio: 'media', basso: 'bassa' };
function communityHtml(rec) {
  const rows = communityRows(rec), have = rows.filter((r) => r.word), cmps = (rec.community && rec.community.comparisons) || [];
  if (!have.length && !cmps.length) return '<details class="sheet-section community-sec"><summary>Controllo e potenza dai tester</summary><p class="muted small">Nessun parere dei tester raccolto per questa corda. La potenza non ha una misura di laboratorio.</p></details>';
  const li = rows.map((r) => {
    if (!r.word) return `<li><b>${esc(r.label)}</b>: <span class="muted">nessun parere</span></li>`;
    const w = r.key === 'power' ? FEM[r.word] : r.word;
    const ev = r.evidence.map((e) => (safeUrl(e.url) ? `<a href="${esc(safeUrl(e.url))}" target="_blank" rel="noopener">${esc(e.site || 'fonte')}</a>` : '')).filter(Boolean).join(' · ');
    return `<li><b>${esc(r.label)}</b>: ${esc(w)} · ${r.n} ${r.n === 1 ? 'parere' : 'pareri'}${r.n < 3 ? ' · <i>pochi pareri</i>' : ''}${r.split ? ' · <b>discordi</b>' : ''}${ev ? ` <span class="muted small">(${ev})</span>` : ''}</li>`;
  }).join('');
  const DIR = { more: 'più', less: 'meno', same: 'lo stesso' }, ATTR = { control: 'controllo', power: 'potenza' };
  const cm = cmps.map((c) => { const u = safeUrl(c.url); return `<li>${esc(rec.model || 'Questa')} ha ${esc(DIR[c.direction])} ${esc(ATTR[c.attribute])}${esc(' di ' + c.vs)} · ${c.n} ${c.n === 1 ? 'parere' : 'pareri'}${u ? ` <span class="muted small">(<a href="${esc(u)}" target="_blank" rel="noopener">${esc(c.site || 'fonte')}</a>)</span>` : ''}</li>`; }).join('');
  return `<details class="sheet-section community-sec" open><summary>Controllo e potenza dai tester</summary><ul class="srcnotes">${li}${cm}</ul><p class="muted small">Opinioni, non misure: valgono per il modello (tutti i calibri) e non entrano nel pairing né nei punteggi.</p></details>`;
}

export function sheetHtml(rec, ctx) {
  const rv = rowValues(rec), j = rec.derived.judgments || {}, ex = rec.derived.excel_measures, id = esc(rec.id);
  const life = ctx.life ? `≈ ${fmt(ctx.life.hours, 0)} ore (${fmt(ctx.life.low, 0)}–${fmt(ctx.life.high, 0)}) · ${esc(ctx.life.basis)} ${qBtn('usura')}` : `— ${qBtn('usura')}`;
  const comfort = j.comfort && j.comfort.word ? `${esc(j.comfort.word)} <span class="badge est">stima dalla rigidità</span>` : '—';
  const details = kv([
    ['Comfort', comfort], ['Elasticità', ex && ex.elasticity != null ? `${fmt(ex.elasticity * 100, 0)} % recuperato` : '— (manca il test Excel)'],
    ['Cedimento', ex && ex.cedimento != null ? `${fmt(ex.cedimento, 2)} (più alto = cede di più)` : '— (manca il test Excel)'], ['Vita attesa', life]])
    + `<ul class="srcnotes">${rv.map((v) => `<li><b>${esc(v.label)}:</b> ${esc(v.note || v.why || '')}</li>`).join('')}</ul>`;
  const notes = NOTE_PARTS.map(([k, l]) => [l, stripStart(rec.notes && rec.notes[k])]).filter(([, v]) => v).map(([l, v]) => `<div class="note"><h3>${l}</h3><p>${esc(v)}</p></div>`).join('');
  return `<div class="sheet-head"><p class="eyebrow">${rec.is_target ? 'Marca valutata' : 'Concorrente di riferimento'}</p><h2 id="sheet-title">${esc(nameOf(rec))}</h2>`
    + `<p class="muted">${esc(subline(rec))}${rec.shape_source ? ' (forma dal produttore)' : ''}</p><div class="badges">${pairHtml(ctx)} ${warnHtml(rec, ctx)}</div>`
    + `<p class="pair-reason">${esc(pairingReason(ctx.pairing, ctx.nameOf))} ${qBtn('pairing')}</p></div>`
    + `<div class="tiles">${rv.map(tileHtml).join('')}</div>`
    + `<div class="sheet-meta">${deltaHtml(rec, ctx)}${tensionHtml(ctx)}</div>`
    + communityHtml(rec)
    + `<details class="sheet-section details-sec"><summary>Dettagli e stime</summary>${details}</details>`
    + trialsSectionHtml(ctx.trials || [])
    + reviewsHtml(rec)
    + (notes ? `<details class="sheet-section notes-sec"><summary>Note dell'incordatore</summary>${notes}</details>` : '')
    + `${labHtml(rec, ctx)}${crosscheckHtml(rec)}`
    + (ctx.ai ? `<section class="sheet-section ai-section"><h3>Parere AI</h3><p class="muted small">Su richiesta, separato dai dati misurati.</p><button class="btn" type="button" data-ai="string" data-ai-id="${id}">Valuta con AI</button><div class="ai-out" data-ai-out="${id}" aria-live="polite">${ctx.aiCachedHtml || ''}</div></section>` : '')
    + `<div class="sheet-actions">${ctx.isEquipped ? '' : `<button class="btn primary" type="button" data-equip="${id}">Monta questa</button>`}`
    + `<button class="btn icon${ctx.pref === 'liked' ? ' on' : ''}" type="button" data-like="${id}" aria-pressed="${ctx.pref === 'liked'}" aria-label="Mi piace">★</button>`
    + `<button class="btn icon${ctx.pref === 'disliked' ? ' on' : ''}" type="button" data-dislike="${id}" aria-pressed="${ctx.pref === 'disliked'}" aria-label="Non mi piace">✕</button>`
    + `<button class="btn" type="button" data-compare="${id}" aria-pressed="${!!ctx.inCompare}">${ctx.inCompare ? '✓ In confronto' : 'Confronta'}</button></div>`;
}
