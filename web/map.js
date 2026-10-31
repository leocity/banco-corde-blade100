import { $, esc, fmt, fullName, mmOf, SHAPES } from './format.js';
import { shortCardHtml } from './cards.js';
import { deltaVsEquipped } from './values.js';

// Mappa: logica pura (assi, filtri, etichette senza sovrapposizioni). Il disegno SVG e gli eventi sono nel Task 15.
const val = (v) => v !== null && v !== undefined;

export const AXES = {
  stiffness: { label: 'Rigidità (lb/in, scala TWU)', short: 'Rigidità', d: 0, hint: '→ più rigida',
    get: (r) => (r.stiffness && val(r.stiffness.value_lbin) ? { value: r.stiffness.value_lbin, low: r.stiffness.low, high: r.stiffness.high, est: r.stiffness.kind !== 'misurata', model: r.stiffness.kind === 'modello' } : null) },
  spin: { label: 'Spin (scala TWU 0–10)', short: 'Spin', d: 1, hint: '→ più spin',
    get: (r) => (r.spin && val(r.spin.value) ? { value: r.spin.value, low: r.spin.low, high: r.spin.high, est: r.spin.kind !== 'misurato', model: r.spin.kind === 'modello' } : null) },
  durability: { label: 'Tenuta (posizione 0–100 tra le corde)', short: 'Tenuta', d: 0, hint: '→ tiene meglio',
    get: (r) => (val(r.derived.dims.durability) ? { value: r.derived.dims.durability, est: false, model: false } : null) },
};
export const PRESETS = { rs: ['stiffness', 'spin'], ts: ['durability', 'spin'] };

// Corde sulla mappa. La montata e le preferite non vengono mai nascoste dai filtri.
// pts: entrambi gli assi; stripX: solo x (fascia in basso); stripY: solo y (fascia a sinistra); none: nessuno dei due; hidden: nascoste dai filtri.
export function mapPoints(all, f, ctx) {
  const ax = AXES[f.x], ay = AXES[f.y];
  const out = { pts: [], stripX: [], stripY: [], none: [], hidden: [] };
  for (const r of all) {
    const ref = r.id === ctx.equippedId || ctx.liked.includes(r.id);
    const xv = ax.get(r), yv = ay.get(r);
    const keep = ref || ((!f.brands.length || f.brands.includes(r.brand)) && (!f.target || r.is_target) && (!f.gauge || r.gauge_label === f.gauge) && (!f.shape || r.shape === f.shape)
      && (!f.onlyMeasured || !((xv && xv.est) || (yv && yv.est))) && (!f.onlyGood || ctx.pairingOf(r.id).score >= 60));
    if (!keep) out.hidden.push(r);
    else if (xv && yv) out.pts.push({ r, xv, yv });
    else if (xv) out.stripX.push({ r, xv });
    else if (yv) out.stripY.push({ r, yv });
    else out.none.push(r);
  }
  out.stripX.sort((a, b) => a.xv.value - b.xv.value);
  out.stripY.sort((a, b) => a.yv.value - b.yv.value);
  return out;
}

// Etichette: i riferimenti per primi (mai scartati), le altre solo se trovano un posto libero dentro i limiti.
export function placeLabels(points, bounds) {
  const placed = [], out = [];
  const rectOf = (p, c) => (c.anchor === 'start' ? { x0: c.x, x1: c.x + p.w, y0: c.y - 11, y1: c.y + 3 } : { x0: c.x - p.w, x1: c.x, y0: c.y - 11, y1: c.y + 3 });
  const inside = (r) => r.x0 >= 0 && r.y0 >= 0 && r.x1 <= bounds.w && r.y1 <= bounds.h;
  const hit = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
  for (const p of [...points.filter((q) => q.ref), ...points.filter((q) => !q.ref)]) {
    const cands = [{ anchor: 'start', x: p.x + 11, y: p.y - 9 }, { anchor: 'start', x: p.x + 11, y: p.y + 16 }, { anchor: 'end', x: p.x - 11, y: p.y - 9 }, { anchor: 'end', x: p.x - 11, y: p.y + 16 }];
    let pick = cands.find((c) => { const r = rectOf(p, c); return inside(r) && !placed.some((q) => hit(q, r)); });
    if (!pick && p.ref) pick = cands.find((c) => inside(rectOf(p, c))) || cands[0];
    if (pick) { placed.push(rectOf(p, pick)); out.push({ id: p.id, x: pick.x, y: pick.y, anchor: pick.anchor }); }
  }
  return out;
}

