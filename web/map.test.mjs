import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { pairing } from './pairing.js';
import { AXES, PRESETS, mapPoints, placeLabels } from './map.js';

const DATA = JSON.parse(fs.readFileSync(new URL('../data/strings.json', import.meta.url), 'utf8'));
const ALL = DATA.strings, BY = Object.fromEntries(ALL.map((r) => [r.id, r]));
const D = DATA.defaults;
const refs = (ids) => ids.map((id) => ({ id, dims: BY[id].derived.dims }));
const CTX = { equippedId: D.equipped.id, liked: D.liked, pairingOf: (id) => pairing(BY[id].derived.dims, refs(D.liked), refs(D.disliked), !D.liked.includes(id)) };
const OPEN = { x: 'stiffness', y: 'spin', brands: [], gauge: '', shape: '', target: false, onlyMeasured: false, onlyGood: false };
const ids = (res) => new Set([...res.pts.map((p) => p.r.id), ...res.stripX.map((p) => p.r.id), ...res.stripY.map((p) => p.r.id), ...res.none.map((r) => r.id)]);
const isRef = (id) => id === D.equipped.id || D.liked.includes(id);

test('assi e preset', () => {
  assert.deepEqual(PRESETS, { rs: ['stiffness', 'spin'], ts: ['durability', 'spin'], cs: ['control', 'spin'] });
  assert.equal(AXES.stiffness.get(BY['toroline-o-toro-17']).est, false);
  const z = AXES.spin.get(BY[D.equipped.id]);
  assert.equal(z.est, true);
  assert.equal(z.model, true);
  assert.ok(z.low < z.value && z.value < z.high);
  assert.equal(AXES.durability.get({ derived: { dims: { durability: null } } }), null);
  assert.equal(AXES.control.get({ derived: { dims: { control: 61.4 } } }).value, 61.4);
});

test('senza filtri ogni corda è da qualche parte', () => {
  const res = mapPoints(ALL, OPEN, CTX);
  assert.equal(ids(res).size + res.hidden.length, ALL.length);
  assert.equal(res.hidden.length, 0);
});

test('filtro marca: la montata e le preferite restano, le altre sono della marca', () => {
  const res = mapPoints(ALL, { ...OPEN, brands: ['Solinco'] }, CTX);
  const shown = ids(res);
  assert.ok(shown.has(D.equipped.id));
  for (const id of D.liked) assert.ok(shown.has(id), id);
  for (const id of shown) assert.ok(isRef(id) || BY[id].brand === 'Solinco', id);
  assert.ok(res.hidden.length > 0);
});

test('solo misurate: tolte le stime, tranne i riferimenti', () => {
  const res = mapPoints(ALL, { ...OPEN, onlyMeasured: true }, CTX);
  for (const p of res.pts) if (!isRef(p.r.id)) assert.ok(!p.xv.est && !p.yv.est, p.r.id);
  assert.ok(ids(res).has(D.equipped.id));
  assert.ok(res.pts.length > 10);
});

test('solo pairing Buono o meglio: tolte le altre, tranne i riferimenti', () => {
  const res = mapPoints(ALL, { ...OPEN, onlyGood: true }, CTX);
  for (const id of ids(res)) if (!isRef(id)) assert.ok(CTX.pairingOf(id).score >= 60, id);
  assert.ok(ids(res).has(D.equipped.id));
});

test('marche valutate: i concorrenti spariscono, i riferimenti no', () => {
  const res = mapPoints(ALL, { ...OPEN, target: true }, CTX);
  for (const id of ids(res)) assert.ok(isRef(id) || BY[id].is_target, id);
});

test('calibro e forma', () => {
  const res = mapPoints(ALL, { ...OPEN, gauge: '17', shape: 'HEX' }, CTX);
  for (const id of ids(res)) assert.ok(isRef(id) || (BY[id].gauge_label === '17' && BY[id].shape === 'HEX'), id);
});

test('una corda senza il valore sull\'asse y finisce nella fascia, non sparisce', () => {
  const r = ALL.find((x) => x.derived.dims.durability === null && x.is_target && x.stiffness);
  const res = mapPoints(ALL, { ...OPEN, y: 'durability' }, CTX);
  assert.ok(res.stripX.some((p) => p.r.id === r.id));
  assert.ok(!res.pts.some((p) => p.r.id === r.id));
  const xs = res.stripX.map((p) => p.xv.value);
  assert.deepEqual(xs, [...xs].sort((a, b) => a - b));
});

test('una corda senza x finisce in stripY, senza entrambi in none', () => {
  const a = { id: 'a', brand: 'B', model: 'A', is_target: true, stiffness: null, spin: { value: 6, low: 5, high: 7, kind: 'misurato' }, derived: { dims: {} } };
  const b = { id: 'b', brand: 'B', model: 'B', is_target: true, stiffness: null, spin: null, derived: { dims: {} } };
  const res = mapPoints([a, b], OPEN, { ...CTX, pairingOf: () => ({ score: 50 }) });
  assert.deepEqual(res.stripY.map((p) => p.r.id), ['a']);
  assert.deepEqual(res.none.map((r) => r.id), ['b']);
});

const overlap = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
const rectOf = (l, w) => (l.anchor === 'start' ? { x0: l.x, x1: l.x + w, y0: l.y - 11, y1: l.y + 3 } : { x0: l.x - w, x1: l.x, y0: l.y - 11, y1: l.y + 3 });

test('placeLabels: tre punti coincidenti ottengono tre etichette che non si sovrappongono', () => {
  const pts = ['a', 'b', 'c'].map((id) => ({ id, x: 300, y: 200, text: `Corda ${id}`, w: 60, ref: true }));
  const out = placeLabels(pts, { w: 900, h: 600 });
  assert.equal(out.length, 3);
  const rects = out.map((l) => rectOf(l, 60));
  for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) assert.equal(overlap(rects[i], rects[j]), false);
});

test('placeLabels: con molti punti fitti si scartano le etichette in eccesso ma non quelle dei riferimenti', () => {
  const pts = [];
  for (let i = 0; i < 30; i++) pts.push({ id: `p${i}`, x: 400 + (i % 5) * 4, y: 300 + Math.floor(i / 5) * 3, text: `Altra corda ${i}`, w: 80, ref: false });
  pts.push({ id: 'montata', x: 402, y: 302, text: 'montata', w: 50, ref: true });
  const out = placeLabels(pts, { w: 900, h: 600 });
  assert.ok(out.some((l) => l.id === 'montata'));
  assert.ok(out.length < 31);
  const rects = out.filter((l) => l.id !== 'montata').map((l) => rectOf(l, 80));
  for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) assert.equal(overlap(rects[i], rects[j]), false);
});

test('placeLabels: un\'etichetta vicino al bordo destro si ancora a sinistra del punto', () => {
  const out = placeLabels([{ id: 'a', x: 880, y: 100, text: 'lunga etichetta', w: 120, ref: true }], { w: 900, h: 600 });
  assert.equal(out[0].anchor, 'end');
});
