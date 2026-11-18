// ===== Ibridi: costruttore V/O, mappa rigidità-tenuta, fisica con dati, verifica fonti (aggiunto 17/11/2026) =====
const HY_BASE = { v: 'toroline-o-toro-17', o: 'toroline-o-toro-17', kv: 22, ko: 21 };
const HY_EXTRAS = [
  { id: 'x-octa', brand: 'Toroline', model: 'O-Toro Octa', gauge_mm: 1.25, shape: 'OCT', note: 'Flex «Tour» (più rigida per controllo e durata, dichiarato). Ottagonale: lancio più basso dichiarato dal produttore.', src: 'https://toroline.com/products/o-toro-octa-prototype' },
  { id: 'x-snap-tf', brand: 'Toroline', model: 'O-Toro Snap Tour Flex', gauge_mm: 1.25, shape: 'RND', note: 'Versione più rigida della Snap. Recensioni discordanti sul comfort.', src: 'https://www.tenniswarehouse-europe.com/catpage-TOROSTRI-IT.html' },
  { id: 'x-tour-120', brand: 'Toroline', model: 'O-Toro Tour', gauge_mm: 1.20, shape: 'HEX', note: 'Calibro sottile della Tour: misurata solo la 1,23.', src: 'https://toroline.com/products/o-toro-tour' },
  { id: 'x-truffle', brand: 'Toroline', model: 'Truffle X', gauge_mm: 1.30, shape: 'RND', note: 'Pensata per le orizzontali (set Stevie con O-Toro Tour).', src: 'https://www.tenniswarehouse-europe.com/catpage-TOROSTRI-IT.html' },
  { id: 'x-hg-dr', brand: 'Solinco', model: 'Hyper-G Diamond Rough', gauge_mm: 1.20, shape: 'SQ', note: 'Metà del nuovo Hyper-Con (13/11/2026). Disponibilità da sola ancora incerta.', src: 'https://10sballs.com/2026/11/13/tennis-strings-by-solinco-look-at-their-new-hyper-con-10sballs-from-wta-indian-wells/' },
];
const HY_SETUPS = [
  { k: 'A', v: 'toroline-o-toro-tour-17', o: 'toroline-o-toro-17', kv: 23, ko: 22, conf: 'alta', why: 'Verticale più rigida (+31% TWU) e più stabile (25% contro 44% di perdita); tieni la tua O-Toro in orizzontale.' },
  { k: 'B', v: 'toroline-o-toro-tour-17', o: 'toroline-o-toro-snap-16l', kv: 23, ko: 22, conf: 'media', why: 'Come A con orizzontale tonda (set Dreddy, 14,90 € TWE). Il dato TWU della Snap è in dubbio: va provato.' },
  { k: 'C', v: 'solinco-confidential-16l', o: 'toroline-o-toro-17', kv: 23, ko: 22, conf: 'media', why: 'La verticale con la miglior tenuta misurata (22%, sul calibro 1,30). O-Toro riporta spin e feel.' },
  { k: 'D', v: 'x-octa', o: 'toroline-a5-17', kv: 23, ko: 22, conf: 'bassa', why: 'Corde Toroline più nuove: ottagonale «Tour» per lanciare basso, A5 tonda e scorrevole. Octa senza misure.' },
  { k: 'E', v: 'solinco-confidential-17', o: 'x-hg-dr', kv: 23, ko: 22, conf: 'bassa', why: 'Hyper-Con: Confidential in verticale è la versione da controllo indicata da Solinco. Nessun dato indipendente.' },
  { k: 'F', v: 'toroline-caviar-17l', o: 'toroline-o-toro-snap-16l', kv: 23, ko: 22, conf: 'media', why: 'Caviar 1,24 è tra le Toroline più ferme (Racketpedia 1,00 kg/mm) e tiene bene la tensione (dichiarato).' },
  { k: 'G', v: 'x-tour-120', o: 'toroline-o-toro-17', kv: 23, ko: 22, conf: 'media', why: 'Variante sottile di A: più morso e comfort, meno durata. La 1,20 non è misurata.' },
];
const HY_KG = Array.from({ length: 17 }, (_, i) => 20 + i * 0.5);
const HY_SRC = {
  twu: 'https://twu.tennis-warehouse.com/learning_center/reporter2.php',
  spin: 'https://twu.tennis-warehouse.com/learning_center/spinandstiffness.php',
  bc05: 'https://lida.sport-iat.de/twm/Record/4010538',
  bc08: 'https://opus.lib.uts.edu.au/handle/10453/9781',
  cb01: 'https://www.physics.usyd.edu.au/~cross/CrossBower.pdf',
  ping: 'https://www.physics.usyd.edu.au/~cross/StringTension.pdf',
  heat: 'https://twu.tennis-warehouse.com/learning_center/temperature.php',
  tour: 'https://toroline.com/products/o-toro-tour',
  blade: 'https://www.tenniswarehouse-europe.com/Wilson_Blade_100_v9_Racket/descpageRCWILSON-WB1009-EN.html',
  a5: 'https://www.racketpedia.com/el-GR/tennis-string/toroline-a5-carbon-gray-125',
  caviar: 'https://toroline.com/products/caviar-1',
  twe: 'https://www.tenniswarehouse-europe.com/catpage-TOROSTRI-IT.html',
  cat: 'https://toroline.com/collections/single-sets',
  hcon: 'https://10sballs.com/2026/11/13/tennis-strings-by-solinco-look-at-their-new-hyper-con-10sballs-from-wta-indian-wells/',
};
const hyLink = (k, t) => `<a href="${HY_SRC[k]}" target="_blank" rel="noopener">${t}</a>`;
let hy = { ...HY_BASE, pick: 'v' };
try { const s = JSON.parse(localStorage.getItem('banco-corde:ibrido') || 'null'); if (s && s.v && s.o) hy = { ...hy, ...s }; } catch { /* nessun archivio */ }
const hySave = () => { try { localStorage.setItem('banco-corde:ibrido', JSON.stringify({ v: hy.v, o: hy.o, kv: hy.kv, ko: hy.ko })); } catch { /* nessun archivio */ } };

function hyRec(ctx, id) {
  const r = ctx.BY_ID[id];
  if (r) {
    const st = r.stiffness || {}, t = r.twu || {};
    const kMeas = st.kind === 'misurata';
    const tl = t.tension_loss_pct != null ? { v: t.tension_loss_pct, exact: t.match === 'exact' } : null;
    const sp = r.spin && ['misurato', 'parente'].includes(r.spin.kind) ? { v: r.spin.value, exact: r.spin.kind === 'misurato' } : null;
    return { id, name: `${r.brand} ${r.model}`, mm: r.gauge_mm, shape: r.shape, k: st.value_lbin ?? null, kMark: st.value_lbin == null ? '○' : kMeas ? '●' : '◐', kKind: st.kind || 'manca', tl, sp, rp: r.rpedia ? r.rpedia.static_stiffness_kgmm : null, extra: false };
  }
  const x = HY_EXTRAS.find((e) => e.id === id);
  if (!x) return null;
  return { id, name: `${x.brand} ${x.model}`, mm: x.gauge_mm, shape: x.shape, k: null, kMark: '○', kKind: 'manca', tl: null, sp: null, rp: null, extra: true, note: x.note, src: x.src };
}
const hyShapeIt = (s) => ({ RND: 'tonda', HEX: 'esagonale', OCT: 'ottagonale', SQ: 'sagomata (4 lati)', PENT: 'pentagonale' }[s] || 'forma n.d.');
const hyF = (v, d = 0) => (v == null || Number.isNaN(v) ? '—' : NF(d).format(v));
const hyLb = (kg) => NF(1).format(kg * 2.2046);