// ---------- disegno ----------
const mapState = { preset: 'rs', brands: [], gauge: '', shape: '', target: true, onlyMeasured: false, onlyGood: false, pinned: null };
let mapW = 900, mapH = 600; // tela più stretta su telefono, così il testo resta leggibile
const MAP_COLOR = { equipped: 'var(--s-target)', liked: 'var(--s-liked)', disliked: 'var(--s-disliked)', target: 'var(--s-target)', other: 'var(--s-other)' };
const MAP_ORDER = { other: 0, target: 1, disliked: 2, liked: 3, equipped: 4 };
let mapDots = [], mapPts = [], mapCtx = null;

function mapTicks(min, max, n = 5) {
  const span = max - min || 1, step0 = span / n, mag = 10 ** Math.floor(Math.log10(step0));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((x) => x >= step0);
  const out = [];
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) out.push(+v.toFixed(6));
  return out;
}
const mapFmt = (v, a) => `${v.est ? '≈ ' : ''}${fmt(v.value, a.d)}`;
const mapCat = (ctx, r) => (r.id === ctx.state().equipped.id ? 'equipped' : ctx.state().liked.includes(r.id) ? 'liked' : ctx.state().disliked.includes(r.id) ? 'disliked' : r.is_target ? 'target' : 'other');

function mapStatus(ctx, res) {
  const incomplete = res.stripX.length + res.stripY.length;
  $('#map-status').innerHTML = `<b>${res.pts.length}</b> corde nel grafico${incomplete ? `, altre <b>${incomplete}</b> con un solo dato (nelle fasce)` : ''}${res.none.length ? `, <b>${res.none.length}</b> senza nessuno dei due dati` : ''}, ${res.hidden.length} nascoste dai filtri.`;
}

function mapTable(res, ax, ay) {
  const row = (r, xv, yv) => `<tr><td><button type="button" class="rowlink" data-open="${esc(r.id)}">${esc(fullName(r))}</button></td><td class="n">${xv ? esc(mapFmt(xv, ax)) : 'manca'}</td><td class="n">${yv ? esc(mapFmt(yv, ay)) : 'manca'}</td></tr>`;
  $('#map-table-body').innerHTML = `<thead><tr><th>Corda</th><th class="n">${esc(ax.short)}</th><th class="n">${esc(ay.short)}</th></tr></thead><tbody>`
    + res.pts.map((p) => row(p.r, p.xv, p.yv)).join('') + res.stripX.map((p) => row(p.r, p.xv, null)).join('') + res.stripY.map((p) => row(p.r, null, p.yv)).join('') + '</tbody>';
}

function mapNearest(ev, px) {
  const svg = $('#scatter'), box = svg.getBoundingClientRect(), k = box.width / mapW;
  const x = (ev.clientX - box.left) / k, y = (ev.clientY - box.top) / k;
  let best = null, bd = px / k;
  for (const d of mapDots) { const dist = Math.hypot(d.cx - x, d.cy - y); if (dist <= bd) { bd = dist; best = d; } }
  return best;
}

