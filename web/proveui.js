// Schermata «Prove»: prossima prova con ore e durata, piano per finestre con i numeri calcolati, ordine in arrivo e bilancio
// delle mezze, schede di campo (scritte qui, salvate nel db, scaricabili nel formato di data/field_tests.json).
// Le schede sono dati tuoi: si mostrano accanto al laboratorio, mai fuse, mai nei consigli.
import { $, esc, NF, fullName, fmtN } from './format.js';
import { tip, mk, itDate } from './ui.js';
import { bedOf } from './phys.js';
import { FEEL_KEYS, FEEL_LABEL, DT_KEYS, DT_LABEL, NOTCH, NOTCH_WORD, FIELD_VERDICTS, FIELD_VERDICT_WORD, SNAP_WORD, saveField, removeField, dtSeries, hoursToAlert, fieldExport, planUsage, planStatus, nextPlanRow, hoursVsGuess, receiveOrder, orderReceived, planOfLife } from './prove.js';

const PV_ORIGIN = { casa: 'in casa', in_arrivo: 'in arrivo', da_comprare: 'da comprare' };
const PV_ORIGIN_CLS = { casa: 'ok', in_arrivo: 'est', da_comprare: 'warn' };
const PV_REL = { misurata: null, ricavata: 'ricavata', 'dalla fisica': 'modello' };
const PV_SURF = ['terra rossa coperta', 'terra rossa all\'aperto', 'cemento', 'sintetico', 'erba sintetica'];
const PV_RANK = ['misurata', 'ricavata', 'dalla fisica', 'mancante'];
const pvWorst = (a, b) => (PV_RANK.indexOf(a) > PV_RANK.indexOf(b) ? a : b);
const pvKg = (kg) => `${NF(1).format(kg[0])}/${NF(1).format(kg[1])} kg`;
const pvH = (h) => `${fmtN(h, 1)} h`;
const pvToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const pvPlan = (ctx) => ctx.DATA.plan || null;
const pvRow = (ctx, id) => ((pvPlan(ctx) || {}).rows || []).find((r) => r.id === id) || null;
const pvName = (ctx, id) => (ctx.BY_ID[id] ? fullName(ctx.BY_ID[id]) : id);
// Gli id delle corde nelle note della pipeline diventano nomi.
const pvIdsToNames = (ctx, txt) => String(txt || '').replace(/[a-z0-9]+(?:-[a-z0-9]+)+/g, (m) => (ctx.BY_ID[m] ? ctx.BY_ID[m].model : m));
const pvSetup = (ctx, row) => (row.kind === 'full' ? `${pvName(ctx, row.main)}, full bed` : `${pvName(ctx, row.main)} / ${pvName(ctx, row.cross)}`);
const pvNum = (v, d, rel, unit = '') => (v === null || v === undefined ? '<span class="nm">nessun valore</span>' : `${mk(PV_REL[rel] === undefined ? 'modello' : PV_REL[rel])}<b class="num${rel === 'misurata' ? '' : ' est'}">${rel === 'misurata' ? '' : '≈ '}${NF(d).format(v)}${unit}</b>`);

function pvUsageLine(ctx, row, st) {
  const u = planUsage(st, row.id);
  const guess = row.ore_ipotesi ? `${tip('oreipotesi', `ipotesi del piano ${row.ore_ipotesi[0]}–${row.ore_ipotesi[1]} h`)}` : '';
  if (!u.mounts) return `<p class="small">Non ancora montata${guess ? ` · ${guess}` : ''}.</p>`;
  const vs = hoursVsGuess(u.hours, row.ore_ipotesi, !u.current);
  return `<p class="pv-hours">${tip('oreprova', `<b class="num">${pvH(u.hours)}</b>`)} in ${u.sessions} ${u.sessions === 1 ? 'uscita' : 'uscite'} · ${u.days} ${u.days === 1 ? 'giorno' : 'giorni'}${u.mounts > 1 ? ` · montata ${u.mounts} volte` : ''}
    ${guess ? `<br><span class="small">${guess}${vs ? ` <span class="tag ${vs.cls}">${esc(vs.word)}</span>` : ''}</span>` : ''}</p>`;
}

