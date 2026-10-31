// Interfaccia del diario di prova: voti 1–5 in tre momenti, tag, note, verdetto, setup e tensiometro.
// Ogni modifica passa da ctx.update (salvataggio automatico). I campi di testo si salvano a fine digitazione (change).
import { $, esc, fmt, fmtN } from './format.js';
import { CATS, MOMENTS, TAGS, SURFACES, PRESTRETCH, emptyDiary, toggleRating, setTag, setVerdict, setSetup, setNotes, setNextKgDelta, addMeter, removeMeter, momentAverage, tensionLoss } from './diary.js';
import { updateDiary, applyVerdict, setEquippedKg, trialsOf } from './state.js';
import { mineToast } from './mine.js';

const diaryView = { moment: {}, open: { setup: false, meter: false } };
const DIARY_NEXT = ['-2', '-1.5', '-1', '-0.5', '0.5', '1', '1.5', '2'];
const diaryTrial = (ctx, target) => trialsOf(ctx.state()).find((t) => t.lid === target);
const dkNum = (v) => { const s = String(v ?? '').trim().replace(',', '.'); return s === '' ? NaN : Number(s); };
const tagLabel = (t) => t.replace(/-/g, ' ');

// Il momento mostrato: quello scelto, altrimenti l'ultimo che ha già dei voti (si vede ciò che si è inserito), altrimenti il primo colpo.
function diaryMoment(ctx, target) {
  const t = diaryTrial(ctx, target), d = (t && t.diary) || emptyDiary();
  return diaryView.moment[target] || ([...MOMENTS].reverse().find((m) => d.ratings[m.key]) || MOMENTS[0]).key;
}