function hyOptions(ctx, sel) {
  const groups = {};
  for (const r of ctx.ALL) (groups[r.brand] ||= []).push(r);
  const order = ['Toroline', 'Solinco', 'Re-String', ...Object.keys(groups).filter((b) => !['Toroline', 'Solinco', 'Re-String'].includes(b)).sort()];
  const opt = (id, label) => `<option value="${esc(id)}"${id === sel ? ' selected' : ''}>${esc(label)}</option>`;
  let h = `<optgroup label="Nuove, senza dati di laboratorio">${HY_EXTRAS.map((x) => opt(x.id, `${x.model} ${NF(2).format(x.gauge_mm)} ○`)).join('')}</optgroup>`;
  for (const b of order) {
    if (!groups[b]) continue;
    h += `<optgroup label="${esc(b)}">${groups[b].slice().sort((a, c) => (a.model + a.gauge_mm).localeCompare(c.model + c.gauge_mm)).map((r) => opt(r.id, `${r.model} ${NF(2).format(r.gauge_mm || 0)}${r.stiffness && r.stiffness.kind === 'misurata' ? ' ●' : ''}`)).join('')}</optgroup>`;
  }
  return h;
}

function hyCalc(ctx, s) {
  const V = hyRec(ctx, s.v), O = hyRec(ctx, s.o), B = hyRec(ctx, HY_BASE.v);
  const both = (a, b, f) => (a != null && b != null ? f(a, b) : null);
  const bed = both(V.k, O.k, (a, b) => (16 * a + 19 * b) / 35);
  const tl = both(V.tl && V.tl.v, O.tl && O.tl.v, (a, b) => (16 * a + 19 * b) / 35);
  const kgMean = (16 * s.kv + 19 * s.ko) / 35, baseKg = (16 * HY_BASE.kv + 19 * HY_BASE.ko) / 35;
  const dK = V.k != null ? (V.k / B.k - 1) * 100 : null;
  const dKg = kgMean - baseKg;
  const dTl = V.tl ? V.tl.v - B.tl.v : null;
  let pts = 0, known = 0;
  if (dK != null) { known++; pts += dK > 8 ? 1 : dK < -8 ? -1 : 0; }
  known++; pts += dKg >= 0.75 ? 1 : dKg <= -0.75 ? -1 : 0;
  if (dTl != null) { known++; pts += dTl < -6 ? 1 : dTl > 6 ? -1 : 0; }
  const verdict = pts >= 2 ? ['più controllo, netto', 'ok'] : pts === 1 ? ['un po\' più controllo', 'ok'] : pts === 0 ? ['simile al tuo O-Toro 22/21', ''] : ['meno controllo', 'warn'];
  const warns = [];
  if (s.kv - s.ko > 2) warns.push('Differenziale sopra 2 kg: in un 16×19 aperto le verticali si muovono troppo, il lancio sale e lo spin può calare (TWU).');
  if (s.ko > s.kv) warns.push('Orizzontali più tese delle verticali: insolito, frena lo scorrimento delle verticali.');
  if (Math.min(s.kv, s.ko) < 22) warns.push('Sotto il range Wilson della Blade 100 v9 (22–27 kg): più lancio e palle lunghe sono l\'esito atteso.');
  if (V.k != null && O.k != null && O.k > V.k + 15) warns.push('L\'orizzontale è più rigida della verticale: di solito si fa il contrario, per lasciare scorrere le verticali.');
  if (O.shape && O.shape !== 'RND' && O.shape !== 'HEX' && O.k != null && O.k > 200) warns.push('Orizzontale sagomata e rigida: più attrito corda-corda, meno snapback.');
  return { V, O, bed, tl, kgMean, dK, dKg, dTl, verdict, known, warns };
}

function hyRacketSvg(c, s) {
  const W = 220, H = 290, cx = 110, cy = 145, rx = 92, ry = 128;
  const sw = (mm) => (1.2 + (mm - 1.15) * 9).toFixed(2);
  const inside = (x) => ry * Math.sqrt(Math.max(0, 1 - ((x - cx) / rx) ** 2));
  const insideY = (y) => rx * Math.sqrt(Math.max(0, 1 - ((y - cy) / ry) ** 2));
  let mains = '', crosses = '';
  for (let i = 0; i < 16; i++) { const x = cx - rx + (2 * rx * (i + 0.5)) / 16; const h = inside(x) - 3; mains += `<line x1="${x.toFixed(1)}" y1="${(cy - h).toFixed(1)}" x2="${x.toFixed(1)}" y2="${(cy + h).toFixed(1)}"/>`; }
  for (let j = 0; j < 19; j++) { const y = cy - ry + (2 * ry * (j + 0.5)) / 19; const w = insideY(y) - 3; crosses += `<line x1="${(cx - w).toFixed(1)}" y1="${y.toFixed(1)}" x2="${(cx + w).toFixed(1)}" y2="${y.toFixed(1)}"/>`; }
  return `<svg viewBox="0 0 ${W} ${H}" class="hy-racket" role="img" aria-label="Piatto 16x19: verticali ${esc(c.V.name)} a ${hyF(s.kv, 1)} kg, orizzontali ${esc(c.O.name)} a ${hyF(s.ko, 1)} kg">
    <g stroke="var(--s-c3)" stroke-width="${sw(c.O.mm || 1.25)}" stroke-linecap="round">${crosses}</g>
    <g stroke="var(--s-c1)" stroke-width="${sw(c.V.mm || 1.25)}" stroke-linecap="round">${mains}</g>
    <ellipse cx="${cx}" cy="${cy}" rx="${rx + 4}" ry="${ry + 4}" fill="none" stroke="var(--fg-2)" stroke-width="7"/>
  </svg>`;
}

function hyMeter(label, val, min, max, marks, unit, note) {
  const pct = (x) => Math.max(0, Math.min(100, ((x - min) / (max - min)) * 100));
  const m = marks.map((k) => `<span class="hy-mark ${k.cls || ''}" style="left:${pct(k.x)}%" title="${esc(k.t)}"></span>`).join('');
  const band = marks.filter((k) => k.band).map((k) => `<span class="hy-band" style="left:${pct(k.band[0])}%;width:${pct(k.band[1]) - pct(k.band[0])}%" title="${esc(k.t)}"></span>`).join('');
  return `<div class="hy-meter"><div class="hy-mhead"><span>${label}</span><b class="num">${val == null ? '—' : esc(val)}${val == null ? '' : unit}</b></div>
    <div class="hy-track">${band}${m}</div>${note ? `<p class="small muted">${note}</p>` : ''}</div>`;
}