function pvNumbers(ctx, row) {
  const cells = [
    ['Rigidità a 51 lb', pvNum(row.k51, 0, row.affidabilita), 'twu.stiffness'],
    [`Appena montata (${pvKg(row.kg_piano)})`, pvNum(row.k_now, 0, row.affidabilita), 'fisica'],
    ['Dopo il calo di tensione', pvNum(row.k_after, 0, pvWorst(row.affidabilita, row.loss_affidabilita)), 'twu.loss'],
    ['Spin', pvNum(row.spin, 1, row.spin_affidabilita), 'twu.spin'],
    ['Perdita di tensione', pvNum(row.loss, 0, row.loss_affidabilita, '%'), 'twu.loss'],
    ['Tenuta verticali / orizzontali', `<b>${esc(row.tenuta)}</b>`, 'tenuta'],
  ];
  return `<div class="mrow pv-nums">${cells.map(([l, v, k]) => `<div class="mcell"><span class="mlab">${tip(k, esc(l))}</span> <span class="num">${v}</span></div>`).join('')}</div>
    <p class="small muted">Rigidità in lb/in, letto pesato 16 verticali / 19 orizzontali. ${tip('fisica', 'Come si calcola')}</p>`;
}

function pvFieldLines(ctx, list) {
  if (!list.length) return '';
  return `<ul class="pv-flist">${list.map((t) => { const s = dtSeries(t.dt_log); const last = s[s.length - 1];
    return `<li>${t.date ? esc(itDate(t.date)) : 'senza data'}${t.verdict ? ` · ${esc(FIELD_VERDICT_WORD[t.verdict])}` : ''}${last ? ` · calo ${NF(1).format(last.loss)}% (${esc(last.key)})` : ''}${t.playability_hours !== undefined ? ` · giocabile ${pvH(t.playability_hours)}` : ''}${t.fid ? ` <button type="button" class="btn ghost" data-pv-edit="${esc(t.fid)}">Apri</button>` : ' <span class="tag">dal file</span>'}</li>`; }).join('')}</ul>`;
}

function pvRowHtml(ctx, row, st, open) {
  const status = planStatus(st, row);
  const fields = [...(st.fieldTests || []).filter((t) => t.plan === row.id), ...((pvPlan(ctx).field_file || []).filter((t) => t.mains === row.main && t.cross === row.cross))];
  const alias = [row.main, row.cross].filter((id, i, a) => a.indexOf(id) === i).map((id) => pvPlan(ctx).alias[id]).filter(Boolean);
  const scarto = row.kg_scarto && (Math.abs(row.kg_scarto[0]) >= 0.5 || Math.abs(row.kg_scarto[1]) >= 0.5);
  const origins = row.kind === 'full' ? `<span class="tag ${PV_ORIGIN_CLS[row.from[0]]}">${PV_ORIGIN[row.from[0]]}</span>`
    : `<span class="tag ${PV_ORIGIN_CLS[row.from[0]]}">vert. ${PV_ORIGIN[row.from[0]]}</span> <span class="tag ${PV_ORIGIN_CLS[row.from[1]]}">orizz. ${PV_ORIGIN[row.from[1]]}</span>`;
  return `<li><details class="sci pv-row" data-pv-row="${esc(row.id)}"${open ? ' open' : ''}>
    <summary><span class="pv-n">${row.prio}</span><span class="pv-sum"><b>${esc(pvSetup(ctx, row))}</b><br><span class="small">${pvKg(row.kg_piano)} · <span class="tag ${status.cls}">${esc(status.word)}</span>${status.usage.mounts ? ` · ${pvH(status.usage.hours)}` : ''}</span></span></summary>
    <p>${esc(row.goal || '')}</p>
    ${alias.length ? `<p class="small muted">Nel piano: ${alias.map(esc).join('; ')}.</p>` : ''}
    <p class="small">${origins}</p>
    ${pvUsageLine(ctx, row, st)}
    ${pvNumbers(ctx, row)}
    ${row.vs_montata.length ? `<p class="small"><b>Rispetto alla ${esc(ctx.BY_ID[(pvPlan(ctx).equipped || {}).id] ? ctx.BY_ID[pvPlan(ctx).equipped.id].model : 'montata')}:</b> ${esc(row.vs_montata.map((x) => x.split(': ')[1] ? `${x.split(': ')[0].toLowerCase()} ${x.split(': ')[1]}` : x).join(', '))}.</p>` : ''}
    <p class="small">${tip('kgpiano', 'Tensione')}: piano ${pvKg(row.kg_piano)}, calcolata ${row.kg_calcolati ? pvKg(row.kg_calcolati) : 'non calcolabile'}${scarto ? ' <span class="tag warn">differenza di almeno mezzo kg</span>' : ''}</p>
    ${row.avvisi.length ? `<p class="callout warn small">${row.avvisi.map((a) => esc(pvIdsToNames(ctx, a))).join('<br>')}</p>` : ''}
    ${fields.length ? `<h4>Schede di campo</h4>${pvFieldLines(ctx, fields)}` : ''}
    <div class="actions">${status.key === 'montata' ? '' : `<button type="button" class="btn" data-pv-mount="${esc(row.id)}">Monta questa prova</button>`}<button type="button" class="btn" data-pv-new="${esc(row.id)}">+ Scheda di campo</button>
      <button type="button" class="btn ghost" data-cmp-list="${esc([row.main, row.cross].filter((x, i, a) => a.indexOf(x) === i).join('|'))}">Confronta</button></div>
  </details></li>`;
}

