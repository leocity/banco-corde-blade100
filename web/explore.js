// "Esplora" (spec §4.9): mappa rigidità × spin (di default solo valori misurati), elenco per modello, come leggere e metodo.
import { modelId } from './recommend.js';
import { $, ALL, BY_ID, DATA, esc, fmt, fullName, nameOf, NF, SHAPES, store, isEst } from './format.js';
import { valButton } from './prov.js';
import { badges, BADGE_LEGEND } from './badges.js';
import { getCurrent } from './current.js';
import { valueHtml } from './home.js';

let exF = { q: '', brand: '', shape: '', target: false, lab: false, est: false, comp: true, ...store.get('explore-f', {}) };
const exSave = () => store.set('explore-f', exF);

function exModels(cur) {
  const groups = new Map();
  for (const r of ALL) { const m = modelId(r); if (!groups.has(m)) groups.set(m, []); groups.get(m).push(r); }
  const g0 = cur.r.gauge_mm ?? 1.25;
  return [...groups.entries()].map(([id, rs]) => {
    rs.sort((a, b) => (a.gauge_mm ?? 0) - (b.gauge_mm ?? 0));
    const rep = [...rs].sort((a, b) => Math.abs((a.gauge_mm ?? g0) - g0) - Math.abs((b.gauge_mm ?? g0) - g0))[0];
    return { id, rs, rep };
  }).sort((a, b) => nameOf(a.rep).localeCompare(nameOf(b.rep)));
}
const exPass = (m) => {
  const r = m.rep, q = exF.q.trim().toLowerCase();
  return (!q || m.rs.some((x) => fullName(x).toLowerCase().includes(q))) && (!exF.brand || r.brand === exF.brand) && (!exF.shape || r.shape === exF.shape)
    && (!exF.target || r.is_target || r.preference) && (!exF.lab || m.rs.some((x) => !x.catalog_only));
};
const twuCell = (r, k, field, d, unit) => (r.twu && ['exact', 'probable'].includes(r.twu.match) && r.twu[k] != null ? valButton(r, field, `${fmt(r.twu[k], d)}${unit}`) : '<span class="muted">—</span>');
const exGaugeRow = (r, cur) => `<tr><td><button class="rowlink" type="button" data-open="${esc(r.id)}">${r.gauge_mm ? NF(2).format(r.gauge_mm) : esc(r.gauge_label || '?')}</button></td><td>${valueHtml(r, 'stiffness')}</td><td>${valueHtml(r, 'spin')}</td><td>${valueHtml(r, 'loss')}</td><td>${twuCell(r, 'energy_return_pct', 'energy_return', 0, ' %')}</td><td>${badges(r, cur)}</td></tr>`;

function exList(cur) {
  const models = exModels(cur), shown = models.filter(exPass);
  return `<p class="muted small" id="ex-count">${shown.length} modelli su ${models.length} (${ALL.length} corde tra calibri e colori).</p>
    <div class="models">${shown.map((m) => `<details class="model" data-model="${esc(m.id)}"><summary>
      <span class="mn">${esc(nameOf(m.rep))}</span><span class="ms">${esc(SHAPES[m.rep.shape] || m.rep.shape || '')}${m.rs.length > 1 ? ` · ${m.rs.length} calibri/colori` : ''}</span>
      <span class="mv"><span>Rigidità ${valueHtml(m.rep, 'stiffness')}</span><span>Spin ${valueHtml(m.rep, 'spin')}</span><span>Perdita ${valueHtml(m.rep, 'loss')}</span></span></summary>
      <div class="table-scroll"><table class="data"><thead><tr><th>Calibro</th><th>Rigidità</th><th>Spin</th><th>Perdita TWU</th><th>Energia</th><th></th></tr></thead><tbody>${m.rs.map((r) => exGaugeRow(r, cur)).join('')}</tbody></table></div>
    </details>`).join('') || '<p class="muted">Nessun modello con questi filtri.</p>'}</div>`;
}

