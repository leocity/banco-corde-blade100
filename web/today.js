// Schermata «Oggi»: corda montata, + Uscita in un tocco, voto in un secondo tocco, scorta, cambio corda.
import { $, esc, NF, fullName, fmtN } from './format.js';
import { addSession, rateSession, removeSession, restoreSession, addPastLife, setEquippedKg, equippedHours, changeString, updateDiary, applyVerdict, addStock, setStockCount, SESSION_TAGS, parseHours, SIZE_LABEL, canStringFull } from './state.js';
import { setVerdict } from './diary.js';
import { tip, nameBtn, specLine, hasMeasures, itDate } from './ui.js';

const QUICK_HOURS = 1.5;
const FACES = ['', '😖', '🙁', '😐', '🙂', '😄'];
const FEEL_WORD = ['', 'pessima', 'così così', 'normale', 'bene', 'benissimo'];
const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const lifeSessions = (st) => st.sessions.filter((s) => s.life === st.equipped.since).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.ts < b.ts ? 1 : -1));
const hoursTxt = (h) => `${fmtN(h, 1)} h`;

function historyHtml(st, BY_ID) {
  if (!st.lives.length) return '';
  const lives = [...st.lives].sort((a, b) => (a.to < b.to ? 1 : -1));
  const v = { si: 'la ricompreresti', no: 'non la ricompreresti', forse: 'forse' };
  return `<details class="more"><summary>Corde finite (${lives.length})</summary><ul class="sessions lives">${lives.map((l) => `<li><span>${BY_ID[l.id] ? nameBtn(BY_ID[l.id]) : esc(l.id)}</span><span class="small">${esc(itDate(l.from))} → ${esc(itDate(l.to))} · ${hoursTxt(l.hours)} · ${esc(l.reason)}${l.diary && l.diary.verdict ? ` · ${v[l.diary.verdict]}` : ''}</span></li>`).join('')}</ul></details>`;
}

function lastLifeLine(st, BY_ID) {
  const done = st.lives.filter((l) => l.reason === 'consumata');
  if (!done.length) return '';
  const last = [...done].sort((a, b) => (a.to < b.to ? 1 : -1))[0];
  const r = BY_ID[last.id];
  const avg = done.length >= 3 ? ` In media le tue corde durano ${hoursTxt(done.reduce((a, l) => a + l.hours, 0) / done.length)} (${done.length} corde).` : '';
  return `<p class="muted small">La tua corda precedente consumata (${esc(r ? r.model : last.id)}) è durata ${hoursTxt(last.hours)}.${avg}</p>`;
}

function rateRow(s) {
  if (!s) return '';
  const when = s.date === todayIso() ? 'oggi' : itDate(s.date);
  const faces = [1, 2, 3, 4, 5].map((v) => `<button type="button" class="face" data-feel="${v}" data-ts="${esc(s.ts)}" aria-pressed="${s.feel === v}" aria-label="${v} su 5, ${FEEL_WORD[v]}">${FACES[v]}<span>${v}</span></button>`).join('');
  const tags = SESSION_TAGS.map((t) => `<button type="button" class="chipbtn" data-stag="${esc(t)}" data-ts="${esc(s.ts)}" aria-pressed="${s.tag === t}">${esc(t)}</button>`).join('');
  return `<div class="rate" aria-label="Voto dell'ultima uscita">
    <p class="rate-q">${tip('voto', 'Com\'era?')} <span class="muted">uscita di ${esc(when)}, ${hoursTxt(s.hours)}</span></p>
    <div class="faces" role="group" aria-label="Voto da 1 a 5">${faces}</div>
    <details class="more"><summary>Una parola (facoltativa)</summary><div class="chips" role="group" aria-label="Una parola">${tags}</div></details>
  </div>`;
}