function pvHero(ctx, rows, st) {
  const row = nextPlanRow(st, rows);
  const done = rows.filter((r) => planStatus(st, r).key === 'fatta').length;
  const cur = rows.find((r) => planStatus(st, r).key === 'montata');
  const bar = `<div class="pv-bar" role="img" aria-label="${done} prove fatte su ${rows.length}"><span style="width:${Math.round((done / rows.length) * 100)}%"></span></div>
    <p class="small muted">${done} fatte · ${cur ? '1 montata · ' : ''}${rows.length - done - (cur ? 1 : 0)} da fare, su ${rows.length} prove</p>`;
  if (!row) return `<div class="hero"><p class="eyebrow">${tip('piano', 'Piano di prove')}</p><h2 class="hero-name">Tutte le prove fatte</h2>${bar}</div>`;
  const current = planStatus(st, row).key === 'montata';
  return `<div class="hero">
    <p class="eyebrow">${current ? 'Prova in corso' : 'Prossima prova'} · n° ${row.prio} · ${esc(pvPlan(ctx).windows[row.window] || row.window)}</p>
    <h2 class="hero-name">${esc(pvSetup(ctx, row))}</h2>
    <p class="muted">${pvKg(row.kg_piano)} · ${esc(row.goal || '')}</p>
    ${pvUsageLine(ctx, row, st)}
    <div class="actions">${current ? `<button type="button" class="btn primary" data-pv-new="${esc(row.id)}">+ Scheda di campo</button><button type="button" class="btn" data-goto="oggi">+ Uscita in «Oggi»</button>`
      : `<button type="button" class="btn primary" data-pv-mount="${esc(row.id)}">Monta questa prova</button>`}
      <button type="button" class="btn ghost" data-pv-show="${esc(row.id)}">I numeri</button></div>
    ${bar}
  </div>`;
}

function pvIncoming(ctx, st) {
  const P = pvPlan(ctx), inc = P.incoming, b = P.budget;
  if (!inc) return '';
  const got = orderReceived(st, inc.key);
  const toBuy = Object.entries(b.to_buy || {});
  const left = b.rows.filter((r) => r.stock_left > 0);
  return `<section class="block"><div class="section-head"><h2>In arrivo</h2><span class="tag ${got ? 'ok' : 'est'}">${got ? 'arrivato, già in casa' : inc.status === 'ordinato' ? `ordinato, atteso il ${esc(itDate(inc.expected))}` : esc(inc.status || '')}</span></div>
    <ul class="pv-bags">${inc.bags.map((x) => `<li><b>${esc(x.name)}</b>${x.n > 1 ? ` ×${x.n}` : ''}<br><span class="small">${x.main === x.cross ? `${esc(pvName(ctx, x.main))} in tutti e due i lati` : `${esc(pvName(ctx, x.main))} / ${esc(pvName(ctx, x.cross))}`}</span></li>`).join('')}</ul>
    <h3>${tip('bilancio', 'Bilancio delle mezze')}</h3>
    <p>${b.cart_halves} mezze in arrivo, il piano ne usa ${b.cart_halves_used}${b.cart_halves_left ? `, ne avanzano ${b.cart_halves_left}` : ': non ne avanza nessuna'}.</p>
    ${toBuy.length ? `<p class="callout warn small">Da procurarsi: ${toBuy.map(([id, q]) => `${esc(pvName(ctx, id))}, ${q.mezze} mezze (${q.matassine} ${q.matassine === 1 ? 'matassina' : 'matassine'})`).join('; ')}.</p>` : ''}
    ${b.short.length ? `<p class="callout warn small">Mancano: ${b.short.map((x) => esc(pvIdsToNames(ctx, x))).join('; ')}.</p>` : ''}
    ${left.length ? `<p class="small">Dopo il piano restano in casa: ${left.map((r) => `${esc(pvName(ctx, r.id))} ${r.stock_left} ${r.stock_left === 1 ? 'mezza' : 'mezze'}`).join(', ')}.</p>` : ''}
    ${got ? '' : `<div class="actions"><button type="button" class="btn" id="pv-arrived">È arrivato: metti le ${b.cart_halves} mezze in casa</button></div>`}
  </section>`;
}