function hyBuilderHtml(ctx) {
  const c = hyCalc(ctx, hy);
  const kgSel = (id, v) => `<select id="${id}" class="hy-kg">${HY_KG.map((k) => `<option value="${k}"${k === v ? ' selected' : ''}>${NF(1).format(k)} kg · ${hyLb(k)} lb</option>`).join('')}</select>`;
  const side = (R, role, cls) => `<div class="hy-side ${cls}">
      <p class="hy-role">${role}</p><p class="hy-name">${esc(R.name)} <span class="muted">${NF(2).format(R.mm || 0)} mm</span></p>
      <dl class="kv"><dt>Rigidità ${R.kMark}</dt><dd>${R.k == null ? '—' : `${hyF(R.k)} lb/in`}</dd>
      <dt>Perdita tensione</dt><dd>${R.tl ? `${hyF(R.tl.v, 1)}%${R.tl.exact ? '' : ' ◐'}` : '—'}</dd>
      <dt>Spin potential</dt><dd>${R.sp ? `${hyF(R.sp.v, 1)}${R.sp.exact ? '' : ' ◐'}` : '—'}</dd>
      <dt>Forma</dt><dd>${hyShapeIt(R.shape)}</dd></dl>
      ${R.extra ? `<p class="small muted">○ ${esc(R.note)} <a href="${R.src}" target="_blank" rel="noopener">fonte</a></p>` : R.kMark === '◐' ? `<p class="small muted">◐ rigidità stimata (${esc(R.kKind)}), non misurata su questo calibro.</p>` : ''}
    </div>`;
  const tMarks = [{ band: [22, 27], t: 'Range Wilson 22–27 kg' }, { x: 23.1, t: 'Riferimento TWU 51 lb', cls: 'ref' }, { x: (16 * 22 + 19 * 21) / 35, t: 'Il tuo O-Toro 22/21', cls: 'base' }, { x: c.kgMean, t: 'Questo setup', cls: 'cur' }];
  const kMarks = [{ band: [190, 225], t: 'La tua finestra: rigidità media 190–225' }, { x: 165.7, t: 'O-Toro (base)', cls: 'base' }, { x: 233.7, t: 'RPM Blast 17 (non gradita)', cls: 'bad' }];
  if (c.bed != null) kMarks.push({ x: c.bed, t: 'Questo setup', cls: 'cur' });
  const tlMarks = [{ x: 44.4, t: 'O-Toro (base)', cls: 'base' }, { x: 22.2, t: 'Confidential 1,30', cls: 'ref' }];
  if (c.tl != null) tlMarks.push({ x: c.tl, t: 'Questo setup', cls: 'cur' });
  return `<div class="hy-build">
    <div class="hy-controls">
      <label>Verticali (mains) <select id="hy-v">${hyOptions(ctx, hy.v)}</select></label>
      <label>kg verticali ${kgSel('hy-kv', hy.kv)}</label>
      <label>Orizzontali (crosses) <select id="hy-o">${hyOptions(ctx, hy.o)}</select></label>
      <label>kg orizzontali ${kgSel('hy-ko', hy.ko)}</label>
      <div class="chips" role="group" aria-label="Setup pronti">${HY_SETUPS.map((p) => `<button type="button" class="btn hy-preset${p.v === hy.v && p.o === hy.o && p.kv === hy.kv && p.ko === hy.ko ? ' on' : ''}" data-hy-load="${p.k}">${p.k}</button>`).join('')}<button type="button" class="btn hy-preset" data-hy-load="base">Attuale 22/21</button><button type="button" class="btn hy-preset" data-hy-swap>⇄ inverti</button></div>
    </div>
    <div class="hy-visual">
      ${hyRacketSvg(c, hy)}
      <div class="hy-legend small"><span><i style="background:var(--s-c1)"></i>verticali ${hyF(hy.kv, 1)} kg</span><span><i style="background:var(--s-c3)"></i>orizzontali ${hyF(hy.ko, 1)} kg</span><span class="muted">spessore = calibro</span></div>
    </div>
    <div class="hy-sides">${side(c.V, 'Verticali', 'v')}${side(c.O, 'Orizzontali', 'o')}</div>
    <div class="hy-out">
      <p class="hy-verdict ${c.verdict[1]}">Rispetto al tuo O-Toro 22/21: <b>${c.verdict[0]}</b></p>
      <ul class="small hy-why">
        <li>Rigidità verticale: ${c.dK == null ? 'non misurata (○), quindi non conta' : `<b>${c.dK >= 0 ? '+' : ''}${hyF(c.dK)}%</b>`}</li>
        <li>Tensione media: <b>${c.dKg >= 0 ? '+' : ''}${NF(1).format(c.dKg)} kg</b></li>
        <li>Perdita di tensione della verticale: ${c.dTl == null ? 'manca il dato' : `<b>${c.dTl >= 0 ? '+' : ''}${hyF(c.dTl, 1)} punti</b>`}</li>
      </ul>
      ${hyMeter('Tensione media del letto', NF(1).format(c.kgMean), 19, 28, tMarks, ' kg', 'Banda verde: range Wilson. Tacca grigia: riferimento TWU (51 lb).')}
      ${hyMeter('Rigidità media del letto', c.bed == null ? null : hyF(c.bed), 150, 245, kMarks, ' lb/in', 'Media pesata sul numero di corde (16 verticali, 19 orizzontali): una semplificazione per confrontare setup, non una misura del letto.')}
      ${hyMeter('Perdita di tensione media', c.tl == null ? null : NF(1).format(c.tl), 15, 50, tlMarks, '%', 'Valori TWU, dove esistono. Più a sinistra = il controllo dura di più.')}
      ${c.warns.length ? `<div class="conflicts small">${c.warns.map((w) => `<p>⚠ ${w}</p>`).join('')}</div>` : ''}
      <p class="small muted">Il verdetto è una regola semplice (rigidità, tensione e tenuta della verticale contro la base), non una misura. ● misurato · ◐ stimato · ○ manca.</p>
    </div>
  </div>`;
}

