import test from 'node:test';
import assert from 'node:assert/strict';
import { GOALS, candidates, likeness } from './next.js';

const meta = { excel_stretch50_sd: 1.0 };
let n = 0;
const S = (id, lab, extra = {}) => ({ id, brand: 'B', model: id, gauge_mm: 1.25, shape: 'RND', lab: { twu: null, rp: null, excel: null, ...lab }, ...extra, _n: n++ });
const slap = S('slap', { rp: { kgmm: 0.75 }, excel: { stretch50: 3.3 } });
const stiff1 = S('stiff1', { rp: { kgmm: 1.05 }, twu: { stiffness: 210, loss: 25, spin: 8 } });
const stiff2 = S('stiff2', { rp: { kgmm: 0.95 } });
const soft = S('soft', { rp: { kgmm: 0.60 }, twu: { stiffness: 170, loss: 45, spin: 9.5 } });
const twin = S('twin', { rp: { kgmm: 0.80 } });
const none = S('none', {}, { stiffness: { value_lbin: 300, kind: 'parente' } });
const lossy = S('lossy', { twu: { stiffness: 200, loss: 50, spin: 7 } });
const holder = S('holder', { twu: { stiffness: 200, loss: 18, spin: 7.5 } });
const ALL = [slap, stiff1, stiff2, soft, twin, none, lossy, holder];
const st = (extra = {}) => ({ equipped: { id: 'slap', kg: [22, 21] }, liked: ['slap'], disliked: [], stock: [], ...extra });
const ids = (xs) => xs.map((c) => c.rec.id);

test('le domande sono cinque, con etichette in italiano', () => {
  assert.deepEqual(GOALS.map((g) => g.key), ['same', 'softer', 'stiffer', 'holds', 'spin']);
  for (const g of GOALS) assert.ok(g.label.length > 3);
});

test('più rigida: solo corde misurate più rigide oltre la soglia, mai stime', () => {
  const r = candidates(st(), ALL, 'stiffer', meta);
  assert.deepEqual(ids(r.toBuy), ['stiff1', 'stiff2']);
  assert.ok(!ids(r.toBuy).includes('none'));
});

test('più morbida e simile', () => {
  assert.deepEqual(ids(candidates(st(), ALL, 'softer', meta).toBuy), ['soft']);
  assert.deepEqual(ids(candidates(st(), ALL, 'same', meta).toBuy), ['twin']);
});

test('le corde in casa vengono prima, anche se non compatibili (in fondo)', () => {
  const r = candidates(st({ stock: [{ id: 'twin', size: 'mezza', n: 1 }, { id: 'stiff2', size: 'intera', n: 1 }] }), ALL, 'stiffer', meta);
  assert.deepEqual(ids(r.inStock), ['stiff2', 'twin']);
  assert.equal(r.inStock[0].compatible, true);
  assert.equal(r.inStock[1].compatible, false);
  assert.deepEqual(ids(r.toBuy), ['stiff1']);
});

test('non gradite e montata escluse', () => {
  const r = candidates(st({ disliked: ['stiff1'] }), ALL, 'stiffer', meta);
  assert.deepEqual(ids(r.toBuy), ['stiff2']);
});

test('al massimo 3 da comprare', () => {
  const many = Array.from({ length: 6 }, (_, i) => S(`s${i}`, { rp: { kgmm: 1.0 + i * 0.01 } }));
  assert.equal(candidates(st(), [slap, ...many], 'stiffer', meta).toBuy.length, 3);
});

test('tiene di più: la Slap non ha TWU, quindi classifica assoluta dichiarata', () => {
  const r = candidates(st(), ALL, 'holds', meta);
  assert.equal(r.mode, 'absolute');
  assert.match(r.note, /non è misurata da TWU/);
  assert.equal(ids(r.toBuy)[0], 'holder');
  assert.ok(r.toBuy[0].rank && r.toBuy[0].rank.n >= 4);
});

test('tiene di più: con la montata misurata da TWU il confronto è diretto', () => {
  const r = candidates(st({ equipped: { id: 'lossy', kg: [22, 21] } }), ALL, 'holds', meta);
  assert.equal(r.mode, 'relative');
  assert.deepEqual(ids(r.toBuy), ['holder', 'stiff1', 'soft']); // 18, 25, 45 contro 50: tutte oltre i 5 punti
});

test('montata senza misure: simile usa le preferite come riferimento', () => {
  const r = candidates(st({ equipped: { id: 'none', kg: [22, 21] }, liked: ['twin'] }), ALL, 'same', meta);
  assert.match(r.note, /nessuna misura/);
  assert.ok(ids(r.toBuy).includes('slap'));
});

test('somiglianza alle preferite: conta solo misure nella stessa fonte', () => {
  const l = likeness(twin, ['slap', 'stiff1'], [], ALL, meta);
  assert.equal(l.id, 'slap');
  assert.equal(l.similar, 1);
  assert.equal(l.total, 1);
  assert.equal(likeness(none, ['slap'], [], ALL, meta), null);
});

test('somiglia a una non gradita: avviso', () => {
  const l = likeness(twin, [], ['slap'], ALL, meta);
  assert.equal(l.warn, 'slap');
});
