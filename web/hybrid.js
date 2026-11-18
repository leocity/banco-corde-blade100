// Ibridi, semplificata (design v6 §6.2, §12.5): verticali + orizzontali, letto pesato 16/19 solo nella stessa fonte,
// confronto con la montata solo nella stessa fonte. Niente verdetti «controllo», niente soglie inventate, niente prezzi.
import { $, esc, NF, fullName } from './format.js';
import { valueOf } from './cmp.js';
import { bedOf, compareBeds, physSummary, physPhrase, diffTxt } from './phys.js';
import { tip, fmtV, infoTip, mk } from './ui.js';

const HY_KEY = 'banco-corde:ibrido';
const HY_KG = Array.from({ length: 25 }, (_, i) => 18 + i * 0.5);
const hyOkKg = (k) => typeof k === 'number' && HY_KG.includes(k);
// Idee da provare: giudizio del progetto (fiducia dichiarata), non calcoli. Recuperate dalla scheda online del 17/11/2026.
export const HY_IDEAS = [
  { k: 'A', v: 'toroline-o-toro-tour-17', o: 'toroline-o-toro-17', kv: 23, ko: 22, conf: 'alta', why: 'Verticale più rigida (TWU: 217 contro 166 lb/in) e che perde meno tensione (25% contro 44%); O-Toro in orizzontale.' },
  { k: 'B', v: 'toroline-o-toro-tour-17', o: 'toroline-o-toro-snap-16l', kv: 23, ko: 22, conf: 'media', why: 'Come A con un\'orizzontale tonda (il set «Dreddy» di Toroline). Il dato TWU della Snap è in dubbio: va provato.' },
  { k: 'C', v: 'solinco-confidential-16l', o: 'toroline-o-toro-17', kv: 23, ko: 22, conf: 'bassa', why: 'Confidential 1,25 in verticale, O-Toro in orizzontale. La 1,25 non è misurata da TWU: che tenga bene la tensione lo si sa solo dal calibro 1,30 (stima, non usata nei calcoli).' },
  { k: 'F', v: 'toroline-caviar-17l', o: 'toroline-o-toro-snap-16l', kv: 23, ko: 22, conf: 'media', why: 'Caviar 1,24 è tra le Toroline più rigide a riposo (Racketpedia 1,00 kg/mm).' },
  { k: 'G', v: 'toroline-o-toro-tour-17', o: 'toroline-o-toro-17', kv: 22.5, ko: 21.5, conf: 'bassa', why: 'Come A ma senza alzare i kg: cambia una cosa sola (la corda verticale).' },
];
const hyMean = (a, b) => (16 * a + 19 * b) / 35;

function hyLoad(ctx) {
  const eq = ctx.state().equipped;
  let s = { v: eq.id, o: eq.id, kv: eq.kg[0], ko: eq.kg[1] };
  try {
    const x = JSON.parse(localStorage.getItem(HY_KEY) || 'null');
    if (x && ctx.BY_ID[x.v] && ctx.BY_ID[x.o]) s = { ...s, v: x.v, o: x.o, ...(hyOkKg(x.kv) ? { kv: x.kv } : {}), ...(hyOkKg(x.ko) ? { ko: x.ko } : {}) };
  } catch { /* nessun archivio */ }
  if (!hyOkKg(s.kv)) s.kv = 22; if (!hyOkKg(s.ko)) s.ko = 21;
  return s;
}
const hySave = (s) => { try { localStorage.setItem(HY_KEY, JSON.stringify({ v: s.v, o: s.o, kv: s.kv, ko: s.ko })); } catch { /* nessun archivio */ } };

function hyOptions(ctx, sel) {
  const st = ctx.state();
  const half = (st.stock || []).filter((x) => ctx.BY_ID[x.id]);
  const opt = (r) => `<option value="${esc(r.id)}"${r.id === sel ? ' selected' : ''}>${esc(fullName(r))}</option>`;
  const groups = {};
  for (const r of ctx.ALL) (groups[r.brand] ||= []).push(r);
  let h = '';
  if (half.length) h += `<optgroup label="In casa">${[...new Set(half.map((x) => x.id))].map((id) => opt(ctx.BY_ID[id])).join('')}</optgroup>`;
  h += `<optgroup label="Montata">${opt(ctx.equippedRec())}</optgroup>`;
  for (const b of Object.keys(groups).sort()) h += `<optgroup label="${esc(b)}">${groups[b].sort((a, c) => fullName(a).localeCompare(fullName(c))).map(opt).join('')}</optgroup>`;
  return h;
}

// Valori di una corda per il costruttore: misurati o ricavati, con il segno del tipo.
const hyVal = (r, key) => { const v = valueOf(r, key); return v ? `${mk(v.est)}${esc(fmtV(key, v.v))}` : '<span class="nm">nessun valore</span>'; };