function hyScatterHtml(ctx) {
  const pts = ctx.ALL.filter((r) => r.twu && r.twu.match === 'exact' && r.stiffness && r.stiffness.kind === 'misurata' && r.twu.tension_loss_pct != null);
  const W = 640, H = 370, L = 48, R = 14, T = 28, B = 40;
  const xs = pts.map((r) => r.stiffness.value_lbin), ys = pts.map((r) => r.twu.tension_loss_pct);
  const x0 = 150, x1 = Math.max(250, Math.ceil(Math.max(...xs) / 10) * 10), y0 = 15, y1 = Math.max(55, Math.ceil(Math.max(...ys) / 5) * 5);
  const X = (v) => L + ((v - x0) / (x1 - x0)) * (W - L - R), Y = (v) => T + ((v - y0) / (y1 - y0)) * (H - T - B);
  const st = ctx.state();
  let g = `<rect x="${X(190)}" y="${T}" width="${X(225) - X(190)}" height="${H - T - B}" fill="var(--ok-bg)" opacity=".7"/>`;
  for (let v = 160; v <= x1; v += 20) g += `<line x1="${X(v)}" x2="${X(v)}" y1="${T}" y2="${H - B}" stroke="var(--line)"/><text x="${X(v)}" y="${H - B + 16}" text-anchor="middle" class="hy-ax">${v}</text>`;
  for (let v = 20; v <= y1; v += 10) g += `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)"/><text x="${L - 6}" y="${Y(v) + 4}" text-anchor="end" class="hy-ax">${v}%</text>`;
  g += `<text x="${(L + W - R) / 2}" y="${H - 6}" text-anchor="middle" class="hy-ax">rigidità TWU (lb/in) →</text><text x="${L}" y="16" class="hy-ax">↑ perdita di tensione (più in alto = tiene meglio)</text>`;
  for (const r of pts) {
    const isV = r.id === hy.v, isO = r.id === hy.o;
    const col = isV ? 'var(--s-c1)' : isO ? 'var(--s-c3)' : st.liked.includes(r.id) ? 'var(--s-liked)' : st.disliked.includes(r.id) ? 'var(--s-disliked)' : 'var(--s-other)';
    const rad = isV || isO ? 8 : ['Toroline', 'Solinco'].includes(r.brand) ? 5.5 : 4;
    g += `<circle cx="${X(r.stiffness.value_lbin).toFixed(1)}" cy="${Y(r.twu.tension_loss_pct).toFixed(1)}" r="${rad}" fill="${col}" stroke="var(--surface)" stroke-width="1.5" class="hy-pt" data-hy-pt="${esc(r.id)}" tabindex="0" role="button" aria-label="${esc(fullName(r))}: ${hyF(r.stiffness.value_lbin)} lb/in, ${hyF(r.twu.tension_loss_pct, 1)}%"><title>${esc(fullName(r))} · ${hyF(r.stiffness.value_lbin)} lb/in · perde ${hyF(r.twu.tension_loss_pct, 1)}% · spin ${hyF(r.twu.spin_potential, 1)}</title></circle>`;
    if (isV || isO || st.liked.includes(r.id) || st.disliked.includes(r.id)) g += `<text x="${X(r.stiffness.value_lbin) + 10}" y="${Y(r.twu.tension_loss_pct) + 4}" class="hy-lab">${esc(r.model)} ${NF(2).format(r.gauge_mm)}</text>`;
  }
  return `<div class="section-head"><h2>Dove stanno le corde misurate</h2><p class="muted small">${pts.length} corde con rigidità e perdita di tensione misurate da TWU sullo stesso calibro. La fascia verde è la tua finestra (190–225 lb/in). Tocca un punto per metterlo in</p></div>
    <div class="chips" role="group" aria-label="Dove mettere la corda toccata"><button type="button" class="btn${hy.pick === 'v' ? ' on' : ''}" data-hy-pick="v">Verticali</button><button type="button" class="btn${hy.pick === 'o' ? ' on' : ''}" data-hy-pick="o">Orizzontali</button></div>
    <div class="chart-box"><svg viewBox="0 0 ${W} ${H}" class="hy-scatter" role="img" aria-label="Rigidità contro perdita di tensione">${g}</svg></div>
    <p class="map-legend small"><span><i style="background:var(--s-c1)"></i>verticale scelta</span><span><i style="background:var(--s-c3)"></i>orizzontale scelta</span><span><i style="background:var(--s-liked)"></i>★ preferite</span><span><i style="background:var(--s-disliked)"></i>non gradite</span></p>`;
}

function hySetupsHtml(ctx) {
  return `<div class="section-head"><h2>Setup da provare</h2><p class="muted small">Dal report del 17/11, ricontrollato sulle fonti. Tutti a 23/22 kg: +1 kg sul tuo attuale, differenziale 1 kg.</p></div>
  <div class="hy-setups">${HY_SETUPS.map((p) => { const V = hyRec(ctx, p.v), O = hyRec(ctx, p.o); return `<article class="scard"><div class="scard-head"><p class="scard-name">${p.k} · ${esc(V.name)} ${NF(2).format(V.mm)} / ${esc(O.name)} ${NF(2).format(O.mm)}</p><span class="badge ${p.conf === 'alta' ? '' : p.conf === 'media' ? 'est' : 'warn'}">fiducia ${p.conf}</span></div><p class="small">${p.why}</p><div class="card-actions"><button class="btn" type="button" data-hy-load="${p.k}">Apri nel costruttore</button></div></article>`; }).join('')}</div>`;
}

function hyProtocolHtml() {
  return `<details class="callout"><summary><b>Protocollo di test (3 setup, circa 3 settimane)</b></summary>
  <ul class="small"><li><b>Confronta:</b> A, C e il controllo «solo tensione» (O-Toro piena a 23/22). Facoltativo D.</li>
  <li><b>Tieni fissi:</b> incordatore, macchina, prestretch, grip, palline nuove, superficie, compagno. Niente piombi o antivibrazione.</li>
  <li><b>3 sessioni per setup:</b> a corde fresche (0–2 h), a 4–6 h e a 8–10 h. Alterna l'ordine dei setup tra le settimane.</li>
  <li><b>Conta:</b> 20 diritti e 20 rovesci incrociati verso il bersaglio tra linea del servizio e fondo; segna lunghe, in rete e dentro. Poi 10 slice, 10 smorzate, 10 volée, 10 risposte bloccate con un voto di feel da 1 a 10. Segna il ping se usi l'app.</li>
  <li><b>Decidi:</b> vince il setup con meno palle lunghe tra le 4 e le 10 ore che non perde più di 1 punto di feel sulle variazioni rispetto a O-Toro. A pari merito, quello che cala meno nel tempo.</li>
  <li>Puoi registrare ore, voti e sensazioni nella schermata <a href="#montata" data-goto="montata">Montata</a>.</li></ul></details>`;
}