function pvLabLoss(ctx, t) {
  const row = ((pvPlan(ctx) || {}).rows || []).find((r) => r.id === t.plan) || ((pvPlan(ctx) || {}).rows || []).find((r) => r.main === t.mains && r.cross === t.cross);
  if (row && row.loss !== null) return { v: row.loss, rel: row.loss_affidabilita };
  const V = ctx.BY_ID[t.mains], O = ctx.BY_ID[t.cross];
  const b = V && O ? bedOf(V, O, t.tension_kg) : null;
  return b && b.loss ? { v: b.loss.v, rel: b.loss.est === null ? 'misurata' : b.loss.est === 'modello' ? 'dalla fisica' : 'ricavata' } : null;
}

function pvFieldCard(ctx, t, fromFile) {
  const P = pvPlan(ctx), series = fromFile ? (t.dt || []).map((x) => ({ ...x, loss: x.loss_pct })) : dtSeries(t.dt_log);
  const alert = fromFile ? t.ore_alla_soglia : hoursToAlert(series, P.alert_pct);
  const row = t.plan ? pvRow(ctx, t.plan) : P.rows.find((r) => r.main === t.mains && r.cross === t.cross);
  const lab = fromFile ? (t.laboratorio ? { v: t.laboratorio.twu_o_ricavata_loss_pct, rel: t.laboratorio.tipo === 'misura TWU' ? 'misurata' : 'ricavata' } : null) : pvLabLoss(ctx, t);
  const feel = fromFile ? t.feel || {} : t.feel_1_5 || {};
  const kg = fromFile ? t.kg : t.tension_kg, mains = t.mains, cross = t.cross;
  const snap = fromFile ? t.snapback_8h : t.snapback_check_8h, notch = fromFile ? t.notching_8h : t.notching_8h;
  const hours = fromFile ? t.ore_giocabili : t.playability_hours;
  const guess = row ? row.ore_ipotesi : fromFile ? t.ore_ipotesi_piano : null;
  const usage = t.plan ? planUsage(ctx.state(), t.plan) : null;
  return `<li class="cand pv-card">
    <h3>${esc(mains === cross ? `${pvName(ctx, mains)}, full bed` : `${pvName(ctx, mains)} / ${pvName(ctx, cross)}`)} ${fromFile ? '<span class="tag">dal file</span>' : ''}${t.verdict ? ` <span class="tag ${t.verdict === 'liked' ? 'ok' : t.verdict === 'disliked' ? 'warn' : ''}">${esc(FIELD_VERDICT_WORD[t.verdict])}</span>` : ''}</h3>
    <p class="small muted">${t.date ? esc(itDate(t.date)) : 'senza data'} · ${pvKg(kg)}${row ? ` · prova n° ${row.prio}` : ''}${(fromFile ? t.temp_c : t.court_temp_c) !== undefined && (fromFile ? t.temp_c : t.court_temp_c) !== null ? ` · ${fmtN(fromFile ? t.temp_c : t.court_temp_c, 1)} °C` : ''}${t.surface ? ` · ${esc(t.surface)}` : ''}</p>
    ${series.length ? `<dl class="pv-dt">${series.map((s) => `<dt>${esc(DT_LABEL[s.key] || s.key)}</dt><dd><span class="num">${fmtN(s.dt, 1)}</span> <span class="small">calo ${NF(1).format(s.loss)}%</span></dd>`).join('')}</dl>
      <p class="small">${tip('soglia', `Soglia del ${fmtN(P.alert_pct, 0)}%`)}: ${alert !== null && alert !== undefined ? `superata dopo circa ${pvH(alert)} di gioco` : 'non superata nelle misure registrate'}.</p>` : `<p class="small muted">${tip('dt', 'Tensione dinamica')}: nessuna misura.</p>`}
    ${lab ? `<p class="small">Accanto, non fusa: perdita di laboratorio del letto ${mk(PV_REL[lab.rel] === undefined ? 'modello' : PV_REL[lab.rel])}${lab.rel === 'misurata' ? '' : '≈ '}${NF(0).format(lab.v)}% ${tip('twu.loss', 'ⓘ', null, 'Cos\'è la perdita di laboratorio')} (prova a impatti ripetuti, non ore di gioco).</p>` : ''}
    ${Object.keys(feel).length ? `<ul class="pv-feel">${FEEL_KEYS.filter((k) => feel[k]).map((k) => `<li><span>${esc(FEEL_LABEL[k])}</span><span class="num">${feel[k]}/5</span></li>`).join('')}</ul>` : ''}
    ${snap || notch ? `<p class="small">${snap ? `Scatto delle verticali a 8 h: ${esc(SNAP_WORD[snap])}. ` : ''}${notch ? `Intaglio a 8 h: ${esc(NOTCH_WORD[notch])}.` : ''}</p>` : ''}
    ${hours !== undefined && hours !== null ? `<p class="small">Giocabile per ${pvH(hours)}${guess ? ` (ipotesi del piano ${guess[0]}–${guess[1]} h)` : ''}.</p>` : ''}
    ${usage && usage.mounts ? `<p class="small">Uscite registrate nella prova: ${pvH(usage.hours)} in ${usage.sessions} ${usage.sessions === 1 ? 'uscita' : 'uscite'}.</p>` : ''}
    ${t.note ? `<p class="small">${esc(t.note)}</p>` : ''}
    ${fromFile ? '' : `<div class="actions"><button type="button" class="btn" data-pv-edit="${esc(t.fid)}">Aggiorna</button><button type="button" class="btn ghost" data-pv-del="${esc(t.fid)}">Togli</button></div>`}
  </li>`;
}

