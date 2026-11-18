import test from 'node:test';
import assert from 'node:assert/strict';
import { kAt, bedOf, compareBeds, T_REF, PHYS_KEYS } from './phys.js';

const S = (id, twu = {}, shape = 'HEX', est = {}) => ({ id, brand: 'B', model: id, gauge_mm: 1.25, shape, lab: { twu, rp: null, excel: null, est } });
const soft = S('soft', { stiffness: 170, loss: 44, spin: 9.4 }, 'HEX');
const stiff = S('stiff', { stiffness: 217, loss: 25, spin: 7.7 }, 'HEX');
const round = S('round', { stiffness: 165, loss: 40, spin: 8.7 }, 'RND');

test('rigidità del letto: cresce con la tensione, uguale alla misura a 51 lb', () => {
  assert.equal(kAt(200, T_REF), 200);
  assert.ok(kAt(200, 25) > 200 && kAt(200, 20) < 200);
});

test('letto pieno e ibrido: media pesata 16 verticali / 19 orizzontali; spin 60% verticali', () => {
  const full = bedOf(stiff, stiff, [22, 21]);
  const hy = bedOf(stiff, soft, [22, 21]);
  assert.ok(hy.kNow.v < full.kNow.v && hy.kNow.v > bedOf(soft, soft, [22, 21]).kNow.v);
  assert.equal(Math.round(hy.loss.v * 10) / 10, Math.round(((16 * 25 + 19 * 44) / 35) * 10) / 10);
  assert.equal(Math.round(hy.spin.v * 100) / 100, Math.round((0.6 * 7.7 + 0.4 * 9.4) * 100) / 100);
  assert.equal(hy.roundCross, false);
  assert.equal(bedOf(stiff, round, [22, 21]).roundCross, true);
});

test('dopo il calo di tensione: chi perde meno resta più rigido, quindi palla più bassa', () => {
  const rows = compareBeds(bedOf(stiff, stiff, [22, 21]), bedOf(soft, soft, [22, 21]));
  const keys = rows.map((r) => r.key);
  assert.deepEqual(keys, PHYS_KEYS.map((k) => k.key));
  const launch = rows.find((r) => r.key === 'launch');
  assert.equal(launch.dir, 'meno');
  assert.match(launch.word, /più bass/);
  assert.equal(rows.find((r) => r.key === 'loss').dir, 'meno');
});

test('valori ricavati: il letto porta il tipo peggiore tra le due corde', () => {
  const est = S('e', {}, 'RND', { 'twu.stiffness': { kind: 'ricavata', v: 195, margin: 10, from: 'rp' }, 'twu.spin': { kind: 'modello', v: 7.8 }, 'twu.loss': { kind: 'modello', v: 40.7 } });
  const b = bedOf(stiff, est, [22, 21]);
  assert.equal(b.kNow.est, 'ricavata');
  assert.equal(b.spin.est, 'modello');
  assert.equal(b.loss.est, 'modello');
  assert.equal(bedOf(stiff, stiff, [22, 21]).kNow.est, null);
});

test('senza nessun valore il letto non inventa: null', () => {
  const none = S('n', {}, 'RND', {});
  assert.equal(bedOf(none, none, [22, 21]).kNow, null);
});