function hyVerifyHtml() {
  const row = (a, b, c) => `<tr><td>${a}</td><td>${b}</td><td>${c}</td></tr>`;
  return `<details class="callout"><summary><b>Verifica fonti: report e banco a confronto</b></summary>
  <p class="small">Ho ricontrollato sulle fonti originali i numeri chiave del report e i dati del banco. Esito:</p>
  <div class="hy-tw"><table class="hy-tab small"><thead><tr><th>Punto</th><th>Esito</th><th>Fonte</th></tr></thead><tbody>
  ${row('Valori TWU di O-Toro, Tour, Spin, Snap, Cash, Confidential, Confidential Soft, Mach-10, RPM Blast 17', '✓ confermati, identici nel banco', hyLink('twu', 'TWU'))}
  ${row('O-Toro Tour «circa 15% più rigida», calibri 1,23 e 1,20', '✓ confermato', hyLink('tour', 'Toroline'))}
  ${row('Bower e Cross 2005: palla «+6%» a tensione bassa', '✗ <b>corretto</b>: 108,1 contro 105,3 km/h, circa +2,7%. Confermati gli errori (alta in rete, bassa lunga)', hyLink('bc05', 'abstract'))}
  ${row('Cross e Bower 2001: −30% subito dopo l\'incordatura', '✓ confermato', hyLink('cb01', 'paper'))}
  ${row('TWU: +40% spin con orizzontali a 60 lb; caldo +30–76%', '✓ confermati', `${hyLink('spin', 'TWU')}, ${hyLink('heat', 'TWU')}`)}
  ${row('Toroline «A5 Tour 1,20»', '✗ <b>tolta</b>: non c\'è nel catalogo; esistono A5, A5 Spin Carbon, A5 Spin Infrared e A5 Infrared', hyLink('cat', 'Toroline'))}
  ${row('Blade 100 v9: range 50–60 lb, RA 60', '✓ confermato (22–27 kg); l\'«ottimo a 55 lb» non trovato, tolto', hyLink('blade', 'TW Europe'))}
  ${row('Solinco Hyper-Con', '✓ Confidential + Hyper-G Diamond Rough, 1,20; Confidential in verticale per il controllo. Notizia del 13/11/2026, Diamond Rough da sola non ancora chiara', hyLink('hcon', '10sBalls'))}
  ${row('Racketpedia A5 0,90 kg/mm', '✓ confermato, test del 13/04/2026, solo calibro 1,25', hyLink('a5', 'Racketpedia'))}
  </tbody></table></div>
  <p class="small"><b>Corretti nel banco:</b> A5 da 1,23 a <b>1,25</b> (unico calibro; ora misura Racketpedia esatta). Caviar: la riga «17L 1,23» diventa <b>16L 1,24</b> (Racketpedia 1,00 esatto), la riga «17 1,23» diventa <b>17 1,20</b> (rigidità stimata dalla 1,24). Enso Pro 16L da 1,25 a <b>1,24</b>. Le nuove Octa, Snap Tour Flex, Tour 1,20, Truffle X e Hyper-G Diamond Rough sono nel costruttore come ○: nessun dato di laboratorio. Dato TWU della O-Toro Snap: le recensioni la descrivono più rigida di quanto dica TWU, quindi trattalo con cautela.</p>
  <p class="small muted">Fonti dei calibri: ${hyLink('twe', 'TW Europe')}, ${hyLink('caviar', 'Toroline Caviar')}, ${hyLink('cat', 'catalogo Toroline')}.</p></details>`;
}

// ===== Guida: problemi in campo, 9 regole con fisica e dati, ricetta, consigli generali =====
const HY_PROBS = [
  { id: 'lunga', l: 'La palla vola lunga', s: ['Verticale più rigida: è la leva che conta di più (O-Toro Tour è +31% rispetto a O-Toro, TWU).', 'Poi +1 kg: oggi sei a 22/21, al limite basso del range Wilson (22–27 kg).', 'Orizzontale tonda e liscia: traiettoria più tesa.', 'Solo alla fine un calibro più spesso.'], w: 'Con tensione bassa la palla esce più veloce e gli errori vanno lunghi; con tensione alta vanno in rete (Bower e Cross 2005).', setup: 'A' },
  { id: 'ore', l: 'Il controllo sparisce dopo qualche ora', s: ['Verticale che tiene la tensione: Confidential perde il 22% (misurato sulla 1,30), O-Toro Tour il 25%, O-Toro il 44% (TWU).', 'Reincorda ogni 12–15 ore di gioco e 2–3 giorni prima di un torneo.', 'Niente racchetta in auto al sole.'], w: 'Il letto perde circa il 30% già subito dopo l\'incordatura (Cross e Bower 2001); il caldo aggiunge dal 30 al 76% di perdita in più (TWU).', setup: 'C' },
  { id: 'spin', l: 'Poco spin', s: ['Orizzontale liscia e tonda: meno attrito tra le corde, le verticali scivolano e tornano.', 'Verticale con buon morso sulla palla.', 'Non abbassare troppo le orizzontali: differenziale al massimo 1–2 kg.'], w: 'Lo spin viene dal ritorno delle verticali (snapback). Troppo movimento però lo riduce: in un test TWU le orizzontali a 60 lb hanno dato quasi il 40% di spin in più che a 30 lb.', setup: 'B' },
  { id: 'braccio', l: 'Braccio o polso affaticati', s: ['Tieni un\'orizzontale morbida (O-Toro).', 'Verticale più sottile (Tour 1,20) invece di una più rigida.', 'Non salire più di 1 kg alla volta.'], w: 'Rigidità e tensione aumentano l\'urto trasmesso. La Blade (RA 60, telaio flessibile) ne assorbe già una parte.', setup: 'G' },
  { id: 'tocco', l: 'Poco tocco su slice e smorzate', s: ['Non oltre 23/22: un letto troppo duro toglie sensibilità.', 'Orizzontale morbida e viva.', 'Cerca il controllo con la corda verticale, non con i kg.'], w: 'Il gioco di variazioni vuole un letto stabile ma non duro: per questo conviene cambiare corda prima che alzare molto la tensione.', setup: 'A' },
  { id: 'sposta', l: 'Le corde si spostano e non tornano', s: ['Orizzontale più scorrevole (tonda).', 'Differenziale non sopra 1 kg.', 'Reincorda: di solito vuol dire che la tensione è calata.'], w: 'Se l\'attrito tra le corde è alto, le verticali restano spostate e perdi snapback, spin e costanza.', setup: 'B' },
];
const HY_RULES = [
  { t: 'Verticali = il motore', r: 'Il controllo si regola sulla verticale: scegli lì la corda più rigida.', w: 'All\'impatto le verticali si deformano, scivolano sulle orizzontali e tornano (snapback). Decidono quanto cede il letto e l\'angolo di uscita.', d: 'O-Toro Tour è +31% più rigida di O-Toro (TWU: 217 contro 166 lb/in); +16% per Racketpedia, «circa 15%» per Toroline.', y: 'O-Toro Tour o Confidential vanno in verticale, non in orizzontale.', src: ['twu', 'tour'] },
  { t: 'Orizzontali = la superficie di scorrimento', r: 'In orizzontale vuoi una corda liscia e morbida, meglio se tonda.', w: 'Lo spin potential TWU è il rapporto tra attrito palla-corda e attrito corda-corda: meno attrito tra le corde lascia le verticali libere di tornare. Negli ibridi gli effetti possono essere controintuitivi.', d: 'Spin potential: O-Toro 9,4, RPM Blast 4,6 (TWU).', y: 'Tieni O-Toro in orizzontale: è il pezzo che ti piace.', src: ['twu'] },
  { t: 'Il movimento va dosato', r: 'Differenziale 0,5–1 kg, mai oltre 2.', w: 'Il movimento delle corde aumenta lo spin, ma troppo movimento lo riduce e alza l\'angolo di rimbalzo. La costanza cresce con la rigidità del letto.', d: 'TWU, piatto 16×10: orizzontali a 60 lb ≈ +40% di spin rispetto a 30 lb.', y: 'Il 16×19 della Blade è aperto: non abbassare troppo le orizzontali.', src: ['spin'] },
  { t: 'La tensione decide dove sbagli', r: 'Se sbagli lungo, sali di 1 kg; se sbagli in rete, scendi.', w: 'Più tensione: palla un po\' più lenta e più bassa.', d: 'Bower e Cross 2005: 108,1 km/h a circa 18 kg contro 105,3 a circa 28,5 kg (+2,7%). Tensione alta: più errori in rete; bassa: più palle lunghe.', y: 'Sei a 22/21, al limite basso del range Wilson 22–27 kg: prova 23/22.', src: ['bc05', 'blade'] },
  { t: 'Calibro: effetto reale ma piccolo', r: 'Cambia prima la corda, poi la tensione, solo dopo il calibro.', w: 'Più materiale vuol dire più rigidità e durata, meno morso sulla palla.', d: 'Barb Wire 1,20: 186 lb/in; 1,30: 214 lb/in, circa +15% per 0,1 mm (TWU).', y: 'Da 1,23 a 1,25 cambia poco; cambiare verticale cambia molto di più.', src: ['twu'] },
  { t: 'Forma della corda', r: 'Sagomata dove serve morso (verticale), tonda dove serve scorrere (orizzontale).', w: 'Gli spigoli aumentano l\'attrito: utile sulla palla, dannoso tra le corde. Questa regola è un\'indicazione pratica, non un dato misurato.', d: 'Le orizzontali dei set ibridi Toroline sono tonde e lisce: Dreddy e 101 mettono O-Toro Snap in orizzontale.', y: 'Esagonale in verticale, O-Toro o una tonda in orizzontale.', src: ['twe'] },
  { t: 'La tensione si perde, subito e dopo', r: 'Giudica il controllo a metà vita, non a corde fresche.', w: 'Le poli rilassano più del nylon; il calo maggiore avviene durante e subito dopo l\'incordatura.', d: 'Cross e Bower 2001: circa −30% subito dopo l\'incordatura. TWU: il caldo aggiunge dal 30 al 76% di perdita, che non si recupera.', y: 'Verticale che tiene (Confidential 22%, Tour 25% contro O-Toro 44%). Niente auto al sole.', src: ['cb01', 'heat'] },
  { t: 'Le sensazioni ingannano', r: 'Confronta i setup contando gli errori, non a sensazione.', w: 'Anche i giocatori esperti distinguono male le tensioni.', d: 'Bower e Cross 2008: il 61% di giocatori élite non sente 17 lb (7,6 kg) di differenza; solo l\'11% sente 6 lb.', y: '+1 kg probabilmente non lo «senti», ma lo vedi nelle palle lunghe.', src: ['bc08'] },
  { t: 'Misura la tensione con il telefono', r: 'Segui la tua curva di perdita con un\'app che misura il «ping».', w: 'La frequenza di vibrazione delle corde va con la radice quadrata della tensione.', d: 'Cross 2006: −10% di tensione ≈ −5% di frequenza (da 600 a 570 Hz).', y: 'Misura subito, dopo 24 ore e a ogni sessione: sai quando reincordare.', src: ['ping'] },
];
const HY_SRC_NAME = { twu: 'TWU', tour: 'Toroline', spin: 'TWU, Lindsey 2011', bc05: 'Bower e Cross 2005', blade: 'TW Europe', twe: 'TW Europe', cb01: 'Cross e Bower 2001', heat: 'TWU, temperatura', bc08: 'Bower e Cross 2008', ping: 'Cross 2006' };
let hyProb = 'lunga', hyRule = 0;