function stockHtml(st, BY_ID) {
  const items = (st.stock || []).filter((x) => BY_ID[x.id]);
  const rows = items.map((x) => {
    const r = BY_ID[x.id];
    return `<li class="stock-item"><div>${nameBtn(r)}<span class="muted small"> · ${esc(SIZE_LABEL[x.size] || x.size)}${x.size === 'mezza' ? ' (metà di un ibrido)' : ' (una racchetta)'}</span></div>
      <div class="stepper" role="group" aria-label="Quantità di ${esc(fullName(r))} ${esc(x.size)}">
        <button type="button" class="btn sq" data-stock-dec="${esc(x.id)}" data-size="${esc(x.size)}" aria-label="Una in meno">−</button>
        <span class="n" aria-live="polite">${x.n}</span>
        <button type="button" class="btn sq" data-stock-inc="${esc(x.id)}" data-size="${esc(x.size)}" aria-label="Una in più">+</button></div></li>`;
  }).join('');
  return `<div class="section-head"><h2>${tip('scorta', 'In casa')}</h2></div>
    ${items.length ? `<ul class="stock">${rows}</ul>` : '<p class="muted">Nessuna corda in casa. Aggiungi le matassine e le mezze che hai: in «Prossima» le vedrai per prime.</p>'}
    <button type="button" class="btn" id="stock-add">+ Aggiungi una corda che hai</button>`;
}

export function renderToday(ctx) {
  const st = ctx.state(), r = ctx.equippedRec();
  const ss = lifeSessions(st), hours = equippedHours(st);
  const el = $('#oggi');
  el.innerHTML = `
    <div class="hero">
      <p class="eyebrow">Montata ora</p>
      <h2 class="hero-name">${nameBtn(r)}</h2>
      <p class="muted">${specLine(r)} · ${tip('tensione', `${NF(1).format(st.equipped.kg[0])}/${NF(1).format(st.equipped.kg[1])} kg`)} <button type="button" class="btn ghost" id="kg-fix" aria-controls="kg-form">Correggi</button></p>
      <div class="hours-form" id="kg-form" hidden>
        <label>Verticali (kg) <input id="kg-v" inputmode="decimal" size="5" value="${NF(1).format(st.equipped.kg[0])}"></label>
        <label>Orizzontali (kg) <input id="kg-h" inputmode="decimal" size="5" value="${NF(1).format(st.equipped.kg[1])}"></label>
        <button type="button" class="btn primary" id="kg-save">Salva</button>
        <p class="err" id="kg-err" role="alert" hidden>Tensioni tra 15 e 35 kg.</p>
      </div>
      <p class="hero-hours">${tip('ore', `<b class="num">${hoursTxt(hours)}</b>`)} su questa corda · ${ss.length} ${ss.length === 1 ? 'uscita' : 'uscite'}</p>
      <div class="actions"><button type="button" class="btn primary big" id="quick-add">+ Uscita ${fmtN(QUICK_HOURS, 1)} h</button>
        <button type="button" class="btn" id="other-hours" aria-expanded="false" aria-controls="hours-form">Altre ore</button></div>
      <div class="hours-form" id="hours-form" hidden>
        <label>Ore <input id="hours-input" inputmode="decimal" placeholder="1,5" size="5"></label>
        <label>Data <input type="date" id="hours-date" value="${todayIso()}"></label>
        <label class="grow">Nota <input id="hours-note" placeholder="facoltativa, es. torneo"></label>
        <button type="button" class="btn primary" id="hours-add">Aggiungi</button>
        <p class="err" id="hours-error" role="alert" hidden></p>
      </div>
      ${rateRow(ss[0])}
    </div>
    <section class="block">${stockHtml(st, ctx.BY_ID)}</section>
    <section class="block">
      <div class="section-head"><h2>Uscite</h2></div>
      ${ss.length ? `<ul class="sessions">${ss.slice(0, 5).map(sessionLi).join('')}</ul>` : '<p class="muted">Nessuna uscita su questa corda.</p>'}
      ${ss.length > 5 ? `<details class="more"><summary>Tutte le uscite su questa corda (${ss.length})</summary><ul class="sessions">${ss.slice(5).map(sessionLi).join('')}</ul></details>` : ''}
      ${historyHtml(st, ctx.BY_ID)}
      ${lastLifeLine(st, ctx.BY_ID)}
      <div class="actions"><button type="button" class="btn" id="change-btn">Cambia corda</button><button type="button" class="btn" id="past-add">Aggiungi una corda finita prima</button></div>
    </section>`;
}
const sessionLi = (s) => `<li><span>${esc(itDate(s.date))}</span><span>${hoursTxt(s.hours)}</span><span>${s.feel ? `${FACES[s.feel]} ${s.feel}/5` : '<span class="muted">senza voto</span>'}${s.tag ? ` · ${esc(s.tag)}` : ''}${s.note ? ` · ${esc(s.note)}` : ''}</span><button type="button" class="btn sq ghost" data-del-session="${esc(s.ts)}" aria-label="Togli l'uscita del ${esc(itDate(s.date))}">✕</button></li>`;