export function diaryHtml(ctx, target) {
  const t = diaryTrial(ctx, target);
  if (!t) return '';
  const d = t.diary || emptyDiary(), moment = diaryMoment(ctx, target), rec = ctx.BY_ID[t.id], current = target === 'current';
  const moms = MOMENTS.map((m) => { const a = momentAverage(d, m.key); return `<button type="button" class="mom" data-moment="${m.key}" aria-pressed="${m.key === moment}"><span>${esc(m.label)}</span><b>${a === null ? '—' : fmt(a, 1)}</b></button>`; }).join('');
  const rows = CATS.map((c) => { const cur = (d.ratings[moment] || {})[c.key]; return `<div class="rate" data-cat="${c.key}"><span class="rl" title="${esc(c.hint)}">${esc(c.label)}</span><span class="rbs">${[1, 2, 3, 4, 5].map((v) => `<button type="button" class="rb" data-v="${v}" aria-pressed="${cur === v}" aria-label="${esc(c.label)}: ${v} su 5">${v}</button>`).join('')}</span></div>`; }).join('');
  const tags = TAGS.map((g) => `<button type="button" class="chipbtn tg" data-tag="${g}" aria-pressed="${d.tags.includes(g)}">${esc(tagLabel(g))}</button>`).join('');
  const verdict = [['si', 'Sì'], ['forse', 'Forse'], ['no', 'No']].map(([v, l]) => `<button type="button" class="chipbtn" data-verdict="${v}" aria-pressed="${d.verdict === v}">${l}</button>`).join('');
  const opt = (list, cur) => `<option value="">—</option>${list.map((x) => `<option${x === cur ? ' selected' : ''}>${esc(x)}</option>`).join('')}`;
  const kgFields = current ? `<label>Verticali (kg) <input data-dkg="v" inputmode="decimal" size="5" value="${esc(fmtN(t.kg[0], 2))}"></label><label>Orizzontali (kg) <input data-dkg="h" inputmode="decimal" size="5" value="${esc(fmtN(t.kg[1], 2))}"></label>`
    : `<p class="small">Tensione usata: <b>${esc(fmtN(t.kg[0], 2))}/${esc(fmtN(t.kg[1], 2))} kg</b></p>`;
  const loss = new Map(tensionLoss(d).map((x) => [x.hours, x.pct]));
  const meter = d.meter.map((m, i) => `<li><span>${esc(fmtN(m.hours))} h · <b>${esc(fmtN(m.value, 2))}</b>${loss.has(m.hours) ? ` <span class="muted">(${loss.get(m.hours) > 0 ? '−' : '+'}${esc(fmtN(Math.abs(loss.get(m.hours))))}%)</span>` : ''}</span><button type="button" class="btn icon" data-dmeter-del="${i}" aria-label="Togli la lettura">×</button></li>`).join('');
  const lab = rec ? [rec.twu && rec.twu.tension_loss_pct != null ? `perdita TWU ${fmt(rec.twu.tension_loss_pct, 0)}%` : '', rec.excel && rec.excel.tl6 != null ? `TL6 ${fmt(rec.excel.tl6, 0)}%` : '', rec.excel && rec.excel.tl12 != null ? `TL12 ${fmt(rec.excel.tl12, 0)}%` : ''].filter(Boolean).join(' · ') : '';
  const open = (k) => (diaryView.open[k] ? ' open' : '');
  return `<h3>Voti e sensazioni</h3><p class="muted small">${esc(rec ? `${rec.brand} ${rec.model}` : t.id)} · ${esc(fmtN(t.kg[0], 2))}/${esc(fmtN(t.kg[1], 2))} kg · ${esc(fmtN(t.hours))} h</p>`
    + `<div class="moments" role="group" aria-label="Momento">${moms}</div><div class="rates">${rows}</div>`
    + `<div class="chips tags" role="group" aria-label="Com'è andata">${tags}</div>`
    + `<label class="dn">Sensazioni <textarea data-dnotes rows="3" placeholder="Come suona, come risponde, cosa cambieresti…">${esc(d.notes)}</textarea></label>`
    + `<div class="verdict"><span>Ricomprerei?</span><span class="chips" role="group" aria-label="Ricomprerei">${verdict}</span></div>`
    + `<details class="sheet-section" data-dsec="setup"${open('setup')}><summary>Setup e tensione usata</summary><div class="controls">${kgFields}`
    + `<label>Montata il <input type="date" data-dsetup="strungOn" value="${esc(d.setup.strungOn || String(t.from).slice(0, 10))}"></label>`
    + `<label>Pre-stretch <select data-dsetup="prestretch">${opt(PRESTRETCH, d.setup.prestretch)}</select></label>`
    + `<label>Incordatore <input data-dsetup="stringer" value="${esc(d.setup.stringer)}" maxlength="60"></label>`
    + `<label>Superficie <select data-dsetup="surface">${opt(SURFACES, d.setup.surface)}</select></label>`
    + `<label>La prossima volta <select data-dnext><option value="">—</option>${DIARY_NEXT.map((v) => `<option value="${v}"${d.nextKgDelta === Number(v) ? ' selected' : ''}>${Number(v) > 0 ? '+' : '−'}${esc(String(Math.abs(Number(v))).replace('.', ','))} kg</option>`).join('')}</select></label></div></details>`
    + `<details class="sheet-section" data-dsec="meter"${open('meter')}><summary>Tensiometro${d.meter.length ? ` (${d.meter.length})` : ''}</summary>`
    + `<p class="muted small">Scrivi la lettura a 0 h e poi le successive: calcolo quanta tensione perdi nel tuo uso.${lab ? ` Laboratorio: ${esc(lab)}.` : ''}</p>`
    + `<ul class="sessions">${meter || '<li class="muted">Nessuna lettura.</li>'}</ul>`
    + `<div class="controls"><label>Ore giocate <input id="d-meter-h" inputmode="decimal" size="5" placeholder="0"></label><label>Valore <input id="d-meter-v" inputmode="decimal" size="6" placeholder="25"></label><button type="button" class="btn" data-dmeter-add>Aggiungi lettura</button></div></details>`
    + `<p class="gaps" id="d-error" role="alert" hidden></p>`;
}

export function renderDiary(ctx) {
  const host = $('#diary');
  if (host) host.innerHTML = diaryHtml(ctx, 'current');
}

const diaryError = (msg) => { const e = $('#d-error'); if (e) { e.textContent = msg || ''; e.hidden = !msg; } };