function mapShow(id, pinned) {
  const ctx = mapCtx, r = ctx.BY_ID[id], d = mapDots.find((x) => x.id === id); if (!r || !d) return;
  const tip = $('#tip'), svg = $('#scatter'), box = svg.getBoundingClientRect(), k = box.width / mapW;
  tip.innerHTML = shortCardHtml(r, ctx.cardCtx(r));
  tip.hidden = false; tip.classList.toggle('pinned', !!pinned);
  const tw = tip.offsetWidth, th = tip.offsetHeight;
  tip.style.left = `${Math.max(4, Math.min(d.cx * k + 14, box.width - tw - 4))}px`;
  tip.style.top = `${d.cy * k - th - 10 >= 4 ? d.cy * k - th - 10 : Math.min(d.cy * k + 14, Math.max(4, box.height - th - 4))}px`;
  const g = $('#map-err'), p = mapPts.find((x) => x.r.id === id);
  g.innerHTML = p ? [p.xv.est && p.xv.low != null ? `<line class="err" x1="${p.sx(p.xv.low)}" x2="${p.sx(p.xv.high)}" y1="${d.cy}" y2="${d.cy}"/>` : '', p.yv.est && p.yv.low != null ? `<line class="err" x1="${d.cx}" x2="${d.cx}" y1="${p.sy(p.yv.low)}" y2="${p.sy(p.yv.high)}"/>` : ''].join('') : '';
  svg.querySelectorAll('.dot.sel').forEach((x) => x.classList.remove('sel'));
  const el = svg.querySelector(`.dot[data-id="${id}"]`); if (el) el.classList.add('sel');
}
function mapHide() {
  $('#tip').hidden = true; $('#tip').classList.remove('pinned');
  $('#map-err').innerHTML = '';
  $('#scatter').querySelectorAll('.dot.sel').forEach((x) => x.classList.remove('sel'));
}
function mapActivate(id) {
  if (mapState.pinned === id) { mapState.pinned = null; mapHide(); mapCtx.openSheet(id); return; }
  mapState.pinned = id; mapShow(id, true);
}
function mapNeighbor(cur, key) {
  const dx = key === 'ArrowRight' ? 1 : key === 'ArrowLeft' ? -1 : 0, dy = key === 'ArrowDown' ? 1 : key === 'ArrowUp' ? -1 : 0;
  let best = null, bd = Infinity;
  for (const d of mapDots) {
    if (d.id === cur.id) continue;
    const vx = d.cx - cur.cx, vy = d.cy - cur.cy, along = vx * dx + vy * dy;
    if (along <= 0) continue;
    const cost = along + 2 * (Math.abs(vx * dy) + Math.abs(vy * dx));
    if (cost < bd) { bd = cost; best = d; }
  }
  return best;
}