// ---------- dialogo per scegliere una corda (cambio corda e scorta) ----------
function pickList(ctx, q, selected) {
  const st = ctx.state();
  const stockIds = (st.stock || []).map((x) => x.id);
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const all = ctx.ALL.filter((r) => words.every((w) => fullName(r).toLowerCase().includes(w)));
  all.sort((a, b) => (stockIds.includes(b.id) - stockIds.includes(a.id)) || fullName(a).localeCompare(fullName(b)));
  return all.slice(0, 40).map((r) => `<li><button type="button" class="pick ${r.id === selected ? 'on' : ''}" data-pick="${esc(r.id)}" aria-pressed="${r.id === selected}">
    <span>${esc(fullName(r))}</span>${stockIds.includes(r.id) ? '<span class="tag ok">in casa</span>' : ''}${hasMeasures(r) ? '' : '<span class="tag">nessuna misura</span>'}</button></li>`).join('') || '<li class="muted">Nessuna corda trovata.</li>';
}

// mode: 'stock' (aggiungi in casa), 'change' (cambia corda), 'past' (corda finita prima dell'app)
function openPicker(ctx, { title, okLabel, mode, onOk }) {
  const dlg = $('#pick-dialog');
  const st = ctx.state();
  const withChange = mode === 'change';
  let selected = null, verdict = null, size = 'intera';
  $('#pk-title').textContent = title;
  $('#pk-ok').textContent = okLabel;
  $('#pk-q').value = '';
  $('#pk-change').hidden = !withChange;
  $('#pk-stock').hidden = mode !== 'stock';
  $('#pk-past').hidden = mode !== 'past';
  $('#pk-kg').hidden = mode === 'stock';
  $('#pk-kg-note').hidden = !withChange;
  $('#pk-err').hidden = true;
  $('#pk-kgv').value = NF(1).format(st.equipped.kg[0]); $('#pk-kgh').value = NF(1).format(st.equipped.kg[1]);
  if (withChange) {
    $('#pk-old').textContent = ctx.equippedRec().model;
    $('#pk-reason').value = 'consumata';
    $('#pk-date').value = todayIso();
    for (const b of dlg.querySelectorAll('[data-verdict]')) b.setAttribute('aria-pressed', 'false');
  }
  if (mode === 'past') { $('#pk-from').value = ''; $('#pk-to').value = ''; $('#pk-hours').value = ''; $('#pk-past-reason').value = 'consumata'; }
  for (const b of dlg.querySelectorAll('[data-size]')) b.setAttribute('aria-pressed', String(b.dataset.size === size));
  const draw = () => {
    $('#pk-list').innerHTML = pickList(ctx, $('#pk-q').value, selected);
    const inStock = (ctx.state().stock || []).filter((x) => x.id === selected);
    const st2 = ctx.state();
    const opts = [];
    if (inStock.some((x) => x.size === 'intera')) opts.push('<option value="intera">sì, una matassina</option>');
    if (inStock.some((x) => x.size === 'mezza' && x.n >= 2)) opts.push('<option value="due-mezze">sì, due mezze</option>');
    $('#pk-from-stock').hidden = !withChange || !selected || !canStringFull(st2, selected);
    $('#pk-from-stock-sel').innerHTML = opts.join('') + '<option value="">no</option>';
    $('#pk-half-only').hidden = !withChange || !inStock.length || canStringFull(st2, selected);
  };
  dlg.oninput = (e) => { if (e.target.id === 'pk-q') draw(); };
  dlg.onclick = (e) => {
    const p = e.target.closest('[data-pick]'); if (p) { selected = p.dataset.pick; draw(); return; }
    const v = e.target.closest('[data-verdict]'); if (v) { verdict = verdict === v.dataset.verdict ? null : v.dataset.verdict; for (const b of dlg.querySelectorAll('[data-verdict]')) b.setAttribute('aria-pressed', String(b.dataset.verdict === verdict)); return; }
    const z = e.target.closest('[data-size]'); if (z) { size = z.dataset.size; for (const b of dlg.querySelectorAll('[data-size]')) b.setAttribute('aria-pressed', String(b.dataset.size === size)); return; }
    if (e.target.closest('#pk-cancel')) { dlg.close(); return; }
    if (e.target.closest('#pk-ok')) {
      const err = (m) => { $('#pk-err').textContent = m; $('#pk-err').hidden = false; };
      if (!selected) { err('Scegli una corda dall\'elenco.'); return; }
      if (mode === 'stock') { onOk({ id: selected, size }); dlg.close(); return; }
      const kv = Number(String($('#pk-kgv').value).replace(',', '.')), kh = Number(String($('#pk-kgh').value).replace(',', '.'));
      if (![kv, kh].every((k) => Number.isFinite(k) && k >= 15 && k <= 35)) { err('Tensioni tra 15 e 35 kg.'); return; }
      if (withChange) {
        const d = $('#pk-date').value || todayIso();
        if (d < ctx.state().equipped.since.slice(0, 10)) { err('La data non può essere prima di quando hai montato la corda attuale.'); return; }
        const date = d === todayIso() ? new Date().toISOString() : `${d}T12:00:00.000Z`;
        onOk({ id: selected, kg: [kv, kh], reason: $('#pk-reason').value, verdict, date, fromStock: $('#pk-from-stock').hidden ? null : ($('#pk-from-stock-sel').value || null) });
      } else {
        const h = parseHours($('#pk-hours').value);
        const from = $('#pk-from').value, to = $('#pk-to').value;
        if (!from || !to || to < from) { err('Metti le due date (anche approssimate), la seconda dopo la prima.'); return; }
        if (!h.ok) { err(h.reason); return; }
        onOk({ id: selected, kg: [kv, kh], from, to, hours: h.value, reason: $('#pk-past-reason').value });
      }
      dlg.close();
    }
  };
  draw();
  dlg.showModal();
  $('#pk-q').focus();
}

