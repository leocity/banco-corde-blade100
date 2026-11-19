import test from 'node:test';
import assert from 'node:assert/strict';
import { GOALS, candidates, likeness, suggestHybrids, judgePhys } from './next.js';

const meta = { excel_stretch50_sd: 1.0 };
const S = (id, twu = null, shape = 'HEX', est = {}, rp = null) => ({ id, brand: 'B', model: id, gauge_mm: 1.25, shape, lab: { twu, rp, excel: null, est } });
const eq = S('eq', null, 'HEX', { 'twu.stiffness': { kind: 'ricavata', v: 195, margin: 10, from: 'rp' }, 'twu.spin': { kind: 'modello', v: 7.8 }, 'twu.loss': { kind: 'modello', v: 40.7 } }, { kgmm: 0.75 });
const soft = S('soft', { stiffness: 165, loss: 44, spin: 9.4 });
const stiff = S('stiff', { stiffness: 230, loss: 25, spin: 7.7 });
const twin = S('twin', { stiffness: 198, loss: 40, spin: 7.9 });
const holder = S('holder', { stiffness: 200, loss: 22, spin: 7.6 });
const spinny = S('spinny', { stiffness: 190, loss: 38, spin: 9.0 }, 'RND');
const roundSoft = S('roundsoft', { stiffness: 170, loss: 41, spin: 8.7 }, 'RND');
const phys = S('phys', null, 'HEX', { 'twu.stiffness': { kind: 'modello', v: 230 }, 'twu.spin': { kind: 'modello', v: 7 }, 'twu.loss': { kind: 'modello', v: 35 } });
const ALL = [eq, soft, stiff, twin, holder, spinny, roundSoft, phys];
const st = (extra = {}) => ({ equipped: { id: 'eq', kg: [22, 21] }, liked: [], disliked: [], stock: [], ...extra });
const ids = (xs) => xs.map((c) => c.rec.id);

test('le domande sono sei, compresa «palla più bassa»', () => {
  assert.deepEqual(GOALS.map((g) => g.key), ['same', 'softer', 'stiffer', 'lower', 'holds', 'spin']);
});

test('ogni domanda dà una risposta anche se la montata ha solo valori ricavati', () => {
  for (const g of GOALS) {
    const r = candidates(st(), ALL, g.key, meta);
    assert.ok(r.toBuy.length >= 1, g.key);
    for (const c of r.toBuy) assert.ok(c.summary.text.length > 10);
  }
});

test('più rigida, palla più bassa, tiene di più, più spin: scelte fisiche', () => {
  assert.equal(ids(candidates(st(), ALL, 'stiffer', meta).toBuy)[0], 'stiff');
  assert.ok(ids(candidates(st(), ALL, 'lower', meta).toBuy).includes('stiff'));
  assert.equal(ids(candidates(st(), ALL, 'holds', meta).toBuy)[0], 'holder');
  assert.equal(ids(candidates(st(), ALL, 'spin', meta).toBuy)[0], 'spinny');
  assert.equal(ids(candidates(st(), ALL, 'same', meta).toBuy)[0], 'twin');
});

test('una corda con la rigidità solo dalla fisica non viene proposta', () => {
  for (const g of GOALS) assert.ok(!ids(candidates(st(), ALL, g.key, meta).toBuy).includes('phys'), g.key);
});

test('le corde in casa vengono prima; la montata e le non gradite in casa compaiono segnalate', () => {
  const r = candidates(st({ stock: [{ id: 'eq', size: 'intera', n: 1 }, { id: 'stiff', size: 'mezza', n: 1 }], disliked: ['stiff'] }), ALL, 'stiffer', meta);
  assert.deepEqual(ids(r.inStock).sort(), ['eq', 'stiff']);
  assert.equal(r.inStock.find((c) => c.rec.id === 'stiff').disliked, true);
  assert.ok(!ids(r.toBuy).includes('stiff'));
});

test('lancio: chi resta più rigido dopo il calo di tensione fa partire la palla più bassa', () => {
  const j = judgePhys('lower', [{ key: 'launch', dir: 'meno' }, { key: 'kAfter', diff: 15 }, { key: 'kNow', diff: 10 }]);
  assert.equal(j.ok, true);
});

test('ibridi suggeriti: dalle mezze in casa, verticale più rigida o uguale, orizzontale tonda preferita', () => {
  const s = st({ stock: [{ id: 'stiff', size: 'mezza', n: 1 }, { id: 'roundsoft', size: 'mezza', n: 1 }, { id: 'soft', size: 'mezza', n: 1 }] });
  const h = suggestHybrids(s, ALL, 'same', meta);
  assert.ok(h.fromStock.length >= 1);
  for (const p of h.fromStock) {
    assert.notEqual(p.V.id, p.O.id);
    assert.ok(p.V.lab.twu.stiffness >= p.O.lab.twu.stiffness * 0.9, 'verticale non più morbida');
  }
  assert.equal(h.fromStock[0].V.id, 'stiff');
  assert.equal(h.fromStock[0].O.id, 'roundsoft');
  assert.ok(h.buyOne.every((p) => p.inStock[0] || p.inStock[1]));
});

test('somiglianza alle preferite: con meno di metà misure simili non si dice «simile»', () => {
  const p = S('p', { stiffness: 200, loss: 30, spin: 8 }, 'HEX', {}, { kgmm: 0.9 });
  const q = S('q', { stiffness: 260, loss: 50, spin: 6 }, 'HEX', {}, { kgmm: 0.92 });
  assert.equal(likeness(q, ['p'], [], [p, q], meta).id, null);
});

test('ibridi senza corde in casa: coppie tra corde misurate, da comprare', () => {
  const h = suggestHybrids(st(), ALL, 'lower', meta);
  assert.deepEqual(h.fromStock, []);
  assert.ok(h.buyBoth.length >= 1);
  for (const p of h.buyBoth) assert.ok(p.V.lab.twu && p.O.lab.twu);
});

test('le marche delle preferite vengono prima, a parità di direzione', () => {
  const a = { ...S('a', { stiffness: 230, loss: 25, spin: 7.7 }), brand: 'Mia' };
  const b = { ...S('b', { stiffness: 232, loss: 25, spin: 7.7 }), brand: 'Altra' };
  const fav = { ...S('fav', { stiffness: 200, loss: 30, spin: 8 }), brand: 'Mia' };
  const r = candidates(st({ liked: ['fav'] }), [eq, a, b, fav], 'stiffer', meta);
  assert.equal(r.toBuy[0].rec.id, 'a');
  assert.equal(r.toBuy[0].prefBrand, true);
});

test('in casa: una mezza sola non basta per una racchetta intera; due mezze sì', () => {
  const r1 = candidates(st({ stock: [{ id: 'stiff', size: 'mezza', n: 1 }] }), ALL, 'stiffer', meta);
  assert.equal(r1.inStock[0].full, false);
  const r2 = candidates(st({ stock: [{ id: 'stiff', size: 'mezza', n: 2 }] }), ALL, 'stiffer', meta);
  assert.equal(r2.inStock[0].full, true);
});