export function renderMap(ctx) {
  mapCtx = ctx;
  [mapW, mapH] = window.matchMedia('(max-width: 760px)').matches ? [480, 560] : [900, 600];
  const s = ctx.state(), [kx, ky] = PRESETS[mapState.preset], ax = AXES[kx], ay = AXES[ky];
  document.querySelectorAll('#map-presets [data-axes]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.axes === mapState.preset)));
  const brands = [...new Set(ctx.ALL.filter((r) => !mapState.target || r.is_target).map((r) => r.brand))].sort();
  $('#map-chips').innerHTML = brands.map((b) => `<button type="button" class="chipbtn" data-brand="${esc(b)}" aria-pressed="${mapState.brands.includes(b)}">${esc(b)}</button>`).join('');
  const res = mapPoints(ctx.ALL, { x: kx, y: ky, brands: mapState.brands, gauge: mapState.gauge, shape: mapState.shape, target: mapState.target, onlyMeasured: mapState.onlyMeasured, onlyGood: mapState.onlyGood },
    { equippedId: s.equipped.id, liked: s.liked, pairingOf: ctx.pairingOf });
  mapStatus(ctx, res);
  mapTable(res, ax, ay);
  $('#map-legend').innerHTML = [['equipped', 'Montata (anello)'], ['liked', 'Tue preferite'], ['disliked', 'Non gradite'], ['target', 'Marche valutate'], ['other', 'Concorrenti']].map(([c, l]) => `<span><i class="sw" style="background:${MAP_COLOR[c]}"></i>${l}</span>`).join('')
    + '<span><i class="sw hollow"></i>Stimato (barra d\'errore al passaggio)</span><span><i class="sw hollow dashed"></i>Da modello, bassa affidabilità</span>';
  const svg = $('#scatter');
  svg.setAttribute('viewBox', `0 0 ${mapW} ${mapH}`);
  mapDots = []; mapPts = [];
  const xs = [...res.pts.map((p) => p.xv.value), ...res.stripX.map((p) => p.xv.value)], ys = [...res.pts.map((p) => p.yv.value), ...res.stripY.map((p) => p.yv.value)];
  if (!xs.length || !ys.length) { svg.innerHTML = `<text x="${mapW / 2}" y="${mapH / 2}" text-anchor="middle">Nessuna corda con questi dati e questi filtri</text><g id="map-err"></g>`; mapHide(); return; }
  const L = res.stripY.length ? 112 : 64, R = 18, T = 34, B = res.stripX.length ? 98 : 54;
  const pad = (a, b) => { const sp = (b - a) * 0.06 || 1; return [a - sp, b + sp]; };
  const [x0, x1] = pad(Math.min(...xs), Math.max(...xs)), [y0, y1] = pad(Math.min(...ys), Math.max(...ys));
  const sx = (v) => Math.max(L, Math.min(mapW - R, L + (v - x0) / (x1 - x0) * (mapW - L - R))), sy = (v) => Math.max(T, Math.min(mapH - B, mapH - B - (v - y0) / (y1 - y0) * (mapH - T - B)));
  let g = mapTicks(x0, x1).map((v) => `<line class="grid" x1="${sx(v)}" x2="${sx(v)}" y1="${T}" y2="${mapH - B}"/><text x="${sx(v)}" y="${mapH - B + 16}" text-anchor="middle">${fmt(v, v % 1 ? 1 : 0)}</text>`).join('')
    + mapTicks(y0, y1).map((v) => `<line class="grid" x1="${L}" x2="${mapW - R}" y1="${sy(v)}" y2="${sy(v)}"/><text x="${L - 8}" y="${sy(v) + 4}" text-anchor="end">${fmt(v, v % 1 ? 1 : 0)}</text>`).join('');
  if (mapState.preset === 'rs') g += `<text class="zone" x="${L + 4}" y="${T - 12}">VIVE DA SPIN</text><text class="zone" x="${mapW - R}" y="${T - 12}" text-anchor="end">COMPATTE DA SPIN</text>`;
  g += `<text class="axis-title" x="${(L + mapW - R) / 2}" y="${mapH - 10}" text-anchor="middle">${esc(ax.label)} ${esc(ax.hint)}</text><text class="axis-title" transform="translate(14 ${(T + mapH - B) / 2}) rotate(-90)" text-anchor="middle">${esc(ay.label)} ${esc(ay.hint)}</text>`;
  const dot = (r, xv, yv, cx, cy, miss) => {
    const cat = mapCat(ctx, r), est = (xv && xv.est) || (yv && yv.est), model = (xv && xv.model) || (yv && yv.model), c = MAP_COLOR[cat], rad = cat === 'equipped' || cat === 'liked' ? 9 : 7;
    mapDots.push({ id: r.id, cx, cy });
    const vals = `${xv ? `${ax.short} ${mapFmt(xv, ax)}` : `${ax.short} non disponibile`}, ${yv ? `${ay.short} ${mapFmt(yv, ay)}` : `${ay.short} non disponibile`}`;
    return `${cat === 'equipped' ? `<circle class="ring" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${rad + 6}"/>` : ''}<circle class="dot${est || miss ? ' hollow' : ''}${model ? ' model' : ''}${miss ? ' miss' : ''}" data-id="${esc(r.id)}" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${rad}" ${est || miss ? `style="stroke:${c}"` : `fill="${c}"`} tabindex="0" role="button" aria-label="${esc(`${fullName(r)}: ${vals}`)}"/>`;
  };
  if (res.stripX.length) {
    const yy = mapH - B + 30;
    g += `<rect class="strip" x="${L}" y="${yy}" width="${mapW - L - R}" height="52" rx="6"/><text class="strip-lbl" x="${L + 6}" y="${yy + 12}">${esc(ay.short)} non disponibile (${res.stripX.length})</text>`
      + res.stripX.map((p, i) => dot(p.r, p.xv, null, sx(p.xv.value), yy + 26 + (i % 3) * 10, true)).join('');
  }
  if (res.stripY.length) {
    g += `<rect class="strip" x="12" y="${T}" width="72" height="${mapH - B - T}" rx="6"/><text class="strip-lbl" transform="translate(24 ${mapH - B - 8}) rotate(-90)">${esc(ax.short)} non disponibile (${res.stripY.length})</text>`
      + res.stripY.map((p, i) => dot(p.r, null, p.yv, 46 + (i % 3) * 12, sy(p.yv.value), true)).join('');
  }
  const labelPts = [];
  for (const p of [...res.pts].sort((a, b) => MAP_ORDER[mapCat(ctx, a.r)] - MAP_ORDER[mapCat(ctx, b.r)])) {
    const cx = sx(p.xv.value), cy = sy(p.yv.value), cat = mapCat(ctx, p.r);
    g += dot(p.r, p.xv, p.yv, cx, cy, false);
    mapPts.push({ ...p, sx, sy });
    if (cat === 'equipped' || cat === 'liked') { const text = `${cat === 'equipped' ? 'montata · ' : '★ '}${p.r.model} ${mmOf(p.r)}`; labelPts.push({ id: p.r.id, x: cx, y: cy, text, w: text.length * 6.4 + 6, ref: true }); }
  }
  g += placeLabels(labelPts, { w: mapW, h: mapH }).map((l) => `<text class="lbl" x="${l.x.toFixed(1)}" y="${l.y.toFixed(1)}" text-anchor="${l.anchor}">${esc(labelPts.find((q) => q.id === l.id).text)}</text>`).join('');
  svg.innerHTML = g + '<g id="map-err"></g>';
  if (mapState.pinned && mapDots.some((d) => d.id === mapState.pinned)) mapShow(mapState.pinned, true); else { mapState.pinned = null; mapHide(); }
}

export function initMap(ctx) {
  const gauges = [...new Set(ctx.ALL.map((r) => r.gauge_label).filter(Boolean))].sort();
  $('#map-gauge').insertAdjacentHTML('beforeend', gauges.map((x) => `<option>${esc(x)}</option>`).join(''));
  const shapes = [...new Set(ctx.ALL.map((r) => r.shape).filter(Boolean))].sort();
  $('#map-shape').insertAdjacentHTML('beforeend', shapes.map((x) => `<option value="${esc(x)}">${esc(SHAPES[x] || x)}</option>`).join(''));
  const redo = () => { mapState.pinned = null; renderMap(ctx); };
  $('#map-presets').addEventListener('click', (e) => { const b = e.target.closest('[data-axes]'); if (b) { mapState.preset = b.dataset.axes; redo(); } });
  $('#map-chips').addEventListener('click', (e) => { const b = e.target.closest('[data-brand]'); if (!b) return; const x = b.dataset.brand; mapState.brands = mapState.brands.includes(x) ? mapState.brands.filter((y) => y !== x) : [...mapState.brands, x]; redo(); });
  $('#map-gauge').addEventListener('change', (e) => { mapState.gauge = e.target.value; redo(); });
  $('#map-shape').addEventListener('change', (e) => { mapState.shape = e.target.value; redo(); });
  $('#map-target').addEventListener('change', (e) => { mapState.target = e.target.checked; mapState.brands = []; redo(); });
  $('#map-measured').addEventListener('change', (e) => { mapState.onlyMeasured = e.target.checked; redo(); });
  $('#map-good').addEventListener('change', (e) => { mapState.onlyGood = e.target.checked; redo(); });
  window.matchMedia('(max-width: 760px)').addEventListener('change', () => { if (!$('#mappa').hidden) renderMap(ctx); });
  const svg = $('#scatter');
  svg.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || mapState.pinned) return;
    const d = mapNearest(e, 14);
    if (d) mapShow(d.id, false); else mapHide();
  });
  svg.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && !mapState.pinned) mapHide(); });
  svg.addEventListener('click', (e) => {
    const d = mapNearest(e, 26);
    if (d) mapActivate(d.id); else { mapState.pinned = null; mapHide(); }
  });
  svg.addEventListener('focusin', (e) => { const el = e.target.closest('.dot'); if (el && !mapState.pinned) mapShow(el.dataset.id, false); });
  svg.addEventListener('focusout', () => { if (!mapState.pinned) mapHide(); });
  svg.addEventListener('keydown', (e) => {
    const el = e.target.closest('.dot'); if (!el) return;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); mapActivate(el.dataset.id); return; }
    if (e.key === 'Escape') { mapState.pinned = null; mapHide(); return; }
    if (e.key.startsWith('Arrow')) {
      const cur = mapDots.find((d) => d.id === el.dataset.id), nx = cur && mapNeighbor(cur, e.key);
      if (nx) { e.preventDefault(); svg.querySelector(`.dot[data-id="${nx.id}"]`).focus(); }
    }
  });
}