function pvFields(ctx, st) {
  const P = pvPlan(ctx), mine = [...(st.fieldTests || [])].sort((a, b) => ((b.date || '') < (a.date || '') ? -1 : 1));
  return `<section class="block"><div class="section-head"><h2>${tip('scheda', 'Schede di campo')}</h2><span class="muted small">dati tuoi, mai nei consigli</span></div>
    <div class="actions"><button type="button" class="btn primary" data-pv-new="">+ Nuova scheda</button>${ctx.downloads && mine.length ? '<button type="button" class="btn" id="pv-export">Scarica le schede (JSON)</button>' : ''}</div>
    <ul class="pv-cards">${mine.map((t) => pvFieldCard(ctx, t, false)).join('')}${(P.field_file || []).map((t) => pvFieldCard(ctx, t, true)).join('')}</ul>
    ${!mine.length && !(P.field_file || []).length ? '<p class="muted">Nessuna scheda. Montata una prova, misura la tensione dinamica appena montata e dopo 24 ore, poi a 4, 8 e 12 ore di gioco.</p>' : ''}
  </section>`;
}

export function renderProve(ctx) {
  const el = $('#prove');
  if (!el) return;
  const P = pvPlan(ctx);
  if (!P || !P.rows || !P.rows.length) { el.innerHTML = '<p class="muted">Nessun piano di prove nei dati.</p>'; return; }
  const st = ctx.state(), openIds = new Set([...el.querySelectorAll('details[open][data-pv-row]')].map((d) => d.dataset.pvRow));
  const groups = [];
  for (const r of P.rows) { const w = P.windows[r.window] || r.window; const g = groups.find((x) => x.w === w); if (g) g.rows.push(r); else groups.push({ w, rows: [r] }); }
  el.innerHTML = `${pvHero(ctx, P.rows, st)}
    <section class="block"><div class="section-head"><h2>${tip('piano', 'Il piano')}</h2><span class="muted small">${P.rows.filter((r) => r.kind === 'full').length} full bed · ${P.rows.filter((r) => r.kind === 'hybrid').length} ibridi</span></div>
      ${groups.map((g) => `<h3 class="pv-w">${esc(g.w)}</h3><ul class="pv-list">${g.rows.map((r) => pvRowHtml(ctx, r, st, openIds.has(r.id))).join('')}</ul>`).join('')}
      <p class="small muted">${mk(null)} misurata · ${mk('ricavata')} ricavata da altri dati · ${mk('modello')} ricavata dalla fisica</p>
    </section>
    ${pvIncoming(ctx, st)}
    ${pvFields(ctx, st)}
    <details class="block more"><summary>Regole del piano e panchina</summary>
      <ul class="why">${P.regole.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      <p class="small muted">${esc(P.regole_nota)}</p>
      ${P.panchina.length ? `<h4>In panchina</h4><ul class="why">${P.panchina.map((x) => `<li>${esc(pvName(ctx, x.id))}, ${pvKg(x.kg_piano)}: ${esc(x.note)}</li>`).join('')}</ul>` : ''}
    </details>`;
}

