// Mappa: logica pura (assi, filtri, etichette senza sovrapposizioni). Il disegno SVG e gli eventi sono nel Task 15.
const val = (v) => v !== null && v !== undefined;

export const AXES = {
  stiffness: { label: 'Rigidità (lb/in, scala TWU)', short: 'Rigidità', d: 0, hint: '→ più rigida',
    get: (r) => (r.stiffness && val(r.stiffness.value_lbin) ? { value: r.stiffness.value_lbin, low: r.stiffness.low, high: r.stiffness.high, est: r.stiffness.kind !== 'misurata', model: r.stiffness.kind === 'modello' } : null) },
  spin: { label: 'Spin (scala TWU 0–10)', short: 'Spin', d: 1, hint: '→ più spin',
    get: (r) => (r.spin && val(r.spin.value) ? { value: r.spin.value, low: r.spin.low, high: r.spin.high, est: r.spin.kind !== 'misurato', model: r.spin.kind === 'modello' } : null) },
  durability: { label: 'Tenuta (posizione 0–100 tra le corde)', short: 'Tenuta', d: 0, hint: '→ tiene meglio',
    get: (r) => (val(r.derived.dims.durability) ? { value: r.derived.dims.durability, est: false, model: false } : null) },
  control: { label: 'Controllo ◄► potenza (indice 0–100)', short: 'Controllo', d: 0, hint: '→ più controllo',
    get: (r) => (val(r.derived.dims.control) ? { value: r.derived.dims.control, est: false, model: false } : null) },
};
export const PRESETS = { rs: ['stiffness', 'spin'], ts: ['durability', 'spin'], cs: ['control', 'spin'] };

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