export function initToday(ctx) {
  const root = $('#oggi');
  root.addEventListener('click', (e) => {
    const t = e.target;
    if (t.closest('#quick-add')) {
      const ts = `${Date.now()}-q`;
      ctx.update((s) => addSession(s, { date: todayIso(), hours: QUICK_HOURS, ts }));
      // annullare = togliere proprio questa uscita (mai rimettere una copia vecchia dello stato)
      ctx.toast(`Uscita di ${fmtN(QUICK_HOURS, 1)} h aggiunta. Com'era? Tocca una faccina.`, () => ctx.update((s) => removeSession(s, ts)));
      const f = $('#oggi .face'); if (f) f.focus();
      return;
    }
    if (t.closest('#other-hours')) { const f = $('#hours-form'); f.hidden = !f.hidden; t.closest('#other-hours').setAttribute('aria-expanded', String(!f.hidden)); if (!f.hidden) $('#hours-input').focus(); return; }
    if (t.closest('#hours-add')) {
      const h = parseHours($('#hours-input').value), date = $('#hours-date').value || todayIso();
      if (!h.ok) { $('#hours-error').textContent = h.reason; $('#hours-error').hidden = false; return; }
      const note = $('#hours-note').value.trim().slice(0, 200);
      ctx.update((s) => addSession(s, { date, hours: h.value, note, ts: `${Date.now()}-m` }));
      ctx.toast(`Uscita di ${hoursTxt(h.value)} aggiunta.`);
      return;
    }
    const fc = t.closest('[data-feel]');
    if (fc) { const v = Number(fc.dataset.feel), ts = fc.dataset.ts; ctx.update((s) => { const cur = s.sessions.find((x) => x.ts === ts); return rateSession(s, ts, { feel: cur && cur.feel === v ? null : v }); }); return; }
    const tg = t.closest('[data-stag]');
    if (tg) { const v = tg.dataset.stag, ts = tg.dataset.ts; ctx.update((s) => { const cur = s.sessions.find((x) => x.ts === ts); return rateSession(s, ts, { tag: cur && cur.tag === v ? null : v }); }); return; }
    const del = t.closest('[data-del-session]');
    if (del) {
      const gone = ctx.state().sessions.find((x) => x.ts === del.dataset.delSession);
      if (!gone) return;
      ctx.update((s) => removeSession(s, gone.ts));
      ctx.toast('Uscita tolta.', () => ctx.update((s) => restoreSession(s, gone)));
      return;
    }
    const inc = t.closest('[data-stock-inc]'); if (inc) { ctx.update((s) => addStock(s, inc.dataset.stockInc, inc.dataset.size)); return; }
    const dec = t.closest('[data-stock-dec]');
    if (dec) { const it = (ctx.state().stock || []).find((x) => x.id === dec.dataset.stockDec && x.size === dec.dataset.size); if (it) ctx.update((s) => setStockCount(s, it.id, it.size, it.n - 1)); return; }
    if (t.closest('#stock-add')) {
      openPicker(ctx, { title: 'Aggiungi una corda che hai', okLabel: 'Aggiungi', mode: 'stock',
        onOk: ({ id, size }) => { ctx.update((s) => addStock(s, id, size)); ctx.toast(`${fullName(ctx.BY_ID[id])} (${size}) aggiunta alle corde in casa.`); } });
      return;
    }
    if (t.closest('#change-btn')) { ctx.equip(null); return; }
    if (t.closest('#past-add')) {
      openPicker(ctx, { title: 'Aggiungi una corda finita prima', okLabel: 'Aggiungi', mode: 'past',
        onOk: (p) => {
          const n = ctx.state().lives.length;
          ctx.update((s) => addPastLife(s, { ...p, lid: String(Date.now()) }));
          ctx.toast(ctx.state().lives.length > n ? 'Corda passata aggiunta.' : 'Dati non validi: niente aggiunto.');
        } });
      return;
    }
    if (t.closest('#kg-fix')) { const f = $('#kg-form'); f.hidden = !f.hidden; if (!f.hidden) $('#kg-v').focus(); return; }
    if (t.closest('#kg-save')) {
      const kv = Number(String($('#kg-v').value).replace(',', '.')), kh = Number(String($('#kg-h').value).replace(',', '.'));
      if (![kv, kh].every((k) => Number.isFinite(k) && k >= 15 && k <= 35)) { $('#kg-err').hidden = false; return; }
      ctx.update((s) => setEquippedKg(s, [kv, kh]));
      ctx.toast('Tensione corretta.');
    }
  });
  ctx.onEquip = (preset) => {
    openPicker(ctx, { title: 'Cambia corda', okLabel: 'Monta', mode: 'change',
      onOk: ({ id, kg, reason, verdict, fromStock, date }) => {
        const before = ctx.state(), old = ctx.equippedRec(), ep = ctx.epoch();
        ctx.update((s) => {
          let n = verdict ? updateDiary(s, 'current', (d) => setVerdict(d, verdict)) : s;
          n = applyVerdict(n, s.equipped.id, verdict);
          return changeString(n, { id, kg, date, endReason: reason, fromStock });
        });
        const vtxt = verdict === 'si' ? ` La ${old.model} va tra le preferite.` : verdict === 'no' ? ` La ${old.model} va tra quelle che non ti piacciono.` : '';
        // il cambio corda tocca molte cose: si annulla solo se nel frattempo non è arrivato nulla dal server
        ctx.toast(`Montata ${fullName(ctx.BY_ID[id])}.${vtxt}`, ctx.loaded() ? () => { if (ctx.epoch() === ep) ctx.update(() => before); else ctx.toast('Non si può più annullare: sono arrivati dati da un altro dispositivo.'); } : null);
        ctx.goto('oggi');
      } });
    if (preset) { const b = $(`#pk-list [data-pick="${CSS.escape(preset)}"]`); if (b) b.click(); }
  };
}