/* ---------- mappa ---------- */
const EX_CAT = (r, cur) => (r.id === cur.id ? 'cur' : r.preference === 'liked' ? 'liked' : r.preference === 'disliked' ? 'disliked' : r.is_target ? 'target' : 'other');
const EX_COLOR = { cur: 'var(--fg)', liked: 'var(--s-liked)', disliked: 'var(--s-disliked)', target: 'var(--s-target)', other: 'var(--s-other)' };
const EX_LABEL = { cur: 'La tua corda', liked: 'Preferite', disliked: 'Non gradite', target: 'Marche valutate', other: 'Concorrenti' };
function exTicks(min, max, n = 5) {
  const span = max - min || 1, step0 = span / n, mag = 10 ** Math.floor(Math.log10(step0));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= step0);
  const out = []; for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) out.push(+v.toFixed(6));
  return out;
}
export function drawScatter() {
  const cur = getCurrent(), svg = $('#scatter');
  const sx0 = (r) => r.stiffness?.value_lbin, sy0 = (r) => r.spin?.value;
  const est = (r) => isEst(r.stiffness, 'misurata') || isEst(r.spin, 'misurato');
  const vis = (r) => (exF.comp || r.is_target || r.preference || r.id === cur.id) && sx0(r) != null && sy0(r) != null;
  const pts = ALL.filter((r) => vis(r) && (exF.est || !est(r) || r.id === cur.id));
  const hidden = ALL.filter((r) => vis(r) && !pts.includes(r)).length, noData = ALL.filter((r) => sx0(r) == null || sy0(r) == null).length;
  $('#map-note').textContent = `${pts.length} corde nel grafico${hidden ? `; ${hidden} con valori stimati nascoste (attiva "Mostra le stime")` : ''}${noData ? `; ${noData} senza rigidità o spin` : ''}.`;
  // su telefono il disegno si restringe in proporzione: viewBox più stretto e testi più grandi (dalla v2 pubblicata)
  const narrow = (svg.parentElement?.clientWidth || 900) < 560;
  const W = narrow ? 520 : 900, H = narrow ? 600 : 560, L = narrow ? 70 : 64, R = 18, T = 18, B = 56;
  svg.classList.toggle('narrow', narrow);
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  if (!pts.length) { svg.innerHTML = `<text x="${W / 2}" y="${H / 2}" text-anchor="middle">Nessuna corda con questi filtri</text>`; return; }
  const xs = pts.map(sx0), ys = pts.map(sy0);
  const pad = (a, b) => { const s = (b - a) * 0.06 || 1; return [a - s, b + s]; };
  const [x0, x1] = pad(Math.min(...xs), Math.max(...xs)), [y0, y1] = pad(Math.min(...ys), Math.max(...ys));
  const sx = (v) => L + (v - x0) / (x1 - x0) * (W - L - R), sy = (v) => H - B - (v - y0) / (y1 - y0) * (H - T - B);
  let s = exTicks(x0, x1).map((v) => `<line class="grid" x1="${sx(v)}" x2="${sx(v)}" y1="${T}" y2="${H - B}"/><text x="${sx(v)}" y="${H - B + 16}" text-anchor="middle">${NF(0).format(v)}</text>`).join('');
  s += exTicks(y0, y1).map((v) => `<line class="grid" x1="${L}" x2="${W - R}" y1="${sy(v)}" y2="${sy(v)}"/><text x="${L - 8}" y="${sy(v) + 4}" text-anchor="end">${NF(v % 1 ? 1 : 0).format(v)}</text>`).join('');
  s += `<text class="axis-title" x="${(L + W - R) / 2}" y="${H - 10}" text-anchor="middle">Rigidità (lb/in) → più rigida</text>`;
  s += `<text class="axis-title" transform="translate(16 ${(T + H - B) / 2}) rotate(-90)" text-anchor="middle">Spin (scala TWU) → più spin</text>`;
  const order = { other: 0, target: 1, disliked: 2, liked: 3, cur: 4 };
  for (const r of [...pts].sort((a, b) => order[EX_CAT(a, cur)] - order[EX_CAT(b, cur)])) {
    const c = EX_COLOR[EX_CAT(r, cur)], x = sx(sx0(r)), y = sy(sy0(r)), e = est(r);
    if (e && exF.est) {
      if (isEst(r.spin, 'misurato')) s += `<line class="err" x1="${x}" x2="${x}" y1="${sy(r.spin.low)}" y2="${sy(r.spin.high)}" style="stroke:${c}"/>`;
      if (isEst(r.stiffness, 'misurata')) s += `<line class="err" x1="${sx(r.stiffness.low)}" x2="${sx(r.stiffness.high)}" y1="${y}" y2="${y}" style="stroke:${c}"/>`;
    }
    if (narrow) s += `<circle class="hit" data-id="${esc(r.id)}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="20" fill="transparent" aria-hidden="true"/>`;
    s += `<circle class="dot${e ? ' hollow' : ''}" data-id="${esc(r.id)}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${narrow ? (r.id === cur.id || r.preference ? 11 : 9) : (r.id === cur.id || r.preference ? 8 : 6)}" style="${e ? `stroke:${c}` : `fill:${c}`}" tabindex="0" role="button" aria-label="${esc(fullName(r))}: rigidità ${fmt(sx0(r), 0)}, spin ${fmt(sy0(r), 1)}${e ? ' (stima)' : ''}"/>`;
  }
  for (const r of pts.filter((r) => r.id === cur.id || r.preference === 'liked')) {
    const x = sx(sx0(r)), y = sy(sy0(r)), right = x < W - (narrow ? 200 : 220);
    s += `<text class="lbl" x="${x + (right ? 11 : -11)}" y="${y - 9}" text-anchor="${right ? 'start' : 'end'}">${r.id === cur.id ? 'La tua: ' : '★ '}${esc(r.model)} ${esc(r.gauge_label || '')}</text>`;
  }
  svg.innerHTML = s;
  svg.querySelectorAll('.dot, .hit').forEach((d) => {
    const pick = () => {
      const m = document.querySelector(`details.model[data-model="${CSS.escape(modelId(BY_ID[d.dataset.id]))}"]`);
      svg.querySelectorAll('.dot.sel').forEach((x) => x.classList.remove('sel'));
      svg.querySelector(`.dot[data-id="${CSS.escape(d.dataset.id)}"]`)?.classList.add('sel');
      if (!m) { $('#map-note').textContent = `${fullName(BY_ID[d.dataset.id])} è nascosta dai filtri dell'elenco.`; return; }
      m.open = true; m.classList.add('flash'); setTimeout(() => m.classList.remove('flash'), 1200);
      m.scrollIntoView({ block: 'center', behavior: 'smooth' });
    };
    d.addEventListener('click', pick);
    d.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
  });
}

