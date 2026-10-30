import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { pairing, pairingReason, bandFor, fitTo } from './pairing.js';

const CASES = JSON.parse(fs.readFileSync(new URL('../tests/fixtures/pairing_cases.json', import.meta.url), 'utf8'));
const KEYS = ['score', 'band', 'n_dims', 'missing', 'no_spin', 'best_ref', 'penalized'];
const byName = (n) => CASES.find((c) => c.name === n);
const run = (c) => pairing(c.dims, c.liked, c.disliked, c.penalize);

for (const c of CASES) {
  test(`parità con Python: ${c.name}`, () => {
    const got = run(c);
    assert.deepEqual(Object.fromEntries(KEYS.map((k) => [k, got[k]])), c.expect);
  });
}

test('direzione e fit per dimensione', () => {
  const r = run(byName('rigidita_15_oltre'));
  assert.deepEqual(r.fits.stiffness, { fit: 50, dir: 'above' });
  assert.equal(r.fits.spin.dir, 'in');
});

test('bandFor e fitTo', () => {
  assert.deepEqual([100, 80, 79, 60, 59, 40, 39, 0].map(bandFor), ['Ottimo', 'Ottimo', 'Buono', 'Buono', 'Attenzione', 'Attenzione', 'Poco adatta', 'Poco adatta']);
  assert.equal(fitTo({ stiffness: null }, { stiffness: 50 }), null);
});

test('motivo: dimensioni fuori con la direzione', () => {
  const txt = pairingReason(run(byName('rigidita_15_oltre')), (id) => `Corda ${id}`);
  assert.match(txt, /più rigida/);
  assert.match(txt, /Corda r1/);
});

test('motivo: corda identica senza più/meno', () => {
  const txt = pairingReason(run(byName('identica')), (id) => id);
  assert.doesNotMatch(txt, /più|meno/);
});

test('motivo: non valutabile elenca cosa manca in italiano', () => {
  const txt = pairingReason(run(byName('meno_di_3')), (id) => id);
  assert.match(txt, /tenuta/);
  assert.match(txt, /elasticità/);
  assert.doesNotMatch(txt, /undefined|null|NaN/);
});

test('motivo: senza riferimenti invita a segnare una preferita', () => {
  assert.match(pairingReason(run(byName('nessun_riferimento')), (id) => id), /mi piace/);
});

test('motivo: penalità e senza spin sono dichiarate', () => {
  assert.match(pairingReason(run(byName('penalita')), (id) => id), /non gradita/);
  assert.match(pairingReason(run(byName('senza_spin')), (id) => id), /senza spin/);
});
