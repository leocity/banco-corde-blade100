import { test } from 'node:test';
import assert from 'node:assert/strict';
import { profileScore, kgToLbs, DEFAULT_WEIGHTS } from './score.js';

test('penalità non gradite: 15 punti sopra soglia 75', () => {
  const sub = { spin: 60, control: 50, durability: 70, power: 40 };
  assert.equal(profileScore(sub, DEFAULT_WEIGHTS, 50) - profileScore(sub, DEFAULT_WEIGHTS, 80), 15);
  assert.equal(profileScore(sub, DEFAULT_WEIGHTS, 50), 56); // parità con Python (55.5 -> 56)
});

test('pesi rinormalizzati sui sotto-punteggi presenti', () => {
  assert.equal(profileScore({ spin: 72, control: null, durability: null, power: null }, DEFAULT_WEIGHTS, null), 72);
  assert.equal(profileScore({ spin: null, control: null, durability: null, power: null }, DEFAULT_WEIGHTS, null), null);
});

test('kg -> lbs arrotondato a 0.5', () => {
  assert.equal(kgToLbs(22), 48.5);
  assert.equal(kgToLbs(20.5), 45);
});

import { dislikedFlag } from './score.js';
test('avviso non gradite solo se più simile alla non gradita che alla preferita', () => {
  assert.equal(dislikedFlag(97, 80), false);
  assert.equal(dislikedFlag(50, 80), true);
  assert.equal(dislikedFlag(null, 80), true);
  assert.equal(dislikedFlag(10, null), false);
});
