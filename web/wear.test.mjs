import { test } from 'node:test';
import assert from 'node:assert/strict';
import { priorLife, lifeEstimate, wearBand, hoursPerWeek, projectedChange, wearStatus } from './wear.js';
import { defaultState, addSession } from './state.js';

const NOW = new Date('2026-10-30T12:00:00Z');
const DEFAULTS = { equipped: { id: 'd', kg: [22.5, 21.5] }, liked: [], disliked: [] };
const TEN = { a: 50, b: 50, c: 50, d: 50 };
const tenutaOf = (id) => (id in TEN ? TEN[id] : null);
const life = (id, hours, reason = 'consumata') => ({ id, kg: [22, 21], from: '2026-01-01T00:00:00Z', to: '2026-02-01T00:00:00Z', hours, reason, note: '' });

test('priorLife: 8 + 0,12·T ore con ±25%', () => {
  assert.deepEqual(priorLife(50), { hours: 14, low: 10.5, high: 17.5, basis: 'ipotesi' });
  assert.equal(priorLife(0).hours, 8);
  assert.equal(priorLife(100).hours, 20);
});

test('priorLife: tenuta sconosciuta -> 14 ore ±40%', () => {
  const p = priorLife(null);
  assert.deepEqual([p.hours, p.low, p.high], [14, 8.4, 19.6]);
  assert.equal(priorLife(undefined).hours, 14);
});

test('wearBand: soglie 40/70/100', () => {
  assert.deepEqual([0, 0.39, 0.4, 0.69, 0.7, 1.0, 1.01, 3].map(wearBand), ['Fresca', 'Fresca', 'In uso', 'In uso', 'Da controllare', 'Da controllare', 'Da cambiare', 'Da cambiare']);
});

test('lifeEstimate: una vita consumata della stessa corda vale la sua mediana', () => {
  const e = lifeEstimate(50, [life('d', 12), life('d', 16)], 'd', tenutaOf);
  assert.deepEqual([e.hours, e.basis, e.n], [14, 'tua corda', 2]);
  assert.equal(e.low, 10.5);
});

test('lifeEstimate: le corde rotte non calibrano', () => {
  const e = lifeEstimate(50, [life('d', 3, 'rotta'), life('d', 4, 'cambiata per prova')], 'd', tenutaOf);
  assert.equal(e.basis, 'ipotesi');
  assert.equal(e.hours, 14);
});

test('lifeEstimate: tre corde diverse che durano il doppio scalano l\'ipotesi', () => {
  const e = lifeEstimate(50, [life('a', 28), life('b', 28), life('c', 28)], 'd', tenutaOf);
  assert.equal(e.basis, 'tuo storico');
  assert.equal(e.hours, 28);
  assert.equal(e.n, 3);
});

test('lifeEstimate: due corde non bastano, tre vite della stessa corda non contano come tre corde', () => {
  assert.equal(lifeEstimate(50, [life('a', 28), life('b', 28)], 'd', tenutaOf).basis, 'ipotesi');
  assert.equal(lifeEstimate(50, [life('a', 28), life('a', 28), life('a', 28)], 'd', tenutaOf).basis, 'ipotesi');
});

test('lifeEstimate: corde senza tenuta nota non entrano nella scala', () => {
  const e = lifeEstimate(50, [life('x', 28), life('y', 28), life('z', 28)], 'd', tenutaOf);
  assert.equal(e.basis, 'ipotesi');
});

test('hoursPerWeek: media delle ultime 4 settimane, 4,5 se non ci sono sessioni recenti', () => {
  assert.equal(hoursPerWeek([], NOW), 4.5);
  assert.equal(hoursPerWeek([{ date: '2026-09-01', hours: 5 }], NOW), 4.5);
  assert.equal(hoursPerWeek([{ date: '2026-10-20', hours: 5 }, { date: '2026-10-05', hours: 3 }, { date: '2026-08-01', hours: 9 }], NOW), 2);
});

test('projectedChange', () => {
  assert.equal(projectedChange(7, 3.5, NOW).toISOString(), '2026-11-13T12:00:00.000Z');
  assert.equal(projectedChange(0, 3.5, NOW).getTime(), NOW.getTime());
  assert.equal(projectedChange(-2, 3.5, NOW).getTime(), NOW.getTime());
  assert.equal(projectedChange(5, 0, NOW), null);
});

test('wearStatus: corda nuova senza sessioni, nessun NaN', () => {
  const s = defaultState(DEFAULTS, new Date('2026-10-28T12:00:00Z'));
  const w = wearStatus({ state: s, tenuta: 50, tenutaOf, now: NOW });
  assert.deepEqual([w.hours, w.ratio, w.band, w.hoursLeft, w.perWeek, w.daysSince], [0, 0, 'Fresca', 14, 4.5, 2]);
  assert.match(w.changeBy, /^2026-11-\d\d/);
  assert.ok(!/NaN|undefined/.test(JSON.stringify(w)));
});

test('wearStatus: oltre la vita attesa è da cambiare e la data è oggi', () => {
  let s = defaultState(DEFAULTS, new Date('2026-10-01T12:00:00Z'));
  s = addSession(s, { date: '2026-10-20', hours: 15, note: '', ts: 'a' });
  const w = wearStatus({ state: s, tenuta: 50, tenutaOf, now: NOW });
  assert.equal(w.band, 'Da cambiare');
  assert.equal(w.hoursLeft, 0);
  assert.equal(w.changeBy, NOW.toISOString());
});

test('wearStatus: tenuta mancante usa 14 ore', () => {
  const w = wearStatus({ state: defaultState(DEFAULTS, NOW), tenuta: null, tenutaOf, now: NOW });
  assert.equal(w.life.hours, 14);
  assert.equal(w.life.basis, 'ipotesi');
});