export function renderHybrid(ctx) {
  const box = $('#hybrid');
  if (!box) return;
  const s = hyLoad(ctx), V = ctx.BY_ID[s.v], O = ctx.BY_ID[s.o], ref = ctx.equippedRec();
  const kgSel = (id, val) => `<select id="${id}">${HY_KG.map((k) => `<option value="${k}"${k === val ? ' selected' : ''}>${NF(1).format(k)} kg</option>`).join('')}</select>`;
  const bed = bedOf(V, O, [s.kv, s.ko]), refBed = bedOf(ref, ref, ctx.state().equipped.kg);
  const rows = compareBeds(bed, refBed);
  const warnRole = (() => { const kv = valueOf(V, 'twu.stiffness'), ko = valueOf(O, 'twu.stiffness'); return kv && ko && kv.v < ko.v * 0.9 ? '<p class="callout warn small">La verticale è più morbida dell\'orizzontale: di solito si fa il contrario, la verticale dà rigidità e morso e l\'orizzontale lascia scorrere. Prova a invertirle.</p>' : ''; })();
  const values = `<div class="mtable">${[['Verticali', V], ['Orizzontali', O]].map(([lab, r]) => `<div class="mrow"><div class="mname"><b>${lab}</b> <button type="button" class="linkish" data-open="${esc(r.id)}">${esc(fullName(r))}</button></div>
    ${[['twu.stiffness', 'Rigidità in campo'], ['twu.loss', 'Perdita di tensione'], ['twu.spin', 'Spin']].map(([k, l]) => `<div class="mcell"><span class="mlab">${l}</span> <span class="num">${hyVal(r, k)}</span></div>`).join('')}</div>`).join('')}</div>`;
  const table = rows.length ? `<p class="summary">${esc(physSummary(rows, ref.model))} ${tip('letto', 'ⓘ', null, 'Come si calcola un ibrido')}</p>
    <ul class="cmp-rows">${rows.map((r) => `<li><p class="cmp-q">${tip(r.tip, esc(r.label))}</p><p class="cmp-w lvl-${r.level === 'simile' ? 'same' : r.level === 'nettamente' ? 'big' : 'some'}">${r.dir ? esc(physPhrase(r)) : 'simile'} <span class="muted small">(${esc(diffTxt(r))})</span></p><p class="small">${esc(r.why)}</p></li>`).join('')}</ul>` : '<p class="muted">Per queste due corde non c\'è nessun valore di rigidità, perdita o spin.</p>';
  const kgNote = `Tensione media del letto ${NF(1).format(hyMean(s.kv, s.ko))} kg contro ${NF(1).format(hyMean(...ctx.state().equipped.kg))} kg della montata.`;
  box.innerHTML = `<div class="hy-form">
      <label>Verticali (16) <select id="hy-v">${hyOptions(ctx, s.v)}</select></label><label>kg ${kgSel('hy-kv', s.kv)}</label>
      <label>Orizzontali (19) <select id="hy-o">${hyOptions(ctx, s.o)}</select></label><label>kg ${kgSel('hy-ko', s.ko)}</label>
    </div>
    ${warnRole}${values}${table}
    <p class="small">${esc(kgNote)} ${tip('tensione', 'Quanto conta un kg?')}</p>
    <details class="more"><summary>Idee da provare (non calcolate)</summary>
      <p class="small muted">Idee del progetto, con la fiducia che gli diamo noi: non sono consigli calcolati.</p>
      <ul class="ideas">${HY_IDEAS.filter((x) => ctx.BY_ID[x.v] && ctx.BY_ID[x.o]).map((x) => `<li><b>${esc(x.k)}</b> · ${esc(ctx.BY_ID[x.v].model)} in verticale, ${esc(ctx.BY_ID[x.o].model)} in orizzontale, ${NF(1).format(x.kv)}/${NF(1).format(x.ko)} kg <span class="tag">fiducia ${esc(x.conf)}</span><br><span class="small">${esc(x.why)}</span>${/lb\/in/.test(x.why) ? ` ${infoTip('twu.stiffness', 'Cos\'è la rigidità in gioco')}` : ''}${/kg\/mm/.test(x.why) ? ` ${infoTip('rp.kgmm', 'Cos\'è la rigidità a riposo')}` : ''}<br><button type="button" class="btn" data-hy-load="${esc(x.k)}">Prova questa</button></li>`).join('')}</ul>
    </details>`;
}

export function initHybrid(ctx) {
  const box = $('#hybrid');
  if (!box) return;
  box.addEventListener('change', (e) => {
    const s = hyLoad(ctx);
    if (e.target.id === 'hy-v') s.v = e.target.value;
    if (e.target.id === 'hy-o') s.o = e.target.value;
    if (e.target.id === 'hy-kv') s.kv = Number(e.target.value);
    if (e.target.id === 'hy-ko') s.ko = Number(e.target.value);
    hySave(s); renderHybrid(ctx);
    const el = $(`#${e.target.id}`); if (el) el.focus();
  });
  // «Apri nel costruttore» dagli ibridi consigliati
  document.addEventListener('click', (e) => {
    const h = e.target.closest('[data-hy-set]'); if (!h) return;
    const [v, o] = h.dataset.hySet.split('|');
    const kg = ctx.state().equipped.kg;
    hySave({ v, o, kv: kg[0], ko: kg[1] });
    const d = $('#hy-box'); if (d) d.open = true;
    renderHybrid(ctx);
    $('#hy-box').scrollIntoView({ block: 'start' });
    $('#hy-v').focus();
  });
  box.addEventListener('click', (e) => {
    const b = e.target.closest('[data-hy-load]'); if (!b) return;
    const x = HY_IDEAS.find((i) => i.k === b.dataset.hyLoad); if (!x) return;
    hySave({ v: x.v, o: x.o, kv: x.kv, ko: x.ko }); renderHybrid(ctx);
    $('#hy-v').focus();
  });
}
