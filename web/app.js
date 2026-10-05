import { profileScore, kgToLbs, DEFAULT_WEIGHTS, DISLIKED_THRESHOLD, dislikedFlag } from './score.js';

const DATA = window.STRINGS_DATA;
const ALL = DATA.strings;
const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const store = {
  get(k, d) { try { const v = localStorage.getItem('banco-corde:' + k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem('banco-corde:' + k, JSON.stringify(v)); } catch { /* storage non disponibile */ } },
};

const SHAPES = { RND: 'tonda', HEX: 'esagonale', PENT: 'pentagonale', SQ: 'quadrata', OCT: 'ottagonale', GEAR: 'a ingranaggio', TWST: 'ritorta', STAR: 'a stella', TRI: 'triangolare', HEP: 'eptagonale' };
const SUBS = [
  ['spin', 'Spin'], ['control', 'Controllo'], ['power', 'Potenza'], ['durability', 'Tenuta'], ['comfort', 'Comfort'],
];
const fmt = (v, d = 1) => (v === null || v === undefined || Number.isNaN(v) ? '—' : Number(v).toFixed(d));
const fmtH = (v, d = 1) => (v === null || v === undefined || Number.isNaN(v) ? '<span class="na" title="Non testato da questa fonte">—</span>' : Number(v).toFixed(d));
const nameOf = (r) => `${r.brand} ${r.model}`;
const gaugeOf = (r) => (r.gauge_mm ? r.gauge_mm.toFixed(2) + ' mm' : r.gauge_label || '—');
const fullName = (r) => `${nameOf(r)} ${r.gauge_mm ? r.gauge_mm.toFixed(2) : r.gauge_label}`;
const cat = (r) => (r.preference === 'liked' ? 'liked' : r.preference === 'disliked' ? 'disliked' : r.is_target ? 'target' : 'other');
const bestLiked = (r) => {
  const v = Object.values(r.derived.similarity_liked || {}).filter((x) => x !== null);
  return v.length ? Math.max(...v) : null;
};
// valore usato per la penalità: solo quando scatta l'avviso (stessa regola di derive.disliked_flag)
const worstDisliked = (r) => {
  if (r.preference) return null;
  const v = Object.values(r.derived.similarity_disliked || {}).filter((x) => x !== null);
  const w = v.length ? Math.max(...v) : null;
  return dislikedFlag(bestLiked(r), w) ? w : null;
};
const isProxy = (r) => r.twu && r.twu.match !== 'exact';

const METRICS = [
  { key: 'twu_st', label: 'Rigidità TWU (lb/in)', short: 'Rigidità', get: (r) => r.twu?.stiffness_lbin, d: 1, hint: 'più alta = più rigida' },
  { key: 'twu_tl', label: 'Perdita di tensione TWU (%)', short: 'Perdita %', get: (r) => r.twu?.tension_loss_pct, d: 1, hint: 'più bassa = tiene meglio' },
  { key: 'twu_sp', label: 'Spin potential TWU', short: 'Spin', get: (r) => r.twu?.spin_potential, d: 1, hint: 'più alto = più rotazione' },
  { key: 'si', label: 'Stiff Index Excel (più alto = più morbida)', short: 'Stiff Idx', get: (r) => r.excel?.stiff_index_avg, d: 2, hint: 'attenzione: scala inversa' },
  { key: 'tl6', label: 'Perdita a 6 mesi Excel (%)', short: 'TL6', get: (r) => r.excel?.tl6, d: 0, hint: 'più bassa = tiene meglio' },
  { key: 'rp', label: 'Rigidità statica Racketpedia (kg/mm)', short: 'Statica', get: (r) => r.rpedia?.static_stiffness_kgmm, d: 2, hint: 'più alta = più rigida' },
  { key: 'score', label: 'Punteggio profilo', short: 'Punteggio', get: (r) => r._score, d: 0, hint: '0–100' },
];
const M = Object.fromEntries(METRICS.map((m) => [m.key, m]));

/* ---------- punteggio live ---------- */
let weights = { ...DEFAULT_WEIGHTS, ...store.get('weights', {}) };
function rescore() { for (const r of ALL) r._score = profileScore(r.derived.subscores, weights, worstDisliked(r)); }
rescore();

/* ---------- schede ---------- */
const TABS = ['perte', 'mappa', 'esplora', 'confronta', 'guida'];
function showTab(id) {
  if (!TABS.includes(id)) id = 'perte';
  for (const t of TABS) {
    $('#' + t).hidden = t !== id;
    $('#tab-' + t).setAttribute('aria-selected', String(t === id));
  }
  store.set('tab', id);
  if (id === 'mappa') drawScatter();
}
document.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => { showTab(b.dataset.tab); history.replaceState(null, '', '#' + b.dataset.tab); }));

/* ---------- PER TE ---------- */
const SLIDER_LABELS = { spin: 'Spin', control: 'Controllo', durability: 'Tenuta di tensione', power: 'Potenza' };
function renderSliders() {
  $('#sliders').innerHTML = Object.keys(DEFAULT_WEIGHTS).map((k) => `
    <div class="slider"><div class="lab"><label for="w-${k}">${SLIDER_LABELS[k]}</label><span class="num" id="wv-${k}">${weights[k]}</span></div>
    <input type="range" id="w-${k}" min="0" max="50" step="5" value="${weights[k]}"></div>`).join('');
  for (const k of Object.keys(DEFAULT_WEIGHTS)) {
    $('#w-' + k).addEventListener('input', (e) => {
      weights[k] = Number(e.target.value); $('#wv-' + k).textContent = weights[k];
      store.set('weights', weights); rescore(); renderRanking();
    });
  }
}
$('#reset-weights').addEventListener('click', () => { weights = { ...DEFAULT_WEIGHTS }; store.set('weights', weights); rescore(); renderSliders(); renderRanking(); });
$('#only-target').addEventListener('change', renderRanking);

