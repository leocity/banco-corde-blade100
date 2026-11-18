// Ibridi, semplificata (design v6 §6.2, §12.5): verticali + orizzontali, letto pesato 16/19 solo nella stessa fonte,
// confronto con la montata solo nella stessa fonte. Niente verdetti «controllo», niente soglie inventate, niente prezzi.
import { $, esc, NF, fullName } from './format.js';
import { CMP_KEYS, levelOf } from './cmp.js';
import { tip, fmtV, infoTip } from './ui.js';

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

export function bedRows(V, O, ref, meta) {
  const rows = [];
  for (const key of Object.keys(CMP_KEYS)) {
    const k = CMP_KEYS[key];
    const v = V.lab ? k.get(V.lab) : null, o = O.lab ? k.get(O.lab) : null, b = ref.lab ? k.get(ref.lab) : null;
    const has = (x) => typeof x === 'number';
    if (!has(v) && !has(o)) continue;
    const bed = has(v) && has(o) ? hyMean(v, o) : null;
    let cmp = '';
    if (bed !== null && has(b)) {
      const lv = levelOf(key, bed, b, meta);
      cmp = lv === 'simile' ? 'simile alla montata' : `${lv} ${bed > b ? k.up : k.down} della montata`;
    } else if (bed !== null) cmp = 'la montata non ha questa misura';
    else cmp = 'manca la misura di una delle due: niente letto';
    rows.push({ key, v, o, bed, b, cmp });
  }
  return rows;
}

export function renderHybrid(ctx) {
  const box = $('#hybrid');
  if (!box) return;
  const s = hyLoad(ctx), V = ctx.BY_ID[s.v], O = ctx.BY_ID[s.o], ref = ctx.equippedRec();
  const kgSel = (id, val) => `<select id="${id}">${HY_KG.map((k) => `<option value="${k}"${k === val ? ' selected' : ''}>${NF(1).format(k)} kg</option>`).join('')}</select>`;
  const rows = bedRows(V, O, ref, ctx.META);
  const table = rows.length ? `<ul class="cmp-rows">${rows.map((r) => `<li><p class="cmp-q">${tip(r.key, esc(CMP_KEYS[r.key].label))} <span class="muted small">· ${esc(CMP_KEYS[r.key].source)}</span></p>
    <p class="cmp-v">V ${esc(fmtV(r.key, r.v))} · O ${esc(fmtV(r.key, r.o))} → ${tip('letto', 'letto')} <b class="num">${esc(fmtV(r.key, r.bed))}</b></p>
    <p class="small">${esc(r.cmp)}${typeof r.b === 'number' ? ` (${esc(ref.model)}: ${esc(fmtV(r.key, r.b))})` : ''}</p></li>`).join('')}</ul>` : '<p class="muted">Nessuna misura per queste due corde.</p>';
  const kgNote = `Tensione media del letto ${NF(1).format(hyMean(s.kv, s.ko))} kg contro ${NF(1).format(hyMean(...ctx.state().equipped.kg))} kg della montata.`;
  box.innerHTML = `<div class="hy-form">
      <label>Verticali (16) <select id="hy-v">${hyOptions(ctx, s.v)}</select></label><label>kg ${kgSel('hy-kv', s.kv)}</label>
      <label>Orizzontali (19) <select id="hy-o">${hyOptions(ctx, s.o)}</select></label><label>kg ${kgSel('hy-ko', s.ko)}</label>
    </div>
    ${table}
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
  box.addEventListener('click', (e) => {
    const b = e.target.closest('[data-hy-load]'); if (!b) return;
    const x = HY_IDEAS.find((i) => i.k === b.dataset.hyLoad); if (!x) return;
    hySave({ v: x.v, o: x.o, kv: x.kv, ko: x.ko }); renderHybrid(ctx);
    $('#hy-v').focus();
  });
}