function hyProbHtml() {
  const p = HY_PROBS.find((x) => x.id === hyProb);
  return `<div class="hy-probs" role="group" aria-label="Problemi in campo">${HY_PROBS.map((x) => `<button type="button" class="btn${x.id === hyProb ? ' on' : ''}" data-hy-prob="${x.id}" aria-pressed="${x.id === hyProb}">${x.l}</button>`).join('')}</div>
    <div class="hy-card"><p class="hy-ct">Cosa fare, in ordine</p><ol class="hy-ol">${p.s.map((x) => `<li>${x}</li>`).join('')}</ol>
    <p class="hy-k">Perché</p><p class="small muted">${p.w}</p>
    <div class="card-actions"><button class="btn" type="button" data-hy-load="${p.setup}">Prova il setup ${p.setup} nel costruttore</button></div></div>`;
}
function hyRuleHtml() {
  const r = HY_RULES[hyRule];
  return `<div class="hy-card hy-rule"><div class="hy-rhead"><p class="hy-ct">${r.t}</p><span class="small muted">${hyRule + 1} di ${HY_RULES.length}</span></div>
    <p class="hy-k">Regola</p><p>${r.r}</p>
    <p class="hy-k">Perché, la fisica</p><p class="muted">${r.w}</p>
    <p class="hy-k">Il dato</p><p class="hy-dat">${r.d}</p>
    <p class="hy-k">Per te</p><p>${r.y}</p>
    <p class="small muted">Fonte: ${r.src.map((k) => hyLink(k, HY_SRC_NAME[k])).join(', ')}</p>
    <div class="hy-nav"><button class="btn icon" type="button" data-hy-rule="prev" aria-label="Regola precedente">‹</button>
    <div class="hy-dots">${HY_RULES.map((x, i) => `<button type="button" class="hy-dot${i === hyRule ? ' on' : ''}" data-hy-rule="${i}" aria-label="Regola ${i + 1}: ${esc(x.t)}"></button>`).join('')}</div>
    <button class="btn icon" type="button" data-hy-rule="next" aria-label="Regola successiva">›</button></div></div>`;
}
function hyRecipeHtml() {
  return `<div class="hy-card hy-recipe"><p class="hy-ct">La ricetta per la tua Blade 100 v9</p><ol class="hy-ol">
    <li><b>Verticali:</b> una poli più rigida e che tiene la tensione. <span class="muted">O-Toro Tour 1,23 oppure Confidential 1,25.</span></li>
    <li><b>Orizzontali:</b> morbida e scorrevole. <span class="muted">O-Toro 1,23 (o una tonda: Snap, A5).</span></li>
    <li><b>Tensione 23/22 kg:</b> +1 kg e differenziale 1 kg. Non oltre finché non hai testato.</li>
    <li><b>Stesso incordatore, stessa macchina, niente caldo.</b> Reincorda ogni 12–15 ore.</li>
    <li><b>Giudica dopo 4–10 ore</b> contando le palle lunghe, non a sensazione.</li></ol>
    <p class="small muted">Ordine di prova: A (Tour/O-Toro) · C (Confidential/O-Toro) · O-Toro piena a 23/22 come prova di controllo.</p>
    <div class="card-actions"><button class="btn primary" type="button" data-hy-load="A">Apri il setup A</button></div></div>`;
}
function hyTipsHtml() {
  const tip = (t, b) => `<details class="callout"><summary><b>${t}</b></summary><p class="small">${b}</p></details>`;
  return `<div class="section-head"><h2>Consigli generali</h2><p class="muted small">Pratica da campo. Dove c'è un numero, viene dalle fonti sopra; il resto è regola empirica.</p></div>
  ${tip('Un cambio alla volta', 'Se cambi corda, tensione e calibro insieme non sai cosa ha funzionato. Prima la corda verticale, poi i kg, poi il calibro.')}
  ${tip('Stesso incordatore, stessi numeri', 'Macchine e mani diverse danno letti diversi a parità di kg. Chiedi che segni tensione, prestretch e tipo di nodi, e tieni tutto uguale tra un test e l\'altro. Con le poli moderne il prestretch di solito non serve; l\'importante è che sia sempre lo stesso.')}
  ${tip('Quando reincordare', 'Con 2 allenamenti a settimana più i tornei sociali: ogni 12–15 ore di gioco, circa 3–4 settimane. Prima di un torneo incorda 2–3 giorni prima, non il giorno stesso, così il letto si assesta. Segnali per cambiare prima: corde che restano spostate, palla che vola, ping calato. Le ore puoi segnarle nella schermata <a href="#montata" data-goto="montata">Montata</a>, che stima anche l\'usura.')}
  ${tip('Il ping come termometro', 'Misura la frequenza con un\'app subito dopo l\'incordatura e il giorno dopo. Un calo del 5% della frequenza vuol dire circa il 10% di tensione in meno (Cross 2006). È il modo più economico per sapere quanto tiene davvero la tua corda.')}
  ${tip('Caldo e conservazione', 'Il caldo dopo l\'incordatura può aumentare la perdita di tensione dal 30 al 76% e non torna indietro (TWU). D\'estate niente racchetta in auto o al sole a bordo campo; usa la tasca termica della borsa.')}
  ${tip('Due racchette uguali', 'Per i tornei incorda entrambe con lo stesso setup e a pochi giorni di distanza. Una racchetta con corde molto più vecchie dell\'altra cambia profondità e lancio proprio nel momento sbagliato.')}
  ${tip('Durante i test niente extra', 'Niente piombi, antivibrazione o grip nuovi mentre confronti i setup: ognuno cambia la sensazione e falsa il confronto.')}
  ${tip('Comprare con criterio', 'Prima i set singoli o i set ibridi già pronti (Dreddy, cioè O-Toro Tour con O-Toro Snap, 14,90 € su TW Europe). La matassa conviene solo quando hai scelto il setup.')}`;
}