const conf = ALL.find((r) => r.id === 'solinco-confidential-16l');
const PRESETS = {
  score: {
    desc: 'Ordinate per punteggio sul tuo profilo. Le corde simili a quelle che non ti sono piaciute perdono 15 punti.',
    list: (rs) => rs.filter((r) => r._score !== null).sort((a, b) => b._score - a._score),
  },
  similar: {
    desc: 'Le corde con misure più vicine a Confidential o O-Toro (rigidità, tenuta, spin, Stiff Index).',
    list: (rs) => rs.filter((r) => r.preference !== 'liked' && r.preference !== 'disliked' && bestLiked(r) !== null).sort((a, b) => bestLiked(b) - bestLiked(a)),
  },
  spin: {
    desc: 'Almeno il controllo della tua Confidential (±10 punti), ma più spin. Ordinate per spin.',
    list: (rs) => {
      const c = conf?.derived.subscores; if (!c) return [];
      return rs.filter((r) => r.preference !== 'liked' && r.derived.subscores.spin !== null && r.derived.subscores.control !== null
        && r.derived.subscores.control >= c.control - 10 && r.derived.subscores.spin > (c.spin ?? 0))
        .sort((a, b) => b.derived.subscores.spin - a.derived.subscores.spin);
    },
  },
  durable: {
    desc: 'Le poly che perdono meno tensione nel tempo, escluse quelle simili alle non gradite.',
    list: (rs) => rs.filter((r) => r.derived.subscores.durability !== null && !r.derived.disliked_warning && r.preference !== 'disliked')
      .sort((a, b) => b.derived.subscores.durability - a.derived.subscores.durability),
  },
};
let preset = 'score';
document.querySelectorAll('.preset').forEach((b) => b.addEventListener('click', () => {
  preset = b.dataset.preset;
  document.querySelectorAll('.preset').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  renderRanking();
}));

function tensionText(r) {
  const t = r.derived.tension_start; if (!t) return '';
  return `${fmt(t.kg[0], 1)}/${fmt(t.kg[1], 1)} kg · ${fmt(t.lbs[0], 1)}/${fmt(t.lbs[1], 1)} lbs`;
}
function badges(r) {
  const out = [];
  if (r.preference === 'liked') out.push('<span class="badge liked">★ preferita</span>');
  if (r.preference === 'disliked') out.push('<span class="badge disliked">✕ non gradita</span>');
  if (r.derived.disliked_warning) out.push(`<span class="badge warn" title="Somiglianza oltre ${DISLIKED_THRESHOLD} con una corda che non ti è piaciuta, più che con le tue preferite">⚠ simile a una non gradita</span>`);
  if (r.derived.sources_disagree) out.push('<span class="badge" title="Il test Ektelon e TWU danno giudizi opposti sulla morbidezza: guarda le due misure nella scheda">fonti discordanti</span>');
  out.push(`<span class="cov" title="Fonti con dati: Excel, TWU, Racketpedia">${'●'.repeat(r.coverage)}${'○'.repeat(3 - r.coverage)}</span>`);
  return out.join(' ');
}
function renderRanking() {
  let rs = ALL;
  if ($('#only-target').checked) rs = rs.filter((r) => r.is_target || r.preference);
  const p = PRESETS[preset];
  $('#preset-desc').textContent = p.desc;
  const list = p.list([...rs]).slice(0, 15);
  $('#ranking').innerHTML = list.length ? list.map((r) => {
    const sl = bestLiked(r);
    return `<li class="rank">
      <span class="name"><button class="rowlink" data-open="${esc(r.id)}">${esc(nameOf(r))}</button> <span class="muted small">${esc(gaugeOf(r))}${r.shape ? ' · ' + esc(SHAPES[r.shape] || r.shape) : ''}</span></span>
      <span class="score">${fmt(r._score, 0)}<small>punteggio</small></span>
      <span class="meta">${badges(r)}
        <span>Somiglianza preferite <b class="num">${fmt(sl, 0)}</b></span>
        ${r.derived.tension_start ? `<span>Parti da <b class="num">${tensionText(r)}</b></span>` : ''}
      </span></li>`;
  }).join('') : '<li class="muted">Nessuna corda soddisfa questo criterio con i dati disponibili.</li>';
}

function renderTastes() {
  const d = DATA.discriminant || [];
  const lab = { twu_stiffness: 'rigidità TWU', twu_tension_loss: 'perdita di tensione TWU', twu_spin: 'spin potential TWU', excel_stiff_index: 'Stiff Index Excel', excel_stretch50: 'allungamento a 50 lbs (Excel)', excel_tl6: 'perdita a 6 mesi (Excel)', excel_creep: 'scorrimento sotto carico 24 h (Excel)', rpedia_static: 'rigidità statica Racketpedia' };
  const items = d.slice(0, 3).map((x) => `<li><b>${esc(lab[x.metric] || x.metric)}</b>: preferite in media <span class="num">${fmt(x.liked_mean, 2)}</span>, non gradite <span class="num">${fmt(x.disliked_mean, 2)}</span> (separazione ${fmt(x.separation, 2)} deviazioni standard).</li>`).join('');
  $('#tastes').innerHTML = `<p class="eyebrow">Cosa dicono i tuoi gusti</p>
    ${DATA.insight ? `<p>${esc(DATA.insight)}</p>` : ''}
    ${items ? `<ul>${items}</ul>` : ''}`;
}