/* ---------- come leggere e metodo ---------- */
const exDate = (d) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d || ''); return m ? `${m[3]}/${m[2]}/${m[1]}` : 'data non disponibile'; };
function exHow() {
  return `<details class="advanced" id="come-leggere"><summary>Come leggere</summary>
    <ol class="how">
      <li>Tutto si confronta con <b>la corda che monti adesso</b> (in cima a "La tua corda").</li>
      <li>I consigli e l'ordine usano <b>solo dati di laboratorio</b>: TWU, Racketpedia e il tuo test Ektelon. Le recensioni sono solo link.</li>
      <li><b>≈</b> vuol dire stima (calibro gemello, Racketpedia convertita o modello). Tocca un numero sottolineato per vedere fonte, data, condizioni e margine.</li>
      <li>▲ ▼ = più alto o più basso della tua corda oltre la soglia; = vuol dire simile.</li>
      <li>La tensione di partenza è una stima: parte dalla tua corda e corregge per la rigidità con la pendenza ricavata dalle tue due preferite. Usala come punto di partenza.</li>
    </ol>
    <p class="badges">${BADGE_LEGEND.map(([cls, label, text]) => `<span class="${cls}">${label}</span> <span class="small">${esc(text)}</span>`).join('<br>')}</p>
  </details>`;
}
function exMethod() {
  const m = DATA.estimates_meta || {}, rp = m.rp_to_twu || {}, g = m.stiffness_gauge || {}, gm = (m.stiffness_model || {}).gauge || {}, sm = (m.spin_model || {}).stiffness_shape || {};
  const src = DATA.sources || {};
  const line = (k, label) => `<li>${label}: ${src[k] ? (src[k].file ? `${esc(src[k].file)}, ${exDate(src[k].modified)}` : `scaricato il ${exDate(src[k].fetched)}`) : 'data non disponibile'}</li>`;
  return `<details class="advanced" id="metodo"><summary>Metodo completo e fonti</summary>
    <h3>Fonti</h3><ul>${line('twu', 'TWU, tabella delle prestazioni (rigidità dinamica, perdita di tensione, spin; 51 lbs, swing veloce)')}${line('twu_compare', 'TWU Compare (restituzione di energia, attrito corda-corda e corda-palla)')}${line('racketpedia', 'Racketpedia, schede gratuite (rigidità statica)')}${line('excel', 'Il tuo test Ektelon')}</ul>
    <h3>Rigidità quando manca la misura TWU</h3>
    <ul>
      <li><b>Da calibro gemello TWU, corretta per il diametro</b>: circa ${fmt(g.slope, 0)} lb/in per mm, ricavati da ${g.n_pairs ?? '—'} coppie di calibri dello stesso modello; errore medio ${fmt(g.mae, 1)} lb/in contro ${fmt(g.copy_mae, 1)} copiando il valore.</li>
      <li><b>Da Racketpedia convertita</b>: rigidità statica portata sulla scala TWU con ${rp.n ?? '—'} coppie (r = ${fmt(rp.r, 2)}); errore medio ±${fmt(rp.mae, 0)} lb/in. Le due rigidità non coincidono: TWU colpisce la corda in pochi millesimi di secondo, Racketpedia la carica lentamente.</li>
      <li><b>Dal solo calibro</b>: ultima risorsa, errore medio ${fmt(gm.mae, 1)} contro ${fmt(gm.baseline_mae, 1)} della media. Non entra mai nei consigli.</li>
    </ul>
    <h3>Spin quando manca la misura TWU</h3>
    <ul>
      <li><b>Da calibro o colore gemello</b>: lo stesso modello misurato, ±0,5.</li>
      <li><b>Da modello</b> (rigidità e forma): errore medio ${fmt(sm.mae, 2)} contro ${fmt(sm.baseline_mae, 2)} della media su ${sm.n ?? '—'} corde misurate. Solo in mappa e schede, mai nei consigli.</li>
      <li>Le recensioni non predicono lo spin TWU e non entrano in nessuna stima.</li>
    </ul>
    <h3>Ordine dei consigli</h3>
    <p>Posizione tra le corde del banco su spin (peso 35), tenuta di tensione (20) e somiglianza alle tue preferite (20); −15 se la corda somiglia più a una non gradita. Serve avere spin e tenuta. I pesi si cambiano in "Avanzate".</p>
    <h3>Tensione di partenza</h3>
    <p>Parte dalla corda che monti e dalla sua tensione, poi corregge di ${fmt((DATA.tension_slope_kg_per_lbin ?? -0.05) * 15, 2)} kg ogni 15 lb/in di rigidità in più (al massimo ±2 kg). La pendenza viene dalle tue due preferite (Confidential più rigida a 22/21 kg, O-Toro più morbida a 23/22 kg): due soli punti, quindi indicativa. Si mostra come intervallo di ±1 kg.</p>
    <h3>Tenuta di tensione</h3>
    <p>Per tutte la stessa base: la perdita misurata da TWU. Il TL6 del tuo file entra solo se TWU manca, perché mescolare le due misure penalizzava le corde che hai testato tu.</p>
    <h3>Lo Stiff Index del tuo file</h3>
    <p>È (allungamento − recupero) / 11,25 × 100: misura quanto la corda non torna indietro, quindi va letto come indice di cedimento, non di rigidità.</p>
    <h3>Restituzione di energia e attriti</h3>
    <p>Misure TWU dello strumento Compare, solo per le corde testate in quel calibro. Lo spin TWU è il rapporto tra attrito corda-palla e attrito corda-corda: corde che scorrono facilmente tra loro (attrito basso) tornano in sede e danno più rotazione.</p>
  </details>`;
}