// ---------- modulo della scheda ----------
let pvEditing = null; // { fid, plan, mains, cross, ... } in modifica
function pvChips(name, values, words, cur) {
  return `<div class="chips" role="group" data-pv-chips="${name}">${values.map((v) => `<button type="button" class="chipbtn" data-pv-val="${esc(String(v))}" aria-pressed="${String(cur) === String(v)}">${esc(words[v] ?? String(v))}</button>`).join('')}</div>`;
}
function pvFormHtml(ctx, t) {
  const P = pvPlan(ctx), dt = t.dt_log || {}, feel = t.feel_1_5 || {};
  const num = (v) => (v === undefined || v === null ? '' : NF(1).format(v).replace(/\./g, ''));
  const opts = P.rows.map((r) => `<option value="${esc(r.id)}"${t.plan === r.id ? ' selected' : ''}>${r.prio}. ${esc(pvSetup(ctx, r))}</option>`).join('');
  return `<label>Prova <select id="pvf-plan"><option value="">Corda montata ora (fuori dal piano)</option>${opts}</select></label>
    <p class="small muted" id="pvf-setup">${esc(t.mains === t.cross ? `${pvName(ctx, t.mains)}, full bed` : `${pvName(ctx, t.mains)} / ${pvName(ctx, t.cross)}`)}</p>
    <div class="row"><label>Data <input type="date" id="pvf-date" value="${esc(t.date || pvToday())}"></label><label>Temperatura (°C) <input id="pvf-temp" inputmode="decimal" value="${num(t.court_temp_c)}"></label></div>
    <div class="row"><label>Verticali (kg) <input id="pvf-kgv" inputmode="decimal" value="${num(t.tension_kg[0])}"></label><label>Orizzontali (kg) <input id="pvf-kgh" inputmode="decimal" value="${num(t.tension_kg[1])}"></label></div>
    <label>Superficie <select id="pvf-surf"><option value="">—</option>${PV_SURF.map((s) => `<option${t.surface === s ? ' selected' : ''}>${esc(s)}</option>`).join('')}</select></label>
    <h3>${tip('dt', 'Tensione dinamica')}</h3>
    <p class="small muted">Il numero dello strumento; basta la stessa unità ogni volta. Si compila un po' alla volta.</p>
    <div class="pv-dtform">${DT_KEYS.map((k) => `<label>${esc(DT_LABEL[k])} <input id="pvf-dt-${k}" inputmode="decimal" value="${num(dt[k])}"></label>`).join('')}</div>
    <h3>Voti da 1 a 5</h3>
    ${FEEL_KEYS.map((k) => `<p class="small"><b>${esc(FEEL_LABEL[k])}</b><br><span class="muted">${esc(pvFeelHelp(P, k))}</span></p>${pvChips(`feel-${k}`, [1, 2, 3, 4, 5], {}, feel[k])}`).join('')}
    <h3>A 8 ore di gioco</h3>
    <p class="small">Scatto delle verticali (sposta la verticale centrale col pollice)</p>${pvChips('snap', [3, 2, 1], SNAP_WORD, t.snapback_check_8h)}
    <p class="small">Intaglio agli incroci (in controluce)</p>${pvChips('notch', NOTCH, NOTCH_WORD, t.notching_8h)}
    <label>Ore giocabili (prima di perdere controllo o comfort) <input id="pvf-hours" inputmode="decimal" value="${num(t.playability_hours)}"></label>
    <p class="small">Com'è andata?</p>${pvChips('verdict', FIELD_VERDICTS, FIELD_VERDICT_WORD, t.verdict)}
    <label>Nota <textarea id="pvf-note" rows="2" maxlength="500">${esc(t.note || '')}</textarea></label>`;
}
// Gli aiuti dei voti arrivano dalla pipeline (FEEL_HELP); qui solo le parole visibili, senza gergo.
function pvFeelHelp(P, k) { return String((P.feel_help || {})[k] || '').replace(/launchy/gi, 'troppo alta').replace(/\(\s*troppo alta\s*\)/, ''); }