/* ---------- SCHEDA CORDA ---------- */
const dlg = $('#sheet');
$('#sheet-close').addEventListener('click', () => dlg.close());
dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-open]'); if (b) openSheet(b.dataset.open);
});
function kv(pairs) {
  return `<dl class="kv">${pairs.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>`;
}
function subBars(r) {
  return `<div class="cmp-bars">${SUBS.map(([k, l]) => {
    const v = r.derived.subscores[k];
    return `<div class="cmp-row"><span class="small">${l}</span><div class="bar-line"><div class="bar" style="width:${v ?? 0}%;background:var(--court)"></div><span class="v">${fmt(v, 0)}</span></div></div>`;
  }).join('')}</div>`;
}
function openSheet(id) {
  const r = ALL.find((x) => x.id === id); if (!r) return;
  const e = r.excel, t = r.twu, p = r.rpedia, ts = r.derived.tension_start;
  let olg = '';
  if (e && ts) {
    const target = (ts.lbs[0] + ts.lbs[1]) / 2;
    const near = [40, 50, 60, 65].reduce((a, b) => (Math.abs(b - target) < Math.abs(a - target) ? b : a));
    const v = e.olg_16x19?.[near] ?? e.olg_16x19?.[String(near)];
    if (v !== null && v !== undefined) olg = `<div class="tbox"><span class="muted small">Lunghezza guadagnata 16×19 (OLG) a ${near} lbs</span><span class="big">${fmt(v, 1)}″</span><span class="muted small">utile se incordi da matassa</span></div>`;
  }
  const sp = (o, k) => o?.[k] ?? o?.[String(k)];
  const sims = r.derived;
  $('#sheet-body').innerHTML = `
    <div class="sheet-head">
      <p class="eyebrow">${r.is_target ? 'Marca valutata' : 'Concorrente di riferimento'}</p>
      <h2 id="sheet-title">${esc(nameOf(r))}</h2>
      <p class="muted">${esc(gaugeOf(r))} · ${esc(SHAPES[r.shape] || r.shape || 'forma n.d.')} · ${r.material === 'copoly' ? 'co-poliestere' : 'poliestere'}</p>
      <div>${badges(r)} <span class="badge">Punteggio ${fmt(r._score, 0)}</span></div>
    </div>
    ${ts ? `<div class="tension"><div class="tbox"><span class="muted small">Tensione di partenza (verticali/orizzontali)</span><span class="big">${fmt(ts.kg[0], 1)} / ${fmt(ts.kg[1], 1)} kg</span><span class="num">${fmt(ts.lbs[0], 1)} / ${fmt(ts.lbs[1], 1)} lbs</span><span class="muted small">Indicativa: ${esc(ts.note)}</span></div>${olg}</div>` : ''}
    ${r.derived.sources_disagree ? `<p class="callout small">Fonti discordanti: il test Ektelon la dà ${fmt(e?.stiff_index_avg, 2)} di Stiff Index (alto = morbida), TWU ${fmt(t?.stiffness_lbin, 0)} lb/in. Misurano cose diverse (allungamento statico contro impatto): fidati di più di TWU per la sensazione all'impatto.</p>` : ''}
    <div class="notes">${[['feel', 'Sensazione'], ['on_blade_100_v9', 'Sulla Blade 100 v9'], ['for_your_style', 'Per il tuo stile'], ['vs_favorites', 'Rispetto alle tue preferite']]
      .filter(([k]) => r.notes?.[k]).map(([k, l]) => `<div class="note"><h3>${l}</h3><p>${esc(r.notes[k])}</p></div>`).join('')}</div>
    <div><h3>Profilo (percentili sulle ${ALL.length} corde)</h3>${subBars(r)}</div>
    <div><h3>Somiglianza <span class="muted small">su ${Math.max(...Object.values(sims.similarity_basis || { x: 0 }))} misure su 6</span></h3>${kv([
      ['★ Confidential 1.25', fmt(sims.similarity_liked?.confidential, 0)], ['★ O-Toro 1.23', fmt(sims.similarity_liked?.otoro, 0)],
      ['✕ Confidential Soft', fmt(sims.similarity_disliked?.confidential_soft, 0)], ['✕ RPM Blast', fmt(sims.similarity_disliked?.rpm_blast, 0)]])}</div>
    <div class="src-grid">
      <div class="src"><h3>Test Ektelon (tuo file) <span class="muted small">${e ? '' : 'non testata'}</span></h3>${e ? kv([
        ['Allungamento 40 / 50 / 60 / 65 lbs', ['40', '50', '60', '65'].map((k) => fmt(sp(e.stretch_pct, k), 1)).join(' / ') + ' %'],
        ['Recupero a riposo 40 / 65 lbs', `${fmt(sp(e.recover_pct, 40), 1)} / ${fmt(sp(e.recover_pct, 65), 1)} %`],
        ['Stiff Index medio (alto = morbida)', fmt(e.stiff_index_avg, 2)],
        ['Scorrimento 24 h con 40 lbs', e.static_24h_creep === null ? '—' : fmt(e.static_24h_creep, 2) + '″'],
        ['Perdita tensione 6 mesi', e.tl6 === null ? (e.tl6_raw === 0 ? '0 nel file (non misurato)' : '—') : fmt(e.tl6, 0) + ' %'],
        ['Perdita tensione 12 mesi', e.tl12 === null ? '—' : fmt(e.tl12, 0) + ' %'],
        ...(e.extra_test_sets ? [['Set di test nel file', `${e.extra_test_sets + 1} (mostrato il primo)`]] : [])]) : ''}</div>
      <div class="src"><h3>Tennis Warehouse University <span class="muted small">${t ? `${t.ref_tension_lbs} lbs, swing ${t.swing === 'Fast' ? 'veloce' : t.swing}` : 'non presente'}</span></h3>${t ? `${isProxy(t ? r : {}) ? `<p class="proxy small">Dato di «${esc(t.twu_name)}»: ${t.match === 'proxy' ? 'stesso modello, calibro diverso' : 'stessa corda, nome diverso'}.</p>` : ''}${kv([
        ['Rigidità', `<span class="${isProxy(r) ? 'proxy' : ''}">${fmt(t.stiffness_lbin, 1)} lb/in</span>`],
        ['Perdita di tensione', `<span class="${isProxy(r) ? 'proxy' : ''}">${fmt(t.tension_loss_pct, 1)} %</span>`],
        ['Spin potential', `<span class="${isProxy(r) ? 'proxy' : ''}">${fmt(t.spin_potential, 1)}</span>`]])}` : ''}</div>
      <div class="src"><h3>Racketpedia <span class="muted small">${p ? '' : 'non presente'}</span></h3>${p ? `${p.match === 'proxy' ? '<p class="proxy small">Dato di un altro calibro dello stesso modello.</p>' : ''}${kv([
        ['Rigidità statica', `${fmt(p.static_stiffness_kgmm, 2)} kg/mm`], ['Forma / composizione', esc([p.shape, p.composition].filter(Boolean).join(' · ') || '—')]])}<p class="small"><a href="${esc(p.url)}" target="_blank" rel="noopener">Apri la pagina su Racketpedia</a></p>` : ''}</div>
    </div>`;
  if (!dlg.open) dlg.showModal();
  dlg.scrollTop = 0;
}

/* ---------- MAPPA ---------- */
const CAT_LABEL = { liked: 'Tue preferite', disliked: 'Non gradite', target: 'Marche valutate', other: 'Concorrenti' };
const CAT_COLOR = { liked: 'var(--s-liked)', disliked: 'var(--s-disliked)', target: 'var(--s-target)', other: 'var(--s-other)' };
function initMap() {
  const opts = METRICS.map((m) => `<option value="${m.key}">${esc(m.label)}</option>`).join('');
  $('#ax-x').innerHTML = opts; $('#ax-y').innerHTML = opts;
  $('#ax-x').value = 'twu_st'; $('#ax-y').value = 'twu_sp';
  const brands = [...new Set(ALL.map((r) => r.brand))].sort();
  $('#ax-brand').insertAdjacentHTML('beforeend', brands.map((b) => `<option>${esc(b)}</option>`).join(''));
  ['#ax-x', '#ax-y', '#ax-brand'].forEach((s) => $(s).addEventListener('change', drawScatter));
  $('#map-legend').innerHTML = ['liked', 'disliked', 'target', 'other'].map((c) => `<span><i class="sw" style="background:${CAT_COLOR[c]}"></i>${CAT_LABEL[c]}</span>`).join('');
}
function ticks(min, max, n = 5) {
  const span = max - min || 1; const step0 = span / n; const mag = 10 ** Math.floor(Math.log10(step0));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= step0);
  const out = []; for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) out.push(+v.toFixed(6));
  return out;
}
function drawScatter() {
  const mx = M[$('#ax-x').value], my = M[$('#ax-y').value], hb = $('#ax-brand').value;
  const pts = ALL.filter((r) => mx.get(r) !== null && mx.get(r) !== undefined && my.get(r) !== null && my.get(r) !== undefined);
  const W = 900, H = 520, L = 64, R = 20, T = 18, B = 52;
  const svg = $('#scatter'); svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  if (!pts.length) { svg.innerHTML = `<text x="${W / 2}" y="${H / 2}" text-anchor="middle">Nessuna corda ha entrambi i valori</text>`; return; }
  const xs = pts.map(mx.get), ys = pts.map(my.get);
  const pad = (a, b) => { const s = (b - a) * 0.06 || 1; return [a - s, b + s]; };
  const [x0, x1] = pad(Math.min(...xs), Math.max(...xs)), [y0, y1] = pad(Math.min(...ys), Math.max(...ys));
  const sx = (v) => L + (v - x0) / (x1 - x0) * (W - L - R), sy = (v) => H - B - (v - y0) / (y1 - y0) * (H - T - B);
  const order = { other: 0, target: 1, disliked: 2, liked: 3 };
  const sorted = [...pts].sort((a, b) => order[cat(a)] - order[cat(b)] || (hb ? (a.brand === hb) - (b.brand === hb) : 0));
  const tx = ticks(x0, x1), ty = ticks(y0, y1);
  let s = '';
  s += tx.map((v) => `<line class="grid" x1="${sx(v)}" x2="${sx(v)}" y1="${T}" y2="${H - B}"/><text x="${sx(v)}" y="${H - B + 16}" text-anchor="middle">${v}</text>`).join('');
  s += ty.map((v) => `<line class="grid" x1="${L}" x2="${W - R}" y1="${sy(v)}" y2="${sy(v)}"/><text x="${L - 8}" y="${sy(v) + 4}" text-anchor="end">${v}</text>`).join('');
  s += `<text class="axis-title" x="${(L + W - R) / 2}" y="${H - 12}" text-anchor="middle">${esc(mx.label)} — ${esc(mx.hint)}</text>`;
  s += `<text class="axis-title" transform="translate(16 ${(T + H - B) / 2}) rotate(-90)" text-anchor="middle">${esc(my.label)} — ${esc(my.hint)}</text>`;
  for (const r of sorted) {
    const c = cat(r), dim = hb && r.brand !== hb, big = c === 'liked' || c === 'disliked' || (hb && r.brand === hb);
    s += `<circle class="dot${hb && r.brand === hb ? ' hl' : ''}" data-id="${esc(r.id)}" cx="${sx(mx.get(r)).toFixed(1)}" cy="${sy(my.get(r)).toFixed(1)}" r="${big ? 7 : 5}" fill="${CAT_COLOR[c]}" opacity="${dim ? 0.22 : 1}" tabindex="0" role="button" aria-label="${esc(fullName(r))}"/>`;
  }
  // etichette dirette solo per preferite e non gradite; i punti quasi sovrapposti condividono un'etichetta
  const groups = [];
  for (const r of sorted.filter((r) => r.preference)) {
    const x = sx(mx.get(r)), y = sy(my.get(r));
    const g = groups.find((g) => g.model === r.model && Math.hypot(g.x - x, g.y - y) < 14);
    if (g) g.gauges.push(r.gauge_label || ''); else groups.push({ x, y, model: r.model, pref: r.preference, gauges: [r.gauge_label || ''] });
  }
  for (const g of groups) {
    const right = g.x < W - 200;
    s += `<text class="lbl" x="${g.x + (right ? 10 : -10)}" y="${g.y - 8}" text-anchor="${right ? 'start' : 'end'}">${g.pref === 'liked' ? '★ ' : '✕ '}${esc(g.model)} ${esc(g.gauges.join(' · '))}</text>`;
  }
  svg.innerHTML = s;
  $('#map-note').textContent = `${pts.length} corde con entrambi i valori; ${ALL.length - pts.length} escluse perché manca almeno un dato. Tocca un punto per aprire la scheda.`;
  const tip = $('#tip');
  svg.querySelectorAll('.dot').forEach((d) => {
    const r = ALL.find((x) => x.id === d.dataset.id);
    const show = () => {
      tip.hidden = false;
      tip.innerHTML = `<b>${esc(fullName(r))}</b><br>${esc(mx.short)} ${fmt(mx.get(r), mx.d)} · ${esc(my.short)} ${fmt(my.get(r), my.d)}${isProxy(r) && (mx.key.startsWith('twu') || my.key.startsWith('twu')) ? '<br><i>dato TWU di un altro calibro</i>' : ''}`;
      const box = svg.getBoundingClientRect(), k = box.width / W;
      const px = Number(d.getAttribute('cx')) * k, py = Number(d.getAttribute('cy')) * k;
      tip.style.left = Math.min(px + 12, box.width - 250) + 'px'; tip.style.top = Math.max(py - 50, 4) + 'px';
    };
    d.addEventListener('mouseenter', show); d.addEventListener('focus', show);
    d.addEventListener('mouseleave', () => { tip.hidden = true; }); d.addEventListener('blur', () => { tip.hidden = true; });
    d.addEventListener('click', () => openSheet(r.id));
    d.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openSheet(r.id); } });
  });
}

/* ---------- ESPLORA ---------- */
const COLS = [
  { key: 'name', label: 'Corda', get: (r) => nameOf(r), cell: (r) => `<button class="rowlink" data-open="${esc(r.id)}">${esc(nameOf(r))}</button>` },
  { key: 'mm', label: 'mm', n: true, get: (r) => r.gauge_mm, cell: (r) => fmt(r.gauge_mm, 2) },
  { key: 'shape', label: 'Forma', get: (r) => SHAPES[r.shape] || r.shape || '', cell: (r) => esc(SHAPES[r.shape] || r.shape || '—') },
  ...['twu_st', 'twu_tl', 'twu_sp'].map((k) => ({ key: k, label: M[k].short, n: true, get: M[k].get, cell: (r) => `<span class="${isProxy(r) ? 'proxy' : ''}" ${isProxy(r) ? 'title="dato TWU di un altro calibro o nome"' : ''}>${fmtH(M[k].get(r), M[k].d)}</span>` })),
  ...['si', 'tl6', 'rp', 'score'].map((k) => ({ key: k, label: k === 'si' ? 'Stiff Idx ↑morbida' : M[k].short, title: k === 'si' ? 'Stiff Index del test Ektelon: più alto = più MORBIDA (scala inversa rispetto a TWU e Racketpedia)' : M[k].hint, n: true, get: M[k].get, cell: (r) => fmtH(M[k].get(r), M[k].d) })),
  { key: 'sim', label: 'Simil. ★', n: true, get: bestLiked, cell: (r) => fmt(bestLiked(r), 0) },
  { key: 'cov', label: 'Fonti', get: (r) => r.coverage, cell: (r) => `<span class="cov">${'●'.repeat(r.coverage)}${'○'.repeat(3 - r.coverage)}</span>${r.derived.disliked_warning ? ' <span class="badge warn">⚠</span>' : ''}${r.preference === 'liked' ? ' ★' : r.preference === 'disliked' ? ' ✕' : ''}` },
];
let sortKey = 'score', sortDir = -1;
function initTable() {
  const brands = [...new Set(ALL.map((r) => r.brand))].sort();
  $('#f-brand').insertAdjacentHTML('beforeend', brands.map((b) => `<option>${esc(b)}</option>`).join(''));
  const gauges = ['16', '16L', '17', '17L'].filter((g) => ALL.some((r) => r.gauge_label === g));
  $('#f-gauge').insertAdjacentHTML('beforeend', gauges.map((g) => `<option>${g}</option>`).join(''));
  const shapes = [...new Set(ALL.map((r) => r.shape).filter(Boolean))].sort();
  $('#f-shape').insertAdjacentHTML('beforeend', shapes.map((s) => `<option value="${esc(s)}">${esc(SHAPES[s] || s)}</option>`).join(''));
  ['#f-q', '#f-brand', '#f-gauge', '#f-shape', '#f-target'].forEach((s) => $(s).addEventListener('input', renderTable));
}
function renderTable() {
  const q = $('#f-q').value.trim().toLowerCase(), b = $('#f-brand').value, g = $('#f-gauge').value, sh = $('#f-shape').value, tg = $('#f-target').checked;
  const rows = ALL.filter((r) => (!q || nameOf(r).toLowerCase().includes(q)) && (!b || r.brand === b) && (!g || r.gauge_label === g) && (!sh || r.shape === sh) && (!tg || r.is_target));
  const col = COLS.find((c) => c.key === sortKey);
  rows.sort((a, c) => {
    const va = col.get(a), vc = col.get(c);
    if (va === null || va === undefined) return 1; if (vc === null || vc === undefined) return -1;
    return (typeof va === 'string' ? va.localeCompare(vc) : va - vc) * sortDir;
  });
  $('#f-count').textContent = `${rows.length} corde. Valori in corsivo: dato TWU preso da un altro calibro dello stesso modello.`;
  $('#table').innerHTML = `<thead><tr>${COLS.map((c) => `<th class="${c.n ? 'n' : ''}" aria-sort="${c.key === sortKey ? (sortDir > 0 ? 'ascending' : 'descending') : 'none'}"><button type="button" data-sort="${c.key}"${c.title ? ` title="${esc(c.title)}"` : ''}>${esc(c.label)}${c.key === sortKey ? (sortDir > 0 ? ' ▲' : ' ▼') : ''}</button></th>`).join('')}</tr></thead>
    <tbody>${rows.map((r) => `<tr>${COLS.map((c) => `<td class="${c.n ? 'n' : ''}">${c.cell(r)}</td>`).join('')}</tr>`).join('')}</tbody>`;
  $('#table').querySelectorAll('[data-sort]').forEach((btn) => btn.addEventListener('click', () => {
    if (sortKey === btn.dataset.sort) sortDir = -sortDir; else { sortKey = btn.dataset.sort; sortDir = btn.dataset.sort === 'name' || btn.dataset.sort === 'shape' ? 1 : -1; }
    renderTable();
  }));
}

/* ---------- CONFRONTA ---------- */
const SLOT_COLORS = ['var(--s-c1)', 'var(--s-c2)', 'var(--s-c3)', 'var(--s-c4)'];
const SLOT_DASH = ['', 'repeating-linear-gradient(90deg, transparent 0 6px, rgb(255 255 255 / .35) 6px 8px)', 'repeating-linear-gradient(135deg, transparent 0 4px, rgb(255 255 255 / .35) 4px 6px)', 'repeating-linear-gradient(0deg, transparent 0 3px, rgb(255 255 255 / .35) 3px 5px)'];
let picks = store.get('picks', null);
function initCompare() {
  const sorted = [...ALL].sort((a, b) => fullName(a).localeCompare(fullName(b)));
  const opts = '<option value="">—</option>' + sorted.map((r) => `<option value="${esc(r.id)}">${esc(fullName(r))}${r.preference === 'liked' ? ' ★' : r.preference === 'disliked' ? ' ✕' : ''}</option>`).join('');
  if (!picks || !Array.isArray(picks)) {
    const top = ALL.filter((r) => r.is_target && !r.preference && r._score !== null).sort((a, b) => b._score - a._score)[0];
    picks = ['solinco-confidential-16l', 'toroline-o-toro-17', top ? top.id : '', ''];
  }
  $('#cmp-pickers').innerHTML = [0, 1, 2, 3].map((i) => `<label><span><i class="sw" style="background:${SLOT_COLORS[i]}"></i> Corda ${i + 1}</span><select id="cmp-${i}">${opts}</select></label>`).join('');
  [0, 1, 2, 3].forEach((i) => {
    const s = $('#cmp-' + i); s.value = picks[i] || '';
    s.addEventListener('change', () => { picks[i] = s.value; store.set('picks', picks); renderCompare(); });
  });
}
function renderCompare() {
  const chosen = picks.map((id, i) => ({ r: ALL.find((x) => x.id === id), i })).filter((x) => x.r);
  $('#cmp-legend').innerHTML = chosen.map(({ r, i }) => `<span><i class="sw" style="background:${SLOT_COLORS[i]}"></i>${esc(fullName(r))}</span>`).join('');
  $('#cmp-bars').innerHTML = chosen.length ? SUBS.map(([k, l]) => `<div class="cmp-row"><b>${l}</b><div class="bars">${chosen.map(({ r, i }) => {
    const v = r.derived.subscores[k];
    return `<div class="bar-line" title="${esc(fullName(r))}"><div class="bar" style="width:${v ?? 0}%;background:${SLOT_COLORS[i]};background-image:${SLOT_DASH[i] || 'none'}"></div><span class="v">${fmt(v, 0)}</span></div>`;
  }).join('')}</div></div>`).join('') : '<p class="muted">Scegli almeno una corda.</p>';
  const rows = [
    ['Calibro', (r) => gaugeOf(r)], ['Forma', (r) => SHAPES[r.shape] || r.shape || '—'],
    ...['twu_st', 'twu_tl', 'twu_sp', 'si', 'tl6', 'rp'].map((k) => [M[k].label, (r) => `<span class="${k.startsWith('twu') && isProxy(r) ? 'proxy' : ''}">${fmtH(M[k].get(r), M[k].d)}</span>`]),
    ['Punteggio profilo', (r) => fmt(r._score, 0)],
    ['Tensione di partenza', (r) => tensionText(r) || '—'],
  ];
  $('#cmp-table').innerHTML = chosen.length ? `<thead><tr><th>Misura</th>${chosen.map(({ r, i }) => `<th><i class="sw" style="background:${SLOT_COLORS[i]}"></i> ${esc(fullName(r))}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(([l, f]) => `<tr><td>${esc(l)}</td>${chosen.map(({ r }) => `<td class="n">${f(r)}</td>`).join('')}</tr>`).join('')}</tbody>` : '';
  $('#cmp-summary').innerHTML = chosen.length >= 2 ? summary(chosen[0].r, chosen[1].r) : '';
}
function summary(a, b) {
  const gain = [], lose = [];
  for (const [k, l] of SUBS) {
    const va = a.derived.subscores[k], vb = b.derived.subscores[k];
    if (va === null || vb === null) continue;
    if (vb - va >= 10) gain.push(l.toLowerCase()); else if (va - vb >= 10) lose.push(l.toLowerCase());
  }
  const join = (xs) => xs.length > 1 ? xs.slice(0, -1).join(', ') + ' e ' + xs.at(-1) : xs[0];
  let s = `Passando da <b>${esc(fullName(a))}</b> a <b>${esc(fullName(b))}</b> `;
  if (!gain.length && !lose.length) s += 'il profilo resta molto simile (differenze sotto i 10 punti percentili).';
  else s += [gain.length ? `guadagni ${join(gain)}` : '', lose.length ? `perdi ${join(lose)}` : ''].filter(Boolean).join(' e ') + '.';
  const tb = b.derived.tension_start;
  if (tb) s += ` Tensione di partenza indicativa per la seconda: ${tensionText(b)}.`;
  return s;
}

/* ---------- GUIDA ---------- */
function renderGuide() {
  const g = DATA.guide || {};
  $('#guida').innerHTML = `
    <h2>Come leggere le corde</h2>
    <p>Ogni corda qui ha fino a tre fonti di misura. Misurano cose diverse, quindi non vanno mescolate: servono a guardare la stessa corda da tre lati.</p>
    <div class="callout"><h3>Tre numeri di rigidità, tre scale diverse</h3>
      <ul>
        <li><b>Rigidità TWU (lb/in)</b>: misura dinamica, un impatto simulato su una corda a ${esc(g.twu_ref || '51 lbs')}. <b>Più alto = più rigida</b>: più controllo e meno potenza. Le poly vanno da circa 165 a 290.</li>
        <li><b>Rigidità statica Racketpedia (kg/mm)</b>: misura a carico lento. <b>Più alto = più rigida</b>. Si muove nella stessa direzione di TWU ma non è convertibile.</li>
        <li><b>Stiff Index del tuo file Excel</b>: (allungamento − recupero) / 11,25 × 100. <b>Più alto = più morbida</b>, cioè scala inversa: un valore alto significa che la corda cede di più e torna meno indietro.</li>
      </ul></div>
    <div class="guide-grid">
      ${[
        ['Rigidità', 'Quanto la corda resiste a deformarsi nell\'impatto.', 'Alta: palla più controllata, piatto corde "duro", meno potenza. Bassa: più potenza e comfort, palla che esce più alta.', 'Con una Blade (telaio flessibile) una poly media o medio-rigida non toglie potenza in modo drastico.'],
        ['Perdita di tensione', 'Quanta tensione si perde durante e dopo l\'incordatura (TWU) o in 6–12 mesi (Excel).', 'Bassa: la corda resta simile a com\'era incordata. Alta: dopo poche ore diventa più morbida e meno precisa.', 'Con 4–5 ore a settimana conta: una poly che "muore" presto si sente già alla seconda settimana.'],
        ['Spin potential', 'Indice TWU di quanto le corde scorrono e tornano in posizione (snapback).', 'Più alto: più rotazione a parità di swing.', 'Per chi gioca in rotazione è il criterio più diretto.'],
        ['Forma', 'Sezione della corda: tonda, esagonale, pentagonale, quadrata, a ingranaggio.', 'Le forme spigolose mordono la palla; le tonde scorrono meglio e sono più costanti.', 'Lo spin dipende più dallo scorrimento (snapback) che dagli spigoli.'],
        ['Calibro', 'Diametro in mm: 16 = 1.30, 16L ≈ 1.25–1.28, 17 ≈ 1.20–1.25, 17L ≈ 1.18–1.20.', 'Più sottile: più spin, sensibilità e potenza, ma dura meno.', 'Le tue preferite sono 1.23–1.25: è il calibro di riferimento.'],
        ['Allungamento e recupero', 'Dal test Ektelon: quanto si allunga la corda a 40–65 lbs e quanto torna indietro a riposo.', 'Molto allungamento: più "tasca" e potenza. Poco recupero: tende a perdere tensione.', 'Utile per capire come cambia la corda nelle prime ore.'],
        ['Scorrimento 24 h', 'Allungamento sotto 40 lbs di peso statico dopo 24 ore.', 'Più alto: la corda si rilassa di più nel tempo.', 'Si lega alla perdita di tensione nelle prime ore dopo l\'incordatura.'],
        ['OLG (16×19)', 'Lunghezza totale guadagnata su un piatto 16×19 per allungamento.', 'Serve a non sprecare corda se incordi da matassa.', 'La Blade 100 v9 è 16×19: il valore si applica direttamente.'],
      ].map(([t, a, b, c]) => `<div class="gcard"><h3>${t}</h3><p>${a}</p><p class="scale">${b}</p><p class="small muted">${c}</p></div>`).join('')}
    </div>
    <h3>Il punteggio "Per te"</h3>
    <p>Ogni corda riceve un percentile (0–100) rispetto alle ${ALL.length} corde del banco per spin, controllo, potenza, tenuta e comfort. Il punteggio è la media pesata di spin, controllo, tenuta e potenza con i pesi che scegli. Se la corda somiglia per più di ${DISLIKED_THRESHOLD} su 100 a Confidential Soft o RPM Blast, e più che alle tue preferite, perde 15 punti. Controllo e potenza vengono dalla stessa rigidità vista in direzioni opposte, quindi alzare uno abbassa l'altro.</p>
    <h3>La tensione suggerita</h3>
    <p>Si parte dalla tua preferita più simile (Confidential 22/21 kg, O-Toro 23/22 kg) e si corregge di circa 0,5–1 kg ogni 15 lb/in di rigidità TWU in più o in meno, fino a ±2 kg. È un punto di partenza: con una poly nuova, se dopo due ore la senti ancora dura, scendi di 1 kg la volta successiva.</p>
    <h3>Glossario del file Excel (colonne A–Y)</h3>
    <div class="table-scroll"><table class="data"><tbody>${[
      ['A–C', 'Marca, nome, calibro'], ['D–G', 'Tipo: poly, co-poly, budello, multifilamento'], ['H', 'Forma della sezione'], ['I', 'Tensione di trazione: 40, 50, 60, 65 lbs'],
      ['J', 'Stretch: lunghezza totale in tensione del tratto di 11,25″'], ['K', '% stretch: lo stesso in percentuale'], ['L', 'Recover: lunghezza a riposo dopo il rilascio'], ['M', '% recover: lo stesso in percentuale'],
      ['N', 'Diff: stretch − recover'], ['O', 'Stiff Index: (diff / 11,25) × 100, più alto = più morbida'], ['P', 'Gain: lunghezza guadagnata sul singolo tratto'], ['Q', 'OLG: lunghezza guadagnata su un piatto 16×19'],
      ['R–S', 'Elongazione al micrometro a 65 lbs (differenze non significative)'], ['T', 'Allungamento iniziale con 40 lbs appesi'], ['U', 'Lunghezza dopo 24 h sotto peso'], ['V', 'Lunghezza dopo 24 h senza peso'], ['W', 'Differenza tra U e V'],
      ['X', 'TL6: perdita di tensione a 6 mesi da 50 lbs, con string meter'], ['Y', 'TL12: perdita a 12 mesi, con base il valore a 6 mesi'],
    ].map(([a, b]) => `<tr><td class="n">${a}</td><td style="white-space:normal">${esc(b)}</td></tr>`).join('')}</tbody></table></div>
    <p class="small muted">Test Ektelon Model D su tratto di 11,25″ (lunghezza media di una verticale su Wilson Pro Staff RF97). Nel file, una perdita di tensione pari a 0 è trattata come "non misurato".</p>`;
}

/* ---------- avvio ---------- */
renderSliders(); renderTastes(); renderRanking(); initMap(); initTable(); renderTable(); initCompare(); renderCompare(); renderGuide();
$('#foot').innerHTML = `<p>Fonti: test Ektelon del tuo file (agg. ${esc(DATA.excel_date || 'ago 2026')}), <a href="https://twu.tennis-warehouse.com/learning_center/reporter2.php" target="_blank" rel="noopener">TWU String Performance Database</a> (${esc(DATA.guide?.twu_ref || '51 lbs')}), <a href="https://www.racketpedia.com/" target="_blank" rel="noopener">Racketpedia</a> (solo rigidità statica gratuita).</p><p>${ALL.length} corde poly, calibri 16–17L. Generato il ${esc(DATA.generated)}.</p>`;
showTab((location.hash || '').slice(1) || store.get('tab', 'perte'));
window.addEventListener('hashchange', () => showTab(location.hash.slice(1)));