// ===== Come scegliere una corda: cosa conta di più nel poliestere (aggiunto 18/11/2026) =====
const HY_SRC2 = {
  stiff: 'https://twu.tennis-warehouse.com/learning_center/stringstiffness.php',
  fric: 'https://twu.tennis-warehouse.com/learning_center/stringballfriction.php',
  patt: 'https://twu.tennis-warehouse.com/learning_center/stringpattern.php',
  dead: 'https://twu.tennis-warehouse.com/learning_center/deadstrings.php',
  heat: 'https://twu.tennis-warehouse.com/learning_center/temperature.php',
  ash: 'https://ashawayusa.com/TennisTip5.php',
  types: 'https://www.ashawayusa.com/Polyketone8.php',
  twu: 'https://twu.tennis-warehouse.com/learning_center/reporter2.php',
  spinb: 'https://www.tennis-warehouse.com/learning_center/gear_guides/tennis_string/best_spin_strings.html',
  vsq: 'https://www.tennis-warehouse.com/learning_center/reviews/strings/volkl_vsquare.html',
};
const hyL2 = (k, t) => `<a href="${HY_SRC2[k]}" target="_blank" rel="noopener">${t}</a>`;
const HY_FACTORS = [
  { n: 1, t: 'Rigidità dinamica', w: 'Decide potenza, controllo e comfort', d: `Tennis Warehouse misura quanto si allunga la corda in un impatto rapido. Più rigida = più controllo, meno potenza, meno comfort: picco di forza più alto e contatto più breve. Corde entro il 10–15% di rigidità l'una dall'altra tendono a sembrare simili, e letti con la stessa rigidità complessiva dovrebbero giocare in modo simile, comunque ci si arrivi (materiale, calibro, tensione, piatto).`, y: 'È il primo numero da guardare. Slap → O-Toro → Tour è una scala di rigidità crescente: il tuo problema di palla lunga sta qui.', s: [['stiff', 'TWU, rigidità']] },
  { n: 2, t: 'Tenuta di tensione', w: 'Decide quanto dura il punto 1', d: `La rigidità cala insieme alla tensione, e la perdita è più rapida subito dopo l'incordatura e nelle prime ore. Nel test TWU sulle «corde morte» il poliestere ha perso più del nylon; a 100 colpi corde partite tutte da 62 lb erano distanti circa 30 lb tra loro. Il caldo dopo l'incordatura aggiunge dal 30 al 76% di perdita.`, y: 'Tra due corde simili, scegli quella con la perdita TWU più bassa: O-Toro Tour 25%, M8 34%, O-Toro 44%.', s: [['stiff', 'TWU, rigidità'], ['dead', 'TWU, corde morte'], ['heat', 'TWU, temperatura']] },
  { n: 3, t: 'Attrito: superficie e rivestimento', w: 'Decide spin e snapback', d: `Per TWU lo spin massimo viene da attrito corda-palla alto e attrito corda-corda basso. Senza scorrimento laterale, in 5 ms la palla «morde» comunque qualsiasi corda e lo spin è simile; con lo scorrimento delle verticali, l'attrito diventa decisivo. Il poliestere è il materiale che scorre: è il suo effetto principale. Con l'uso l'attrito sale, le verticali scorrono meno e calano spin e lancio.`, y: 'In orizzontale vuoi la corda più liscia possibile (O-Toro, Snap, A5). Una verticale che «non torna più» è un segnale di corda finita.', s: [['fric', 'TWU, attrito'], ['dead', 'TWU, corde morte']] },
  { n: 4, t: 'Forma e spigoli', w: 'Effetto reale ma meno prevedibile di quanto dica il marketing', d: `TWU non ha trovato una correlazione prevedibile tra superficie della corda e coefficiente d'attrito, né corda-palla né corda-corda; però i migliori in ogni categoria sono corde sagomate, testurizzate o rivestite. Il numero di lati (5, 6, 8) da solo non predice lo spin: conta come la forma lavora insieme alla scorrevolezza. Tennis Warehouse ricorda anche che lo spin viene soprattutto dalla tecnica.`, y: 'Sagomata in verticale per il morso, tonda e liscia in orizzontale per lo scorrimento. Non scegliere solo dal numero di lati.', s: [['fric', 'TWU, attrito'], ['vsq', 'TW, V-Square'], ['spinb', 'TW, migliori corde da spin']] },
  { n: 5, t: 'Materiale e mescola', w: 'Agisce attraverso i punti 1, 2 e 3', d: `«Poli» è poliestere puro; «co-poli» è poliestere miscelato con polimeri più morbidi, che cambia rigidità, elasticità e tenuta. Nei test TWU il poliestere genera in media circa il 25% di spin in più del nylon e il 7% in più del budello naturale; secondo TWU le cause probabili sono rigidità, perdita di tensione e scorrevolezza. Le corde «soft» spesso guadagnano comfort a scapito di tenuta o durata.`, y: 'Non scegliere dal nome della mescola: guarda i suoi effetti misurati (rigidità e perdita di tensione).', s: [['types', 'Ashaway, tipi di corda'], ['ash', 'Ashaway su dati TWU']] },
  { n: 6, t: 'Calibro', w: 'Regolazione fine', d: `Più spesso vuol dire più rigido e più durevole, con meno morso. Nei dati TWU Barb Wire passa da 186 lb/in (1,20) a 214 lb/in (1,30): circa +15% per 0,1 mm. Cambiare corda sposta di più (O-Toro Tour è +31% rispetto a O-Toro a parità di calibro).`, y: 'Usalo solo dopo aver scelto la corda e la tensione: da 1,23 a 1,25 cambia poco.', s: [['twu', 'TWU, database']] },
  { n: 7, t: 'Piatto corde e tensione', w: 'Il contesto in cui lavora la corda', d: `Nei test TWU i piatti aperti (14×9) hanno dato più spin del 16×19 chiuso a tutte le velocità; se nessuna verticale si muove, c'è poco o nessun topspin visibile. Che una tensione più bassa dia più spin non è stato dimostrato in modo conclusivo. La tensione cambia anche la rigidità della stessa corda.`, y: 'La Blade 16×19 è aperta: scorrimento facile delle verticali, quindi serve una verticale che non «vada troppo lontano».', s: [['patt', 'TWU, piatto corde'], ['stiff', 'TWU, rigidità']] },
];
const HY_STEPS = [
  ['Parti dal problema', 'Palla lunga, poco spin, braccio, controllo che dura poco: ognuno ha una leva diversa (vedi «Cosa senti in campo?» sopra).'],
  ['Scegli la fascia di rigidità', 'Confronta con una corda che conosci: sotto il 10–15% di differenza la sentirai simile. Per più controllo, sali di fascia.'],
  ['Controlla la tenuta', 'Se giochi molte ore tra un\'incordatura e l\'altra, la perdita di tensione TWU conta quasi quanto la rigidità.'],
  ['Scegli la superficie per il ruolo', 'In verticale una corda con morso, in orizzontale la più liscia. In una full bed cerca un compromesso.'],
  ['Calibro e tensione per ultimi', 'Sono regolazioni fini: 1 kg o 0,05 mm alla volta.'],
  ['Prova con un metodo', 'Un cambio alla volta, stesso incordatore, conta gli errori tra le 4 e le 10 ore di gioco.'],
];
function hyChooseHtml() {
  const f = HY_FACTORS.map((x) => `<details class="callout hy-fac"><summary><span class="hy-rank num">${x.n}</span><span><b>${x.t}</b><span class="small muted hy-fw">${x.w}</span></span></summary>
    <p class="small">${x.d}</p><p class="hy-k">Per te</p><p class="small">${x.y}</p>
    <p class="small muted">Fonte: ${x.s.map(([k, t]) => hyL2(k, t)).join(', ')}</p></details>`).join('');
  const s = HY_STEPS.map(([t, b]) => `<li><b>${t}.</b> ${b}</li>`).join('');
  return `<div class="section-head"><h2>Come scegliere una corda</h2><p class="muted small">Cosa conta di più in una corda in poliestere, in ordine di peso. Tocca una voce per aprirla.</p></div>
    <div class="hy-facs">${f}</div>
    <div class="hy-card"><p class="hy-ct">Scegliere in 6 passi</p><ol class="hy-ol small">${s}</ol>
    <p class="small muted">L'ordine dei fattori è una sintesi ragionata dei test TWU, non una classifica misurata.</p></div>`;
}