/* ---------- schermata ---------- */
export function renderExplore() {
  const cur = getCurrent(), el = $('#explore');
  const brands = [...new Set(ALL.map((r) => r.brand))].sort(), shapes = [...new Set(ALL.map((r) => r.shape).filter(Boolean))].sort();
  const sel = (id, label, opts) => `<label>${label} <select id="${id}"><option value="">Tutte</option>${opts}</select></label>`;
  el.innerHTML = `<div class="section-head"><h2>Dove sta ogni corda</h2><p class="muted small">Orizzontale: da morbida a rigida. Verticale: quanto spin. Tocca un punto per aprire il suo modello nell'elenco.</p></div>
    <div class="map-controls">
      <label class="toggle"><input type="checkbox" id="ex-est"${exF.est ? ' checked' : ''}> Mostra le stime</label>
      <label class="toggle"><input type="checkbox" id="ex-comp"${exF.comp ? ' checked' : ''}> Mostra i concorrenti</label>
    </div>
    <div class="legend">${['cur', 'liked', 'disliked', 'target', 'other'].map((c) => `<span><i class="sw" style="background:${EX_COLOR[c]}"></i>${EX_LABEL[c]}</span>`).join('')}<span><i class="sw hollow"></i>Stima, con margine</span></div>
    <div class="chart-box"><svg id="scatter" role="img" aria-label="Mappa rigidità contro spin"></svg></div>
    <p class="muted small" id="map-note"></p>
    <div class="section-head"><h2>Tutti i modelli</h2></div>
    <div class="controls">
      <label>Cerca <input type="search" id="ex-q" placeholder="Nome" value="${esc(exF.q)}"></label>
      ${sel('ex-brand', 'Marca', brands.map((b) => `<option${b === exF.brand ? ' selected' : ''}>${esc(b)}</option>`).join(''))}
      ${sel('ex-shape', 'Forma', shapes.map((s) => `<option value="${esc(s)}"${s === exF.shape ? ' selected' : ''}>${esc(SHAPES[s] || s)}</option>`).join(''))}
      <label class="toggle"><input type="checkbox" id="ex-target"${exF.target ? ' checked' : ''}> Solo marche valutate</label>
      <label class="toggle"><input type="checkbox" id="ex-lab"${exF.lab ? ' checked' : ''}> Solo con test di laboratorio</label>
    </div>
    <div id="ex-list">${exList(cur)}</div>
    ${exHow()}${exMethod()}`;
  const upd = (k, v, redraw) => { exF[k] = v; exSave(); $('#ex-list').innerHTML = exList(cur); if (redraw) drawScatter(); };
  $('#ex-q').addEventListener('input', (e) => upd('q', e.target.value));
  $('#ex-brand').addEventListener('change', (e) => upd('brand', e.target.value));
  $('#ex-shape').addEventListener('change', (e) => upd('shape', e.target.value));
  $('#ex-target').addEventListener('change', (e) => upd('target', e.target.checked));
  $('#ex-lab').addEventListener('change', (e) => upd('lab', e.target.checked));
  $('#ex-est').addEventListener('change', (e) => upd('est', e.target.checked, true));
  $('#ex-comp').addEventListener('change', (e) => upd('comp', e.target.checked, true));
  drawScatter();
}