function pvDefaults(ctx, planId) {
  const st = ctx.state(), row = planId ? pvRow(ctx, planId) : null;
  if (row) return { plan: row.id, setup_id: row.id, mains: row.main, cross: row.cross, tension_kg: [...row.kg_piano] };
  const linked = planOfLife(st, st.equipped.since), lr = linked ? pvRow(ctx, linked) : null;
  if (lr) return { plan: lr.id, setup_id: lr.id, mains: lr.main, cross: lr.cross, tension_kg: [...st.equipped.kg] };
  return { setup_id: `${st.equipped.id}-fb`, mains: st.equipped.id, cross: st.equipped.id, tension_kg: [...st.equipped.kg] };
}

function pvOpenForm(ctx, t) {
  pvEditing = { ...t };
  $('#pvf-title').textContent = t.fid && (ctx.state().fieldTests || []).some((x) => x.fid === t.fid) ? 'Aggiorna la scheda' : 'Nuova scheda di campo';
  $('#pvf-body').innerHTML = pvFormHtml(ctx, pvEditing);
  $('#pvf-err').hidden = true;
  const d = $('#field-dialog');
  if (!d.open) d.showModal();
  d.querySelector('.dlg-body').scrollTop = 0;
}

const pvParse = (v) => { const s = String(v || '').trim().replace(',', '.'); if (!s) return undefined; const n = Number(s); return Number.isFinite(n) ? n : NaN; };
function pvCollect(ctx) {
  const t = { ...pvEditing }, err = [];
  const kv = pvParse($('#pvf-kgv').value), kh = pvParse($('#pvf-kgh').value);
  if (![kv, kh].every((k) => Number.isFinite(k) && k >= 15 && k <= 35)) err.push('Tensioni tra 15 e 35 kg.');
  t.tension_kg = [kv, kh];
  t.date = $('#pvf-date').value || undefined;
  const temp = pvParse($('#pvf-temp').value);
  if (Number.isNaN(temp)) err.push('Temperatura: scrivi un numero.'); else t.court_temp_c = temp;
  t.surface = $('#pvf-surf').value || undefined;
  const dt = {};
  for (const k of DT_KEYS) { const v = pvParse($(`#pvf-dt-${k}`).value); if (Number.isNaN(v) || (v !== undefined && v <= 0)) err.push(`Tensione dinamica ${DT_LABEL[k]}: un numero maggiore di 0.`); else if (v !== undefined) dt[k] = v; }
  if (Object.keys(dt).some((k) => k !== '0h') && dt['0h'] === undefined) err.push('Per il calo serve la misura appena montata (0 h).');
  t.dt_log = dt;
  const h = pvParse($('#pvf-hours').value);
  if (Number.isNaN(h) || (h !== undefined && (h < 0 || h > 200))) err.push('Ore giocabili: un numero tra 0 e 200.'); else t.playability_hours = h;
  t.note = $('#pvf-note').value;
  return { t, err };
}

