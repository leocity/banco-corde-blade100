// Righelli della mappa (Scienza): una grandezza misurata per righello, una sola fonte. Calcoli puri.
export function scaleOf(values) {
  const lo = Math.min(...values), hi = Math.max(...values);
  const pad = (hi - lo || Math.abs(hi) || 1) * 0.06;
  const min = lo - pad, max = hi + pad;
  return { min, max, x: (v) => ((v - min) / (max - min)) * 100 };
}

// Etichette su più righe senza sovrapposizioni. items: [{id, x (0–100), label}] in ordine di importanza
// (la prima è la montata). width in px, charW larghezza media di un carattere. Chi non trova posto resta senza (lane null).
export function layoutLabels(items, width, charW = 7, lanes = 3, gap = 6) {
  const used = Array.from({ length: lanes }, () => []);
  return items.map((it) => {
    const w = Math.min(width, it.label.length * charW + 8);
    const cx = (it.x / 100) * width;
    const left = Math.max(0, Math.min(width - w, cx - w / 2));
    const right = left + w;
    for (let lane = 0; lane < lanes; lane += 1) {
      if (used[lane].every(([l, r]) => right + gap <= l || left >= r + gap)) {
        used[lane].push([left, right]);
        return { ...it, lane, left, right };
      }
    }
    return { ...it, lane: null, left, right };
  });
}

export function nearest(points, x) {
  let best = null;
  for (const p of points) if (!best || Math.abs(p.x - x) < Math.abs(best.x - x)) best = p;
  return best;
}