function renderHybrid(ctx) {
  const el = $('#ibridi'); if (!el) return;
  el.innerHTML = `<div class="section-head"><h2>Ibridi poli/poli</h2><p class="muted small">Come impostare un ibrido per la tua Blade 100 v9 16×19: parti da cosa senti in campo, poi prova i setup nel costruttore.</p></div>
    <div class="section-head"><h2>Cosa senti in campo?</h2></div>
    <div id="hy-prob">${hyProbHtml()}</div>
    ${hyRecipeHtml()}
    <div class="section-head"><h2>Costruttore</h2><p class="muted small">Scegli corda e kg per verticali e orizzontali: vedi come cambia il letto rispetto al tuo O-Toro 22/21.</p></div>
    <div id="hy-builder">${hyBuilderHtml(ctx)}</div>
    ${hySetupsHtml(ctx)}
    <div class="section-head"><h2>Le 9 regole per impostare un ibrido</h2><p class="muted small">Ognuna con la fisica, il dato e cosa vuol dire per te.</p></div>
    <div id="hy-rule">${hyRuleHtml()}</div>
    ${hyChooseHtml()}
    <div id="hy-scatter">${hyScatterHtml(ctx)}</div>
    ${hyTipsHtml()}
    ${hyProtocolHtml()}
    ${hyVerifyHtml()}`;
}
function hyRefresh(ctx) {
  hySave();
  const b = $('#hy-builder'), s = $('#hy-scatter');
  if (b) b.innerHTML = hyBuilderHtml(ctx);
  if (s) s.innerHTML = hyScatterHtml(ctx);
}
function initHybrid(ctx) {
  const el = $('#ibridi'); if (!el) return;
  el.addEventListener('change', (e) => {
    const t = e.target;
    if (t.id === 'hy-v') hy.v = t.value; else if (t.id === 'hy-o') hy.o = t.value;
    else if (t.id === 'hy-kv') hy.kv = Number(t.value); else if (t.id === 'hy-ko') hy.ko = Number(t.value);
    else return;
    hyRefresh(ctx);
  });
  const act = (t) => {
    const ld = t.closest('[data-hy-load]');
    if (ld) {
      const k = ld.dataset.hyLoad, p = k === 'base' ? HY_BASE : HY_SETUPS.find((x) => x.k === k);
      if (p) { hy = { ...hy, v: p.v, o: p.o, kv: p.kv, ko: p.ko }; hyRefresh(ctx); if (!ld.classList.contains('hy-preset')) $('#hy-builder').scrollIntoView({ block: 'start', behavior: 'smooth' }); }
      return true;
    }
    if (t.closest('[data-hy-swap]')) { hy = { ...hy, v: hy.o, o: hy.v }; hyRefresh(ctx); return true; }
    const pk = t.closest('[data-hy-pick]'); if (pk) { hy.pick = pk.dataset.hyPick; hyRefresh(ctx); return true; }
    const pb = t.closest('[data-hy-prob]'); if (pb) { hyProb = pb.dataset.hyProb; $('#hy-prob').innerHTML = hyProbHtml(); return true; }
    const ru = t.closest('[data-hy-rule]'); if (ru) { const v = ru.dataset.hyRule; hyRule = v === 'prev' ? (hyRule + HY_RULES.length - 1) % HY_RULES.length : v === 'next' ? (hyRule + 1) % HY_RULES.length : Number(v); $('#hy-rule').innerHTML = hyRuleHtml(); const f = $('#hy-rule [data-hy-rule="' + v + '"]'); if (f) f.focus(); return true; }
    const pt = t.closest('[data-hy-pt]'); if (pt) { hy[hy.pick === 'o' ? 'o' : 'v'] = pt.dataset.hyPt; hyRefresh(ctx); return true; }
    return false;
  };
  el.addEventListener('click', (e) => { act(e.target); });
  el.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('[data-hy-pt]')) { e.preventDefault(); act(e.target); } });
}

const DATA = window.STRINGS_DATA;
const ALL = DATA.strings;
const BY_ID = Object.fromEntries(ALL.map((r) => [r.id, r]));