export function initDiary(ctx) {
  const act = (target, fn) => ctx.update((s) => updateDiary(s, target, fn));
  document.addEventListener('click', (e) => {
    const host = e.target.closest('[data-dtarget]'); if (!host) return;
    const target = host.dataset.dtarget;
    // l'apertura di una sezione si registra al tocco, non all'evento toggle (asincrono): un ridisegno nel mezzo la richiuderebbe
    const sum = e.target.closest('details[data-dsec] > summary'); if (sum) { const det = sum.parentElement; diaryView.open[det.dataset.dsec] = !det.open; return; }
    const mom = e.target.closest('[data-moment]'); if (mom) { diaryView.moment[target] = mom.dataset.moment; ctx.refresh(); return; }
    const rb = e.target.closest('.rb');
    if (rb) { const cat = rb.closest('.rate').dataset.cat, v = Number(rb.dataset.v), m = diaryMoment(ctx, target); diaryView.moment[target] = m; /* il momento scelto non deve spostarsi da solo al primo voto */ diaryError(''); act(target, (d) => toggleRating(d, m, cat, v)); return; }
    const tg = e.target.closest('[data-tag]'); if (tg) { const g = tg.dataset.tag; act(target, (d) => setTag(d, g, !d.tags.includes(g))); return; }
    const vb = e.target.closest('[data-verdict]');
    if (vb) {
      const t = diaryTrial(ctx, target), prev = ctx.state(), next = t.diary && t.diary.verdict === vb.dataset.verdict ? null : vb.dataset.verdict;
      ctx.update((s) => applyVerdict(updateDiary(s, target, (d) => setVerdict(d, next)), t.id, next));
      const now = ctx.state(), name = ctx.BY_ID[t.id] ? `${ctx.BY_ID[t.id].brand} ${ctx.BY_ID[t.id].model}` : t.id;
      if (next === 'si' && now.liked.includes(t.id) && !prev.liked.includes(t.id)) mineToast(`Segnata come preferita: ${name}`, 'Annulla', () => ctx.update(() => prev));
      if (next === 'no' && now.disliked.includes(t.id) && !prev.disliked.includes(t.id)) mineToast(`Segnata come non gradita: ${name}`, 'Annulla', () => ctx.update(() => prev));
      return;
    }
    const add = e.target.closest('[data-dmeter-add]');
    if (add) {
      const hours = dkNum($('#d-meter-h').value), value = dkNum($('#d-meter-v').value);
      const t = diaryTrial(ctx, target), before = (t.diary || emptyDiary()).meter.length;
      if (!(hours >= 0) || !(value > 0) || before >= 8) { diaryError('Lettura non valida: ore da 0 in su, valore maggiore di 0, al massimo 8 letture.'); return; }
      diaryError(''); act(target, (d) => addMeter(d, { hours, value })); return;
    }
    const del = e.target.closest('[data-dmeter-del]'); if (del) act(target, (d) => removeMeter(d, Number(del.dataset.dmeterDel)));
  });
  document.addEventListener('change', (e) => {
    const host = e.target.closest('[data-dtarget]'); if (!host) return;
    const target = host.dataset.dtarget, el = e.target;
    if (el.matches('[data-dnotes]')) { act(target, (d) => setNotes(d, el.value)); return; }
    if (el.matches('[data-dsetup]')) { const k = el.dataset.dsetup; act(target, (d) => setSetup(d, { [k]: el.value === '' ? null : el.value })); return; }
    if (el.matches('[data-dnext]')) { act(target, (d) => setNextKgDelta(d, el.value === '' ? null : Number(el.value))); return; }
    if (el.matches('[data-dkg]') && target === 'current') {
      const v = dkNum(host.querySelector('[data-dkg="v"]').value), h = dkNum(host.querySelector('[data-dkg="h"]').value);
      const ok = setEquippedKg(ctx.state(), [v, h]);
      if (ok === ctx.state()) { diaryError('Tensione non valida: scrivi due numeri in kg tra 15 e 35.'); return; }
      diaryError(''); ctx.update((s) => setEquippedKg(s, [v, h]));
    }
  });
  document.addEventListener('toggle', (e) => { const k = e.target && e.target.dataset && e.target.dataset.dsec; if (k) diaryView.open[k] = e.target.open; }, true);
}