export function initProve(ctx) {
  const root = $('#prove'), dlg = $('#field-dialog');
  if (!root || !dlg) return;
  const known = new Set(ctx.ALL.map((r) => r.id));
  root.addEventListener('click', async (e) => {
    const t = e.target;
    const m = t.closest('[data-pv-mount]'); if (m) { const row = pvRow(ctx, m.dataset.pvMount); if (row) ctx.mountPlan(row); return; }
    const n = t.closest('[data-pv-new]'); if (n) { pvOpenForm(ctx, { fid: `${Date.now()}`, ...pvDefaults(ctx, n.dataset.pvNew || null) }); return; }
    const ed = t.closest('[data-pv-edit]'); if (ed) { const x = (ctx.state().fieldTests || []).find((y) => y.fid === ed.dataset.pvEdit); if (x) pvOpenForm(ctx, x); return; }
    const del = t.closest('[data-pv-del]');
    if (del) {
      const gone = (ctx.state().fieldTests || []).find((y) => y.fid === del.dataset.pvDel); if (!gone) return;
      ctx.update((s) => removeField(s, gone.fid));
      ctx.toast('Scheda tolta.', () => ctx.update((s) => saveField(s, gone, known)));
      return;
    }
    const sh = t.closest('[data-pv-show]'); if (sh) { const d = root.querySelector(`[data-pv-row="${CSS.escape(sh.dataset.pvShow)}"]`); if (d) { d.open = true; d.scrollIntoView({ block: 'start' }); d.querySelector('summary').focus(); } return; }
    if (t.closest('#pv-arrived')) {
      const inc = pvPlan(ctx).incoming, ep = ctx.epoch(), before = ctx.state();
      ctx.update((s) => receiveOrder(s, inc));
      ctx.toast(`${pvPlan(ctx).budget.cart_halves} mezze aggiunte alle corde in casa.`, () => { if (ctx.epoch() === ep) ctx.update(() => before); });
      return;
    }
    if (t.closest('#pv-export')) {
      try { await ctx.downloads.save({ filename: 'field_tests-dalla-pagina.json', data: JSON.stringify(fieldExport(ctx.state().fieldTests), null, 2) }); } catch { /* rifiutato */ }
    }
  });
  dlg.addEventListener('change', (e) => {
    if (e.target.id !== 'pvf-plan') return;
    const d = pvDefaults(ctx, e.target.value || null);
    pvEditing = { ...pvEditing, ...d, ...(e.target.value ? {} : { plan: undefined }) };
    if (!e.target.value) delete pvEditing.plan;
    $('#pvf-setup').textContent = d.mains === d.cross ? `${pvName(ctx, d.mains)}, full bed` : `${pvName(ctx, d.mains)} / ${pvName(ctx, d.cross)}`;
    $('#pvf-kgv').value = NF(1).format(d.tension_kg[0]); $('#pvf-kgh').value = NF(1).format(d.tension_kg[1]);
  });
  dlg.addEventListener('click', (e) => {
    const c = e.target.closest('[data-pv-val]');
    if (c) {
      const g = c.closest('[data-pv-chips]').dataset.pvChips, raw = c.dataset.pvVal, on = c.getAttribute('aria-pressed') !== 'true';
      const val = /^\d+$/.test(raw) ? Number(raw) : raw;
      if (g.startsWith('feel-')) { const k = g.slice(5); pvEditing.feel_1_5 = { ...(pvEditing.feel_1_5 || {}) }; if (on) pvEditing.feel_1_5[k] = val; else delete pvEditing.feel_1_5[k]; }
      const key = { snap: 'snapback_check_8h', notch: 'notching_8h', verdict: 'verdict' }[g];
      if (key) { if (on) pvEditing[key] = val; else delete pvEditing[key]; }
      for (const b of c.parentElement.querySelectorAll('[data-pv-val]')) b.setAttribute('aria-pressed', String(on && b === c));
      return;
    }
    if (e.target.closest('#pvf-cancel') || e.target === dlg) { dlg.close(); return; }
    if (e.target.closest('#pvf-save')) {
      const { t, err } = pvCollect(ctx);
      if (err.length) { $('#pvf-err').textContent = err.join(' '); $('#pvf-err').hidden = false; return; }
      const isNew = !(ctx.state().fieldTests || []).some((x) => x.fid === t.fid);
      ctx.update((s) => saveField(s, t, known));
      dlg.close();
      ctx.toast(isNew ? 'Scheda salvata.' : 'Scheda aggiornata.');
    }
  });
}
